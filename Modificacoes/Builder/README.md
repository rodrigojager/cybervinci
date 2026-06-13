# CyberVinci Page Builder

Extensao Theia para criar paginas web visualmente com React, Mantine, RJSF, JSON Schema e um adapter Puck desacoplado do formato canonico.

O pacote Theia principal continua publicado como `@cybervinci/builder`, mas o produto exposto no CyberVinci e o **CyberVinci Page Builder**. Novas paginas usam `.cvpage.json`; arquivos `.builder.json` e `.cvui.json` ainda abrem como legados.

## Pacotes

- `packages/builder`: extensao Theia, widget React, comandos, persistencia de arquivo e UI.
- `packages/builder-schema`: formato canonico versionado do documento.
- `packages/builder-registry`: registro extensivel de componentes, schemas, defaults e regras.
- `packages/builder-renderer-mantine`: preview React/Mantine a partir do schema.
- `packages/builder-editor-puck`: adapter Builder Schema <-> Puck.
- `packages/builder-property-panel-rjsf`: painel avancado RJSF.
- `packages/builder-export-react`: exportacao React TSX.
- `packages/builder-export-html`: exportacao HTML.
- `packages/builder-ai`: patches estruturados de IA.

## Uso

1. Instale a feature no Theia alvo:

```powershell
pwsh tools/install-feature.ps1 -Feature "Builder" -TargetTheia "Workload/theia" -WithDependencies
```

2. No Theia, use o menu `CyberVinci > Builder`.
3. Execute `CyberVinci: Open Page Builder` para abrir um arquivo selecionado ou criar uma pagina nova.
4. Use `CyberVinci: New Page` para criar um `.cvpage.json`.
5. Use `CyberVinci: Open Page JSON` para abrir `.cvpage.json`, `.builder.json` ou `.cvui.json`.
6. No editor, arraste/adicone componentes no painel esquerdo, edite props/style/data/advanced no painel direito e alterne `Editor`, `Preview` e `JSON` na barra superior.
7. Use `CyberVinci: Save Page` ou o botao `Save`.
8. Use `CyberVinci: Export React Component` para gerar `Page.tsx`.

## Arquitetura

O JSON salvo e independente do motor visual. O fluxo e:

`Builder Schema -> Component Registry -> Puck adapter / Mantine renderer / RJSF / exporters`

Puck nao e a fonte da verdade. O registry central descreve cada componente e seus schemas; os adapters geram configuracoes especificas para editor, preview, propriedades e exportacao.
