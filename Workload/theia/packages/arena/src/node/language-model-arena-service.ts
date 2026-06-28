import {
    LanguageModel,
    LanguageModelRegistry,
    ReasoningLevel,
    UserRequest
} from '@theia/ai-core';
import { getTextOfResponse } from '@theia/ai-core/lib/common/language-model-util';
import { generateUuid, nls } from '@theia/core/lib/common';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import { ArenaGeneratedAgent, ArenaOutputType } from '../common';

export interface ArenaLlmOptions {
    model?: string;
    reasoningEffort?: string;
}

@injectable()
export class LanguageModelArenaService {

    @inject(LanguageModelRegistry) @optional()
    protected readonly languageModelRegistry: LanguageModelRegistry | undefined;

    async isAvailable(modelId?: string): Promise<boolean> {
        return Boolean(await this.selectModel(modelId));
    }

    async completeText(system: string, user: string, options: ArenaLlmOptions = {}, json: boolean = false): Promise<string> {
        const model = await this.selectModel(options.model);
        if (!model) {
            throw new Error(nls.localize('theia/arena/noReadyLanguageModel', 'No ready Theia AI language model is available for Arena.'));
        }
        const request: UserRequest = {
            sessionId: 'arena',
            requestId: generateUuid(),
            agentId: 'arena',
            messages: [
                { actor: 'system', type: 'text', text: system },
                { actor: 'user', type: 'text', text: user }
            ],
            response_format: json ? { type: 'json_object' } : { type: 'text' },
            reasoning: this.toReasoning(options.reasoningEffort)
        };
        const response = await model.request(request);
        return getTextOfResponse(response);
    }

    async generateBlindAgentC(agentA: string, agentB: string, outputType: ArenaOutputType, userTask?: string, contextual?: boolean, options: ArenaLlmOptions = {}): Promise<ArenaGeneratedAgent> {
        const contextualSection = contextual && userTask ? `\nTarefa atual, para contexto opcional:\n${userTask}\n` : '';
        const contentMarkdown = await this.completeText(
            'Você é um engenheiro de prompts. Responda apenas com o prompt final em Markdown.',
            `Sua tarefa é criar um novo agente em Markdown chamado Agente C.

Você receberá dois prompts longos: Agente A e Agente B.

Crie uma nova versão que combine os melhores padrões, instruções e estruturas dos dois agentes.

Regras:
- Não use nenhum resultado gerado pelos agentes.
- Não invente que testou os agentes.
- Não mencione Agente A ou Agente B no resultado final.
- Resolva conflitos entre os dois prompts.
- Remova redundâncias.
- Preserve instruções úteis e específicas.
- Melhore clareza, organização e robustez.
- O resultado final deve ser um prompt completo, em Markdown, pronto para ser usado como agente independente.

Tipo de saída esperado pelo agente:
${outputType}
${contextualSection}
Agente A:
${agentA}

Agente B:
${agentB}`,
            options
        );
        return {
            name: `agent-c-${new Date().toISOString().replace(/[:.]/g, '-')}`,
            contentMarkdown,
            mode: contextual ? 'contextual' : 'generic'
        };
    }

    async refineAgent(agentName: string, agentMarkdown: string, userTask: string, outputType: ArenaOutputType, winnerOutput: string, options: ArenaLlmOptions = {}): Promise<ArenaGeneratedAgent> {
        const contentMarkdown = await this.completeText(
            'Você é um engenheiro de prompts. Responda apenas com um prompt completo em Markdown.',
            `Refine o agente abaixo para produzir resultados melhores em disputas futuras.

Regras:
- Não mencione que houve disputa, vencedor ou comparação.
- Preserve o objetivo central do agente.
- Incorpore melhorias observáveis a partir da tarefa e do resultado.
- Remova redundâncias e ambiguidades.
- O resultado deve ser um agente independente, pronto para uso.

Nome do agente:
${agentName}

Tipo de saída esperado:
${outputType}

Tarefa usada como evidência:
${userTask}

Prompt original:
${agentMarkdown}

Resultado vencedor usado como evidência:
${winnerOutput}`,
            options
        );
        return {
            name: `${agentName}-refined-${new Date().toISOString().replace(/[:.]/g, '-')}`,
            contentMarkdown,
            mode: 'contextual'
        };
    }

    protected async selectModel(modelId?: string): Promise<LanguageModel | undefined> {
        if (!this.languageModelRegistry) {
            return undefined;
        }
        if (modelId) {
            const model = await this.languageModelRegistry.getLanguageModel(modelId);
            return model?.status.status === 'ready' ? model : undefined;
        }
        const selected = await this.languageModelRegistry.selectLanguageModel({ agent: 'arena', purpose: 'chat' });
        if (selected?.status.status === 'ready') {
            return selected;
        }
        const models = await this.languageModelRegistry.getLanguageModels();
        return models.find(model => model.status.status === 'ready');
    }

    protected toReasoning(reasoningEffort?: string): { level: ReasoningLevel } | undefined {
        if (!reasoningEffort) {
            return undefined;
        }
        const normalized = reasoningEffort.trim().toLowerCase();
        if (['off', 'minimal', 'low', 'medium', 'high', 'auto'].includes(normalized)) {
            return { level: normalized as ReasoningLevel };
        }
        return undefined;
    }
}
