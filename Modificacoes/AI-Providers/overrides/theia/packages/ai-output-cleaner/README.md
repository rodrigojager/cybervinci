# @cybervinci/ai-output-cleaner

Implementação atual do *CyberVinci AI Output Cleaner* após as fases 4-8, com a validação de superfície da Fase 9 focada em documentação e contratos leves de produto.

## Estado real atual

O pacote já entrega:

- extensão Theia com frontend e backend;
- interceptação de tool results da IDE via `TheiaToolCallInterceptor`;
- pipeline determinístico de limpeza em `AIOutputCleanerService`;
- persistência de output bruto e metadados em `AIOutputCleanerArtifactStore`;
- rastreamento de processos e snapshots de status via `AIOutputCleanerStatusTracker`;
- preparação de wrappers PATH para CLIs suportadas;
- resolução de ambiente por sessão para Codex CLI;
- suporte opcional a hooks do Codex com artefatos locais e bloco gerenciado em `~/.codex/config.toml`;
- contratos de adapter para evolução multi-CLI.

O pacote está incluído hoje nos hosts browser e electron do produto, então a superfície validada não é apenas interna ao pacote: comandos, status e artifacts fazem parte do shell CyberVinci carregado em produção.

## Superfície exposta

### Preferências

As preferências públicas continuam sob `cybervinci.aiOutputCleaner.*`, incluindo:

- `enabled`
- `mode`
- `codex.enabled`
- `codex.wrappers.enabled`
- `codex.hooks.enabled`
- `theiaTools.enabled`
- `rawArtifacts.enabled`
- `statusAware.enabled`
- `showFilteringNotice`
- `wrapperCommands`
- `literalBypassPatterns`
- `statusIntentPatterns`

### Comandos

Os comandos públicos registrados pela extensão são:

- `cybervinci.aiOutputCleaner.enable`
- `cybervinci.aiOutputCleaner.disable`
- `cybervinci.aiOutputCleaner.emergencyDisable`
- `cybervinci.aiOutputCleaner.showStatus`
- `cybervinci.aiOutputCleaner.openArtifacts`
- `cybervinci.aiOutputCleaner.recreateWrappers`
- `cybervinci.aiOutputCleaner.installCodexHooks`
- `cybervinci.aiOutputCleaner.removeCodexHooks`
- `cybervinci.aiOutputCleaner.toggleSessionBypass`
- `cybervinci.aiOutputCleaner.sendRawOutput`

Esses comandos formam a superfície atual de UI/operador da Fase 9. Ainda não existe um widget visual dedicado; o status observável é entregue hoje por mensagens estruturadas e acesso aos artifacts.

## Comportamento implementado

### Limpeza determinística

O `AIOutputCleanerService` já cobre os comportamentos centrais planejados:

- bypass por intenção literal para casos como mojibake, encoding e conteúdo textual sensível;
- preservação de `git diff` e de comandos desconhecidos;
- redução segura de ruído conhecido em `git status`;
- tratamento de ANSI controlado por modo;
- preservação de sinais de progresso/status quando a intenção ou o estado do processo exigem isso.

### Interceptação e artifacts

Quando a interceptação frontend está habilitada:

- tool results elegíveis da IDE passam pelo cleaner antes de chegar ao modelo;
- o output bruto continua disponível por artifact local;
- o resultado pode carregar aviso determinístico apontando para `cybervinci://output-artifact/<id>`;
- a conversa ativa pode ser colocada em bypass temporário;
- o artifact bruto mais recente da sessão pode ser reenviado ao agente.

### Ambiente Codex CLI

Para sessões Codex, o backend já sabe:

- resolver variáveis de ambiente da sessão;
- injetar `PATH` com wrappers somente no processo do agente;
- respeitar kill switch por ambiente;
- recriar wrappers configurados;
- detectar/preparar/instalar/remover hooks do Codex sem depender exclusivamente deles.

## Contratos de backend disponíveis

O serviço RPC público expõe:

- `getArtifactRootPath()`
- `recreateWrappers(commands?)`
- `installCodexHooks()`
- `removeCodexHooks()`
- `setCodexHooksRuntimeEnabled(enabled)`
- `saveArtifact(record)`
- `listRecentArtifacts(query?)`
- `readRawArtifact(artifactId)`
- `recordToolResult(record)`
- `getStatus(query?)`
- `getSessionOverride(sessionId)`
- `setSessionBypass(sessionId, bypassFiltering)`

O snapshot de status inclui artifacts recentes, processos ativos/recentes, filtros aplicados, último processo observado e diagnóstico de readiness/configuração dos hooks Codex.

## Limites conhecidos

- Não há componente visual dedicado com rendering próprio; a experiência atual é comandada por comandos e mensagens.
- A validação de Fase 9 nesta rodada é contratual/documental, não Playwright específica do cleaner.
- O suporte multi-CLI está preparado por adapter registry, mas o caminho implementado de ponta a ponta continua centrado em Codex.
