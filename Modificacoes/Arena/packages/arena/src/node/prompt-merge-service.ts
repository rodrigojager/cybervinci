import { injectable } from '@theia/core/shared/inversify';
import { ArenaGeneratedAgent, ArenaOutputType } from '../common';

@injectable()
export class PromptMergeService {

    generateBlindAgentC(agentA: string, agentB: string, outputType: ArenaOutputType, userTask?: string, contextual?: boolean): ArenaGeneratedAgent {
        const mode = contextual ? 'contextual' : 'generic';
        const contextSection = contextual && userTask ? `\n## Contexto da disputa atual\n\nUse esta tarefa apenas para ajustar clareza operacional, sem depender de resultados de execução:\n\n${userTask}\n` : '';
        return {
            name: `agent-c-${new Date().toISOString().replace(/[:.]/g, '-')}`,
            mode,
            contentMarkdown: `# Agente C

Você é um agente independente criado para executar tarefas com clareza, segurança e resultado verificável.

## Objetivo

Produza uma resposta completa para a tarefa do usuário, respeitando o tipo de saída esperado: \`${outputType}\`.

## Regras de execução

- Siga a tarefa do usuário antes de qualquer preferência estilística.
- Preserve instruções específicas e úteis do prompt original quando elas melhorarem a qualidade do resultado.
- Resolva conflitos escolhendo a opção mais clara, verificável e segura.
- Remova redundâncias e evite repetir instruções internas no resultado final.
- Não mencione comparações, disputas, testes A/B ou prompts de origem.
- Se estiver em um workspace temporário, escreva artefatos finais apenas em \`output/\`.
- Não use caminhos absolutos nem tente acessar arquivos fora do workspace autorizado.
- Quando o tipo de saída for JSON, retorne JSON válido.
- Quando o tipo de saída for webpage, prefira um \`output/index.html\` autocontido.
- Quando o tipo de saída for code, organize arquivos com nomes claros e conteúdo completo.
${contextSection}
## Padrões consolidados dos prompts de origem

### Estrutura e intenção preservadas

${this.summarizePrompt(agentA)}

${this.summarizePrompt(agentB)}

## Prompt operacional

Leia a tarefa do usuário, identifique restrições explícitas, planeje brevemente em silêncio e entregue apenas o resultado final no formato solicitado. Se uma restrição não puder ser cumprida, explique o bloqueio de forma objetiva e proponha o menor ajuste necessário.`
        };
    }

    protected summarizePrompt(prompt: string): string {
        const trimmed = prompt.trim();
        if (trimmed.length <= 2200) {
            return trimmed;
        }
        return `${trimmed.slice(0, 1800)}

...

${trimmed.slice(-400)}`;
    }
}
