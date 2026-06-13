import { expect } from 'chai';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
    LanguageAnalysisContext,
    LanguageAnalysisResult
} from '@cybervinci/memory/lib/common';
import { CSharpCommandResult, CSharpDotnetInfo, CSharpLanguageServerAdapterStatus, CSharpRoslynStatus, CSharpWorkspaceInspection } from '../common';
import { createCSharpKitConfigTemplate } from '../common/csharp-kit-config-schema';
import { CSharpKitServiceImpl } from './csharp-kit-service';

describe('CSharpKitServiceImpl', () => {
    let workspacePath: string;

    beforeEach(async () => {
        workspacePath = await fsp.mkdtemp(path.join(os.tmpdir(), 'cv-csharp-kit-'));
    });

    afterEach(async () => {
        await fsp.rm(workspacePath, { recursive: true, force: true });
    });

    it('extracts workspace IntelliSense items from C# project files', async () => {
        const projectPath = path.join(workspacePath, 'Orders.Api.csproj');
        await fsp.writeFile(projectPath, `
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="9.0.0" />
  </ItemGroup>
</Project>`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'OrdersController.cs'), `
using Orders.Api.Models;

namespace Orders.Api.Controllers;

public sealed class OrdersController
{
    public string Name { get; init; } = "Orders";

    public string GetOrder(int id)
    {
        return $"{Name}:{id}";
    }
}`, 'utf8');

        const result = await new CSharpKitServiceImpl().getIntelliSense({ workspacePath });
        const labels = result.items.map(item => item.label);
        const method = result.items.find(item => item.label === 'GetOrder' && item.kind === 'method');

        expect(labels).to.include('Orders.Api.Models');
        expect(labels).to.include('Orders.Api.Controllers');
        expect(labels).to.include('OrdersController');
        expect(labels).to.include('GetOrder');
        expect(labels).to.include('Name');
        expect(labels).to.include('Microsoft.AspNetCore.OpenApi');
        expect(labels).to.include('ASP.NET Minimal API endpoint');
        expect(method?.signature).to.equal('string GetOrder(int id)');
        expect(method?.detail).to.contain('Workspace method');
    });

    it('resolves central NuGet package versions from Directory.Packages.props', async () => {
        const projectDirectory = path.join(workspacePath, 'src', 'Orders.Api');
        const projectPath = path.join(projectDirectory, 'Orders.Api.csproj');
        const centralPackagePath = path.join(workspacePath, 'Directory.Packages.props');
        await fsp.mkdir(projectDirectory, { recursive: true });
        await fsp.writeFile(centralPackagePath, `
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Microsoft.AspNetCore.OpenApi" Version="9.0.0" />
    <PackageVersion Include="Serilog.AspNetCore" Version="8.0.2" />
  </ItemGroup>
</Project>`, 'utf8');
        await fsp.writeFile(projectPath, `
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" />
    <PackageReference Include="Serilog.AspNetCore" VersionOverride="8.0.3" />
  </ItemGroup>
</Project>`, 'utf8');

        const inspection = await new CSharpKitServiceImpl().inspectWorkspace({ workspacePath });
        const project = inspection.projects[0];

        expect(project.centralPackageVersionPath).to.equal(centralPackagePath);
        expect(project.centralPackageVersions?.map(version => `${version.id}:${version.version}`)).to.deep.equal([
            'Microsoft.AspNetCore.OpenApi:9.0.0',
            'Serilog.AspNetCore:8.0.2'
        ]);
        expect(project.packageReferences).to.deep.equal([
            {
                id: 'Microsoft.AspNetCore.OpenApi',
                version: '9.0.0',
                privateAssets: undefined,
                includeAssets: undefined,
                versionSource: 'central',
                versionPath: centralPackagePath
            },
            {
                id: 'Serilog.AspNetCore',
                version: '8.0.3',
                privateAssets: undefined,
                includeAssets: undefined,
                versionSource: 'project',
                versionPath: projectPath
            }
        ]);
    });

    it('adds inherited Directory.Build.props and targets to project inspection', async () => {
        const projectDirectory = path.join(workspacePath, 'src', 'Orders.Api');
        const projectPath = path.join(projectDirectory, 'Orders.Api.csproj');
        const propsPath = path.join(workspacePath, 'Directory.Build.props');
        const targetsPath = path.join(workspacePath, 'src', 'Directory.Build.targets');
        await fsp.mkdir(projectDirectory, { recursive: true });
        await fsp.writeFile(propsPath, `
<Project>
  <PropertyGroup>
    <LangVersion>preview</LangVersion>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
</Project>`, 'utf8');
        await fsp.writeFile(targetsPath, `
<Project>
  <PropertyGroup Condition="'$(Configuration)' == 'Release'">
    <AnalysisLevel>latest</AnalysisLevel>
  </PropertyGroup>
</Project>`, 'utf8');
        await fsp.writeFile(projectPath, `
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
</Project>`, 'utf8');

        const inspection = await new CSharpKitServiceImpl().inspectWorkspace({ workspacePath });
        const project = inspection.projects[0];
        const capability = inspection.capabilities.find(item => item.id === 'msbuild-configuration');

        expect(project.msBuildFiles.map(file => `${file.kind}:${file.relativePath}`)).to.deep.equal([
            'props:Directory.Build.props',
            'targets:src/Directory.Build.targets'
        ]);
        expect(project.msBuildFiles[0].properties.map(property => `${property.name}=${property.value}`)).to.deep.equal([
            'LangVersion=preview',
            'TreatWarningsAsErrors=true'
        ]);
        expect(project.msBuildFiles[1].properties[0].condition).to.equal("'$(Configuration)' == 'Release'");
        expect(capability?.state).to.equal('ready');
        expect(capability?.detail).to.contain('Directory.Build.props/targets');
    });

    it('adds global.json SDK selection to workspace inspection', async () => {
        const projectPath = path.join(workspacePath, 'App.csproj');
        const nestedDirectory = path.join(workspacePath, 'samples');
        await fsp.mkdir(nestedDirectory, { recursive: true });
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'global.json'), JSON.stringify({
            sdk: {
                version: '9.0.100',
                rollForward: 'latestFeature',
                allowPrerelease: false
            },
            test: {
                runner: 'Microsoft.Testing.Platform'
            }
        }), 'utf8');
        await fsp.writeFile(path.join(nestedDirectory, 'global.json'), JSON.stringify({
            sdk: {
                version: '8.0.404',
                paths: ['.dotnet']
            }
        }), 'utf8');

        const inspection = await new DotnetSdkStatusCSharpKitService().inspectWorkspace({ workspacePath });
        const capability = inspection.capabilities.find(item => item.id === 'dotnet-sdk-selection');
        const testRunnerCapability = inspection.capabilities.find(item => item.id === 'dotnet-test-runner');

        expect(inspection.globalJsons.map(globalJson => `${globalJson.relativePath}:${globalJson.sdkVersion}:${globalJson.sdkInstalled}`)).to.deep.equal([
            'global.json:9.0.100:true',
            'samples/global.json:8.0.404:false'
        ]);
        expect(inspection.globalJsons[0].rollForward).to.equal('latestFeature');
        expect(inspection.globalJsons[0].allowPrerelease).to.equal(false);
        expect(inspection.globalJsons[0].testRunner).to.equal('Microsoft.Testing.Platform');
        expect(inspection.globalJsons[1].paths).to.deep.equal(['.dotnet']);
        expect(capability?.state).to.equal('partial');
        expect(capability?.detail).to.contain('2 global.json file(s)');
        expect(testRunnerCapability?.state).to.equal('partial');
        expect(testRunnerCapability?.detail).to.contain('Microsoft.Testing.Platform');
        expect(inspection.recommendations).to.include('Install .NET SDK 8.0.404 or update samples/global.json; this workspace pins an SDK version that dotnet --info did not report.');
        expect(inspection.recommendations).to.include('Review global.json; Microsoft.Testing.Platform mode for dotnet test requires a .NET 10 SDK and Microsoft.Testing.Platform 1.7 or later.');
    });

    it('adds .editorconfig code-style and analyzer inventory to workspace inspection', async () => {
        const projectDirectory = path.join(workspacePath, 'src', 'Orders.Api');
        const projectPath = path.join(projectDirectory, 'Orders.Api.csproj');
        await fsp.mkdir(projectDirectory, { recursive: true });
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        await fsp.writeFile(path.join(workspacePath, '.editorconfig'), `
root = true

[*.cs]
csharp_style_var_elsewhere = false:suggestion
dotnet_style_predefined_type_for_locals_parameters_members = true:warning
dotnet_diagnostic.CA1822.severity = warning
`, 'utf8');
        await fsp.writeFile(path.join(projectDirectory, '.editorconfig'), `
[Controllers/*.cs]
dotnet_diagnostic.CA2007.severity = error
`, 'utf8');
        await fsp.writeFile(path.join(projectDirectory, 'CodeAnalysis.globalconfig'), `
is_global = true
global_level = 150
dotnet_diagnostic.CA2000.severity = error
`, 'utf8');

        const inspection = await new CSharpKitServiceImpl().inspectWorkspace({ workspacePath });
        const capability = inspection.capabilities.find(item => item.id === 'editorconfig-style');
        const project = inspection.projects[0];

        expect(inspection.editorConfigs.map(config => `${config.relativePath}:${config.sections.length}:${config.analyzerRuleCount}`)).to.deep.equal([
            '.editorconfig:1:1',
            'src/Orders.Api/.editorconfig:1:1'
        ]);
        expect(inspection.globalConfigs.map(config => `${config.relativePath}:${config.isGlobal}:${config.globalLevel}:${config.analyzerRuleCount}`)).to.deep.equal([
            'src/Orders.Api/CodeAnalysis.globalconfig:true:150:1'
        ]);
        expect(inspection.editorConfigs[0].root).to.equal(true);
        expect(inspection.editorConfigs[0].csharpPropertyCount).to.equal(1);
        expect(inspection.editorConfigs[0].dotnetPropertyCount).to.equal(2);
        expect(project.files.map(file => file.relativePath)).to.include('.editorconfig');
        expect(project.files.map(file => file.relativePath)).to.include('CodeAnalysis.globalconfig');
        expect(project.files.find(file => file.relativePath === '.editorconfig')?.kind).to.equal('config');
        expect(project.files.find(file => file.relativePath === 'CodeAnalysis.globalconfig')?.kind).to.equal('config');
        expect(capability?.state).to.equal('ready');
        expect(capability?.detail).to.contain('2 .editorconfig file(s)');
        expect(capability?.detail).to.contain('1 .globalconfig file(s)');
        expect(capability?.detail).to.contain('3 analyzer severity rule(s)');
        expect(inspection.recommendations.some(item => item.includes('Add a workspace .editorconfig'))).to.equal(false);
    });

    it('adds dotnet local tool manifests to workspace inspection and generated tasks', async () => {
        const projectDirectory = path.join(workspacePath, 'src', 'Orders.Api');
        const projectPath = path.join(projectDirectory, 'Orders.Api.csproj');
        await fsp.mkdir(path.join(workspacePath, '.config'), { recursive: true });
        await fsp.mkdir(projectDirectory, { recursive: true });
        await fsp.writeFile(projectPath, `
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.0" />
  </ItemGroup>
</Project>`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, '.config', 'dotnet-tools.json'), JSON.stringify({
            version: 1,
            isRoot: true,
            tools: {
                'dotnet-ef': {
                    version: '9.0.0',
                    commands: ['dotnet-ef']
                },
                'dotnet-format': {
                    version: '5.1.250801',
                    commands: ['dotnet-format']
                }
            }
        }), 'utf8');

        const service = new CSharpKitServiceImpl();
        const inspection = await service.inspectWorkspace({ workspacePath });
        const capability = inspection.capabilities.find(item => item.id === 'dotnet-local-tools');
        const efCapability = inspection.capabilities.find(item => item.id === 'ef-core-workflow');
        const generated = await service.writeWorkspaceFiles({ workspacePath, projectPath, overwrite: true });
        const tasksJson = JSON.parse(await fsp.readFile(generated.tasksJsonPath, 'utf8'));
        const toolRestoreTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: tool restore');
        const installCSharpLsTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: install csharp-ls local tool');

        expect(inspection.toolManifests.map(manifest => `${manifest.relativePath}:${manifest.tools.length}:${manifest.isRoot}`)).to.deep.equal([
            '.config/dotnet-tools.json:2:true'
        ]);
        expect(inspection.toolManifests[0].tools.map(tool => `${tool.packageId}:${tool.version}:${tool.commands.join(',')}`)).to.deep.equal([
            'dotnet-ef:9.0.0:dotnet-ef',
            'dotnet-format:5.1.250801:dotnet-format'
        ]);
        expect(capability?.state).to.equal('ready');
        expect(capability?.detail).to.contain('dotnet-ef is declared locally');
        expect(efCapability?.detail).to.contain('local dotnet-ef tool manifest');
        expect(toolRestoreTask?.args).to.deep.equal(['tool', 'restore']);
        expect(installCSharpLsTask?.args).to.deep.equal(['tool', 'install', 'csharp-ls', '--create-manifest-if-needed']);
        expect(generated.taskLabels).to.include('C# Kit: tool restore');
        expect(generated.taskLabels).to.include('C# Kit: install csharp-ls local tool');
        expect(inspection.recommendations).to.include('Run C# Kit: Generate Launch/Tasks to add a dotnet tool restore task for local .NET tools.');
    });

    it('adds runsettings inventory and generated test tasks', async () => {
        const projectDirectory = path.join(workspacePath, 'tests', 'Orders.Tests');
        const projectPath = path.join(projectDirectory, 'Orders.Tests.csproj');
        const runSettingsPath = path.join(workspacePath, 'ci.runsettings');
        await fsp.mkdir(projectDirectory, { recursive: true });
        await fsp.writeFile(projectPath, `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.12.0" />
    <PackageReference Include="xunit" Version="2.9.2" />
  </ItemGroup>
</Project>`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Orders.sln'), `
Microsoft Visual Studio Solution File, Format Version 12.00
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Orders.Tests", "tests\\Orders.Tests\\Orders.Tests.csproj", "{11111111-1111-1111-1111-111111111111}"
EndProject
Global
EndGlobal`, 'utf8');
        await fsp.writeFile(runSettingsPath, `
<RunSettings>
  <RunConfiguration>
    <ResultsDirectory>TestResults</ResultsDirectory>
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
</RunSettings>`, 'utf8');

        const service = new CSharpKitServiceImpl();
        const inspection = await service.inspectWorkspace({ workspacePath });
        const capability = inspection.capabilities.find(item => item.id === 'test-runsettings');
        const generated = await service.writeWorkspaceFiles({ workspacePath, projectPath, overwrite: true });
        const tasksJson = JSON.parse(await fsp.readFile(generated.tasksJsonPath, 'utf8'));
        const projectTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: test Orders.Tests (ci)');
        const solutionTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: test Orders.sln (ci)');

        expect(inspection.runSettings.map(settings => `${settings.relativePath}:${settings.runConfiguration.length}:${settings.dataCollectors.length}:${settings.testRunParameters.length}`)).to.deep.equal([
            'ci.runsettings:2:1:1'
        ]);
        expect(capability?.state).to.equal('ready');
        expect(capability?.detail).to.contain('Generated test tasks can run with --settings');
        expect(projectTask?.args).to.deep.equal(['test', 'tests/Orders.Tests/Orders.Tests.csproj', '--settings', 'ci.runsettings', '--logger', 'console;verbosity=normal']);
        expect(solutionTask?.args).to.deep.equal(['test', 'Orders.sln', '--settings', 'ci.runsettings', '--logger', 'console;verbosity=normal']);
        expect(generated.taskLabels).to.include.members([
            'C# Kit: test Orders.Tests (ci)',
            'C# Kit: test Orders.sln (ci)'
        ]);
        expect(inspection.recommendations).to.include('Use generated C# Kit test tasks with .runsettings files when this workspace needs data collectors, run parameters or MSTest settings.');
    });

    it('uses MTP dotnet test task arguments when global.json selects Microsoft.Testing.Platform', async () => {
        const projectDirectory = path.join(workspacePath, 'tests', 'Orders.Tests');
        const projectPath = path.join(projectDirectory, 'Orders.Tests.csproj');
        await fsp.mkdir(projectDirectory, { recursive: true });
        await fsp.writeFile(path.join(workspacePath, 'global.json'), JSON.stringify({
            sdk: {
                version: '10.0.100'
            },
            test: {
                runner: 'Microsoft.Testing.Platform'
            }
        }), 'utf8');
        await fsp.writeFile(projectPath, `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="18.0.0" />
    <PackageReference Include="xunit" Version="2.9.2" />
  </ItemGroup>
</Project>`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Orders.sln'), `
Microsoft Visual Studio Solution File, Format Version 12.00
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Orders.Tests", "tests\\Orders.Tests\\Orders.Tests.csproj", "{11111111-1111-1111-1111-111111111111}"
EndProject
Global
EndGlobal`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'ci.runsettings'), '<RunSettings />', 'utf8');

        const generated = await new CSharpKitServiceImpl().writeWorkspaceFiles({ workspacePath, projectPath, overwrite: true });
        const tasksJson = JSON.parse(await fsp.readFile(generated.tasksJsonPath, 'utf8'));
        const projectTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: test Orders.Tests');
        const projectSettingsTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: test Orders.Tests (ci)');
        const solutionTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: test Orders.sln');
        const solutionSettingsTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: test Orders.sln (ci)');

        expect(projectTask?.args).to.deep.equal(['test', '--project', 'tests/Orders.Tests/Orders.Tests.csproj']);
        expect(projectSettingsTask?.args).to.deep.equal(['test', '--project', 'tests/Orders.Tests/Orders.Tests.csproj', '--settings', 'ci.runsettings']);
        expect(solutionTask?.args).to.deep.equal(['test', '--solution', 'Orders.sln']);
        expect(solutionSettingsTask?.args).to.deep.equal(['test', '--solution', 'Orders.sln', '--settings', 'ci.runsettings']);
    });

    it('adds NuGet.config source inventory to workspace inspection', async () => {
        const projectPath = path.join(workspacePath, 'App.csproj');
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'NuGet.config'), `
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
    <add key="PrivateFeed" value="https://packages.example.test/nuget" />
  </packageSources>
  <disabledPackageSources>
    <add key="PrivateFeed" value="true" />
  </disabledPackageSources>
  <packageSourceMapping>
    <packageSource key="nuget.org">
      <package pattern="Microsoft.*" />
    </packageSource>
  </packageSourceMapping>
</configuration>`, 'utf8');

        const inspection = await new CSharpKitServiceImpl().inspectWorkspace({ workspacePath });
        const capability = inspection.capabilities.find(item => item.id === 'nuget');

        expect(inspection.nugetConfigs).to.have.length(1);
        expect(inspection.nugetConfigs[0].relativePath).to.equal('NuGet.config');
        expect(inspection.nugetConfigs[0].packageSources.map(source => `${source.key}:${source.disabled ? 'disabled' : 'enabled'}`)).to.deep.equal([
            'nuget.org:enabled',
            'PrivateFeed:disabled'
        ]);
        expect(inspection.nugetConfigs[0].packageSourceMappings).to.deep.equal([
            {
                sourceKey: 'nuget.org',
                patterns: ['Microsoft.*']
            }
        ]);
        expect(capability?.detail).to.contain('NuGet.config');
        expect(capability?.detail).to.contain('1/2 enabled source(s)');
    });

    it('adds language server adapter status to workspace inspection', async () => {
        const projectPath = path.join(workspacePath, 'App.csproj');
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Index.razor'), '@page "/"', 'utf8');

        const inspection = await new LanguageServerStatusCSharpKitService().inspectWorkspace({ workspacePath });
        const runtime = inspection.capabilities.find(item => item.id === 'csharp-runtime-readiness');
        const intellisense = inspection.capabilities.find(item => item.id === 'csharp-monaco-intellisense');
        const adapters = inspection.capabilities.find(item => item.id === 'language-server-adapters');

        expect(inspection.languageServers.map(status => `${status.language}:${status.mode}`)).to.deep.equal([
            'csharp:ready',
            'razor:missing'
        ]);
        expect(runtime?.state).to.equal('partial');
        expect(runtime?.detail).to.contain('Mock C# LSP');
        expect(runtime?.detail).to.contain('Razor language server adapter');
        expect(intellisense?.state).to.equal('ready');
        expect(adapters?.detail).to.contain('Mock C# LSP');
    });

    it('reports invalid workspace C# Kit adapter config files', async () => {
        const projectPath = path.join(workspacePath, 'App.csproj');
        const configPath = path.join(workspacePath, '.cybervinci', 'csharp-kit.json');
        await fsp.mkdir(path.dirname(configPath), { recursive: true });
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        await fsp.writeFile(configPath, '{ "roslyn": ', 'utf8');

        const inspection = await new CSharpKitServiceImpl().inspectWorkspace({ workspacePath });
        const capability = inspection.capabilities.find(item => item.id === 'csharp-kit-config');

        expect(inspection.csharpKitConfig.state).to.equal('invalid');
        expect(inspection.csharpKitConfig.exists).to.equal(true);
        expect(inspection.csharpKitConfig.valid).to.equal(false);
        expect(inspection.csharpKitConfig.error).to.be.a('string').and.not.empty;
        expect(capability?.state).to.equal('partial');
        expect(capability?.detail).to.contain('.cybervinci/csharp-kit.json exists but could not be parsed');
        expect(inspection.recommendations.some(item => item.includes('Review .cybervinci/csharp-kit.json'))).to.equal(true);
    });

    it('creates a non-overwriting workspace C# Kit adapter config without requiring a project', async () => {
        const service = new CSharpKitServiceImpl();
        const result = await service.writeWorkspaceConfig({ workspacePath });
        const csharpKitConfig = JSON.parse(await fsp.readFile(result.configPath, 'utf8'));

        expect(result.configPath).to.equal(path.join(workspacePath, '.cybervinci', 'csharp-kit.json'));
        expect(result.changed).to.equal(true);
        expect(csharpKitConfig).to.deep.equal(createCSharpKitConfigTemplate());

        csharpKitConfig.debugAdapters.coreclr.command = '.tools/netcoredbg';
        await fsp.writeFile(result.configPath, `${JSON.stringify(csharpKitConfig, undefined, 4)}\n`, 'utf8');

        const repeated = await service.writeWorkspaceConfig({ workspacePath });
        const preservedConfig = JSON.parse(await fsp.readFile(repeated.configPath, 'utf8'));

        expect(repeated.changed).to.equal(false);
        expect(preservedConfig.debugAdapters.coreclr.command).to.equal('.tools/netcoredbg');
    });

    it('loads workspace-configured Roslyn sidecar settings', async () => {
        const projectPath = path.join(workspacePath, 'App.csproj');
        const sidecarPath = path.join(workspacePath, '.tools', 'CyberVinci.Memory.RoslynSidecar.dll');
        await fsp.mkdir(path.dirname(sidecarPath), { recursive: true });
        await fsp.mkdir(path.join(workspacePath, '.cybervinci'), { recursive: true });
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        await fsp.writeFile(sidecarPath, '', 'utf8');
        await fsp.writeFile(path.join(workspacePath, '.cybervinci', 'csharp-kit.json'), JSON.stringify({
            roslyn: {
                analyzerPath: '.tools/CyberVinci.Memory.RoslynSidecar.dll',
                timeoutMs: 12345
            },
            debugAdapters: {
                coreclr: {
                    command: '.tools/netcoredbg',
                    args: ['--interpreter=vscode']
                }
            },
            languageServers: {
                csharp: {
                    command: '.tools/csharp-ls',
                    args: []
                },
                razor: {
                    command: '',
                    args: []
                }
            }
        }), 'utf8');

        const previousAnalyzerPath = process.env.CYBERVINCI_ROSLYN_ANALYZER_PATH;
        const previousAnalyzerTimeout = process.env.CYBERVINCI_ROSLYN_ANALYZER_TIMEOUT_MS;
        delete process.env.CYBERVINCI_ROSLYN_ANALYZER_PATH;
        delete process.env.CYBERVINCI_ROSLYN_ANALYZER_TIMEOUT_MS;
        let inspection!: CSharpWorkspaceInspection;
        try {
            inspection = await new CSharpKitServiceImpl().inspectWorkspace({ workspacePath });
        } finally {
            if (previousAnalyzerPath === undefined) {
                delete process.env.CYBERVINCI_ROSLYN_ANALYZER_PATH;
            } else {
                process.env.CYBERVINCI_ROSLYN_ANALYZER_PATH = previousAnalyzerPath;
            }
            if (previousAnalyzerTimeout === undefined) {
                delete process.env.CYBERVINCI_ROSLYN_ANALYZER_TIMEOUT_MS;
            } else {
                process.env.CYBERVINCI_ROSLYN_ANALYZER_TIMEOUT_MS = previousAnalyzerTimeout;
            }
        }

        expect(inspection.roslyn.mode).to.equal('semantic-ready');
        expect(inspection.roslyn.analyzerPath).to.equal(sidecarPath);
        expect(inspection.roslyn.timeoutMs).to.equal(12345);
        expect(inspection.roslyn.detail).to.contain('.cybervinci/csharp-kit.json');
        expect(inspection.csharpKitConfig.state).to.equal('valid');
        expect(inspection.csharpKitConfig.configuredRoslyn).to.equal(true);
        expect(inspection.csharpKitConfig.configuredDebugAdapters).to.deep.equal(['coreclr']);
        expect(inspection.csharpKitConfig.configuredLanguageServers).to.deep.equal(['csharp']);
        expect(inspection.capabilities.find(item => item.id === 'csharp-kit-config')?.detail).to.contain('Roslyn sidecar settings');
    });

    it('creates a project and adds it to a new solution through dotnet CLI commands', async () => {
        const service = new TestCSharpKitService();
        const result = await service.createProject({
            workspacePath,
            templateId: 'webapi',
            projectName: 'Orders.Api',
            outputDirectory: 'src',
            framework: 'net10.0',
            createSolution: true,
            solutionName: 'Orders'
        });

        expect(result.ok).to.equal(true);
        expect(result.projectPath).to.equal(path.join(workspacePath, 'src', 'Orders.Api', 'Orders.Api.csproj'));
        expect(result.solutionPath).to.equal(path.join(workspacePath, 'Orders.sln'));
        expect(result.addedToSolution).to.equal(true);
        expect(service.commands).to.deep.equal([
            ['new', 'webapi', '--name', 'Orders.Api', '--output', path.join(workspacePath, 'src', 'Orders.Api'), '--framework', 'net10.0'],
            ['new', 'sln', '--name', 'Orders', '--output', workspacePath],
            ['sln', path.join(workspacePath, 'Orders.sln'), 'add', path.join(workspacePath, 'src', 'Orders.Api', 'Orders.Api.csproj')]
        ]);
    });

    it('creates C# project item templates inside the selected project', async () => {
        const projectDirectory = path.join(workspacePath, 'src', 'Orders.Api');
        const projectPath = path.join(projectDirectory, 'Orders.Api.csproj');
        await fsp.mkdir(projectDirectory, { recursive: true });
        await fsp.writeFile(projectPath, `
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <AssemblyName>Orders.Api</AssemblyName>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.0" />
  </ItemGroup>
</Project>`, 'utf8');

        const service = new CSharpKitServiceImpl();
        const templates = await service.getProjectItemTemplates();
        const controller = await service.createProjectItem({
            workspacePath,
            projectPath,
            templateId: 'controller',
            itemName: 'Orders'
        });
        const duplicate = await service.createProjectItem({
            workspacePath,
            projectPath,
            templateId: 'controller',
            itemName: 'Orders'
        });
        const razorPage = await service.createProjectItem({
            workspacePath,
            projectPath,
            templateId: 'razor-page',
            itemName: 'Orders',
            outputDirectory: 'Pages/Admin'
        });

        const controllerPath = path.join(projectDirectory, 'Controllers', 'OrdersController.cs');
        const razorPath = path.join(projectDirectory, 'Pages', 'Admin', 'Orders.cshtml');
        const razorModelPath = path.join(projectDirectory, 'Pages', 'Admin', 'Orders.cshtml.cs');
        const controllerText = await fsp.readFile(controllerPath, 'utf8');
        const razorText = await fsp.readFile(razorPath, 'utf8');
        const razorModelText = await fsp.readFile(razorModelPath, 'utf8');

        expect(templates.map(template => template.id)).to.include.members(['controller', 'razor-page', 'xunit-test']);
        expect(controller.createdFiles).to.deep.equal([controllerPath]);
        expect(controllerText).to.contain('namespace Orders.Api.Controllers;');
        expect(controllerText).to.contain('public sealed class OrdersController : ControllerBase');
        expect(duplicate.changed).to.equal(false);
        expect(duplicate.skippedFiles).to.deep.equal([controllerPath]);
        expect(razorPage.createdFiles).to.deep.equal([razorPath, razorModelPath]);
        expect(razorText).to.contain('@model Orders.Api.Pages.Admin.OrdersModel');
        expect(razorModelText).to.contain('namespace Orders.Api.Pages.Admin;');
    });

    it('manages solutions and project references through dotnet CLI commands', async () => {
        const appProjectPath = path.join(workspacePath, 'src', 'App', 'App.csproj');
        const libProjectPath = path.join(workspacePath, 'src', 'Lib', 'Lib.csproj');
        await fsp.mkdir(path.dirname(appProjectPath), { recursive: true });
        await fsp.mkdir(path.dirname(libProjectPath), { recursive: true });
        await fsp.writeFile(appProjectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        await fsp.writeFile(libProjectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        const service = new TestCSharpKitService();

        const solution = await service.createSolution({
            workspacePath,
            solutionName: 'Workspace',
            outputDirectory: '.'
        });
        await service.addProjectToSolution({
            workspacePath,
            solutionPath: solution.solutionPath,
            projectPath: appProjectPath
        });
        await service.removeProjectFromSolution({
            workspacePath,
            solutionPath: solution.solutionPath,
            projectPath: appProjectPath
        });
        await service.addProjectReference({
            workspacePath,
            projectPath: appProjectPath,
            referenceProjectPath: libProjectPath
        });
        await service.removeProjectReference({
            workspacePath,
            projectPath: appProjectPath,
            referenceProjectPath: libProjectPath
        });

        expect(solution.ok).to.equal(true);
        expect(solution.solutionPath).to.equal(path.join(workspacePath, 'Workspace.sln'));
        expect(service.commands).to.deep.equal([
            ['new', 'sln', '--name', 'Workspace', '--output', workspacePath],
            ['sln', path.join(workspacePath, 'Workspace.sln'), 'add', appProjectPath],
            ['sln', path.join(workspacePath, 'Workspace.sln'), 'remove', appProjectPath],
            ['add', appProjectPath, 'reference', libProjectPath],
            ['remove', appProjectPath, 'reference', libProjectPath]
        ]);
    });

    it('indexes SLNX project entries with XML decoding and missing project paths', async () => {
        const appProjectPath = path.join(workspacePath, 'src', 'Orders.Api', 'Orders.Api.csproj');
        const sharedProjectPath = path.join(workspacePath, 'src', 'Shared&Core', 'Shared&Core.csproj');
        const missingProjectPath = path.join(workspacePath, 'tests', 'Missing.Tests', 'Missing.Tests.csproj');
        await fsp.mkdir(path.dirname(appProjectPath), { recursive: true });
        await fsp.mkdir(path.dirname(sharedProjectPath), { recursive: true });
        await fsp.writeFile(appProjectPath, '<Project Sdk="Microsoft.NET.Sdk.Web" />', 'utf8');
        await fsp.writeFile(sharedProjectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Workspace.slnx'), `
<Solution>
  <Folder Name="/src/">
    <Project Path="src/Orders.Api/Orders.Api.csproj" Type="Classic C#" />
    <Project Path="src/Shared&amp;Core/Shared&amp;Core.csproj" />
  </Folder>
  <Project Path='tests/Missing.Tests/Missing.Tests.csproj' />
</Solution>`, 'utf8');

        const inspection = await new CSharpKitServiceImpl().inspectWorkspace({ workspacePath });

        expect(inspection.solutions).to.have.length(1);
        expect(inspection.solutions[0].format).to.equal('slnx');
        expect(inspection.solutions[0].projectPaths).to.deep.equal([
            appProjectPath,
            sharedProjectPath,
            missingProjectPath
        ]);
        expect(inspection.projects.map(project => project.path)).to.deep.equal([
            appProjectPath,
            sharedProjectPath
        ]);
    });

    it('indexes SLNF solution filters and emits MSBuild filter tasks', async () => {
        const appProjectPath = path.join(workspacePath, 'src', 'Orders.Api', 'Orders.Api.csproj');
        const workerProjectPath = path.join(workspacePath, 'src', 'Orders.Worker', 'Orders.Worker.csproj');
        await fsp.mkdir(path.dirname(appProjectPath), { recursive: true });
        await fsp.mkdir(path.dirname(workerProjectPath), { recursive: true });
        await fsp.writeFile(appProjectPath, '<Project Sdk="Microsoft.NET.Sdk.Web" />', 'utf8');
        await fsp.writeFile(workerProjectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Workspace.sln'), `
Microsoft Visual Studio Solution File, Format Version 12.00
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Orders.Api", "src\\Orders.Api\\Orders.Api.csproj", "{11111111-1111-1111-1111-111111111111}"
EndProject
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Orders.Worker", "src\\Orders.Worker\\Orders.Worker.csproj", "{22222222-2222-2222-2222-222222222222}"
EndProject
Global
EndGlobal`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'ApiOnly.slnf'), JSON.stringify({
            solution: {
                path: 'Workspace.sln',
                projects: [
                    'src\\Orders.Api\\Orders.Api.csproj'
                ]
            }
        }), 'utf8');

        const service = new CSharpKitServiceImpl();
        const inspection = await service.inspectWorkspace({ workspacePath });
        const filter = inspection.solutions.find(solution => solution.format === 'slnf');
        const capability = inspection.capabilities.find(item => item.id === 'solution-project-system');
        const generated = await service.writeWorkspaceFiles({ workspacePath, projectPath: appProjectPath, overwrite: true });
        const tasksJson = JSON.parse(await fsp.readFile(generated.tasksJsonPath, 'utf8'));
        const labels = tasksJson.tasks.map((task: { label: string }) => task.label);
        const filterRestore = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: restore ApiOnly.slnf');
        const filterBuild = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: build ApiOnly.slnf');
        const filterClean = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: clean ApiOnly.slnf');
        const filterRebuild = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: rebuild ApiOnly.slnf');

        expect(filter?.sourceSolutionPath).to.equal(path.join(workspacePath, 'Workspace.sln'));
        expect(filter?.sourceSolutionName).to.equal('Workspace.sln');
        expect(filter?.projectPaths).to.deep.equal([appProjectPath]);
        expect(capability?.detail).to.contain('1 .slnf filter(s)');
        expect(filterRestore?.args).to.deep.equal(['msbuild', 'ApiOnly.slnf', '/t:Restore']);
        expect(filterBuild?.args).to.deep.equal(['msbuild', 'ApiOnly.slnf', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
        expect(filterClean?.args).to.deep.equal(['msbuild', 'ApiOnly.slnf', '/t:Clean']);
        expect(filterRebuild?.args).to.deep.equal(['msbuild', 'ApiOnly.slnf', '/t:Rebuild', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
        expect(labels).to.include.members([
            'C# Kit: restore Workspace.sln',
            'C# Kit: restore ApiOnly.slnf',
            'C# Kit: build ApiOnly.slnf',
            'C# Kit: clean ApiOnly.slnf',
            'C# Kit: rebuild ApiOnly.slnf'
        ]);
        expect(labels).not.to.include('C# Kit: format ApiOnly.slnf');
        expect(labels).not.to.include('C# Kit: test ApiOnly.slnf');
    });

    it('returns the generated SLNX path when dotnet new sln uses XML format', async () => {
        const service = new TestCSharpKitService();
        service.newSolutionExtension = '.slnx';

        const solution = await service.createSolution({
            workspacePath,
            solutionName: 'Workspace',
            outputDirectory: '.'
        });

        expect(solution.ok).to.equal(true);
        expect(solution.solutionPath).to.equal(path.join(workspacePath, 'Workspace.slnx'));
        expect(service.commands[0]).to.deep.equal(['new', 'sln', '--name', 'Workspace', '--output', workspacePath]);
    });

    it('searches NuGet packages and updates package references', async () => {
        const projectPath = path.join(workspacePath, 'App.csproj');
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        const service = new TestCSharpKitService();
        service.nextNuGetSearchJson = JSON.stringify({
            data: [
                {
                    id: 'Newtonsoft.Json',
                    version: '13.0.3',
                    description: 'Popular high-performance JSON framework for .NET',
                    authors: ['James Newton-King'],
                    totalDownloads: 4000000000,
                    verified: true,
                    projectUrl: 'https://www.newtonsoft.com/json'
                }
            ]
        });

        const search = await service.searchPackages({
            workspacePath,
            query: 'newtonsoft',
            take: 10
        });
        const result = await service.updatePackage({
            workspacePath,
            projectPath,
            packageId: search.packages[0].id,
            version: search.packages[0].version
        });

        expect(search.packages).to.deep.equal([{
            id: 'Newtonsoft.Json',
            version: '13.0.3',
            description: 'Popular high-performance JSON framework for .NET',
            authors: ['James Newton-King'],
            totalDownloads: 4000000000,
            verified: true,
            projectUrl: 'https://www.newtonsoft.com/json',
            iconUrl: undefined,
            source: 'https://azuresearch-usnc.nuget.org/query'
        }]);
        expect(result.ok).to.equal(true);
        expect(service.nugetSearchUrls[0]).to.contain('q=newtonsoft');
        expect(service.nugetSearchUrls[0]).to.contain('take=10');
        expect(service.commands).to.deep.equal([
            ['add', projectPath, 'package', 'Newtonsoft.Json', '--version', '13.0.3']
        ]);
    });

    it('lists NuGet package updates through dotnet outdated JSON output', async () => {
        const projectPath = path.join(workspacePath, 'App.csproj');
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        const service = new TestCSharpKitService();
        service.nextPackageUpdatesOutput = JSON.stringify({
            projects: [
                {
                    path: projectPath,
                    frameworks: [
                        {
                            framework: 'net9.0',
                            topLevelPackages: [
                                {
                                    id: 'Dapper',
                                    requestedVersion: '2.0.123',
                                    resolvedVersion: '2.0.123',
                                    latestVersion: '2.1.35'
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        const result = await service.listPackageUpdates({ workspacePath, projectPath });

        expect(service.commands[0]).to.deep.equal([
            'list',
            projectPath,
            'package',
            '--outdated',
            '--include-transitive',
            '--format',
            'json'
        ]);
        expect(result.updates).to.deep.equal([{
            id: 'Dapper',
            requestedVersion: '2.0.123',
            resolvedVersion: '2.0.123',
            latestVersion: '2.1.35',
            framework: 'net9.0',
            projectPath,
            transitive: false
        }]);
    });

    it('audits NuGet package vulnerabilities and deprecations', async () => {
        const projectPath = path.join(workspacePath, 'App.csproj');
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        const service = new TestCSharpKitService();
        service.nextPackageHealthOutputs.vulnerable = JSON.stringify({
            projects: [
                {
                    path: projectPath,
                    frameworks: [
                        {
                            framework: 'net9.0',
                            topLevelPackages: [
                                {
                                    id: 'System.Text.Encodings.Web',
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
        });
        service.nextPackageHealthOutputs.deprecated = JSON.stringify({
            projects: [
                {
                    path: projectPath,
                    frameworks: [
                        {
                            framework: 'net9.0',
                            transitivePackages: [
                                {
                                    id: 'Old.Package',
                                    resolvedVersion: '1.0.0',
                                    deprecationReasons: ['Legacy']
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        const result = await service.listPackageHealth({ workspacePath, projectPath });

        expect(service.commands[0]).to.deep.equal([
            'list',
            projectPath,
            'package',
            '--vulnerable',
            '--include-transitive',
            '--format',
            'json'
        ]);
        expect(service.commands[1]).to.deep.equal([
            'list',
            projectPath,
            'package',
            '--deprecated',
            '--include-transitive',
            '--format',
            'json'
        ]);
        expect(result.issues.map(issue => `${issue.kind}:${issue.id}:${issue.resolvedVersion}`)).to.deep.equal([
            'vulnerable:System.Text.Encodings.Web:4.7.0',
            'deprecated:Old.Package:1.0.0'
        ]);
        expect(result.issues[0].severity).to.equal('High');
        expect(result.issues[0].advisoryUrl).to.equal('https://github.com/advisories/GHSA-test');
        expect(result.issues[1].transitive).to.equal(true);
    });

    it('generates launch and task files for launchSettings profiles', async () => {
        const projectDirectory = path.join(workspacePath, 'src', 'Orders.Api');
        const projectPath = path.join(projectDirectory, 'Orders.Api.csproj');
        await fsp.mkdir(path.join(projectDirectory, 'Properties'), { recursive: true });
        await fsp.writeFile(projectPath, `
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <AssemblyName>Orders.Api</AssemblyName>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.0" />
  </ItemGroup>
</Project>`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Orders.sln'), `
Microsoft Visual Studio Solution File, Format Version 12.00
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Orders.Api", "src\\Orders.Api\\Orders.Api.csproj", "{11111111-1111-1111-1111-111111111111}"
EndProject
Global
EndGlobal`, 'utf8');
        await fsp.writeFile(path.join(projectDirectory, 'Properties', 'launchSettings.json'), JSON.stringify({
            profiles: {
                https: {
                    commandName: 'Project',
                    applicationUrl: 'https://localhost:7001;http://localhost:5000',
                    launchUrl: 'swagger',
                    launchBrowser: true,
                    commandLineArgs: '--seed "demo data"',
                    workingDirectory: '.',
                    hotReloadEnabled: false,
                    nativeDebugging: true,
                    inspectUri: '{wsProtocol}://{url.hostname}:{url.port}/_framework/debug/ws-proxy?browser={browserInspectUri}',
                    environmentVariables: {
                        ASPNETCORE_ENVIRONMENT: 'Development'
                    }
                },
                seedTool: {
                    commandName: 'Executable',
                    executablePath: 'tools/seed.exe',
                    commandLineArgs: '--import orders.json',
                    workingDirectory: 'tools'
                }
            }
        }), 'utf8');
        await fsp.mkdir(path.join(projectDirectory, 'Properties', 'PublishProfiles'), { recursive: true });
        await fsp.writeFile(path.join(projectDirectory, 'Properties', 'PublishProfiles', 'FolderProfile.pubxml'), `
<Project>
  <PropertyGroup>
    <WebPublishMethod>FileSystem</WebPublishMethod>
    <PublishProtocol>FileSystem</PublishProtocol>
    <PublishUrl>bin\\Release\\net9.0\\publish\\</PublishUrl>
    <LastUsedBuildConfiguration>Release</LastUsedBuildConfiguration>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
</Project>`, 'utf8');

        const result = await new CSharpKitServiceImpl().writeWorkspaceFiles({
            workspacePath,
            projectPath,
            overwrite: true
        });
        const launchJson = JSON.parse(await fsp.readFile(result.launchJsonPath, 'utf8'));
        const tasksJson = JSON.parse(await fsp.readFile(result.tasksJsonPath, 'utf8'));
        const csharpKitConfig = JSON.parse(await fsp.readFile(result.csharpKitConfigPath, 'utf8'));
        const profileConfig = launchJson.configurations.find((config: { name: string }) => config.name === 'C# Kit: Debug Orders.Api (https)');
        const executableConfig = launchJson.configurations.find((config: { name: string }) => config.name === 'C# Kit: Debug Orders.Api (seedTool)');
        const taskLabels = tasksJson.tasks.map((task: { label: string }) => task.label);
        const rebuildTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: rebuild Orders.Api');
        const publishTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: publish Orders.Api');
        const publishProfileTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: publish Orders.Api (FolderProfile)');
        const userSecretsInitTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: user-secrets init Orders.Api');
        const devCertTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: dev-certs https trust');
        const solutionRebuildTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: rebuild Orders.sln');
        const efMigrationTask = tasksJson.tasks.find((task: { label: string }) => task.label === 'C# Kit: ef migrations add Orders.Api');

        expect(result.launchConfigurationNames).to.include.members([
            'C# Kit: Debug Orders.Api',
            'C# Kit: Debug Orders.Api (https)',
            'C# Kit: Debug Orders.Api (seedTool)'
        ]);
        expect(result.csharpKitConfigPath).to.equal(path.join(workspacePath, '.cybervinci', 'csharp-kit.json'));
        expect(result.configChanged).to.equal(true);
        expect(csharpKitConfig.roslyn).to.deep.equal({
            analyzerPath: '',
            timeoutMs: 30000
        });
        expect(csharpKitConfig.debugAdapters.coreclr).to.deep.equal({
            command: '',
            args: ['--interpreter=vscode']
        });
        expect(csharpKitConfig.languageServers.csharp).to.deep.equal({
            command: '',
            args: [],
            probeTimeoutMs: 7000
        });
        expect(result.taskLabels).to.include.members([
            'C# Kit: clean Orders.Api',
            'C# Kit: rebuild Orders.Api',
            'C# Kit: format Orders.Api',
            'C# Kit: publish Orders.Api',
            'C# Kit: publish Orders.Api (FolderProfile)',
            'C# Kit: user-secrets init Orders.Api',
            'C# Kit: user-secrets list Orders.Api',
            'C# Kit: dev-certs https trust',
            'C# Kit: clean Orders.sln',
            'C# Kit: rebuild Orders.sln',
            'C# Kit: format Orders.sln',
            'C# Kit: ef migrations list Orders.Api',
            'C# Kit: ef migrations add Orders.Api',
            'C# Kit: ef database update Orders.Api',
            'C# Kit: run Orders.Api (https)',
            'C# Kit: watch Orders.Api (https)'
        ]);
        expect(profileConfig.args).to.deep.equal(['--seed', 'demo data']);
        expect(profileConfig.cwd).to.equal('${workspaceFolder}/src/Orders.Api');
        expect(profileConfig.env.ASPNETCORE_URLS).to.equal('https://localhost:7001;http://localhost:5000');
        expect(profileConfig.launchSettingsProfile).to.equal('https');
        expect(profileConfig.hotReloadEnabled).to.equal(false);
        expect(profileConfig.nativeDebugging).to.equal(true);
        expect(profileConfig.inspectUri).to.contain('/_framework/debug/ws-proxy');
        expect(profileConfig.serverReadyAction.uriFormat).to.equal('%s/swagger');
        expect(executableConfig.program).to.equal('${workspaceFolder}/src/Orders.Api/tools/seed.exe');
        expect(executableConfig.cwd).to.equal('${workspaceFolder}/src/Orders.Api/tools');
        expect(executableConfig.args).to.deep.equal(['--import', 'orders.json']);
        expect(taskLabels).to.include.members([
            'C# Kit: run Orders.Api (https)',
            'C# Kit: publish Orders.Api',
            'C# Kit: publish Orders.Api (FolderProfile)',
            'C# Kit: user-secrets init Orders.Api',
            'C# Kit: user-secrets list Orders.Api',
            'C# Kit: dev-certs https trust',
            'C# Kit: restore Orders.sln',
            'C# Kit: build Orders.sln',
            'C# Kit: test Orders.sln',
            'C# Kit: ef migrations list Orders.Api',
            'C# Kit: ef database update Orders.Api'
        ]);
        expect(taskLabels).not.to.include('C# Kit: run Orders.Api (seedTool)');
        expect(rebuildTask?.args).to.deep.equal(['msbuild', 'src/Orders.Api/Orders.Api.csproj', '/t:Rebuild', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
        expect(publishTask?.args).to.deep.equal(['publish', 'src/Orders.Api/Orders.Api.csproj', '--configuration', 'Release', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
        expect(publishProfileTask?.args).to.deep.equal(['publish', 'src/Orders.Api/Orders.Api.csproj', '/p:PublishProfile=FolderProfile', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
        expect(userSecretsInitTask?.args).to.deep.equal(['user-secrets', 'init', '--project', 'src/Orders.Api/Orders.Api.csproj']);
        expect(devCertTask?.args).to.deep.equal(['dev-certs', 'https', '--trust']);
        expect(solutionRebuildTask?.args).to.deep.equal(['msbuild', 'Orders.sln', '/t:Rebuild', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
        expect(efMigrationTask?.args).to.deep.equal(['ef', 'migrations', 'add', '${input:csharpKit.efMigrationName.Orders.Api}', '--project', 'src/Orders.Api/Orders.Api.csproj']);
        expect(tasksJson.inputs).to.deep.include({
            id: 'csharpKit.efMigrationName.Orders.Api',
            type: 'promptString',
            description: 'EF Core migration name for Orders.Api',
            default: 'InitialCreate'
        });
        csharpKitConfig.roslyn.analyzerPath = '.tools/CyberVinci.Memory.RoslynSidecar.dll';
        await fsp.writeFile(result.csharpKitConfigPath, `${JSON.stringify(csharpKitConfig, undefined, 4)}\n`, 'utf8');
        const repeated = await new CSharpKitServiceImpl().writeWorkspaceFiles({
            workspacePath,
            projectPath,
            overwrite: true
        });
        const preservedConfig = JSON.parse(await fsp.readFile(repeated.csharpKitConfigPath, 'utf8'));
        expect(repeated.configChanged).to.equal(false);
        expect(preservedConfig.roslyn.analyzerPath).to.equal('.tools/CyberVinci.Memory.RoslynSidecar.dll');
    });

    it('runs dotnet build and returns parsed diagnostics', async () => {
        const projectPath = path.join(workspacePath, 'App.csproj');
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        const service = new TestCSharpKitService();
        service.nextBuildResult = {
            ok: false,
            command: '',
            cwd: workspacePath,
            stdout: `Program.cs(4,17): error CS1002: ; expected [${projectPath}]`,
            stderr: '',
            exitCode: 1,
            durationMs: 12
        };

        const result = await service.getDiagnostics({ workspacePath, projectPath, noRestore: true });

        expect(service.commands[0]).to.deep.equal([
            'build',
            projectPath,
            '/property:GenerateFullPaths=true',
            '/consoleloggerparameters:NoSummary',
            '--no-restore'
        ]);
        expect(result.commandResult.ok).to.equal(false);
        expect(result.diagnostics).to.have.length(1);
        expect(result.diagnostics[0].path).to.equal(path.join(workspacePath, 'Program.cs'));
        expect(result.diagnostics[0].projectPath).to.equal(projectPath);
        expect(result.diagnostics[0].code).to.equal('CS1002');
    });

    it('uses TRX files for structured dotnet test results', async () => {
        const projectPath = path.join(workspacePath, 'Orders.Api.Tests.csproj');
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        const service = new TestCSharpKitService();
        service.nextTestTrx = `
<TestRun>
  <Results>
    <UnitTestResult testId="test-1" testName="Passes" outcome="Passed" duration="00:00:00.2500000" />
  </Results>
  <TestDefinitions>
    <UnitTest id="test-1" name="Passes">
      <TestMethod className="Orders.Api.Tests.OrderTests" name="Passes" />
    </UnitTest>
  </TestDefinitions>
</TestRun>`;

        const result = await service.runTests({
            workspacePath,
            projectPath,
            testNames: ['Orders.Api.Tests.OrderTests.Passes'],
            noRestore: true
        });

        expect(service.commands[0]).to.include.members([
            'test',
            projectPath,
            '--no-restore',
            '--logger',
            'console;verbosity=normal',
            'trx;LogFileName=csharp-kit.trx',
            '--results-directory',
            '--filter',
            'FullyQualifiedName=Orders.Api.Tests.OrderTests.Passes'
        ]);
        expect(result.ok).to.equal(true);
        expect(result.results).to.have.length(1);
        expect(result.results[0]).to.include({
            name: 'Orders.Api.Tests.OrderTests.Passes',
            outcome: 'passed',
            durationMs: 250
        });
    });

    it('uses MTP dotnet test arguments for discovery and structured test runs', async () => {
        const projectPath = path.join(workspacePath, 'Orders.Api.Tests.csproj');
        await fsp.writeFile(path.join(workspacePath, 'global.json'), JSON.stringify({
            test: {
                runner: 'Microsoft.Testing.Platform'
            }
        }), 'utf8');
        await fsp.writeFile(projectPath, `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="18.0.0" />
    <PackageReference Include="xunit" Version="2.9.2" />
  </ItemGroup>
</Project>`, 'utf8');
        const service = new TestCSharpKitService();
        service.nextTestListOutput = `
The following Tests are available for net10.0:
    Orders.Api.Tests.OrderTests.Passes
`;
        service.nextTestTrx = `
<TestRun>
  <Results>
    <UnitTestResult testId="test-1" testName="Passes" outcome="Passed" duration="00:00:00.2500000" />
  </Results>
  <TestDefinitions>
    <UnitTest id="test-1" name="Passes">
      <TestMethod className="Orders.Api.Tests.OrderTests" name="Passes" />
    </UnitTest>
  </TestDefinitions>
</TestRun>`;

        await service.discoverTests({ workspacePath, projectPath });
        const result = await service.runTests({
            workspacePath,
            projectPath,
            testNames: ['Orders.Api.Tests.OrderTests.Passes'],
            noRestore: true
        });

        expect(service.commands[0]).to.deep.equal(['test', '--project', projectPath, '--list-tests', '--no-restore']);
        expect(service.commands[1]).to.include.members([
            'test',
            '--project',
            projectPath,
            '--no-restore',
            '--report-trx',
            '--report-trx-filename',
            'csharp-kit.trx',
            '--results-directory',
            '--filter',
            'FullyQualifiedName=Orders.Api.Tests.OrderTests.Passes'
        ]);
        expect(service.commands[1]).not.to.include('--logger');
        expect(result.ok).to.equal(true);
        expect(result.results[0]).to.include({
            name: 'Orders.Api.Tests.OrderTests.Passes',
            outcome: 'passed',
            durationMs: 250
        });
    });

    it('prepares debug test sessions and collects post-debug TRX results', async () => {
        const projectPath = path.join(workspacePath, 'Orders.Api.Tests.csproj');
        await fsp.writeFile(path.join(workspacePath, 'global.json'), JSON.stringify({
            test: {
                runner: 'Microsoft.Testing.Platform'
            }
        }), 'utf8');
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        const service = new TestCSharpKitService();

        const prepared = await service.prepareTestDebugSession({
            workspacePath,
            projectPath,
            testName: 'Orders.Api.Tests.OrderTests.Passes',
            noRestore: true
        });

        expect(prepared.cwd).to.equal(workspacePath);
        expect(prepared.resultsDirectory).to.contain(path.join(os.tmpdir(), 'cv-csharp-kit-trx-'));
        expect(prepared.args).to.include.members([
            'test',
            '--project',
            projectPath,
            '--no-restore',
            '--report-trx',
            '--report-trx-filename',
            'csharp-kit.trx',
            '--results-directory',
            prepared.resultsDirectory,
            '--filter',
            'FullyQualifiedName=Orders.Api.Tests.OrderTests.Passes'
        ]);
        expect(prepared.args).not.to.include('--logger');

        await fsp.writeFile(path.join(prepared.resultsDirectory, 'csharp-kit.trx'), `
<TestRun>
  <Results>
    <UnitTestResult testId="test-1" testName="Passes" outcome="Passed" duration="00:00:00.1250000" />
  </Results>
  <TestDefinitions>
    <UnitTest id="test-1" name="Passes">
      <TestMethod className="Orders.Api.Tests.OrderTests" name="Passes" />
    </UnitTest>
  </TestDefinitions>
</TestRun>`, 'utf8');

        const result = await service.collectTestResults({
            workspacePath,
            projectPath,
            resultsDirectory: prepared.resultsDirectory
        });

        expect(result.ok).to.equal(true);
        expect(result.results[0]).to.include({
            name: 'Orders.Api.Tests.OrderTests.Passes',
            outcome: 'passed',
            durationMs: 125
        });
        expect(await pathExists(prepared.resultsDirectory)).to.equal(false);
    });

    it('discovers tests with class and test-framework metadata', async () => {
        const projectPath = path.join(workspacePath, 'Orders.Api.Tests.csproj');
        await fsp.writeFile(projectPath, `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="xunit" Version="2.9.2" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.12.0" />
  </ItemGroup>
</Project>`, 'utf8');
        const service = new TestCSharpKitService();
        service.nextTestListOutput = `
The following Tests are available for net9.0:
    Orders.Api.Tests.OrderTests.Passes(value: 1)
`;

        const result = await service.discoverTests({ workspacePath, projectPath });

        expect(service.commands[0]).to.deep.equal(['test', projectPath, '--list-tests', '--no-restore']);
        expect(result.tests[0]).to.include({
            name: 'Orders.Api.Tests.OrderTests.Passes(value: 1)',
            fullyQualifiedName: 'Orders.Api.Tests.OrderTests.Passes',
            displayName: 'Passes(value: 1)',
            namespaceName: 'Orders.Api.Tests',
            className: 'OrderTests',
            methodName: 'Passes',
            arguments: '(value: 1)',
            framework: 'net9.0',
            testFramework: 'xUnit'
        });
    });

    it('discovers MSTest.Sdk tests without Microsoft.NET.Test.Sdk package metadata', async () => {
        const projectPath = path.join(workspacePath, 'Orders.Checks.csproj');
        await fsp.writeFile(projectPath, `
<Project Sdk="MSTest.Sdk/4.1.0">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
  </PropertyGroup>
</Project>`, 'utf8');
        const service = new TestCSharpKitService();
        service.nextTestListOutput = `
The following Tests are available for net10.0:
    Orders.Checks.OrderTests.Passes
`;

        const inspection = await service.inspectWorkspace({ workspacePath });
        const result = await service.discoverTests({ workspacePath, projectPath });

        expect(inspection.projects[0]).to.include({
            isTestProject: true,
            kind: 'test',
            testFramework: 'MSTest',
            testRunner: 'Microsoft.Testing.Platform'
        });
        expect(inspection.capabilities.find(item => item.id === 'test-explorer-workflow')?.state).to.equal('ready');
        expect(result.tests[0]).to.include({
            name: 'Orders.Checks.OrderTests.Passes',
            testFramework: 'MSTest',
            framework: 'net10.0'
        });
    });

    it('indexes workspace symbols for hover, outline and definition providers', async () => {
        const projectPath = path.join(workspacePath, 'Orders.Api.csproj');
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'OrderService.cs'), `
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Orders.Api.Services;

public sealed class OrderService
{
    public string Name { get; init; } = "Orders";

    [HttpGet("orders/{id:int}")]
    public string GetOrder(int id)
    {
        return $"{Name}:{id}";
    }

    [Fact]
    public void GetOrder_returns_order()
    {
    }
}`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Program.cs'), `
var app = WebApplication.CreateBuilder(args).Build();
app.MapGet("/orders/{id:int}", (int id) => id);
`, 'utf8');

        const result = await new CSharpKitServiceImpl().getWorkspaceSymbols({ workspacePath });
        const service = result.symbols.find(symbol => symbol.name === 'OrderService');
        const method = result.symbols.find(symbol => symbol.name === 'GetOrder');
        const property = result.symbols.find(symbol => symbol.name === 'Name');
        const controllerEndpoint = result.symbols.find(symbol => symbol.kind === 'aspnet-endpoint' && symbol.name === 'GET orders/{id:int}');
        const minimalEndpoint = result.symbols.find(symbol => symbol.kind === 'aspnet-endpoint' && symbol.name === 'GET /orders/{id:int}');
        const testMethod = result.symbols.find(symbol => symbol.kind === 'test-method' && symbol.name === 'GetOrder_returns_order');

        expect(result.symbols.map(symbol => symbol.name)).to.include.members([
            'Orders.Api.Services',
            'OrderService',
            'GetOrder',
            'Name',
            'GET orders/{id:int}',
            'GET /orders/{id:int}',
            'GetOrder_returns_order'
        ]);
        expect(service?.kind).to.equal('class');
        expect(service?.containerName).to.equal('Orders.Api.Services');
        expect(method?.kind).to.equal('method');
        expect(method?.containerName).to.equal('OrderService');
        expect(method?.signature).to.equal('string GetOrder(int id)');
        expect(controllerEndpoint?.detail).to.contain('ASP.NET controller endpoint');
        expect(minimalEndpoint?.detail).to.contain('ASP.NET Minimal API endpoint');
        expect(testMethod?.detail).to.contain('xUnit test method');
        expect(property?.kind).to.equal('property');
        expect(property?.returnType).to.equal('string');
        expect(property?.selectionLine).to.be.greaterThan(1);
    });

    it('builds an AI/Memory code context pack from project metadata and workspace symbols', async () => {
        const projectPath = path.join(workspacePath, 'Orders.Api.csproj');
        await fsp.writeFile(projectPath, `
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="9.0.0" />
  </ItemGroup>
</Project>`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'OrdersController.cs'), `
using Microsoft.AspNetCore.Mvc;

namespace Orders.Api.Controllers;

[ApiController]
[Route("api/orders")]
public sealed class OrdersController : ControllerBase
{
    [HttpGet("{id:int}")]
    public IActionResult GetOrder(int id) => Ok(id);
}
`, 'utf8');

        const result = await new CSharpKitServiceImpl().getCodeContext({ workspacePath, projectPath });

        expect(result.projectPath).to.equal(projectPath);
        expect(result.semanticMode).to.equal('unavailable');
        expect(result.summary).to.contain('Orders.Api');
        expect(result.signals.map(signal => signal.label)).to.include.members(['Selected', 'ASP.NET', 'Symbols', 'Endpoints']);
        expect(result.sections.find(section => section.id === 'symbols')?.items.some(item => item.includes('GET {id:int}'))).to.equal(true);
        expect(result.suggestions.map(suggestion => suggestion.id)).to.include.members(['ai-context-pack', 'endpoint-tests', 'add-tests']);
        expect(result.prompt).to.contain('# CyberVinci C# Context');
        expect(result.prompt).to.contain('Microsoft.AspNetCore.OpenApi');
    });

    it('builds an AI/Memory code context pack scoped to a solution filter', async () => {
        const apiProjectPath = path.join(workspacePath, 'src', 'Orders.Api', 'Orders.Api.csproj');
        const workerProjectPath = path.join(workspacePath, 'src', 'Orders.Worker', 'Orders.Worker.csproj');
        await fsp.mkdir(path.dirname(apiProjectPath), { recursive: true });
        await fsp.mkdir(path.dirname(workerProjectPath), { recursive: true });
        await fsp.writeFile(apiProjectPath, '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net9.0</TargetFramework></PropertyGroup></Project>', 'utf8');
        await fsp.writeFile(workerProjectPath, '<Project Sdk="Microsoft.NET.Sdk.Worker"><PropertyGroup><TargetFramework>net9.0</TargetFramework></PropertyGroup></Project>', 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'src', 'Orders.Api', 'OrdersController.cs'), 'namespace Orders.Api; public sealed class OrdersController { public string GetOrder(int id) => "ok"; }', 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'src', 'Orders.Worker', 'Worker.cs'), 'namespace Orders.Worker; public sealed class Worker { public void Execute() { } }', 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Workspace.sln'), `
Microsoft Visual Studio Solution File, Format Version 12.00
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Orders.Api", "src\\Orders.Api\\Orders.Api.csproj", "{11111111-1111-1111-1111-111111111111}"
EndProject
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Orders.Worker", "src\\Orders.Worker\\Orders.Worker.csproj", "{22222222-2222-2222-2222-222222222222}"
EndProject
Global
EndGlobal`, 'utf8');
        const solutionPath = path.join(workspacePath, 'ApiOnly.slnf');
        await fsp.writeFile(solutionPath, JSON.stringify({
            solution: {
                path: 'Workspace.sln',
                projects: [
                    'src\\Orders.Api\\Orders.Api.csproj'
                ]
            }
        }), 'utf8');

        const result = await new CSharpKitServiceImpl().getCodeContext({ workspacePath, solutionPath });

        expect(result.solutionPath).to.equal(solutionPath);
        expect(result.projectPath).to.equal(undefined);
        expect(result.summary).to.contain('ApiOnly.slnf');
        expect(result.signals.map(signal => signal.label)).to.include.members(['Solution', 'Projects', 'Symbols']);
        expect(result.sections.find(section => section.id === 'solution')?.items.join('\n')).to.contain('Orders.Api');
        expect(result.sections.find(section => section.id === 'symbols')?.items.some(item => item.includes('OrdersController'))).to.equal(true);
        expect(result.sections.find(section => section.id === 'symbols')?.items.some(item => item.includes('Worker'))).to.equal(false);
        expect(result.suggestions.map(suggestion => suggestion.id)).to.include('solution-filter-context');
    });

    it('builds a Roslyn semantic inventory through the sidecar adapter', async () => {
        const projectPath = path.join(workspacePath, 'Orders.Api.csproj');
        const sourcePath = path.join(workspacePath, 'OrdersController.cs');
        await fsp.writeFile(projectPath, '<Project Sdk="Microsoft.NET.Sdk.Web" />', 'utf8');
        await fsp.writeFile(sourcePath, 'namespace Orders.Api; public sealed class OrdersController { }', 'utf8');

        const service = new SemanticInventoryCSharpKitService();
        const result = await service.getSemanticInventory({ workspacePath });

        expect(result.mode).to.equal('semantic');
        expect(result.analyzedFiles).to.equal(1);
        expect(result.analyzerIds).to.deep.equal(['csharp-roslyn-sidecar']);
        expect(result.summary).to.include({
            symbolCount: 3,
            relationCount: 1,
            endpointCount: 1,
            testMethodCount: 1,
            dependencyHintCount: 1,
            callHintCount: 1
        });
        expect(result.symbols.map(symbol => symbol.kind)).to.include.members(['endpoint', 'test_method']);
        expect(result.dependencyHints[0].targetName).to.equal('Orders.Api.Services.IOrderService');
        expect(result.callHints[0].targetName).to.equal('Orders.Api.Services.OrderService.GetAsync()');
        expect(result.diagnostics[0].id).to.equal('roslyn-semantic-mode');
        expect(service.analyzedRelativePaths).to.deep.equal(['OrdersController.cs']);
    });

    it('adds Razor directive summaries and symbols to web projects', async () => {
        const projectPath = path.join(workspacePath, 'Orders.Web.csproj');
        await fsp.writeFile(projectPath, `
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
</Project>`, 'utf8');
        await fsp.mkdir(path.join(workspacePath, 'Pages'), { recursive: true });
        await fsp.writeFile(path.join(workspacePath, 'Pages', 'Orders.cshtml'), `
@page "/orders"
@model OrdersPageModel
@inject Orders.Services.OrderService Orders

<OrderSummary />
`, 'utf8');

        const service = new CSharpKitServiceImpl();
        const inspection = await service.inspectWorkspace({ workspacePath });
        const project = inspection.projects[0];
        const symbols = await service.getWorkspaceSymbols({ workspacePath });

        expect(project.razorFiles).to.have.length(1);
        expect(project.razorFiles[0].routeTemplates).to.deep.equal(['/orders']);
        expect(project.razorFiles[0].model).to.equal('OrdersPageModel');
        expect(project.razorFiles[0].injections[0].name).to.equal('Orders');
        expect(project.razorFiles[0].componentTags).to.deep.equal(['OrderSummary']);
        expect(symbols.symbols.map(symbol => symbol.kind)).to.include.members(['razor-page', 'razor-model', 'razor-inject', 'razor-component']);
    });

    it('applies Razor _ViewImports.cshtml and _Imports.razor context by folder', async () => {
        const projectPath = path.join(workspacePath, 'Orders.Web.csproj');
        await fsp.writeFile(projectPath, `
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
</Project>`, 'utf8');
        await fsp.mkdir(path.join(workspacePath, 'Pages', 'Admin'), { recursive: true });
        await fsp.mkdir(path.join(workspacePath, 'Components'), { recursive: true });
        await fsp.writeFile(path.join(workspacePath, 'Pages', '_ViewImports.cshtml'), `
@namespace Orders.Web.Pages
@using Orders.Web.Models
@inject Orders.Web.Services.MenuService Menu
@addTagHelper *, Microsoft.AspNetCore.Mvc.TagHelpers
@tagHelperPrefix th:
`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Pages', 'Admin', '_ViewImports.cshtml'), `
@namespace Orders.Web.Pages.Admin
@using Orders.Web.Admin
@addTagHelper Orders.Web.TagHelpers.*, Orders.Web
`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Pages', 'Admin', 'Orders.cshtml'), `
@page "/admin/orders"
@model OrdersAdminModel
<th:order-list />
`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Components', '_Imports.razor'), `
@using Orders.Web.Components
@layout MainLayout
`, 'utf8');
        await fsp.writeFile(path.join(workspacePath, 'Components', 'StatusBadge.razor'), `
<span>Status</span>
`, 'utf8');

        const inspection = await new CSharpKitServiceImpl().inspectWorkspace({ workspacePath });
        const project = inspection.projects[0];
        const page = project.razorFiles.find(file => file.relativePath === 'Pages/Admin/Orders.cshtml');
        const component = project.razorFiles.find(file => file.relativePath === 'Components/StatusBadge.razor');

        expect(page?.importedFiles.map(file => file.relativePath)).to.deep.equal([
            'Pages/_ViewImports.cshtml',
            'Pages/Admin/_ViewImports.cshtml'
        ]);
        expect(page?.effectiveNamespace).to.equal('Orders.Web.Pages.Admin');
        expect(page?.effectiveUsings).to.deep.equal(['Orders.Web.Models', 'Orders.Web.Admin']);
        expect(page?.effectiveInjections.map(injection => injection.name)).to.deep.equal(['Menu']);
        expect(page?.effectiveTagHelpers).to.deep.equal([
            '*, Microsoft.AspNetCore.Mvc.TagHelpers',
            'Orders.Web.TagHelpers.*, Orders.Web'
        ]);
        expect(page?.effectiveTagHelperPrefix).to.equal('th:');
        expect(component?.importedFiles.map(file => file.relativePath)).to.deep.equal(['Components/_Imports.razor']);
        expect(component?.effectiveUsings).to.deep.equal(['Orders.Web.Components']);
        expect(component?.effectiveLayout).to.equal('MainLayout');
    });
});

async function pathExists(filePath: string): Promise<boolean> {
    try {
        await fsp.access(filePath);
        return true;
    } catch {
        return false;
    }
}

class TestCSharpKitService extends CSharpKitServiceImpl {
    readonly commands: string[][] = [];
    readonly nugetSearchUrls: string[] = [];
    nextBuildResult: CSharpCommandResult | undefined;
    nextNuGetSearchJson: string | undefined;
    nextPackageUpdatesOutput: string | undefined;
    nextPackageHealthOutputs: { vulnerable?: string; deprecated?: string } = {};
    nextTestListOutput: string | undefined;
    nextTestTrx: string | undefined;
    newSolutionExtension: '.sln' | '.slnx' = '.sln';

    protected override async fetchNuGetSearch(url: URL): Promise<string> {
        this.nugetSearchUrls.push(url.toString());
        return this.nextNuGetSearchJson ?? '{"data":[]}';
    }

    protected override async runDotnet(cwd: string, args: string[], timeoutMs?: number): Promise<CSharpCommandResult> {
        this.commands.push(args);
        if (args[0] === 'build' && this.nextBuildResult) {
            return {
                ...this.nextBuildResult,
                command: ['dotnet', ...args].join(' '),
                cwd
            };
        }
        if (args[0] === 'list' && args.includes('--outdated') && this.nextPackageUpdatesOutput) {
            return {
                ok: true,
                command: ['dotnet', ...args].join(' '),
                cwd,
                stdout: this.nextPackageUpdatesOutput,
                stderr: '',
                exitCode: 0,
                durationMs: timeoutMs ? 1 : 0
            };
        }
        if (args[0] === 'list' && args.includes('--vulnerable') && this.nextPackageHealthOutputs.vulnerable) {
            return {
                ok: true,
                command: ['dotnet', ...args].join(' '),
                cwd,
                stdout: this.nextPackageHealthOutputs.vulnerable,
                stderr: '',
                exitCode: 0,
                durationMs: timeoutMs ? 1 : 0
            };
        }
        if (args[0] === 'list' && args.includes('--deprecated') && this.nextPackageHealthOutputs.deprecated) {
            return {
                ok: true,
                command: ['dotnet', ...args].join(' '),
                cwd,
                stdout: this.nextPackageHealthOutputs.deprecated,
                stderr: '',
                exitCode: 0,
                durationMs: timeoutMs ? 1 : 0
            };
        }
        if (args[0] === 'test' && args.includes('--list-tests') && this.nextTestListOutput) {
            return {
                ok: true,
                command: ['dotnet', ...args].join(' '),
                cwd,
                stdout: this.nextTestListOutput,
                stderr: '',
                exitCode: 0,
                durationMs: timeoutMs ? 1 : 0
            };
        }
        if (args[0] === 'test' && this.nextTestTrx) {
            const resultsDirectoryIndex = args.indexOf('--results-directory');
            const resultsDirectory = resultsDirectoryIndex >= 0 ? args[resultsDirectoryIndex + 1] : cwd;
            await fsp.mkdir(resultsDirectory, { recursive: true });
            await fsp.writeFile(path.join(resultsDirectory, 'csharp-kit.trx'), this.nextTestTrx, 'utf8');
        }
        if (args[0] === 'new' && args[1] !== 'sln') {
            const outputIndex = args.indexOf('--output');
            const outputDirectory = outputIndex >= 0 ? args[outputIndex + 1] : cwd;
            const nameIndex = args.indexOf('--name');
            const projectName = nameIndex >= 0 ? args[nameIndex + 1] : path.basename(outputDirectory);
            await fsp.mkdir(outputDirectory, { recursive: true });
            await fsp.writeFile(path.join(outputDirectory, `${projectName}.csproj`), '<Project Sdk="Microsoft.NET.Sdk" />', 'utf8');
        }
        if (args[0] === 'new' && args[1] === 'sln') {
            const nameIndex = args.indexOf('--name');
            const outputIndex = args.indexOf('--output');
            const solutionName = nameIndex >= 0 ? args[nameIndex + 1] : 'Workspace';
            const outputDirectory = outputIndex >= 0 ? args[outputIndex + 1] : cwd;
            await fsp.writeFile(path.join(outputDirectory, `${solutionName}${this.newSolutionExtension}`), '', 'utf8');
        }
        return {
            ok: true,
            command: ['dotnet', ...args].join(' '),
            cwd,
            stdout: 'ok',
            stderr: '',
            exitCode: 0,
            durationMs: timeoutMs ? 1 : 0
        };
    }
}

class LanguageServerStatusCSharpKitService extends CSharpKitServiceImpl {
    protected override getLanguageServerAdapters(_workspacePath?: string): CSharpLanguageServerAdapterStatus[] {
        return [
            {
                id: 'mock-csharp-lsp',
                label: 'Mock C# LSP',
                language: 'csharp',
                mode: 'ready',
                command: 'mock-csharp-ls',
                args: ['--stdio'],
                probeTimeoutMs: 7000,
                envVar: 'CYBERVINCI_CSHARP_LSP_COMMAND',
                source: 'test',
                setupHint: 'mock setup',
                detail: 'Mock C# LSP is ready.'
            },
            {
                id: 'mock-razor-lsp',
                label: 'Mock Razor LSP',
                language: 'razor',
                mode: 'missing',
                args: [],
                probeTimeoutMs: 7000,
                envVar: 'CYBERVINCI_RAZOR_LSP_COMMAND',
                source: 'test',
                setupHint: 'mock setup',
                detail: 'Mock Razor LSP is missing.'
            }
        ];
    }
}

class DotnetSdkStatusCSharpKitService extends CSharpKitServiceImpl {
    protected override async getDotnetInfo(): Promise<CSharpDotnetInfo> {
        return {
            available: true,
            executable: 'dotnet',
            version: '9.0.100',
            sdks: ['9.0.100 [C:\\Program Files\\dotnet\\sdk]'],
            runtimes: []
        };
    }
}

class SemanticInventoryCSharpKitService extends CSharpKitServiceImpl {
    readonly analyzedRelativePaths: string[] = [];

    protected override async getRoslynStatus(_workspacePath?: string): Promise<CSharpRoslynStatus> {
        return {
            mode: 'semantic-ready',
            detail: 'Mock Roslyn sidecar is ready.',
            analyzerPath: 'mock-roslyn.dll'
        };
    }

    protected override createRoslynAnalyzer(_analyzerPath?: string, _timeoutMs?: number): { analyze(context: LanguageAnalysisContext): LanguageAnalysisResult } {
        return {
            analyze: context => {
                this.analyzedRelativePaths.push(context.file.relativePath);
                const controllerId = 'symbol_controller';
                const endpointId = 'symbol_endpoint';
                const testId = 'symbol_test';
                const result: LanguageAnalysisResult = {
                    fileId: context.file.id,
                    languageId: 'csharp',
                    analyzerId: 'csharp-roslyn-sidecar',
                    symbols: [
                        {
                            id: controllerId,
                            fileId: context.file.id,
                            languageId: 'csharp',
                            symbolKind: 'class',
                            name: 'OrdersController',
                            fullName: 'Orders.Api.Controllers.OrdersController',
                            metadata: {
                                normalizedSymbolKind: 'controller'
                            }
                        },
                        {
                            id: endpointId,
                            fileId: context.file.id,
                            languageId: 'csharp',
                            symbolKind: 'endpoint',
                            name: 'Get',
                            fullName: 'Orders.Api.Controllers.OrdersController.Get',
                            parentSymbolId: controllerId,
                            metadata: {
                                normalizedSymbolKind: 'controller_action',
                                route: 'api/orders/{id:int}',
                                isAspNetAction: true
                            }
                        },
                        {
                            id: testId,
                            fileId: context.file.id,
                            languageId: 'csharp',
                            symbolKind: 'test_method',
                            name: 'Get_returns_order',
                            fullName: 'Orders.Api.Tests.OrdersControllerTests.Get_returns_order',
                            metadata: {
                                normalizedSymbolKind: 'test_method'
                            }
                        }
                    ],
                    relations: [
                        {
                            id: 'relation_controller_endpoint',
                            sourceKind: 'symbol',
                            sourceId: controllerId,
                            targetKind: 'symbol',
                            targetId: endpointId,
                            relationType: 'contains',
                            confidenceLevel: 'extracted',
                            confidenceScore: 1,
                            evidence: 'controller declares endpoint'
                        }
                    ],
                    callHints: [
                        {
                            sourceSymbolId: endpointId,
                            targetName: 'Orders.Api.Services.OrderService.GetAsync()',
                            evidence: 'calls Orders.Api.Services.OrderService.GetAsync()'
                        }
                    ],
                    dependencyHints: [
                        {
                            sourceSymbolId: controllerId,
                            targetTypeName: 'Orders.Api.Services.IOrderService',
                            evidence: 'constructor requires Orders.Api.Services.IOrderService'
                        }
                    ],
                    diagnostics: [
                        {
                            id: 'roslyn-semantic-mode',
                            severity: 'info',
                            message: 'C# analysis is using Roslyn semantic mode with MSBuild workspace context.',
                            path: context.file.relativePath
                        }
                    ]
                };
                return result;
            }
        };
    }
}
