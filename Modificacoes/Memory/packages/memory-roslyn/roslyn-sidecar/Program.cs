// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.MSBuild;
using Microsoft.Build.Locator;

const int ContractVersion = 1;

var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    PropertyNameCaseInsensitive = true
};

try
{
    var input = await Console.In.ReadToEndAsync();
    var request = JsonSerializer.Deserialize<SidecarRequest>(input, jsonOptions);
    if (request is null)
    {
        WriteError("invalid_request", "Request body was empty or invalid JSON.");
        return 1;
    }
    if (request.SchemaVersion != ContractVersion)
    {
        WriteError("unsupported_schema", $"Unsupported schemaVersion {request.SchemaVersion}.", request.RequestId);
        return 1;
    }

    var analyzer = new RoslynAnalyzer(request);
    var analysis = await analyzer.AnalyzeAsync();
    Console.WriteLine(JsonSerializer.Serialize(new SidecarResponse(ContractVersion, request.RequestId, analysis.Result, analysis.Diagnostics), jsonOptions));
    return 0;
}
catch (Exception ex)
{
    WriteError("analysis_failed", ex.Message, detail: ex.ToString());
    return 1;
}

void WriteError(string code, string message, string? requestId = null, string? detail = null)
{
    Console.WriteLine(JsonSerializer.Serialize(
        new SidecarResponse(ContractVersion, requestId, null, null, new SidecarError(code, message, detail)),
        jsonOptions));
}

sealed class RoslynAnalyzer
{
    private const string AnalyzerId = SidecarConstants.AnalyzerId;

    private static readonly HashSet<string> PrimitiveTypes = new(StringComparer.Ordinal)
    {
        "string", "int", "long", "short", "byte", "bool", "double", "decimal", "float", "char", "object",
        "Guid", "DateTime", "DateOnly", "TimeSpan", "CancellationToken"
    };

    private static readonly HashSet<string> TestAttributes = new(StringComparer.Ordinal)
    {
        "Fact", "Theory", "Test", "TestCase", "TestMethod", "DataTestMethod"
    };

    private readonly SidecarRequest request;
    private readonly List<SymbolDto> symbols = [];
    private readonly List<RelationDto> relations = [];
    private readonly List<CallHintDto> callHints = [];
    private readonly List<DependencyHintDto> dependencyHints = [];
    private SemanticModel? semanticModel;
    private Compilation? compilation;

    public RoslynAnalyzer(SidecarRequest request)
    {
        this.request = request;
    }

    public async Task<SidecarAnalysis> AnalyzeAsync()
    {
        var semanticContext = await TryLoadSemanticContextAsync();
        semanticModel = semanticContext?.Model;
        compilation = semanticContext?.Compilation;
        var tree = semanticContext?.Tree ?? CSharpSyntaxTree.ParseText(request.Content ?? string.Empty);
        var root = tree.GetCompilationUnitRoot();
        var imports = root.Usings
            .Select(u => u.Name?.ToString())
            .Where(static name => !string.IsNullOrWhiteSpace(name))
            .Select(static name => name!)
            .Distinct(StringComparer.Ordinal)
            .Order(StringComparer.Ordinal)
            .ToArray();

        foreach (var member in root.Members)
        {
            VisitMember(member, null, null);
        }
        VisitTopLevelStatements(root);

        var result = new AnalysisResult(
                request.File.Id,
                "csharp",
                AnalyzerId,
                symbols,
                relations,
                imports,
                callHints,
                dependencyHints);
        return new SidecarAnalysis(result, [AnalysisModeDiagnostic(semanticContext)]);
    }

    private DiagnosticDto AnalysisModeDiagnostic(SemanticContext? semanticContext)
    {
        if (semanticContext?.Model is not null)
        {
            return new DiagnosticDto(
                "roslyn-semantic-mode",
                "info",
                "C# analysis is using Roslyn semantic mode with MSBuild workspace context.",
                request.File.RelativePath,
                semanticContext.WorkspaceFilePath);
        }
        return new DiagnosticDto(
            "roslyn-parse-only-mode",
            "info",
            "C# analysis is using Roslyn parse-only mode; no MSBuild project or semantic model was available.",
            request.File.RelativePath,
            ResolveWorkspaceFile());
    }

    private void VisitMember(MemberDeclarationSyntax member, string? parentSymbolId, string? parentFullName)
    {
        switch (member)
        {
            case BaseNamespaceDeclarationSyntax namespaceDeclaration:
                VisitNamespace(namespaceDeclaration, parentSymbolId);
                break;
            case BaseTypeDeclarationSyntax typeDeclaration:
                VisitType(typeDeclaration, parentSymbolId, parentFullName);
                break;
        }
    }

    private void VisitTopLevelStatements(CompilationUnitSyntax root)
    {
        var statements = root.Members.OfType<GlobalStatementSyntax>().ToArray();
        if (statements.Length == 0)
        {
            return;
        }

        var symbol = new SymbolDto(
            Id: SymbolId($"top-level:{request.File.RelativePath}"),
            FileId: request.File.Id,
            LanguageId: "csharp",
            SymbolKind: "method",
            Name: "<top-level-statements>",
            FullName: "<top-level-statements>",
            ParentSymbolId: null,
            Signature: "top-level statements",
            StartLine: Line(statements[0]),
            EndLine: EndLine(statements[^1]),
            Attributes: [],
            Modifiers: [],
            ReturnType: null,
            Metadata: new Dictionary<string, object?>
            {
                ["analyzer"] = AnalyzerId,
                ["analysisMode"] = semanticModel is null ? "syntax" : "msbuild-workspace"
            });
        symbols.Add(symbol);

        foreach (var statement in statements)
        {
            AddCalls(symbol.Id, statement);
        }
    }

    private async Task<SemanticContext?> TryLoadSemanticContextAsync()
    {
        var workspaceFile = ResolveWorkspaceFile();
        if (workspaceFile is null)
        {
            return null;
        }

        try
        {
            if (!MSBuildLocator.IsRegistered)
            {
                MSBuildLocator.RegisterDefaults();
            }

            using var workspace = MSBuildWorkspace.Create();
            var extension = Path.GetExtension(workspaceFile);
            Solution solution;
            if (extension.Equals(".sln", StringComparison.OrdinalIgnoreCase) || extension.Equals(".slnx", StringComparison.OrdinalIgnoreCase))
            {
                solution = await workspace.OpenSolutionAsync(workspaceFile);
            }
            else if (extension.Equals(".csproj", StringComparison.OrdinalIgnoreCase))
            {
                var project = await workspace.OpenProjectAsync(workspaceFile);
                solution = project.Solution;
            }
            else
            {
                return null;
            }

            var document = FindCurrentDocument(solution);
            if (document is null)
            {
                return null;
            }

            var tree = await document.GetSyntaxTreeAsync();
            var model = await document.GetSemanticModelAsync();
            var compilation = await document.Project.GetCompilationAsync();
            return tree is null ? null : new SemanticContext(tree, model, compilation, workspaceFile);
        }
        catch
        {
            return null;
        }
    }

    private string? ResolveWorkspaceFile()
    {
        if (!string.IsNullOrWhiteSpace(request.WorkspaceFilePath) && File.Exists(request.WorkspaceFilePath))
        {
            return Path.GetFullPath(request.WorkspaceFilePath);
        }

        var root = string.IsNullOrWhiteSpace(request.WorkspacePath) ? Directory.GetCurrentDirectory() : request.WorkspacePath;
        try
        {
            return Directory.EnumerateFiles(root, "*.*", SearchOption.AllDirectories)
                .Where(static file => Path.GetExtension(file).Equals(".sln", StringComparison.OrdinalIgnoreCase)
                    || Path.GetExtension(file).Equals(".slnx", StringComparison.OrdinalIgnoreCase)
                    || Path.GetExtension(file).Equals(".csproj", StringComparison.OrdinalIgnoreCase))
                .Where(static file => !file.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                    .Any(static segment => segment is ".git" or ".vs" or "bin" or "obj" or "node_modules" or "dist" or "build"))
                .OrderByDescending(static file => Path.GetExtension(file).Equals(".sln", StringComparison.OrdinalIgnoreCase) || Path.GetExtension(file).Equals(".slnx", StringComparison.OrdinalIgnoreCase) ? 10 : 5)
                .ThenBy(static file => file, StringComparer.Ordinal)
                .FirstOrDefault();
        }
        catch
        {
            return null;
        }
    }

    private Document? FindCurrentDocument(Solution solution)
    {
        var currentPath = Path.GetFullPath(Path.Combine(request.WorkspacePath, request.File.RelativePath));
        return solution.Projects
            .SelectMany(static project => project.Documents)
            .FirstOrDefault(document => document.FilePath is not null && Path.GetFullPath(document.FilePath).Equals(currentPath, StringComparison.OrdinalIgnoreCase));
    }

    private void VisitNamespace(BaseNamespaceDeclarationSyntax namespaceDeclaration, string? parentSymbolId)
    {
        var name = namespaceDeclaration.Name.ToString();
        var symbol = new SymbolDto(
            Id: SymbolId($"namespace:{name}"),
            FileId: request.File.Id,
            LanguageId: "csharp",
            SymbolKind: "namespace",
            Name: name,
            FullName: name,
            ParentSymbolId: parentSymbolId,
            Signature: $"namespace {name}",
            StartLine: Line(namespaceDeclaration.Name),
            EndLine: EndLine(namespaceDeclaration),
            Attributes: [],
            Modifiers: [],
            ReturnType: null,
            Metadata: new Dictionary<string, object?> { ["analyzer"] = AnalyzerId });
        symbols.Add(symbol);

        if (!string.IsNullOrEmpty(parentSymbolId))
        {
            relations.Add(Contains(parentSymbolId, symbol.Id, "declares namespace"));
        }

        foreach (var member in namespaceDeclaration.Members)
        {
            VisitMember(member, symbol.Id, name);
        }
    }

    private void VisitType(BaseTypeDeclarationSyntax typeDeclaration, string? parentSymbolId, string? parentFullName)
    {
        var name = typeDeclaration.Identifier.ValueText;
        if (string.IsNullOrWhiteSpace(name))
        {
            return;
        }

        var kind = TypeKind(typeDeclaration);
        var declaredType = semanticModel?.GetDeclaredSymbol(typeDeclaration);
        var fullName = string.IsNullOrEmpty(parentFullName) ? name : $"{parentFullName}.{name}";
        var baseTypes = typeDeclaration.BaseList?.Types.Select(BaseTypeName).ToArray() ?? [];
        var attributes = Attributes(typeDeclaration.AttributeLists);
        var routePrefix = RouteFromAttributes(typeDeclaration.AttributeLists);
        var filters = FilterAttributes(attributes);
        var isController = IsController(name, baseTypes, attributes);
        var isDbContext = IsDbContext(typeDeclaration, declaredType, baseTypes);
        var isEntityCandidate = typeDeclaration is TypeDeclarationSyntax entityType && IsEntityCandidate(entityType, attributes);
        var isTestClass = IsTestClass(name, attributes);
        var symbol = new SymbolDto(
            Id: SymbolId($"{kind}:{fullName}:{typeDeclaration.SpanStart}"),
            FileId: request.File.Id,
            LanguageId: "csharp",
            SymbolKind: kind,
            Name: name,
            FullName: fullName,
            ParentSymbolId: parentSymbolId,
            Signature: Signature(typeDeclaration),
            StartLine: Line(typeDeclaration.Identifier),
            EndLine: EndLine(typeDeclaration),
            Attributes: attributes,
            Modifiers: Modifiers(typeDeclaration.Modifiers),
            ReturnType: null,
            Metadata: new Dictionary<string, object?>
            {
                ["analyzer"] = AnalyzerId,
                ["analysisMode"] = semanticModel is null ? "syntax" : "msbuild-workspace",
                ["compilationAvailable"] = compilation is not null,
                ["semanticFullName"] = declaredType is null ? null : SymbolDisplay(declaredType),
                ["baseTypes"] = baseTypes,
                ["routePrefix"] = routePrefix ?? string.Empty,
                ["filters"] = filters,
                ["normalizedSymbolKind"] = NormalizedTypeKind(kind, isController, isDbContext, isEntityCandidate, isTestClass),
                ["isAspNetController"] = isController,
                ["isDbContext"] = isDbContext,
                ["isEfEntityCandidate"] = isEntityCandidate,
                ["isEntityCandidate"] = isEntityCandidate,
                ["isTestClass"] = isTestClass
            });
        symbols.Add(symbol);

        if (!string.IsNullOrEmpty(parentSymbolId))
        {
            relations.Add(Contains(parentSymbolId, symbol.Id, $"declares {kind}"));
        }
        AddTypeRelations(symbol.Id, declaredType);

        if (typeDeclaration is TypeDeclarationSyntax type)
        {
            foreach (var constructor in type.Members.OfType<ConstructorDeclarationSyntax>())
            {
                VisitConstructor(constructor, symbol);
            }
            foreach (var method in type.Members.OfType<MethodDeclarationSyntax>())
            {
                VisitMethod(method, symbol, name, baseTypes, attributes);
            }
            foreach (var property in type.Members.OfType<PropertyDeclarationSyntax>())
            {
                VisitProperty(property, symbol);
            }
            foreach (var field in type.Members.OfType<FieldDeclarationSyntax>())
            {
                VisitField(field, symbol);
            }
            foreach (var nestedType in type.Members.OfType<BaseTypeDeclarationSyntax>())
            {
                VisitType(nestedType, symbol.Id, fullName);
            }
        }
    }

    private void VisitConstructor(ConstructorDeclarationSyntax constructor, SymbolDto parent)
    {
        var symbol = MemberSymbol("constructor", constructor.Identifier.ValueText, constructor, parent, null, constructor.ParameterList.Parameters.Select(p => p.Type?.ToString()).Where(static value => !string.IsNullOrEmpty(value)).ToArray()!);
        AddDeclaredSymbolMetadata(symbol, semanticModel?.GetDeclaredSymbol(constructor));
        symbols.Add(symbol);
        relations.Add(Contains(parent.Id, symbol.Id, "declares constructor"));
        AddCalls(symbol.Id, constructor);

        foreach (var parameter in constructor.ParameterList.Parameters)
        {
            var resolvedType = ResolveType(parameter.Type);
            var typeName = resolvedType?.DisplayName ?? parameter.Type?.ToString();
            var parameterName = parameter.Identifier.ValueText;
            if (!string.IsNullOrWhiteSpace(typeName) && !PrimitiveTypes.Contains(ShortName(typeName)))
            {
                dependencyHints.Add(new DependencyHintDto(
                    parent.Id,
                    typeName,
                    symbol.Id,
                    parameterName,
                    $"{parent.Name} constructor parameter {parameterName}: {typeName}",
                    resolvedType?.SymbolId,
                    resolvedType?.SemanticFullName));
            }
        }
    }

    private void VisitMethod(MethodDeclarationSyntax method, SymbolDto parent, string typeName, string[] baseTypes, string[] typeAttributes)
    {
        var attributes = Attributes(method.AttributeLists);
        var routePrefix = parent.Metadata.TryGetValue("routePrefix", out var parentRoutePrefix) ? parentRoutePrefix as string : null;
        var parentFilters = parent.Metadata.TryGetValue("filters", out var parentFilterValue) && parentFilterValue is string[] parentFilterArray ? parentFilterArray : [];
        var endpoint = EndpointMetadata(typeName, baseTypes, typeAttributes, method.AttributeLists, attributes, method.ReturnType.ToString(), routePrefix);
        var isTest = IsTestMethod(typeAttributes, attributes);
        var kind = isTest ? "test_method" : endpoint is not null ? "endpoint" : "method";
        var metadata = new Dictionary<string, object?>
        {
            ["normalizedSymbolKind"] = isTest ? "test_method" : endpoint is not null ? "controller_action" : "method",
            ["parameters"] = method.ParameterList.Parameters.Select(p => p.Type?.ToString()).Where(static value => !string.IsNullOrEmpty(value)).ToArray(),
            ["parameterNames"] = method.ParameterList.Parameters.Select(p => p.Identifier.ValueText).Where(static value => !string.IsNullOrEmpty(value)).ToArray(),
            ["parameterBindings"] = method.ParameterList.Parameters.Select(ParameterBinding).ToArray(),
            ["filters"] = parentFilters.Concat(FilterAttributes(attributes)).Distinct(StringComparer.Ordinal).ToArray()
        };
        if (endpoint is not null)
        {
            metadata["httpMethods"] = endpoint.Methods;
            metadata["route"] = endpoint.Route ?? string.Empty;
            metadata["routePrefix"] = routePrefix ?? string.Empty;
            metadata["isAspNetAction"] = true;
        }
        var symbol = MemberSymbol(kind, method.Identifier.ValueText, method, parent, method.ReturnType.ToString(), metadata: metadata);
        var declaredMethod = semanticModel?.GetDeclaredSymbol(method);
        AddDeclaredSymbolMetadata(symbol, declaredMethod);
        symbols.Add(symbol);
        relations.Add(Contains(parent.Id, symbol.Id, $"declares {kind}"));
        AddOverrideRelation(symbol.Id, declaredMethod);
        AddCalls(symbol.Id, method);
        if (isTest)
        {
            AddTestTargetRelations(symbol.Id, method, parent);
        }
    }

    private void VisitProperty(PropertyDeclarationSyntax property, SymbolDto parent)
    {
        var attributes = Attributes(property.AttributeLists);
        var typeName = property.Type.ToString();
        var dbSetEntity = ResolveDbSetEntityType(property.Type);
        var metadata = new Dictionary<string, object?>
        {
            ["isDbSet"] = dbSetEntity is not null,
            ["efEntityType"] = dbSetEntity?.DisplayName,
            ["efEntitySymbolId"] = dbSetEntity?.SymbolId,
            ["efEntitySemanticFullName"] = dbSetEntity?.SemanticFullName,
            ["isEntityKey"] = attributes.Contains("Key", StringComparer.Ordinal) || property.Identifier.ValueText is "Id" || property.Identifier.ValueText == $"{parent.Name}Id"
        };
        var symbol = MemberSymbol("property", property.Identifier.ValueText, property, parent, typeName, metadata: metadata);
        AddDeclaredSymbolMetadata(symbol, semanticModel?.GetDeclaredSymbol(property));
        symbols.Add(symbol);
        relations.Add(Contains(parent.Id, symbol.Id, "declares property"));
        if (dbSetEntity is not null)
        {
            relations.Add(SemanticRelation(symbol.Id, dbSetEntity.SymbolId, "uses_entity", $"DbSet {symbol.Name} maps entity {dbSetEntity.DisplayName}"));
            if (parent.Metadata.TryGetValue("isDbContext", out var isDbContext) && isDbContext is true)
            {
                relations.Add(SemanticRelation(parent.Id, dbSetEntity.SymbolId, "uses_entity", $"DbContext {parent.Name} exposes DbSet {symbol.Name} for {dbSetEntity.DisplayName}"));
            }
        }
    }

    private void VisitField(FieldDeclarationSyntax field, SymbolDto parent)
    {
        var typeName = field.Declaration.Type.ToString();
        foreach (var variable in field.Declaration.Variables)
        {
            var symbol = MemberSymbol("field", variable.Identifier.ValueText, field, parent, typeName);
            AddDeclaredSymbolMetadata(symbol, semanticModel?.GetDeclaredSymbol(variable));
            symbols.Add(symbol);
            relations.Add(Contains(parent.Id, symbol.Id, "declares field"));
        }
    }

    private SymbolDto MemberSymbol(string kind, string name, MemberDeclarationSyntax member, SymbolDto parent, string? returnType, string[]? parameters = null, Dictionary<string, object?>? metadata = null)
    {
        metadata ??= [];
        metadata["analyzer"] = AnalyzerId;
        metadata["declaringType"] = parent.FullName;
        if (parameters is not null)
        {
            metadata["parameters"] = parameters;
        }

        return new SymbolDto(
            Id: SymbolId($"{kind}:{parent.FullName}.{name}:{member.SpanStart}"),
            FileId: request.File.Id,
            LanguageId: "csharp",
            SymbolKind: kind,
            Name: name,
            FullName: $"{parent.FullName}.{name}",
            ParentSymbolId: parent.Id,
            Signature: Signature(member),
            StartLine: Line(member),
            EndLine: EndLine(member),
            Attributes: Attributes(member.AttributeLists),
            Modifiers: Modifiers(member.Modifiers),
            ReturnType: returnType,
            Metadata: metadata);
    }

    private void AddCalls(string sourceSymbolId, SyntaxNode bodyOwner)
    {
        foreach (var invocation in bodyOwner.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            var targetName = InvocationTargetName(invocation);
            var methodSymbol = TryResolveInvocationTarget(invocation);
            if (methodSymbol is not null)
            {
                targetName = SymbolDisplay(methodSymbol);
                relations.Add(SemanticRelation(sourceSymbolId, SemanticTargetId(methodSymbol), "calls", $"calls {targetName}"));
                AddDependencyInjectionServiceHints(sourceSymbolId, methodSymbol, invocation);
            }
            if (!string.IsNullOrWhiteSpace(targetName))
            {
                callHints.Add(new CallHintDto(sourceSymbolId, targetName, $"{targetName}(...)"));
            }
        }
    }

    private void AddTestTargetRelations(string testSymbolId, MethodDeclarationSyntax method, SymbolDto parent)
    {
        var added = new HashSet<string>(StringComparer.Ordinal);
        foreach (var invocation in method.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            var methodSymbol = TryResolveInvocationTarget(invocation);
            if (methodSymbol is null || IsTestFrameworkSymbol(methodSymbol) || IsLocalTestHelper(methodSymbol, parent))
            {
                continue;
            }
            AddTestTargetRelation(testSymbolId, SemanticTargetId(methodSymbol), $"test invokes {SymbolDisplay(methodSymbol)}", added);
            if (methodSymbol.ContainingType is not null)
            {
                AddTestTargetRelation(testSymbolId, SemanticTargetId(methodSymbol.ContainingType), $"test invokes member of {SymbolDisplay(methodSymbol.ContainingType)}", added);
            }
        }

        if (semanticModel is not null)
        {
            foreach (var creation in method.DescendantNodes().OfType<ObjectCreationExpressionSyntax>())
            {
                if (semanticModel.GetTypeInfo(creation).Type is INamedTypeSymbol typeSymbol && !IsTestFrameworkSymbol(typeSymbol) && !IsLocalTestType(typeSymbol, parent))
                {
                    AddTestTargetRelation(testSymbolId, SemanticTargetId(typeSymbol), $"test creates {SymbolDisplay(typeSymbol)}", added);
                }
            }
        }

        if (added.Count == 0 && TryInferTestedTypeName(parent.Name) is { } inferredType)
        {
            var targetId = TryResolveTypeByShortName(inferredType) is { } resolvedType ? SemanticTargetId(resolvedType) : SymbolId($"class:{inferredType}");
            AddTestTargetRelation(testSymbolId, targetId, $"test fixture {parent.Name} matches {inferredType}", added, 0.72);
        }
    }

    private void AddTestTargetRelation(string testSymbolId, string targetId, string evidence, ISet<string> added, double confidenceScore = 0.88)
    {
        if (!added.Add(targetId) || targetId == testSymbolId)
        {
            return;
        }
        relations.Add(InferredRelation(testSymbolId, targetId, "tests", evidence, confidenceScore));
        relations.Add(InferredRelation(targetId, testSymbolId, "tested_by", evidence, confidenceScore));
    }

    private RelationDto InferredRelation(string sourceId, string targetId, string relationType, string evidence, double confidenceScore)
    {
        return new RelationDto(
            Id: RelationId($"{relationType}:{sourceId}:{targetId}"),
            SourceKind: "symbol",
            SourceId: sourceId,
            TargetKind: "symbol",
            TargetId: targetId,
            RelationType: relationType,
            ConfidenceLevel: "inferred",
            ConfidenceScore: confidenceScore,
            Evidence: evidence);
    }

    private static string? TryInferTestedTypeName(string testTypeName)
    {
        var match = System.Text.RegularExpressions.Regex.Match(testTypeName, "^(.+?)(?:Tests?|Specs?|Should)$");
        return match.Success && match.Groups[1].Value != testTypeName ? match.Groups[1].Value : null;
    }

    private static bool IsLocalTestHelper(IMethodSymbol methodSymbol, SymbolDto parent)
    {
        var parentName = ParentSemanticName(parent);
        var containingTypeName = SymbolDisplay(methodSymbol.ContainingType);
        return containingTypeName.Equals(parentName, StringComparison.Ordinal)
            || containingTypeName.StartsWith($"{parentName}.", StringComparison.Ordinal);
    }

    private static bool IsLocalTestType(INamedTypeSymbol typeSymbol, SymbolDto parent)
    {
        var parentName = ParentSemanticName(parent);
        var typeName = SymbolDisplay(typeSymbol);
        return typeName.Equals(parentName, StringComparison.Ordinal)
            || typeName.StartsWith($"{parentName}.", StringComparison.Ordinal);
    }

    private static string ParentSemanticName(SymbolDto parent)
    {
        return parent.Metadata.TryGetValue("semanticFullName", out var parentName) && parentName is string semanticName && !string.IsNullOrWhiteSpace(semanticName)
            ? semanticName
            : parent.FullName ?? parent.Name;
    }

    private INamedTypeSymbol? TryResolveTypeByShortName(string shortName)
    {
        if (compilation is null)
        {
            return null;
        }
        return FindTypeByShortName(compilation.GlobalNamespace, shortName);
    }

    private static INamedTypeSymbol? FindTypeByShortName(INamespaceOrTypeSymbol container, string shortName)
    {
        foreach (var member in container.GetMembers())
        {
            if (member is INamedTypeSymbol namedType)
            {
                if (namedType.Name.Equals(shortName, StringComparison.Ordinal))
                {
                    return namedType;
                }
                if (FindTypeByShortName(namedType, shortName) is { } nested)
                {
                    return nested;
                }
            }
            else if (member is INamespaceSymbol namespaceSymbol && FindTypeByShortName(namespaceSymbol, shortName) is { } namespaced)
            {
                return namespaced;
            }
        }
        return null;
    }

    private static bool IsTestFrameworkSymbol(ISymbol symbol)
    {
        var ns = symbol.ContainingNamespace?.ToDisplayString() ?? string.Empty;
        return ns.StartsWith("Xunit", StringComparison.Ordinal)
            || ns.StartsWith("NUnit.Framework", StringComparison.Ordinal)
            || ns.StartsWith("Microsoft.VisualStudio.TestTools.UnitTesting", StringComparison.Ordinal);
    }

    private void AddDependencyInjectionServiceHints(string sourceSymbolId, IMethodSymbol methodSymbol, InvocationExpressionSyntax invocation)
    {
        if (methodSymbol.Name is not ("AddScoped" or "AddTransient" or "AddSingleton"))
        {
            return;
        }
        if (!SymbolDisplay(methodSymbol.ContainingType).StartsWith("Microsoft.Extensions.DependencyInjection.", StringComparison.Ordinal))
        {
            return;
        }

        var typeArguments = methodSymbol.TypeArguments.OfType<INamedTypeSymbol>().ToArray();
        if (typeArguments.Length == 0)
        {
            return;
        }

        var serviceType = typeArguments[0];
        AddDependencyHint(sourceSymbolId, serviceType, null, null, $"{methodSymbol.Name} registers service {SymbolDisplay(serviceType)}");
        if (typeArguments.Length > 1)
        {
            AddDependencyHint(sourceSymbolId, typeArguments[1], null, null, $"{methodSymbol.Name} registers implementation {SymbolDisplay(typeArguments[1])} for {SymbolDisplay(serviceType)}");
        }

        foreach (var argument in invocation.ArgumentList.Arguments)
        {
            if (semanticModel?.GetTypeInfo(argument.Expression).ConvertedType is INamedTypeSymbol resolvedType)
            {
                AddDependencyHint(sourceSymbolId, resolvedType, null, null, $"{methodSymbol.Name} argument resolves {SymbolDisplay(resolvedType)}");
            }
        }
    }

    private void AddDependencyHint(string sourceSymbolId, INamedTypeSymbol typeSymbol, string? constructorSymbolId, string? parameterName, string evidence)
    {
        dependencyHints.Add(new DependencyHintDto(
            sourceSymbolId,
            SymbolDisplay(typeSymbol),
            constructorSymbolId,
            parameterName,
            evidence,
            SemanticTargetId(typeSymbol),
            SymbolDisplay(typeSymbol)));
    }

    private ResolvedTypeInfo? ResolveType(TypeSyntax? type)
    {
        if (type is null || semanticModel is null)
        {
            return null;
        }
        if (semanticModel.GetTypeInfo(type).Type is not INamedTypeSymbol typeSymbol)
        {
            return null;
        }
        var displayName = SymbolDisplay(typeSymbol);
        return new ResolvedTypeInfo(displayName, SemanticTargetId(typeSymbol), displayName);
    }

    private ResolvedTypeInfo? ResolveDbSetEntityType(TypeSyntax type)
    {
        if (semanticModel?.GetTypeInfo(type).Type is INamedTypeSymbol typeSymbol
            && IsDbSetType(typeSymbol)
            && typeSymbol.TypeArguments.FirstOrDefault() is INamedTypeSymbol entitySymbol)
        {
            var displayName = SymbolDisplay(entitySymbol);
            return new ResolvedTypeInfo(displayName, SemanticTargetId(entitySymbol), displayName);
        }

        var text = type.ToString();
        var match = System.Text.RegularExpressions.Regex.Match(text, @"(?:^|[.])DbSet\s*<\s*([^>]+)\s*>");
        if (!match.Success)
        {
            return null;
        }
        var entityName = match.Groups[1].Value.Trim();
        return new ResolvedTypeInfo(entityName, SymbolId($"entity:{entityName}"), entityName);
    }

    private static bool IsDbSetType(INamedTypeSymbol typeSymbol)
    {
        return typeSymbol.Name == "DbSet"
            && SymbolDisplay(typeSymbol).StartsWith("Microsoft.EntityFrameworkCore.DbSet<", StringComparison.Ordinal);
    }

    private bool IsDbContext(BaseTypeDeclarationSyntax typeDeclaration, INamedTypeSymbol? typeSymbol, string[] baseTypes)
    {
        if (typeSymbol is not null)
        {
            for (var current = typeSymbol.BaseType; current is not null; current = current.BaseType)
            {
                if (current.Name == "DbContext" && SymbolDisplay(current).StartsWith("Microsoft.EntityFrameworkCore.DbContext", StringComparison.Ordinal))
                {
                    return true;
                }
            }
        }
        return baseTypes.Any(baseType => ShortName(baseType) == "DbContext")
            || (typeDeclaration is TypeDeclarationSyntax type && type.Members.OfType<PropertyDeclarationSyntax>().Any(property => ResolveDbSetEntityType(property.Type) is not null));
    }

    private static bool IsEntityCandidate(TypeDeclarationSyntax typeDeclaration, string[] attributes)
    {
        return typeDeclaration is ClassDeclarationSyntax or RecordDeclarationSyntax
            && (attributes.Any(static attribute => attribute is "Table" or "Owned" or "Keyless")
                || typeDeclaration.Members.OfType<PropertyDeclarationSyntax>().Any(property =>
                {
                    var propertyAttributes = Attributes(property.AttributeLists);
                    var propertyName = property.Identifier.ValueText;
                    return propertyAttributes.Contains("Key", StringComparer.Ordinal)
                        || propertyName is "Id"
                        || propertyName == $"{typeDeclaration.Identifier.ValueText}Id";
                }));
    }

    private IMethodSymbol? TryResolveInvocationTarget(InvocationExpressionSyntax invocation)
    {
        if (semanticModel is null)
        {
            return null;
        }

        var symbolInfo = semanticModel.GetSymbolInfo(invocation);
        var methodSymbol = symbolInfo.Symbol as IMethodSymbol
            ?? symbolInfo.CandidateSymbols.OfType<IMethodSymbol>().FirstOrDefault();

        if (methodSymbol is null)
        {
            return null;
        }

        return methodSymbol.ReducedFrom ?? methodSymbol;
    }

    private static string? InvocationTargetName(InvocationExpressionSyntax invocation)
    {
        return invocation.Expression switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.ValueText,
            MemberAccessExpressionSyntax memberAccess => memberAccess.Name.Identifier.ValueText,
            _ => null
        };
    }

    private void AddTypeRelations(string sourceSymbolId, INamedTypeSymbol? typeSymbol)
    {
        if (typeSymbol is null)
        {
            return;
        }
        if (typeSymbol.BaseType is { SpecialType: not SpecialType.System_Object } baseType)
        {
            relations.Add(SemanticRelation(sourceSymbolId, SemanticTargetId(baseType), "inherits", $"{SymbolDisplay(typeSymbol)} inherits {SymbolDisplay(baseType)}"));
        }
        foreach (var interfaceType in typeSymbol.Interfaces)
        {
            relations.Add(SemanticRelation(sourceSymbolId, SemanticTargetId(interfaceType), "implements", $"{SymbolDisplay(typeSymbol)} implements {SymbolDisplay(interfaceType)}"));
        }
    }

    private void AddOverrideRelation(string sourceSymbolId, IMethodSymbol? methodSymbol)
    {
        if (methodSymbol?.OverriddenMethod is null)
        {
            return;
        }
        relations.Add(SemanticRelation(sourceSymbolId, SemanticTargetId(methodSymbol.OverriddenMethod), "overrides", $"{SymbolDisplay(methodSymbol)} overrides {SymbolDisplay(methodSymbol.OverriddenMethod)}"));
    }

    private static void AddDeclaredSymbolMetadata(SymbolDto symbol, ISymbol? declaredSymbol)
    {
        if (declaredSymbol is null)
        {
            return;
        }
        if (symbol.Metadata is IDictionary<string, object?> metadata)
        {
            metadata["semanticFullName"] = SymbolDisplay(declaredSymbol);
            metadata["semanticKind"] = declaredSymbol.Kind.ToString();
        }
    }

    private RelationDto Contains(string sourceId, string targetId, string evidence)
    {
        return new RelationDto(
            Id: RelationId($"contains:{sourceId}:{targetId}"),
            SourceKind: "symbol",
            SourceId: sourceId,
            TargetKind: "symbol",
            TargetId: targetId,
            RelationType: "contains",
            ConfidenceLevel: "extracted",
            ConfidenceScore: 0.98,
            Evidence: evidence);
    }

    private RelationDto SemanticRelation(string sourceId, string targetId, string relationType, string evidence)
    {
        return new RelationDto(
            Id: RelationId($"{relationType}:{sourceId}:{targetId}"),
            SourceKind: "symbol",
            SourceId: sourceId,
            TargetKind: "symbol",
            TargetId: targetId,
            RelationType: relationType,
            ConfidenceLevel: "extracted",
            ConfidenceScore: 0.99,
            Evidence: evidence);
    }

    private string SymbolId(string seed) => IdFromPath("symbol", $"{request.File.RelativePath}:{seed}");

    private string RelationId(string seed) => IdFromPath("rel", $"{request.File.RelativePath}:{seed}");

    private string SemanticTargetId(ISymbol symbol) => IdFromPath("symbol", $"semantic:{SymbolDisplay(symbol)}");

    private static string SymbolDisplay(ISymbol symbol)
    {
        return symbol.ToDisplayString(SymbolDisplayFormat.CSharpErrorMessageFormat);
    }

    private string IdFromPath(string prefix, string relativePath)
    {
        return $"{prefix}_{Fnv1A($"{WorkspaceKey(request.WorkspacePath)}:{relativePath}")}";
    }

    private static string WorkspaceKey(string workspacePath)
    {
        try
        {
            return Path.GetFullPath(string.IsNullOrWhiteSpace(workspacePath) ? "." : workspacePath).ToLowerInvariant();
        }
        catch
        {
            return (workspacePath ?? ".").ToLowerInvariant();
        }
    }

    private static string Fnv1A(string value)
    {
        unchecked
        {
            uint hash = 2166136261;
            foreach (var character in value)
            {
                hash ^= character;
                hash *= 16777619;
            }
            return hash.ToString("x");
        }
    }

    private static string TypeKind(BaseTypeDeclarationSyntax typeDeclaration)
    {
        return typeDeclaration switch
        {
            ClassDeclarationSyntax => "class",
            InterfaceDeclarationSyntax => "interface",
            RecordDeclarationSyntax => "record",
            StructDeclarationSyntax => "struct",
            EnumDeclarationSyntax => "enum",
            _ => "class"
        };
    }

    private static string[] Attributes(SyntaxList<AttributeListSyntax> attributeLists)
    {
        return attributeLists
            .SelectMany(list => list.Attributes)
            .Select(attribute => ShortName(attribute.Name.ToString()).Replace("Attribute", string.Empty, StringComparison.Ordinal))
            .Where(static name => !string.IsNullOrWhiteSpace(name))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }

    private static string[] Modifiers(SyntaxTokenList modifiers)
    {
        return modifiers.Select(static modifier => modifier.ValueText).Where(static text => !string.IsNullOrWhiteSpace(text)).ToArray();
    }

    private static string Signature(SyntaxNode node)
    {
        var text = node.ToString().Replace("\r", string.Empty, StringComparison.Ordinal);
        var line = text.Split('\n').FirstOrDefault() ?? text;
        var braceIndex = line.IndexOf('{', StringComparison.Ordinal);
        return (braceIndex >= 0 ? line[..braceIndex] : line).Trim();
    }

    private static int Line(SyntaxNode node) => node.GetLocation().GetLineSpan().StartLinePosition.Line + 1;

    private static int Line(SyntaxToken token) => token.GetLocation().GetLineSpan().StartLinePosition.Line + 1;

    private static int EndLine(SyntaxNode node) => node.GetLocation().GetLineSpan().EndLinePosition.Line + 1;

    private static string ShortName(string typeName)
    {
        var withoutNullable = typeName.Split('?')[0];
        var withoutGeneric = withoutNullable.Split('<')[0];
        return withoutGeneric.Split('.').Last().Trim();
    }

    private static bool IsController(string typeName, string[] baseTypes, string[] attributes)
    {
        return typeName.EndsWith("Controller", StringComparison.Ordinal)
            || attributes.Contains("ApiController", StringComparer.Ordinal)
            || baseTypes.Select(ShortName).Any(static baseType => baseType is "Controller" or "ControllerBase");
    }

    private static bool IsTestMethod(string[] typeAttributes, string[] methodAttributes)
    {
        return methodAttributes.Any(attribute => TestAttributes.Contains(ShortName(attribute)))
            || typeAttributes.Any(static attribute => attribute is "TestClass" or "TestFixture");
    }

    private static bool IsTestClass(string typeName, string[] attributes)
    {
        return attributes.Any(static attribute => attribute is "TestClass" or "TestFixture")
            || typeName.EndsWith("Test", StringComparison.Ordinal)
            || typeName.EndsWith("Tests", StringComparison.Ordinal)
            || typeName.EndsWith("Spec", StringComparison.Ordinal)
            || typeName.EndsWith("Specs", StringComparison.Ordinal);
    }

    private static string NormalizedTypeKind(string kind, bool isController, bool isDbContext, bool isEntityCandidate, bool isTestClass)
    {
        if (isController)
        {
            return "controller";
        }
        if (isDbContext)
        {
            return "db_context";
        }
        if (isEntityCandidate)
        {
            return "entity";
        }
        if (isTestClass)
        {
            return "test_class";
        }
        return kind;
    }

    private static EndpointMetadata? EndpointMetadata(string typeName, string[] baseTypes, string[] typeAttributes, SyntaxList<AttributeListSyntax> methodAttributeLists, string[] methodAttributes, string returnType, string? routePrefix)
    {
        var methods = methodAttributes
            .Where(static attribute => attribute.StartsWith("Http", StringComparison.Ordinal))
            .Select(static attribute => attribute[4..].ToUpperInvariant())
            .Where(static method => !string.IsNullOrWhiteSpace(method))
            .ToArray();
        var actionRoute = RouteFromAttributes(methodAttributeLists);
        var route = CombineRoutes(routePrefix, actionRoute);
        var actionReturn = returnType.Contains("IActionResult", StringComparison.Ordinal)
            || returnType.Contains("ActionResult", StringComparison.Ordinal)
            || returnType.Contains("IResult", StringComparison.Ordinal);
        if (methods.Length > 0 || (IsController(typeName, baseTypes, typeAttributes) && actionReturn))
        {
            return new EndpointMetadata(methods.Length > 0 ? methods : ["ANY"], route);
        }
        return null;
    }

    private static string? RouteFromAttributes(SyntaxList<AttributeListSyntax> attributeLists)
    {
        return attributeLists
            .SelectMany(static list => list.Attributes)
            .Where(static attribute =>
            {
                var name = ShortName(attribute.Name.ToString()).Replace("Attribute", string.Empty, StringComparison.Ordinal);
                return name == "Route" || name.StartsWith("Http", StringComparison.Ordinal);
            })
            .Select(static attribute => attribute.ArgumentList?.Arguments.FirstOrDefault()?.Expression switch
            {
                LiteralExpressionSyntax literal when literal.Token.ValueText.Length > 0 => literal.Token.ValueText,
                _ => null
            })
            .FirstOrDefault(static route => !string.IsNullOrWhiteSpace(route));
    }

    private static string? CombineRoutes(string? prefix, string? route)
    {
        if (string.IsNullOrWhiteSpace(prefix))
        {
            return route;
        }
        if (string.IsNullOrWhiteSpace(route))
        {
            return prefix;
        }
        if (route.StartsWith("/", StringComparison.Ordinal) || route.StartsWith("~/", StringComparison.Ordinal))
        {
            return route;
        }
        return $"{prefix.TrimEnd('/')}/{route.TrimStart('/')}";
    }

    private static string[] FilterAttributes(string[] attributes)
    {
        var nonFilters = new HashSet<string>(StringComparer.Ordinal)
        {
            "ApiController", "Route", "HttpGet", "HttpPost", "HttpPut", "HttpDelete", "HttpPatch", "HttpHead", "HttpOptions"
        };
        return attributes
            .Where(attribute => !nonFilters.Contains(attribute)
                && (attribute.EndsWith("Filter", StringComparison.Ordinal)
                    || attribute.EndsWith("Authorization", StringComparison.Ordinal)
                    || attribute is "Authorize" or "AllowAnonymous" or "ValidateAntiForgeryToken" or "AutoValidateAntiforgeryToken" or "IgnoreAntiforgeryToken" or "ServiceFilter" or "TypeFilter" or "MiddlewareFilter" or "ResponseCache" or "Produces" or "Consumes"))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }

    private static string ParameterBinding(ParameterSyntax parameter)
    {
        var binding = Attributes(parameter.AttributeLists)
            .FirstOrDefault(static attribute => attribute.StartsWith("From", StringComparison.Ordinal));
        return $"{parameter.Identifier.ValueText}:{(string.IsNullOrWhiteSpace(binding) ? "default" : binding)}";
    }

    private string BaseTypeName(BaseTypeSyntax baseType)
    {
        return semanticModel?.GetTypeInfo(baseType.Type).Type is { } typeSymbol
            ? SymbolDisplay(typeSymbol)
            : baseType.Type.ToString();
    }
}

sealed record SemanticContext(SyntaxTree Tree, SemanticModel? Model, Compilation? Compilation, string WorkspaceFilePath);

sealed record SidecarRequest(int SchemaVersion, string? RequestId, string LanguageId, string WorkspacePath, string? WorkspaceFilePath, FileDto File, string Content);

sealed record SidecarResponse(int SchemaVersion, string? RequestId, AnalysisResult? Result = null, IReadOnlyList<object>? Diagnostics = null, SidecarError? Error = null);

sealed record SidecarError(string Code, string Message, string? Detail = null);

sealed record SidecarAnalysis(AnalysisResult Result, IReadOnlyList<DiagnosticDto> Diagnostics);

sealed record DiagnosticDto(string Id, string Severity, string Message, string? Path = null, string? Detail = null);

sealed record FileDto(string Id, string RelativePath, string FileName, string? Extension, string? LanguageId, long SizeBytes, string ContentHash, bool IsIgnored, bool IsGenerated, bool IsBinary, bool IsSensitive);

sealed record AnalysisResult(
    string FileId,
    string LanguageId,
    string AnalyzerId,
    IReadOnlyList<SymbolDto> Symbols,
    IReadOnlyList<RelationDto> Relations,
    IReadOnlyList<string> Imports,
    IReadOnlyList<CallHintDto> CallHints,
    IReadOnlyList<DependencyHintDto> DependencyHints);

sealed record SymbolDto(
    string Id,
    string FileId,
    string LanguageId,
    string SymbolKind,
    string Name,
    string? FullName,
    string? ParentSymbolId,
    string? Signature,
    int? StartLine,
    int? EndLine,
    IReadOnlyList<string> Attributes,
    IReadOnlyList<string> Modifiers,
    string? ReturnType,
    IReadOnlyDictionary<string, object?> Metadata);

sealed record RelationDto(
    string Id,
    string SourceKind,
    string SourceId,
    string TargetKind,
    string TargetId,
    string RelationType,
    string ConfidenceLevel,
    double ConfidenceScore,
    string? Evidence);

sealed record CallHintDto(string SourceSymbolId, string TargetName, string? Evidence);

sealed record DependencyHintDto(string SourceSymbolId, string TargetTypeName, string? SourceConstructorSymbolId, string? ParameterName, string? Evidence, string? TargetSymbolId = null, string? TargetSemanticFullName = null);

sealed record ResolvedTypeInfo(string DisplayName, string SymbolId, string SemanticFullName);

sealed record EndpointMetadata(IReadOnlyList<string> Methods, string? Route = null);

static class SidecarConstants
{
    public const string AnalyzerId = "csharp-roslyn-sidecar";
}
