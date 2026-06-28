# Débitos Técnicos

## Política graph-first para buscas da IA

Decisão atual: o CyberVinci Memory passou a expor a ferramenta MCP `cybervinci.search.graphFirst`, e o Codex Provider/skill local foram configurados para orientar a IA a consultar o grafo/memórias antes de usar `rg`, `grep`, `ast-grep` ou `sg` em buscas amplas.

Débito técnico: essa solução ainda depende de instrução, skill e comportamento cooperativo do agente. Isso é útil como primeira camada, mas não força tecnicamente todos os provedores de IA ou todos os fluxos de execução a respeitarem a ordem graph-first.

Avaliação futura: investigar uma forma mais forte e desacoplada de interceptar ou orientar buscas, idealmente por hook independente do provedor de IA. O objetivo é fazer o fluxo consultar Memory/grafo primeiro de maneira automática, aplicar `ast-grep`/`sg` como fallback estrutural e só então permitir `rg`/`grep` textual quando necessário.

Critério desejado: a política deve reduzir varreduras repetidas do repositório, economizar tokens, aproveitar o grafo já indexado, reagir a mudanças detectadas por Git e não depender apenas de uma skill ou prompt para ser obedecida.
