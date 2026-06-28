# CyberVinci

CyberVinci e uma IDE orientada a IA para agencia profissional para engenharia, design, operacao de software e várias outras atividades.
Este repositorio concentra o produto, os pacotes de extensao e os componentes de runtime usados na experiencia integrada.

## Compatibilidade com extensões do VS Code
O CyberVinci é um fork do Theia IDE e sendo assim já nasce compatível com diversas extensões do VS Code. A compatibilidade tende a crescer com o tempo. O Theia tem um sistema próprio de extensões que é 100% compatível com o CyberVinci.

## O que ja esta implementado

### OpenPencil (editor de design nativo)
OpenPencil e o motor/editor visual integrado ao CyberVinci para criacao e edicao de layouts, componentes e cenas visuais dentro da IDE. Pense como uma versão mais enxuta do Figma/Claude Design, integrado na IDE e com suporte a inteligencia artificial.

Capacidades entregues:
- Editor visual embutido com canvas, layers e painel de propriedades.
- Edicao estrutural de documentos `.op`.
- Selecao multipla, arraste em grupo e manipulacao direta no canvas.
- Integracao com IA para gerar e aplicar alteracoes de design.
- Importacao (incluindo fluxos de Figma/JSON) e exportacao em formatos suportados.
- Runtime integrado com o fluxo de salvamento/abertura do produto.

### Arena (A/B test de prompts)
Arena permite comparar estrategias de prompt e respostas a partir de um conjunto de prompts lado a lado para voce avaliar o que trouxe o melhor resultado e poder fazer o fine tuning deles.

Capacidades entregues:
- Execucao comparativa entre variacoes de prompt.
- Fluxo para analise de diferencas de qualidade/aderencia.
- Base para evolucao de criterios e ranking de resultados.

### Documentation Manager
Documentation Manager centraliza documentacao versionada para consumo por humanos e agentes. Uma alternativa embarcada do Context7.

Capacidades entregues:
- Registro e organizacao de docs por contexto.
- Estrutura para versionamento e governanca.
- Base para consulta controlada por agentes e ferramentas da IDE.

### Memory
Memory e a camada de contexto de projeto para apoiar IA. Toda vez que a IDE precisar consultar algo no projeto, um grafo é feito e indexado correlacionando os arquivos, elementos, classes e métodos. Da próxima vez, menos tokens serão gastos e a busca será muito mais rápida. Além disso, a IDE vai aprendendo com o seu uso, ao perceber tarefas repetitivas, passa a sugerir novas skills, entre outras features.

Capacidades entregues:
- Superficie de comandos e UI para analise contextual.
- Estrutura para consolidar estado, sinais e conhecimento do projeto.
- Integracao com fluxos de assistencia da IDE.

## Roadmap (fonte: `mudancas-futuras/`)

Direcao consolidada nos documentos de planejamento ja versionados:

- `mudancas-futuras/STATUS_IMPLEMENTACAO.md`
- `mudancas-futuras/AI-OUTPUT-CLEANER.txt`
- `mudancas-futuras/melhoria_do_memory.txt`
- `mudancas-futuras/flow-plan/`

Frentes principais:
- Evoluir o pipeline de AI Output Cleaner, um ferramenta que intercepta chamadas de ferramentas por IA, eliminando caracteres e informações inúteis que são repassadas para a IA, reduzindo uso de tokens.
- Expandir Memory com mais profundidade de analise e operacao.
- Evoluir Arena para ciclos de avaliacao mais robustos.
- Expandir Documentation Manager para governanca/versionamento colaborativo.
- Consolidar Flow (canvas + kanban + workflow + contratos/agentes). Pense como um N8N, mas mais simples de montar, integrado na IDE e com várias habilidades à disposição.
- Manter arquitetura desacoplada do core para facilitar atualizacoes futuras do produto.