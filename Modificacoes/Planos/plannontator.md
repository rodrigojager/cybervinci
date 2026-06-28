# Plano: Integracao do Plannotator no CyberVinci

Observacao: o arquivo foi criado como `plannontator.md` porque esse foi o nome pedido.
O projeto upstream se chama Plannotator: https://github.com/backnotprop/plannotator

Status: ideia registrada, sem implementacao agora.
Data: 2026-06-28

## Resumo

Integrar o Plannotator ao CyberVinci como uma camada visual de revisao,
anotacao e aprovacao humana para planos, diffs e artefatos gerados por IA.

Ele nao deve substituir o Flow, o AI Chat, o AI Workdir, o OpenPencil ou os
previews internos. A melhor funcao dele e ser uma superficie de feedback
estruturado entre o usuario e os agentes.

## Objetivo

Permitir que o usuario revise visualmente:

- planos antes da execucao;
- diffs antes de aceitar mudancas;
- arquivos Markdown/HTML;
- relatorios e artefatos do Flow;
- saidas do OpenPencil/Canvas;
- resultados de edicao visual em HTML/Razor.

O retorno dessas revisoes deve voltar para o CyberVinci como feedback
estruturado, gate decision, anotacao persistida ou prompt de continuacao.

## Principio De Integracao

A integracao deve ser desacoplada e segura para upgrade.

Proposta:

- criar `Modificacoes/Plannotator`;
- espelhar para `Workload/theia/packages/plannotator`;
- expor um servico Theia proprio, sem misturar a logica dentro do Flow;
- consumir o Plannotator como sidecar/CLI no MVP;
- so depois considerar widget nativo ou reuso direto dos componentes React.

O CyberVinci continua sendo o orquestrador:

- Flow decide estados, gates e execucao;
- AI Chat conversa com o agente;
- AI Workdir define o diretorio de trabalho;
- OpenPencil aplica operacoes validadas;
- Plannotator coleta revisao humana e anotacoes.

## MVP Proposto

Criar um pacote `@cybervinci/plannotator` com:

- protocolo comum em `src/common/plannotator-protocol.ts`;
- servico backend em `src/node/plannotator-service.ts`;
- contribuicao frontend em `src/browser/plannotator-contribution.ts`;
- comandos de command palette e menus de contexto;
- armazenamento local em `.theia/plannotator/`.

No MVP, o servico pode chamar o Plannotator por subprocesso:

- `plannotator review`;
- `plannotator annotate <arquivo.md>`;
- `plannotator annotate <arquivo.html> --render-html`;
- `plannotator annotate <arquivo> --json`, quando for necessario capturar retorno.

O Plannotator pode abrir no navegador externo primeiro. Embutir no MiniBrowser
ou em um widget Theia fica para uma segunda fase.

## Cuidados De Runtime

O Plannotator upstream usa runtime e pacotes que nao devem ser importados
diretamente no backend Node/Theia sem uma decisao explicita.

Decisao inicial recomendada:

- usar CLI/sidecar no MVP;
- detectar se `plannotator` e `bun` estao disponiveis;
- mostrar diagnostico claro quando faltar dependencia;
- usar o AI Workdir ou o workspace root como `cwd`;
- nao depender de hooks oficiais do Codex no Windows;
- nao habilitar compartilhamento remoto por padrao.

Padrao de privacidade:

- rodar localmente;
- `PLANNOTATOR_SHARE=disabled` por padrao;
- nao abrir caminhos arbitrarios vindos do chat sem validacao;
- persistir anotacoes em area controlada do CyberVinci.

## Caminho Do Usuario: Flow Plan Gate

1. Usuario abre o Flow.
2. Usuario cria ou executa um workflow.
3. O agente gera um plano, por exemplo `plans/proposed-plan.md`.
4. O Flow entra em estado `waiting_gate`.
5. O card do gate mostra `Review in Plannotator`.
6. Usuario clica no botao.
7. CyberVinci abre o Plannotator com o plano.
8. Usuario destaca trechos, escreve comentarios e escolhe aprovar ou pedir revisao.
9. Se aprovado, o CyberVinci chama `approveGate`.
10. Se houver feedback, o gate vira `revision_requested`.
11. O agente revisa o plano.
12. A nova versao pode ser aberta novamente no Plannotator para comparar e aprovar.

## Caminho Do Usuario: Review De Codigo

1. O agente faz mudancas no AI Workdir.
2. Usuario aciona `Review Current Changes in Plannotator`.
3. CyberVinci roda o Plannotator com `cwd` no AI Workdir.
4. O diff abre para revisao.
5. Usuario comenta linhas, aprova ou devolve feedback.
6. O feedback volta para o AI Chat ou para uma tarefa do Flow.
7. Se aprovado, o usuario segue para commit, PR ou proxima etapa.

## Caminho Do Usuario: Anotar Artefato

1. Usuario abre um Markdown, HTML, relatorio do Flow ou artefato visual.
2. Usuario clica `Annotate in Plannotator`.
3. CyberVinci abre o arquivo no Plannotator.
4. Usuario marca trechos ou regioes relevantes.
5. As anotacoes sao salvas no CyberVinci.
6. O usuario escolhe enviar para o agente, criar follow-up ou anexar ao run.

## Caminho Do Usuario: OpenPencil

1. Usuario gera ou continua um design com IA no OpenPencil.
2. Antes de aplicar uma nova rodada, CyberVinci exporta um snapshot, HTML ou resumo.
3. Usuario abre `Review OpenPencil Output in Plannotator`.
4. Usuario comenta o resultado visual ou textual.
5. CyberVinci transforma as anotacoes em prompt de continuacao.
6. OpenPencil continua aplicando somente operacoes estruturadas e validadas.

## Recursos Do CyberVinci Onde Encaixa

### Flow

Melhor ponto de entrada.

Usos:

- revisar plano antes de execucao;
- revisar gates humanos;
- anotar relatorio final;
- revisar artefatos de run;
- revisar efeitos antes de aplicar;
- transformar feedback em `revision_requested`.

### AI Chat E AI Workdir

Usos:

- revisar diffs gerados pelo agente;
- anotar ultima resposta do agente;
- abrir artefato citado na conversa;
- mandar feedback estruturado de volta ao modelo.

Ferramentas internas possiveis:

- `cybervinci.plannotator.reviewDiff`;
- `cybervinci.plannotator.annotateArtifact`;
- `cybervinci.plannotator.reviewPlan`;
- `cybervinci.plannotator.openSession`.

### OpenPencil E Canvas

Usos:

- revisar preview gerado por IA;
- anotar HTML/export visual;
- revisar resumo de operacoes antes de continuar;
- converter comentarios em prompt de refinamento.

Importante: o Plannotator nao deve virar fonte de operacoes do OpenPencil.
Ele deve gerar feedback. As operacoes continuam sendo produzidas e validadas
pelo runtime do OpenPencil.

### Markdown E Mermaid Preview

Usos:

- anotar specs;
- anotar planos;
- anotar ADRs;
- anotar playbooks;
- revisar documentos antes de rodar agentes.

### SCM / Pull Request / Code Review

Usos:

- revisar diff local;
- revisar alteracoes do AI Workdir;
- revisar PR ou patch quando houver integracao com GitHub;
- devolver comentarios para o agente.

### Builder E Razor Visual Editor

Usos:

- anotar preview HTML/Razor;
- revisar plano de edicao visual;
- comentar resultado antes de aplicar nova rodada de IA.

## Fases

### Fase 1: Registro E MVP CLI

- Criar pacote desacoplado.
- Adicionar comandos Theia.
- Rodar Plannotator por CLI/sidecar.
- Abrir no navegador externo.
- Validar dependencia e exibir diagnostico.

### Fase 2: Flow Gate Integration

- Adicionar botao nos gates do Flow.
- Exportar plano/gate input para arquivo temporario controlado.
- Abrir no Plannotator.
- Capturar resultado.
- Mapear aprovacao para `approveGate`.
- Mapear feedback para `revision_requested`.
- Persistir anotacoes junto ao run.

### Fase 3: AI Chat Tools

- Expor ferramentas internas para o agente.
- Permitir review de diff atual.
- Permitir anotacao de artefato.
- Retornar feedback como mensagem estruturada no chat.

### Fase 4: OpenPencil E Artefatos

- Adicionar comandos em previews e exports.
- Transformar anotacoes em prompt de continuacao.
- Guardar anotacoes por arquivo/run/design session.

### Fase 5: UI Embutida

- Avaliar MiniBrowser.
- Se necessario, criar widget Theia proprio.
- So considerar portar componentes React do Plannotator depois de validar uso real.

## Decisoes Para Nao Esquecer

- Nao implementar agora.
- Manter desacoplado em `Modificacoes/Plannotator`.
- Primeiro valor real esta no Flow.
- Nao depender de hooks do Codex no Windows.
- Nao misturar Plannotator com a logica interna de execucao do Flow.
- Nao transformar Plannotator em gerador de operacoes do OpenPencil.
- Usar como camada humana de revisao e anotacao.
- Privacidade local por padrao.

## Perguntas Para Retomar Depois

- O Plannotator deve ser dependencia instalada pelo CyberVinci ou pelo usuario?
- O CyberVinci deve oferecer um instalador/verificador de dependencias?
- O MVP deve abrir no navegador externo ou no MiniBrowser?
- As anotacoes devem virar artefatos do Flow, mensagens do chat ou ambos?
- Qual sera o formato persistido das anotacoes?
- Vale contribuir upstream um modo `--no-open --print-url` para facilitar embed?
- Vale adicionar `cybervinci` como origin oficial no Plannotator upstream?

