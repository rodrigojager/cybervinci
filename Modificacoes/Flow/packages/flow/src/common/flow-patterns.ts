import {
    FlowModelExecutionProfile,
    FlowProviderSelection,
    FlowWorkflow,
    FlowWorkflowState
} from './flow-types';
import { getFlowModelProfile } from './flow-model-profiles';

export type FlowPatternParameterType = 'string' | 'number' | 'boolean' | 'select' | 'model_profile' | 'reasoning_mode' | 'markdown';

export interface FlowPatternParameterOption {
    value: string | number | boolean;
    label: string;
    description?: string;
}

export interface FlowPatternParameter {
    id: string;
    label: string;
    type: FlowPatternParameterType;
    description?: string;
    defaultValue?: string | number | boolean;
    min?: number;
    max?: number;
    options?: FlowPatternParameterOption[];
}

export interface FlowWorkflowPattern {
    id: FlowWorkflowPatternId;
    name: string;
    description: string;
    category: 'routing' | 'verification' | 'generation' | 'competition' | 'loop' | 'parallel';
    parameters: FlowPatternParameter[];
    agenticStages?: FlowWorkflowPatternAgenticStage[];
    tags?: string[];
}

export interface FlowWorkflowPatternAgenticStage {
    id: string;
    label: string;
    role: string;
    profileParameterId?: string;
    description?: string;
    repeated?: boolean;
}

export type FlowWorkflowPatternId =
    | 'classify_and_act'
    | 'adversarial_verification'
    | 'generate_and_filter'
    | 'simple_tournament'
    | 'bounded_loop_until_done'
    | 'fanout_and_synthesize_fixed';

export interface FlowPatternRoleOverride {
    profileId?: string;
    provider?: FlowProviderSelection;
    modelExecution?: FlowModelExecutionProfile;
}

export interface FlowPatternCompileRequest {
    patternId: FlowWorkflowPatternId | string;
    workflowId?: string;
    name?: string;
    description?: string;
    parameters?: Record<string, unknown>;
    roleProfiles?: Record<string, string>;
    roleOverrides?: Record<string, FlowPatternRoleOverride>;
}

const MODEL_PROFILE_OPTIONS: FlowPatternParameterOption[] = [
    { value: 'inherit', label: 'Use chat selection' },
    { value: 'cheap', label: 'Cheap' },
    { value: 'fast', label: 'Fast' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'smart', label: 'Smart' },
    { value: 'critical_judge', label: 'Critical Judge' },
    { value: 'code_reviewer', label: 'Code Reviewer' },
    { value: 'json_extractor', label: 'JSON Extractor' }
];

const PATTERNS: FlowWorkflowPattern[] = [
    {
        id: 'classify_and_act',
        name: 'Classify And Act',
        description: 'Classify the request and route it to a lightweight or deep execution path.',
        category: 'routing',
        tags: ['claude-dynamic-workflows', 'routing'],
        agenticStages: [
            stage('classifier', 'Classifier', 'classifier', 'classifierProfile'),
            stage('simple_path', 'Simple executor', 'executor', 'simpleProfile'),
            stage('complex_path', 'Complex planner', 'planner', 'complexProfile')
        ],
        parameters: [
            modelProfileParameter('classifierProfile', 'Classifier profile', 'json_extractor'),
            modelProfileParameter('simpleProfile', 'Simple path profile', 'fast'),
            modelProfileParameter('complexProfile', 'Complex path profile', 'balanced')
        ]
    },
    {
        id: 'adversarial_verification',
        name: 'Adversarial Verification',
        description: 'Produce a draft, challenge it adversarially, revise, and verify before the final answer.',
        category: 'verification',
        tags: ['claude-dynamic-workflows', 'review'],
        agenticStages: [
            stage('draft_executor', 'Draft executor', 'executor', 'executorProfile'),
            stage('adversary', 'Adversary', 'critic', 'criticProfile'),
            stage('reviser', 'Reviser', 'repairer', 'reviserProfile'),
            stage('verifier', 'Verifier', 'verifier', 'verifierProfile'),
            stage('repair_loop', 'Repair loop', 'repairer', 'reviserProfile')
        ],
        parameters: [
            modelProfileParameter('executorProfile', 'Executor profile', 'balanced'),
            modelProfileParameter('criticProfile', 'Adversary profile', 'critical_judge'),
            modelProfileParameter('reviserProfile', 'Reviser profile', 'balanced'),
            modelProfileParameter('verifierProfile', 'Verifier profile', 'critical_judge'),
            { id: 'maxRepairLoops', label: 'Max repair loops', type: 'number', defaultValue: 2, min: 0, max: 5 }
        ]
    },
    {
        id: 'generate_and_filter',
        name: 'Generate And Filter',
        description: 'Generate several candidates in parallel, judge them, and synthesize the best final result.',
        category: 'generation',
        tags: ['claude-dynamic-workflows', 'alternatives'],
        agenticStages: [
            stage('candidate_generator', 'Candidate generators', 'candidate_generator', 'generatorProfile', true),
            stage('judge', 'Judge', 'judge', 'judgeProfile'),
            stage('synthesize', 'Synthesizer', 'synthesizer', 'synthesizerProfile')
        ],
        parameters: [
            { id: 'candidateCount', label: 'Candidate count', type: 'number', defaultValue: 3, min: 2, max: 8 },
            modelProfileParameter('generatorProfile', 'Generator profile', 'fast'),
            modelProfileParameter('judgeProfile', 'Judge profile', 'critical_judge'),
            modelProfileParameter('synthesizerProfile', 'Synthesizer profile', 'balanced'),
            { id: 'criteria', label: 'Criteria', type: 'markdown', defaultValue: 'Correctness, clarity, feasibility, and risk.' }
        ]
    },
    {
        id: 'simple_tournament',
        name: 'Simple Tournament',
        description: 'Run competing candidates and select a winner with a judge.',
        category: 'competition',
        tags: ['claude-dynamic-workflows', 'competition'],
        agenticStages: [
            stage('candidate_generator', 'Competitors', 'candidate_generator', 'competitorProfile', true),
            stage('bracket_judge', 'Judge', 'judge', 'judgeProfile'),
            stage('winner_synthesizer', 'Winner synthesizer', 'synthesizer', 'synthesizerProfile')
        ],
        parameters: [
            { id: 'competitorCount', label: 'Competitors', type: 'number', defaultValue: 3, min: 2, max: 8 },
            modelProfileParameter('competitorProfile', 'Competitor profile', 'fast'),
            modelProfileParameter('judgeProfile', 'Judge profile', 'critical_judge'),
            modelProfileParameter('synthesizerProfile', 'Winner synthesis profile', 'balanced'),
            { id: 'criteria', label: 'Criteria', type: 'markdown', defaultValue: 'Correctness, simplicity, maintainability, cost, and implementation risk.' }
        ]
    },
    {
        id: 'bounded_loop_until_done',
        name: 'Loop Until Done',
        description: 'Attempt, verify, repair, and stop when approved or when the budget is exhausted.',
        category: 'loop',
        tags: ['claude-dynamic-workflows', 'repair'],
        agenticStages: [
            stage('attempt', 'Attempt executor', 'executor', 'executorProfile'),
            stage('verifier', 'Verifier', 'verifier', 'verifierProfile'),
            stage('repairer', 'Repairer', 'repairer', 'repairerProfile')
        ],
        parameters: [
            modelProfileParameter('executorProfile', 'Executor profile', 'balanced'),
            modelProfileParameter('verifierProfile', 'Verifier profile', 'critical_judge'),
            modelProfileParameter('repairerProfile', 'Repairer profile', 'code_reviewer'),
            { id: 'maxIterations', label: 'Max iterations', type: 'number', defaultValue: 3, min: 1, max: 8 }
        ]
    },
    {
        id: 'fanout_and_synthesize_fixed',
        name: 'Fan-Out And Synthesize',
        description: 'Run fixed specialist branches in parallel and synthesize their outputs.',
        category: 'parallel',
        tags: ['claude-dynamic-workflows', 'parallel'],
        agenticStages: [
            stage('research_branch', 'Research branch', 'researcher', 'workerProfile'),
            stage('solution_branch', 'Solution branch', 'executor', 'workerProfile'),
            stage('risk_branch', 'Risk branch', 'critic', 'workerProfile'),
            stage('synthesize', 'Synthesizer', 'synthesizer', 'synthesizerProfile')
        ],
        parameters: [
            modelProfileParameter('workerProfile', 'Worker profile', 'fast'),
            modelProfileParameter('synthesizerProfile', 'Synthesizer profile', 'smart')
        ]
    }
];

export function listFlowWorkflowPatterns(): FlowWorkflowPattern[] {
    return clone(PATTERNS);
}

export function getFlowWorkflowPattern(id: FlowWorkflowPatternId | string): FlowWorkflowPattern | undefined {
    const pattern = PATTERNS.find(candidate => candidate.id === id);
    return pattern ? clone(pattern) : undefined;
}

export function compileFlowWorkflowPattern(request: FlowPatternCompileRequest): FlowWorkflow {
    switch (request.patternId) {
        case 'classify_and_act':
            return classifyAndActWorkflow(request);
        case 'adversarial_verification':
            return adversarialVerificationWorkflow(request);
        case 'generate_and_filter':
            return generateAndFilterWorkflow(request);
        case 'simple_tournament':
            return simpleTournamentWorkflow(request);
        case 'bounded_loop_until_done':
            return boundedLoopWorkflow(request);
        case 'fanout_and_synthesize_fixed':
            return fanoutAndSynthesizeWorkflow(request);
        default:
            throw new Error(`Unknown flow workflow pattern "${request.patternId}".`);
    }
}

function classifyAndActWorkflow(request: FlowPatternCompileRequest): FlowWorkflow {
    const id = workflowId(request, 'classify_and_act');
    return workflow(request, id, 'Classify And Act', {
        classifier: agent('classifier', 'classifier', ['routing/classification.json'], 'Classify the user request. Emit signal classification.path as simple or complex.', request, 'classifierProfile'),
        simple_path: agent('simple_path', 'executor', ['work/simple-answer.md'], 'Answer directly with a concise, complete result.', request, 'simpleProfile'),
        complex_path: agent('complex_path', 'planner', ['work/complex-plan.md'], 'Plan and execute a deeper answer for complex requests.', request, 'complexProfile'),
        final_report: report(['work/simple-answer.md', 'work/complex-plan.md'])
    }, [
        { id: 'classifier_to_simple', from: 'classifier', to: 'simple_path', on: 'workload.completed', priority: 100, guard: { 'signal.equals': { key: 'classification.path', value: 'simple' } } },
        { id: 'classifier_to_complex', from: 'classifier', to: 'complex_path', on: 'workload.completed', priority: 90, guard: { 'signal.equals': { key: 'classification.path', value: 'complex' } } },
        { id: 'classifier_to_complex_fallback', from: 'classifier', to: 'complex_path', on: 'workload.completed', priority: 1 },
        { id: 'simple_to_final', from: 'simple_path', to: 'final_report', on: 'workload.completed' },
        { id: 'complex_to_final', from: 'complex_path', to: 'final_report', on: 'workload.completed' }
    ]);
}

function adversarialVerificationWorkflow(request: FlowPatternCompileRequest): FlowWorkflow {
    const maxRepairLoops = numericParam(request, 'maxRepairLoops', 2, 0, 5);
    const id = workflowId(request, 'adversarial_verification');
    return workflow(request, id, 'Adversarial Verification', {
        draft_executor: agent('draft_executor', 'executor', ['draft/solution.md'], 'Create the best initial solution for the user request.', request, 'executorProfile'),
        adversary: agent('adversary', 'critic', ['review/adversarial-review.md'], 'Challenge the draft. Find errors, omissions, risks, and weak assumptions.', request, 'criticProfile'),
        reviser: agent('reviser', 'repairer', ['draft/revised-solution.md'], 'Revise the draft using the adversarial review without exposing internal reasoning.', request, 'reviserProfile'),
        verifier: agent('verifier', 'verifier', ['review/verification.json'], 'Verify the revised answer. Emit verification.status as passed or failed.', request, 'verifierProfile'),
        repair_loop: agent('repair_loop', 'repairer', ['draft/repair-notes.md'], 'Repair only the verifier failures and preserve correct parts.', request, 'reviserProfile'),
        final_report: report(['draft/revised-solution.md', 'review/verification.json']),
        followups: report(['draft/revised-solution.md', 'review/verification.json', 'draft/repair-notes.md'])
    }, [
        { id: 'draft_to_adversary', from: 'draft_executor', to: 'adversary', on: 'workload.completed' },
        { id: 'adversary_to_reviser', from: 'adversary', to: 'reviser', on: 'workload.completed' },
        { id: 'reviser_to_verifier', from: 'reviser', to: 'verifier', on: 'workload.completed' },
        { id: 'verifier_passed_to_final', from: 'verifier', to: 'final_report', on: 'workload.completed', priority: 100, guard: { 'signal.equals': { key: 'verification.status', value: 'passed' } } },
        { id: 'verifier_failed_to_repair', from: 'verifier', to: 'repair_loop', on: 'workload.completed', priority: 90, guard: { all: [{ 'signal.equals': { key: 'verification.status', value: 'failed' } }, { 'loop.lt': { counter: 'adversarial_repair', max: maxRepairLoops } }] } },
        { id: 'repair_to_verifier', from: 'repair_loop', to: 'verifier', on: 'workload.completed' },
        { id: 'verifier_failed_to_followups', from: 'verifier', to: 'followups', on: 'workload.completed', priority: 10, guard: { 'loop.gte': { counter: 'adversarial_repair', max: maxRepairLoops } } }
    ]);
}

function generateAndFilterWorkflow(request: FlowPatternCompileRequest): FlowWorkflow {
    const candidateCount = numericParam(request, 'candidateCount', 3, 2, 8);
    const criteria = stringParam(request, 'criteria', 'Correctness, clarity, feasibility, and risk.');
    const branches = numberedBranches('candidate', candidateCount, index => agent(
        `candidate_${index}`,
        'candidate_generator',
        [`candidates/candidate-${index}.md`],
        `Generate candidate ${index}. Optimize for these criteria: ${criteria}`,
        request,
        'generatorProfile'
    ));
    const waitFor = Object.keys(branches);
    const id = workflowId(request, 'generate_and_filter');
    return workflow(request, id, 'Generate And Filter', {
        generate_candidates: { type: 'parallel', waitFor, branches },
        judge: agent('judge', 'judge', ['judgment/ranking.json'], `Rank candidates using these criteria: ${criteria}. Emit judge.status as selected.`, request, 'judgeProfile'),
        synthesize: agent('synthesize', 'synthesizer', ['final/answer.md'], 'Synthesize the selected candidate into a final response.', request, 'synthesizerProfile'),
        final_report: report(['judgment/ranking.json', 'final/answer.md'])
    }, [
        { id: 'generate_to_join', from: 'generate_candidates', to: 'candidate_join', on: 'state.completed', guard: { 'branches.all_completed': waitFor } },
        { id: 'join_to_judge', from: 'candidate_join', to: 'judge', on: 'workload.completed' },
        { id: 'judge_to_synthesize', from: 'judge', to: 'synthesize', on: 'workload.completed' },
        { id: 'synthesize_to_final', from: 'synthesize', to: 'final_report', on: 'workload.completed' }
    ], {
        candidate_join: { type: 'join', waitFor, outputs: ['candidates/all-candidates.json'] }
    });
}

function simpleTournamentWorkflow(request: FlowPatternCompileRequest): FlowWorkflow {
    const competitorCount = numericParam(request, 'competitorCount', 3, 2, 8);
    const criteria = stringParam(request, 'criteria', 'Correctness, simplicity, maintainability, cost, and implementation risk.');
    const branches = numberedBranches('competitor', competitorCount, index => agent(
        `competitor_${index}`,
        'candidate_generator',
        [`tournament/competitor-${index}.md`],
        `Compete with a complete solution. Optimize for: ${criteria}`,
        request,
        'competitorProfile'
    ));
    const waitFor = Object.keys(branches);
    const id = workflowId(request, 'simple_tournament');
    return workflow(request, id, 'Simple Tournament', {
        competitors: { type: 'parallel', waitFor, branches },
        bracket_judge: agent('bracket_judge', 'judge', ['tournament/ranking.json'], `Choose the winner using: ${criteria}. Emit tournament.status as decided.`, request, 'judgeProfile'),
        winner_synthesizer: agent('winner_synthesizer', 'synthesizer', ['final/winner.md'], 'Turn the winning candidate into the final answer.', request, 'synthesizerProfile'),
        final_report: report(['tournament/ranking.json', 'final/winner.md'])
    }, [
        { id: 'competitors_to_join', from: 'competitors', to: 'competitor_join', on: 'state.completed', guard: { 'branches.all_completed': waitFor } },
        { id: 'join_to_judge', from: 'competitor_join', to: 'bracket_judge', on: 'workload.completed' },
        { id: 'judge_to_winner', from: 'bracket_judge', to: 'winner_synthesizer', on: 'workload.completed' },
        { id: 'winner_to_final', from: 'winner_synthesizer', to: 'final_report', on: 'workload.completed' }
    ], {
        competitor_join: { type: 'join', waitFor, outputs: ['tournament/all-competitors.json'] }
    });
}

function boundedLoopWorkflow(request: FlowPatternCompileRequest): FlowWorkflow {
    const maxIterations = numericParam(request, 'maxIterations', 3, 1, 8);
    const id = workflowId(request, 'bounded_loop_until_done');
    return workflow(request, id, 'Loop Until Done', {
        attempt: agent('attempt', 'executor', ['work/attempt.md'], 'Produce the best complete attempt for the user request.', request, 'executorProfile'),
        verifier: agent('verifier', 'verifier', ['review/status.json'], 'Verify the attempt. Emit loop.status as done or needs_repair.', request, 'verifierProfile'),
        repairer: agent('repairer', 'repairer', ['work/repair.md'], 'Repair only the verifier failures and keep the answer concise.', request, 'repairerProfile'),
        final_report: report(['work/attempt.md', 'review/status.json', 'work/repair.md']),
        followups: report(['work/attempt.md', 'review/status.json', 'work/repair.md'])
    }, [
        { id: 'attempt_to_verifier', from: 'attempt', to: 'verifier', on: 'workload.completed' },
        { id: 'verifier_done_to_final', from: 'verifier', to: 'final_report', on: 'workload.completed', priority: 100, guard: { 'signal.equals': { key: 'loop.status', value: 'done' } } },
        { id: 'verifier_repair_to_repairer', from: 'verifier', to: 'repairer', on: 'workload.completed', priority: 90, guard: { all: [{ 'signal.equals': { key: 'loop.status', value: 'needs_repair' } }, { 'loop.lt': { counter: 'repair_iteration', max: maxIterations } }] } },
        { id: 'repairer_to_verifier', from: 'repairer', to: 'verifier', on: 'workload.completed' },
        { id: 'verifier_budget_to_followups', from: 'verifier', to: 'followups', on: 'workload.completed', priority: 10, guard: { 'loop.gte': { counter: 'repair_iteration', max: maxIterations } } }
    ]);
}

function fanoutAndSynthesizeWorkflow(request: FlowPatternCompileRequest): FlowWorkflow {
    const branches: Record<string, FlowWorkflowState> = {
        research_branch: agent('research_branch', 'researcher', ['parallel/research.md'], 'Investigate relevant context, constraints, and prior art.', request, 'workerProfile'),
        solution_branch: agent('solution_branch', 'executor', ['parallel/solution.md'], 'Develop the main answer or implementation approach.', request, 'workerProfile'),
        risk_branch: agent('risk_branch', 'critic', ['parallel/risks.md'], 'Identify practical risks, missing assumptions, and verification needs.', request, 'workerProfile')
    };
    const waitFor = Object.keys(branches);
    const id = workflowId(request, 'fanout_and_synthesize_fixed');
    return workflow(request, id, 'Fan-Out And Synthesize', {
        fanout: { type: 'parallel', waitFor, branches },
        synthesize: agent('synthesize', 'synthesizer', ['final/synthesis.md'], 'Synthesize all branch outputs into one final result.', request, 'synthesizerProfile'),
        final_report: report(['parallel/research.md', 'parallel/solution.md', 'parallel/risks.md', 'final/synthesis.md'])
    }, [
        { id: 'fanout_to_join', from: 'fanout', to: 'fanout_join', on: 'state.completed', guard: { 'branches.all_completed': waitFor } },
        { id: 'join_to_synthesize', from: 'fanout_join', to: 'synthesize', on: 'workload.completed' },
        { id: 'synthesize_to_final', from: 'synthesize', to: 'final_report', on: 'workload.completed' }
    ], {
        fanout_join: { type: 'join', waitFor, outputs: ['parallel/all-results.json'] }
    });
}

function workflow(
    request: FlowPatternCompileRequest,
    id: string,
    fallbackName: string,
    states: Record<string, FlowWorkflowState>,
    transitions: FlowWorkflow['transitions'],
    extraStates: Record<string, FlowWorkflowState> = {}
): FlowWorkflow {
    const workflowStates: Record<string, FlowWorkflowState> = {
        input: { type: 'input', outputs: ['input/request.md'] },
        ...states,
        ...extraStates
    };
    const firstNonInput = Object.keys(workflowStates).find(stateId => stateId !== 'input');
    const workflowTransitions = firstNonInput
        ? [{ id: `input_to_${firstNonInput}`, from: 'input', to: firstNonInput, on: 'run.started' }, ...transitions]
        : transitions;
    return {
        version: 'flow.workflow/v1',
        id,
        name: request.name || fallbackName,
        description: request.description || `Generated from Flow pattern ${request.patternId}.`,
        templateId: `pattern:${request.patternId}`,
        templateVersion: 'flow.pattern/v1',
        agents: collectAgents(workflowStates),
        requires: { capabilities: ['llm.agent.execute'] },
        states: applyConservativeOutcomeRoutes(workflowStates, workflowTransitions),
        transitions: workflowTransitions
    };
}

function applyConservativeOutcomeRoutes(
    states: Record<string, FlowWorkflowState>,
    transitions: FlowWorkflow['transitions']
): Record<string, FlowWorkflowState> {
    const next: Record<string, FlowWorkflowState> = { ...states };
    const transitionsBySource = new Map<string, FlowWorkflow['transitions']>();
    for (const transition of transitions) {
        transitionsBySource.set(transition.from, [...(transitionsBySource.get(transition.from) || []), transition]);
    }
    for (const [stateId, stateTransitions] of transitionsBySource) {
        const state = next[stateId];
        if (!state || stateTransitions.length !== 1) {
            continue;
        }
        const [transition] = stateTransitions;
        const canRoute = !transition.guard
            || transition.on === 'run.started'
            || transition.on === 'gate.approved'
            || transition.on === 'state.completed';
        if (!canRoute || state.outcomes?.success || state.outcomes?.approved) {
            continue;
        }
        const outcome = transition.on === 'gate.approved' ? 'approved' : 'success';
        next[stateId] = {
            ...state,
            outcomes: {
                ...(state.outcomes || {}),
                [outcome]: transition.to
            }
        };
    }
    return next;
}

function agent(
    id: string,
    role: string,
    outputs: string[],
    taskPrompt: string,
    request: FlowPatternCompileRequest,
    profileParameterId: string
): FlowWorkflowState {
    const override = request.roleOverrides?.[role] || request.roleOverrides?.[id];
    const defaultProfileId = roleProfileId(request, role, profileParameterId);
    const profileId = override?.modelExecution?.profileId || override?.profileId || defaultProfileId;
    const modelProfile = getFlowModelProfile(profileId);
    return compact({
        type: 'agent',
        agent: role,
        agentRole: role,
        provider: override?.provider || modelProfile?.provider,
        modelExecution: {
            ...(modelProfile?.execution || {}),
            ...override?.modelExecution,
            profileId
        },
        systemPrompt: roleSystemPrompt(role),
        taskPrompt,
        outputs
    });
}

function report(includes: string[]): FlowWorkflowState {
    return { type: 'report', input: { include: includes }, outputs: ['final/report.md'] };
}

function roleProfileId(request: FlowPatternCompileRequest, role: string, profileParameterId: string): string {
    const parameterValue = request.parameters?.[profileParameterId];
    if (typeof parameterValue === 'string' && parameterValue.trim()) {
        return parameterValue.trim();
    }
    const override = request.roleOverrides?.[role];
    if (override?.profileId) {
        return override.profileId;
    }
    const roleProfile = request.roleProfiles?.[role];
    if (roleProfile) {
        return roleProfile;
    }
    const pattern = getFlowWorkflowPattern(request.patternId);
    const parameter = pattern?.parameters.find(candidate => candidate.id === profileParameterId);
    return typeof parameter?.defaultValue === 'string' ? parameter.defaultValue : 'inherit';
}

function collectAgents(states: Record<string, FlowWorkflowState>): Record<string, string> {
    const agents: Record<string, string> = {};
    const visit = (state: FlowWorkflowState): void => {
        if (state.agent) {
            agents[state.agent] = `agents/patterns/${state.agent}.md`;
        }
        Object.values(state.branches || {}).forEach(visit);
        if (state.dynamicParallel?.worker) {
            visit(state.dynamicParallel.worker);
        }
        if (state.tournament?.judge) {
            visit(state.tournament.judge);
        }
    };
    Object.values(states).forEach(visit);
    return agents;
}

function numberedBranches(prefix: string, count: number, create: (index: number) => FlowWorkflowState): Record<string, FlowWorkflowState> {
    const branches: Record<string, FlowWorkflowState> = {};
    for (let index = 1; index <= count; index++) {
        branches[`${prefix}_${index}`] = create(index);
    }
    return branches;
}

function workflowId(request: FlowPatternCompileRequest, fallback: string): string {
    return sanitizeId(request.workflowId || fallback);
}

function numericParam(request: FlowPatternCompileRequest, id: string, fallback: number, min: number, max: number): number {
    const raw = request.parameters?.[id];
    const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : fallback;
    if (!Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(min, Math.min(max, Math.round(value)));
}

function stringParam(request: FlowPatternCompileRequest, id: string, fallback: string): string {
    const raw = request.parameters?.[id];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
}

function modelProfileParameter(id: string, label: string, defaultValue: string): FlowPatternParameter {
    return {
        id,
        label,
        type: 'model_profile',
        defaultValue,
        options: MODEL_PROFILE_OPTIONS
    };
}

function stage(
    id: string,
    label: string,
    role: string,
    profileParameterId?: string,
    repeated?: boolean
): FlowWorkflowPatternAgenticStage {
    return { id, label, role, profileParameterId, repeated };
}

function roleSystemPrompt(role: string): string {
    return [
        `You are the ${role.replace(/_/g, ' ')} step in a CyberVinci Flow workflow.`,
        'Execute only this step. Do not control workflow transitions, scheduling, gates, or orchestration.',
        'Return the workload output envelope requested by Flow.'
    ].join('\n');
}

function sanitizeId(value: string): string {
    return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'flow_pattern';
}

function compact<T extends Record<string, unknown>>(value: T): T {
    const compacted: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        if (entry === undefined || entry === '') {
            continue;
        }
        if (Array.isArray(entry) && entry.length === 0) {
            continue;
        }
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
            const nested = compact(entry as Record<string, unknown>);
            if (Object.keys(nested).length === 0) {
                continue;
            }
            compacted[key] = nested;
            continue;
        }
        compacted[key] = entry;
    }
    return compacted as T;
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}
