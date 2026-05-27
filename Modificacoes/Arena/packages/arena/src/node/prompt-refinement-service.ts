import { injectable } from '@theia/core/shared/inversify';
import { ArenaGeneratedAgent, ArenaOutputType } from '../common';

@injectable()
export class PromptRefinementService {
    createRefinementNotes(agentName: string, notes?: string): string {
        return `Refinement saved for ${agentName}.${notes ? `\n\nNotes:\n${notes}` : ''}`;
    }

    refineFromWinner(agentName: string, agentMarkdown: string, outputType: ArenaOutputType, winnerOutput: string): ArenaGeneratedAgent {
        return {
            name: `${agentName}-refined-${new Date().toISOString().replace(/[:.]/g, '-')}`,
            mode: 'contextual',
            contentMarkdown: `${agentMarkdown.trim()}

## Refinamento incorporado

Use as regras abaixo em execuções futuras:

- Otimize o resultado final para o tipo de saída \`${outputType}\`.
- Garanta que a resposta final seja completa, autocontida e diretamente utilizável.
- Quando houver arquivos, coloque o resultado final em caminhos relativos sob \`output/\`.
- Valide o formato antes de responder; para JSON, retorne JSON válido.
- Evite narrar o processo interno no resultado final.

## Exemplo de resultado-alvo

O exemplo abaixo representa o nível de detalhe e acabamento esperado. Não copie cegamente; use como referência de qualidade.

\`\`\`
${winnerOutput.trim().slice(0, 4000)}
\`\`\`
`
        };
    }
}
