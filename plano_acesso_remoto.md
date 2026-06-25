# Plano de acesso remoto do CyberVinci

Objetivo
=======

Criar uma camada de acesso remoto para o CyberVinci começando por um MVP via Telegram Bot, com custo operacional praticamente zero para o CyberVinci, sem exigir app mobile proprio no primeiro momento e mantendo a arquitetura desacoplada para nao dificultar updates futuros do Theia.

A ideia principal e:

- O CyberVinci Desktop continua sendo o host real do workspace, arquivos, Flow, AI Chat, providers e permissoes.
- O Telegram vira o primeiro cliente remoto, usando o app que o usuario ja tem instalado.
- O usuario cria ou conecta o proprio bot do Telegram, entao o CyberVinci nao precisa manter relay, push, app store, servidor WebSocket ou infraestrutura de trafego pesado no MVP.
- A configuracao precisa ser guiada por wizard, no estilo "responda e o CyberVinci deixa pronto".
- O acesso remoto deve ser seguro por padrao, com allowlist, perfis de permissao, segunda senha para elevacao e trilha de auditoria.
- A evolucao natural depois e permitir outros canais: outro CyberVinci como cliente remoto, web app, app mobile proprio e CyberVinci Cloud Remote pago.

Escopo do MVP
=============

O MVP deve entregar controle remoto funcional via Telegram sem cloud propria:

1. Parear um bot do Telegram com o CyberVinci Desktop.
2. Permitir conversa remota com o AI Chat usando o provider/modelo/workdir atuais.
3. Listar e acompanhar Flows.
4. Executar Flow aprovado.
5. Explorar arquivos dentro dos workdirs permitidos.
6. Receber arquivos/imagens enviados pelo Telegram como anexos/contexto.
7. Tirar screenshot do CyberVinci ou da tela/editor ativo quando permitido.
8. Solicitar aprovacoes remotas com botoes inline.
9. Exigir segunda senha para operacoes sensiveis.
10. Registrar tudo em audit log local.

Fora do MVP:

- Streaming de tela em tempo real.
- Controle de mouse/teclado remoto.
- App mobile proprio.
- Relay cloud CyberVinci.
- Wake-on-LAN ou wake remoto confiavel.
- Sincronizacao historica entre varios dispositivos.
- Times/organizacoes com politicas centralizadas.

Principios de arquitetura
=========================

1. Desacoplado do Theia core
---------------------------

Implementar como packages/extensoes CyberVinci, preferencialmente em Modificacoes e instalados no Workload/theia por mecanismo semelhante aos demais recursos desacoplados.

Pacotes sugeridos:

- @cybervinci/remote-core
- @cybervinci/remote-telegram
- @cybervinci/remote-ui
- @cybervinci/remote-audit
- @cybervinci/remote-security

O pacote remote-core define contratos e servicos. O remote-telegram implementa apenas o canal Telegram. O remote-ui implementa wizard, status bar e paineis. O remote-audit centraliza eventos. O remote-security centraliza permissoes, segunda senha e secrets.

2. Um roteador remoto unico
---------------------------

Nao criar um hook separado para cada provider, Flow, editor ou comando. Criar uma camada comum:

RemoteCommandRouter

Ela recebe comandos remotos normalizados:

- chat.send
- chat.cancel
- flow.list
- flow.run
- flow.watch
- flow.cancel
- file.list
- file.read
- file.search
- file.upload
- file.openInCyberVinci
- screenshot.capture
- approval.respond
- status.get
- workdir.get
- workdir.set

Cada comando passa por:

1. Validacao de canal e identidade.
2. Resolucao de sessao remota.
3. Validacao de permissao.
4. Checagem de segunda senha quando necessario.
5. Execucao via servicos internos do CyberVinci.
6. Registro em audit log.
7. Resposta formatada para o canal.

3. Permissao por perfil, nao por comando solto
---------------------------------------------

Perfis iniciais:

- Read Only
  Pode ver status, providers, workdir, flows, arquivos permitidos e screenshots se autorizado.

- Chat
  Pode conversar com o AI Chat e anexar contexto, mas nao pode aplicar edicoes nem executar comandos sensiveis.

- Flow Operator
  Pode listar, iniciar, acompanhar e cancelar Flows permitidos.

- Developer
  Pode abrir arquivos, pedir diffs, aplicar patches aprovados e rodar comandos pre-aprovados.

- Admin
  Pode alterar configuracoes remotas, trocar provider/modelo, mudar workdir permitido e gerenciar outros usuarios remotos.

Cada perfil deve ter limites explicitos:

- workdirs permitidos
- comandos permitidos
- precisa ou nao de segunda senha
- pode ler arquivo
- pode escrever arquivo
- pode executar shell
- pode rodar Flow
- pode capturar screenshot
- pode receber anexos
- pode trocar provider/modelo
- pode trocar workdir

4. Seguro por padrao
--------------------

O estado inicial apos instalar deve ser "Remote desativado".

Ao ativar:

- Nao aceitar qualquer usuario do Telegram.
- Nao aceitar grupos por padrao.
- Nao executar shell por padrao.
- Nao permitir escrita fora do workdir por padrao.
- Nao permitir delete/move por padrao.
- Nao permitir trocar workdir para fora da lista permitida sem segunda senha.
- Nao salvar token em arquivo texto.
- Nao exibir token inteiro na UI depois de salvo.

Camadas
=======

Camada 1: Remote Core
---------------------

Responsabilidades:

- Definir modelos de dados.
- Registrar canais remotos.
- Manter sessoes remotas.
- Normalizar comandos.
- Controlar status do gateway.
- Expor eventos para UI e audit.

Servicos:

- RemoteGatewayService
  Liga/desliga o acesso remoto, registra canais e mantem estado geral.

- RemoteChannelRegistry
  Permite que Telegram, app mobile, outro CyberVinci ou web client sejam adicionados sem mudar o core.

- RemoteCommandRouter
  Recebe comandos normalizados e chama os servicos de destino.

- RemoteSessionService
  Mapeia usuario remoto, canal, device, permissoes e sessao ativa.

- RemoteContextService
  Resolve workdir, provider, modelo, playbook, virtual tools e modo de execucao que devem ser usados em cada comando.

- RemoteResponseFormatter
  Converte resultados internos em mensagens curtas, botoes, anexos, previews e erros amigaveis.

Modelos de dados:

RemoteProfile
- id
- name
- enabled
- channelIds
- defaultWorkdir
- allowedWorkdirs
- defaultPermissionProfileId
- requireSecondPasswordForElevation
- createdAt
- updatedAt

RemoteChannel
- id
- type: telegram | cybervinci-client | web | mobile
- enabled
- displayName
- credentialRef
- transportMode
- health
- lastSeenAt

RemoteActor
- id
- channelType
- channelUserId
- displayName
- username
- allowed
- permissionProfileId
- secondFactorRequired
- createdAt
- revokedAt

RemotePermissionProfile
- id
- name
- canChat
- canReadFiles
- canWriteFiles
- canRunFlows
- canCancelFlows
- canCaptureScreenshots
- canRunShell
- canChangeProvider
- canChangeWorkdir
- requireApprovalForWrite
- requireApprovalForShell
- requireSecondPasswordForSensitive
- allowedWorkdirPatterns
- deniedPathPatterns
- allowedShellCommands

RemoteCommand
- id
- actorId
- channelId
- type
- rawText
- payload
- requestedAt
- status
- approvalId
- resultSummary

RemoteApproval
- id
- commandId
- actorId
- actionLabel
- riskLevel
- expiresAt
- status
- secondPasswordRequired
- metadata

RemoteAuditEvent
- id
- actorId
- channelId
- commandId
- type
- severity
- message
- metadata
- createdAt

Camada 2: Telegram Channel
--------------------------

Responsabilidades:

- Guardar token do bot em secret storage.
- Fazer long polling contra Telegram Bot API.
- Processar updates.
- Validar allowlist.
- Converter mensagens em RemoteCommand.
- Enviar respostas.
- Enviar botoes inline para aprovacao.
- Baixar anexos permitidos.
- Enviar arquivos/imagens geradas pelo CyberVinci.

Modo de transporte do MVP:

- Long polling.
- O CyberVinci Desktop faz conexoes HTTPS de saida para o Telegram.
- Nao precisa abrir porta no roteador.
- Nao precisa dominio.
- Nao precisa webhook.
- Nao precisa servidor CyberVinci.

Webhook pode ser uma opcao futura para quem usar servidor proprio, mas nao deve ser o padrao do MVP.

Comandos Telegram iniciais:

/start
Inicia pareamento ou mostra ajuda se ja pareado.

/pair <codigo>
Conclui pareamento com codigo exibido no CyberVinci.

/status
Mostra status do CyberVinci: online, workdir, provider/modelo, flows ativos, ultimo chat.

/chat <mensagem>
Envia mensagem para o AI Chat.

/stop
Cancela resposta ativa do AI Chat, se suportado pelo provider/camada atual.

/flow
Lista comandos de Flow.

/flow list
Lista flows disponiveis.

/flow run <nome>
Solicita execucao de Flow.

/flow watch <id>
Assina progresso resumido de um Flow.

/flow stop <id>
Solicita cancelamento de Flow.

/files
Lista diretorios permitidos do workdir atual.

/ls <path>
Lista diretorio.

/cat <path>
Mostra trecho de arquivo de texto.

/search <termo>
Busca no workdir permitido.

/open <path>
Abre arquivo dentro do CyberVinci.

/screenshot
Captura screenshot permitida.

/workdir
Mostra workdir atual e workdirs permitidos.

/workdir set <alias>
Troca para workdir permitido.

/provider
Mostra provider/modelo atual.

/help
Mostra comandos disponiveis conforme permissao do usuario.

/logout
Revoga a sessao remota daquele usuario.

Formato das respostas:

- Mensagens curtas por padrao.
- Resumo primeiro, detalhes por botao "Ver detalhes".
- Botoes inline para acoes:
  - Aprovar
  - Rejeitar
  - Ver diff
  - Abrir no CyberVinci
  - Cancelar
  - Rodar testes
  - Continuar
- Para respostas longas, enviar arquivo .md ou dividir em blocos.
- Para progresso, usar edicao de mensagem quando possivel, evitando spam.

Tratamento de anexos:

- Imagem enviada no Telegram:
  - salvar em pasta temporaria controlada;
  - registrar audit;
  - oferecer botao "Usar como contexto no chat";
  - opcionalmente abrir no CyberVinci.

- Documento enviado:
  - validar tamanho;
  - validar extensao;
  - salvar em staging;
  - pedir aprovacao antes de copiar para workdir.

- Screenshot do CyberVinci:
  - capturar janela/editor ativo;
  - remover ou avisar sobre informacoes sensiveis;
  - enviar como imagem no Telegram.

Camada 3: Security
------------------

Segunda senha:

A segunda senha nao deve ser a senha do Telegram, nem a senha do sistema operacional.

Ela deve ser criada no wizard:

- Campo: senha.
- Campo: confirmar senha.
- Indicador de forca.
- Opcao: exigir biometria/passkey futuramente quando existir app proprio.
- Opcao: exigir sempre para escrita/shell/admin.

Armazenamento:

- Guardar hash forte com salt local.
- Nunca guardar senha em texto claro.
- Preferir Argon2id se disponivel; fallback scrypt/PBKDF2 se o ambiente limitar.
- Guardar segredo/token do Telegram em secret storage/keychain do Theia/Electron.

Step-up de permissao:

Uma acao sensivel gera um desafio:

1. Telegram mostra:
   "Esta acao exige segunda senha: aplicar patch em 3 arquivos."
2. Usuario envia:
   /approve <codigo>
3. Bot responde pedindo a segunda senha em mensagem separada.
4. CyberVinci valida a senha.
5. Se correta, libera apenas aquela acao ou libera por janela curta configuravel.
6. A mensagem com senha deve ser apagada quando possivel ou o bot deve orientar o usuario a apagar.

Observacao:

Telegram nao e canal ideal para segredos altamente sensiveis. O wizard deve avisar isso. Para ambientes empresariais, a recomendacao futura deve ser app proprio, WebAuthn/passkey ou canal E2EE controlado pelo CyberVinci.

Allowlist:

- No pareamento, gravar telegram user id numerico.
- Nao confiar apenas em username, porque username pode mudar.
- Grupos desativados por padrao.
- Se grupos forem ativados:
  - exigir mention explicita do bot;
  - exigir allowlist de chat id;
  - limitar permissoes;
  - nunca permitir shell/admin em grupo por padrao.

Limites:

- Rate limit por usuario.
- Rate limit global.
- Tamanho maximo de prompt.
- Tamanho maximo de arquivo.
- Timeout por comando.
- Expiracao de aprovacoes.
- Bloqueio temporario apos tentativas erradas de segunda senha.

Camada 4: AI Chat remoto
------------------------

Integracao:

- Usar os mesmos servicos internos do AI Chat.
- Respeitar provider/modelo/modo/playbook/virtual tools/workdir atuais quando o usuario nao especificar outro contexto.
- Permitir override explicito no comando, se permitido:
  - /chat --provider "OpenCode Zen" "mensagem"
  - /chat --model "modelo" "mensagem"
  - /chat --workdir "alias" "mensagem"

Regras:

- Se o comando vier sem provider/modelo, usar o estado atual do CyberVinci.
- Se vier com provider/modelo, validar permissao.
- Se mudar workdir, validar allowedWorkdirs.
- Se houver playbook ativo no chat atual, deixar claro na resposta.
- Se a resposta foi cancelada, descartar resultado tardio quando o provider nao respeitar cancelamento.

Respostas:

- Streaming remoto por edicao de mensagem quando possivel.
- Se a resposta for longa, enviar arquivo .md.
- Se a IA solicitar acao sensivel, converter em RemoteApproval.

Camada 5: Flow remoto
---------------------

Objetivo:

Permitir iniciar, acompanhar e cancelar Flows remotamente.

Comandos:

- /flow list
- /flow run <nome>
- /flow run <nome> input:"..."
- /flow watch <runId>
- /flow stop <runId>
- /flow artifacts <runId>

Execucao:

- O Flow roda no desktop, como hoje.
- Inputs remotos devem ser materializados como artefatos reais do run.
- O Telegram recebe status resumido:
  - fila
  - etapa atual
  - sucesso/falha
  - artefatos criados
  - aprovacoes pendentes

Aprovacoes:

Quando uma etapa do Flow tenta:

- editar arquivo;
- executar shell;
- instalar pacote;
- enviar dado externo;
- trocar provider/modelo;
- acessar fora do workdir;

o RemoteApprovalService deve enviar uma mensagem no Telegram com botoes.

Camada 6: Files e Workdir
-------------------------

Objetivo:

Permitir explorar e abrir arquivos com seguranca.

Conceitos:

- Workdir atual:
  O mesmo exibido no CyberVinci AI Workdir.

- Workdirs permitidos:
  Lista configurada no wizard.

- Alias:
  Nome curto para cada workdir, por exemplo:
  - projeto
  - modificacoes
  - workload

Comandos:

- /workdir
- /workdir set projeto
- /files
- /ls .
- /cat README.md
- /search "RemoteGatewayService"
- /open src/app.ts

Regras:

- Resolver path canonico antes de executar.
- Bloquear path traversal.
- Bloquear acesso fora dos workdirs permitidos.
- Esconder arquivos sensiveis por padrao:
  - .env
  - secrets
  - node_modules
  - .git internals
  - chaves privadas
  - arquivos muito grandes

Ao abrir arquivo:

- O arquivo deve abrir dentro do CyberVinci Desktop.
- Se o usuario remoto pediu "abrir e mostrar diff", abrir o diff quando existir.
- Se o arquivo mudou por acao remota, atualizar editor/diff.

Camada 7: Screenshot
--------------------

Objetivo:

Permitir que o usuario veja o estado do CyberVinci sem app remoto completo.

Modos:

- screenshot do editor ativo;
- screenshot da janela CyberVinci;
- screenshot de Flow atual;
- screenshot de diff atual;
- screenshot do preview/canvas quando ativo.

Regras:

- Desativado por padrao em perfis Read Only se o usuario nao marcar explicitamente.
- Avisar no wizard que screenshots podem conter segredos.
- Permitir "blur secrets" no futuro, mas nao depender disso no MVP.
- Registrar audit log.

Camada 8: Audit
---------------

Tudo que chega remoto precisa gerar trilha.

Eventos:

- canal ativado/desativado;
- bot pareado;
- usuario autorizado/revogado;
- comando recebido;
- comando rejeitado por permissao;
- acao aprovada/rejeitada;
- segunda senha correta/incorreta;
- arquivo lido;
- arquivo aberto;
- arquivo modificado;
- Flow iniciado/cancelado;
- screenshot capturada;
- provider/modelo/workdir alterado;
- erro de execucao.

UI:

- Painel "Remote Audit".
- Filtros por usuario, canal, severidade, comando, data.
- Botao "Revogar acesso".
- Botao "Exportar log".

Wizard de configuracao
======================

Entrada do wizard:

Menu:

- CyberVinci > Remote Access
- Status bar: "Remote: Off"
- Command Palette: "CyberVinci Remote: Configure"

Formato:

- Wizard em modal/painel central.
- Passos laterais ou timeline no topo.
- Cada passo com validacao inline.
- Botao "Testar" quando aplicavel.
- Botao "Voltar" sem perder dados.
- Botao "Salvar e ativar" apenas no final.

Passo 1: Escolher tipo de acesso remoto
---------------------------------------

Texto:

"Escolha como voce quer controlar o CyberVinci remotamente. Para o primeiro setup, Telegram e o caminho mais simples: nao exige abrir portas, instalar app proprio ou contratar cloud."

Elementos:

- Radio cards.

Opcoes:

1. Telegram Bot (recomendado)
   Descricao: Use o app Telegram para conversar com o CyberVinci, iniciar flows, ver status, explorar arquivos e aprovar acoes.

2. Outro CyberVinci
   Descricao: Conectar uma instancia do CyberVinci a outra como workspace remoto. Fase futura.

3. Web/App CyberVinci Cloud
   Descricao: Acesso remoto gerenciado, com relay, push e conta CyberVinci. Fase futura.

4. Local/LAN apenas
   Descricao: Permite testes e automacoes locais sem internet externa.

Processamento:

- Se selecionar Telegram, continuar.
- Se selecionar opcao futura, mostrar roadmap e permitir cadastrar interesse, mas nao bloquear MVP.

Passo 2: Explicar o modelo de seguranca
---------------------------------------

Texto:

"O Telegram sera usado como canal de controle. O CyberVinci Desktop continua sendo o host. O bot so obedecera usuarios pareados e permitidos. Acoes sensiveis podem exigir segunda senha."

Elementos:

- Checklist informativa com icones.
- Toggle:
  "Exigir segunda senha para acoes sensiveis" ligado por padrao e bloqueado no MVP.
- Link "Ver detalhes tecnicos".

Checks exibidos:

- Bot nao aceita usuarios desconhecidos.
- Token fica salvo no secret storage.
- Workdir remoto e limitado.
- Shell e escrita exigem aprovacao.
- Audit log fica ativo.

Processamento:

- Criar draft RemoteProfile.
- Marcar secondFactorRequired = true.

Passo 3: Criar ou informar bot do Telegram
------------------------------------------

Texto:

"Crie um bot no @BotFather e cole o token aqui. O CyberVinci usara esse bot para receber comandos e enviar respostas."

Elementos:

- Campo password: "Bot token".
- Botao "Mostrar".
- Botao "Colar".
- Botao "Abrir instrucoes do BotFather".
- Validacao inline.

Instrucoes exibidas:

1. Abra o Telegram.
2. Procure @BotFather.
3. Envie /newbot.
4. Escolha nome e username.
5. Copie o token gerado.
6. Cole no CyberVinci.

Validacao:

- Formato basico do token.
- Chamar getMe na Bot API.
- Confirmar nome e username do bot.

Resultado:

- Mostrar:
  "Bot encontrado: @nome_do_bot"

Erros:

- Token invalido.
- Sem internet.
- Telegram indisponivel.
- Bot bloqueado/revogado.

Processamento:

- Nao salvar definitivo ainda.
- Guardar token temporariamente em memoria ate o passo final.
- Se getMe funcionar, gerar channel draft.

Passo 4: Parear usuario
-----------------------

Texto:

"Agora vamos autorizar o seu usuario do Telegram. Somente usuarios pareados poderao controlar o CyberVinci."

Elementos:

- Codigo grande de 6 digitos.
- Botao "Copiar comando".
- Link/botao "Abrir Telegram".
- Estado ao vivo:
  - Aguardando /start
  - Aguardando /pair 123456
  - Usuario detectado
  - Pareado

Comando sugerido:

/pair 123456

Processamento:

- Iniciar long polling temporario.
- Receber update.
- Ler chat id, user id, username, first_name, last_name.
- Validar codigo.
- Criar RemoteActor draft.
- Mostrar dados do usuario para confirmacao.

Elementos de confirmacao:

- Card:
  - Nome
  - Username
  - Telegram user id
  - Tipo: usuario privado

- Botao:
  "Autorizar este usuario"

Seguranca:

- Codigo expira em 5 minutos.
- Gerar novo codigo se expirar.
- Limitar tentativas.

Passo 5: Definir perfil de permissao
------------------------------------

Texto:

"Escolha o que este usuario podera fazer remotamente."

Elementos:

- Radio cards para presets.
- Lista de permissoes detalhadas com checkboxes.
- Tooltips curtos.
- Indicador de risco: Baixo, Medio, Alto.

Presets:

1. Monitor
   - status
   - flows read-only
   - arquivos read-only limitados
   - sem chat executavel
   - sem escrita
   - sem shell

2. Chat remoto
   - AI Chat
   - anexos
   - status
   - leitura limitada
   - sem escrita automatica

3. Flow operator
   - AI Chat
   - listar/rodar/cancelar Flow
   - aprovar etapas
   - ler artefatos

4. Developer supervisionado
   - AI Chat
   - Flow
   - abrir arquivos
   - aplicar patches com aprovacao
   - rodar comandos permitidos
   - segunda senha para acoes sensiveis

5. Admin remoto
   - tudo acima
   - gerenciar provider/modelo
   - gerenciar workdirs
   - gerenciar usuarios remotos
   - exige segunda senha

Processamento:

- Criar RemotePermissionProfile.
- Aplicar deny por padrao para shell/delete/move/admin se usuario nao marcar explicitamente.

Passo 6: Escolher workdirs permitidos
-------------------------------------

Texto:

"O acesso remoto precisa saber quais pastas podem ser usadas. Por padrao, use apenas o workdir atual."

Elementos:

- Lista de workdirs.
- Botao "Adicionar pasta".
- Folder picker.
- Campo "Alias".
- Toggle "Permitir subpastas".
- Toggle "Somente leitura".
- Botao "Usar workdir atual".

Colunas:

- Alias
- Caminho
- Permissao
- Padrao
- Remover

Sugestoes:

- CyberVinci workspace atual
- Workload
- Modificacoes

Processamento:

- Resolver caminhos absolutos.
- Validar existencia.
- Bloquear paths de sistema sensiveis se possivel.
- Criar allowedWorkdirs.
- Definir defaultWorkdir.

Passo 7: Segunda senha
----------------------

Texto:

"Crie uma segunda senha para confirmar acoes sensiveis pelo acesso remoto."

Elementos:

- Password input: "Segunda senha".
- Password input: "Confirmar senha".
- Indicador de forca.
- Checkboxes:
  - Exigir para editar arquivos.
  - Exigir para executar shell.
  - Exigir para trocar workdir.
  - Exigir para trocar provider/modelo.
  - Exigir para screenshots.

Defaults:

- editar arquivos: ligado
- executar shell: ligado
- trocar workdir: ligado
- trocar provider/modelo: ligado
- screenshots: opcional, desligado por padrao no perfil Developer, ligado no Admin se desejado

Processamento:

- Gerar salt.
- Gerar hash forte.
- Guardar apenas hash.
- Definir janela opcional de desbloqueio:
  - 0 min: sempre pedir
  - 5 min
  - 15 min

Padrao:

- Sempre pedir para shell/admin.
- 5 minutos para edicoes, se o usuario escolher.

Passo 8: Provider, modelo e contexto remoto
-------------------------------------------

Texto:

"Defina como comandos remotos devem escolher provider, modelo, playbook, Flow e workdir."

Elementos:

- Segmented control:
  - Usar estado atual do CyberVinci
  - Fixar configuracao remota
  - Perguntar quando necessario

Campos se fixar:

- Select: Provider
- Select: Modelo
- Select: Modo
- Select: Playbook padrao
- Select: Workdir padrao

Toggles:

- Permitir trocar provider pelo Telegram.
- Permitir trocar modelo pelo Telegram.
- Permitir trocar playbook pelo Telegram.
- Permitir trocar workdir pelo Telegram.

Processamento:

- Usar servicos existentes do AI Chat/provider.
- Nao duplicar lista de providers.
- Ler do mesmo registro/configuracao visual do CyberVinci.
- Se o provider atual nao estiver disponivel, responder com erro claro e sugerir /provider.

Passo 9: Comandos habilitados
-----------------------------

Texto:

"Revise os comandos que ficarao disponiveis para este usuario."

Elementos:

- Tabela com comando, descricao, risco, permitido.
- Checkboxes por comando.
- Botao "Selecionar preset".

Comandos agrupados:

- Status
- Chat
- Flow
- Arquivos
- Screenshot
- Provider/modelo
- Admin

Processamento:

- Gerar command allowlist derivada do perfil.
- Permitir remover comandos mesmo que o perfil permita.
- Nao permitir adicionar comandos acima do perfil sem trocar perfil.

Passo 10: Teste de conexao
--------------------------

Texto:

"Vamos testar se o bot consegue receber comandos e responder."

Elementos:

- Progress timeline.
- Botao "Enviar teste".
- Painel de logs resumido.

Testes:

1. Token valido.
2. Long polling funcionando.
3. Usuario pareado.
4. /status responde.
5. /help responde com comandos corretos.
6. Permissoes aplicadas.
7. Audit log gravando.
8. Secret storage disponivel.

Processamento:

- Enviar mensagem ao Telegram:
  "CyberVinci Remote configurado. Envie /status para testar."
- Esperar resposta do usuario ou simular resposta via comando interno se possivel.

Resultado:

- Tudo OK: habilitar "Ativar Remote".
- Falha parcial: mostrar item exato e acao corretiva.

Passo 11: Revisao final
-----------------------

Texto:

"Revise a configuracao antes de ativar."

Elementos:

- Sumario:
  - Canal: Telegram
  - Bot: @nome
  - Usuario autorizado
  - Perfil
  - Workdirs
  - Segunda senha
  - Comandos habilitados

- Checkbox obrigatorio:
  "Entendo que mensagens e anexos passam pela infraestrutura do Telegram."

- Botoes:
  - Salvar sem ativar
  - Salvar e ativar

Processamento:

- Persistir RemoteProfile.
- Persistir RemoteActor.
- Persistir RemotePermissionProfile.
- Persistir token no secret storage.
- Iniciar RemoteGatewayService.
- Registrar status bar.
- Registrar audit event.

Passo 12: Tela de sucesso
-------------------------

Texto:

"Acesso remoto via Telegram ativado."

Elementos:

- Status do bot.
- Comandos principais.
- Botao "Abrir Telegram".
- Botao "Ver audit log".
- Botao "Configurar outro usuario".
- Botao "Desativar acesso remoto".

Comandos exibidos:

- /status
- /chat revisar ultimo erro
- /flow list
- /files
- /screenshot

Status bar
==========

Adicionar item no rodape:

Remote: Off
Remote: Telegram
Remote: 1 actor
Remote: Running
Remote: Error

Ao clicar:

- Abre popover ancorado.

Popover:

- Canal ativo.
- Bot username.
- Usuarios autorizados.
- Ultimo comando.
- Botao "Pausar".
- Botao "Abrir wizard".
- Botao "Audit log".
- Botao "Revogar todos".

Indicadores:

- Branco/cinza: desativado.
- Azul/verde: ativo e saudavel.
- Amarelo: precisa atencao.
- Vermelho: erro ou token invalido.

UI de configuracao
==================

Paineis:

1. Remote Access
   - estado geral
   - canais
   - usuarios
   - permissoes
   - logs

2. Remote Channels
   - Telegram
   - futuro: CyberVinci-to-CyberVinci
   - futuro: Cloud Remote

3. Remote Users
   - lista de atores autorizados
   - perfil
   - ultimo acesso
   - revogar

4. Remote Audit
   - tabela filtravel
   - exportar
   - detalhes

Implementacao tecnica passo a passo
===================================

Fase 0: Preparacao
------------------

1. Localizar os pontos de extensao atuais do AI Chat, Flow, FileSystem, status bar, secret storage e quick command.
2. Confirmar onde ficam os pacotes desacoplados em Modificacoes.
3. Confirmar mecanismo de instalacao/sync para Workload/theia.
4. Definir nomes finais dos pacotes.
5. Criar ADR curto:
   - Telegram long polling como MVP.
   - Sem cloud CyberVinci no MVP.
   - remote-core provider-agnostic.
   - permissoes por perfil.

Entregaveis:

- Documento ADR.
- Mapa de servicos internos existentes.
- Lista de comandos remotos MVP.

Fase 1: remote-core
-------------------

1. Criar package @cybervinci/remote-core.
2. Definir interfaces:
   - RemoteChannel
   - RemoteCommand
   - RemoteActor
   - RemotePermissionProfile
   - RemoteApproval
   - RemoteAuditEvent
3. Implementar RemoteChannelRegistry.
4. Implementar RemoteCommandRouter.
5. Implementar RemotePermissionService.
6. Implementar RemoteSessionService.
7. Implementar RemoteAuditService basico.
8. Implementar storage local de configuracao.
9. Criar testes unitarios de:
   - comando permitido;
   - comando negado;
   - path fora do workdir;
   - actor nao autorizado;
   - approval expirado.

Fase 2: remote-security
-----------------------

1. Integrar secret storage/keychain para token.
2. Implementar hash da segunda senha.
3. Implementar validacao de segunda senha.
4. Implementar step-up token temporario.
5. Implementar rate limit.
6. Implementar bloqueio apos tentativas erradas.
7. Implementar revogacao de actor.
8. Criar testes unitarios.

Fase 3: remote-telegram
-----------------------

1. Criar package @cybervinci/remote-telegram.
2. Implementar TelegramBotApiClient:
   - getMe
   - getUpdates
   - sendMessage
   - editMessageText
   - answerCallbackQuery
   - sendPhoto
   - sendDocument
   - getFile
   - downloadFile
3. Implementar long polling com backoff.
4. Implementar parser de comandos.
5. Implementar botoes inline.
6. Implementar pairing.
7. Implementar allowlist.
8. Implementar envio de mensagens longas em blocos.
9. Implementar tratamento de anexos.
10. Criar mocks para testes.

Fase 4: integracao AI Chat
--------------------------

1. Criar RemoteChatService adapter.
2. Conectar com o servico atual do AI Chat.
3. Enviar prompt remoto.
4. Receber resposta.
5. Implementar cancelamento remoto.
6. Implementar descarte de resposta tardia quando cancelada.
7. Implementar resumo/arquivo para respostas longas.
8. Garantir que provider/modelo/workdir usados sejam reportados na resposta.

Fase 5: integracao Flow
-----------------------

1. Criar RemoteFlowService.
2. Listar flows disponiveis.
3. Iniciar flow com input remoto.
4. Materializar input como artefato do run.
5. Acompanhar progresso.
6. Enviar updates resumidos para Telegram.
7. Cancelar run.
8. Listar artefatos.
9. Gerar aprovacoes quando Flow pedir operacao sensivel.

Fase 6: arquivos e workdir
--------------------------

1. Criar RemoteFileService.
2. Resolver path canonico.
3. Validar allowedWorkdirs.
4. Implementar list/read/search/open.
5. Bloquear arquivos sensiveis.
6. Implementar staging de uploads.
7. Abrir arquivo no CyberVinci.
8. Atualizar editor/diff apos mudancas.

Fase 7: screenshots
-------------------

1. Criar RemoteScreenshotService.
2. Capturar janela/editor ativo.
3. Capturar Flow atual se ativo.
4. Capturar diff atual se ativo.
5. Enviar imagem pelo Telegram.
6. Aplicar permissao e audit.

Fase 8: wizard e UI
-------------------

1. Criar package @cybervinci/remote-ui.
2. Registrar comando "CyberVinci Remote: Configure".
3. Criar wizard com os 12 passos.
4. Implementar validacao por etapa.
5. Implementar status bar.
6. Implementar painel Remote Access.
7. Implementar painel Remote Audit.
8. Implementar revogacao.
9. Implementar teste de conexao.

Fase 9: hardening
-----------------

1. Testar offline/online.
2. Testar token invalido.
3. Testar Telegram rate limit.
4. Testar CyberVinci fechado.
5. Testar provider que demora/cancela mal.
6. Testar erro no Flow.
7. Testar arquivo grande.
8. Testar path traversal.
9. Testar usuario nao autorizado.
10. Testar segunda senha errada.
11. Testar revogacao durante comando ativo.

Fase 10: distribuicao
---------------------

1. Incluir feature no instalador de modificacoes.
2. Documentar setup em README.
3. Criar pagina de ajuda dentro do CyberVinci.
4. Criar exemplos de comandos.
5. Criar checklist de seguranca.
6. Criar modo "reset remote access".

Testes de aceitacao
===================

Cenario 1: setup feliz

1. Usuario abre wizard.
2. Escolhe Telegram.
3. Cola token.
4. CyberVinci valida getMe.
5. Usuario envia /pair codigo.
6. CyberVinci pareia.
7. Usuario escolhe perfil Chat remoto.
8. Usuario define workdir atual.
9. Usuario cria segunda senha.
10. Wizard testa /status.
11. Remote fica ativo.

Resultado esperado:

- /status responde.
- Audit log registra setup.
- Status bar mostra Remote: Telegram.

Cenario 2: usuario nao autorizado

1. Outro usuario envia /status ao bot.

Resultado esperado:

- Bot responde que nao esta autorizado ou ignora, conforme configuracao.
- Audit log registra tentativa rejeitada sem expor dados.

Cenario 3: chat remoto

1. Usuario envia /chat "Explique o projeto atual".

Resultado esperado:

- CyberVinci usa provider/modelo/workdir atuais.
- Resposta chega no Telegram.
- Resposta informa o contexto usado.

Cenario 4: Flow remoto

1. Usuario envia /flow list.
2. Usuario envia /flow run "Review de UI".

Resultado esperado:

- Se permitido, Flow inicia.
- Telegram recebe status.
- Audit log registra run.

Cenario 5: acao sensivel

1. IA tenta aplicar patch.
2. CyberVinci gera aprovacao.
3. Telegram mostra botoes.
4. Usuario aprova.
5. CyberVinci pede segunda senha.
6. Usuario informa senha correta.

Resultado esperado:

- Patch aplica.
- Arquivo abre/atualiza no CyberVinci.
- Audit log registra tudo.

Cenario 6: cancelamento

1. Usuario envia /chat prompt longo.
2. Usuario envia /stop.

Resultado esperado:

- CyberVinci tenta cancelar provider.
- Se resposta tardia chegar, nao entra no contexto ativo.
- Telegram recebe mensagem: "Resposta cancelada e descartada."

Cenario 7: path traversal

1. Usuario envia /cat ../../secrets.txt.

Resultado esperado:

- Comando rejeitado.
- Audit log registra tentativa.

Riscos e mitigacoes
===================

Risco: Telegram nao e E2EE para bots.

Mitigacao:

- Aviso claro no wizard.
- Nao enviar segredos automaticamente.
- Bloquear arquivos sensiveis.
- Para empresas, oferecer modo futuro app/cloud/E2EE/self-host.

Risco: token do bot vazado.

Mitigacao:

- Secret storage.
- Revogar token pelo BotFather.
- Botao "revogar canal" no CyberVinci.
- Allowlist por user id.
- Segunda senha para acoes sensiveis.

Risco: usuario perde celular.

Mitigacao:

- Revogar actor no CyberVinci.
- Reset remoto local.
- Segunda senha.
- Expiracao de sessoes.

Risco: prompt injection via mensagem remota.

Mitigacao:

- Separar comandos do texto.
- Nao deixar IA decidir permissoes.
- Acoes sensiveis passam por RemoteApproval.
- Playbooks/flows mantem guardrails deterministicos.

Risco: provider nao cancela de verdade.

Mitigacao:

- Marcar run como cancelado localmente.
- Ignorar resposta tardia.
- Nao inserir resposta tardia no contexto.
- Informar "cancelado localmente; provider pode ter terminado em background".

Risco: screenshots vazam informacao.

Mitigacao:

- Permissao separada.
- Aviso no wizard.
- Audit.
- Opcao futura de blur/redaction.

Roadmap depois do Telegram MVP
==============================

Etapa A: Telegram avancado

- Grupos com allowlist.
- Menus inline mais ricos.
- Upload/download de artefatos de Flow.
- Templates de comandos.
- Notificacoes proativas:
  - Flow terminou.
  - IA precisa de aprovacao.
  - Testes falharam.
  - Build terminou.

Etapa B: Outro CyberVinci como cliente remoto

- Uma instancia CyberVinci conecta em outra.
- Workdir remoto via virtual file system.
- URI: cybervinci-remote://device/workdir/path
- Editor local mostra arquivos remotos.
- Diffs e previews funcionam no cliente.
- Host continua executando comandos.

Etapa C: Tailscale/Cloudflare wizard

- Wizard detecta Tailscale.
- Guia login/config.
- Gera URL interna.
- Testa conectividade.
- Permite CyberVinci-to-CyberVinci sem Telegram.

Etapa D: CyberVinci Cloud Remote pago

- Conta CyberVinci.
- Device registry.
- Push/wake.
- Relay/fallback NAT.
- Historico sincronizado.
- Times.
- Auditoria central.
- App proprio.

Etapa E: App mobile proprio

- Login.
- Passkey/biometria.
- Push.
- UI nativa para:
  - chat;
  - flow monitor;
  - approvals;
  - files;
  - screenshots;
  - remote workspace.

Modelo comercial sugerido
=========================

Gratis:

- Telegram Bot usando token do usuario.
- Long polling no desktop.
- Tailscale/Cloudflare usando conta do usuario.
- Local/LAN.

Pago:

- Bot gerenciado CyberVinci.
- Cloud relay.
- Push confiavel.
- App mobile.
- Multi-device sem setup.
- Times.
- Auditoria central.
- Politicas centralizadas.
- Remote workspace CyberVinci-to-CyberVinci simplificado.

Arquivos e referencias uteis
============================

Referencias externas:

- Telegram Bot API: https://core.telegram.org/bots/api
- BotFather: https://core.telegram.org/bots/features#botfather
- OpenClaw Telegram channel: https://docs.openclaw.ai/channels/telegram
- OpenClaw Gateway/Remote docs: https://docs.openclaw.ai/gateway/remote

Referencias internas a confirmar na implementacao:

- Pacotes de provider/AI Chat existentes.
- Servicos de Flow existentes.
- Secret storage disponivel no Theia/Electron.
- Status bar contribution usada por temas/workdir.
- Instalador de features em Modificacoes.

Definicao de pronto do MVP
==========================

O MVP pode ser considerado pronto quando:

1. O wizard configura um bot Telegram do zero.
2. O pareamento por codigo funciona.
3. Apenas usuario autorizado consegue enviar comandos.
4. /status, /help e /chat funcionam.
5. /flow list e /flow run funcionam para pelo menos um Flow de teste.
6. /files, /ls, /cat e /open funcionam dentro do workdir permitido.
7. /screenshot funciona quando permitido.
8. Acoes sensiveis geram aprovacao.
9. Segunda senha bloqueia elevacao indevida.
10. Cancelamento descarta resposta tardia localmente.
11. Audit log registra comandos e rejeicoes.
12. Status bar mostra estado real do remote.
13. Revogar usuario impede comandos futuros.
14. Desativar Remote para completamente o long polling.
15. Testes cobrem permissoes, path traversal, actor nao autorizado e approval expirado.

Notas finais
============

O MVP via Telegram e pragmatico porque entrega acesso remoto util sem depender de app proprio, cloud propria ou relay. A limitacao principal e privacidade: mensagens de bot passam pela infraestrutura do Telegram. Por isso, ele deve ser tratado como "Remote Control Lite" e nao como solucao final para ambientes altamente sensiveis.

A arquitetura deve nascer pronta para outros canais. Se o remote-core for bem separado do remote-telegram, o mesmo roteador de comandos, permissoes, approvals, audit e contexto podera ser usado depois por app mobile, web, Tailscale, Cloudflare Tunnel ou outro CyberVinci conectado como cliente remoto.
