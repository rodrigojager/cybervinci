# Mermaid Preview Demo

Este arquivo testa a extensao desacoplada `@cybervinci/markdown-mermaid-preview`.

## Flowchart

```mermaid
flowchart TD
    A[Markdown aberto no CyberVinci] --> B{Bloco mermaid?}
    B -- Sim --> C[PreviewHandler CyberVinci]
    C --> D[Mermaid renderiza SVG]
    B -- Nao --> E[Preview Markdown padrao do Theia]
```

## Sequence

```mermaid
sequenceDiagram
    participant User as Desenvolvedor
    participant IDE as CyberVinci
    participant Preview as Markdown Preview
    User->>IDE: Abre o arquivo .md
    IDE->>Preview: Renderiza Markdown
    Preview->>Preview: Substitui cerca mermaid por SVG
    Preview-->>User: Mostra o diagrama
```

## Conteudo normal

O texto comum continua sendo renderizado pelo preview Markdown original do Theia.
