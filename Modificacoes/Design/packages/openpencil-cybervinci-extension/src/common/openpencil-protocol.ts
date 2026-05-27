import { OpenPencilDesignOperation, OpenPencilDocument, OpenPencilNode, OpenPencilNodeType } from './openpencil-types';

export const OPENPENCIL_BACKEND_PATH = '/services/openpencil';

export const OpenPencilBackendService = Symbol('OpenPencilBackendService');

export interface OpenPencilBackendService {
    getIntegrationInfo(): Promise<OpenPencilIntegrationInfo>;
    getCapabilities(): Promise<OpenPencilBridgeCapability[]>;
    listBridgeOperations(): Promise<OpenPencilBridgeOperationDescriptor[]>;
    executeBridgeOperation(request: OpenPencilBridgeOperationRequest): Promise<OpenPencilBridgeOperationResult>;
    generateAiOperations(request: OpenPencilBackendAiGenerationRequest): Promise<OpenPencilBackendAiGenerationResult>;
    getStatus(): Promise<OpenPencilBackendStatus>;
}

export interface OpenPencilBackendAiGenerationRequest {
    prompt: string;
    document: OpenPencilDocument;
    selection?: string[];
    uri?: string;
    mode?: 'generation' | 'maintenance' | 'continuation';
    activePageLayout?: OpenPencilBackendAiActivePageLayoutSummary;
}

export interface OpenPencilBackendAiLayoutNodeSummary {
    id: string;
    type: OpenPencilNodeType;
    name?: string;
    role?: string;
    contentExcerpt?: string;
    x?: number;
    y?: number;
    width?: OpenPencilNode['width'];
    height?: OpenPencilNode['height'];
    childCount: number;
}

export interface OpenPencilBackendAiActivePageLayoutSummary {
    id: string;
    name?: string;
    bounds: {
        x: 0;
        y: 0;
        width?: number;
        height?: number;
    };
    contentBottom: number;
    topLevelNodeCount: number;
    topLevelNodes: OpenPencilBackendAiLayoutNodeSummary[];
}

export interface OpenPencilBackendAiGenerationResult {
    operations?: OpenPencilDesignOperation[];
    diagnostics?: string[];
    rawText?: string;
}

export interface OpenPencilIntegrationInfo {
    fileExtension: string;
    embedded: boolean;
    reactIsolation: 'internal-mvp' | 'iframe' | 'pen-react';
    bridgeStatus: OpenPencilBridgeReadiness;
}

export type OpenPencilBridgeReadiness = 'available' | 'planned' | 'blocked';

export type OpenPencilPackageRole =
    'types'
    | 'core'
    | 'engine'
    | 'renderer'
    | 'react-ui'
    | 'codegen'
    | 'mcp'
    | 'sdk'
    | 'figma'
    | 'ai-skills'
    | 'acp'
    | 'native-agent';

export interface OpenPencilUpstreamPackage {
    name: string;
    path: string;
    role: OpenPencilPackageRole;
    description: string;
    readiness: OpenPencilBridgeReadiness;
    packageName?: string;
    vendorPath?: string;
    vendored?: boolean;
    notes?: string[];
}

export interface OpenPencilBridgeCapability {
    id: string;
    label: string;
    readiness: OpenPencilBridgeReadiness;
    sourcePackage?: string;
    notes?: string[];
}

export type OpenPencilBridgeOperationKind = 'backend' | 'mcp' | 'cli' | 'codegen';

export type OpenPencilBridgeJsonValue =
    | string
    | number
    | boolean
    | null
    | OpenPencilBridgeJsonObject
    | OpenPencilBridgeJsonValue[];

export interface OpenPencilBridgeJsonObject {
    [key: string]: OpenPencilBridgeJsonValue | undefined;
}

export interface OpenPencilBridgeOperationDescriptor {
    id: string;
    label: string;
    kind: OpenPencilBridgeOperationKind;
    readiness: OpenPencilBridgeReadiness;
    requiresExternalProcess: false;
    sourcePackage?: string;
    inputSchema?: OpenPencilBridgeJsonObject;
    notes?: string[];
}

export interface OpenPencilBridgeOperationRequest {
    operationId: string;
    params?: OpenPencilBridgeJsonObject | null;
}

export type OpenPencilBridgeOperationErrorCode =
    'unsupportedOperation'
    | 'operationUnavailable'
    | 'invalidParams'
    | 'internalError';

export interface OpenPencilBridgeOperationError {
    code: OpenPencilBridgeOperationErrorCode;
    message: string;
}

export type OpenPencilBridgeOperationOutput =
    | OpenPencilBackendStatus
    | OpenPencilBridgeCapability[]
    | OpenPencilBridgeOperationDescriptor[]
    | OpenPencilBridgeJsonObject[]
    | OpenPencilBridgeJsonObject;

export interface OpenPencilBridgeOperationResult {
    operationId: string;
    ok: boolean;
    readiness: OpenPencilBridgeReadiness;
    externalProcessStarted: false;
    output?: OpenPencilBridgeOperationOutput;
    error?: OpenPencilBridgeOperationError;
}

export interface OpenPencilBridgeProcessStatus {
    enabled: boolean;
    readiness: OpenPencilBridgeReadiness;
    sourcePackage: string;
    transport: 'in-process' | 'stdio' | 'http' | 'none';
    command?: string;
    notes: string[];
}

export interface OpenPencilBackendStatus {
    fileExtension: string;
    embedded: boolean;
    reactIsolation: OpenPencilIntegrationInfo['reactIsolation'];
    externalProcessesStarted: false;
    upstreamPackages: OpenPencilUpstreamPackage[];
    capabilities: OpenPencilBridgeCapability[];
    operations: OpenPencilBridgeOperationDescriptor[];
    mcp: OpenPencilBridgeProcessStatus;
    cli: OpenPencilBridgeProcessStatus;
}
