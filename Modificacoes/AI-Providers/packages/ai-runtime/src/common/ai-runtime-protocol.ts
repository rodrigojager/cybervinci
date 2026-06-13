// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { JsonRpcServer } from '@theia/core';
import {
    CyberVinciAiExecutionSelection,
    CyberVinciAiProviderDescriptor,
    CyberVinciAiProviderListRequest,
    CyberVinciAiTaskRequest,
    CyberVinciAiTaskResult
} from './ai-runtime-types';

export const CYBERVINCI_AI_RUNTIME_SERVICE_PATH = '/services/cybervinci-ai-runtime';

export const CyberVinciAiRuntimeClient = Symbol('CyberVinciAiRuntimeClient');
export interface CyberVinciAiRuntimeClient {
}

export const CyberVinciAiRuntimeService = Symbol('CyberVinciAiRuntimeService');
export interface CyberVinciAiRuntimeService extends JsonRpcServer<CyberVinciAiRuntimeClient> {
    listProviders(request?: CyberVinciAiProviderListRequest): Promise<CyberVinciAiProviderDescriptor[]>;
    getDefaultExecution(request?: CyberVinciAiProviderListRequest): Promise<CyberVinciAiExecutionSelection>;
    runTask<TInput = unknown, TStructured = unknown>(request: CyberVinciAiTaskRequest<TInput>): Promise<CyberVinciAiTaskResult<TStructured>>;
}
