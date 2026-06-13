import type { CSharpProjectSummary, CSharpWorkspaceInspection } from './index';

export interface CSharpAIContextTarget {
    solutionPath?: string;
    projectPath?: string;
    documentPath?: string;
    label: string;
    source: 'argument' | 'selection' | 'workspace';
}

export interface CSharpAIContextTargetOption {
    label: string;
    arg: string;
    kind: 'workspace' | 'solution' | 'project' | 'document';
    description?: string;
    detail?: string;
    solutionPath?: string;
    projectPath?: string;
    documentPath?: string;
}

const WORKSPACE_TARGETS = new Set(['all', 'workspace', 'solution', 'solutions']);

export function listCSharpAIContextTargetOptions(workspacePath: string, inspection: CSharpWorkspaceInspection): CSharpAIContextTargetOption[] {
    const options: CSharpAIContextTargetOption[] = [{
        label: 'Workspace',
        arg: 'workspace',
        kind: 'workspace',
        description: `${inspection.projects.length} C# project(s)`
    }];
    for (const solution of inspection.solutions) {
        options.push({
            label: solution.name,
            arg: toWorkspaceRelativePath(workspacePath, solution.path),
            kind: 'solution',
            description: `${solution.format} ${solution.projectPaths.length} project reference(s)`,
            detail: solution.format === 'slnf' && solution.sourceSolutionName ? `filters ${solution.sourceSolutionName}` : undefined,
            solutionPath: solution.path
        });
    }
    for (const project of inspection.projects) {
        options.push({
            label: project.name,
            arg: project.name,
            kind: 'project',
            description: project.targetFrameworks.join(', ') || project.kind,
            detail: toWorkspaceRelativePath(workspacePath, project.path),
            projectPath: project.path
        });
        for (const file of project.files.filter(candidate => candidate.kind === 'csharp' || candidate.kind === 'razor')) {
            const workspaceRelativePath = toWorkspaceRelativePath(workspacePath, file.path);
            options.push({
                label: `${project.name}: ${file.relativePath}`,
                arg: workspaceRelativePath,
                kind: 'document',
                description: file.kind,
                detail: project.name,
                projectPath: project.path,
                documentPath: file.path
            });
        }
    }
    return options;
}

export function quoteCSharpAIContextArgument(arg: string): string {
    return /\s/.test(arg) ? `"${arg}"` : arg;
}

export function resolveCSharpAIContextTarget(
    workspacePath: string,
    inspection: CSharpWorkspaceInspection,
    arg?: string,
    selectedPath?: string
): CSharpAIContextTarget {
    const requested = normalizeContextArgument(arg);
    if (requested) {
        if (WORKSPACE_TARGETS.has(requested.toLowerCase())) {
            return {
                label: 'workspace',
                source: 'argument'
            };
        }
        const argumentTarget = resolveProjectOrDocument(workspacePath, inspection.projects, requested, 'argument');
        if (argumentTarget) {
            return argumentTarget;
        }
        const solutionTarget = resolveSolution(workspacePath, inspection, requested, 'argument');
        if (solutionTarget) {
            return solutionTarget;
        }
    }
    if (selectedPath) {
        const selectionTarget = resolveProjectOrDocument(workspacePath, inspection.projects, selectedPath, 'selection');
        if (selectionTarget) {
            return selectionTarget;
        }
        const solutionTarget = resolveSolution(workspacePath, inspection, selectedPath, 'selection');
        if (solutionTarget) {
            return solutionTarget;
        }
    }
    const firstProject = inspection.projects[0];
    if (firstProject) {
        return {
            projectPath: firstProject.path,
            label: firstProject.name,
            source: 'workspace'
        };
    }
    return {
        label: 'workspace',
        source: 'workspace'
    };
}

function resolveSolution(
    workspacePath: string,
    inspection: CSharpWorkspaceInspection,
    target: string,
    source: CSharpAIContextTarget['source']
): CSharpAIContextTarget | undefined {
    const normalizedTarget = normalizePath(target);
    const normalizedWorkspace = normalizePath(workspacePath);
    const normalizedAbsoluteTarget = isLikelyAbsolutePath(target)
        ? normalizedTarget
        : normalizePath(`${workspacePath}/${target}`);
    return inspection.solutions
        .map(solution => {
            const solutionPath = normalizePath(solution.path);
            const relativeSolutionPath = relativePath(normalizedWorkspace, solutionPath);
            return {
                solution,
                matches: normalizedTarget === solutionPath ||
                    normalizedAbsoluteTarget === solutionPath ||
                    normalizedTarget === relativeSolutionPath ||
                    normalizedTarget === normalizePath(solution.name)
            };
        })
        .filter(candidate => candidate.matches)
        .map(({ solution }) => ({
            solutionPath: solution.path,
            label: solution.name,
            source
        }))[0];
}

function resolveProjectOrDocument(
    workspacePath: string,
    projects: CSharpProjectSummary[],
    target: string,
    source: CSharpAIContextTarget['source']
): CSharpAIContextTarget | undefined {
    const normalizedTarget = normalizePath(target);
    const normalizedWorkspace = normalizePath(workspacePath);
    const normalizedAbsoluteTarget = isLikelyAbsolutePath(target)
        ? normalizedTarget
        : normalizePath(`${workspacePath}/${target}`);

    for (const project of projects) {
        const projectPath = normalizePath(project.path);
        const projectDirectory = normalizePath(project.directory);
        const relativeProjectPath = relativePath(normalizedWorkspace, projectPath);
        if (
            normalizedTarget === projectPath ||
            normalizedAbsoluteTarget === projectPath ||
            normalizedTarget === relativeProjectPath ||
            normalizedTarget === normalizePath(project.name) ||
            normalizedTarget === normalizePath(project.assemblyName)
        ) {
            return {
                projectPath: project.path,
                label: project.name,
                source
            };
        }
        const file = project.files.find(candidate => {
            const filePath = normalizePath(candidate.path);
            const relativeFilePath = normalizePath(candidate.relativePath);
            return normalizedTarget === filePath ||
                normalizedAbsoluteTarget === filePath ||
                normalizedTarget === relativeFilePath;
        });
        if (file) {
            return {
                projectPath: project.path,
                documentPath: file.path,
                label: `${project.name}: ${file.relativePath}`,
                source
            };
        }
        if (normalizedAbsoluteTarget.startsWith(`${projectDirectory}/`)) {
            return {
                projectPath: project.path,
                label: project.name,
                source
            };
        }
    }
    return undefined;
}

function normalizeContextArgument(arg: string | undefined): string | undefined {
    const trimmed = arg?.trim();
    if (!trimmed || trimmed === '$ARGUMENTS') {
        return undefined;
    }
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1).trim() || undefined;
    }
    return trimmed;
}

function normalizePath(value: string | undefined): string {
    return (value ?? '').replace(/\\/g, '/').replace(/\/+$/g, '').toLowerCase();
}

function relativePath(normalizedWorkspace: string, normalizedPath: string): string {
    return normalizedPath.startsWith(`${normalizedWorkspace}/`)
        ? normalizedPath.slice(normalizedWorkspace.length + 1)
        : normalizedPath;
}

function toWorkspaceRelativePath(workspacePath: string, targetPath: string): string {
    const normalizedWorkspace = workspacePath.replace(/\\/g, '/').replace(/\/+$/g, '');
    const normalizedTarget = targetPath.replace(/\\/g, '/');
    const lowerWorkspace = normalizedWorkspace.toLowerCase();
    const lowerTarget = normalizedTarget.toLowerCase();
    return lowerTarget.startsWith(`${lowerWorkspace}/`)
        ? normalizedTarget.slice(normalizedWorkspace.length + 1)
        : normalizedTarget;
}

function isLikelyAbsolutePath(value: string): boolean {
    return /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith('/') || value.startsWith('\\\\');
}
