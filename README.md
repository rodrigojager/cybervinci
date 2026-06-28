# CyberVinci

CyberVinci e uma IDE agentica baseada em Theia para transformar trabalho com IA em workflows reutilizaveis.

O projeto esta em evolucao. Este README separa recursos atuais, recursos experimentais e ideias planejadas. Nem tudo que aparece em `Modificacoes/Planos` ja esta implementado ou validado como recurso pronto.

## Ideia central

Pare de conversar alteracao por alteracao. Monte o processo e reutilize.

O CyberVinci trata IA como workflow, nao apenas como chat. A proposta e coordenar agentes, contexto de projeto, modelos, provedores, revisoes, aprovacoes e artefatos dentro de uma IDE local.

Isso permite usar IA de forma mais controlada: escolher o modelo certo para cada etapa, preservar contexto util do workspace, transformar tarefas recorrentes em processos reutilizaveis e manter revisao humana nos pontos importantes.

## O que e o CyberVinci

CyberVinci e uma IDE desktop baseada em Theia, pensada para funcionar como um workspace agentico. Em vez de depender de uma unica conversa com um unico modelo, o ambiente combina chat, agentes especializados, workflows visuais, memoria de projeto, editores visuais e playbooks.

Ele e construido para uso local, com foco em manter arquivos, decisoes e execucoes dentro do workspace do usuario.

## Recursos principais

### AI Chat

Chat com IA dentro da IDE, com controle de provedor, modelo, modo de execucao e contexto do workspace. A ideia e que o chat seja a entrada principal para conversar com modelos, acionar agentes e iniciar fluxos de trabalho.

### Agency Agents

Biblioteca de agentes especializados escritos em Markdown. Cada agente funciona como uma persona profissional reutilizavel, por exemplo arquiteto, revisor, pesquisador, planejador ou executor. Por estarem em arquivos de texto, esses agentes podem ser organizados, editados e versionados junto do projeto.

### Flow

Ferramenta visual para montar workflows de IA em etapas. Em vez de pedir tudo em uma unica conversa, o usuario pode criar um processo com passos, entradas, saidas, revisoes e aprovacoes. Um Flow pode representar, por exemplo, um processo de planejamento, implementacao, revisao e validacao.

### Canvas / OpenPencil

Area visual para trabalhar com design, layouts, paginas e artefatos visuais. O objetivo e permitir geracao, inspecao e edicao assistida por IA sem limitar o trabalho a texto ou codigo puro.

### Playbooks

Processos reutilizaveis com etapas mais deterministicas. Um Playbook transforma uma pratica recorrente em um roteiro executavel, com instrucoes claras, validacoes, gates e pontos de decisao. Ele serve para tarefas que precisam de mais estrutura do que uma conversa aberta.

### Virtual Reasoning

Camada que adiciona ciclos explicitos de analise, revisao e decisao ao uso de modelos que nao possuem esse comportamento de forma nativa. A intencao e tornar o raciocinio do processo mais visivel e controlavel, independentemente do modelo usado.

### Virtual Goal

Camada para manter objetivos ativos por mais tempo. Ela permite que uma tarefa continue em ciclos controlados ate atingir um resultado, pedir decisao humana ou encontrar um bloqueio claro.

### Temas e experiencia visual

Customizacoes de tema e interface para dar identidade propria ao CyberVinci e melhorar a experiencia de uso sobre a base Theia.

### Markdown e Mermaid

Suporte para documentacao tecnica, diagramas e planos versionaveis dentro do workspace. Isso permite que decisoes, arquiteturas e processos sejam mantidos como arquivos legiveis e revisaveis.

## Recursos experimentais ou planejados

### Plannotator

Integracao planejada para revisar planos, diffs e artefatos visualmente antes da execucao. A ideia e permitir comentarios, marcacoes, aprovacao ou pedido de mudancas.

### Memory

Sistema para preservar contexto util do projeto e das decisoes anteriores. Em vez de depender apenas do historico do chat, o CyberVinci pode consultar memoria estruturada para entender padroes, preferencias, arquitetura e decisoes ja tomadas.

### Graph

Mapa navegavel do projeto, conectando arquivos, simbolos, dependencias, modulos e relacoes importantes. A intencao e ajudar agentes a entenderem o codigo antes de fazer buscas genericas em texto bruto.

### Graph-first / busca inteligente

Uso combinado de Memory e Graph para orientar buscas no projeto. Antes de varrer arquivos de forma ampla, o agente tenta entender onde procurar e qual parte do sistema e mais relevante.

### Arena A/B Test

Ambiente para comparar respostas, agentes, modelos, prompts ou workflows lado a lado. Serve para testar qual abordagem entrega melhor resultado antes de incorpora-la como padrao.

### Library

Biblioteca de recursos reutilizaveis do CyberVinci, como agentes, playbooks, flows, templates, componentes, exemplos, snippets e materiais de referencia.

### Builder

Ferramenta visual para construcao de interfaces e paginas. Ela aparece aqui como experimental enquanto passa por mais validacao.

### Acesso remoto

Ideia de controlar partes do CyberVinci a distancia, por exemplo via bot, mantendo permissoes, aprovacoes e auditoria local.

## Caminho de uso esperado

1. Abrir um workspace local no CyberVinci.
2. Usar o AI Chat para pedir ajuda, escolher contexto e selecionar agente, modelo ou provedor quando necessario.
3. Quando a tarefa for recorrente ou tiver muitas etapas, transformar a conversa em um Flow.
4. Usar Agency Agents para trazer especializacao por etapa, como planejamento, implementacao, revisao, teste ou pesquisa.
5. Usar Canvas / OpenPencil quando o trabalho envolver design, paginas, interfaces ou artefatos visuais.
6. Registrar processos repetiveis como Playbooks para reutilizacao futura.
7. Manter planos, diagramas e decisoes em Markdown para que continuem revisaveis e versionaveis.

## Organizacao do repositorio

- `Workload/theia`: base Theia usada pelo CyberVinci.
- `Modificacoes/*`: recursos, overlays e modulos especificos do CyberVinci.
- `Modificacoes/Skills/Manual/Agency Agents`: agentes em Markdown.
- `Modificacoes/Planos`: ideias, planos e materiais conceituais.
- `installer/`: scripts e estrutura de empacotamento/instalacao.
- `tools/`: scripts auxiliares.
- `docs/architecture/feature-separation.md`: notas sobre separacao de features.

## Maturidade

O CyberVinci mistura recursos ja integrados, frentes experimentais e planos ainda em desenho. A documentacao deve ser lida com essa separacao em mente: os recursos principais descrevem a direcao atual do produto, enquanto a secao experimental registra areas que ainda precisam de validacao, acabamento ou implementacao completa.
