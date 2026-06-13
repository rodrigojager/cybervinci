# Theia Coder Integration Notes

This document records precautions, risks, and suggestions for bringing agents and workflow skills from this repository into the local Theia Coder/CyberVinci version without breaking the IDE's native flow.

## Context

The local version analyzed at `C:\Users\Rodrigo\Desktop\theia` already has its own agents and skills:

- IDE agents in `packages/ai-ide`, such as `Coder`, `OpenCoder/CyberVinci`, `Architect`, `Explore`, `AppTester`, `Code Reviewer`, `PR Reviewer`, `GitHub`, `ProjectInfo`, `CreateSkill`, `Universal`, and `Orchestrator`.
- OpenPencil skills in `vendor/openpencil/packages/pen-ai-skills/skills`, with resolution by phase, intent, priority, and token budget.

These agents are not just prompts. Many are connected to IDE capabilities: workspace reading, changesets, diagnostics, task contexts, tasks, launch configs, Playwright/DevTools MCP, GitHub MCP, and Codex CLI. Replacing these agents directly with Markdown agents from this repository may break integrated functionality.

## Core Principle

Do not replace native Theia Coder agents by default.

The safest path is **composition**:

- keep native agents as operational wrappers for the IDE;
- add our agents as personas, specializations, or auxiliary skills;
- adapt prompts to call native capabilities instead of competing with them;
- test each integration in isolation before activating it in the main flow.

## What Must Be Preserved

### `OpenCoder` / `CyberVinci`

Preserve it because it integrates:

- Codex CLI;
- permission modes;
- change snapshots;
- local commands (`login`, `status`, `restart`, `config`, `output`);
- context management;
- workspace change observation;
- new conversation/compaction suggestions.

Do not turn `engineering-senior-developer`, `minimal-change`, `code-reviewer`, or any agent from this repository into a direct substitute for it. They can enter as additional guidance, not as the main agent.

### `Coder`

Preserve it because it knows how to:

- read workspace files;
- suggest changes;
- operate in edit mode and agent mode;
- handle the confirmation flow for agent mode;
- suggest actions in the UI.

Engineering agents from this repository should complement `Coder` behavior, not remove its tool contract.

### `Architect`

Preserve it because it works with:

- plan mode;
- task contexts;
- execution suggestions with `Coder`;
- workspace reading in read-only mode.

Our `engineering-software-architect`, `workflow-architect`, and `project-manager-senior` can strengthen planning quality, but the native agent must continue controlling the IDE task context flow.

### `Explore`

Preserve it as a read-only factual exploration agent.

Our `engineering-codebase-onboarding-engineer` is a strong conceptual counterpart, but may be better used as an additional prompt/skill inside `Explore`, while keeping native tools and restrictions.

### `AppTester`

Preserve it because it initializes and uses Playwright/DevTools MCPs.

Our `testing-evidence-collector`, `testing-reality-checker`, and `browser-testing-with-devtools` can enrich QA criteria, but must not replace MCP integration.

### `GitHub` and `PR Reviewer`

Preserve them because the native flow knows how to delegate GitHub operations and review.

Our reviewers can improve severity, language, and checklists, but the native PR Reviewer already knows how to:

- fetch PRs;
- delegate to the GitHub agent;
- delegate exploration to Explore;
- create an incremental review plan;
- prepare inline comments;
- handle permalinks and GitHub review.

## Where Our Agents Fit Best

### 1. As Auxiliary Workflow Skills

Files from `under-review/workflow` are good candidates to become actionable Theia skills:

- `context-engineering.md`
- `source-driven-development.md`
- `doubt-driven-development.md`
- `deprecation-and-migration.md`
- `code-simplification.md`
- `incremental-implementation.md`
- `browser-testing-with-devtools.md`
- `test-driven-development.md`
- `receiving-code-review.md`
- `verification-before-completion.md`
- `using-git-worktrees.md`

Recommendation: convert them to Theia skill format without global hard gates. Use `description`, `phase`, `trigger`, `priority`, and `budget` conservatively.

### 2. As On-Demand Specialist Personas

Domain agents from this repository work best as specialists invoked when the user asks for:

- frontend;
- backend;
- security;
- QA;
- product;
- marketing;
- sales;
- finance;
- legal;
- game development;
- spatial computing;
- specialized areas.

They should not all stay loaded in the main prompt. Theia already has a resolution/selection mechanism; use it to avoid excess context.

### 3. As Additional Rules In Native Agents

Some agents from this repository can become layers on top of native agents:

| Native Theia agent | Our complement |
|---|---|
| `Coder` | `minimal-change`, `incremental-implementation`, `test-driven-development`, `source-driven-development` |
| `Architect` | `software-architect`, `workflow-architect`, `project-manager-senior` |
| `Explore` | `codebase-onboarding-engineer`, `context-engineering` |
| `AppTester` | `evidence-collector`, `reality-checker`, `browser-testing-with-devtools`, `accessibility-auditor` |
| `Code Reviewer` | `engineering-code-reviewer`, `receiving-code-review`, `code-simplification` |
| `PR Reviewer` | `engineering-code-reviewer`, `git-workflow-master`, future `github-pr-review` |
| `CreateSkill` | future agent/skill for authoring agents in this repository's pattern |

## What Not To Migrate As A General Agent

### OpenPencil Style Guides

The 50 OpenPencil style guides should remain design presets/assets, not agents.

They are visual generation resources, not personas. Mixing them with specialist agents can increase selector noise and worsen intent resolution.

### Very Specific PenNode/OpenPencil Skills

Skills such as:

- `schema`
- `jsonl-format`
- `jsonl-format-simplified`
- `layout`
- `variables`
- `role-definitions`
- `codegen-chunk`
- `codegen-assembly`
- `codegen-react`
- `codegen-vue`
- `codegen-flutter`
- `codegen-swiftui`

should stay in the OpenPencil subsystem because they depend on the PenNode model and visual generation pipeline. They must not be mixed with general engineering agents.

## Main Risks

### 1. Breaking Native Tools

If one of our agents replaces a native prompt, it may stop mentioning or respecting tools such as:

- `getFileContent`
- `searchInWorkspace`
- `getFileDiagnostics`
- `runTask`
- `createTaskContext`
- `editTaskContext`
- `agentDelegation`
- GitHub MCP
- Playwright/DevTools MCP
- Codex CLI runtime

Likely result: the agent still "knows how to talk" about the task, but stops operating the IDE correctly.

### 2. Excess Context

Loading dozens or hundreds of agents into the main prompt tends to worsen:

- selection of the correct agent;
- adherence to instructions;
- token cost;
- response consistency;
- response time.

Prefer on-demand resolution by trigger, category, and phase.

### 3. Rule Conflicts

Some external agents/skills use hard-gate language. The current decision is not to embed hard gates in agents/skills, because a future pipeline feature will handle that.

During migration, review terms such as:

- `must`;
- `mandatory`;
- `never`;
- `always`;
- `no gate can be skipped`;
- `do not proceed`.

Adapt them into recommendations or leave enforcement to the pipeline mechanism.

### 4. Agent Duplication

Theia already has `Code Reviewer`, `PR Reviewer`, `Explore`, `Architect`, `Coder`, and `AppTester`.

Creating agents with similar names and roles can confuse the router. Prefer to:

- preserve native names;
- add clear suffixes for specialists;
- use descriptions with well-bounded use cases;
- avoid two agents competing for the same generic intent.

### 5. Loss Of Task Context Integration

Agents such as `Architect` and `PR Reviewer` update task contexts and incremental plans. If replaced by simple Markdown agents, the UI may lose progress, checkpoints, and execution suggestions.

## Safe Migration Strategy

### Phase 1: Inventory and Classification

Classify each file from this repository as:

- `agent-specialist`: domain persona;
- `workflow-skill`: method/process;
- `reference`: checklist, guide, preset, or knowledge;
- `integration-specific`: depends on Theia/OpenPencil/Codex/GitHub/MCP.

Do not import everything as an agent.

### Phase 2: Pilot With A Few Items

Start with 5 to 10 low-risk items:

- `context-engineering`
- `source-driven-development`
- `verification-before-completion`
- `code-simplification`
- `incremental-implementation`
- `engineering-code-reviewer`
- `engineering-codebase-onboarding-engineer`
- `testing-evidence-collector`

Test routing, tool usage, and response quality before expanding.

### Phase 3: Adapt To Theia Format

For each skill:

```yaml
---
name: short-name
description: objective usage description
phase: [planning, generation, validation, maintenance]
trigger:
  keywords: [...]
priority: 5
budget: 1000
category: workflow
---
```

Recommendations:

- use short and unique names;
- keep the description operational;
- choose specific triggers;
- keep the initial budget low;
- avoid high priority until the skill proves useful.

### Phase 4: Integrate With Native Agents

Instead of creating substitutes:

- insert skills as additional context in `Coder`, `Architect`, `Explore`, `AppTester`, or `Code Reviewer`;
- keep native runtime tools and prompts;
- test whether the agent still calls the right tools.

### Phase 5: Flow Regression Tests

Before treating the migration as stable, test:

1. `Explore` answers read-only questions without suggesting changes.
2. `Architect` creates a plan and suggests execution with `Coder`.
3. `Coder` edits a file and shows a changeset.
4. `AppTester` starts MCP and tests UI.
5. `Code Reviewer` reviews local changes.
6. `PR Reviewer` fetches PR, delegates GitHub/Explore, and prepares review.
7. `OpenCoder/CyberVinci` preserves Codex CLI modes and snapshots.

If any flow breaks, roll back the integration for that agent/skill.

## Gap Suggestions Before Migration

Create under review before migration:

1. `github-pr-review.md`
   - Adapt the native PR Reviewer logic to our pattern, but without replacing the Theia agent.
   - Useful for documenting expected review behavior with GitHub.

2. `skill-authoring.md`
   - Adapt Theia CreateSkill to this repository's pattern.
   - Should teach how to create agents/skills with frontmatter, description, triggers, and validation.

3. `cjk-typography.md`
   - If UI generation for Chinese, Japanese, or Korean is needed.
   - Theia/OpenPencil has specific rules that do not exist here.

## Final Recommendation

Treat Theia Coder as a platform with its own runtime, not as a prompt folder.

The goal should not be "replace Theia agents with ours". The goal should be:

1. preserve native agents that control IDE tools;
2. add our agents as actionable specialists;
3. turn workflows into small on-demand skills;
4. keep OpenPencil/PenNode isolated as a visual subsystem;
5. test each integration against real IDE flows.

This approach reduces the risk of losing exactly what makes Theia Coder valuable: deep integration with workspace, tools, MCPs, changesets, PRs, and local execution.
