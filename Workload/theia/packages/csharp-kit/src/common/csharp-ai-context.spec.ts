import { expect } from 'chai';
import { CSharpWorkspaceInspection } from './index';
import { listCSharpAIContextTargetOptions, resolveCSharpAIContextTarget } from './csharp-ai-context';

describe('CSharp AI context target resolution', () => {
    const workspacePath = 'C:/repo';
    const inspection = {
        solutions: [{
            path: 'C:/repo/Orders.slnx',
            name: 'Orders',
            format: 'slnx',
            projectPaths: [
                'C:/repo/src/Orders.Api/Orders.Api.csproj',
                'C:/repo/tests/Orders.Tests/Orders.Tests.csproj'
            ]
        }, {
            path: 'C:/repo/ApiOnly.slnf',
            name: 'ApiOnly',
            format: 'slnf',
            sourceSolutionPath: 'C:/repo/Orders.slnx',
            sourceSolutionName: 'Orders',
            projectPaths: [
                'C:/repo/src/Orders.Api/Orders.Api.csproj'
            ]
        }],
        projects: [{
            path: 'C:/repo/src/Orders.Api/Orders.Api.csproj',
            directory: 'C:/repo/src/Orders.Api',
            name: 'Orders.Api',
            assemblyName: 'Orders.Api',
            kind: 'web',
            targetFrameworks: ['net9.0'],
            packageReferences: [],
            projectReferences: [],
            msBuildFiles: [],
            files: [{
                path: 'C:/repo/src/Orders.Api/Controllers/OrdersController.cs',
                relativePath: 'Controllers/OrdersController.cs',
                kind: 'csharp'
            }],
            razorFiles: [],
            launchProfiles: [],
            publishProfiles: [],
            isAspNetCore: true,
            isTestProject: false
        }, {
            path: 'C:/repo/tests/Orders.Tests/Orders.Tests.csproj',
            directory: 'C:/repo/tests/Orders.Tests',
            name: 'Orders.Tests',
            assemblyName: 'Orders.Tests',
            kind: 'test',
            targetFrameworks: ['net9.0'],
            packageReferences: [],
            projectReferences: [],
            msBuildFiles: [],
            files: [],
            razorFiles: [],
            launchProfiles: [],
            publishProfiles: [],
            isAspNetCore: false,
            isTestProject: true,
            testFramework: 'xUnit',
            testRunner: 'VSTest'
        }]
    } as unknown as CSharpWorkspaceInspection;

    it('resolves an explicit project argument by project name', () => {
        const target = resolveCSharpAIContextTarget(workspacePath, inspection, 'Orders.Tests');

        expect(target.source).to.equal('argument');
        expect(target.label).to.equal('Orders.Tests');
        expect(target.projectPath).to.equal('C:/repo/tests/Orders.Tests/Orders.Tests.csproj');
        expect(target.documentPath).to.equal(undefined);
    });

    it('resolves a selected source file to a document-scoped context', () => {
        const target = resolveCSharpAIContextTarget(
            workspacePath,
            inspection,
            undefined,
            'C:/repo/src/Orders.Api/Controllers/OrdersController.cs'
        );

        expect(target.source).to.equal('selection');
        expect(target.projectPath).to.equal('C:/repo/src/Orders.Api/Orders.Api.csproj');
        expect(target.documentPath).to.equal('C:/repo/src/Orders.Api/Controllers/OrdersController.cs');
        expect(target.label).to.equal('Orders.Api: Controllers/OrdersController.cs');
    });

    it('allows a workspace-wide context argument', () => {
        const target = resolveCSharpAIContextTarget(workspacePath, inspection, 'workspace');

        expect(target.source).to.equal('argument');
        expect(target.projectPath).to.equal(undefined);
        expect(target.documentPath).to.equal(undefined);
        expect(target.label).to.equal('workspace');
    });

    it('resolves an explicit solution argument by relative path', () => {
        const target = resolveCSharpAIContextTarget(workspacePath, inspection, 'ApiOnly.slnf');

        expect(target.source).to.equal('argument');
        expect(target.solutionPath).to.equal('C:/repo/ApiOnly.slnf');
        expect(target.projectPath).to.equal(undefined);
        expect(target.label).to.equal('ApiOnly');
    });

    it('lists completion-safe context target arguments', () => {
        const options = listCSharpAIContextTargetOptions(workspacePath, inspection);

        expect(options.map(option => `${option.kind}:${option.arg}`)).to.deep.equal([
            'workspace:workspace',
            'solution:Orders.slnx',
            'solution:ApiOnly.slnf',
            'project:Orders.Api',
            'document:src/Orders.Api/Controllers/OrdersController.cs',
            'project:Orders.Tests'
        ]);
        expect(options.some(option => option.arg.includes('C:'))).to.equal(false);
    });
});
