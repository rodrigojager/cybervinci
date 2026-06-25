import { ChatAgent, MutableChatRequestModel } from '@theia/ai-chat/lib/common';
import { CyberVinciAgentDefinition } from '../common';
export interface CyberVinciAgentInvokeContext {
    request: MutableChatRequestModel;
    sourceAgentId: string;
}
export interface CyberVinciAgentRuntimeAdapter {
    readonly id: string;
    canHandle(agent: CyberVinciAgentDefinition): boolean;
    invoke(context: CyberVinciAgentInvokeContext): Promise<void>;
}
export declare class CyberVinciNativeTheiaAgentAdapter implements CyberVinciAgentRuntimeAdapter {
    protected readonly getSourceAgent: (sourceAgentId: string) => ChatAgent | undefined;
    readonly id = "native-theia";
    constructor(getSourceAgent: (sourceAgentId: string) => ChatAgent | undefined);
    canHandle(agent: CyberVinciAgentDefinition): boolean;
    invoke(context: CyberVinciAgentInvokeContext): Promise<void>;
}
//# sourceMappingURL=cybervinci-native-agent-adapter.d.ts.map