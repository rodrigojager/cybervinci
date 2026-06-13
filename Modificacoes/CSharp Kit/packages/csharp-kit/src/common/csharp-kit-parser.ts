import {
    CSharpCentralPackageVersion,
    CSharpDiagnostic,
    CSharpDiagnosticSeverity,
    CSharpDotnetInfo,
    CSharpDotnetTestRunner,
    CSharpDotnetToolManifestSummary,
    CSharpEditorConfigSection,
    CSharpEditorConfigSummary,
    CSharpGlobalJsonSummary,
    CSharpLaunchProfile,
    CSharpMsBuildFileKind,
    CSharpMsBuildFileSummary,
    CSharpNuGetConfigSummary,
    CSharpNuGetPackageSource,
    CSharpNuGetPackageSourceMapping,
    CSharpPackageHealthIssue,
    CSharpPackageHealthIssueKind,
    CSharpPackageReference,
    CSharpPackageUpdate,
    CSharpPublishProfile,
    CSharpProjectKind,
    CSharpProjectReference,
    CSharpProjectSummary,
    CSharpRazorDirective,
    CSharpRazorDirectiveKind,
    CSharpRazorFileKind,
    CSharpRazorFileSummary,
    CSharpRazorInjection,
    CSharpRunSettingsProperty,
    CSharpRunSettingsSummary,
    CSharpTestCase,
    CSharpTestFramework,
    CSharpTestResult,
    csharpProjectDisplayName
} from './index';

const MSBUILD_FILE_DIAGNOSTIC = /^(.+)\((\d+),(\d+)(?:,(\d+),(\d+))?\):\s+(error|warning|info|message)\s+(?:(\S+)\s*)?:\s+(.+?)(?:\s+\[(.+)\])?\s*$/i;
const MSBUILD_PROJECT_DIAGNOSTIC = /^(.+?)\s*:\s+(error|warning|info|message)\s+(?:(\S+)\s*)?:\s+(.+?)(?:\s+\[(.+)\])?\s*$/i;
const RAZOR_DIRECTIVE_REGEX = /^\s*@([A-Za-z][\w-]*)(?:\s+(.+?))?\s*$/;
const RAZOR_COMPONENT_TAG_REGEX = /(?:^|[^A-Za-z0-9_])<([A-Z][A-Za-z0-9_.]*)(?:\s|>|\/)/g;

export function parseDotnetInfo(output: string, executable = 'dotnet'): CSharpDotnetInfo {
    const version = matchFirst(output, /^ Version:\s+(.+)$/m) ?? matchFirst(output, /^ Host:\s*\r?\n\s+Version:\s+(.+)$/m);
    const sdks = parseIndentedListAfterHeader(output, '.NET SDKs installed:');
    const runtimes = parseIndentedListAfterHeader(output, '.NET runtimes installed:');
    return {
        available: true,
        executable,
        version: version?.trim(),
        sdks,
        runtimes
    };
}

export function parseRunSettings(filePath: string, relativePath: string, xml: string): CSharpRunSettingsSummary {
    const runConfiguration = parseSimpleXmlProperties(firstSectionBody(xml, 'RunConfiguration') ?? '');
    const mstestSettings = parseSimpleXmlProperties(firstSectionBody(xml, 'MSTest') ?? '');
    const testRunParameters = parseRunSettingsParameters(firstSectionBody(xml, 'TestRunParameters') ?? '');
    const dataCollectors = parseRunSettingsDataCollectors(firstSectionBody(xml, 'DataCollectors') ?? '');
    return {
        path: filePath,
        relativePath,
        name: relativePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.runsettings$/i, '') ?? csharpProjectDisplayName(filePath),
        runConfiguration,
        dataCollectors,
        testRunParameters,
        mstestSettings
    };
}

export function parseDotnetToolManifest(filePath: string, relativePath: string, jsonText: string): CSharpDotnetToolManifestSummary {
    const parsed = JSON.parse(jsonText) as unknown;
    const toolsRecord = isRecord(parsed) && isRecord(parsed.tools) ? parsed.tools : {};
    const tools: CSharpDotnetToolManifestSummary['tools'] = [];
    for (const packageId of Object.keys(toolsRecord)) {
        const tool = toolsRecord[packageId];
        if (!isRecord(tool)) {
            continue;
        }
        tools.push({
            packageId,
            version: stringValue(tool.version),
            commands: stringArrayValue(tool.commands) ?? [],
            rollForward: typeof tool.rollForward === 'boolean' ? tool.rollForward : undefined
        });
    }
    tools.sort((left, right) => left.packageId.localeCompare(right.packageId));
    return {
        path: filePath,
        relativePath,
        isRoot: isRecord(parsed) && typeof parsed.isRoot === 'boolean' ? parsed.isRoot : undefined,
        tools
    };
}

export function parseEditorConfig(filePath: string, relativePath: string, text: string): CSharpEditorConfigSummary {
    return parseAnalyzerConfig(filePath, relativePath, text, 'editorconfig');
}

export function parseGlobalAnalyzerConfig(filePath: string, relativePath: string, text: string): CSharpEditorConfigSummary {
    return parseAnalyzerConfig(filePath, relativePath, text, 'globalconfig');
}

function parseAnalyzerConfig(filePath: string, relativePath: string, text: string, kind: CSharpEditorConfigSummary['kind']): CSharpEditorConfigSummary {
    const sections: CSharpEditorConfigSection[] = [];
    let root: boolean | undefined;
    let isGlobal: boolean | undefined = kind === 'globalconfig' ? true : undefined;
    let globalLevel: string | undefined;
    let current: CSharpEditorConfigSection | undefined;
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || line.startsWith(';')) {
            continue;
        }
        const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
        if (sectionMatch) {
            current = {
                pattern: sectionMatch[1].trim(),
                properties: []
            };
            sections.push(current);
            continue;
        }
        const separatorIndex = line.indexOf('=');
        if (separatorIndex < 0) {
            continue;
        }
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (!key) {
            continue;
        }
        if (!current && key.toLowerCase() === 'root') {
            root = /^(true|1|yes)$/i.test(value);
            continue;
        }
        if (!current && key.toLowerCase() === 'is_global') {
            isGlobal = /^(true|1|yes)$/i.test(value);
            continue;
        }
        if (!current && key.toLowerCase() === 'global_level') {
            globalLevel = value;
            continue;
        }
        if (!current) {
            current = {
                pattern: kind === 'globalconfig' ? 'global' : '*',
                properties: []
            };
            sections.push(current);
        }
        current.properties.push({ key, value });
    }
    const properties = sections.flatMap(section => section.properties);
    return {
        path: filePath,
        relativePath,
        kind,
        root,
        isGlobal,
        globalLevel,
        sections,
        csharpPropertyCount: properties.filter(property => /^csharp_/i.test(property.key)).length,
        dotnetPropertyCount: properties.filter(property => /^dotnet_/i.test(property.key)).length,
        analyzerRuleCount: properties.filter(property => /^dotnet_diagnostic\.[^.]+\.severity$/i.test(property.key)).length
    };
}

export function parseGlobalJson(filePath: string, relativePath: string, jsonText: string): CSharpGlobalJsonSummary {
    const parsed = JSON.parse(jsonText) as unknown;
    const sdk = isRecord(parsed) && isRecord(parsed.sdk) ? parsed.sdk : {};
    const test = isRecord(parsed) && isRecord(parsed.test) ? parsed.test : {};
    return {
        path: filePath,
        relativePath,
        sdkVersion: stringValue(sdk.version),
        rollForward: stringValue(sdk.rollForward),
        allowPrerelease: typeof sdk.allowPrerelease === 'boolean' ? sdk.allowPrerelease : undefined,
        paths: stringArrayValue(sdk.paths) ?? [],
        testRunner: stringValue(test.runner)
    };
}

export function parseCsproj(
    projectPath: string,
    xml: string,
    launchProfiles: CSharpLaunchProfile[] = [],
    centralPackageVersions: CSharpCentralPackageVersion[] = []
): CSharpProjectSummary {
    const name = csharpProjectDisplayName(projectPath);
    const sdk = matchFirst(xml, /<Project\b[^>]*\bSdk="([^"]+)"/i);
    const outputType = firstProperty(xml, 'OutputType');
    const assemblyName = firstProperty(xml, 'AssemblyName') ?? name;
    const targetFrameworks = splitFrameworks(firstProperty(xml, 'TargetFrameworks') ?? firstProperty(xml, 'TargetFramework'));
    const packageReferences = parsePackageReferences(projectPath, xml, centralPackageVersions);
    const projectReferences = parseProjectReferences(xml);
    const testFramework = detectTestFramework(xml, packageReferences, sdk);
    const testRunner = detectDotnetTestRunner(xml, packageReferences, sdk);
    const isTestProject = detectTestProject(xml, packageReferences, name, sdk, testFramework, testRunner);
    const isAspNetCore = /Microsoft\.NET\.Sdk\.Web/i.test(sdk ?? '') || packageReferences.some(reference => /Microsoft\.AspNetCore/i.test(reference.id));
    const kind = detectProjectKind({ outputType, isTestProject, isAspNetCore, packageReferences, sdk });
    return {
        path: projectPath,
        directory: projectDirectory(projectPath),
        name,
        assemblyName,
        sdk,
        kind,
        targetFrameworks,
        outputType,
        nullable: firstProperty(xml, 'Nullable'),
        implicitUsings: firstProperty(xml, 'ImplicitUsings'),
        userSecretsId: firstProperty(xml, 'UserSecretsId'),
        packageReferences,
        projectReferences,
        msBuildFiles: [],
        files: [],
        razorFiles: [],
        launchProfiles,
        publishProfiles: [],
        isAspNetCore,
        isTestProject,
        testFramework,
        testRunner
    };
}

export function parseMsBuildFile(filePath: string, relativePath: string, kind: CSharpMsBuildFileKind, xml: string): CSharpMsBuildFileSummary {
    const properties: CSharpMsBuildFileSummary['properties'] = [];
    const propertyGroupRegex = /<PropertyGroup\b([^>]*)>([\s\S]*?)<\/PropertyGroup>/gi;
    let groupMatch: RegExpExecArray | null;
    while ((groupMatch = propertyGroupRegex.exec(xml))) {
        const groupCondition = xmlAttribute(attributesFromXml(groupMatch[1]), 'Condition');
        const propertyRegex = /<([A-Za-z_][\w:.-]*)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
        let propertyMatch: RegExpExecArray | null;
        while ((propertyMatch = propertyRegex.exec(groupMatch[2]))) {
            const value = propertyMatch[3].trim();
            if (!value || /<[A-Za-z_][\w:.-]*\b/.test(value)) {
                continue;
            }
            const condition = xmlAttribute(attributesFromXml(propertyMatch[2]), 'Condition') ?? groupCondition;
            properties.push({
                name: propertyMatch[1],
                value: decodeXml(value),
                condition
            });
        }
    }
    return {
        path: filePath,
        relativePath,
        kind,
        properties
    };
}

export function parsePublishProfile(profilePath: string, relativePath: string, xml: string): CSharpPublishProfile {
    return {
        path: profilePath,
        relativePath,
        name: relativePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.pubxml$/i, '') ?? csharpProjectDisplayName(profilePath),
        publishProtocol: firstProperty(xml, 'PublishProtocol'),
        publishUrl: firstProperty(xml, 'PublishUrl'),
        publishDir: firstProperty(xml, 'PublishDir'),
        targetFramework: firstProperty(xml, 'TargetFramework'),
        runtimeIdentifier: firstProperty(xml, 'RuntimeIdentifier'),
        lastUsedBuildConfiguration: firstProperty(xml, 'LastUsedBuildConfiguration'),
        lastUsedPlatform: firstProperty(xml, 'LastUsedPlatform'),
        webPublishMethod: firstProperty(xml, 'WebPublishMethod'),
        selfContained: firstProperty(xml, 'SelfContained')
    };
}

export function parseCentralPackageVersions(filePath: string, xml: string): CSharpCentralPackageVersion[] {
    const versions: CSharpCentralPackageVersion[] = [];
    const packageVersionRegex = /<PackageVersion\b([^>]*?)(?:\/>|>([\s\S]*?)<\/PackageVersion>)/gi;
    let match: RegExpExecArray | null;
    while ((match = packageVersionRegex.exec(xml))) {
        const attributes = attributesFromXml(match[1]);
        const body = match[2] ?? '';
        const id = attributes.Include ?? attributes.Update;
        const version = attributes.Version ?? firstProperty(body, 'Version');
        if (!id || !version) {
            continue;
        }
        versions.push({
            id,
            version,
            path: filePath
        });
    }
    return uniqueCentralPackageVersions(versions);
}

export function parseNuGetConfig(filePath: string, relativePath: string, xml: string): CSharpNuGetConfigSummary {
    const disabledPackageSources = addElementsFromSection(xml, 'disabledPackageSources')
        .filter(attributes => disabledNuGetConfigValue(xmlAttribute(attributes, 'value')))
        .map(attributes => xmlAttribute(attributes, 'key'))
        .filter((key): key is string => !!key);
    const disabledSourceKeys = new Set(disabledPackageSources.map(source => source.toLowerCase()));
    const packageSources: CSharpNuGetPackageSource[] = [];
    for (const attributes of addElementsFromSection(xml, 'packageSources')) {
        const key = xmlAttribute(attributes, 'key');
        const value = xmlAttribute(attributes, 'value');
        if (!key || !value) {
            continue;
        }
        packageSources.push({
            key,
            value,
            protocolVersion: xmlAttribute(attributes, 'protocolVersion'),
            disabled: disabledSourceKeys.has(key.toLowerCase())
        });
    }

    return {
        path: filePath,
        relativePath,
        clearPackageSources: sectionHasClear(xml, 'packageSources'),
        packageSources,
        disabledPackageSources: unique(disabledPackageSources),
        packageSourceMappings: parseNuGetPackageSourceMappings(xml)
    };
}

export function parseLaunchSettings(jsonText: string): CSharpLaunchProfile[] {
    const parsed = JSON.parse(jsonText) as { profiles?: Record<string, Record<string, unknown>> };
    const profiles = parsed.profiles ?? {};
    return Object.keys(profiles).map(name => {
        const profile = profiles[name] ?? {};
        const environmentVariables = isRecord(profile.environmentVariables)
            ? Object.fromEntries(Object.entries(profile.environmentVariables).map(([key, value]) => [key, String(value)]))
            : {};
        return {
            name,
            commandName: stringValue(profile.commandName),
            applicationUrl: stringValue(profile.applicationUrl),
            applicationUrls: splitLaunchUrls(stringValue(profile.applicationUrl)),
            launchUrl: stringValue(profile.launchUrl),
            launchBrowser: typeof profile.launchBrowser === 'boolean' ? profile.launchBrowser : undefined,
            commandLineArgs: stringValue(profile.commandLineArgs),
            workingDirectory: stringValue(profile.workingDirectory),
            executablePath: stringValue(profile.executablePath),
            browserUrl: stringValue(profile.browserUrl),
            sslPort: numberValue(profile.sslPort),
            dotnetRunMessages: typeof profile.dotnetRunMessages === 'boolean' ? profile.dotnetRunMessages : undefined,
            nativeDebugging: typeof profile.nativeDebugging === 'boolean' ? profile.nativeDebugging : undefined,
            hotReloadEnabled: typeof profile.hotReloadEnabled === 'boolean' ? profile.hotReloadEnabled : undefined,
            externalUrlConfiguration: typeof profile.externalUrlConfiguration === 'boolean' ? profile.externalUrlConfiguration : undefined,
            inspectUri: stringValue(profile.inspectUri),
            environmentVariables
        };
    });
}

export function parseDotnetTestListOutput(output: string, projectPath: string): CSharpTestCase[] {
    const tests: CSharpTestCase[] = [];
    let framework: string | undefined;
    for (const rawLine of output.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }
        const frameworkMatch = /^The following Tests are available for (.+):$/i.exec(line);
        if (frameworkMatch) {
            framework = frameworkMatch[1].trim();
            continue;
        }
        if (/^The following Tests are available:?$/i.test(line)) {
            framework = undefined;
            continue;
        }
        if (/^(Build started|Build succeeded|Test run for|VSTest version|The following Tests are available|No test is available)/i.test(line)) {
            continue;
        }
        if (/^[A-Za-z]:\\/.test(line) || line.startsWith('/')) {
            continue;
        }
        if (line.includes('.') || line.includes('(')) {
            tests.push(testCaseFromName(line, projectPath, framework));
        }
    }
    return tests;
}

export function parseDotnetTestTrx(
    trxXml: string,
    projectPath: string,
    commandStdout = '',
    commandStderr = '',
    exitCode?: number
): CSharpTestResult[] {
    const namesByTestId = parseTrxTestNames(trxXml);
    const results: CSharpTestResult[] = [];
    const resultRegex = /<UnitTestResult\b([^>]*?)(?:\/>|>([\s\S]*?)<\/UnitTestResult>)/gi;
    let match: RegExpExecArray | null;
    while ((match = resultRegex.exec(trxXml))) {
        const attributes = attributesFromXml(match[1]);
        const body = match[2] ?? '';
        const name = namesByTestId.get(attributes.testId ?? '') ?? attributes.testName;
        if (!name) {
            continue;
        }
        const error = trxErrorOutput(body);
        const stdout = xmlTagText(body, 'StdOut') ?? xmlTagText(body, 'StdErr') ?? commandStdout;
        results.push({
            name,
            projectPath,
            outcome: normalizeTrxOutcome(attributes.outcome),
            stdout,
            stderr: error || commandStderr,
            exitCode,
            durationMs: parseTrxDurationMs(attributes.duration)
        });
    }
    return results;
}

export function parseDotnetPackageListOutput(output: string): CSharpPackageReference[] {
    const packages: CSharpPackageReference[] = [];
    for (const rawLine of output.split(/\r?\n/)) {
        const line = rawLine.trim();
        const match = /^>\s+([^\s]+)\s+([^\s]+)(?:\s+([^\s]+))?/.exec(line);
        if (!match) {
            continue;
        }
        packages.push({
            id: match[1],
            version: match[3] ?? match[2],
            transitive: /Transitive Package/i.test(output.slice(0, Math.max(0, output.indexOf(rawLine))))
        });
    }
    return packages;
}

export function parseDotnetPackageOutdatedOutput(output: string, fallbackProjectPath?: string): CSharpPackageUpdate[] {
    const jsonUpdates = parseDotnetPackageOutdatedJson(output, fallbackProjectPath);
    if (jsonUpdates.length) {
        return jsonUpdates;
    }
    return parseDotnetPackageOutdatedText(output, fallbackProjectPath);
}

export function parseDotnetPackageHealthOutput(
    output: string,
    kind: CSharpPackageHealthIssueKind,
    fallbackProjectPath?: string
): CSharpPackageHealthIssue[] {
    const jsonIssues = parseDotnetPackageHealthJson(output, kind, fallbackProjectPath);
    if (jsonIssues.length) {
        return jsonIssues;
    }
    return parseDotnetPackageHealthText(output, kind, fallbackProjectPath);
}

export function parseDotnetBuildDiagnostics(output: string, fallbackProjectPath?: string): CSharpDiagnostic[] {
    const diagnostics: CSharpDiagnostic[] = [];
    const seen = new Set<string>();
    for (const rawLine of output.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }
        const fileMatch = MSBUILD_FILE_DIAGNOSTIC.exec(line);
        const diagnostic = fileMatch
            ? fileDiagnosticFromMatch(fileMatch)
            : projectDiagnosticFromLine(line, fallbackProjectPath);
        if (!diagnostic) {
            continue;
        }
        const key = [
            diagnostic.path,
            diagnostic.line,
            diagnostic.column,
            diagnostic.endLine ?? '',
            diagnostic.endColumn ?? '',
            diagnostic.severity,
            diagnostic.code ?? '',
            diagnostic.message,
            diagnostic.projectPath ?? ''
        ].join('\0');
        if (!seen.has(key)) {
            seen.add(key);
            diagnostics.push(diagnostic);
        }
    }
    return diagnostics;
}

export function parseRazorFileSummary(filePath: string, relativePath: string, text: string): CSharpRazorFileSummary {
    const directives: CSharpRazorDirective[] = [];
    const routeTemplates: string[] = [];
    const usings: string[] = [];
    const injections: CSharpRazorInjection[] = [];
    const tagHelpers: string[] = [];
    const removeTagHelpers: string[] = [];
    let model: string | undefined;
    let namespace: string | undefined;
    let inherits: string | undefined;
    let layout: string | undefined;
    let tagHelperPrefix: string | undefined;

    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const match = RAZOR_DIRECTIVE_REGEX.exec(line);
        if (!match) {
            continue;
        }
        const kind = normalizeRazorDirectiveKind(match[1]);
        const value = (match[2] ?? '').trim();
        const directive: CSharpRazorDirective = {
            kind,
            value,
            line: index + 1,
            column: Math.max(1, line.indexOf('@') + 1)
        };
        if (kind === 'page') {
            const route = unquote(value);
            if (route) {
                routeTemplates.push(route);
            }
        } else if (kind === 'model') {
            model = value;
            directive.type = value;
        } else if (kind === 'namespace') {
            namespace = value;
        } else if (kind === 'inherits') {
            inherits = value;
            directive.type = value;
        } else if (kind === 'using') {
            usings.push(value);
        } else if (kind === 'layout') {
            layout = value;
            directive.type = value;
        } else if (kind === 'addtaghelper') {
            tagHelpers.push(value);
            directive.name = value;
        } else if (kind === 'removetaghelper') {
            removeTagHelpers.push(value);
            directive.name = value;
        } else if (kind === 'taghelperprefix') {
            tagHelperPrefix = value;
            directive.name = value;
        } else if (kind === 'inject') {
            const injection = parseRazorInjection(value, directive.line);
            if (injection) {
                directive.type = injection.type;
                directive.name = injection.name;
                injections.push(injection);
            }
        }
        directives.push(directive);
    }

    return {
        path: filePath,
        relativePath,
        kind: razorFileKind(filePath),
        routeTemplates: unique(routeTemplates),
        model,
        namespace,
        inherits,
        layout,
        usings: unique(usings),
        injections,
        directives,
        tagHelpers: unique(tagHelpers),
        removeTagHelpers: unique(removeTagHelpers),
        tagHelperPrefix,
        importedFiles: [],
        effectiveNamespace: namespace,
        effectiveLayout: layout,
        effectiveUsings: unique(usings),
        effectiveInjections: injections,
        effectiveTagHelpers: unique(tagHelpers),
        effectiveTagHelperPrefix: tagHelperPrefix,
        componentTags: parseRazorComponentTags(text)
    };
}

function normalizeRazorDirectiveKind(value: string): CSharpRazorDirectiveKind {
    switch (value.toLowerCase()) {
        case 'page':
        case 'model':
        case 'inherits':
        case 'inject':
        case 'using':
        case 'namespace':
        case 'layout':
        case 'addtaghelper':
        case 'removetaghelper':
        case 'taghelperprefix':
        case 'rendermode':
        case 'attribute':
        case 'implements':
        case 'typeparam':
        case 'code':
        case 'functions':
        case 'section':
            return value.toLowerCase() as CSharpRazorDirectiveKind;
        default:
            return 'unknown';
    }
}

function parseRazorInjection(value: string, line: number): CSharpRazorInjection | undefined {
    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
        return undefined;
    }
    const name = parts[parts.length - 1];
    const type = parts.slice(0, -1).join(' ');
    return { type, name, line };
}

function parseRazorComponentTags(text: string): string[] {
    const result: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = RAZOR_COMPONENT_TAG_REGEX.exec(text))) {
        result.push(match[1]);
    }
    return unique(result).slice(0, 80);
}

function razorFileKind(filePath: string): CSharpRazorFileKind {
    return filePath.toLowerCase().endsWith('.cshtml') ? 'cshtml' : 'razor';
}

function fileDiagnosticFromMatch(match: RegExpExecArray): CSharpDiagnostic {
    return {
        path: stripQuotes(match[1].trim()),
        line: Number(match[2]),
        column: Number(match[3]),
        endLine: match[4] ? Number(match[4]) : undefined,
        endColumn: match[5] ? Number(match[5]) : undefined,
        severity: normalizeDiagnosticSeverity(match[6]),
        code: match[7],
        message: match[8].trim(),
        projectPath: match[9] ? stripQuotes(match[9].trim()) : undefined
    };
}

function projectDiagnosticFromLine(line: string, fallbackProjectPath?: string): CSharpDiagnostic | undefined {
    const match = MSBUILD_PROJECT_DIAGNOSTIC.exec(line);
    if (!match) {
        return undefined;
    }
    const projectPath = match[5] ? stripQuotes(match[5].trim()) : fallbackProjectPath;
    if (!projectPath) {
        return undefined;
    }
    return {
        path: projectPath,
        line: 1,
        column: 1,
        severity: normalizeDiagnosticSeverity(match[2]),
        code: match[3],
        message: match[4].trim(),
        projectPath
    };
}

function normalizeDiagnosticSeverity(value: string): CSharpDiagnosticSeverity {
    if (/^error$/i.test(value)) {
        return 'error';
    }
    if (/^warning$/i.test(value)) {
        return 'warning';
    }
    return 'info';
}

function parseIndentedListAfterHeader(output: string, header: string): string[] {
    const lines = output.split(/\r?\n/);
    const start = lines.findIndex(line => line.trim() === header);
    if (start < 0) {
        return [];
    }
    const result: string[] = [];
    for (let index = start + 1; index < lines.length; index++) {
        const line = lines[index];
        if (!line.trim()) {
            break;
        }
        if (!/^\s/.test(line)) {
            break;
        }
        result.push(line.trim());
    }
    return result;
}

function parsePackageReferences(
    projectPath: string,
    xml: string,
    centralPackageVersions: CSharpCentralPackageVersion[]
): CSharpPackageReference[] {
    const references: CSharpPackageReference[] = [];
    const centralVersions = new Map(centralPackageVersions.map(version => [version.id.toLowerCase(), version]));
    const packageRegex = /<PackageReference\b([^>]*?)(?:\/>|>([\s\S]*?)<\/PackageReference>)/gi;
    let match: RegExpExecArray | null;
    while ((match = packageRegex.exec(xml))) {
        const attributes = attributesFromXml(match[1]);
        const body = match[2] ?? '';
        const id = attributes.Include ?? attributes.Update ?? attributes.Remove;
        if (!id) {
            continue;
        }
        const projectVersion = attributes.Version
            ?? attributes.VersionOverride
            ?? firstProperty(body, 'Version')
            ?? firstProperty(body, 'VersionOverride');
        const centralVersion = centralVersions.get(id.toLowerCase());
        const version = projectVersion ?? centralVersion?.version;
        references.push({
            id,
            version,
            privateAssets: attributes.PrivateAssets ?? firstProperty(body, 'PrivateAssets'),
            includeAssets: attributes.IncludeAssets ?? firstProperty(body, 'IncludeAssets'),
            versionSource: projectVersion ? 'project' : centralVersion ? 'central' : undefined,
            versionPath: projectVersion ? projectPath : centralVersion?.path
        });
    }
    return references;
}

function parseProjectReferences(xml: string): CSharpProjectReference[] {
    const references: CSharpProjectReference[] = [];
    const projectRegex = /<ProjectReference\b([^>]*?)(?:\/>|>[\s\S]*?<\/ProjectReference>)/gi;
    let match: RegExpExecArray | null;
    while ((match = projectRegex.exec(xml))) {
        const include = attributesFromXml(match[1]).Include;
        if (include) {
            references.push({ path: include });
        }
    }
    return references;
}

function parseDotnetPackageOutdatedJson(output: string, fallbackProjectPath?: string): CSharpPackageUpdate[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(output);
    } catch {
        return [];
    }
    if (!isRecord(parsed)) {
        return [];
    }
    const projects = Array.isArray(parsed.projects) ? parsed.projects.filter(isRecord) : [];
    const updates: CSharpPackageUpdate[] = [];
    for (const project of projects) {
        const projectPath = stringValue(project.path) ?? stringValue(project.projectPath) ?? fallbackProjectPath;
        const frameworks = Array.isArray(project.frameworks) ? project.frameworks.filter(isRecord) : [];
        for (const framework of frameworks) {
            const frameworkName = stringValue(framework.framework) ?? stringValue(framework.name) ?? stringValue(framework.targetFramework);
            updates.push(
                ...packageUpdatesFromJsonGroup(framework.topLevelPackages, projectPath, frameworkName, false),
                ...packageUpdatesFromJsonGroup(framework.transitivePackages, projectPath, frameworkName, true)
            );
        }
    }
    return uniquePackageUpdates(updates);
}

function packageUpdatesFromJsonGroup(value: unknown, projectPath: string | undefined, framework: string | undefined, transitive: boolean): CSharpPackageUpdate[] {
    const packages = Array.isArray(value) ? value.filter(isRecord) : [];
    return packages.map(item => ({
        id: stringValue(item.id) ?? '',
        requestedVersion: stringValue(item.requestedVersion) ?? stringValue(item.requested),
        resolvedVersion: stringValue(item.resolvedVersion) ?? stringValue(item.resolved),
        latestVersion: stringValue(item.latestVersion) ?? stringValue(item.latest),
        framework,
        projectPath,
        transitive
    })).filter(item => item.id && item.latestVersion);
}

function parseDotnetPackageOutdatedText(output: string, fallbackProjectPath?: string): CSharpPackageUpdate[] {
    const updates: CSharpPackageUpdate[] = [];
    let framework: string | undefined;
    let transitive = false;
    for (const rawLine of output.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }
        const frameworkMatch = /^\[([^\]]+)\]:/.exec(line);
        if (frameworkMatch) {
            framework = frameworkMatch[1].trim();
            transitive = false;
            continue;
        }
        if (/^Transitive Package/i.test(line)) {
            transitive = true;
            continue;
        }
        if (/^Top-level Package/i.test(line)) {
            transitive = false;
            continue;
        }
        const match = /^>\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)(?:\s+([^\s]+))?/.exec(line);
        if (!match) {
            continue;
        }
        const requestedVersion = match[4] ? match[2] : undefined;
        const resolvedVersion = match[4] ? match[3] : match[2];
        const latestVersion = match[4] ?? match[3];
        updates.push({
            id: match[1],
            requestedVersion,
            resolvedVersion,
            latestVersion,
            framework,
            projectPath: fallbackProjectPath,
            transitive
        });
    }
    return uniquePackageUpdates(updates);
}

function parseDotnetPackageHealthJson(
    output: string,
    kind: CSharpPackageHealthIssueKind,
    fallbackProjectPath?: string
): CSharpPackageHealthIssue[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(output);
    } catch {
        return [];
    }
    if (!isRecord(parsed)) {
        return [];
    }
    const projects = Array.isArray(parsed.projects) ? parsed.projects.filter(isRecord) : [];
    const issues: CSharpPackageHealthIssue[] = [];
    for (const project of projects) {
        const projectPath = stringValue(project.path) ?? stringValue(project.projectPath) ?? fallbackProjectPath;
        const frameworks = Array.isArray(project.frameworks) ? project.frameworks.filter(isRecord) : [];
        for (const framework of frameworks) {
            const frameworkName = stringValue(framework.framework) ?? stringValue(framework.name) ?? stringValue(framework.targetFramework);
            issues.push(
                ...packageHealthIssuesFromJsonGroup(framework.topLevelPackages, kind, projectPath, frameworkName, false),
                ...packageHealthIssuesFromJsonGroup(framework.transitivePackages, kind, projectPath, frameworkName, true)
            );
        }
    }
    return uniquePackageHealthIssues(issues);
}

function packageHealthIssuesFromJsonGroup(
    value: unknown,
    kind: CSharpPackageHealthIssueKind,
    projectPath: string | undefined,
    framework: string | undefined,
    transitive: boolean
): CSharpPackageHealthIssue[] {
    const packages = Array.isArray(value) ? value.filter(isRecord) : [];
    const issues: CSharpPackageHealthIssue[] = [];
    for (const item of packages) {
        const id = stringValue(item.id);
        if (!id) {
            continue;
        }
        if (kind === 'vulnerable') {
            const vulnerabilities = Array.isArray(item.vulnerabilities) ? item.vulnerabilities.filter(isRecord) : [];
            const vulnerabilityEntries: Record<string, unknown>[] = vulnerabilities.length ? vulnerabilities : [{}];
            for (const vulnerability of vulnerabilityEntries) {
                issues.push({
                    id,
                    kind,
                    requestedVersion: stringValue(item.requestedVersion) ?? stringValue(item.requested),
                    resolvedVersion: stringValue(item.resolvedVersion) ?? stringValue(item.resolved),
                    framework,
                    projectPath,
                    transitive,
                    severity: stringValue(vulnerability.severity),
                    advisoryUrl: stringValue(vulnerability.advisoryUrl) ?? stringValue(vulnerability.advisoryurl),
                    advisoryUrls: stringArrayValue(vulnerability.advisoryUrls)
                });
            }
        } else {
            const alternative = isRecord(item.alternativePackage) ? item.alternativePackage : undefined;
            issues.push({
                id,
                kind,
                requestedVersion: stringValue(item.requestedVersion) ?? stringValue(item.requested),
                resolvedVersion: stringValue(item.resolvedVersion) ?? stringValue(item.resolved),
                framework,
                projectPath,
                transitive,
                deprecationReasons: stringArrayValue(item.deprecationReasons),
                alternativePackageId: stringValue(alternative?.id),
                alternativePackageVersion: stringValue(alternative?.version)
            });
        }
    }
    return issues;
}

function parseDotnetPackageHealthText(
    output: string,
    kind: CSharpPackageHealthIssueKind,
    fallbackProjectPath?: string
): CSharpPackageHealthIssue[] {
    const issues: CSharpPackageHealthIssue[] = [];
    let framework: string | undefined;
    let transitive = false;
    for (const rawLine of output.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }
        const frameworkMatch = /^\[([^\]]+)\]:/.exec(line);
        if (frameworkMatch) {
            framework = frameworkMatch[1].trim();
            transitive = false;
            continue;
        }
        if (/^Transitive Package/i.test(line)) {
            transitive = true;
            continue;
        }
        if (/^Top-level Package/i.test(line)) {
            transitive = false;
            continue;
        }
        const match = /^>\s+([^\s]+)\s+([^\s]+)(?:\s+([^\s]+))?(?:\s+(.*))?$/.exec(line);
        if (!match) {
            continue;
        }
        const detail = match[4]?.trim();
        issues.push({
            id: match[1],
            kind,
            requestedVersion: match[3] ? match[2] : undefined,
            resolvedVersion: match[3] ?? match[2],
            framework,
            projectPath: fallbackProjectPath,
            transitive,
            severity: kind === 'vulnerable' ? firstToken(detail) : undefined,
            advisoryUrl: kind === 'vulnerable' ? urlFromText(detail) : undefined,
            deprecationReasons: kind === 'deprecated' && detail ? [detail] : undefined,
            message: detail
        });
    }
    return uniquePackageHealthIssues(issues);
}

function uniquePackageUpdates(updates: CSharpPackageUpdate[]): CSharpPackageUpdate[] {
    const seen = new Set<string>();
    const result: CSharpPackageUpdate[] = [];
    for (const update of updates) {
        const key = [
            update.projectPath ?? '',
            update.framework ?? '',
            update.id.toLowerCase(),
            update.requestedVersion ?? '',
            update.resolvedVersion ?? '',
            update.latestVersion ?? '',
            update.transitive ? 'transitive' : 'direct'
        ].join('\0');
        if (!seen.has(key)) {
            seen.add(key);
            result.push(update);
        }
    }
    return result;
}

function uniquePackageHealthIssues(issues: CSharpPackageHealthIssue[]): CSharpPackageHealthIssue[] {
    const seen = new Set<string>();
    const result: CSharpPackageHealthIssue[] = [];
    for (const issue of issues) {
        const key = [
            issue.projectPath ?? '',
            issue.framework ?? '',
            issue.id.toLowerCase(),
            issue.kind,
            issue.resolvedVersion ?? '',
            issue.severity ?? '',
            issue.advisoryUrl ?? '',
            issue.deprecationReasons?.join('|') ?? '',
            issue.transitive ? 'transitive' : 'direct'
        ].join('\0');
        if (!seen.has(key)) {
            seen.add(key);
            result.push(issue);
        }
    }
    return result;
}

function parseTrxTestNames(trxXml: string): Map<string, string> {
    const names = new Map<string, string>();
    const unitTestRegex = /<UnitTest\b([^>]*?)(?:\/>|>([\s\S]*?)<\/UnitTest>)/gi;
    let match: RegExpExecArray | null;
    while ((match = unitTestRegex.exec(trxXml))) {
        const attributes = attributesFromXml(match[1]);
        const body = match[2] ?? '';
        const id = attributes.id;
        if (!id) {
            continue;
        }
        const methodMatch = /<TestMethod\b([^>]*?)(?:\/>|>[\s\S]*?<\/TestMethod>)/i.exec(body);
        if (methodMatch) {
            const method = attributesFromXml(methodMatch[1]);
            const methodName = method.name;
            const className = method.className;
            if (methodName && className) {
                names.set(id, methodName.startsWith(`${className}.`) ? methodName : `${className}.${methodName}`);
                continue;
            }
            if (methodName) {
                names.set(id, methodName);
                continue;
            }
        }
        if (attributes.name) {
            names.set(id, attributes.name);
        }
    }
    return names;
}

function testCaseFromName(name: string, projectPath: string, framework: string | undefined): CSharpTestCase {
    const identity = parseTestIdentity(name);
    return {
        id: `${projectPath}:${name}`,
        name,
        fullyQualifiedName: identity.fullyQualifiedName,
        displayName: identity.displayName,
        projectPath,
        framework,
        namespaceName: identity.namespaceName,
        className: identity.className,
        methodName: identity.methodName,
        arguments: identity.arguments
    };
}

function parseTestIdentity(name: string): {
    fullyQualifiedName: string;
    displayName: string;
    namespaceName?: string;
    className?: string;
    methodName?: string;
    arguments?: string;
} {
    const argumentsMatch = /(\(.*\))$/.exec(name);
    const args = argumentsMatch?.[1];
    const fullyQualifiedName = args ? name.slice(0, -args.length) : name;
    const methodSeparator = fullyQualifiedName.lastIndexOf('.');
    const methodName = methodSeparator >= 0 ? fullyQualifiedName.slice(methodSeparator + 1) : fullyQualifiedName;
    const classAndNamespace = methodSeparator >= 0 ? fullyQualifiedName.slice(0, methodSeparator) : undefined;
    const classSeparator = classAndNamespace?.lastIndexOf('.') ?? -1;
    const className = classAndNamespace
        ? classSeparator >= 0 ? classAndNamespace.slice(classSeparator + 1) : classAndNamespace
        : undefined;
    const namespaceName = classAndNamespace && classSeparator >= 0 ? classAndNamespace.slice(0, classSeparator) : undefined;
    return {
        fullyQualifiedName,
        displayName: `${methodName}${args ?? ''}`,
        namespaceName,
        className,
        methodName,
        arguments: args
    };
}

function normalizeTrxOutcome(value: string | undefined): CSharpTestResult['outcome'] {
    if (/^passed$/i.test(value ?? '')) {
        return 'passed';
    }
    if (/^(notexecuted|not executed|skipped)$/i.test(value ?? '')) {
        return 'skipped';
    }
    if (/^failed$/i.test(value ?? '')) {
        return 'failed';
    }
    return 'errored';
}

function parseTrxDurationMs(value: string | undefined): number {
    if (!value) {
        return 0;
    }
    const match = /^(?:(\d+)\.)?(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(value.trim());
    if (!match) {
        return 0;
    }
    const days = Number(match[1] ?? 0);
    const hours = Number(match[2]);
    const minutes = Number(match[3]);
    const seconds = Number(match[4]);
    const fraction = match[5] ? Number(`0.${match[5]}`) : 0;
    return Math.round((((days * 24 + hours) * 60 + minutes) * 60 + seconds + fraction) * 1000);
}

function trxErrorOutput(body: string): string {
    const errorInfo = /<ErrorInfo\b[^>]*>([\s\S]*?)<\/ErrorInfo>/i.exec(body)?.[1] ?? '';
    const message = xmlTagText(errorInfo, 'Message');
    const stackTrace = xmlTagText(errorInfo, 'StackTrace');
    return [message, stackTrace].filter(Boolean).join('\n');
}

function xmlTagText(xml: string, tagName: string): string | undefined {
    const match = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, 'i').exec(xml);
    if (!match) {
        return undefined;
    }
    const value = match[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();
    return value ? decodeXml(value) : undefined;
}

function detectTestProject(
    xml: string,
    packageReferences: CSharpPackageReference[],
    name: string,
    sdk: string | undefined,
    testFramework: CSharpTestFramework | undefined,
    testRunner: CSharpDotnetTestRunner | undefined
): boolean {
    return isTrueMsBuildProperty(xml, 'IsTestProject')
        || isTrueMsBuildProperty(xml, 'IsTestApplication')
        || /\.(Tests|Test)$/i.test(name)
        || Boolean(testFramework)
        || Boolean(testRunner)
        || isMSTestSdk(sdk)
        || packageReferences.some(reference => isTestPackage(reference.id));
}

function detectTestFramework(xml: string, packageReferences: CSharpPackageReference[], sdk: string | undefined): CSharpTestFramework | undefined {
    if (packageReferences.some(reference => /^xunit(?:\.|$)/i.test(reference.id))) {
        return 'xUnit';
    }
    if (packageReferences.some(reference => /^(NUnit|NUnit3TestAdapter)(?:\.|$)/i.test(reference.id))) {
        return 'NUnit';
    }
    if (
        isMSTestSdk(sdk)
        || isTrueMsBuildProperty(xml, 'EnableMSTestRunner')
        || packageReferences.some(reference => /^MSTest(?:\.|$)/i.test(reference.id))
    ) {
        return 'MSTest';
    }
    return undefined;
}

function detectDotnetTestRunner(
    xml: string,
    packageReferences: CSharpPackageReference[],
    sdk: string | undefined
): CSharpDotnetTestRunner | undefined {
    if (
        isMSTestSdk(sdk)
        || isTrueMsBuildProperty(xml, 'TestingPlatformDotnetTestSupport')
        || isTrueMsBuildProperty(xml, 'EnableMSTestRunner')
        || isTrueMsBuildProperty(xml, 'EnableNUnitRunner')
        || isTrueMsBuildProperty(xml, 'EnableXUnitRunner')
        || packageReferences.some(reference => /^Microsoft\.Testing\.Platform(?:\.|$)/i.test(reference.id))
    ) {
        return 'Microsoft.Testing.Platform';
    }
    if (packageReferences.some(reference => /^Microsoft\.NET\.Test\.Sdk$/i.test(reference.id))) {
        return 'VSTest';
    }
    return undefined;
}

function isTestPackage(packageId: string): boolean {
    return /^(?:xunit(?:\.|$)|NUnit(?:\.|$)|NUnit3TestAdapter(?:\.|$)|MSTest(?:\.|$)|Microsoft\.NET\.Test\.Sdk$|Microsoft\.Testing\.Platform(?:\.|$))/i.test(packageId);
}

function isMSTestSdk(sdk: string | undefined): boolean {
    return (sdk ?? '')
        .split(';')
        .map(value => value.trim())
        .some(value => /^MSTest\.Sdk(?:\/|$)/i.test(value));
}

function isTrueMsBuildProperty(xml: string, name: string): boolean {
    return /^(true|1)$/i.test(firstProperty(xml, name) ?? '');
}

function detectProjectKind(input: {
    outputType?: string;
    isTestProject: boolean;
    isAspNetCore: boolean;
    packageReferences: CSharpPackageReference[];
    sdk?: string;
}): CSharpProjectKind {
    if (input.isTestProject) {
        return 'test';
    }
    if (input.isAspNetCore) {
        return 'web';
    }
    if (/Worker/i.test(input.sdk ?? '') || input.packageReferences.some(reference => /Microsoft\.Extensions\.Hosting/i.test(reference.id))) {
        return 'worker';
    }
    if (/Exe/i.test(input.outputType ?? '')) {
        return 'console';
    }
    if (!input.outputType) {
        return 'library';
    }
    return 'unknown';
}

function attributesFromXml(text: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const attributeRegex = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = attributeRegex.exec(text))) {
        attributes[match[1]] = decodeXml(match[2]);
    }
    return attributes;
}

function addElementsFromSection(xml: string, sectionName: string): Record<string, string>[] {
    const result: Record<string, string>[] = [];
    for (const body of xmlSectionBodies(xml, sectionName)) {
        const addRegex = /<add\b([^>]*?)(?:\/>|>[\s\S]*?<\/add>)/gi;
        let match: RegExpExecArray | null;
        while ((match = addRegex.exec(body))) {
            result.push(attributesFromXml(match[1]));
        }
    }
    return result;
}

function parseNuGetPackageSourceMappings(xml: string): CSharpNuGetPackageSourceMapping[] {
    const mappings = new Map<string, string[]>();
    for (const body of xmlSectionBodies(xml, 'packageSourceMapping')) {
        const sourceRegex = /<packageSource\b([^>]*?)(?:\/>|>([\s\S]*?)<\/packageSource>)/gi;
        let sourceMatch: RegExpExecArray | null;
        while ((sourceMatch = sourceRegex.exec(body))) {
            const sourceKey = xmlAttribute(attributesFromXml(sourceMatch[1]), 'key');
            if (!sourceKey) {
                continue;
            }
            const patterns = parseNuGetPackagePatterns(sourceMatch[2] ?? '');
            if (!patterns.length) {
                continue;
            }
            mappings.set(sourceKey, unique([...(mappings.get(sourceKey) ?? []), ...patterns]));
        }
    }
    return [...mappings.entries()].map(([sourceKey, patterns]) => ({ sourceKey, patterns }));
}

function parseNuGetPackagePatterns(xml: string): string[] {
    const patterns: string[] = [];
    const packageRegex = /<package\b([^>]*?)(?:\/>|>[\s\S]*?<\/package>)/gi;
    let match: RegExpExecArray | null;
    while ((match = packageRegex.exec(xml))) {
        const pattern = xmlAttribute(attributesFromXml(match[1]), 'pattern');
        if (pattern) {
            patterns.push(pattern);
        }
    }
    return unique(patterns);
}

function parseSimpleXmlProperties(xml: string): CSharpRunSettingsProperty[] {
    const properties: CSharpRunSettingsProperty[] = [];
    const propertyRegex = /<([A-Za-z_][\w:.-]*)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null;
    while ((match = propertyRegex.exec(xml))) {
        const value = match[2].trim();
        if (!value || /<[A-Za-z_][\w:.-]*\b/.test(value)) {
            continue;
        }
        properties.push({
            name: match[1],
            value: decodeXml(value)
        });
    }
    return properties;
}

function parseRunSettingsParameters(xml: string): CSharpRunSettingsProperty[] {
    const parameters: CSharpRunSettingsProperty[] = [];
    const parameterRegex = /<Parameter\b([^>]*?)(?:\/>|>[\s\S]*?<\/Parameter>)/gi;
    let match: RegExpExecArray | null;
    while ((match = parameterRegex.exec(xml))) {
        const attributes = attributesFromXml(match[1]);
        const name = xmlAttribute(attributes, 'name');
        if (!name) {
            continue;
        }
        parameters.push({
            name,
            value: xmlAttribute(attributes, 'value') ?? ''
        });
    }
    return parameters;
}

function parseRunSettingsDataCollectors(xml: string): string[] {
    const collectors: string[] = [];
    const collectorRegex = /<DataCollector\b([^>]*?)(?:\/>|>[\s\S]*?<\/DataCollector>)/gi;
    let match: RegExpExecArray | null;
    while ((match = collectorRegex.exec(xml))) {
        const attributes = attributesFromXml(match[1]);
        const label = xmlAttribute(attributes, 'friendlyName')
            ?? xmlAttribute(attributes, 'uri')
            ?? xmlAttribute(attributes, 'assemblyQualifiedName');
        if (label) {
            collectors.push(label);
        }
    }
    return unique(collectors);
}

function sectionHasClear(xml: string, sectionName: string): boolean {
    return xmlSectionBodies(xml, sectionName).some(body => /<clear\b[^>]*\/?>/i.test(body));
}

function firstSectionBody(xml: string, sectionName: string): string | undefined {
    return xmlSectionBodies(xml, sectionName)[0];
}

function xmlSectionBodies(xml: string, sectionName: string): string[] {
    const bodies: string[] = [];
    const sectionRegex = new RegExp(`<${escapeRegExp(sectionName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(sectionName)}>`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = sectionRegex.exec(xml))) {
        bodies.push(match[1]);
    }
    return bodies;
}

function xmlAttribute(attributes: Record<string, string>, name: string): string | undefined {
    const exact = attributes[name];
    if (exact !== undefined) {
        return exact;
    }
    const key = Object.keys(attributes).find(candidate => candidate.toLowerCase() === name.toLowerCase());
    return key ? attributes[key] : undefined;
}

function disabledNuGetConfigValue(value: string | undefined): boolean {
    return /^(true|1|yes)$/i.test(value?.trim() ?? '');
}

function firstProperty(xml: string, name: string): string | undefined {
    const pattern = new RegExp(`<${escapeRegExp(name)}>([\\s\\S]*?)<\\/${escapeRegExp(name)}>`, 'i');
    const value = pattern.exec(xml)?.[1]?.trim();
    return value ? decodeXml(value) : undefined;
}

function splitFrameworks(value: string | undefined): string[] {
    return value ? value.split(';').map(item => item.trim()).filter(Boolean) : [];
}

function matchFirst(text: string, pattern: RegExp): string | undefined {
    return pattern.exec(text)?.[1];
}

function stringValue(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function stringArrayValue(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const result = value
        .map(item => typeof item === 'string' ? item : undefined)
        .filter((item): item is string => !!item);
    return result.length ? result : undefined;
}

function numberValue(value: unknown): number | undefined {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

function splitLaunchUrls(value: string | undefined): string[] | undefined {
    const urls = value?.split(';').map(item => item.trim()).filter(Boolean) ?? [];
    return urls.length ? urls : undefined;
}

function stripQuotes(value: string): string {
    return value.replace(/^"(.+)"$/, '$1');
}

function unquote(value: string): string {
    return value.replace(/^['"](.+)['"]$/, '$1').trim();
}

function firstToken(value: string | undefined): string | undefined {
    return value?.split(/\s+/).find(Boolean);
}

function urlFromText(value: string | undefined): string | undefined {
    return /https?:\/\/\S+/i.exec(value ?? '')?.[0];
}

function unique(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
}

function uniqueCentralPackageVersions(versions: CSharpCentralPackageVersion[]): CSharpCentralPackageVersion[] {
    const result = new Map<string, CSharpCentralPackageVersion>();
    for (const version of versions) {
        result.set(version.id.toLowerCase(), version);
    }
    return [...result.values()];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeXml(value: string): string {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function projectDirectory(projectPath: string): string {
    const normalized = projectPath.replace(/\\/g, '/');
    const index = normalized.lastIndexOf('/');
    return index >= 0 ? projectPath.slice(0, index) : '.';
}
