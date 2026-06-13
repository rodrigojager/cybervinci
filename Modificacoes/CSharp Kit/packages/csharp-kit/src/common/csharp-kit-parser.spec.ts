import { expect } from 'chai';
import { parseCentralPackageVersions, parseCsproj, parseDotnetBuildDiagnostics, parseDotnetInfo, parseDotnetPackageHealthOutput, parseDotnetPackageOutdatedOutput, parseDotnetTestListOutput, parseDotnetTestTrx, parseDotnetToolManifest, parseEditorConfig, parseGlobalAnalyzerConfig, parseGlobalJson, parseLaunchSettings, parseMsBuildFile, parseNuGetConfig, parsePublishProfile, parseRazorFileSummary, parseRunSettings } from './csharp-kit-parser';

describe('CSharpKit parser', () => {
    it('extracts SDK-style project metadata and test package references', () => {
        const project = parseCsproj('src/Orders.Api/Orders.Api.csproj', `
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <UserSecretsId>orders-api-secrets</UserSecretsId>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.12.0" />
    <PackageReference Include="xunit">
      <Version>2.9.2</Version>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
  </ItemGroup>
</Project>`);

        expect(project.name).to.equal('Orders.Api');
        expect(project.directory).to.equal('src/Orders.Api');
        expect(project.sdk).to.equal('Microsoft.NET.Sdk.Web');
        expect(project.targetFrameworks).to.deep.equal(['net9.0']);
        expect(project.kind).to.equal('test');
        expect(project.isAspNetCore).to.equal(true);
        expect(project.userSecretsId).to.equal('orders-api-secrets');
        expect(project.testFramework).to.equal('xUnit');
        expect(project.testRunner).to.equal('VSTest');
        expect(project.packageReferences.map(reference => reference.id)).to.deep.equal(['Microsoft.NET.Test.Sdk', 'xunit']);
        expect(project.packageReferences[1].privateAssets).to.equal('all');
        expect(project.files).to.deep.equal([]);
    });

    it('detects MSTest.Sdk projects that use Microsoft.Testing.Platform', () => {
        const project = parseCsproj('tests/Orders.Checks/Orders.Checks.csproj', `
<Project Sdk="MSTest.Sdk/4.1.0">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <TestingPlatformDotnetTestSupport>true</TestingPlatformDotnetTestSupport>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Testing.Platform" Version="1.7.0" />
  </ItemGroup>
</Project>`);

        expect(project.kind).to.equal('test');
        expect(project.isTestProject).to.equal(true);
        expect(project.testFramework).to.equal('MSTest');
        expect(project.testRunner).to.equal('Microsoft.Testing.Platform');
    });

    it('parses dotnet SDK and runtime inventory', () => {
        const info = parseDotnetInfo(`
.NET SDK:
 Version:           9.0.100

.NET SDKs installed:
  8.0.404 [C:\\Program Files\\dotnet\\sdk]
  9.0.100 [C:\\Program Files\\dotnet\\sdk]

.NET runtimes installed:
  Microsoft.AspNetCore.App 9.0.0 [C:\\Program Files\\dotnet\\shared\\Microsoft.AspNetCore.App]
  Microsoft.NETCore.App 9.0.0 [C:\\Program Files\\dotnet\\shared\\Microsoft.NETCore.App]
`);
        expect(info.available).to.equal(true);
        expect(info.version).to.equal('9.0.100');
        expect(info.sdks).to.have.length(2);
        expect(info.runtimes[0]).to.contain('Microsoft.AspNetCore.App');
    });

    it('parses global.json SDK selection', () => {
        const summary = parseGlobalJson('/repo/global.json', 'global.json', JSON.stringify({
            sdk: {
                version: '9.0.100',
                rollForward: 'latestFeature',
                allowPrerelease: false,
                paths: ['.dotnet']
            },
            test: {
                runner: 'Microsoft.Testing.Platform'
            }
        }));

        expect(summary).to.deep.equal({
            path: '/repo/global.json',
            relativePath: 'global.json',
            sdkVersion: '9.0.100',
            rollForward: 'latestFeature',
            allowPrerelease: false,
            paths: ['.dotnet'],
            testRunner: 'Microsoft.Testing.Platform'
        });
    });

    it('parses .editorconfig C# code-style and analyzer settings', () => {
        const summary = parseEditorConfig('/repo/.editorconfig', '.editorconfig', `
root = true

[*.cs]
csharp_style_var_for_built_in_types = true:suggestion
dotnet_style_qualification_for_field = false:warning
dotnet_diagnostic.CA2007.severity = warning

[*.{cs,razor}]
indent_size = 4
`);

        expect(summary.root).to.equal(true);
        expect(summary.sections.map(section => section.pattern)).to.deep.equal(['*.cs', '*.{cs,razor}']);
        expect(summary.csharpPropertyCount).to.equal(1);
        expect(summary.dotnetPropertyCount).to.equal(2);
        expect(summary.analyzerRuleCount).to.equal(1);
        expect(summary.sections[0].properties).to.deep.equal([
            {
                key: 'csharp_style_var_for_built_in_types',
                value: 'true:suggestion'
            },
            {
                key: 'dotnet_style_qualification_for_field',
                value: 'false:warning'
            },
            {
                key: 'dotnet_diagnostic.CA2007.severity',
                value: 'warning'
            }
        ]);
    });

    it('parses .globalconfig analyzer settings', () => {
        const summary = parseGlobalAnalyzerConfig('/repo/CodeAnalysis.globalconfig', 'CodeAnalysis.globalconfig', `
is_global = true
global_level = 150
dotnet_diagnostic.CA2000.severity = error
dotnet_code_quality.CA1822.api_surface = private, internal
build_property.TargetFramework = net9.0
`);

        expect(summary.kind).to.equal('globalconfig');
        expect(summary.isGlobal).to.equal(true);
        expect(summary.globalLevel).to.equal('150');
        expect(summary.sections.map(section => section.pattern)).to.deep.equal(['global']);
        expect(summary.dotnetPropertyCount).to.equal(2);
        expect(summary.analyzerRuleCount).to.equal(1);
        expect(summary.sections[0].properties).to.deep.equal([
            {
                key: 'dotnet_diagnostic.CA2000.severity',
                value: 'error'
            },
            {
                key: 'dotnet_code_quality.CA1822.api_surface',
                value: 'private, internal'
            },
            {
                key: 'build_property.TargetFramework',
                value: 'net9.0'
            }
        ]);
    });

    it('parses dotnet local tool manifests', () => {
        const manifest = parseDotnetToolManifest('/repo/.config/dotnet-tools.json', '.config/dotnet-tools.json', JSON.stringify({
            version: 1,
            isRoot: true,
            tools: {
                'dotnet-ef': {
                    version: '9.0.0',
                    commands: ['dotnet-ef'],
                    rollForward: false
                },
                'dotnet-format': {
                    version: '5.1.250801',
                    commands: ['dotnet-format']
                }
            }
        }));

        expect(manifest.isRoot).to.equal(true);
        expect(manifest.tools).to.deep.equal([
            {
                packageId: 'dotnet-ef',
                version: '9.0.0',
                commands: ['dotnet-ef'],
                rollForward: false
            },
            {
                packageId: 'dotnet-format',
                version: '5.1.250801',
                commands: ['dotnet-format'],
                rollForward: undefined
            }
        ]);
    });

    it('parses .runsettings test configuration', () => {
        const settings = parseRunSettings('/repo/test.runsettings', 'test.runsettings', `
<RunSettings>
  <RunConfiguration>
    <ResultsDirectory>TestResults</ResultsDirectory>
    <TargetPlatform>x64</TargetPlatform>
    <MaxCpuCount>2</MaxCpuCount>
  </RunConfiguration>
  <DataCollectionRunSettings>
    <DataCollectors>
      <DataCollector friendlyName="XPlat Code Coverage" />
    </DataCollectors>
  </DataCollectionRunSettings>
  <TestRunParameters>
    <Parameter name="Environment" value="CI" />
  </TestRunParameters>
  <MSTest>
    <MapInconclusiveToFailed>true</MapInconclusiveToFailed>
  </MSTest>
</RunSettings>`);

        expect(settings.name).to.equal('test');
        expect(settings.runConfiguration).to.deep.equal([
            {
                name: 'ResultsDirectory',
                value: 'TestResults'
            },
            {
                name: 'TargetPlatform',
                value: 'x64'
            },
            {
                name: 'MaxCpuCount',
                value: '2'
            }
        ]);
        expect(settings.dataCollectors).to.deep.equal(['XPlat Code Coverage']);
        expect(settings.testRunParameters).to.deep.equal([
            {
                name: 'Environment',
                value: 'CI'
            }
        ]);
        expect(settings.mstestSettings).to.deep.equal([
            {
                name: 'MapInconclusiveToFailed',
                value: 'true'
            }
        ]);
    });

    it('parses Visual Studio publish profiles', () => {
        const profile = parsePublishProfile('/repo/src/Orders.Api/Properties/PublishProfiles/FolderProfile.pubxml', 'Properties/PublishProfiles/FolderProfile.pubxml', `
<Project>
  <PropertyGroup>
    <WebPublishMethod>FileSystem</WebPublishMethod>
    <PublishProtocol>FileSystem</PublishProtocol>
    <PublishUrl>bin\\Release\\net9.0\\publish\\</PublishUrl>
    <PublishDir>bin\\Release\\net9.0\\publish\\</PublishDir>
    <LastUsedBuildConfiguration>Release</LastUsedBuildConfiguration>
    <LastUsedPlatform>Any CPU</LastUsedPlatform>
    <TargetFramework>net9.0</TargetFramework>
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
    <SelfContained>false</SelfContained>
  </PropertyGroup>
</Project>`);

        expect(profile.name).to.equal('FolderProfile');
        expect(profile.relativePath).to.equal('Properties/PublishProfiles/FolderProfile.pubxml');
        expect(profile.publishProtocol).to.equal('FileSystem');
        expect(profile.publishUrl).to.equal('bin\\Release\\net9.0\\publish\\');
        expect(profile.lastUsedBuildConfiguration).to.equal('Release');
        expect(profile.runtimeIdentifier).to.equal('win-x64');
        expect(profile.selfContained).to.equal('false');
    });

    it('parses Directory.Build MSBuild properties', () => {
        const summary = parseMsBuildFile('/repo/Directory.Build.props', 'Directory.Build.props', 'props', `
<Project>
  <PropertyGroup>
    <LangVersion>preview</LangVersion>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
  <PropertyGroup Condition="'$(Configuration)' == 'Release'">
    <AnalysisLevel>latest</AnalysisLevel>
    <WarningsAsErrors Condition="'$(CI)' == 'true'">nullable</WarningsAsErrors>
  </PropertyGroup>
</Project>`);

        expect(summary.relativePath).to.equal('Directory.Build.props');
        expect(summary.kind).to.equal('props');
        expect(summary.properties).to.deep.equal([
            {
                name: 'LangVersion',
                value: 'preview',
                condition: undefined
            },
            {
                name: 'TreatWarningsAsErrors',
                value: 'true',
                condition: undefined
            },
            {
                name: 'AnalysisLevel',
                value: 'latest',
                condition: "'$(Configuration)' == 'Release'"
            },
            {
                name: 'WarningsAsErrors',
                value: 'nullable',
                condition: "'$(CI)' == 'true'"
            }
        ]);
    });

    it('merges central package versions into project package references', () => {
        const centralVersions = parseCentralPackageVersions('/repo/Directory.Packages.props', `
<Project>
  <ItemGroup>
    <PackageVersion Include="Microsoft.NET.Test.Sdk" Version="17.12.0" />
    <PackageVersion Include="xunit">
      <Version>2.9.2</Version>
    </PackageVersion>
    <PackageVersion Include="Serilog" Version="4.2.0" />
  </ItemGroup>
</Project>`);
        const project = parseCsproj('/repo/tests/Orders.Tests/Orders.Tests.csproj', `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" />
    <PackageReference Include="xunit" PrivateAssets="all" />
    <PackageReference Include="Serilog" VersionOverride="4.3.0" />
  </ItemGroup>
</Project>`, [], centralVersions);

        expect(centralVersions.map(version => `${version.id}:${version.version}`)).to.deep.equal([
            'Microsoft.NET.Test.Sdk:17.12.0',
            'xunit:2.9.2',
            'Serilog:4.2.0'
        ]);
        expect(project.kind).to.equal('test');
        expect(project.packageReferences).to.deep.equal([
            {
                id: 'Microsoft.NET.Test.Sdk',
                version: '17.12.0',
                privateAssets: undefined,
                includeAssets: undefined,
                versionSource: 'central',
                versionPath: '/repo/Directory.Packages.props'
            },
            {
                id: 'xunit',
                version: '2.9.2',
                privateAssets: 'all',
                includeAssets: undefined,
                versionSource: 'central',
                versionPath: '/repo/Directory.Packages.props'
            },
            {
                id: 'Serilog',
                version: '4.3.0',
                privateAssets: undefined,
                includeAssets: undefined,
                versionSource: 'project',
                versionPath: '/repo/tests/Orders.Tests/Orders.Tests.csproj'
            }
        ]);
    });

    it('parses NuGet.config package sources and package source mapping', () => {
        const config = parseNuGetConfig('/repo/NuGet.config', 'NuGet.config', `
<configuration>
  <packageSources>
    <clear />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
    <add key="PrivateFeed" value="https://packages.example.test/nuget" />
  </packageSources>
  <disabledPackageSources>
    <add key="PrivateFeed" value="true" />
  </disabledPackageSources>
  <packageSourceMapping>
    <packageSource key="nuget.org">
      <package pattern="Microsoft.*" />
      <package pattern="Newtonsoft.Json" />
    </packageSource>
    <packageSource key="PrivateFeed">
      <package pattern="Company.*" />
    </packageSource>
  </packageSourceMapping>
</configuration>`);

        expect(config.clearPackageSources).to.equal(true);
        expect(config.disabledPackageSources).to.deep.equal(['PrivateFeed']);
        expect(config.packageSources).to.deep.equal([
            {
                key: 'nuget.org',
                value: 'https://api.nuget.org/v3/index.json',
                protocolVersion: '3',
                disabled: false
            },
            {
                key: 'PrivateFeed',
                value: 'https://packages.example.test/nuget',
                protocolVersion: undefined,
                disabled: true
            }
        ]);
        expect(config.packageSourceMappings).to.deep.equal([
            {
                sourceKey: 'nuget.org',
                patterns: ['Microsoft.*', 'Newtonsoft.Json']
            },
            {
                sourceKey: 'PrivateFeed',
                patterns: ['Company.*']
            }
        ]);
    });

    it('extracts tests from dotnet test --list-tests output', () => {
        const tests = parseDotnetTestListOutput(`
The following Tests are available for net9.0:
    Orders.Api.Tests.OrderTests.CreateOrder_accepts_valid_command
    Orders.Api.Tests.OrderTests.CancelOrder_rejects_missing_order(orderId: 42)
`, 'tests/Orders.Api.Tests/Orders.Api.Tests.csproj');

        expect(tests.map(test => test.name)).to.deep.equal([
            'Orders.Api.Tests.OrderTests.CreateOrder_accepts_valid_command',
            'Orders.Api.Tests.OrderTests.CancelOrder_rejects_missing_order(orderId: 42)'
        ]);
        expect(tests[0].framework).to.equal('net9.0');
        expect(tests[0]).to.include({
            fullyQualifiedName: 'Orders.Api.Tests.OrderTests.CreateOrder_accepts_valid_command',
            displayName: 'CreateOrder_accepts_valid_command',
            namespaceName: 'Orders.Api.Tests',
            className: 'OrderTests',
            methodName: 'CreateOrder_accepts_valid_command'
        });
        expect(tests[1]).to.include({
            fullyQualifiedName: 'Orders.Api.Tests.OrderTests.CancelOrder_rejects_missing_order',
            displayName: 'CancelOrder_rejects_missing_order(orderId: 42)',
            namespaceName: 'Orders.Api.Tests',
            className: 'OrderTests',
            methodName: 'CancelOrder_rejects_missing_order',
            arguments: '(orderId: 42)'
        });
    });

    it('parses TRX test results with outcomes, durations and error details', () => {
        const results = parseDotnetTestTrx(`
<TestRun>
  <Results>
    <UnitTestResult testId="test-1" testName="Passes" outcome="Passed" duration="00:00:01.2345678">
      <Output><StdOut>created order</StdOut></Output>
    </UnitTestResult>
    <UnitTestResult testId="test-2" testName="Fails" outcome="Failed" duration="00:00:00.0500000">
      <Output>
        <ErrorInfo>
          <Message>Assert.Equal() Failure</Message>
          <StackTrace>at Orders.Api.Tests.OrderTests.Fails()</StackTrace>
        </ErrorInfo>
      </Output>
    </UnitTestResult>
    <UnitTestResult testId="test-3" testName="SkipMe" outcome="NotExecuted" duration="00:00:00" />
  </Results>
  <TestDefinitions>
    <UnitTest id="test-1" name="Passes">
      <Execution id="exec-1" />
      <TestMethod className="Orders.Api.Tests.OrderTests" name="Passes" />
    </UnitTest>
    <UnitTest id="test-2" name="Fails">
      <TestMethod className="Orders.Api.Tests.OrderTests" name="Fails" />
    </UnitTest>
    <UnitTest id="test-3" name="SkipMe">
      <TestMethod className="Orders.Api.Tests.OrderTests" name="SkipMe" />
    </UnitTest>
  </TestDefinitions>
</TestRun>`, 'tests/Orders.Api.Tests/Orders.Api.Tests.csproj', 'command stdout', 'command stderr', 1);

        expect(results.map(result => result.name)).to.deep.equal([
            'Orders.Api.Tests.OrderTests.Passes',
            'Orders.Api.Tests.OrderTests.Fails',
            'Orders.Api.Tests.OrderTests.SkipMe'
        ]);
        expect(results.map(result => result.outcome)).to.deep.equal(['passed', 'failed', 'skipped']);
        expect(results[0].durationMs).to.equal(1235);
        expect(results[0].stdout).to.equal('created order');
        expect(results[1].stderr).to.contain('Assert.Equal() Failure');
        expect(results[1].stderr).to.contain('OrderTests.Fails');
        expect(results[1].exitCode).to.equal(1);
    });

    it('parses NuGet outdated package output from JSON and text formats', () => {
        const jsonUpdates = parseDotnetPackageOutdatedOutput(JSON.stringify({
            projects: [
                {
                    path: 'src/App/App.csproj',
                    frameworks: [
                        {
                            framework: 'net9.0',
                            topLevelPackages: [
                                {
                                    id: 'Newtonsoft.Json',
                                    requestedVersion: '12.0.1',
                                    resolvedVersion: '12.0.1',
                                    latestVersion: '13.0.3'
                                }
                            ],
                            transitivePackages: [
                                {
                                    id: 'System.Text.Json',
                                    resolvedVersion: '8.0.0',
                                    latestVersion: '9.0.0'
                                }
                            ]
                        }
                    ]
                }
            ]
        }), 'fallback.csproj');
        const textUpdates = parseDotnetPackageOutdatedOutput(`
The following sources were used:
   https://api.nuget.org/v3/index.json

Project \`App\` has the following updates to its packages
   [net9.0]:
   Top-level Package      Requested   Resolved   Latest
   > Dapper               2.0.123     2.0.123    2.1.35
   Transitive Package     Resolved    Latest
   > System.Memory        4.5.4       4.5.4      4.6.0
`, 'src/App/App.csproj');

        expect(jsonUpdates).to.deep.equal([
            {
                id: 'Newtonsoft.Json',
                requestedVersion: '12.0.1',
                resolvedVersion: '12.0.1',
                latestVersion: '13.0.3',
                framework: 'net9.0',
                projectPath: 'src/App/App.csproj',
                transitive: false
            },
            {
                id: 'System.Text.Json',
                requestedVersion: undefined,
                resolvedVersion: '8.0.0',
                latestVersion: '9.0.0',
                framework: 'net9.0',
                projectPath: 'src/App/App.csproj',
                transitive: true
            }
        ]);
        expect(textUpdates).to.deep.equal([
            {
                id: 'Dapper',
                requestedVersion: '2.0.123',
                resolvedVersion: '2.0.123',
                latestVersion: '2.1.35',
                framework: 'net9.0',
                projectPath: 'src/App/App.csproj',
                transitive: false
            },
            {
                id: 'System.Memory',
                requestedVersion: '4.5.4',
                resolvedVersion: '4.5.4',
                latestVersion: '4.6.0',
                framework: 'net9.0',
                projectPath: 'src/App/App.csproj',
                transitive: true
            }
        ]);
    });

    it('parses NuGet vulnerable and deprecated package output from JSON', () => {
        const vulnerable = parseDotnetPackageHealthOutput(JSON.stringify({
            projects: [
                {
                    path: 'src/App/App.csproj',
                    frameworks: [
                        {
                            framework: 'net9.0',
                            topLevelPackages: [
                                {
                                    id: 'System.Text.Encodings.Web',
                                    requestedVersion: '4.7.0',
                                    resolvedVersion: '4.7.0',
                                    vulnerabilities: [
                                        {
                                            severity: 'High',
                                            advisoryUrl: 'https://github.com/advisories/GHSA-test'
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }), 'vulnerable', 'fallback.csproj');
        const deprecated = parseDotnetPackageHealthOutput(JSON.stringify({
            projects: [
                {
                    path: 'src/App/App.csproj',
                    frameworks: [
                        {
                            framework: 'net9.0',
                            transitivePackages: [
                                {
                                    id: 'Old.Package',
                                    resolvedVersion: '1.0.0',
                                    deprecationReasons: ['Legacy'],
                                    alternativePackage: {
                                        id: 'New.Package',
                                        version: '2.0.0'
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }), 'deprecated', 'fallback.csproj');

        expect(vulnerable).to.deep.equal([{
            id: 'System.Text.Encodings.Web',
            kind: 'vulnerable',
            requestedVersion: '4.7.0',
            resolvedVersion: '4.7.0',
            framework: 'net9.0',
            projectPath: 'src/App/App.csproj',
            transitive: false,
            severity: 'High',
            advisoryUrl: 'https://github.com/advisories/GHSA-test',
            advisoryUrls: undefined
        }]);
        expect(deprecated).to.deep.equal([{
            id: 'Old.Package',
            kind: 'deprecated',
            requestedVersion: undefined,
            resolvedVersion: '1.0.0',
            framework: 'net9.0',
            projectPath: 'src/App/App.csproj',
            transitive: true,
            deprecationReasons: ['Legacy'],
            alternativePackageId: 'New.Package',
            alternativePackageVersion: '2.0.0'
        }]);
    });

    it('parses ASP.NET Core launchSettings profiles', () => {
        const profiles = parseLaunchSettings(JSON.stringify({
            profiles: {
                https: {
                    commandName: 'Project',
                    applicationUrl: 'https://localhost:7001;http://localhost:5000',
                    launchUrl: 'swagger',
                    launchBrowser: true,
                    commandLineArgs: '--seed "demo data"',
                    workingDirectory: 'src/Orders.Api',
                    dotnetRunMessages: true,
                    hotReloadEnabled: false,
                    nativeDebugging: true,
                    sslPort: 7001,
                    inspectUri: '{wsProtocol}://{url.hostname}:{url.port}/_framework/debug/ws-proxy?browser={browserInspectUri}',
                    environmentVariables: {
                        ASPNETCORE_ENVIRONMENT: 'Development'
                    }
                },
                tool: {
                    commandName: 'Executable',
                    executablePath: 'tools/seed.exe',
                    commandLineArgs: '--import orders.json',
                    workingDirectory: 'tools'
                }
            }
        }));

        expect(profiles).to.deep.equal([{
            name: 'https',
            commandName: 'Project',
            applicationUrl: 'https://localhost:7001;http://localhost:5000',
            applicationUrls: ['https://localhost:7001', 'http://localhost:5000'],
            launchUrl: 'swagger',
            launchBrowser: true,
            commandLineArgs: '--seed "demo data"',
            workingDirectory: 'src/Orders.Api',
            executablePath: undefined,
            browserUrl: undefined,
            sslPort: 7001,
            dotnetRunMessages: true,
            nativeDebugging: true,
            hotReloadEnabled: false,
            externalUrlConfiguration: undefined,
            inspectUri: '{wsProtocol}://{url.hostname}:{url.port}/_framework/debug/ws-proxy?browser={browserInspectUri}',
            environmentVariables: {
                ASPNETCORE_ENVIRONMENT: 'Development'
            }
        }, {
            name: 'tool',
            commandName: 'Executable',
            applicationUrl: undefined,
            applicationUrls: undefined,
            launchUrl: undefined,
            launchBrowser: undefined,
            commandLineArgs: '--import orders.json',
            workingDirectory: 'tools',
            executablePath: 'tools/seed.exe',
            browserUrl: undefined,
            sslPort: undefined,
            dotnetRunMessages: undefined,
            nativeDebugging: undefined,
            hotReloadEnabled: undefined,
            externalUrlConfiguration: undefined,
            inspectUri: undefined,
            environmentVariables: {}
        }]);
    });

    it('parses Windows MSBuild file diagnostics with ranges', () => {
        const diagnostics = parseDotnetBuildDiagnostics(`
C:\\repo\\src\\Orders.Api\\Controllers\\OrdersController.cs(12,17,12,25): error CS1002: ; expected [C:\\repo\\src\\Orders.Api\\Orders.Api.csproj]
C:\\repo\\src\\Orders.Api\\Controllers\\OrdersController.cs(12,17,12,25): error CS1002: ; expected [C:\\repo\\src\\Orders.Api\\Orders.Api.csproj]
`);

        expect(diagnostics).to.have.length(1);
        expect(diagnostics[0]).to.deep.equal({
            path: 'C:\\repo\\src\\Orders.Api\\Controllers\\OrdersController.cs',
            line: 12,
            column: 17,
            endLine: 12,
            endColumn: 25,
            severity: 'error',
            code: 'CS1002',
            message: '; expected',
            projectPath: 'C:\\repo\\src\\Orders.Api\\Orders.Api.csproj'
        });
    });

    it('parses Unix and project-level MSBuild diagnostics', () => {
        const diagnostics = parseDotnetBuildDiagnostics(`
/repo/src/Orders.Api/Program.cs(44,13): warning CS8602: Dereference of a possibly null reference. [/repo/src/Orders.Api/Orders.Api.csproj]
CSC : error CS5001: Program does not contain a static 'Main' method suitable for an entry point [/repo/src/Orders.Api/Orders.Api.csproj]
`, '/repo/src/Orders.Api/Orders.Api.csproj');

        expect(diagnostics).to.have.length(2);
        expect(diagnostics[0].path).to.equal('/repo/src/Orders.Api/Program.cs');
        expect(diagnostics[0].severity).to.equal('warning');
        expect(diagnostics[0].code).to.equal('CS8602');
        expect(diagnostics[1].path).to.equal('/repo/src/Orders.Api/Orders.Api.csproj');
        expect(diagnostics[1].line).to.equal(1);
        expect(diagnostics[1].severity).to.equal('error');
        expect(diagnostics[1].code).to.equal('CS5001');
    });

    it('parses Razor directives, routes, injections and component tags', () => {
        const summary = parseRazorFileSummary('/repo/src/Pages/Orders.cshtml', 'Pages/Orders.cshtml', `
@page "/orders/{id:int}"
@model OrdersPageModel
@using Orders.Api.Models
@inject Microsoft.Extensions.Logging.ILogger<OrdersPageModel> Logger
@namespace Orders.Api.Pages
@layout MainLayout
@addTagHelper *, Microsoft.AspNetCore.Mvc.TagHelpers
@tagHelperPrefix th:

<OrderSummary OrderId="Model.Id" />
<Shared.StatusBadge />
`);

        expect(summary.kind).to.equal('cshtml');
        expect(summary.routeTemplates).to.deep.equal(['/orders/{id:int}']);
        expect(summary.model).to.equal('OrdersPageModel');
        expect(summary.namespace).to.equal('Orders.Api.Pages');
        expect(summary.layout).to.equal('MainLayout');
        expect(summary.usings).to.deep.equal(['Orders.Api.Models']);
        expect(summary.effectiveUsings).to.deep.equal(['Orders.Api.Models']);
        expect(summary.tagHelpers).to.deep.equal(['*, Microsoft.AspNetCore.Mvc.TagHelpers']);
        expect(summary.effectiveTagHelpers).to.deep.equal(['*, Microsoft.AspNetCore.Mvc.TagHelpers']);
        expect(summary.tagHelperPrefix).to.equal('th:');
        expect(summary.effectiveTagHelperPrefix).to.equal('th:');
        expect(summary.injections).to.deep.equal([{
            type: 'Microsoft.Extensions.Logging.ILogger<OrdersPageModel>',
            name: 'Logger',
            line: 5
        }]);
        expect(summary.effectiveInjections).to.deep.equal(summary.injections);
        expect(summary.componentTags).to.deep.equal(['OrderSummary', 'Shared.StatusBadge']);
        expect(summary.directives.map(directive => directive.kind)).to.include.members(['page', 'model', 'using', 'inject', 'namespace', 'layout', 'addtaghelper', 'taghelperprefix']);
    });
});
