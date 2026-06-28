import {
    IntentClassifierRequest,
    IntentClassifierResult,
    MemoryPromptIntent,
    PromptContextItem,
    PromptNormalizerRequest,
    PromptNormalizerResult,
    PromptSection
} from './memory-types';

const INTENT_PATTERNS: Array<{ intent: MemoryPromptIntent; signal: string; pattern: RegExp; confidence: number }> = [
    { intent: 'create_e2e_test', signal: 'e2e-test', pattern: /\b(e2e|end[-\s]?to[-\s]?end|playwright|cypress|teste\s+fim\s+a\s+fim|teste\s+end[-\s]?to[-\s]?end)\b/i, confidence: 0.9 },
    { intent: 'security_review', signal: 'security-review', pattern: /\b(security\s+review|revis[aã]o\s+de\s+seguran[cç]a|vulnerability|vulnerabilidade|threat|amea[cç]a|owasp|secret|segredo)\b/i, confidence: 0.89 },
    { intent: 'performance_review', signal: 'performance-review', pattern: /\b(performance\s+review|revis[aã]o\s+de\s+performance|perf|latency|lat[eê]ncia|slow|lento|bottleneck|gargalo|throughput)\b/i, confidence: 0.88 },
    { intent: 'review_pr', signal: 'pr-review', pattern: /\b(pull\s+request|merge\s+request|pr\s+review|review\s+pr|revisar\s+pr|revis[aã]o\s+de\s+pr)\b/i, confidence: 0.87 },
    { intent: 'create_endpoint', signal: 'endpoint', pattern: /\b(create|criar|add|adicionar|implement|implemente)\b[\s\S]{0,80}\b(endpoint|route|rota|controller|api)\b/i, confidence: 0.86 },
    { intent: 'update_config', signal: 'config', pattern: /\b(update|atualizar|change|alterar|set|configurar)\b[\s\S]{0,80}\b(config|configuration|settings|prefer[eê]ncias|env|yaml|json)\b/i, confidence: 0.85 },
    { intent: 'create_prompt', signal: 'prompt', pattern: /\b(create|criar|write|escrever|gerar|generate)\b[\s\S]{0,80}\b(prompt|system\s+prompt|instruction|instru[cç][aã]o)\b/i, confidence: 0.84 },
    { intent: 'create_prd', signal: 'prd', pattern: /\b(create|criar|write|escrever|gerar|generate)\b[\s\S]{0,80}\b(prd|product\s+requirements|requisitos\s+de\s+produto)\b/i, confidence: 0.84 },
    { intent: 'find_file', signal: 'find-file', pattern: /\b(find|locate|buscar|encontrar|procurar|abrir)\b[\s\S]{0,80}\b(file|arquivo|path|caminho)\b/i, confidence: 0.83 },
    { intent: 'create_unit_test', signal: 'test', pattern: /\b(test|teste|unit|xunit|nunit|mstest|mock)\b/i, confidence: 0.88 },
    { intent: 'map_architecture', signal: 'architecture', pattern: /\b(graph|grafo|architecture|arquitetura|map|mapear)\b/i, confidence: 0.78 },
    { intent: 'review_change', signal: 'review', pattern: /\b(review|revisar|pr|diff|impact|impacto)\b/i, confidence: 0.8 },
    { intent: 'fix_error', signal: 'fix-error', pattern: /\b(fix|corrigir|consertar|resolver)\b[\s\S]{0,80}\b(error|erro|bug|exception|falha|failure|failing)\b/i, confidence: 0.79 },
    { intent: 'debug_error', signal: 'debug', pattern: /\b(error|erro|bug|exception|falha|failing)\b/i, confidence: 0.76 },
    { intent: 'generate_doc', signal: 'docs', pattern: /\b(doc|document|readme|documentation)\b/i, confidence: 0.72 },
    { intent: 'refactor_code', signal: 'refactor', pattern: /\b(refactor|refatorar|refatore|restructure|reestruturar|extract\s+(method|class|function)|renomear|rename)\b/i, confidence: 0.71 },
    { intent: 'modify_code', signal: 'modify', pattern: /\b(implement|implemente|alter|change|modify|refactor|fix|corrigir)\b/i, confidence: 0.7 },
    { intent: 'explain_code', signal: 'explain', pattern: /\b(explain|explicar|why|como funciona|describe)\b/i, confidence: 0.68 }
];

export class IntentClassifier {

    classify(request: IntentClassifierRequest): IntentClassifierResult {
        const prompt = this.clean(request.prompt);
        const matched = INTENT_PATTERNS.filter(candidate => candidate.pattern.test(prompt));
        const best = matched.sort((left, right) => right.confidence - left.confidence || left.intent.localeCompare(right.intent))[0];
        return {
            intent: best?.intent ?? 'general',
            confidence: best?.confidence ?? 0.35,
            matchedSignals: matched.map(candidate => candidate.signal),
            languageHint: this.detectLanguage([...(request.context ?? [])])
        };
    }

    protected clean(value: string): string {
        return value.replace(/\r\n?/g, '\n').split('\n').map(line => line.trimEnd()).join('\n').trim();
    }

    protected detectLanguage(context: PromptContextItem[]): string {
        const joined = context.map(item => item.uri ?? '').join(' ').toLowerCase();
        if (joined.includes('.cs')) {
            return 'csharp';
        }
        if (joined.includes('.ts') || joined.includes('.tsx')) {
            return 'typescript';
        }
        if (joined.includes('.py')) {
            return 'python';
        }
        return 'unknown';
    }
}

export class PromptNormalizer {

    protected readonly intentClassifier = new IntentClassifier();

    normalize(request: PromptNormalizerRequest): PromptNormalizerResult {
        const warnings: string[] = [];
        const prompt = this.clean(request.prompt);
        const context = [...request.context ?? []].sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
        const sections: PromptSection[] = [{
            id: 'task',
            title: 'Task',
            content: prompt
        }];
        if (request.workspaceRoot) {
            sections.push({
                id: 'workspace',
                title: 'Workspace',
                content: request.workspaceRoot
            });
        }
        if (context.length) {
            sections.push({
                id: 'project-context',
                title: 'Project Context',
                content: context.map(item => this.formatContextItem(item)).join('\n\n')
            });
        }
        if (request.redactions?.length) {
            sections.push({
                id: 'redactions',
                title: 'Redactions',
                content: `${request.redactions.length} sensitive value${request.redactions.length === 1 ? '' : 's'} redacted before context packaging.`
            });
        }
        if (prompt.length === 0) {
            warnings.push('Prompt is empty after normalization.');
        }
        const normalizedPrompt = sections
            .map(section => `# ${section.title}\n${section.content}`)
            .join('\n\n');
        const classification = this.intentClassifier.classify({ prompt, context });
        const language = this.normalizeLanguage(classification.languageHint, prompt, context);
        const targetKind = this.detectTargetKind(prompt, context);
        const framework = this.detectFramework(prompt, context);
        const action = this.detectAction(prompt, classification.intent);
        return {
            normalizedPrompt,
            sections,
            redactionCount: request.redactions?.length ?? 0,
            warnings,
            signature: [classification.intent, language, targetKind, framework, action].join(':'),
            intent: classification.intent,
            language,
            targetKind,
            framework,
            action
        };
    }

    protected clean(value: string): string {
        return value.replace(/\r\n?/g, '\n').split('\n').map(line => line.trimEnd()).join('\n').trim();
    }

    protected formatContextItem(item: PromptContextItem): string {
        const source = item.uri ? ` ${item.uri}` : '';
        return `[${item.kind}${source}]\n${this.clean(item.content)}`;
    }

    protected normalizeLanguage(languageHint: string, prompt: string, context: readonly PromptContextItem[]): string {
        if (languageHint !== 'unknown') {
            return languageHint;
        }
        const joined = this.joinForDetection(prompt, context);
        const matches: Array<[string, RegExp]> = [
            ['csharp', /\b(c#|csharp|\.cs|dotnet|asp\.net|xunit|nunit|mstest)\b/i],
            ['typescript', /\b(typescript|tsx?|react|theia|\.tsx?|npm|yarn|pnpm)\b/i],
            ['python', /\b(python|pytest|django|fastapi|\.py)\b/i],
            ['java', /\b(java|spring|junit|maven|gradle|\.java)\b/i],
            ['go', /\b(golang|go test|\.go)\b/i],
            ['rust', /\b(rust|cargo|\.rs)\b/i],
            ['sql', /\b(sql|postgres|mysql|sqlite|dbcontext|database)\b/i]
        ];
        return matches.find(([, pattern]) => pattern.test(joined))?.[0] ?? 'unknown';
    }

    protected detectTargetKind(prompt: string, context: readonly PromptContextItem[]): string {
        const joined = this.joinForDetection(prompt, context);
        const matches: Array<[string, RegExp]> = [
            ['test', /\b(e2e|end[-\s]?to[-\s]?end|unit\s+test|testes?|tests?|spec|xunit|nunit|mstest|playwright|cypress)\b/i],
            ['endpoint', /\b(endpoint|route|rota|controller|api)\b/i],
            ['config', /\b(config|configuration|settings|prefer[eê]ncias|env|yaml|json)\b/i],
            ['prompt', /\b(prompt|system\s+prompt|instruction|instru[cç][aã]o)\b/i],
            ['prd', /\b(prd|product\s+requirements|requisitos\s+de\s+produto)\b/i],
            ['file', /\b(file|arquivo|path|caminho)\b/i],
            ['database', /\b(dbcontext|database|banco|entity|entidade|migration|schema)\b/i],
            ['security', /\b(security|seguran[cç]a|vulnerability|owasp|secret|segredo)\b/i],
            ['performance', /\b(performance|latency|lat[eê]ncia|slow|lento|throughput)\b/i],
            ['architecture', /\b(graph|grafo|architecture|arquitetura|dependency|depend[eê]ncia)\b/i],
            ['code', /\b(code|c[oó]digo|class|classe|function|fun[cç][aã]o|method|m[eé]todo)\b/i]
        ];
        return matches.find(([, pattern]) => pattern.test(joined))?.[0] ?? 'general';
    }

    protected detectFramework(prompt: string, context: readonly PromptContextItem[]): string {
        const joined = this.joinForDetection(prompt, context);
        const matches: Array<[string, RegExp]> = [
            ['aspnet', /\b(asp\.net|aspnet|minimal\s+api|controller|dbcontext|entity\s+framework|ef\s+core)\b/i],
            ['roslyn', /\b(roslyn|compilation|syntax\s+tree|semantic\s+model)\b/i],
            ['theia', /\b(theia|inversify|frontend-module|backend-module)\b/i],
            ['react', /\b(react|tsx|jsx|hook|component)\b/i],
            ['playwright', /\b(playwright)\b/i],
            ['cypress', /\b(cypress)\b/i],
            ['xunit', /\b(xunit)\b/i],
            ['nunit', /\b(nunit)\b/i],
            ['mstest', /\b(mstest)\b/i],
            ['django', /\b(django)\b/i],
            ['fastapi', /\b(fastapi)\b/i],
            ['spring', /\b(spring)\b/i]
        ];
        return matches.find(([, pattern]) => pattern.test(joined))?.[0] ?? 'none';
    }

    protected detectAction(prompt: string, intent: MemoryPromptIntent): string {
        const matches: Array<[string, RegExp]> = [
            ['review', /\b(review|revisar|revis[aã]o|audit|auditar)\b/i],
            ['create', /\b(create|criar|add|adicionar|generate|gerar|write|escrever)\b/i],
            ['update', /\b(update|atualizar|change|alterar|modify|modificar|set|configurar)\b/i],
            ['fix', /\b(fix|corrigir|consertar|resolver)\b/i],
            ['debug', /\b(debug|investigate|investigar|diagnos)\b/i],
            ['refactor', /\b(refactor|refatorar|extract|renomear|rename)\b/i],
            ['find', /\b(find|locate|buscar|encontrar|procurar|abrir)\b/i],
            ['explain', /\b(explain|explicar|describe|descrever|como funciona)\b/i],
            ['map', /\b(map|mapear|graph|grafo)\b/i]
        ];
        return matches.find(([, pattern]) => pattern.test(prompt))?.[0] ?? (intent.replace(/^[^_]+_?/, '') || 'general');
    }

    protected joinForDetection(prompt: string, context: readonly PromptContextItem[]): string {
        return [
            prompt,
            ...context.map(item => `${item.kind} ${item.uri ?? ''} ${item.content.slice(0, 500)}`)
        ].join('\n');
    }
}
