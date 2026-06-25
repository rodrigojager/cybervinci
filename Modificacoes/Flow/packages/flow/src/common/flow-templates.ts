import { FlowWorkflow } from './flow-types';

export type FlowWorkflowTemplateId =
    | 'simple_specialist'
    | 'linear_chain'
    | 'review_loop'
    | 'contracted_parallel_delivery'
    | 'content_factory'
    | 'conditional_contract'
    | 'human_approval_gate'
    | 'memory_consolidation';

export interface FlowWorkflowTemplate {
    id: FlowWorkflowTemplateId;
    name: string;
    description: string;
    workflow: FlowWorkflow;
}

export interface InstantiateFlowWorkflowTemplateOptions {
    id: string;
    name: string;
    description?: string;
}

const WORKFLOW_VERSION = 'flow.workflow/v1';

const TEMPLATES: FlowWorkflowTemplate[] = [
    {
        id: 'simple_specialist',
        name: 'Simple Specialist',
        description: 'A single specialist turns the request into a final report.',
        workflow: {
            version: WORKFLOW_VERSION,
            id: 'template_simple_specialist',
            name: 'Simple Specialist',
            description: 'input -> specialist -> final_report',
            agents: {
                specialist: 'agents/specialist.md'
            },
            requires: {
                capabilities: ['llm.agent.execute', 'filesystem.artifacts']
            },
            states: {
                input: {
                    type: 'input',
                    outputs: ['input/request.md']
                },
                specialist: {
                    type: 'agent',
                    agent: 'specialist',
                    input: { include: ['input/request.md'] },
                    outputs: ['reports/report.md', 'reports/result.json'],
                    signals: [{ key: 'specialist.status', value: 'completed' }],
                    effects: [{ kind: 'notification', summary: 'Specialist report is ready.' }]
                },
                final_report: {
                    type: 'report',
                    input: { include: ['reports/report.md', 'reports/result.json'] },
                    outputs: ['final/report.md']
                }
            },
            transitions: [
                { id: 'input_to_specialist', from: 'input', to: 'specialist', on: 'run.started' },
                { id: 'specialist_to_final_report', from: 'specialist', to: 'final_report', on: 'workload.completed', guard: { 'artifact.exists': 'reports/report.md' } }
            ]
        }
    },
    {
        id: 'linear_chain',
        name: 'Linear Chain',
        description: 'Research, writing, and editing happen in a strict dependency chain.',
        workflow: {
            version: WORKFLOW_VERSION,
            id: 'template_linear_chain',
            name: 'Linear Chain',
            description: 'input -> researcher -> writer -> editor -> final_report',
            agents: {
                researcher: 'agents/researcher.md',
                writer: 'agents/writer.md',
                editor: 'agents/editor.md'
            },
            requires: {
                capabilities: ['llm.agent.execute', 'filesystem.artifacts']
            },
            states: {
                input: {
                    type: 'input',
                    outputs: ['input/request.md']
                },
                researcher: {
                    type: 'agent',
                    agent: 'researcher',
                    input: { include: ['input/request.md'] },
                    outputs: ['research/brief.md', 'research/sources.json']
                },
                writer: {
                    type: 'agent',
                    agent: 'writer',
                    input: { include: ['research/brief.md', 'research/sources.json'] },
                    outputs: ['drafts/article.md']
                },
                editor: {
                    type: 'agent',
                    agent: 'editor',
                    input: { include: ['drafts/article.md'] },
                    outputs: ['final/edited-report.md'],
                    signals: [{ key: 'editor.status', value: 'completed' }]
                },
                final_report: {
                    type: 'report',
                    input: { include: ['final/edited-report.md'] },
                    outputs: ['final/report.md']
                }
            },
            transitions: [
                { id: 'input_to_researcher', from: 'input', to: 'researcher', on: 'run.started' },
                { id: 'researcher_to_writer', from: 'researcher', to: 'writer', on: 'workload.completed', guard: { 'artifact.exists': 'research/brief.md' } },
                { id: 'writer_to_editor', from: 'writer', to: 'editor', on: 'workload.completed', guard: { 'artifact.exists': 'drafts/article.md' } },
                { id: 'editor_to_final_report', from: 'editor', to: 'final_report', on: 'workload.completed', guard: { 'artifact.exists': 'final/edited-report.md' } }
            ]
        }
    },
    {
        id: 'review_loop',
        name: 'Review Loop',
        description: 'A maker/reviewer loop repairs failed review results up to a bounded limit.',
        workflow: {
            version: WORKFLOW_VERSION,
            id: 'template_review_loop',
            name: 'Review Loop',
            description: 'input -> maker -> reviewer -> repair? -> reviewer -> final_report',
            agents: {
                maker: 'agents/maker.md',
                reviewer: 'agents/reviewer.md',
                repairer: 'agents/repairer.md'
            },
            requires: {
                capabilities: ['llm.agent.execute', 'filesystem.artifacts']
            },
            states: {
                input: {
                    type: 'input',
                    outputs: ['input/request.md']
                },
                maker: {
                    type: 'agent',
                    agent: 'maker',
                    input: { include: ['input/request.md'] },
                    outputs: ['work/draft.md']
                },
                reviewer: {
                    type: 'agent',
                    agent: 'reviewer',
                    input: { include: ['work/draft.md'], signals: ['repair.attempt'] },
                    outputs: ['review/review.md'],
                    signals: [
                        { key: 'review.status', value: 'passed' },
                        { key: 'review.status', value: 'failed' }
                    ]
                },
                repair: {
                    type: 'agent',
                    agent: 'repairer',
                    input: { include: ['work/draft.md', 'review/review.md'] },
                    outputs: ['work/draft.md'],
                    retry: { max: 2, counter: 'repair' },
                    signals: [{ key: 'repair.attempt', value: 1 }]
                },
                final_report: {
                    type: 'report',
                    input: { include: ['work/draft.md', 'review/review.md'] },
                    outputs: ['final/report.md']
                },
                final_report_with_followups: {
                    type: 'report',
                    input: { include: ['work/draft.md', 'review/review.md'] },
                    outputs: ['final/report-with-followups.md']
                }
            },
            transitions: [
                { id: 'input_to_maker', from: 'input', to: 'maker', on: 'run.started' },
                { id: 'maker_to_reviewer', from: 'maker', to: 'reviewer', on: 'workload.completed', guard: { 'artifact.exists': 'work/draft.md' } },
                { id: 'reviewer_passed_to_final_report', from: 'reviewer', to: 'final_report', on: 'workload.completed', priority: 30, guard: { 'signal.equals': { key: 'review.status', value: 'passed' } } },
                { id: 'reviewer_failed_to_repair', from: 'reviewer', to: 'repair', on: 'workload.completed', priority: 20, guard: { all: [{ 'signal.equals': { key: 'review.status', value: 'failed' } }, { 'loop.lt': { counter: 'repair', max: 2 } }] } },
                { id: 'repair_to_reviewer', from: 'repair', to: 'reviewer', on: 'workload.completed', guard: { 'artifact.exists': 'work/draft.md' } },
                { id: 'reviewer_failed_to_followups', from: 'reviewer', to: 'final_report_with_followups', on: 'workload.completed', priority: 10, guard: { all: [{ 'signal.equals': { key: 'review.status', value: 'failed' } }, { 'loop.gte': { counter: 'repair', max: 2 } }] } }
            ]
        }
    },
    {
        id: 'contracted_parallel_delivery',
        name: 'Contracted Parallel Delivery',
        description: 'A contract package freezes shared expectations before parallel delivery and QA.',
            workflow: {
                version: WORKFLOW_VERSION,
                id: 'template_contracted_parallel_delivery',
                name: 'Contracted Parallel Delivery',
            description: 'input -> architecture -> contract_design -> contract_gate -> parallel delivery -> join -> qa -> final_report',
            agents: {
                architect: 'agents/solution-architect.md',
                contract_designer: 'agents/contract-designer.md',
                backend: 'agents/backend-specialist.md',
                frontend: 'agents/frontend-specialist.md',
                designer: 'agents/designer.md',
                qa: 'agents/qa-specialist.md',
                repairer: 'agents/repairer.md'
            },
            requires: {
                capabilities: [
                    'llm.agent.execute',
                    'memory.context',
                    'human.approval',
                    'filesystem.edit',
                    'image.generate',
                    'filesystem.artifacts'
                ]
            },
            states: {
                input: {
                    type: 'input',
                    outputs: ['input/request.md']
                },
                architecture: {
                    type: 'agent',
                    agent: 'architect',
                    input: { include: ['input/request.md'] },
                    outputs: ['architecture/plan.md']
                },
                contract_design: {
                    type: 'agent',
                    agent: 'contract_designer',
                    input: { include: ['input/request.md', 'architecture/plan.md'] },
                    outputs: [
                        'contracts/shared.md',
                        'contracts/contracts.json',
                        'contracts/work-orders/backend.md',
                        'contracts/work-orders/frontend.md',
                        'contracts/work-orders/designer.md',
                        'contracts/work-orders/qa.md',
                        'schemas/api.json',
                        'schemas/assets.json'
                    ],
                    signals: [{ key: 'contract.status', value: 'ready' }]
                },
                contract_gate: {
                    type: 'gate',
                    input: { include: ['contracts/shared.md', 'contracts/contracts.json'] },
                    gates: [{
                        id: 'contract_approval',
                        title: 'Approve delivery contract',
                        prompt: 'Approve the frozen shared contract before parallel delivery starts.'
                    }]
                },
                parallel_delivery: {
                    type: 'parallel',
                    waitFor: ['backend_work', 'frontend_work', 'designer_work'],
                    branches: {
                        backend_work: {
                            type: 'agent',
                            agent: 'backend',
                            input: { include: ['contracts/shared.md', 'contracts/contracts.json', 'contracts/work-orders/backend.md'] },
                            outputs: ['delivery/backend.md', 'issues/backend.json']
                        },
                        frontend_work: {
                            type: 'agent',
                            agent: 'frontend',
                            input: { include: ['contracts/shared.md', 'contracts/contracts.json', 'contracts/work-orders/frontend.md'] },
                            outputs: ['delivery/frontend.md', 'issues/frontend.json']
                        },
                        designer_work: {
                            type: 'agent',
                            agent: 'designer',
                            input: { include: ['contracts/shared.md', 'contracts/contracts.json', 'contracts/work-orders/designer.md'] },
                            outputs: ['delivery/design-assets.md', 'issues/designer.json', 'public/assets/login-hero.png']
                        }
                    },
                    signals: [{ key: 'delivery.parallel.status', value: 'completed' }]
                },
                delivery_join: {
                    type: 'join',
                    waitFor: ['backend_work', 'frontend_work', 'designer_work'],
                    input: { include: ['delivery/backend.md', 'delivery/frontend.md', 'delivery/design-assets.md'] },
                    outputs: ['delivery/join-summary.md']
                },
                qa: {
                    type: 'agent',
                    agent: 'qa',
                    input: { include: ['delivery/join-summary.md', 'contracts/contracts.json', 'contracts/work-orders/qa.md'] },
                    outputs: ['qa/report.md'],
                    signals: [
                        { key: 'qa.status', value: 'passed' },
                        { key: 'qa.status', value: 'failed' }
                    ]
                },
                repair_loop: {
                    type: 'agent',
                    agent: 'repairer',
                    input: { include: ['qa/report.md', 'delivery/join-summary.md'] },
                    outputs: ['delivery/repair-notes.md'],
                    retry: { max: 1, counter: 'qa_repair' }
                },
                final_report: {
                    type: 'report',
                    input: { include: ['qa/report.md', 'delivery/join-summary.md'] },
                    outputs: ['final/report.md']
                },
                final_report_with_followups: {
                    type: 'report',
                    input: { include: ['qa/report.md', 'delivery/join-summary.md'] },
                    outputs: ['final/report-with-followups.md']
                }
            },
            transitions: [
                { id: 'input_to_architecture', from: 'input', to: 'architecture', on: 'run.started' },
                { id: 'architecture_to_contract_design', from: 'architecture', to: 'contract_design', on: 'workload.completed', guard: { 'artifact.exists': 'architecture/plan.md' } },
                {
                    id: 'contract_design_to_contract_gate',
                    from: 'contract_design',
                    to: 'contract_gate',
                    on: 'workload.completed',
                    guard: {
                        all: [
                            { 'artifact.exists': 'contracts/contracts.json' },
                            { 'artifact.validates': { path: 'contracts/contracts.json', schema: 'contracts.schema.json' } }
                        ]
                    }
                },
                { id: 'contract_gate_to_parallel_delivery', from: 'contract_gate', to: 'parallel_delivery', on: 'gate.approved', guard: { 'gate.status': { id: 'contract_approval', value: 'approved' } } },
                { id: 'parallel_delivery_to_delivery_join', from: 'parallel_delivery', to: 'delivery_join', on: 'state.completed', guard: { 'branches.all_completed': ['backend_work', 'frontend_work', 'designer_work'] } },
                { id: 'delivery_join_to_qa', from: 'delivery_join', to: 'qa', on: 'workload.completed', guard: { 'artifact.exists': 'delivery/join-summary.md' } },
                { id: 'qa_passed_to_final_report', from: 'qa', to: 'final_report', on: 'workload.completed', priority: 30, guard: { 'signal.equals': { key: 'qa.status', value: 'passed' } } },
                { id: 'qa_failed_to_repair_loop', from: 'qa', to: 'repair_loop', on: 'workload.completed', priority: 20, guard: { all: [{ 'signal.equals': { key: 'qa.status', value: 'failed' } }, { 'loop.lt': { counter: 'qa_repair', max: 1 } }] } },
                { id: 'repair_loop_to_qa', from: 'repair_loop', to: 'qa', on: 'workload.completed', guard: { 'artifact.exists': 'delivery/repair-notes.md' } },
                { id: 'qa_failed_to_followups', from: 'qa', to: 'final_report_with_followups', on: 'workload.completed', priority: 10, guard: { all: [{ 'signal.equals': { key: 'qa.status', value: 'failed' } }, { 'loop.gte': { counter: 'qa_repair', max: 1 } }] } }
            ]
        }
    },
    {
        id: 'content_factory',
        name: 'Content Factory',
        description: 'Shared research and editorial contracts feed parallel content formats.',
        workflow: {
            version: WORKFLOW_VERSION,
            id: 'template_content_factory',
            name: 'Content Factory',
            description: 'input -> research -> editorial_contract -> blog + podcast + ads + newsletter -> editor_join -> final_report',
            agents: {
                researcher: 'agents/content-researcher.md',
                editor: 'agents/editorial-contract-designer.md',
                blog_writer: 'agents/blog-writer.md',
                podcast_writer: 'agents/podcast-writer.md',
                ads_writer: 'agents/ads-writer.md',
                newsletter_writer: 'agents/newsletter-writer.md'
            },
            requires: {
                capabilities: ['llm.agent.execute', 'filesystem.artifacts']
            },
            states: {
                input: {
                    type: 'input',
                    outputs: ['input/brief.md']
                },
                research: {
                    type: 'agent',
                    agent: 'researcher',
                    input: { include: ['input/brief.md'] },
                    outputs: ['research/facts.md', 'research/sources.json']
                },
                editorial_contract: {
                    type: 'agent',
                    agent: 'editor',
                    input: { include: ['input/brief.md', 'research/facts.md', 'research/sources.json'] },
                    outputs: ['contracts/editorial.md', 'contracts/content-files.json'],
                    signals: [{ key: 'editorial_contract.status', value: 'ready' }]
                },
                content_parallel: {
                    type: 'parallel',
                    waitFor: ['blog', 'podcast', 'ads', 'newsletter'],
                    branches: {
                        blog: {
                            type: 'agent',
                            agent: 'blog_writer',
                            input: { include: ['contracts/editorial.md', 'research/facts.md'] },
                            outputs: ['content/blog.md']
                        },
                        podcast: {
                            type: 'agent',
                            agent: 'podcast_writer',
                            input: { include: ['contracts/editorial.md', 'research/facts.md'] },
                            outputs: ['content/podcast.md']
                        },
                        ads: {
                            type: 'agent',
                            agent: 'ads_writer',
                            input: { include: ['contracts/editorial.md', 'research/facts.md'] },
                            outputs: ['content/ads.md']
                        },
                        newsletter: {
                            type: 'agent',
                            agent: 'newsletter_writer',
                            input: { include: ['contracts/editorial.md', 'research/facts.md'] },
                            outputs: ['content/newsletter.md']
                        }
                    }
                },
                editor_join: {
                    type: 'join',
                    waitFor: ['blog', 'podcast', 'ads', 'newsletter'],
                    input: { include: ['content/blog.md', 'content/podcast.md', 'content/ads.md', 'content/newsletter.md'] },
                    outputs: ['content/editor-join.md']
                },
                final_report: {
                    type: 'report',
                    input: { include: ['content/editor-join.md'] },
                    outputs: ['final/report.md']
                }
            },
            transitions: [
                { id: 'input_to_research', from: 'input', to: 'research', on: 'run.started' },
                { id: 'research_to_editorial_contract', from: 'research', to: 'editorial_contract', on: 'workload.completed', guard: { 'artifact.exists': 'research/facts.md' } },
                { id: 'editorial_contract_to_content_parallel', from: 'editorial_contract', to: 'content_parallel', on: 'workload.completed', guard: { 'artifact.exists': 'contracts/editorial.md' } },
                { id: 'content_parallel_to_editor_join', from: 'content_parallel', to: 'editor_join', on: 'state.completed', guard: { 'branches.all_completed': ['blog', 'podcast', 'ads', 'newsletter'] } },
                { id: 'editor_join_to_final_report', from: 'editor_join', to: 'final_report', on: 'workload.completed', guard: { 'artifact.exists': 'content/editor-join.md' } }
            ]
        }
    },
    {
        id: 'conditional_contract',
        name: 'Conditional Contract',
        description: 'Planning emits a signal and guarded transitions decide whether contract design is needed.',
        workflow: {
            version: WORKFLOW_VERSION,
            id: 'template_conditional_contract',
            name: 'Conditional Contract',
            description: 'input -> planning -> contract_design when needed, otherwise implementation',
            agents: {
                planner: 'agents/planner.md',
                contract_designer: 'agents/contract-designer.md',
                implementer: 'agents/implementer.md'
            },
            requires: {
                capabilities: ['llm.agent.execute', 'filesystem.edit', 'filesystem.artifacts']
            },
            states: {
                input: {
                    type: 'input',
                    outputs: ['input/request.md']
                },
                planning: {
                    type: 'agent',
                    agent: 'planner',
                    input: { include: ['input/request.md'] },
                    outputs: ['planning/plan.md'],
                    signals: [
                        { key: 'planning.needs_parallel_contract', value: true },
                        { key: 'planning.needs_parallel_contract', value: false }
                    ]
                },
                contract_design: {
                    type: 'agent',
                    agent: 'contract_designer',
                    input: { include: ['planning/plan.md'] },
                    outputs: [
                        'contracts/shared.md',
                        'contracts/contracts.json',
                        'contracts/work-orders/backend.md',
                        'contracts/work-orders/frontend.md',
                        'contracts/work-orders/designer.md',
                        'contracts/work-orders/qa.md',
                        'schemas/api.json',
                        'schemas/assets.json'
                    ]
                },
                implementation: {
                    type: 'agent',
                    agent: 'implementer',
                    input: { include: ['planning/plan.md', 'contracts/contracts.json'] },
                    outputs: ['implementation/result.md'],
                    effects: [{ kind: 'file_write', type: 'file.edited', summary: 'Implement scoped workflow changes.' }]
                },
                final_report: {
                    type: 'report',
                    input: { include: ['implementation/result.md'] },
                    outputs: ['final/report.md']
                }
            },
            transitions: [
                { id: 'input_to_planning', from: 'input', to: 'planning', on: 'run.started' },
                { id: 'planning_to_contract_design', from: 'planning', to: 'contract_design', on: 'workload.completed', priority: 20, guard: { 'signal.equals': { key: 'planning.needs_parallel_contract', value: true } } },
                { id: 'planning_to_implementation', from: 'planning', to: 'implementation', on: 'workload.completed', priority: 10, guard: { 'signal.equals': { key: 'planning.needs_parallel_contract', value: false } } },
                { id: 'contract_design_to_implementation', from: 'contract_design', to: 'implementation', on: 'workload.completed', guard: { 'artifact.exists': 'contracts/contracts.json' } },
                { id: 'implementation_to_final_report', from: 'implementation', to: 'final_report', on: 'workload.completed', guard: { 'artifact.exists': 'implementation/result.md' } }
            ]
        }
    },
    {
        id: 'human_approval_gate',
        name: 'Human Approval Gate',
        description: 'A human gate approves a plan before any real execution effects are proposed.',
        workflow: {
            version: WORKFLOW_VERSION,
            id: 'template_human_approval_gate',
            name: 'Human Approval Gate',
            description: 'input -> plan -> human_gate -> execution -> final_report',
            agents: {
                planner: 'agents/planner.md',
                executor: 'agents/executor.md'
            },
            requires: {
                capabilities: ['llm.agent.execute', 'human.approval', 'filesystem.edit', 'filesystem.artifacts']
            },
            states: {
                input: {
                    type: 'input',
                    outputs: ['input/request.md']
                },
                plan: {
                    type: 'agent',
                    agent: 'planner',
                    input: { include: ['input/request.md'] },
                    outputs: ['plans/proposed-plan.md'],
                    effects: [{ kind: 'notification', summary: 'Plan is ready for approval.' }]
                },
                human_gate: {
                    type: 'gate',
                    input: { include: ['plans/proposed-plan.md'] },
                    gates: [{
                        id: 'execution_approval',
                        title: 'Approve execution',
                        prompt: 'Approve the proposed plan before execution can begin.'
                    }]
                },
                execution: {
                    type: 'agent',
                    agent: 'executor',
                    input: { include: ['plans/proposed-plan.md'] },
                    outputs: ['execution/result.md'],
                    effects: [{ kind: 'file_write', type: 'file.edited', summary: 'Apply approved execution changes.' }]
                },
                final_report: {
                    type: 'report',
                    input: { include: ['execution/result.md'] },
                    outputs: ['final/report.md']
                }
            },
            transitions: [
                { id: 'input_to_plan', from: 'input', to: 'plan', on: 'run.started' },
                { id: 'plan_to_human_gate', from: 'plan', to: 'human_gate', on: 'workload.completed', guard: { 'artifact.exists': 'plans/proposed-plan.md' } },
                { id: 'human_gate_to_execution', from: 'human_gate', to: 'execution', on: 'gate.approved', guard: { 'gate.status': { id: 'execution_approval', value: 'approved' } } },
                { id: 'execution_to_final_report', from: 'execution', to: 'final_report', on: 'workload.completed', guard: { 'artifact.exists': 'execution/result.md' } }
            ]
        }
    },
    {
        id: 'memory_consolidation',
        name: 'Memory Consolidation',
        description: 'Candidate memories are reviewed, approved by a human, then written explicitly.',
        workflow: {
            version: WORKFLOW_VERSION,
            id: 'template_memory_consolidation',
            name: 'Memory Consolidation',
            description: 'input -> work -> memory_review -> optional_human_gate -> memory_write -> final_report',
            agents: {
                worker: 'agents/worker.md',
                memory_reviewer: 'agents/memory-reviewer.md'
            },
            requires: {
                capabilities: [
                    'llm.agent.execute',
                    'memory.context',
                    'human.approval',
                    'memory.write.explicit',
                    'memory.write.provider',
                    'filesystem.artifacts'
                ]
            },
            states: {
                input: {
                    type: 'input',
                    outputs: ['input/request.md']
                },
                work: {
                    type: 'agent',
                    agent: 'worker',
                    input: { include: ['input/request.md'] },
                    outputs: ['work/result.md', 'memory/candidates.json'],
                    signals: [{ key: 'memory.candidates_found', value: true }]
                },
                memory_review: {
                    type: 'agent',
                    agent: 'memory_reviewer',
                    input: { include: ['memory/candidates.json'], signals: ['memory.candidates_found'] },
                    outputs: ['memory/review.md', 'memory/approved-candidates.json'],
                    signals: [
                        { key: 'memory_review.status', value: 'approved' },
                        { key: 'memory_review.status', value: 'rejected' }
                    ]
                },
                optional_human_gate: {
                    type: 'gate',
                    input: { include: ['memory/review.md', 'memory/approved-candidates.json'] },
                    gates: [{
                        id: 'memory_write_approval',
                        title: 'Approve memory write',
                        prompt: 'Approve candidate memories before permanent memory is written.'
                    }]
                },
                memory_write: {
                    type: 'memory_write',
                    input: { include: ['memory/approved-candidates.json'] },
                    outputs: ['memory/write-result.json'],
                    effects: [{ kind: 'memory_write', summary: 'Persist approved memory candidates only.' }]
                },
                final_report: {
                    type: 'report',
                    input: { include: ['work/result.md', 'memory/write-result.json'] },
                    outputs: ['final/report.md']
                },
                final_report_with_followups: {
                    type: 'report',
                    input: { include: ['work/result.md', 'memory/review.md'] },
                    outputs: ['final/report-with-followups.md']
                }
            },
            transitions: [
                { id: 'input_to_work', from: 'input', to: 'work', on: 'run.started' },
                { id: 'work_to_memory_review', from: 'work', to: 'memory_review', on: 'workload.completed', guard: { 'artifact.exists': 'memory/candidates.json' } },
                { id: 'memory_review_to_gate', from: 'memory_review', to: 'optional_human_gate', on: 'workload.completed', priority: 20, guard: { 'signal.equals': { key: 'memory_review.status', value: 'approved' } } },
                { id: 'memory_review_to_followups', from: 'memory_review', to: 'final_report_with_followups', on: 'workload.completed', priority: 10, guard: { 'signal.equals': { key: 'memory_review.status', value: 'rejected' } } },
                { id: 'gate_to_memory_write', from: 'optional_human_gate', to: 'memory_write', on: 'gate.approved', guard: { 'gate.status': { id: 'memory_write_approval', value: 'approved' } } },
                { id: 'memory_write_to_final_report', from: 'memory_write', to: 'final_report', on: 'workload.completed', guard: { 'effect.status': { kind: 'memory_write', value: 'proposed' } } }
            ]
        }
    }
];

export function listFlowWorkflowTemplates(): FlowWorkflowTemplate[] {
    return clone(TEMPLATES).map(template => ({
        ...template,
        workflow: applyConservativeOutcomeRoutes(template.workflow)
    }));
}

export function getFlowWorkflowTemplate(id: FlowWorkflowTemplateId | string): FlowWorkflowTemplate | undefined {
    const template = TEMPLATES.find(candidate => candidate.id === id);
    return template ? {
        ...clone(template),
        workflow: applyConservativeOutcomeRoutes(clone(template.workflow))
    } : undefined;
}

export function instantiateFlowWorkflowTemplate(
    templateId: FlowWorkflowTemplateId | string,
    options: InstantiateFlowWorkflowTemplateOptions
): FlowWorkflow {
    const template = getFlowWorkflowTemplate(templateId);
    if (!template) {
        throw new Error(`Unknown flow workflow template "${templateId}".`);
    }
    return {
        ...template.workflow,
        id: options.id,
        name: options.name,
        description: options.description || template.workflow.description
    };
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function applyConservativeOutcomeRoutes(workflow: FlowWorkflow): FlowWorkflow {
    const states = { ...workflow.states };
    const transitionsBySource = new Map<string, FlowWorkflow['transitions']>();
    for (const transition of workflow.transitions || []) {
        transitionsBySource.set(transition.from, [...(transitionsBySource.get(transition.from) || []), transition]);
    }
    for (const [stateId, stateTransitions] of transitionsBySource) {
        const state = states[stateId];
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
        states[stateId] = {
            ...state,
            outcomes: {
                ...(state.outcomes || {}),
                [outcome]: transition.to
            }
        };
    }
    return { ...workflow, states };
}
