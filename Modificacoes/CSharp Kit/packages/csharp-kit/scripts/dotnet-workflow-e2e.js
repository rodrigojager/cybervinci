#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const os = require('os');
const path = require('path');

const packageRoot = path.resolve(__dirname, '..');
const serviceModulePath = path.join(packageRoot, 'lib', 'node', 'csharp-kit-service.js');

if (!fs.existsSync(serviceModulePath)) {
    console.error(`Missing compiled service module at ${serviceModulePath}. Run npm run compile before this E2E check.`);
    process.exit(2);
}

try {
    require('@theia/core/shared/reflect-metadata');
} catch (_error) {
    try {
        require('reflect-metadata');
    } catch (_fallbackError) {
        // The direct service import may still work depending on the Theia bundle.
    }
}

const { CSharpKitServiceImpl } = require(serviceModulePath);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-dotnet-workflow-e2e-'));
const keepTemp = process.env.CSHARP_KIT_KEEP_E2E_TEMP === '1';

class E2EFailure extends Error {
    constructor(message, detail) {
        super(message);
        this.detail = detail;
    }
}

function assertE2E(condition, message, detail) {
    if (!condition) {
        throw new E2EFailure(message, detail);
    }
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function samePath(left, right) {
    return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function capabilityState(inspection, id) {
    return inspection.capabilities.find(capability => capability.id === id)?.state;
}

async function main() {
    const service = new CSharpKitServiceImpl();

    const solution = await service.createSolution({
        workspacePath: tempRoot,
        solutionName: 'SampleWorkspace'
    });
    assertE2E(solution.ok, 'C# Kit failed to create the temporary solution.', solution.commandResult);

    const project = await service.createProject({
        workspacePath: tempRoot,
        templateId: 'console',
        projectName: 'SampleApp',
        outputDirectory: '.',
        solutionPath: solution.solutionPath
    });
    assertE2E(project.ok, 'C# Kit failed to create the temporary console project.', project.commandResults);

    const inspection = await service.inspectWorkspace({ workspacePath: tempRoot });
    const projectSummary = inspection.projects.find(candidate => samePath(candidate.path, project.projectPath));
    const solutionSummary = inspection.solutions.find(candidate => samePath(candidate.path, solution.solutionPath));

    assertE2E(inspection.dotnet.available, 'dotnet was not available to C# Kit.', inspection.dotnet);
    assertE2E(projectSummary, 'C# Kit did not inspect the generated project.', inspection.projects);
    assertE2E(solutionSummary, 'C# Kit did not inspect the generated solution.', inspection.solutions);
    assertE2E(solutionSummary.projectPaths.some(candidate => samePath(candidate, project.projectPath)), 'The generated solution did not include the generated project.', solutionSummary);
    assertE2E(capabilityState(inspection, 'solution-project-system') === 'ready', 'The solution/project capability was not ready.', inspection.capabilities);
    assertE2E(capabilityState(inspection, 'build-diagnostics') === 'ready', 'The build diagnostics capability was not ready.', inspection.capabilities);

    const generated = await service.writeWorkspaceFiles({
        workspacePath: tempRoot,
        projectPath: project.projectPath,
        overwrite: true
    });
    const launchJson = readJson(generated.launchJsonPath);
    const tasksJson = readJson(generated.tasksJsonPath);

    assertE2E(generated.launchConfigurationNames.includes('C# Kit: Debug SampleApp'), 'C# Kit did not report the expected debug configuration.', generated);
    assertE2E(generated.taskLabels.includes('C# Kit: build SampleApp'), 'C# Kit did not report the expected build task.', generated);
    assertE2E(generated.taskLabels.includes('C# Kit: run SampleApp'), 'C# Kit did not report the expected run task.', generated);
    assertE2E(generated.taskLabels.includes('C# Kit: install csharp-ls local tool'), 'C# Kit did not report the expected local csharp-ls install task.', generated);
    assertE2E(launchJson.configurations.some(configuration => configuration.name === 'C# Kit: Debug SampleApp'), 'launch.json did not contain the expected debug configuration.', launchJson);
    assertE2E(tasksJson.tasks.some(task => task.label === 'C# Kit: build SampleApp'), 'tasks.json did not contain the expected build task.', tasksJson);
    assertE2E(tasksJson.tasks.some(task => task.label === 'C# Kit: run SampleApp'), 'tasks.json did not contain the expected run task.', tasksJson);

    const diagnostics = await service.getDiagnostics({
        workspacePath: tempRoot,
        projectPath: project.projectPath
    });
    assertE2E(diagnostics.commandResult.ok, 'dotnet build failed during C# Kit diagnostics.', {
        commandResult: diagnostics.commandResult,
        diagnostics: diagnostics.diagnostics,
        rawOutput: diagnostics.rawOutput
    });
    assertE2E(diagnostics.diagnostics.length === 0, 'C# Kit reported unexpected build diagnostics for the generated project.', diagnostics);

    console.log(JSON.stringify({
        ok: true,
        workspacePath: tempRoot,
        dotnetVersion: inspection.dotnet.version,
        projectPath: project.projectPath,
        solutionPath: solution.solutionPath,
        inspectedProjects: inspection.projects.length,
        inspectedSolutions: inspection.solutions.length,
        generatedLaunchConfigurations: generated.launchConfigurationNames,
        generatedTaskLabels: generated.taskLabels,
        buildExitCode: diagnostics.commandResult.exitCode,
        diagnosticCount: diagnostics.diagnostics.length
    }, undefined, 2));
}

main()
    .catch(error => {
        if (error instanceof E2EFailure) {
            console.error(error.message);
            if (error.detail !== undefined) {
                console.error(JSON.stringify(error.detail, undefined, 2));
            }
            process.exitCode = 3;
            return;
        }
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => {
        if (keepTemp) {
            console.log(`Kept E2E workspace: ${tempRoot}`);
            return;
        }
        fs.rmSync(tempRoot, { recursive: true, force: true });
    });
