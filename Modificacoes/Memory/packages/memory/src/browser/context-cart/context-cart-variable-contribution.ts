import {
    AIVariable,
    AIVariableContext,
    AIVariableContribution,
    AIVariableResolutionRequest,
    AIVariableResolver,
    AIVariableService,
    ResolvedAIContextVariable
} from '@theia/ai-core';
import { codiconArray } from '@theia/core/lib/browser';
import { nls } from '@theia/core/lib/common';
import { injectable } from '@theia/core/shared/inversify';

export const MEMORY_APPROVED_CONTEXT_VARIABLE: AIVariable = {
    id: 'memory-approved-context-provider',
    name: 'memoryApprovedContext',
    label: nls.localize('theia/memory/contextCart/approvedContextLabel', 'Approved Context'),
    description: nls.localize(
        'theia/memory/contextCart/approvedContextDescription',
        'CyberVinci context pack explicitly approved by the user.'
    ),
    iconClasses: codiconArray('verified'),
    isContextVariable: true,
    args: [{
        name: 'pack',
        description: nls.localize('theia/memory/contextCart/contextPackArgument', 'Approved context pack content.')
    }]
};

@injectable()
export class MemoryApprovedContextVariableContribution implements AIVariableContribution, AIVariableResolver {

    registerVariables(service: AIVariableService): void {
        service.registerResolver(MEMORY_APPROVED_CONTEXT_VARIABLE, this);
    }

    canResolve(request: AIVariableResolutionRequest, _context: AIVariableContext): number {
        return request.variable.name === MEMORY_APPROVED_CONTEXT_VARIABLE.name ? 1 : 0;
    }

    async resolve(request: AIVariableResolutionRequest, _context: AIVariableContext): Promise<ResolvedAIContextVariable | undefined> {
        const contextValue = request.arg?.trim();
        if (!contextValue) {
            return undefined;
        }
        return {
            variable: MEMORY_APPROVED_CONTEXT_VARIABLE,
            arg: request.arg,
            value: nls.localize('theia/memory/contextCart/approvedContextValue', 'CyberVinci approved context'),
            contextValue
        };
    }
}
