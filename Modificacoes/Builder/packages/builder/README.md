# CyberVinci UI Builder Extension

CyberVinci UI Builder Extension e uma extensao opcional do CyberVinci para criar
interfaces frontend a partir de JSON, IA e edicao visual WYSIWYG. Ela e tratada
como produto separado do core gratuito do CyberVinci: instalar a extensao
adiciona comandos, views, custom editor e exportadores de UI Builder; remover a
extensao nao deve quebrar a inicializacao nem o uso normal do CyberVinci core.

O contrato central de dados e o **Builder Schema** ou **CyberVinci UI Schema**. Um
arquivo `.builder.json` persiste um `BuilderDocument`, e esse documento e a fonte
oficial da pagina. Puck, Mantine, RJSF, IA e exportadores sao adapters ao redor
desse contrato, nao formatos canonicos.

## Objetivo

O objetivo do UI Builder e permitir que usuarios criem, editem, validem e
exportem paginas frontend com um fluxo integrado:

```text
Builder Schema
  -> Renderer Mantine/React
  -> Editor visual WYSIWYG
  -> Painel de propriedades RJSF
  -> Editor JSON
  -> IA geradora de paginas e patches
  -> Exportador HTML
  -> Exportador React/TSX
  -> Persistencia local ou banco de dados
```

No MVP, a persistencia inicial e um arquivo `.builder.json` salvo no workspace. A
persistencia em banco de dados fica como evolucao futura.

## Separacao Do Core

O core gratuito do CyberVinci nao deve depender do UI Builder Extension. O core
nao deve conter WYSIWYG, Puck, painel RJSF completo, IA de geracao de paginas,
exportadores, templates premium, componentes premium, data binding visual ou
action designer visual.

A fronteira do produto e este pacote:

- `@cybervinci/builder`: integra os adapters Builder ao Theia e ao
  CyberVinci.
- O host que quiser habilitar o UI Builder deve declarar essa extensao
  explicitamente.
- A remocao da extensao deve remover apenas funcionalidades de UI Builder,
  preservando o CyberVinci core.

## Builder Schema

O Builder Schema e independente de biblioteca de UI. Ele descreve a pagina, seus
metadados, tema, fontes de dados, actions, estados, permissoes e arvore de
componentes.

Formato alvo resumido:

```ts
export interface BuilderDocument {
  schemaVersion: string;
  metadata: BuilderMetadata;
  page: BuilderPage;
  theme?: BuilderTheme;
  dataSources?: Record<string, BuilderDataSource>;
  actions?: Record<string, BuilderAction>;
  states?: Record<string, BuilderState>;
  permissions?: Record<string, BuilderPermissionRule>;
  tree: BuilderNode;
  aiHints?: BuilderAiHints;
}

export interface BuilderNode {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: BuilderNode[];
  slots?: Record<string, BuilderNode[]>;
  data?: BuilderNodeDataBinding;
  events?: Record<string, BuilderEventBinding>;
  visibility?: BuilderVisibilityRule;
  permissions?: BuilderPermissionRule[];
  style?: BuilderStyle;
  meta?: BuilderNodeMeta;
}
```

Regras centrais:

- `.builder.json` e a representacao canonica.
- O sistema nao salva Puck, JSX, TSX nem HTML bruto como fonte oficial.
- Alteracoes visuais, edicoes de propriedades e respostas de IA devem produzir
  mudancas validaveis no `BuilderDocument`.
- Eventos declarados no JSON chamam apenas actions registradas.
- Nao usar `eval` nem executar JavaScript arbitrario vindo do JSON.

## Pacotes

Os pacotes Builder sao separados por responsabilidade:

| Pacote | Papel |
| --- | --- |
| `@cybervinci/builder-schema` | Contrato TypeScript puro, validacao estrutural, helpers de arvore e migracoes. Nao deve importar React, Mantine, Puck, RJSF, Theia ou codigo de extensao. |
| `@cybervinci/builder-registry` | Catalogo de componentes, JSON Schema de props, defaults, categorias, slots e regras de filhos. |
| `@cybervinci/builder-renderer-mantine` | Renderer React/Mantine recursivo para preview e runtime React. |
| `@cybervinci/builder-editor-puck` | Adapter WYSIWYG que converte edicoes visuais em alteracoes no Builder Schema. |
| `@cybervinci/builder-property-panel-rjsf` | Painel de propriedades baseado no JSON Schema do componente selecionado. |
| `@cybervinci/builder-ai` | Camada de IA para operacoes JSON estruturadas, validacao, diff e preview antes de aplicar. |
| `@cybervinci/builder-export-html` | Exportador deterministico de `index.html` e `styles.css`. |
| `@cybervinci/builder-export-react` | Exportador futuro de React/TSX derivado do Builder Schema. |
| `@cybervinci/builder` | Extensao Theia/CyberVinci com comandos, custom editor, views e persistencia em workspace. |

## Fluxo MVP

O fluxo esperado do MVP e:

1. Criar ou abrir um arquivo `.builder.json`.
2. Validar o JSON como `BuilderDocument`.
3. Validar componentes, props, filhos, slots, eventos e data bindings contra o
   `ComponentRegistry`.
4. Renderizar preview com React/Mantine.
5. Editar o JSON diretamente e atualizar o preview.
6. Selecionar um componente e editar props pelo painel RJSF.
7. Arrastar e reordenar componentes no editor visual Puck, salvando sempre Builder
   Schema.
8. Pedir para IA gerar uma pagina ou alterar uma secao por operacoes JSON
   estruturadas.
9. Mostrar diff/preview e exigir aceite para alteracoes grandes.
10. Salvar o resultado como `.builder.json`.
11. Exportar HTML simples com `index.html` e `styles.css`.

Toda entrada externa, especialmente saida de IA, deve passar por parse,
validacao e checagem contra o registry antes de ser aplicada.

## Exemplos Para Validacao Visual

Os exemplos em `examples/builder/pages` podem ser abertos diretamente no builder.
Para validar uma pagina mais polida, use
`examples/builder/pages/premium-saas-showcase.builder.json`; ela exercita tema,
tokens, estilos inline, hero com imagem, metric cards, blocos comerciais e
actions.

## Limitacoes Conhecidas Do MVP

O MVP prioriza o fluxo funcional ponta a ponta do Builder Schema ate preview,
edicao, validacao, salvamento e exportacao HTML simples. Algumas capacidades sao
intencionalmente limitadas nesta fase:

- Componentes do registry podem ter renderizacao e propriedades ainda simples,
  especialmente componentes compostos como dashboards, marketing sections,
  tabelas avancadas, formularios dinamicos e placeholders de graficos.
- O exportador React/TSX fica preparado como pacote separado, mas sua entrega
  completa e posterior ao MVP. A saida canonica continua sendo `.builder.json`.
- A persistencia inicial usa arquivos `.builder.json` no workspace. Persistencia em
  banco de dados, colaboracao e historico centralizado ficam para evolucao
  futura.
- Recursos premium, templates pagos, componentes premium, data binding visual,
  action designer visual e empacotamento/licenciamento comercial ainda dependem
  de definicao futura de produto.
- A IA do MVP deve operar por operacoes JSON estruturadas, com validacao e
  aceite antes de aplicar alteracoes grandes; ela nao deve ser tratada como
  geradora livre de JSX, TSX ou HTML canonico.

## Comandos De Desenvolvimento

Na raiz do repositorio:

```bash
npm install
npm run compile
npm run lint
npm run test:cybervinci-core-without-builder
npm run start:browser
```

No pacote da extensao:

```bash
cd packages/builder
npm run compile
npm run lint
npm run test
npm run watch
```

Para compilar apenas este pacote via Lerna a partir da raiz:

```bash
npx lerna run compile --scope @cybervinci/builder
```

Para validar que a fronteira com o core gratuito continua preservada:

```bash
npm run test:cybervinci-core-without-builder
```

## Documentacao Relacionada

- [`docs/builder-architecture.md`](../../docs/builder-architecture.md)
- [`docs/builder-schema.md`](../../docs/builder-schema.md)
- [`docs/builder-component-registry.md`](../../docs/builder-component-registry.md)
- [`docs/builder-new-component-guide.md`](../../docs/builder-new-component-guide.md)
- [`docs/builder-exporters.md`](../../docs/builder-exporters.md)
- [`mudanças-futuras/PRD-implementacao-cybervinci-ui-builder-ralph.md`](../../mudanças-futuras/PRD-implementacao-cybervinci-ui-builder-ralph.md)
