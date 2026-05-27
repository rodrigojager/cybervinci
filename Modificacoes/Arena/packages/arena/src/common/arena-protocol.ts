import {
    ArenaAgentSummary,
    ArenaDispute,
    ArenaGenerateAgentCRequest,
    ArenaGeneratedAgent,
    ArenaListAgentsRequest,
    ArenaRunDuelRequest,
    ArenaRunnerInfo,
    ArenaSaveAgentRequest,
    ArenaSaveArtifactRequest,
    ArenaSavePatchRequest,
    ArenaCandidateLabel,
    ArenaDisputeStatus,
    ArenaRefineAgentRequest
} from './arena-types';

export const ARENA_SERVICE_PATH = '/services/arena';
export const LEGACY_ARENA_SERVICE_PATH = '/services/prompt-arena';

export const ArenaService = Symbol('ArenaService');
export interface ArenaService {
    listAgents(request: ArenaListAgentsRequest): Promise<ArenaAgentSummary[]>;
    listRunners(): Promise<ArenaRunnerInfo[]>;
    getDispute(disputeId: string): Promise<ArenaDispute>;
    generateAgentC(request: ArenaGenerateAgentCRequest): Promise<ArenaGeneratedAgent>;
    runDuel(request: ArenaRunDuelRequest): Promise<ArenaDispute>;
    chooseWinner(disputeId: string, winnerLabel: ArenaCandidateLabel): Promise<ArenaDispute>;
    cancelDispute(disputeId: string): Promise<ArenaDispute>;
    refineAgent(request: ArenaRefineAgentRequest): Promise<ArenaGeneratedAgent>;
    saveGeneratedAgent(request: ArenaSaveAgentRequest): Promise<string>;
    saveWinnerArtifact(request: ArenaSaveArtifactRequest): Promise<string>;
    saveWinnerPatch(request: ArenaSavePatchRequest): Promise<string>;
    finishDispute(disputeId: string, status: Extract<ArenaDisputeStatus, 'Completed' | 'Cancelled'>): Promise<ArenaDispute>;
}
