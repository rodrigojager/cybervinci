# Notas de Integração com Theia Coder

Este documento registra cuidados, riscos e sugestões para levar agentes e workflow skills deste repositório para a versão local do Theia Coder/CyberVinci sem quebrar o fluxo nativo da IDE.

## Contexto

A versão local analisada em `C:\Users\Rodrigo\Desktop\theia` já possui agentes e skills próprios:

- Agentes de IDE em `packages/ai-ide`, como `Coder`, `OpenCoder/CyberVinci`, `Architect`, `Explore`, `AppTester`, `Code Reviewer`, `PR Reviewer`, `GitHub`, `ProjectInfo`, `CreateSkill`, `Universal` e `Orchestrator`.
- Skills OpenPencil em `vendor/openpencil/packages/pen-ai-skills/skills`, com resolução por fase, intent, prioridade e orçamento de tokens.

Esses agentes não são apenas prompts. Muitos estão conectados a recursos da IDE: leitura de workspace, changesets, diagnostics, task contexts, tasks, launch configs, Playwright/DevTools MCP, GitHub MCP e Codex CLI. Substituir esses agentes diretamente por agentes markdown deste repositório pode quebrar funcionalidades integradas.

## Princípio Central

Não substituir agentes nativos do Theia Coder por padrão.

O caminho mais seguro é **compor**:

- manter os agentes nativos como wrappers operacionais da IDE;
- adicionar nossos agentes como personas, especializações ou skills auxiliares;
- adaptar prompts para chamar capacidades nativas em vez de competir com elas;
- testar cada integração em isolamento antes de ativar no fluxo principal.

## O Que Deve Ser Preservado

### `OpenCoder` / `CyberVinci`

Preservar porque ele integra:

- Codex CLI;
- modos de permissão;
- snapshots de mudanças;
- comandos locais (`login`, `status`, `restart`, `config`, `output`);
- gerenciamento de contexto;
- observação de alterações no workspace;
- sugestões de nova conversa/compactação.

Não transformar `engineering-senior-developer`, `minimal-change`, `code-reviewer` ou qualquer agente nosso em substituto direto dele. Eles podem entrar como orientação adicional, não como agente principal.

### `Coder`

Preservar porque ele sabe:

- ler arquivos do workspace;
- sugerir alterações;
- operar em edit mode e agent mode;
- lidar com confirmation flow para agent mode;
- sugerir ações na UI.

Agentes nossos de engenharia devem complementar o comportamento do `Coder`, não remover o contrato de ferramentas dele.

### `Architect`

Preservar porque ele trabalha com:

- plan mode;
- task contexts;
- sugestão de execução com `Coder`;
- leitura do workspace em modo read-only.

Nosso `engineering-software-architect`, `workflow-architect` e `project-manager-senior` podem reforçar a qualidade do planejamento, mas o agente nativo precisa continuar controlando o fluxo de task context da IDE.

### `Explore`

Preservar como agente read-only de exploração factual.

Nosso `engineering-codebase-onboarding-engineer` é uma contraparte conceitual forte, mas pode ser melhor usado como prompt/skill adicional dentro do `Explore`, mantendo as ferramentas e restrições nativas.

### `AppTester`

Preservar porque ele inicializa e usa MCPs de Playwright/DevTools.

Nossos `testing-evidence-collector`, `testing-reality-checker` e `browser-testing-with-devtools` podem enriquecer critérios de QA, mas não devem substituir a integração MCP.

### `GitHub` e `PR Reviewer`

Preservar porque o fluxo nativo sabe delegar operações GitHub e review.

Nossos reviewers podem melhorar severidade, linguagem e checklist, mas o PR Reviewer nativo já sabe:

- buscar PR;
- delegar ao GitHub agent;
- delegar exploração ao Explore;
- criar plano incremental de review;
- preparar comentários inline;
- lidar com permalinks e GitHub review.

## Onde Nossos Agentes Entram Melhor

### 1. Como Skills Auxiliares de Workflow

Arquivos de `em_revisao/workflow` são bons candidatos para virar skills acionáveis pelo Theia:

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

Recomendação: converter para o formato de skill do Theia sem hard gates globais. Usar `description`, `phase`, `trigger`, `priority` e `budget` de forma conservadora.

### 2. Como Personas Especialistas Sob Demanda

Agentes de domínio deste repositório funcionam melhor como especialistas acionados quando o usuário pede:

- frontend;
- backend;
- segurança;
- QA;
- produto;
- marketing;
- vendas;
- financeiro;
- legal;
- game development;
- spatial computing;
- áreas especializadas.

Eles não devem ficar todos sempre carregados no prompt principal. O Theia já tem mecanismo de resolução/seleção; usar isso para evitar excesso de contexto.

### 3. Como Regras Adicionais em Agentes Nativos

Alguns agentes nossos podem virar “camadas” sobre agentes nativos:

| Agente nativo Theia | Complemento nosso |
|---|---|
| `Coder` | `minimal-change`, `incremental-implementation`, `test-driven-development`, `source-driven-development` |
| `Architect` | `software-architect`, `workflow-architect`, `project-manager-senior` |
| `Explore` | `codebase-onboarding-engineer`, `context-engineering` |
| `AppTester` | `evidence-collector`, `reality-checker`, `browser-testing-with-devtools`, `accessibility-auditor` |
| `Code Reviewer` | `engineering-code-reviewer`, `receiving-code-review`, `code-simplification` |
| `PR Reviewer` | `engineering-code-reviewer`, `git-workflow-master`, futuro `github-pr-review` |
| `CreateSkill` | futuro agente/skill de autoria de agentes no padrão deste repo |

## O Que Não Migrar Como Agente Geral

### Style Guides OpenPencil

Os 50 style guides do OpenPencil devem continuar como presets/assets de design, não como agentes.

Eles são recursos de geração visual, não personas. Misturar isso com agentes especialistas pode aumentar ruído no seletor e piorar resolução de intenção.

### Skills PenNode/OpenPencil Muito Específicas

Skills como:

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

devem ficar no subsistema OpenPencil, porque dependem do modelo PenNode e do pipeline de geração visual. Elas não devem ser misturadas com agentes gerais de engenharia.

## Riscos Principais

### 1. Quebrar Ferramentas Nativas

Se um agente nosso substituir um prompt nativo, ele pode deixar de mencionar ou respeitar ferramentas como:

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

Resultado provável: o agente passa a “saber falar” sobre a tarefa, mas deixa de operar a IDE corretamente.

### 2. Excesso de Contexto

Carregar dezenas ou centenas de agentes no prompt principal tende a piorar:

- seleção do agente certo;
- aderência a instruções;
- custo de tokens;
- consistência de resposta;
- tempo de resposta.

Preferir resolução sob demanda por trigger, categoria e fase.

### 3. Conflito de Regras

Alguns agentes/skills externos usam linguagem de hard gate. A decisão atual é não embutir hard gates nos agentes/skills, porque isso será tratado por um recurso futuro de pipelines.

Ao migrar, revisar termos como:

- `must`;
- `mandatory`;
- `never`;
- `always`;
- `no gate can be skipped`;
- `do not proceed`.

Adaptar para recomendações ou deixar a imposição para o mecanismo de pipeline.

### 4. Duplicação de Agentes

Theia já tem `Code Reviewer`, `PR Reviewer`, `Explore`, `Architect`, `Coder`, `AppTester`.

Criar agentes com nomes e funções parecidas pode confundir o roteador. Melhor:

- preservar nomes nativos;
- adicionar sufixos claros para especialistas;
- usar descrições com casos de uso bem delimitados;
- evitar dois agentes competindo pela mesma intenção genérica.

### 5. Perda de Integração com Task Context

Agentes como `Architect` e `PR Reviewer` atualizam task contexts e planos incrementais. Se substituídos por agentes markdown simples, a UI pode perder progresso, checkpoints e sugestões de execução.

## Estratégia Segura de Migração

### Fase 1: Inventário e Classificação

Classificar cada arquivo nosso em:

- `agent-specialist`: persona de domínio;
- `workflow-skill`: método/processo;
- `reference`: checklist, guia, preset ou conhecimento;
- `integration-specific`: depende de Theia/OpenPencil/Codex/GitHub/MCP.

Não importar tudo como agente.

### Fase 2: Piloto com Poucos Itens

Começar por 5 a 10 itens de baixo risco:

- `context-engineering`
- `source-driven-development`
- `verification-before-completion`
- `code-simplification`
- `incremental-implementation`
- `engineering-code-reviewer`
- `engineering-codebase-onboarding-engineer`
- `testing-evidence-collector`

Testar roteamento, uso de ferramentas e qualidade de resposta antes de ampliar.

### Fase 3: Adaptação ao Formato Theia

Para cada skill:

```yaml
---
name: nome-curto
description: descrição objetiva do uso
phase: [planning, generation, validation, maintenance]
trigger:
  keywords: [...]
priority: 5
budget: 1000
category: workflow
---
```

Recomendações:

- usar nomes curtos e únicos;
- manter descrição operacional;
- escolher triggers específicos;
- manter budget baixo no início;
- evitar priority alta até provar que a skill ajuda.

### Fase 4: Integração com Agentes Nativos

Em vez de criar substitutos:

- inserir skills como contexto adicional no `Coder`, `Architect`, `Explore`, `AppTester` ou `Code Reviewer`;
- manter ferramentas e prompts de runtime nativos;
- testar se o agente ainda chama as ferramentas certas.

### Fase 5: Testes de Regressão de Fluxo

Antes de considerar a migração estável, testar:

1. `Explore` responde perguntas read-only sem sugerir mudanças.
2. `Architect` cria plano e sugere execução com `Coder`.
3. `Coder` edita arquivo e mostra changeset.
4. `AppTester` inicia MCP e testa UI.
5. `Code Reviewer` revisa mudanças locais.
6. `PR Reviewer` busca PR, delega GitHub/Explore e monta review.
7. `OpenCoder/CyberVinci` mantém modos Codex CLI e snapshots.

Se qualquer fluxo quebrar, recuar a integração daquele agente/skill.

## Sugestões de Lacunas Antes da Migração

Criar em revisão antes de migrar:

1. `github-pr-review.md`
   - Adaptar a lógica do PR Reviewer nativo para nosso padrão, mas sem substituir o agente Theia.
   - Útil para documentar a expectativa de review com GitHub.

2. `skill-authoring.md`
   - Adaptar o CreateSkill do Theia para o padrão deste repositório.
   - Deve ensinar como criar agentes/skills com frontmatter, descrição, triggers e validação.

3. `cjk-typography.md`
   - Se houver geração de UI para chinês, japonês ou coreano.
   - Theia/OpenPencil tem regras específicas que não existem aqui.

## Recomendação Final

Trate Theia Coder como uma plataforma com runtime próprio, não como uma pasta de prompts.

O objetivo não deve ser “trocar os agentes do Theia pelos nossos”. O objetivo deve ser:

1. preservar agentes nativos que controlam ferramentas da IDE;
2. adicionar nossos agentes como especialistas acionáveis;
3. transformar workflows em skills pequenas e sob demanda;
4. manter OpenPencil/PenNode isolado como subsistema visual;
5. testar cada integração contra fluxos reais da IDE.

Essa abordagem reduz o risco de perder justamente o que torna o Theia Coder valioso: integração profunda com workspace, tools, MCPs, changesets, PRs e execução local.

