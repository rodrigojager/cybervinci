"use strict";
// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberVinciAgencyAgentService = void 0;
var inversify_1 = require("@theia/core/shared/inversify");
var yaml = require("js-yaml");
var fs = require("fs/promises");
var path = require("path");
var crypto = require("crypto");
var child_process_1 = require("child_process");
var common_1 = require("../common");
var cybervinci_catalog_validator_1 = require("./cybervinci-catalog-validator");
var AGENCY_AGENTS_RELATIVE_PATH = path.join('Modificacoes', 'Skills', 'Manual', 'Agency Agents');
var CHAT_AGENTS_RELATIVE_PATH = path.join('Modificacoes', 'AI-Chat-Experience', 'config', 'chat-agents.json');
var CHAT_CATALOG_RELATIVE_PATH = path.join('Modificacoes', 'AI-Chat-Experience', 'config');
var DECLARATIVE_TOOL_TIMEOUT = 120000;
var NATIVE_AGENT_DELEGATE_PLAYBOOK_ID = 'native-agent-delegate';
var NATIVE_AGENT_PLAYBOOK_PREFIX = 'native-agent.';
var CATALOG_SOURCE_ORDER = [
    { directory: 'system', source: 'system' },
    { directory: 'system-overrides', source: 'system-override' },
    { directory: 'user', source: 'user' }
];
var BUILT_IN_CHAT_AGENTS = [
    {
        kind: 'native',
        id: 'OpenCoder',
        sourceAgentId: 'OpenCoder',
        name: 'CyberVinci',
        iconClass: 'codicon codicon-hubot',
        tags: ['Chat', 'Coding', 'Workspace', 'Provider Runtime'],
        description: 'Provider-neutral coding agent with CyberVinci AI Providers runtime, file changes, sandbox controls, and validation workflows.'
    },
    {
        kind: 'native',
        id: 'Coder',
        sourceAgentId: 'Coder',
        name: 'Coder',
        iconClass: 'codicon codicon-code',
        tags: ['Chat', 'Coding', 'Workspace'],
        description: 'Software-development chat agent that can inspect workspace files and suggest file changes.'
    },
    {
        kind: 'native',
        id: 'Architect',
        sourceAgentId: 'Architect',
        name: 'Architect',
        iconClass: 'codicon codicon-map',
        tags: ['Chat', 'Planning', 'Workspace'],
        description: 'Planning and project-understanding agent for codebase questions and implementation plans.'
    },
    {
        kind: 'native',
        id: 'GitHub',
        sourceAgentId: 'GitHub',
        name: 'GitHub',
        iconClass: 'codicon codicon-github',
        tags: ['Chat', 'GitHub', 'MCP'],
        description: 'GitHub workflow agent that configures and starts the GitHub MCP server when needed.'
    },
    {
        kind: 'native',
        id: 'AppTester',
        sourceAgentId: 'AppTester',
        name: 'AppTester',
        iconClass: 'codicon codicon-beaker',
        tags: ['Chat', 'Testing', 'Browser', 'MCP'],
        description: 'UI testing agent that can start browser automation MCP servers and verify application scenarios.'
    },
    {
        kind: 'native',
        id: 'code-reviewer',
        sourceAgentId: 'code-reviewer',
        name: 'Code Reviewer',
        iconClass: 'codicon codicon-code-review',
        tags: ['Chat', 'Review', 'Coding'],
        description: 'Code review agent for finding defects, regressions, and missing tests.'
    },
    {
        kind: 'native',
        id: 'pr-reviewer',
        sourceAgentId: 'pr-reviewer',
        name: 'PR Reviewer',
        iconClass: 'codicon codicon-git-pull-request-go-to-changes',
        tags: ['Chat', 'Review', 'GitHub'],
        description: 'Pull-request review agent for GitHub-oriented review workflows.'
    },
    {
        kind: 'native',
        id: 'explore',
        sourceAgentId: 'explore',
        name: 'Explore',
        iconClass: 'codicon codicon-compass',
        tags: ['Chat', 'Research', 'Workspace'],
        description: 'Exploration agent for discovering project structure and answering workspace questions.'
    },
    {
        kind: 'native',
        id: 'ProjectInfo',
        sourceAgentId: 'ProjectInfo',
        name: 'ProjectInfo',
        iconClass: 'codicon codicon-info',
        tags: ['Chat', 'Workspace'],
        description: 'Project information agent for summarizing and explaining the current workspace.'
    },
    {
        kind: 'native',
        id: 'CreateSkill',
        sourceAgentId: 'CreateSkill',
        name: 'CreateSkill',
        iconClass: 'codicon codicon-tools',
        tags: ['Chat', 'Skills'],
        description: 'Skill creation agent for authoring reusable AI workflow instructions.'
    },
    {
        kind: 'native',
        id: 'Orchestrator',
        sourceAgentId: 'Orchestrator',
        name: 'Orchestrator',
        iconClass: 'codicon codicon-organization',
        tags: ['Chat', 'Delegation'],
        description: 'Routing agent that delegates to other chat agents.'
    },
    {
        kind: 'native',
        id: 'Universal',
        sourceAgentId: 'Universal',
        name: 'Universal',
        iconClass: 'codicon codicon-copilot',
        tags: ['Chat'],
        description: 'General-purpose fallback chat agent.'
    },
    {
        kind: 'native',
        id: 'Command',
        sourceAgentId: 'Command',
        name: 'Command',
        iconClass: 'codicon codicon-terminal',
        tags: ['Chat', 'Commands'],
        description: 'Command-oriented chat agent for command generation and execution-related workflows.'
    }
];
var BUILT_IN_TOOLS = [
    {
        version: 'cybervinci.tool/v1',
        id: 'core.agent.invoke',
        name: 'Invoke Agent',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Agent',
        description: 'Host action reserved for invoking the selected CyberVinci or native Theia chat agent.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.agent.describe',
        name: 'Describe Agent Runtime',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Agent',
        description: 'Host tool that resolves the selected chat agent, native source id, playbooks, and declared capabilities before an autonomous Playbook continues.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.agent.preflight',
        name: 'Agent Preflight',
        kind: 'guard',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Agent',
        description: 'Host guard that checks whether the selected agent/playbook/provider/tool bridge has enough runtime context to continue without hiding missing setup.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.agent.nativeMcpRequirements',
        name: 'Native Agent MCP Requirements',
        kind: 'guard',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Agent',
        description: 'Host guard that reports MCP server requirements inferred from native agent prompts and known native agent setup rules.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.chat.respond',
        name: 'Respond In Chat',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Chat',
        description: 'Host action reserved for writing the final response to the active chat turn.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.chat.stop',
        name: 'Stop Chat Turn',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Chat',
        description: 'Host action reserved for cancelling or ending the active chat turn.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.playbook.list',
        name: 'List Playbooks',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Playbooks',
        description: 'Host tool reserved for listing CyberVinci Playbooks as reusable workloads.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.playbook.run',
        name: 'Run Playbook',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Playbooks',
        description: 'Host action reserved for running a CyberVinci Playbook as a workload from another playbook, Flow, or host tool bridge.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.playbook.resume',
        name: 'Resume Playbook Run',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Playbooks',
        description: 'Host action that resumes a paused or failed CyberVinci Playbook run from its latest deterministic checkpoint.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.playbook.compileToFlowDraft',
        name: 'Compile Playbook To Flow Draft',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Playbooks',
        description: 'Host tool that compiles a CyberVinci Playbook into a flow.ai-authoring/v1 create_workflow draft.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.playbook.createFlowFromPlaybook',
        name: 'Create Flow From Playbook',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Playbooks',
        description: 'Host action that materializes a Flow workflow from a CyberVinci Playbook compile draft.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.listWorkflows',
        name: 'List Flow Workflows',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host tool reserved for listing saved CyberVinci Flow workflows.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.startRun',
        name: 'Start Saved Flow',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host action reserved for starting a saved CyberVinci Flow run.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.listPendingGates',
        name: 'List Pending Flow Gates',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host tool reserved for listing pending human gate decisions in a CyberVinci Flow run.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.approveGate',
        name: 'Decide Flow Gate',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host action reserved for approving, rejecting, or routing a CyberVinci Flow human gate.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.runDynamicWorkflow',
        name: 'Run Dynamic Workflow',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host action reserved for asking AI Runtime and Flow to choose, author, and run a workflow for the prompt.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.runAiAuthoredDynamicWorkflow',
        name: 'Run AI-Authored Dynamic Workflow',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host action that asks the shared AI Runtime for a flow.ai-authoring/v1 draft, then materializes and runs it through Flow.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.getAiAuthoringSpec',
        name: 'Get Flow AI Authoring Spec',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host tool reserved for reading flow.ai-authoring/v1 before an AI authoring draft is produced.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.runAiAuthoringDraft',
        name: 'Run AI Authored Flow',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host action reserved for executing a Flow run from a flow.ai-authoring/v1 draft.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.flow.createWorkflowFromAiAuthoringDraft',
        name: 'Create Flow From AI Authoring Draft',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Flow',
        description: 'Host action reserved for materializing a Flow workflow from a flow.ai-authoring/v1 draft without starting it.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.memory.searchContext',
        name: 'Search Memory Context',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'Host tool that searches CyberVinci Memory and optionally builds a context pack for a Playbook state.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.memory.proposeCandidate',
        name: 'Propose Memory Candidate',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'Host action that extracts Memory candidate records without persisting unapproved writes.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.memory.requestWriteApproval',
        name: 'Request Memory Write Approval',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'Host action that asks the user before writing an approved Memory entry.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.memory.writeApproved',
        name: 'Write Approved Memory',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'Host action that writes Memory only when approved=true is supplied by a prior deterministic approval step.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.memory.searchContext',
        name: 'Search Memory Context',
        kind: 'tool',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'System tool wrapper for searching CyberVinci Memory from Playbooks.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.memory.proposeCandidate',
        name: 'Propose Memory Candidate',
        kind: 'action',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'System tool wrapper for proposing Memory candidates without writing them.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.memory.requestWriteApproval',
        name: 'Request Memory Write Approval',
        kind: 'action',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'System tool wrapper for explicit Memory write approval.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.memory.writeApproved',
        name: 'Write Approved Memory',
        kind: 'action',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Memory',
        description: 'System tool wrapper that writes only explicitly approved Memory content.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.provider.status',
        name: 'Provider Status',
        kind: 'guard',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Providers',
        description: 'Host guard reserved for checking provider/model configuration before a playbook continues.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.theiaTool.list',
        name: 'List Theia Tools',
        kind: 'tool',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Tools',
        description: 'Host tool for listing tools registered in Theia\'s ToolInvocationRegistry.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'core.theiaTool.invoke',
        name: 'Invoke Theia Tool',
        kind: 'action',
        source: 'core',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'Tools',
        description: 'Host action for invoking an existing Theia tool by ID from a playbook.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.mcp.hasServer',
        name: 'Check MCP Server Configured',
        kind: 'guard',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'MCP',
        description: 'Host guard that checks whether an MCP server is configured.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.mcp.isServerStarted',
        name: 'Check MCP Server Running',
        kind: 'guard',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'MCP',
        description: 'Host guard that checks whether an MCP server is currently running.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.mcp.configureServer',
        name: 'Configure MCP Server',
        kind: 'action',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'MCP',
        description: 'Host action that adds or updates one or more MCP server definitions in user preferences.'
    },
    {
        version: 'cybervinci.tool/v1',
        id: 'system.mcp.ensureServersStarted',
        name: 'Ensure MCP Servers Started',
        kind: 'action',
        source: 'system',
        implementation: 'host',
        exposeToModel: false,
        protected: true,
        category: 'MCP',
        description: 'Host action that configures missing MCP servers and starts stopped servers.'
    }
];
var BUILT_IN_CANVAS_TOOL_IDS = [
    {
        id: 'system.canvas.captureCurrentDocument',
        name: 'Capture Canvas Document',
        kind: 'tool',
        category: 'Canvas',
        description: 'Host tool for capturing the current Canvas document structure.'
    },
    {
        id: 'system.canvas.captureScreenshot',
        name: 'Capture Canvas Screenshot',
        kind: 'tool',
        category: 'Canvas',
        description: 'Host tool for capturing a visual snapshot of the current Canvas viewport.'
    },
    {
        id: 'system.canvas.collectLayoutDiagnostics',
        name: 'Collect Canvas Layout Diagnostics',
        kind: 'guard',
        category: 'Canvas',
        description: 'Host guard for detecting overlaps, off-canvas nodes, text overflow, and width issues.'
    },
    {
        id: 'system.canvas.detectOverlaps',
        name: 'Detect Canvas Overlaps',
        kind: 'guard',
        category: 'Canvas',
        description: 'Host guard for checking incoherent overlapping Canvas elements.'
    },
    {
        id: 'system.canvas.detectOffCanvasNodes',
        name: 'Detect Off-Canvas Nodes',
        kind: 'guard',
        category: 'Canvas',
        description: 'Host guard for checking nodes that exceed the expected Canvas bounds.'
    },
    {
        id: 'system.canvas.detectTextOverflow',
        name: 'Detect Text Overflow',
        kind: 'guard',
        category: 'Canvas',
        description: 'Host guard for checking clipped or overflowing text in Canvas nodes.'
    },
    {
        id: 'system.canvas.applyOperations',
        name: 'Apply Canvas Operations',
        kind: 'action',
        category: 'Canvas',
        description: 'Host action for applying approved Canvas operation patches.'
    },
    {
        id: 'system.canvas.reorderLayers',
        name: 'Reorder Canvas Layers',
        kind: 'action',
        category: 'Canvas',
        description: 'Host action for repairing layer order when elements overlap incorrectly.'
    },
    {
        id: 'system.canvas.resizeToFit',
        name: 'Resize Canvas Nodes To Fit',
        kind: 'action',
        category: 'Canvas',
        description: 'Host action for resizing Canvas nodes so controls and content fit expected bounds.'
    },
    {
        id: 'system.canvas.validateFooterPresence',
        name: 'Validate Canvas Footer Presence',
        kind: 'guard',
        category: 'Canvas',
        description: 'Host guard for checking that complete page requests include a footer when appropriate.'
    },
    {
        id: 'system.canvas.validateCloneCompleteness',
        name: 'Validate Canvas Clone Completeness',
        kind: 'guard',
        category: 'Canvas',
        description: 'Host guard for checking that known-site clone requests include the expected major modules.'
    },
    {
        id: 'system.canvas.getReferenceFromKnownSite',
        name: 'Get Reference From Known Site',
        kind: 'tool',
        category: 'Canvas',
        description: 'Host tool for obtaining a reference when the prompt clearly names a known site without a URL.'
    },
    {
        id: 'system.vision.judge',
        name: 'Vision Judge',
        kind: 'guard',
        category: 'Vision',
        description: 'Host guard that uses the shared AI Runtime and optional independent vision provider/model to judge visual delivery.'
    },
    {
        id: 'system.flow.aiAuthoringSpec',
        name: 'Flow AI Authoring Spec',
        kind: 'tool',
        category: 'Flow',
        description: 'Host tool for exposing flow.ai-authoring/v1 to dynamic workflow planning.'
    }
];
BUILT_IN_TOOLS.push.apply(BUILT_IN_TOOLS, BUILT_IN_CANVAS_TOOL_IDS.map(function (tool) { return (__assign({ version: 'cybervinci.tool/v1', source: 'system', implementation: 'host', exposeToModel: false, protected: true }, tool)); }));
var BUILT_IN_PLAYBOOKS = [
    {
        version: 'cybervinci.playbook/v1',
        id: NATIVE_AGENT_DELEGATE_PLAYBOOK_ID,
        name: 'Native Agent Delegate (Legacy Disabled)',
        category: 'Agents',
        source: 'core',
        description: 'Legacy compatibility placeholder. Standard CyberVinci agents now use autonomous playbooks and do not delegate to the original Theia native agent.',
        entry: 'disabled',
        enabled: false,
        tools: [],
        states: [
            {
                id: 'disabled',
                type: 'response',
                text: 'Native delegation is disabled. Use the agent-specific autonomous playbook instead.'
            }
        ]
    },
    {
        version: 'cybervinci.playbook/v1',
        id: 'direct-chat',
        name: 'Direct Chat',
        category: 'Chat',
        source: 'core',
        description: 'Default direct chat pass-through. It does not delegate to a native Theia agent.',
        entry: 'pass-through',
        enabled: true,
        tools: [],
        states: [
            {
                id: 'pass-through',
                type: 'end'
            }
        ]
    }
];
BUILT_IN_PLAYBOOKS.push({
    version: 'cybervinci.playbook/v1',
    id: 'canvas-design-qa',
    name: 'Canvas Design QA',
    category: 'Canvas',
    source: 'system',
    enabled: false,
    description: 'V2 playbook for reference capture, Vision Judge, layout diagnostics, repair planning, Canvas operations, and verification.',
    entry: 'capture-document',
    tools: [
        'system.canvas.captureCurrentDocument',
        'system.canvas.collectLayoutDiagnostics',
        'system.vision.judge',
        'system.canvas.applyOperations'
    ],
    guards: [
        'system.canvas.detectOverlaps',
        'system.canvas.detectTextOverflow',
        'system.canvas.validateFooterPresence',
        'system.canvas.validateCloneCompleteness'
    ],
    states: [
        { id: 'capture-document', type: 'tool', tool: 'system.canvas.captureCurrentDocument', transitions: [{ to: 'layout-diagnostics' }] },
        { id: 'layout-diagnostics', type: 'guard', guard: 'system.canvas.collectLayoutDiagnostics', transitions: [{ to: 'vision-judge' }] },
        { id: 'vision-judge', type: 'guard', guard: 'system.vision.judge', saveAs: 'visionJudge', onPass: 'done', onFail: 'repair-plan', transitions: [{ to: 'repair-plan' }] },
        { id: 'repair-plan', type: 'ai', prompt: 'prompts/canvas-repair-planner.md', transitions: [{ to: 'apply-operations' }] },
        { id: 'apply-operations', type: 'tool', tool: 'system.canvas.applyOperations', transitions: [{ to: 'verify' }] },
        { id: 'verify', type: 'ai', prompt: 'prompts/canvas-verify-repairs.md', transitions: [{ to: 'done' }] },
        { id: 'done', type: 'response', prompt: 'Canvas Design QA finished.', transitions: [{ to: 'end' }] },
        { id: 'end', type: 'end' }
    ]
});
var CyberVinciAgencyAgentService = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var CyberVinciAgencyAgentService = _classThis = /** @class */ (function () {
        function CyberVinciAgencyAgentService_1() {
            this.validator = new cybervinci_catalog_validator_1.CyberVinciCatalogValidator();
        }
        CyberVinciAgencyAgentService_1.prototype.setClient = function (client) {
            this.client = client;
        };
        CyberVinciAgencyAgentService_1.prototype.hasFlowPlaybookClient = function () {
            return Boolean(this.client);
        };
        CyberVinciAgencyAgentService_1.prototype.runPlaybookFromFlowOnClient = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    return [2 /*return*/, (_a = this.client) === null || _a === void 0 ? void 0 : _a.runPlaybookFromFlow(request)];
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.getRuntimeDiagnostics = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, {
                            frontendClientConnected: this.hasFlowPlaybookClient(),
                            flowPlaybookBridgeProtocol: 'cybervinci-ai-chat-experience-rpc'
                        }];
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.runFrontendBridgeSmoke = function () {
            return __awaiter(this, void 0, void 0, function () {
                var result;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!this.client) {
                                return [2 /*return*/, {
                                        ok: false,
                                        frontendClientConnected: false,
                                        delegated: false,
                                        message: 'No frontend client is connected to the AI Chat Experience RPC bridge.'
                                    }];
                            }
                            return [4 /*yield*/, this.client.runPlaybookFromFlow({
                                    workflowId: 'cybervinci-runtime-smoke',
                                    runId: "cybervinci-runtime-smoke-".concat(Date.now()),
                                    stateId: 'frontend-rpc',
                                    workloadId: 'frontend-rpc',
                                    playbookId: common_1.CYBERVINCI_FRONTEND_BRIDGE_SMOKE_PLAYBOOK_ID,
                                    prompt: 'CyberVinci frontend bridge smoke',
                                    input: {
                                        marker: 'frontend-rpc',
                                        source: 'CyberVinciAgencyAgentService.runFrontendBridgeSmoke'
                                    }
                                })];
                        case 1:
                            result = _c.sent();
                            return [2 /*return*/, {
                                    ok: result.ok && ((_a = result.signals) === null || _a === void 0 ? void 0 : _a['cybervinci.playbook.frontend']) === true,
                                    frontendClientConnected: true,
                                    delegated: ((_b = result.signals) === null || _b === void 0 ? void 0 : _b['cybervinci.playbook.frontend']) === true,
                                    message: result.message,
                                    value: result.value,
                                    signals: result.signals,
                                    diagnostics: result.diagnostics
                                }];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.listAgents = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.listAgencyAgents()];
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.readAgent = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.readAgencyAgent(id)];
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.getAgentProfilePath = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var resolved;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.resolveAgencyAgentFile(id)];
                        case 1:
                            resolved = _a.sent();
                            if (!resolved) {
                                return [2 /*return*/, { ok: false, message: "Agent profile '".concat(id, "' was not found.") }];
                            }
                            return [2 /*return*/, {
                                    ok: true,
                                    id: resolved.summary.id,
                                    path: resolved.absolutePath,
                                    message: "Agent profile '".concat(resolved.summary.name, "' is stored at ").concat(resolved.absolutePath, ".")
                                }];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.duplicateAgentProfileToUser = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var resolved, userCategory, outputDir, sourceFileName, outputBaseName, outputPath, content, relativePath;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.resolveAgencyAgentFile(id)];
                        case 1:
                            resolved = _a.sent();
                            if (!resolved) {
                                return [2 /*return*/, { ok: false, message: "Agent profile '".concat(id, "' was not found.") }];
                            }
                            userCategory = path.join('_user', resolved.summary.category || 'general');
                            outputDir = path.join(resolved.root, userCategory);
                            sourceFileName = path.basename(resolved.summary.relativePath, '.md');
                            outputBaseName = this.safeCatalogFileName(sourceFileName || resolved.summary.name || resolved.summary.id);
                            return [4 /*yield*/, this.uniqueMarkdownOutputPath(outputDir, outputBaseName)];
                        case 2:
                            outputPath = _a.sent();
                            return [4 /*yield*/, fs.readFile(resolved.absolutePath, 'utf8')];
                        case 3:
                            content = _a.sent();
                            return [4 /*yield*/, fs.mkdir(outputDir, { recursive: true })];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(outputPath, content, 'utf8')];
                        case 5:
                            _a.sent();
                            relativePath = path.relative(resolved.root, outputPath).split(path.sep).join('/');
                            return [2 /*return*/, {
                                    ok: true,
                                    id: this.normalizeId(relativePath),
                                    path: outputPath,
                                    paths: [outputPath],
                                    message: "Created editable Agent profile copy '".concat(relativePath, "' at ").concat(outputPath, ".")
                                }];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.getAgentCatalog = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, agents, manifest;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                this.listAgents(),
                                this.getDeclarativeChatAgentManifest()
                            ])];
                        case 1:
                            _a = _e.sent(), agents = _a[0], manifest = _a[1];
                            return [2 /*return*/, {
                                    version: common_1.CYBERVINCI_AGENT_CATALOG_VERSION,
                                    agents: agents,
                                    chatAgents: manifest.agents,
                                    tools: (_b = manifest.tools) !== null && _b !== void 0 ? _b : [],
                                    playbooks: (_c = manifest.playbooks) !== null && _c !== void 0 ? _c : [],
                                    diagnostics: (_d = manifest.diagnostics) !== null && _d !== void 0 ? _d : []
                                }];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.listTools = function () {
            return __awaiter(this, void 0, void 0, function () {
                var manifest;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getDeclarativeChatAgentManifest()];
                        case 1:
                            manifest = _b.sent();
                            return [2 /*return*/, (_a = manifest.tools) !== null && _a !== void 0 ? _a : []];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.listPlaybooks = function () {
            return __awaiter(this, void 0, void 0, function () {
                var manifest;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getDeclarativeChatAgentManifest()];
                        case 1:
                            manifest = _b.sent();
                            return [2 /*return*/, ((_a = manifest.playbooks) !== null && _a !== void 0 ? _a : []).map(function (playbook) {
                                    var _a;
                                    return ({
                                        id: playbook.id,
                                        name: playbook.name,
                                        description: playbook.description,
                                        category: (_a = playbook.category) !== null && _a !== void 0 ? _a : 'General',
                                        source: playbook.source,
                                        sourcePath: playbook.sourcePath,
                                        enabled: playbook.enabled
                                    });
                                }).sort(function (left, right) { return left.category.localeCompare(right.category) || left.name.localeCompare(right.name); })];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.getPlaybook = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var manifest;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getDeclarativeChatAgentManifest()];
                        case 1:
                            manifest = _b.sent();
                            return [2 /*return*/, (_a = manifest.playbooks) === null || _a === void 0 ? void 0 : _a.find(function (playbook) { return playbook.id === id; })];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.getCatalogDiagnostics = function () {
            return __awaiter(this, void 0, void 0, function () {
                var manifest;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getDeclarativeChatAgentManifest()];
                        case 1:
                            manifest = _b.sent();
                            return [2 /*return*/, (_a = manifest.diagnostics) !== null && _a !== void 0 ? _a : []];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.getCatalogLocations = function () {
            return __awaiter(this, void 0, void 0, function () {
                var root;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.resolveCatalogRoot()];
                        case 1:
                            root = _a.sent();
                            return [2 /*return*/, root
                                    ? {
                                        root: root,
                                        system: path.join(root, 'system'),
                                        systemOverrides: path.join(root, 'system-overrides'),
                                        user: path.join(root, 'user')
                                    }
                                    : {}];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.restoreSystemOverride = function (kind, id) {
            return __awaiter(this, void 0, void 0, function () {
                var root, normalizedId, overridesRoot, files, removedFiles, updatedFiles, diagnostics, key, _i, files_1, file, parsed, update, changed;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.resolveCatalogRoot()];
                        case 1:
                            root = _a.sent();
                            normalizedId = id.trim();
                            if (!root || !normalizedId) {
                                return [2 /*return*/, { ok: false, message: 'Catalog root or override id is not available.' }];
                            }
                            overridesRoot = path.join(root, 'system-overrides');
                            return [4 /*yield*/, this.pathExists(overridesRoot)];
                        case 2:
                            if (!(_a.sent())) {
                                return [2 /*return*/, { ok: false, message: 'No system-overrides catalog directory exists.' }];
                            }
                            return [4 /*yield*/, this.collectCatalogFiles(overridesRoot)];
                        case 3:
                            files = _a.sent();
                            removedFiles = [];
                            updatedFiles = [];
                            diagnostics = [];
                            key = this.catalogCollectionKey(kind);
                            _i = 0, files_1 = files;
                            _a.label = 4;
                        case 4:
                            if (!(_i < files_1.length)) return [3 /*break*/, 10];
                            file = files_1[_i];
                            return [4 /*yield*/, this.readCatalogFile(file)];
                        case 5:
                            parsed = _a.sent();
                            update = this.removeCatalogOverride(parsed, key, normalizedId);
                            if (!update.changed) {
                                return [3 /*break*/, 9];
                            }
                            if (!update.removeFile) return [3 /*break*/, 7];
                            return [4 /*yield*/, fs.unlink(file)];
                        case 6:
                            _a.sent();
                            removedFiles.push(file);
                            return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, fs.writeFile(file, this.stringifyCatalogFile(file, update.value), 'utf8')];
                        case 8:
                            _a.sent();
                            updatedFiles.push(file);
                            _a.label = 9;
                        case 9:
                            _i++;
                            return [3 /*break*/, 4];
                        case 10:
                            this.cachedCatalogRoot = undefined;
                            changed = removedFiles.length + updatedFiles.length;
                            if (!changed) {
                                diagnostics.push({
                                    severity: 'warning',
                                    id: normalizedId,
                                    source: 'system-overrides',
                                    message: "No system override ".concat(kind, " '").concat(normalizedId, "' was found.")
                                });
                            }
                            return [2 /*return*/, {
                                    ok: changed > 0,
                                    message: changed > 0
                                        ? "Restored bundled ".concat(kind, " '").concat(normalizedId, "' by removing ").concat(changed, " override file change(s).")
                                        : "No system override ".concat(kind, " '").concat(normalizedId, "' was found."),
                                    removedFiles: removedFiles,
                                    updatedFiles: updatedFiles,
                                    diagnostics: diagnostics
                                }];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.deleteUserCatalogItem = function (kind, id) {
            return __awaiter(this, void 0, void 0, function () {
                var root, normalizedId, userRoot, files, removedFiles, updatedFiles, diagnostics, key, _i, files_2, file, parsed, update, changed;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.resolveCatalogRoot()];
                        case 1:
                            root = _a.sent();
                            normalizedId = id.trim();
                            if (!root || !normalizedId) {
                                return [2 /*return*/, { ok: false, message: 'Catalog root or user item id is not available.' }];
                            }
                            userRoot = path.join(root, 'user');
                            return [4 /*yield*/, this.pathExists(userRoot)];
                        case 2:
                            if (!(_a.sent())) {
                                return [2 /*return*/, { ok: false, message: 'No user catalog directory exists.' }];
                            }
                            return [4 /*yield*/, this.collectCatalogFiles(userRoot)];
                        case 3:
                            files = _a.sent();
                            removedFiles = [];
                            updatedFiles = [];
                            diagnostics = [];
                            key = this.catalogCollectionKey(kind);
                            _i = 0, files_2 = files;
                            _a.label = 4;
                        case 4:
                            if (!(_i < files_2.length)) return [3 /*break*/, 10];
                            file = files_2[_i];
                            return [4 /*yield*/, this.readCatalogFile(file)];
                        case 5:
                            parsed = _a.sent();
                            update = this.removeCatalogOverride(parsed, key, normalizedId);
                            if (!update.changed) {
                                return [3 /*break*/, 9];
                            }
                            if (!update.removeFile) return [3 /*break*/, 7];
                            return [4 /*yield*/, fs.unlink(file)];
                        case 6:
                            _a.sent();
                            removedFiles.push(file);
                            return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, fs.writeFile(file, this.stringifyCatalogFile(file, update.value), 'utf8')];
                        case 8:
                            _a.sent();
                            updatedFiles.push(file);
                            _a.label = 9;
                        case 9:
                            _i++;
                            return [3 /*break*/, 4];
                        case 10:
                            this.cachedCatalogRoot = undefined;
                            changed = removedFiles.length + updatedFiles.length;
                            if (!changed) {
                                diagnostics.push({
                                    severity: 'warning',
                                    id: normalizedId,
                                    source: 'user',
                                    message: "No user ".concat(kind, " '").concat(normalizedId, "' was found.")
                                });
                            }
                            return [2 /*return*/, {
                                    ok: changed > 0,
                                    message: changed > 0
                                        ? "Deleted user ".concat(kind, " '").concat(normalizedId, "' by applying ").concat(changed, " catalog file change(s).")
                                        : "No user ".concat(kind, " '").concat(normalizedId, "' was found."),
                                    removedFiles: removedFiles,
                                    updatedFiles: updatedFiles,
                                    diagnostics: diagnostics
                                }];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.duplicateCatalogItemToUser = function (kind, id) {
            return __awaiter(this, void 0, void 0, function () {
                var root, item, duplicate, _a, companionPlaybookPath, _b, outputPath;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.resolveCatalogRoot()];
                        case 1:
                            root = _d.sent();
                            if (!root) {
                                return [2 /*return*/, { ok: false, message: 'Catalog root is not available.' }];
                            }
                            return [4 /*yield*/, this.findCatalogItem(kind, id)];
                        case 2:
                            item = _d.sent();
                            if (!item) {
                                return [2 /*return*/, { ok: false, message: "".concat(kind, " '").concat(id, "' was not found in the catalog.") }];
                            }
                            duplicate = this.copyCatalogItemForUser(kind, item);
                            _a = duplicate;
                            return [4 /*yield*/, this.uniqueCatalogId(kind, String(duplicate.id))];
                        case 3:
                            _a.id = _d.sent();
                            if (!(kind === 'agent')) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.materializeEditableNativeAgentPlaybook(root, duplicate, item)];
                        case 4:
                            _b = _d.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _b = undefined;
                            _d.label = 6;
                        case 6:
                            companionPlaybookPath = _b;
                            outputPath = path.join(root, 'user', this.catalogCollectionKey(kind), "".concat(this.safeCatalogFileName(String(duplicate.id)), ".yml"));
                            return [4 /*yield*/, fs.mkdir(path.dirname(outputPath), { recursive: true })];
                        case 7:
                            _d.sent();
                            return [4 /*yield*/, fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, (_c = {}, _c[this.catalogCollectionKey(kind)] = [duplicate], _c)), 'utf8')];
                        case 8:
                            _d.sent();
                            this.cachedCatalogRoot = undefined;
                            return [2 /*return*/, {
                                    ok: true,
                                    id: String(duplicate.id),
                                    path: outputPath,
                                    paths: [outputPath, companionPlaybookPath].filter(function (candidate) { return !!candidate; }),
                                    message: "Created user ".concat(kind, " copy '").concat(duplicate.id, "' at ").concat(outputPath, ".").concat(companionPlaybookPath ? " Editable Playbook: ".concat(companionPlaybookPath, ".") : '')
                                }];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.createUserAgentCopy = function (agent) {
            return __awaiter(this, void 0, void 0, function () {
                var root, validated, duplicate, _a, companionPlaybookPath, outputPath;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.resolveCatalogRoot()];
                        case 1:
                            root = _c.sent();
                            if (!root) {
                                return [2 /*return*/, { ok: false, message: 'Catalog root is not available.' }];
                            }
                            validated = this.validator.validateAgent(agent, "runtime-agent:".concat(agent.id));
                            if (!validated.value) {
                                return [2 /*return*/, {
                                        ok: false,
                                        message: "Runtime Agent '".concat((_b = agent.id) !== null && _b !== void 0 ? _b : '<unknown>', "' could not be converted to a user catalog copy."),
                                        diagnostics: validated.diagnostics
                                    }];
                            }
                            duplicate = this.copyCatalogItemForUser('agent', validated.value);
                            _a = duplicate;
                            return [4 /*yield*/, this.uniqueCatalogId('agent', String(duplicate.id))];
                        case 2:
                            _a.id = _c.sent();
                            return [4 /*yield*/, this.materializeEditableNativeAgentPlaybook(root, duplicate, validated.value)];
                        case 3:
                            companionPlaybookPath = _c.sent();
                            outputPath = path.join(root, 'user', 'agents', "".concat(this.safeCatalogFileName(String(duplicate.id)), ".yml"));
                            return [4 /*yield*/, fs.mkdir(path.dirname(outputPath), { recursive: true })];
                        case 4:
                            _c.sent();
                            return [4 /*yield*/, fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, { agents: [duplicate] }), 'utf8')];
                        case 5:
                            _c.sent();
                            this.cachedCatalogRoot = undefined;
                            return [2 /*return*/, {
                                    ok: true,
                                    id: String(duplicate.id),
                                    path: outputPath,
                                    paths: [outputPath, companionPlaybookPath].filter(function (candidate) { return !!candidate; }),
                                    diagnostics: validated.diagnostics,
                                    message: "Created user agent copy '".concat(duplicate.id, "' at ").concat(outputPath, ".").concat(companionPlaybookPath ? " Editable Playbook: ".concat(companionPlaybookPath, ".") : '')
                                }];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.createSystemOverride = function (kind, id) {
            return __awaiter(this, void 0, void 0, function () {
                var root, item, override, outputPath;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.resolveCatalogRoot()];
                        case 1:
                            root = _b.sent();
                            if (!root) {
                                return [2 /*return*/, { ok: false, message: 'Catalog root is not available.' }];
                            }
                            return [4 /*yield*/, this.findCatalogItem(kind, id)];
                        case 2:
                            item = _b.sent();
                            if (!item) {
                                return [2 /*return*/, { ok: false, message: "".concat(kind, " '").concat(id, "' was not found in the catalog.") }];
                            }
                            override = this.copyCatalogItemForSystemOverride(item);
                            outputPath = path.join(root, 'system-overrides', this.catalogCollectionKey(kind), "".concat(this.safeCatalogFileName(id), ".yml"));
                            return [4 /*yield*/, fs.mkdir(path.dirname(outputPath), { recursive: true })];
                        case 3:
                            _b.sent();
                            return [4 /*yield*/, fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, (_a = {}, _a[this.catalogCollectionKey(kind)] = [override], _a)), 'utf8')];
                        case 4:
                            _b.sent();
                            this.cachedCatalogRoot = undefined;
                            return [2 /*return*/, {
                                    ok: true,
                                    id: String(override.id),
                                    path: outputPath,
                                    message: "Created system override for ".concat(kind, " '").concat(id, "' at ").concat(outputPath, ".")
                                }];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.assignAgentDefaultPlaybook = function (agentId, playbookId) {
            return __awaiter(this, void 0, void 0, function () {
                var root, normalizedAgentId, normalizedPlaybookId, _a, agent, playbook, source, sourcePath, outputPath, rootPath, outputPathKey, rootPathKey, parsed, update, override;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.resolveCatalogRoot()];
                        case 1:
                            root = _b.sent();
                            normalizedAgentId = agentId.trim();
                            normalizedPlaybookId = playbookId.trim();
                            if (!root || !normalizedAgentId || !normalizedPlaybookId) {
                                return [2 /*return*/, { ok: false, message: 'Catalog root, agent id, and playbook id are required.' }];
                            }
                            return [4 /*yield*/, Promise.all([
                                    this.findCatalogItem('agent', normalizedAgentId),
                                    this.findCatalogItem('playbook', normalizedPlaybookId)
                                ])];
                        case 2:
                            _a = _b.sent(), agent = _a[0], playbook = _a[1];
                            if (!agent) {
                                return [2 /*return*/, { ok: false, message: "Agent '".concat(normalizedAgentId, "' was not found in the catalog.") }];
                            }
                            if (!playbook) {
                                return [2 /*return*/, { ok: false, message: "Playbook '".concat(normalizedPlaybookId, "' was not found in the catalog.") }];
                            }
                            source = typeof agent.source === 'string' ? agent.source : undefined;
                            sourcePath = typeof agent.sourcePath === 'string' ? agent.sourcePath : undefined;
                            if (!(source === 'user' && sourcePath)) return [3 /*break*/, 5];
                            rootPath = path.resolve(root);
                            outputPath = path.resolve.apply(path, __spreadArray([rootPath], sourcePath.split(/[\\/]+/g), false));
                            outputPathKey = outputPath.toLowerCase();
                            rootPathKey = rootPath.toLowerCase();
                            if (outputPathKey !== rootPathKey && !outputPathKey.startsWith("".concat(rootPathKey).concat(path.sep))) {
                                return [2 /*return*/, { ok: false, message: "Agent '".concat(normalizedAgentId, "' source path is outside the catalog root.") }];
                            }
                            return [4 /*yield*/, this.readCatalogFile(outputPath)];
                        case 3:
                            parsed = _b.sent();
                            update = this.updateCatalogItemInParsed(parsed, 'agents', normalizedAgentId, function (item) { return _this.assignPlaybookToAgentRecord(item, normalizedPlaybookId); });
                            if (!update.changed) {
                                return [2 /*return*/, { ok: false, message: "Agent '".concat(normalizedAgentId, "' was not found in ").concat(sourcePath, ".") }];
                            }
                            return [4 /*yield*/, fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, update.value), 'utf8')];
                        case 4:
                            _b.sent();
                            return [3 /*break*/, 8];
                        case 5:
                            override = this.assignPlaybookToAgentRecord(this.copyCatalogItemForSystemOverride(agent), normalizedPlaybookId);
                            outputPath = path.join(root, 'system-overrides', 'agents', "".concat(this.safeCatalogFileName(normalizedAgentId), ".yml"));
                            return [4 /*yield*/, fs.mkdir(path.dirname(outputPath), { recursive: true })];
                        case 6:
                            _b.sent();
                            return [4 /*yield*/, fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, { agents: [override] }), 'utf8')];
                        case 7:
                            _b.sent();
                            _b.label = 8;
                        case 8:
                            this.cachedCatalogRoot = undefined;
                            return [2 /*return*/, {
                                    ok: true,
                                    id: normalizedAgentId,
                                    path: outputPath,
                                    message: "Assigned Playbook '".concat(normalizedPlaybookId, "' as the default for Agent '").concat(normalizedAgentId, "' at ").concat(outputPath, ".")
                                }];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.listMarketplaceItems = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, manifest, explicitItems, installedUserIds, installedMarketplaceItemIds, generated, byId, _i, _b, item;
                var _this = this;
                var _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                this.getDeclarativeChatAgentManifest(),
                                this.readMarketplaceItems()
                            ])];
                        case 1:
                            _a = _h.sent(), manifest = _a[0], explicitItems = _a[1];
                            installedUserIds = new Set(__spreadArray(__spreadArray(__spreadArray([], manifest.agents.filter(function (item) { return item.source === 'user'; }).map(function (item) { return item.id; }), true), ((_c = manifest.tools) !== null && _c !== void 0 ? _c : []).filter(function (item) { return item.source === 'user'; }).map(function (item) { return item.id; }), true), ((_d = manifest.playbooks) !== null && _d !== void 0 ? _d : []).filter(function (item) { return item.source === 'user'; }).map(function (item) { return item.id; }), true));
                            return [4 /*yield*/, this.installedNonCatalogMarketplaceItemIds()];
                        case 2:
                            installedMarketplaceItemIds = _h.sent();
                            generated = __spreadArray(__spreadArray(__spreadArray([], manifest.agents
                                .filter(function (agent) { return agent.source !== 'user'; })
                                .map(function (agent) { return _this.catalogMarketplaceItem('agents', 'agent', agent.id, agent.name, agent.description, agent.tags, agent.sourcePath, installedUserIds); }), true), ((_e = manifest.tools) !== null && _e !== void 0 ? _e : [])
                                .filter(function (tool) { return tool.source !== 'user'; })
                                .map(function (tool) { return _this.catalogMarketplaceItem('tools', 'tool', tool.id, tool.name, tool.description, tool.category ? [tool.category] : undefined, tool.sourcePath, installedUserIds); }), true), ((_f = manifest.playbooks) !== null && _f !== void 0 ? _f : [])
                                .filter(function (playbook) { return playbook.source !== 'user'; })
                                .map(function (playbook) { return _this.catalogMarketplaceItem('playbooks', 'playbook', playbook.id, playbook.name, playbook.description, playbook.tags, playbook.sourcePath, installedUserIds); }), true);
                            byId = new Map();
                            for (_i = 0, _b = __spreadArray(__spreadArray([], generated, true), explicitItems, true); _i < _b.length; _i++) {
                                item = _b[_i];
                                byId.set(item.id, __assign(__assign({}, item), { installed: (_g = item.installed) !== null && _g !== void 0 ? _g : (item.installTarget && this.isCatalogInstallTarget(item.installTarget.kind)
                                        ? installedUserIds.has(this.userCopyId(item.installTarget.kind, item.installTarget.id))
                                        : installedMarketplaceItemIds.has(item.id)) }));
                            }
                            return [2 /*return*/, __spreadArray([], byId.values(), true).sort(function (left, right) { return left.collection.localeCompare(right.collection) || left.name.localeCompare(right.name); })];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.installMarketplaceItem = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var item, target, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.listMarketplaceItems()];
                        case 1:
                            item = (_a.sent()).find(function (candidate) { return candidate.id === id; });
                            if (!item) {
                                return [2 /*return*/, { ok: false, message: "Marketplace item '".concat(id, "' was not found.") }];
                            }
                            target = item.installTarget;
                            if (!target) {
                                return [2 /*return*/, { ok: false, message: "Marketplace item '".concat(id, "' does not define an install target.") }];
                            }
                            if (!(target.kind === 'agent' || target.kind === 'tool' || target.kind === 'playbook')) return [3 /*break*/, 6];
                            if (!(target.action === 'create-override')) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.createSystemOverride(target.kind, target.id)];
                        case 2:
                            result = _a.sent();
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, this.duplicateCatalogItemToUser(target.kind, target.id)];
                        case 4:
                            result = _a.sent();
                            _a.label = 5;
                        case 5: return [2 /*return*/, this.withMarketplaceInstallAudit(item, target, result)];
                        case 6: return [4 /*yield*/, this.installNonCatalogMarketplaceItem(item, target)];
                        case 7:
                            result = _a.sent();
                            return [2 /*return*/, this.withMarketplaceInstallAudit(item, target, result)];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.listAgencyAgents = function () {
            return __awaiter(this, void 0, void 0, function () {
                var root, files, summaries;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.resolveAgencyAgentsRoot()];
                        case 1:
                            root = _a.sent();
                            if (!root) {
                                return [2 /*return*/, []];
                            }
                            return [4 /*yield*/, this.collectMarkdownFiles(root)];
                        case 2:
                            files = _a.sent();
                            return [4 /*yield*/, Promise.all(files
                                    .filter(function (file) { return !path.basename(file).toLowerCase().startsWith('readme'); })
                                    .map(function (file) { return _this.readSummary(root, file); }))];
                        case 3:
                            summaries = _a.sent();
                            return [2 /*return*/, summaries
                                    .filter(function (summary) { return !!summary; })
                                    .sort(function (left, right) { return left.category.localeCompare(right.category) || left.name.localeCompare(right.name); })];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.readAgencyAgent = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var resolved, content;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.resolveAgencyAgentFile(id)];
                        case 1:
                            resolved = _a.sent();
                            if (!resolved) {
                                return [2 /*return*/, undefined];
                            }
                            return [4 /*yield*/, fs.readFile(resolved.absolutePath, 'utf8')];
                        case 2:
                            content = _a.sent();
                            return [2 /*return*/, __assign(__assign({}, resolved.summary), { content: content })];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.resolveAgencyAgentFile = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var root, normalizedId, normalizedPath, summaries, summary, absolutePath;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.resolveAgencyAgentsRoot()];
                        case 1:
                            root = _a.sent();
                            if (!root) {
                                return [2 /*return*/, undefined];
                            }
                            normalizedId = this.normalizeId(id);
                            normalizedPath = id.replace(/\\/g, '/');
                            return [4 /*yield*/, this.listAgencyAgents()];
                        case 2:
                            summaries = _a.sent();
                            summary = summaries.find(function (candidate) { return candidate.id === normalizedId || candidate.relativePath === normalizedPath; });
                            if (!summary) {
                                return [2 /*return*/, undefined];
                            }
                            absolutePath = path.resolve.apply(path, __spreadArray([root], summary.relativePath.split('/'), false));
                            if (!this.pathContainsOrEquals(root, absolutePath)) {
                                return [2 /*return*/, undefined];
                            }
                            return [2 /*return*/, { root: root, summary: summary, absolutePath: absolutePath }];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.getDeclarativeChatAgentManifest = function () {
            return __awaiter(this, void 0, void 0, function () {
                var fileManifest, catalogFragments, agentById, toolById, playbookById, _i, BUILT_IN_CHAT_AGENTS_1, agent, _a, _b, agent, _c, _d, agent, existing, _e, agentById_1, _f, id, agent, _g, BUILT_IN_TOOLS_1, tool, _h, _j, tool, _k, _l, tool, existing, _m, BUILT_IN_PLAYBOOKS_1, playbook, _o, _p, playbook, _q, _r, playbook, existing;
                var _s, _t, _u, _v;
                return __generator(this, function (_w) {
                    switch (_w.label) {
                        case 0: return [4 /*yield*/, this.readDeclarativeChatAgentManifest()];
                        case 1:
                            fileManifest = _w.sent();
                            return [4 /*yield*/, this.readCatalogFragments()];
                        case 2:
                            catalogFragments = _w.sent();
                            agentById = new Map();
                            toolById = new Map();
                            playbookById = new Map();
                            for (_i = 0, BUILT_IN_CHAT_AGENTS_1 = BUILT_IN_CHAT_AGENTS; _i < BUILT_IN_CHAT_AGENTS_1.length; _i++) {
                                agent = BUILT_IN_CHAT_AGENTS_1[_i];
                                agentById.set(agent.id, agent);
                            }
                            for (_a = 0, _b = (_s = fileManifest === null || fileManifest === void 0 ? void 0 : fileManifest.agents) !== null && _s !== void 0 ? _s : []; _a < _b.length; _a++) {
                                agent = _b[_a];
                                agentById.set(agent.id, __assign(__assign({}, agentById.get(agent.id)), agent));
                            }
                            for (_c = 0, _d = catalogFragments.agents; _c < _d.length; _c++) {
                                agent = _d[_c];
                                existing = agentById.get(agent.id);
                                if (!this.shouldMergeCatalogFragment('Agent', agent, existing, catalogFragments.diagnostics)) {
                                    continue;
                                }
                                agentById.set(agent.id, __assign(__assign({}, agentById.get(agent.id)), agent));
                            }
                            for (_e = 0, agentById_1 = agentById; _e < agentById_1.length; _e++) {
                                _f = agentById_1[_e], id = _f[0], agent = _f[1];
                                agentById.set(id, this.withAgentDefaults(agent));
                            }
                            for (_g = 0, BUILT_IN_TOOLS_1 = BUILT_IN_TOOLS; _g < BUILT_IN_TOOLS_1.length; _g++) {
                                tool = BUILT_IN_TOOLS_1[_g];
                                toolById.set(tool.id, tool);
                            }
                            for (_h = 0, _j = (_t = fileManifest === null || fileManifest === void 0 ? void 0 : fileManifest.tools) !== null && _t !== void 0 ? _t : []; _h < _j.length; _h++) {
                                tool = _j[_h];
                                toolById.set(tool.id, __assign(__assign({}, toolById.get(tool.id)), tool));
                            }
                            for (_k = 0, _l = catalogFragments.tools; _k < _l.length; _k++) {
                                tool = _l[_k];
                                existing = toolById.get(tool.id);
                                if (!this.shouldMergeCatalogFragment('Tool', tool, existing, catalogFragments.diagnostics)) {
                                    continue;
                                }
                                toolById.set(tool.id, __assign(__assign({}, toolById.get(tool.id)), tool));
                            }
                            for (_m = 0, BUILT_IN_PLAYBOOKS_1 = BUILT_IN_PLAYBOOKS; _m < BUILT_IN_PLAYBOOKS_1.length; _m++) {
                                playbook = BUILT_IN_PLAYBOOKS_1[_m];
                                playbookById.set(playbook.id, playbook);
                            }
                            for (_o = 0, _p = (_u = fileManifest === null || fileManifest === void 0 ? void 0 : fileManifest.playbooks) !== null && _u !== void 0 ? _u : []; _o < _p.length; _o++) {
                                playbook = _p[_o];
                                playbookById.set(playbook.id, __assign(__assign({}, playbookById.get(playbook.id)), playbook));
                            }
                            for (_q = 0, _r = catalogFragments.playbooks; _q < _r.length; _q++) {
                                playbook = _r[_q];
                                existing = playbookById.get(playbook.id);
                                if (!this.shouldMergeCatalogFragment('Playbook', playbook, existing, catalogFragments.diagnostics)) {
                                    continue;
                                }
                                playbookById.set(playbook.id, __assign(__assign({}, playbookById.get(playbook.id)), playbook));
                            }
                            this.validateCatalogReferences(agentById, toolById, playbookById, catalogFragments.diagnostics);
                            return [2 /*return*/, {
                                    version: 1,
                                    agents: __spreadArray([], agentById.values(), true),
                                    tools: __spreadArray([], toolById.values(), true),
                                    playbooks: __spreadArray([], playbookById.values(), true),
                                    diagnostics: __spreadArray(__spreadArray([], ((_v = fileManifest === null || fileManifest === void 0 ? void 0 : fileManifest.diagnostics) !== null && _v !== void 0 ? _v : []), true), catalogFragments.diagnostics, true)
                                }];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.executeDeclarativeTool = function (toolId, argsJson) {
            return __awaiter(this, void 0, void 0, function () {
                var manifest, tool, command, allowedCommands, args, cwd, timeoutMs;
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
                return __generator(this, function (_q) {
                    switch (_q.label) {
                        case 0: return [4 /*yield*/, this.getDeclarativeChatAgentManifest()];
                        case 1:
                            manifest = _q.sent();
                            tool = (_a = manifest.tools) === null || _a === void 0 ? void 0 : _a.find(function (candidate) { return candidate.id === toolId; });
                            if (!tool) {
                                throw new Error("Declarative tool '".concat(toolId, "' is not configured."));
                            }
                            command = (_b = tool.command) !== null && _b !== void 0 ? _b : (((_c = tool.entry) === null || _c === void 0 ? void 0 : _c.type) === 'command' || ((_d = tool.entry) === null || _d === void 0 ? void 0 : _d.type) === 'script' ? tool.entry.command : undefined);
                            if (!command) {
                                if (tool.implementation === 'host') {
                                    return [2 /*return*/, {
                                            exitCode: 0,
                                            stdout: "Host tool '".concat(tool.id, "' is registered for the CyberVinci Playbook runtime and is not executed through the command bridge."),
                                            stderr: ''
                                        }];
                                }
                                throw new Error("Declarative tool '".concat(toolId, "' does not define a command."));
                            }
                            if (tool.shell === true && ((_e = tool.policy) === null || _e === void 0 ? void 0 : _e.allowShell) !== true) {
                                throw new Error("Declarative tool '".concat(toolId, "' requests shell execution but policy.allowShell is not enabled."));
                            }
                            allowedCommands = (_g = (_f = tool.policy) === null || _f === void 0 ? void 0 : _f.allowedCommands) === null || _g === void 0 ? void 0 : _g.map(function (item) { return item.trim(); }).filter(Boolean);
                            if ((allowedCommands === null || allowedCommands === void 0 ? void 0 : allowedCommands.length) && !allowedCommands.includes(command)) {
                                throw new Error("Declarative tool '".concat(toolId, "' command '").concat(command, "' is not in policy.allowedCommands."));
                            }
                            args = (_h = tool.args) !== null && _h !== void 0 ? _h : (Array.isArray((_j = tool.entry) === null || _j === void 0 ? void 0 : _j.args) ? tool.entry.args.map(String) : []);
                            cwd = tool.cwd ? this.resolveConfiguredPath(tool.cwd) : process.cwd();
                            this.validateCommandToolPathPolicy(toolId, cwd, (_k = tool.policy) === null || _k === void 0 ? void 0 : _k.allowedPaths, (_l = tool.policy) === null || _l === void 0 ? void 0 : _l.deniedPaths);
                            timeoutMs = Math.max(1, (_p = (_m = tool.timeoutMs) !== null && _m !== void 0 ? _m : (_o = tool.policy) === null || _o === void 0 ? void 0 : _o.timeoutMs) !== null && _p !== void 0 ? _p : DECLARATIVE_TOOL_TIMEOUT);
                            return [2 /*return*/, new Promise(function (resolve, reject) {
                                    var _a, _b, _c, _d;
                                    var child = (0, child_process_1.spawn)(command, args, {
                                        cwd: cwd,
                                        shell: (_a = tool.shell) !== null && _a !== void 0 ? _a : false,
                                        env: __assign(__assign(__assign({}, process.env), ((_b = tool.env) !== null && _b !== void 0 ? _b : {})), { CYBERVINCI_TOOL_ID: tool.id, CYBERVINCI_TOOL_ARGS: argsJson })
                                    });
                                    var stdout = '';
                                    var stderr = '';
                                    var timer = setTimeout(function () {
                                        child.kill();
                                        reject(new Error("Declarative tool '".concat(toolId, "' timed out after ").concat(timeoutMs, "ms.")));
                                    }, timeoutMs);
                                    (_c = child.stdout) === null || _c === void 0 ? void 0 : _c.on('data', function (chunk) { return stdout += chunk.toString(); });
                                    (_d = child.stderr) === null || _d === void 0 ? void 0 : _d.on('data', function (chunk) { return stderr += chunk.toString(); });
                                    child.on('error', function (error) {
                                        clearTimeout(timer);
                                        reject(error);
                                    });
                                    child.on('close', function (exitCode) {
                                        clearTimeout(timer);
                                        resolve({ exitCode: exitCode, stdout: stdout, stderr: stderr });
                                    });
                                })];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.withAgentDefaults = function (agent) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
            if (agent.kind !== 'native' && agent.kind !== 'delegate') {
                return agent;
            }
            var playbooks = new Set((_a = agent.playbooks) !== null && _a !== void 0 ? _a : []);
            var defaultPlaybook = (_b = agent.defaultPlaybook) !== null && _b !== void 0 ? _b : this.nativeAgentPlaybookId((_c = agent.sourceAgentId) !== null && _c !== void 0 ? _c : agent.id);
            playbooks.add(defaultPlaybook);
            var tools = new Set((_d = agent.tools) !== null && _d !== void 0 ? _d : []);
            tools.add('core.agent.describe');
            tools.add('core.agent.preflight');
            tools.add('system.agent.nativeMcpRequirements');
            return __assign(__assign({}, agent), { defaultPlaybook: defaultPlaybook, playbooks: __spreadArray([], playbooks, true), tools: __spreadArray([], tools, true), capabilityProfile: __assign(__assign({}, ((_e = agent.capabilityProfile) !== null && _e !== void 0 ? _e : {})), { tools: __spreadArray([
                        {
                            id: 'core.agent.describe',
                            kind: 'tool',
                            source: 'playbook',
                            required: true,
                            description: 'Resolves selected agent metadata and declarative capability profile.'
                        },
                        {
                            id: 'core.agent.preflight',
                            kind: 'guard',
                            source: 'playbook',
                            required: true,
                            description: 'Checks selected playbook, provider readiness, and Theia tool bridge availability.'
                        },
                        {
                            id: 'system.agent.nativeMcpRequirements',
                            kind: 'guard',
                            source: 'playbook',
                            required: false,
                            description: 'Reports MCP server requirements inferred from native prompts and known native setup rules.'
                        }
                    ], ((_g = (_f = agent.capabilityProfile) === null || _f === void 0 ? void 0 : _f.tools) !== null && _g !== void 0 ? _g : []), true), guards: __spreadArray([
                        {
                            id: 'core.agent.preflight',
                            kind: 'guard',
                            source: 'playbook',
                            required: true,
                            description: 'Deterministic readiness check before the autonomous agent playbook.'
                        },
                        {
                            id: 'system.agent.nativeMcpRequirements',
                            kind: 'guard',
                            source: 'playbook',
                            required: false,
                            description: 'Deterministic MCP requirement report before the autonomous agent playbook.'
                        }
                    ], ((_j = (_h = agent.capabilityProfile) === null || _h === void 0 ? void 0 : _h.guards) !== null && _j !== void 0 ? _j : []), true), variables: (_l = (_k = agent.capabilityProfile) === null || _k === void 0 ? void 0 : _k.variables) !== null && _l !== void 0 ? _l : agent.variables, functions: (_o = (_m = agent.capabilityProfile) === null || _m === void 0 ? void 0 : _m.functions) !== null && _o !== void 0 ? _o : agent.functions, modes: (_q = (_p = agent.capabilityProfile) === null || _p === void 0 ? void 0 : _p.modes) !== null && _q !== void 0 ? _q : (_r = agent.modes) === null || _r === void 0 ? void 0 : _r.map(function (mode) { return mode.id; }), languageModels: (_t = (_s = agent.capabilityProfile) === null || _s === void 0 ? void 0 : _s.languageModels) !== null && _t !== void 0 ? _t : (_u = agent.languageModelRequirements) === null || _u === void 0 ? void 0 : _u.map(function (requirement) { var _a, _b; return (_b = (_a = requirement.name) !== null && _a !== void 0 ? _a : requirement.identifier) !== null && _b !== void 0 ? _b : requirement.purpose; }) }) });
        };
        CyberVinciAgencyAgentService_1.prototype.shouldMergeCatalogFragment = function (kind, item, existing, diagnostics) {
            var lowerKind = kind.toLocaleLowerCase();
            if (item.source === 'user' && (item.id.startsWith('core.') || item.id.startsWith('system.'))) {
                diagnostics.push({
                    severity: 'warning',
                    id: item.id,
                    message: "".concat(kind, " '").concat(item.id, "' cannot override a protected core/system ").concat(lowerKind, " from the user catalog. Use system-overrides for system items or user.* for user items."),
                    source: item.source
                });
                return false;
            }
            if (item.source === 'user' && !item.id.startsWith('user.')) {
                diagnostics.push({
                    severity: 'warning',
                    id: item.id,
                    message: "User ".concat(lowerKind, " '").concat(item.id, "' must use the user.* namespace."),
                    source: item.source
                });
                return false;
            }
            if (item.source === 'system-override' && !existing) {
                diagnostics.push({
                    severity: 'warning',
                    id: item.id,
                    message: "System override '".concat(item.id, "' ignored because there is no bundled ").concat(lowerKind, " with that id."),
                    source: item.source
                });
                return false;
            }
            return true;
        };
        CyberVinciAgencyAgentService_1.prototype.validateCatalogReferences = function (agents, tools, playbooks, diagnostics) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
            var emitted = new Set();
            var warn = function (id, message, source) {
                var key = "".concat(id !== null && id !== void 0 ? id : '', "\0").concat(message);
                if (emitted.has(key)) {
                    return;
                }
                emitted.add(key);
                diagnostics.push({
                    severity: 'warning',
                    id: id,
                    source: source,
                    message: message
                });
            };
            var hasPlaybook = function (id) {
                return playbooks.has(id) || (id.startsWith(NATIVE_AGENT_PLAYBOOK_PREFIX) && playbooks.has(NATIVE_AGENT_DELEGATE_PLAYBOOK_ID));
            };
            for (var _i = 0, _v = agents.values(); _i < _v.length; _i++) {
                var agent = _v[_i];
                var source = (_a = agent.sourcePath) !== null && _a !== void 0 ? _a : agent.source;
                if (agent.defaultPlaybook && !hasPlaybook(agent.defaultPlaybook)) {
                    warn(agent.id, "Agent '".concat(agent.id, "' defaultPlaybook '").concat(agent.defaultPlaybook, "' does not exist."), source);
                }
                for (var _w = 0, _x = (_b = agent.playbooks) !== null && _b !== void 0 ? _b : []; _w < _x.length; _w++) {
                    var playbookId = _x[_w];
                    if (!hasPlaybook(playbookId)) {
                        warn(agent.id, "Agent '".concat(agent.id, "' references missing playbook '").concat(playbookId, "'."), source);
                    }
                }
                for (var _y = 0, _z = (_c = agent.tools) !== null && _c !== void 0 ? _c : []; _y < _z.length; _y++) {
                    var toolId = _z[_y];
                    if (!tools.has(toolId)) {
                        warn(agent.id, "Agent '".concat(agent.id, "' references missing tool '").concat(toolId, "'."), source);
                    }
                }
                for (var _0 = 0, _1 = __spreadArray(__spreadArray([], ((_e = (_d = agent.capabilityProfile) === null || _d === void 0 ? void 0 : _d.tools) !== null && _e !== void 0 ? _e : []), true), ((_g = (_f = agent.capabilityProfile) === null || _f === void 0 ? void 0 : _f.guards) !== null && _g !== void 0 ? _g : []), true); _0 < _1.length; _0++) {
                    var capability = _1[_0];
                    if (capability.id && !tools.has(capability.id)) {
                        warn(agent.id, "Agent '".concat(agent.id, "' capabilityProfile references missing tool '").concat(capability.id, "'."), source);
                    }
                }
            }
            for (var _2 = 0, _3 = tools.values(); _2 < _3.length; _2++) {
                var tool = _3[_2];
                var source = (_h = tool.sourcePath) !== null && _h !== void 0 ? _h : tool.source;
                for (var _4 = 0, _5 = (_j = tool.steps) !== null && _j !== void 0 ? _j : []; _4 < _5.length; _4++) {
                    var step = _5[_4];
                    if (step.tool && !tools.has(step.tool)) {
                        warn(tool.id, "Composite tool '".concat(tool.id, "' references missing step tool '").concat(step.tool, "'."), source);
                    }
                }
            }
            for (var _6 = 0, _7 = playbooks.values(); _6 < _7.length; _6++) {
                var playbook = _7[_6];
                var source = (_k = playbook.sourcePath) !== null && _k !== void 0 ? _k : playbook.source;
                for (var _8 = 0, _9 = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], ((_l = playbook.tools) !== null && _l !== void 0 ? _l : []), true), ((_m = playbook.guards) !== null && _m !== void 0 ? _m : []), true), ((_p = (_o = playbook.uses) === null || _o === void 0 ? void 0 : _o.tools) !== null && _p !== void 0 ? _p : []), true), ((_r = (_q = playbook.uses) === null || _q === void 0 ? void 0 : _q.guards) !== null && _r !== void 0 ? _r : []), true); _8 < _9.length; _8++) {
                    var toolId = _9[_8];
                    if (toolId && !tools.has(toolId)) {
                        warn(playbook.id, "Playbook '".concat(playbook.id, "' references missing tool '").concat(toolId, "'."), source);
                    }
                }
                for (var _10 = 0, _11 = (_s = playbook.states) !== null && _s !== void 0 ? _s : []; _10 < _11.length; _10++) {
                    var state = _11[_10];
                    var toolId = state.type === 'guard' ? (_t = state.guard) !== null && _t !== void 0 ? _t : state.tool : state.type === 'tool' ? state.tool : undefined;
                    if (toolId && !tools.has(toolId)) {
                        warn(playbook.id, "Playbook '".concat(playbook.id, "' state '").concat(state.id, "' references missing tool '").concat(toolId, "'."), source);
                    }
                    var childPlaybookId = state.type === 'playbook' ? (_u = state.playbook) !== null && _u !== void 0 ? _u : state.playbookId : undefined;
                    if (childPlaybookId && !hasPlaybook(childPlaybookId)) {
                        warn(playbook.id, "Playbook '".concat(playbook.id, "' state '").concat(state.id, "' references missing playbook '").concat(childPlaybookId, "'."), source);
                    }
                }
            }
        };
        CyberVinciAgencyAgentService_1.prototype.nativeAgentPlaybookId = function (agentId) {
            return "".concat(NATIVE_AGENT_PLAYBOOK_PREFIX).concat(agentId);
        };
        CyberVinciAgencyAgentService_1.prototype.readSummary = function (root, absolutePath) {
            return __awaiter(this, void 0, void 0, function () {
                var content, relativePath, segments, category, fileName, frontmatter, title, _a;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _e.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, fs.readFile(absolutePath, 'utf8')];
                        case 1:
                            content = _e.sent();
                            relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
                            segments = relativePath.split('/');
                            category = segments.length > 1 ? segments[0] : 'general';
                            fileName = path.basename(relativePath, '.md');
                            frontmatter = this.extractFrontmatter(content);
                            title = (_c = (_b = frontmatter.name) !== null && _b !== void 0 ? _b : this.extractTitle(content)) !== null && _c !== void 0 ? _c : this.titleFromFileName(fileName);
                            return [2 /*return*/, {
                                    id: this.normalizeId(relativePath),
                                    name: title,
                                    category: category,
                                    relativePath: relativePath,
                                    description: (_d = frontmatter.description) !== null && _d !== void 0 ? _d : this.extractDescription(content, title)
                                }];
                        case 2:
                            _a = _e.sent();
                            return [2 /*return*/, undefined];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.extractFrontmatter = function (content) {
            var match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            if (!match) {
                return {};
            }
            var result = {};
            for (var _i = 0, _a = match[1].split(/\r?\n/); _i < _a.length; _i++) {
                var line = _a[_i];
                var property = line.match(/^([a-zA-Z][\w-]*)\s*:\s*(.+)$/);
                if (!property) {
                    continue;
                }
                var key = property[1].toLowerCase();
                var value = this.cleanFrontmatterValue(property[2]);
                if (key === 'name') {
                    result.name = value;
                }
                else if (key === 'description') {
                    result.description = value;
                }
            }
            return result;
        };
        CyberVinciAgencyAgentService_1.prototype.cleanFrontmatterValue = function (value) {
            return value
                .trim()
                .replace(/^['"]|['"]$/g, '')
                .trim();
        };
        CyberVinciAgencyAgentService_1.prototype.extractTitle = function (content) {
            var _a, _b;
            var heading = (_b = (_a = this.stripFrontmatter(content).match(/^#\s+(.+)$/m)) === null || _a === void 0 ? void 0 : _a[1]) === null || _b === void 0 ? void 0 : _b.trim();
            return heading || undefined;
        };
        CyberVinciAgencyAgentService_1.prototype.extractDescription = function (content, title) {
            var _a;
            var normalizedTitle = title.toLowerCase();
            var lines = this.stripFrontmatter(content)
                .split(/\r?\n/)
                .map(function (line) { return line.trim(); })
                .filter(function (line) { return line
                && !line.startsWith('#')
                && !line.startsWith('---')
                && !/^(name|description|color|emoji|vibe)\s*:/i.test(line)
                && line.toLowerCase() !== normalizedTitle; });
            return (_a = lines[0]) === null || _a === void 0 ? void 0 : _a.replace(/[*_`]/g, '').slice(0, 220);
        };
        CyberVinciAgencyAgentService_1.prototype.stripFrontmatter = function (content) {
            return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
        };
        CyberVinciAgencyAgentService_1.prototype.titleFromFileName = function (fileName) {
            return fileName
                .split(/[-_]+/g)
                .filter(Boolean)
                .map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1); })
                .join(' ');
        };
        CyberVinciAgencyAgentService_1.prototype.normalizeId = function (value) {
            return value
                .replace(/\\/g, '/')
                .replace(/\.md$/i, '')
                .toLowerCase();
        };
        CyberVinciAgencyAgentService_1.prototype.collectMarkdownFiles = function (root) {
            return __awaiter(this, void 0, void 0, function () {
                var entries, nested;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fs.readdir(root, { withFileTypes: true })];
                        case 1:
                            entries = _a.sent();
                            return [4 /*yield*/, Promise.all(entries.map(function (entry) { return __awaiter(_this, void 0, void 0, function () {
                                    var absolute;
                                    return __generator(this, function (_a) {
                                        absolute = path.join(root, entry.name);
                                        if (entry.isDirectory()) {
                                            return [2 /*return*/, this.collectMarkdownFiles(absolute)];
                                        }
                                        return [2 /*return*/, entry.isFile() && entry.name.toLowerCase().endsWith('.md') ? [absolute] : []];
                                    });
                                }); }))];
                        case 2:
                            nested = _a.sent();
                            return [2 /*return*/, nested.flat()];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.resolveAgencyAgentsRoot = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, explicit, explicitCandidates, _i, explicitCandidates_1, candidate, candidates, _b, candidates_1, base, candidate;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = this.cachedRoot;
                            if (!_a) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.pathExists(this.cachedRoot)];
                        case 1:
                            _a = (_c.sent());
                            _c.label = 2;
                        case 2:
                            if (_a) {
                                return [2 /*return*/, this.cachedRoot];
                            }
                            explicit = process.env.CYBERVINCI_AGENCY_AGENTS_DIR
                                ? this.resolveConfiguredPath(process.env.CYBERVINCI_AGENCY_AGENTS_DIR)
                                : undefined;
                            if (!explicit) return [3 /*break*/, 6];
                            explicitCandidates = [
                                explicit,
                                path.join(explicit, AGENCY_AGENTS_RELATIVE_PATH)
                            ];
                            _i = 0, explicitCandidates_1 = explicitCandidates;
                            _c.label = 3;
                        case 3:
                            if (!(_i < explicitCandidates_1.length)) return [3 /*break*/, 6];
                            candidate = explicitCandidates_1[_i];
                            return [4 /*yield*/, this.pathExists(candidate)];
                        case 4:
                            if (_c.sent()) {
                                this.cachedRoot = candidate;
                                return [2 /*return*/, candidate];
                            }
                            _c.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6:
                            candidates = __spreadArray(__spreadArray([], this.parentCandidates(process.cwd()), true), this.parentCandidates(__dirname), true);
                            _b = 0, candidates_1 = candidates;
                            _c.label = 7;
                        case 7:
                            if (!(_b < candidates_1.length)) return [3 /*break*/, 10];
                            base = candidates_1[_b];
                            candidate = base.endsWith(AGENCY_AGENTS_RELATIVE_PATH)
                                ? base
                                : path.join(base, AGENCY_AGENTS_RELATIVE_PATH);
                            return [4 /*yield*/, this.pathExists(candidate)];
                        case 8:
                            if (_c.sent()) {
                                this.cachedRoot = candidate;
                                return [2 /*return*/, candidate];
                            }
                            _c.label = 9;
                        case 9:
                            _b++;
                            return [3 /*break*/, 7];
                        case 10: return [2 /*return*/, undefined];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.readDeclarativeChatAgentManifest = function () {
            return __awaiter(this, void 0, void 0, function () {
                var manifestPath, parsed, _a, _b, diagnostics_1, agents, tools, playbooks, error_1;
                var _this = this;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.resolveDeclarativeChatAgentsPath()];
                        case 1:
                            manifestPath = _c.sent();
                            if (!manifestPath) {
                                return [2 /*return*/, undefined];
                            }
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 4, , 5]);
                            _b = (_a = JSON).parse;
                            return [4 /*yield*/, fs.readFile(manifestPath, 'utf8')];
                        case 3:
                            parsed = _b.apply(_a, [_c.sent()]);
                            diagnostics_1 = [];
                            agents = Array.isArray(parsed.agents)
                                ? parsed.agents.flatMap(function (agent, index) {
                                    var result = _this.validator.validateAgent(agent, "".concat(path.basename(manifestPath), "#agents.").concat(index));
                                    diagnostics_1.push.apply(diagnostics_1, result.diagnostics);
                                    return result.value ? [result.value] : [];
                                })
                                : [];
                            tools = Array.isArray(parsed.tools)
                                ? parsed.tools.flatMap(function (tool, index) {
                                    var result = _this.validator.validateTool(tool, "".concat(path.basename(manifestPath), "#tools.").concat(index));
                                    diagnostics_1.push.apply(diagnostics_1, result.diagnostics);
                                    return result.value ? [result.value] : [];
                                })
                                : [];
                            playbooks = Array.isArray(parsed.playbooks)
                                ? parsed.playbooks.flatMap(function (playbook, index) {
                                    var result = _this.validator.validatePlaybook(playbook, "".concat(path.basename(manifestPath), "#playbooks.").concat(index));
                                    diagnostics_1.push.apply(diagnostics_1, result.diagnostics);
                                    return result.value ? [result.value] : [];
                                })
                                : [];
                            return [2 /*return*/, {
                                    version: 1,
                                    agents: agents,
                                    tools: tools,
                                    playbooks: playbooks,
                                    diagnostics: __spreadArray(__spreadArray([], diagnostics_1, true), (Array.isArray(parsed.diagnostics)
                                        ? parsed.diagnostics.filter(this.isCatalogDiagnostic)
                                        : []), true)
                                }];
                        case 4:
                            error_1 = _c.sent();
                            throw new Error("Could not load declarative chat agents from ".concat(manifestPath, ": ").concat(error_1 instanceof Error ? error_1.message : String(error_1)));
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.readCatalogFragments = function () {
            return __awaiter(this, void 0, void 0, function () {
                var result, root, _i, CATALOG_SOURCE_ORDER_1, sourceEntry, sourceRoot, files, _a, files_3, file, _b, _c, error_2;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            result = {
                                agents: [],
                                tools: [],
                                playbooks: [],
                                diagnostics: []
                            };
                            return [4 /*yield*/, this.resolveCatalogRoot()];
                        case 1:
                            root = _d.sent();
                            if (!root) {
                                return [2 /*return*/, result];
                            }
                            _i = 0, CATALOG_SOURCE_ORDER_1 = CATALOG_SOURCE_ORDER;
                            _d.label = 2;
                        case 2:
                            if (!(_i < CATALOG_SOURCE_ORDER_1.length)) return [3 /*break*/, 11];
                            sourceEntry = CATALOG_SOURCE_ORDER_1[_i];
                            sourceRoot = path.join(root, sourceEntry.directory);
                            return [4 /*yield*/, this.pathExists(sourceRoot)];
                        case 3:
                            if (!(_d.sent())) {
                                return [3 /*break*/, 10];
                            }
                            return [4 /*yield*/, this.collectCatalogFiles(sourceRoot)];
                        case 4:
                            files = _d.sent();
                            _a = 0, files_3 = files;
                            _d.label = 5;
                        case 5:
                            if (!(_a < files_3.length)) return [3 /*break*/, 10];
                            file = files_3[_a];
                            _d.label = 6;
                        case 6:
                            _d.trys.push([6, 8, , 9]);
                            _b = this.mergeCatalogObject;
                            _c = [result];
                            return [4 /*yield*/, this.readCatalogFile(file)];
                        case 7:
                            _b.apply(this, _c.concat([_d.sent(), sourceEntry.source, path.relative(root, file).split(path.sep).join('/')]));
                            return [3 /*break*/, 9];
                        case 8:
                            error_2 = _d.sent();
                            result.diagnostics.push({
                                severity: 'error',
                                source: path.relative(root, file).split(path.sep).join('/'),
                                message: error_2 instanceof Error ? error_2.message : String(error_2)
                            });
                            return [3 /*break*/, 9];
                        case 9:
                            _a++;
                            return [3 /*break*/, 5];
                        case 10:
                            _i++;
                            return [3 /*break*/, 2];
                        case 11: return [2 /*return*/, result];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.resolveCatalogRoot = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, explicit, candidates, _i, candidates_2, candidate;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = this.cachedCatalogRoot;
                            if (!_a) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.pathExists(this.cachedCatalogRoot)];
                        case 1:
                            _a = (_b.sent());
                            _b.label = 2;
                        case 2:
                            if (_a) {
                                return [2 /*return*/, this.cachedCatalogRoot];
                            }
                            explicit = process.env.CYBERVINCI_AI_CHAT_CATALOG_DIR;
                            candidates = __spreadArray(__spreadArray(__spreadArray([
                                explicit
                            ], this.packageConfigCandidates(), true), this.parentCandidates(process.cwd()).map(function (base) { return path.join(base, CHAT_CATALOG_RELATIVE_PATH); }), true), this.parentCandidates(__dirname).map(function (base) { return path.join(base, CHAT_CATALOG_RELATIVE_PATH); }), true).filter(function (candidate) { return !!candidate; });
                            _i = 0, candidates_2 = candidates;
                            _b.label = 3;
                        case 3:
                            if (!(_i < candidates_2.length)) return [3 /*break*/, 6];
                            candidate = candidates_2[_i];
                            return [4 /*yield*/, this.pathExists(candidate)];
                        case 4:
                            if (_b.sent()) {
                                this.cachedCatalogRoot = candidate;
                                return [2 /*return*/, candidate];
                            }
                            _b.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6: return [2 /*return*/, undefined];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.collectCatalogFiles = function (root) {
            return __awaiter(this, void 0, void 0, function () {
                var entries, nested;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fs.readdir(root, { withFileTypes: true })];
                        case 1:
                            entries = _a.sent();
                            return [4 /*yield*/, Promise.all(entries.map(function (entry) { return __awaiter(_this, void 0, void 0, function () {
                                    var absolute;
                                    return __generator(this, function (_a) {
                                        absolute = path.join(root, entry.name);
                                        if (entry.isDirectory()) {
                                            return [2 /*return*/, this.collectCatalogFiles(absolute)];
                                        }
                                        return [2 /*return*/, entry.isFile() && /\.(json|ya?ml)$/i.test(entry.name) ? [absolute] : []];
                                    });
                                }); }))];
                        case 2:
                            nested = _a.sent();
                            return [2 /*return*/, nested.flat().sort(function (left, right) { return left.localeCompare(right); })];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.readCatalogFile = function (file) {
            return __awaiter(this, void 0, void 0, function () {
                var content;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fs.readFile(file, 'utf8')];
                        case 1:
                            content = _a.sent();
                            if (/\.ya?ml$/i.test(file)) {
                                return [2 /*return*/, yaml.load(content)];
                            }
                            return [2 /*return*/, JSON.parse(content)];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.stringifyCatalogFile = function (file, value) {
            if (/\.ya?ml$/i.test(file)) {
                return "".concat(yaml.dump(value, { noRefs: true, lineWidth: 120 }));
            }
            return "".concat(JSON.stringify(value, undefined, 2), "\n");
        };
        CyberVinciAgencyAgentService_1.prototype.catalogCollectionKey = function (kind) {
            switch (kind) {
                case 'agent':
                    return 'agents';
                case 'playbook':
                    return 'playbooks';
                default:
                    return 'tools';
            }
        };
        CyberVinciAgencyAgentService_1.prototype.findCatalogItem = function (kind, id) {
            return __awaiter(this, void 0, void 0, function () {
                var manifest, items, item;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.getDeclarativeChatAgentManifest()];
                        case 1:
                            manifest = _c.sent();
                            items = kind === 'agent'
                                ? manifest.agents
                                : kind === 'playbook'
                                    ? (_a = manifest.playbooks) !== null && _a !== void 0 ? _a : []
                                    : (_b = manifest.tools) !== null && _b !== void 0 ? _b : [];
                            item = items.find(function (candidate) { return candidate.id === id; });
                            return [2 /*return*/, item ? this.cloneCatalogValue(item) : undefined];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.readMarketplaceItems = function () {
            return __awaiter(this, void 0, void 0, function () {
                var root, marketplaceRoot, files, items, _i, files_4, file, parsed, records, _a, _b, _c, index, record, item;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.resolveCatalogRoot()];
                        case 1:
                            root = _d.sent();
                            if (!root) {
                                return [2 /*return*/, []];
                            }
                            marketplaceRoot = path.join(root, 'marketplace');
                            return [4 /*yield*/, this.pathExists(marketplaceRoot)];
                        case 2:
                            if (!(_d.sent())) {
                                return [2 /*return*/, []];
                            }
                            return [4 /*yield*/, this.collectCatalogFiles(marketplaceRoot)];
                        case 3:
                            files = _d.sent();
                            items = [];
                            _i = 0, files_4 = files;
                            _d.label = 4;
                        case 4:
                            if (!(_i < files_4.length)) return [3 /*break*/, 7];
                            file = files_4[_i];
                            return [4 /*yield*/, this.readCatalogFile(file)];
                        case 5:
                            parsed = _d.sent();
                            records = this.marketplaceRecords(parsed);
                            for (_a = 0, _b = records.entries(); _a < _b.length; _a++) {
                                _c = _b[_a], index = _c[0], record = _c[1];
                                item = this.toMarketplaceItem(record, path.relative(root, file).split(path.sep).join('/'), index);
                                if (item) {
                                    items.push(item);
                                }
                            }
                            _d.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 4];
                        case 7: return [2 /*return*/, items];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.marketplaceRecords = function (parsed) {
            var _this = this;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return [];
            }
            var record = parsed;
            if (Array.isArray(record.marketplace)) {
                return record.marketplace.filter(function (item) { return _this.isRecord(item); });
            }
            if (Array.isArray(record.items)) {
                return record.items.filter(function (item) { return _this.isRecord(item); });
            }
            return this.isMarketplaceRecord(record) ? [record] : [];
        };
        CyberVinciAgencyAgentService_1.prototype.isMarketplaceRecord = function (record) {
            return typeof record.id === 'string'
                && typeof record.name === 'string'
                && typeof record.collection === 'string';
        };
        CyberVinciAgencyAgentService_1.prototype.toMarketplaceItem = function (record, sourcePath, index) {
            var _a, _b;
            var collection = this.marketplaceCollection(record.collection);
            if (!collection || typeof record.id !== 'string' || typeof record.name !== 'string') {
                return undefined;
            }
            var installTarget = this.isRecord(record.installTarget)
                ? {
                    kind: String((_a = record.installTarget.kind) !== null && _a !== void 0 ? _a : ''),
                    id: String((_b = record.installTarget.id) !== null && _b !== void 0 ? _b : ''),
                    action: typeof record.installTarget.action === 'string'
                        ? record.installTarget.action
                        : undefined
                }
                : undefined;
            return {
                id: record.id || "".concat(sourcePath, "#").concat(index),
                name: record.name,
                collection: collection,
                description: typeof record.description === 'string' ? record.description : undefined,
                tags: Array.isArray(record.tags) ? record.tags.filter(function (tag) { return typeof tag === 'string'; }) : undefined,
                source: 'marketplace',
                sourcePath: sourcePath,
                installTarget: (installTarget === null || installTarget === void 0 ? void 0 : installTarget.id) && installTarget.kind ? installTarget : undefined
            };
        };
        CyberVinciAgencyAgentService_1.prototype.marketplaceCollection = function (value) {
            return value === 'agents'
                || value === 'skills'
                || value === 'tools'
                || value === 'playbooks'
                || value === 'flows'
                || value === 'canvas-qa-packs'
                ? value
                : undefined;
        };
        CyberVinciAgencyAgentService_1.prototype.isCatalogInstallTarget = function (kind) {
            return kind === 'agent' || kind === 'tool' || kind === 'playbook';
        };
        CyberVinciAgencyAgentService_1.prototype.installNonCatalogMarketplaceItem = function (item, target) {
            return __awaiter(this, void 0, void 0, function () {
                var root, collectionKey, outputPath, record;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.resolveCatalogRoot()];
                        case 1:
                            root = _a.sent();
                            if (!root) {
                                return [2 /*return*/, { ok: false, message: 'Catalog root is not available.' }];
                            }
                            collectionKey = this.nonCatalogMarketplaceCollectionKey(item.collection);
                            if (!collectionKey) {
                                return [2 /*return*/, {
                                        ok: false,
                                        message: "Marketplace install for '".concat(target.kind, "' is not supported by collection '").concat(item.collection, "'."),
                                        path: item.sourcePath
                                    }];
                            }
                            outputPath = path.join(root, 'user', collectionKey, "".concat(this.safeCatalogFileName(item.id), ".yml"));
                            record = {
                                id: item.id,
                                name: item.name,
                                collection: item.collection,
                                source: 'user',
                                sourceMarketplacePath: item.sourcePath,
                                installedAt: new Date().toISOString(),
                                description: item.description,
                                tags: item.tags,
                                installTarget: target
                            };
                            return [4 /*yield*/, fs.mkdir(path.dirname(outputPath), { recursive: true })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, {
                                    version: 'cybervinci.marketplace-install/v1',
                                    marketplaceInstalls: [record]
                                }), 'utf8')];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, {
                                    ok: true,
                                    id: item.id,
                                    path: outputPath,
                                    message: "Installed marketplace ".concat(target.kind, " '").concat(target.id, "' as editable metadata at ").concat(outputPath, ".")
                                }];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.installedNonCatalogMarketplaceItemIds = function () {
            return __awaiter(this, void 0, void 0, function () {
                var root, installed, _i, _a, collectionKey, collectionRoot, _b, _c, file, parsed, _d, _e, record;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0: return [4 /*yield*/, this.resolveCatalogRoot()];
                        case 1:
                            root = _f.sent();
                            installed = new Set();
                            if (!root) {
                                return [2 /*return*/, installed];
                            }
                            _i = 0, _a = ['skills', 'flows', 'canvas-qa-packs'];
                            _f.label = 2;
                        case 2:
                            if (!(_i < _a.length)) return [3 /*break*/, 9];
                            collectionKey = _a[_i];
                            collectionRoot = path.join(root, 'user', collectionKey);
                            return [4 /*yield*/, this.pathExists(collectionRoot)];
                        case 3:
                            if (!(_f.sent())) {
                                return [3 /*break*/, 8];
                            }
                            _b = 0;
                            return [4 /*yield*/, this.collectCatalogFiles(collectionRoot)];
                        case 4:
                            _c = _f.sent();
                            _f.label = 5;
                        case 5:
                            if (!(_b < _c.length)) return [3 /*break*/, 8];
                            file = _c[_b];
                            return [4 /*yield*/, this.readCatalogFile(file)];
                        case 6:
                            parsed = _f.sent();
                            for (_d = 0, _e = this.marketplaceInstallRecords(parsed); _d < _e.length; _d++) {
                                record = _e[_d];
                                if (typeof record.id === 'string' && record.id.trim()) {
                                    installed.add(record.id);
                                }
                            }
                            _f.label = 7;
                        case 7:
                            _b++;
                            return [3 /*break*/, 5];
                        case 8:
                            _i++;
                            return [3 /*break*/, 2];
                        case 9: return [2 /*return*/, installed];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.withMarketplaceInstallAudit = function (item, target, result) {
            return __awaiter(this, void 0, void 0, function () {
                var auditPath, error_3, message;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!result.ok) {
                                return [2 /*return*/, result];
                            }
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.writeMarketplaceInstallAudit(item, target, result)];
                        case 2:
                            auditPath = _c.sent();
                            return [2 /*return*/, __assign(__assign({}, result), { diagnostics: __spreadArray(__spreadArray([], ((_a = result.diagnostics) !== null && _a !== void 0 ? _a : []), true), [
                                        {
                                            severity: 'info',
                                            message: "Marketplace install audit written to ".concat(auditPath, "."),
                                            source: auditPath,
                                            id: 'marketplace.install.audit'
                                        }
                                    ], false) })];
                        case 3:
                            error_3 = _c.sent();
                            message = error_3 instanceof Error ? error_3.message : String(error_3);
                            return [2 /*return*/, __assign(__assign({}, result), { diagnostics: __spreadArray(__spreadArray([], ((_b = result.diagnostics) !== null && _b !== void 0 ? _b : []), true), [
                                        {
                                            severity: 'warning',
                                            message: "Marketplace install audit could not be written: ".concat(message),
                                            source: item.sourcePath,
                                            id: 'marketplace.install.audit.failed'
                                        }
                                    ], false) })];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.writeMarketplaceInstallAudit = function (item, target, result) {
            return __awaiter(this, void 0, void 0, function () {
                var root, auditPath, installedAt, sourceFilePath, outputPath, sourceFileSha256, _a, _b, marketplaceItemSha256, outputFileSha256, _c, _d, record, parsed, _e, existingRecords;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0: return [4 /*yield*/, this.resolveCatalogRoot()];
                        case 1:
                            root = _f.sent();
                            if (!root) {
                                throw new Error('Catalog root is not available.');
                            }
                            auditPath = path.join(root, 'user', 'audit', 'marketplace-installs.yml');
                            installedAt = new Date().toISOString();
                            sourceFilePath = item.sourcePath ? path.resolve.apply(path, __spreadArray([root], item.sourcePath.split(/[\\/]+/g), false)) : undefined;
                            outputPath = result.path ? path.resolve(result.path) : undefined;
                            _b = sourceFilePath && this.pathContainsOrEquals(root, sourceFilePath);
                            if (!_b) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.pathExists(sourceFilePath)];
                        case 2:
                            _b = (_f.sent());
                            _f.label = 3;
                        case 3:
                            if (!_b) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.fileSha256(sourceFilePath)];
                        case 4:
                            _a = _f.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _a = undefined;
                            _f.label = 6;
                        case 6:
                            sourceFileSha256 = _a;
                            marketplaceItemSha256 = this.valueSha256({
                                id: item.id,
                                name: item.name,
                                collection: item.collection,
                                description: item.description,
                                tags: item.tags,
                                sourcePath: item.sourcePath,
                                installTarget: item.installTarget
                            });
                            _d = outputPath && this.pathContainsOrEquals(root, outputPath);
                            if (!_d) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.pathExists(outputPath)];
                        case 7:
                            _d = (_f.sent());
                            _f.label = 8;
                        case 8:
                            if (!_d) return [3 /*break*/, 10];
                            return [4 /*yield*/, this.fileSha256(outputPath)];
                        case 9:
                            _c = _f.sent();
                            return [3 /*break*/, 11];
                        case 10:
                            _c = undefined;
                            _f.label = 11;
                        case 11:
                            outputFileSha256 = _c;
                            record = {
                                id: "marketplace-install-".concat(Date.now().toString(36), "-").concat(Math.random().toString(36).slice(2, 8)),
                                marketplaceItemId: item.id,
                                name: item.name,
                                collection: item.collection,
                                sourcePath: item.sourcePath,
                                sourceFileSha256: sourceFileSha256,
                                sourceFileSignature: sourceFileSha256 ? "sha256:".concat(sourceFileSha256) : undefined,
                                marketplaceItemSha256: marketplaceItemSha256,
                                marketplaceItemSignature: "sha256:".concat(marketplaceItemSha256),
                                installTarget: target,
                                installedId: result.id,
                                outputPath: outputPath ? path.relative(root, outputPath).split(path.sep).join('/') : undefined,
                                outputFileSha256: outputFileSha256,
                                outputFileSignature: outputFileSha256 ? "sha256:".concat(outputFileSha256) : undefined,
                                installedAt: installedAt,
                                resultMessage: result.message
                            };
                            return [4 /*yield*/, this.pathExists(auditPath)];
                        case 12:
                            if (!(_f.sent())) return [3 /*break*/, 14];
                            return [4 /*yield*/, this.readCatalogFile(auditPath)];
                        case 13:
                            _e = _f.sent();
                            return [3 /*break*/, 15];
                        case 14:
                            _e = undefined;
                            _f.label = 15;
                        case 15:
                            parsed = _e;
                            existingRecords = this.marketplaceInstallAuditRecords(parsed);
                            return [4 /*yield*/, fs.mkdir(path.dirname(auditPath), { recursive: true })];
                        case 16:
                            _f.sent();
                            return [4 /*yield*/, fs.writeFile(auditPath, this.stringifyCatalogFile(auditPath, {
                                    version: 'cybervinci.marketplace-install-audit/v1',
                                    marketplaceInstallAudit: __spreadArray(__spreadArray([], existingRecords, true), [record], false)
                                }), 'utf8')];
                        case 17:
                            _f.sent();
                            return [2 /*return*/, auditPath];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.marketplaceInstallAuditRecords = function (parsed) {
            var _this = this;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return [];
            }
            var record = parsed;
            if (Array.isArray(record.marketplaceInstallAudit)) {
                return record.marketplaceInstallAudit.filter(function (item) { return _this.isRecord(item); });
            }
            if (Array.isArray(record.audit)) {
                return record.audit.filter(function (item) { return _this.isRecord(item); });
            }
            return [];
        };
        CyberVinciAgencyAgentService_1.prototype.fileSha256 = function (filePath) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _b = (_a = crypto.createHash('sha256')).update;
                            return [4 /*yield*/, fs.readFile(filePath)];
                        case 1: return [2 /*return*/, _b.apply(_a, [_c.sent()]).digest('hex')];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.valueSha256 = function (value) {
            return crypto.createHash('sha256').update(this.stableJson(value)).digest('hex');
        };
        CyberVinciAgencyAgentService_1.prototype.stableJson = function (value) {
            var _this = this;
            if (Array.isArray(value)) {
                return "[".concat(value.map(function (item) { return _this.stableJson(item); }).join(','), "]");
            }
            if (value && typeof value === 'object') {
                return "{".concat(Object.entries(value)
                    .filter(function (_a) {
                    var item = _a[1];
                    return item !== undefined;
                })
                    .sort(function (_a, _b) {
                    var left = _a[0];
                    var right = _b[0];
                    return left.localeCompare(right);
                })
                    .map(function (_a) {
                    var key = _a[0], item = _a[1];
                    return "".concat(JSON.stringify(key), ":").concat(_this.stableJson(item));
                })
                    .join(','), "}");
            }
            return JSON.stringify(value);
        };
        CyberVinciAgencyAgentService_1.prototype.marketplaceInstallRecords = function (parsed) {
            var _this = this;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return [];
            }
            var record = parsed;
            if (Array.isArray(record.marketplaceInstalls)) {
                return record.marketplaceInstalls.filter(function (item) { return _this.isRecord(item); });
            }
            if (this.isRecord(record.marketplaceInstall)) {
                return [record.marketplaceInstall];
            }
            return [];
        };
        CyberVinciAgencyAgentService_1.prototype.nonCatalogMarketplaceCollectionKey = function (collection) {
            switch (collection) {
                case 'skills':
                    return 'skills';
                case 'flows':
                    return 'flows';
                case 'canvas-qa-packs':
                    return 'canvas-qa-packs';
                default:
                    return undefined;
            }
        };
        CyberVinciAgencyAgentService_1.prototype.catalogMarketplaceItem = function (collection, kind, id, name, description, tags, sourcePath, installedUserIds) {
            var copyId = this.userCopyId(kind, id);
            return {
                id: "catalog.".concat(collection, ".").concat(id),
                name: name,
                collection: collection,
                description: description,
                tags: tags,
                source: 'system',
                sourcePath: sourcePath,
                installTarget: {
                    kind: kind,
                    id: id,
                    action: 'duplicate-to-user'
                },
                installed: installedUserIds.has(copyId)
            };
        };
        CyberVinciAgencyAgentService_1.prototype.copyCatalogItemForUser = function (kind, item) {
            var _a, _b, _c, _d, _e;
            var copy = this.sanitizeCatalogItem(item);
            var originalId = String((_a = item.id) !== null && _a !== void 0 ? _a : kind);
            copy.id = this.userCopyId(kind, originalId);
            copy.name = "".concat(String((_b = copy.name) !== null && _b !== void 0 ? _b : originalId), " Copy");
            copy.source = 'user';
            if (kind === 'tool') {
                copy.protected = false;
                copy.exposeToModel = (_c = item.exposeToModel) !== null && _c !== void 0 ? _c : true;
            }
            if (kind === 'agent' && item.kind === 'native') {
                copy.kind = 'delegate';
                copy.sourceAgentId = (_d = item.sourceAgentId) !== null && _d !== void 0 ? _d : item.id;
                copy.preserveNative = (_e = item.preserveNative) !== null && _e !== void 0 ? _e : { invoke: false, modes: true, prompts: true, variables: true, functions: true };
            }
            if (kind === 'playbook') {
                copy.enabled = true;
            }
            return copy;
        };
        CyberVinciAgencyAgentService_1.prototype.copyCatalogItemForSystemOverride = function (item) {
            var copy = this.sanitizeCatalogItem(item);
            copy.source = 'system-override';
            return copy;
        };
        CyberVinciAgencyAgentService_1.prototype.materializeEditableNativeAgentPlaybook = function (root, agentCopy, sourceAgent) {
            return __awaiter(this, void 0, void 0, function () {
                var sourceAgentId, preferredPlaybookId, playbookId, sourcePlaybookId, sourcePlaybook, playbook, playbooks, outputPath;
                var _a, _b, _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            if (agentCopy.kind !== 'delegate' && agentCopy.kind !== 'native') {
                                return [2 /*return*/, undefined];
                            }
                            sourceAgentId = String((_c = (_b = (_a = agentCopy.sourceAgentId) !== null && _a !== void 0 ? _a : sourceAgent.sourceAgentId) !== null && _b !== void 0 ? _b : sourceAgent.id) !== null && _c !== void 0 ? _c : '').trim();
                            if (!sourceAgentId) {
                                return [2 /*return*/, undefined];
                            }
                            preferredPlaybookId = "user.native-agent.".concat(this.safeCatalogId(sourceAgentId));
                            return [4 /*yield*/, this.uniqueCatalogId('playbook', preferredPlaybookId)];
                        case 1:
                            playbookId = _h.sent();
                            sourcePlaybookId = String((_e = (_d = sourceAgent.defaultPlaybook) !== null && _d !== void 0 ? _d : agentCopy.defaultPlaybook) !== null && _e !== void 0 ? _e : this.nativeAgentPlaybookId(sourceAgentId));
                            return [4 /*yield*/, this.findCatalogItem('playbook', sourcePlaybookId)];
                        case 2:
                            sourcePlaybook = _h.sent();
                            playbook = sourcePlaybook
                                ? this.copyCatalogItemForUser('playbook', sourcePlaybook)
                                : this.createEditableAutonomousNativeAgentPlaybook(playbookId, sourceAgentId, agentCopy, sourceAgent);
                            playbook.id = playbookId;
                            playbook.name = "".concat(String((_g = (_f = agentCopy.name) !== null && _f !== void 0 ? _f : sourceAgent.name) !== null && _g !== void 0 ? _g : sourceAgentId), " Playbook");
                            playbook.category = 'Agents';
                            playbook.enabled = true;
                            playbook.description = "Editable Playbook for user Agent '".concat(agentCopy.id, "'. Customize the role prompt, setup checks, and response flow for this agent.");
                            playbook.tags = __spreadArray([], new Set(__spreadArray(['Agents', 'Autonomous', 'Editable'], ((Array.isArray(sourcePlaybook === null || sourcePlaybook === void 0 ? void 0 : sourcePlaybook.tags) ? sourcePlaybook.tags : []).filter(function (tag) { return typeof tag === 'string' && tag !== 'Native'; })), true)), true);
                            agentCopy.defaultPlaybook = playbookId;
                            playbooks = Array.isArray(agentCopy.playbooks)
                                ? agentCopy.playbooks.filter(function (candidate) { return typeof candidate === 'string' && !!candidate.trim(); })
                                : [];
                            agentCopy.playbooks = __spreadArray([
                                playbookId
                            ], playbooks.filter(function (candidate) { return candidate !== playbookId && candidate !== NATIVE_AGENT_DELEGATE_PLAYBOOK_ID && candidate !== 'direct-chat'; }), true).filter(function (candidate, index, all) { return all.indexOf(candidate) === index; });
                            outputPath = path.join(root, 'user', 'playbooks', "".concat(this.safeCatalogFileName(playbookId), ".yml"));
                            return [4 /*yield*/, fs.mkdir(path.dirname(outputPath), { recursive: true })];
                        case 3:
                            _h.sent();
                            return [4 /*yield*/, fs.writeFile(outputPath, this.stringifyCatalogFile(outputPath, { playbooks: [playbook] }), 'utf8')];
                        case 4:
                            _h.sent();
                            return [2 /*return*/, outputPath];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.createEditableAutonomousNativeAgentPlaybook = function (playbookId, sourceAgentId, agentCopy, sourceAgent) {
            var _a, _b;
            var agentName = String((_b = (_a = agentCopy.name) !== null && _a !== void 0 ? _a : sourceAgent.name) !== null && _b !== void 0 ? _b : sourceAgentId);
            return {
                version: 'cybervinci.playbook/v1',
                id: playbookId,
                name: "".concat(agentName, " Playbook"),
                category: 'Agents',
                source: 'user',
                enabled: true,
                description: "Editable Playbook for ".concat(agentName, ". Customize the role prompt, setup checks, and response flow for this agent."),
                entry: 'describe-agent',
                tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
                tags: ['Agents', 'Autonomous', 'Editable'],
                states: [
                    {
                        id: 'describe-agent',
                        type: 'tool',
                        tool: 'core.agent.describe',
                        saveAs: 'agentProfile',
                        transitions: [{ to: 'preflight' }]
                    },
                    {
                        id: 'preflight',
                        type: 'tool',
                        tool: 'core.agent.preflight',
                        saveAs: 'agentPreflight',
                        transitions: [{ to: 'check-native-requirements' }]
                    },
                    {
                        id: 'check-native-requirements',
                        type: 'tool',
                        tool: 'system.agent.nativeMcpRequirements',
                        saveAs: 'nativeMcpRequirements',
                        transitions: [{ to: 'decide-native-mcp' }]
                    },
                    {
                        id: 'decide-native-mcp',
                        type: 'condition',
                        cases: [
                            { if: { equals: ['${input.skipNativeMcpPrompt}', true] }, next: 'answer-runtime-agent' },
                            { if: { equals: ['${state.nativeMcpRequirements.recommendedAction}', 'configure'] }, next: 'aREDACTED_OPENAI_KEY' },
                            { if: { equals: ['${state.nativeMcpRequirements.recommendedAction}', 'start'] }, next: 'ask-native-mcp-start' }
                        ],
                        default: 'answer-runtime-agent'
                    },
                    {
                        id: 'aREDACTED_OPENAI_KEY',
                        type: 'ask',
                        label: 'Configure MCP requirement',
                        text: '${state.nativeMcpRequirements.selectedGroupLabel} is not ready for ${state.nativeMcpRequirements.agentName}. Choose how to continue.',
                        saveAs: 'nativeMcpDecision',
                        options: [
                            { id: 'configure-settings', label: 'Configure MCP settings', next: 'configure-native-mcp' },
                            { id: 'cancel', label: 'Cancel', next: 'cancel-native-mcp' }
                        ]
                    },
                    {
                        id: 'ask-native-mcp-start',
                        type: 'ask',
                        label: 'Start MCP requirement',
                        text: '${state.nativeMcpRequirements.selectedGroupLabel} is configured but not running for ${state.nativeMcpRequirements.agentName}. Choose how to continue.',
                        saveAs: 'nativeMcpDecision',
                        options: [
                            { id: 'start-through-playbook', label: 'Start MCP servers', next: 'ensure-native-mcp' },
                            { id: 'cancel', label: 'Cancel', next: 'cancel-native-mcp' }
                        ]
                    },
                    {
                        id: 'configure-native-mcp',
                        type: 'tool',
                        tool: 'system.agent.nativeMcpRequirements',
                        args: { mode: 'configure', openSettings: true },
                        saveAs: 'nativeMcpSetup',
                        transitions: [{ to: 'native-mcp-configured-response' }]
                    },
                    {
                        id: 'ensure-native-mcp',
                        type: 'tool',
                        tool: 'system.agent.nativeMcpRequirements',
                        args: { mode: 'ensure' },
                        saveAs: 'nativeMcpSetup',
                        transitions: [
                            { to: 'answer-runtime-agent', when: { equals: ['${state.nativeMcpSetup.ok}', true] } },
                            { to: 'native-mcp-start-failed' }
                        ]
                    },
                    {
                        id: 'native-mcp-configured-response',
                        type: 'response',
                        text: 'MCP settings were opened for ${state.nativeMcpRequirements.selectedGroupLabel}. Save the required values and run the agent again.'
                    },
                    {
                        id: 'native-mcp-start-failed',
                        type: 'response',
                        text: 'Could not start ${state.nativeMcpRequirements.selectedGroupLabel}: ${state.nativeMcpSetup.message}'
                    },
                    {
                        id: 'cancel-native-mcp',
                        type: 'response',
                        text: '${state.nativeMcpRequirements.selectedGroupLabel} setup was cancelled.'
                    },
                    {
                        id: 'answer-runtime-agent',
                        type: 'ai',
                        agent: sourceAgentId,
                        prompt: "You are running as the CyberVinci autonomous replacement for the ".concat(agentName, " Theia chat agent.\n\nUser request:\n").concat('${input.prompt}', "\n\nSelected agent:\n").concat('${state.agentProfile.agent.name}', "\n\nAgent description:\n").concat('${state.agentProfile.agent.description}', "\n\nUse the preserved agent profile, preflight result, MCP readiness, and available context to answer the user directly. Do not claim you used the original Theia native agent or any tool that is not present in the current playbook state."),
                        input: {
                            prompt: '${input.prompt}',
                            agentId: '${input.agentId}',
                            sourceAgentId: '${input.sourceAgentId}',
                            agentProfile: '${state.agentProfile}',
                            preflight: '${state.agentPreflight}',
                            nativeMcpRequirements: '${state.nativeMcpRequirements}'
                        },
                        saveAs: 'runtimeAgentAnswer',
                        transitions: [{ to: 'runtime-agent-response' }]
                    },
                    {
                        id: 'runtime-agent-response',
                        type: 'response',
                        text: '${state.runtimeAgentAnswer}'
                    },
                    {
                        id: 'end',
                        type: 'end'
                    }
                ]
            };
        };
        CyberVinciAgencyAgentService_1.prototype.assignPlaybookToAgentRecord = function (item, playbookId) {
            var copy = this.cloneCatalogValue(item);
            var playbooks = Array.isArray(copy.playbooks)
                ? copy.playbooks.filter(function (candidate) { return typeof candidate === 'string' && !!candidate.trim(); })
                : [];
            copy.defaultPlaybook = playbookId;
            copy.playbooks = __spreadArray([playbookId], playbooks.filter(function (candidate) { return candidate !== playbookId; }), true);
            return copy;
        };
        CyberVinciAgencyAgentService_1.prototype.sanitizeCatalogItem = function (item) {
            var copy = this.cloneCatalogValue(item);
            delete copy.sourcePath;
            delete copy.relativePath;
            return copy;
        };
        CyberVinciAgencyAgentService_1.prototype.userCopyId = function (kind, id) {
            var base = this.safeCatalogId(id);
            if (kind === 'tool') {
                return base.startsWith('user.') ? "".concat(base, ".copy") : "user.".concat(base);
            }
            return base.startsWith('user.') ? "".concat(base, ".copy") : "user.".concat(base);
        };
        CyberVinciAgencyAgentService_1.prototype.uniqueCatalogId = function (kind, preferredId) {
            return __awaiter(this, void 0, void 0, function () {
                var manifest, existing, index, candidate;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.getDeclarativeChatAgentManifest()];
                        case 1:
                            manifest = _c.sent();
                            existing = new Set((kind === 'agent'
                                ? manifest.agents
                                : kind === 'playbook'
                                    ? (_a = manifest.playbooks) !== null && _a !== void 0 ? _a : []
                                    : (_b = manifest.tools) !== null && _b !== void 0 ? _b : []).map(function (item) { return item.id; }));
                            if (!existing.has(preferredId)) {
                                return [2 /*return*/, preferredId];
                            }
                            for (index = 2; index < 1000; index++) {
                                candidate = "".concat(preferredId, "-").concat(index);
                                if (!existing.has(candidate)) {
                                    return [2 /*return*/, candidate];
                                }
                            }
                            return [2 /*return*/, "".concat(preferredId, "-").concat(Date.now().toString(36))];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.safeCatalogId = function (id) {
            return id
                .trim()
                .replace(/[\\/]+/g, '.')
                .replace(/[^a-zA-Z0-9_.-]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .toLowerCase() || 'item';
        };
        CyberVinciAgencyAgentService_1.prototype.safeCatalogFileName = function (id) {
            return this.safeCatalogId(id).replace(/\.+/g, '-');
        };
        CyberVinciAgencyAgentService_1.prototype.uniqueMarkdownOutputPath = function (directory, baseName) {
            return __awaiter(this, void 0, void 0, function () {
                var safeBase, index, suffix, candidate;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            safeBase = this.safeCatalogFileName(baseName) || 'agent-profile';
                            index = 0;
                            _a.label = 1;
                        case 1:
                            if (!true) return [3 /*break*/, 3];
                            suffix = index === 0 ? '' : "-".concat(index + 1);
                            candidate = path.join(directory, "".concat(safeBase).concat(suffix, ".md"));
                            return [4 /*yield*/, this.pathExists(candidate)];
                        case 2:
                            if (!(_a.sent())) {
                                return [2 /*return*/, candidate];
                            }
                            index++;
                            return [3 /*break*/, 1];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.cloneCatalogValue = function (value) {
            return JSON.parse(JSON.stringify(value));
        };
        CyberVinciAgencyAgentService_1.prototype.removeCatalogOverride = function (parsed, key, id) {
            var _a;
            var _this = this;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return { changed: false };
            }
            var record = parsed;
            if (Array.isArray(record[key])) {
                var before = record[key].length;
                var next = record[key].filter(function (item) { return !_this.isRecord(item) || item.id !== id; });
                if (next.length === before) {
                    return { changed: false };
                }
                var updated_1 = __assign(__assign({}, record), (_a = {}, _a[key] = next, _a));
                var hasCatalogContent = ['agents', 'tools', 'playbooks', 'diagnostics'].some(function (candidateKey) {
                    var value = updated_1[candidateKey];
                    return Array.isArray(value) ? value.length > 0 : value !== undefined;
                });
                return {
                    changed: true,
                    removeFile: !hasCatalogContent,
                    value: updated_1
                };
            }
            if (this.isRecord(parsed) && typeof parsed.id === 'string' && parsed.id === id && this.recordLooksLikeCatalogKind(parsed, key)) {
                return { changed: true, removeFile: true };
            }
            return { changed: false };
        };
        CyberVinciAgencyAgentService_1.prototype.updateCatalogItemInParsed = function (parsed, key, id, updater) {
            var _a;
            var _this = this;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return { changed: false };
            }
            var record = parsed;
            if (Array.isArray(record[key])) {
                var changed_1 = false;
                var next = record[key].map(function (item) {
                    if (_this.isRecord(item) && item.id === id) {
                        changed_1 = true;
                        return updater(item);
                    }
                    return item;
                });
                return changed_1
                    ? {
                        changed: true,
                        value: __assign(__assign({}, record), (_a = {}, _a[key] = next, _a))
                    }
                    : { changed: false };
            }
            if (this.isRecord(parsed) && typeof parsed.id === 'string' && parsed.id === id && this.recordLooksLikeCatalogKind(parsed, key)) {
                return { changed: true, value: updater(parsed) };
            }
            return { changed: false };
        };
        CyberVinciAgencyAgentService_1.prototype.recordLooksLikeCatalogKind = function (record, key) {
            if (key === 'agents') {
                return typeof record.kind === 'string' || typeof record.sourceAgentId === 'string' || typeof record.defaultPlaybook === 'string';
            }
            if (key === 'playbooks') {
                return Array.isArray(record.states) || typeof record.entry === 'string';
            }
            return typeof record.implementation === 'string' || typeof record.command === 'string' || typeof record.theiaToolId === 'string';
        };
        CyberVinciAgencyAgentService_1.prototype.mergeCatalogObject = function (result, parsed, source, sourcePath) {
            var _a, _b, _c, _d, _e, _f, _g;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                result.diagnostics.push({
                    severity: 'warning',
                    source: sourcePath,
                    message: 'Catalog file ignored because it does not contain an object.'
                });
                return;
            }
            var record = parsed;
            if (Array.isArray(record.agents)) {
                for (var _i = 0, _h = record.agents.entries(); _i < _h.length; _i++) {
                    var _j = _h[_i], index = _j[0], agent = _j[1];
                    var validated = this.validator.validateAgent(agent, "".concat(sourcePath, "#agents.").concat(index));
                    (_a = result.diagnostics).push.apply(_a, validated.diagnostics);
                    if (validated.value) {
                        result.agents.push(__assign(__assign({}, validated.value), { source: source, sourcePath: sourcePath }));
                    }
                }
            }
            else if (this.isDeclarativeChatAgent(parsed)) {
                var validated = this.validator.validateAgent(parsed, sourcePath);
                (_b = result.diagnostics).push.apply(_b, validated.diagnostics);
                if (validated.value) {
                    result.agents.push(__assign(__assign({}, validated.value), { source: source, sourcePath: sourcePath }));
                }
            }
            if (Array.isArray(record.tools)) {
                for (var _k = 0, _l = record.tools.entries(); _k < _l.length; _k++) {
                    var _m = _l[_k], index = _m[0], tool = _m[1];
                    var validated = this.validator.validateTool(tool, "".concat(sourcePath, "#tools.").concat(index));
                    (_c = result.diagnostics).push.apply(_c, validated.diagnostics);
                    if (validated.value) {
                        result.tools.push(__assign(__assign({}, validated.value), { source: source, sourcePath: sourcePath }));
                    }
                }
            }
            else if (this.isDeclarativeTool(parsed)) {
                var validated = this.validator.validateTool(parsed, sourcePath);
                (_d = result.diagnostics).push.apply(_d, validated.diagnostics);
                if (validated.value) {
                    result.tools.push(__assign(__assign({}, validated.value), { source: source, sourcePath: sourcePath }));
                }
            }
            if (Array.isArray(record.playbooks)) {
                for (var _o = 0, _p = record.playbooks.entries(); _o < _p.length; _o++) {
                    var _q = _p[_o], index = _q[0], playbook = _q[1];
                    var validated = this.validator.validatePlaybook(playbook, "".concat(sourcePath, "#playbooks.").concat(index));
                    (_e = result.diagnostics).push.apply(_e, validated.diagnostics);
                    if (validated.value) {
                        result.playbooks.push(__assign(__assign({}, validated.value), { source: source, sourcePath: sourcePath }));
                    }
                }
            }
            else if (this.isPlaybookDefinition(parsed)) {
                var validated = this.validator.validatePlaybook(parsed, sourcePath);
                (_f = result.diagnostics).push.apply(_f, validated.diagnostics);
                if (validated.value) {
                    result.playbooks.push(__assign(__assign({}, validated.value), { source: source, sourcePath: sourcePath }));
                }
            }
            if (Array.isArray(record.diagnostics)) {
                (_g = result.diagnostics).push.apply(_g, record.diagnostics.filter(this.isCatalogDiagnostic));
            }
        };
        CyberVinciAgencyAgentService_1.prototype.resolveDeclarativeChatAgentsPath = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, explicit, candidates, _i, candidates_3, candidate;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = this.cachedManifestPath;
                            if (!_a) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.pathExists(this.cachedManifestPath)];
                        case 1:
                            _a = (_b.sent());
                            _b.label = 2;
                        case 2:
                            if (_a) {
                                return [2 /*return*/, this.cachedManifestPath];
                            }
                            explicit = process.env.CYBERVINCI_CHAT_AGENTS_FILE;
                            candidates = __spreadArray(__spreadArray(__spreadArray([
                                explicit
                            ], this.packageConfigCandidates().map(function (base) { return path.join(base, 'chat-agents.json'); }), true), this.parentCandidates(process.cwd()).map(function (base) { return path.join(base, CHAT_AGENTS_RELATIVE_PATH); }), true), this.parentCandidates(__dirname).map(function (base) { return path.join(base, CHAT_AGENTS_RELATIVE_PATH); }), true).filter(function (candidate) { return !!candidate; });
                            _i = 0, candidates_3 = candidates;
                            _b.label = 3;
                        case 3:
                            if (!(_i < candidates_3.length)) return [3 /*break*/, 6];
                            candidate = candidates_3[_i];
                            return [4 /*yield*/, this.pathExists(candidate)];
                        case 4:
                            if (_b.sent()) {
                                this.cachedManifestPath = candidate;
                                return [2 /*return*/, candidate];
                            }
                            _b.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6: return [2 /*return*/, undefined];
                    }
                });
            });
        };
        CyberVinciAgencyAgentService_1.prototype.isDeclarativeChatAgent = function (candidate) {
            if (!candidate || typeof candidate !== 'object') {
                return false;
            }
            var record = candidate;
            return typeof record.id === 'string'
                && typeof record.name === 'string'
                && (record.kind === 'native'
                    || record.kind === 'delegate'
                    || record.kind === 'prompt'
                    || record.kind === 'markdown'
                    || record.kind === 'flow'
                    || record.kind === 'external'
                    || record.kind === 'profile');
        };
        CyberVinciAgencyAgentService_1.prototype.isDeclarativeTool = function (candidate) {
            if (!candidate || typeof candidate !== 'object') {
                return false;
            }
            var record = candidate;
            return typeof record.id === 'string' && typeof record.name === 'string';
        };
        CyberVinciAgencyAgentService_1.prototype.isPlaybookDefinition = function (candidate) {
            if (!candidate || typeof candidate !== 'object') {
                return false;
            }
            var record = candidate;
            return typeof record.id === 'string'
                && typeof record.name === 'string'
                && typeof record.entry === 'string'
                && Array.isArray(record.states);
        };
        CyberVinciAgencyAgentService_1.prototype.isRecord = function (candidate) {
            return !!candidate && typeof candidate === 'object' && !Array.isArray(candidate);
        };
        CyberVinciAgencyAgentService_1.prototype.isCatalogDiagnostic = function (candidate) {
            if (!candidate || typeof candidate !== 'object') {
                return false;
            }
            var record = candidate;
            return (record.severity === 'info' || record.severity === 'warning' || record.severity === 'error')
                && typeof record.message === 'string';
        };
        CyberVinciAgencyAgentService_1.prototype.resolveConfiguredPath = function (configuredPath) {
            if (path.isAbsolute(configuredPath)) {
                return configuredPath;
            }
            return path.resolve(process.cwd(), configuredPath);
        };
        CyberVinciAgencyAgentService_1.prototype.validateCommandToolPathPolicy = function (toolId, cwd, allowedPaths, deniedPaths) {
            var _this = this;
            var resolvedCwd = path.resolve(cwd);
            var allowed = (allowedPaths !== null && allowedPaths !== void 0 ? allowedPaths : []).map(function (item) { return item.trim(); }).filter(Boolean).map(function (item) { return _this.resolveConfiguredPath(item); });
            var denied = (deniedPaths !== null && deniedPaths !== void 0 ? deniedPaths : []).map(function (item) { return item.trim(); }).filter(Boolean).map(function (item) { return _this.resolveConfiguredPath(item); });
            if (allowed.length > 0 && !allowed.some(function (allowedPath) { return _this.pathContainsOrEquals(allowedPath, resolvedCwd); })) {
                throw new Error("Declarative tool '".concat(toolId, "' cwd '").concat(resolvedCwd, "' is not inside policy.allowedPaths."));
            }
            var deniedPath = denied.find(function (candidate) { return _this.pathContainsOrEquals(candidate, resolvedCwd); });
            if (deniedPath) {
                throw new Error("Declarative tool '".concat(toolId, "' cwd '").concat(resolvedCwd, "' is inside policy.deniedPaths '").concat(path.resolve(deniedPath), "'."));
            }
        };
        CyberVinciAgencyAgentService_1.prototype.pathContainsOrEquals = function (parent, child) {
            var resolvedParent = path.resolve(parent);
            var resolvedChild = path.resolve(child);
            var relative = path.relative(resolvedParent, resolvedChild);
            return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
        };
        CyberVinciAgencyAgentService_1.prototype.parentCandidates = function (start) {
            var candidates = [];
            var current = path.resolve(start);
            while (true) {
                candidates.push(current);
                var next = path.dirname(current);
                if (next === current) {
                    return candidates;
                }
                current = next;
            }
        };
        CyberVinciAgencyAgentService_1.prototype.packageConfigCandidates = function () {
            return [
                path.resolve(__dirname, '..', '..', 'config'),
                path.resolve(__dirname, '..', '..', '..', 'config')
            ];
        };
        CyberVinciAgencyAgentService_1.prototype.pathExists = function (candidate) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, fs.access(candidate)];
                        case 1:
                            _b.sent();
                            return [2 /*return*/, true];
                        case 2:
                            _a = _b.sent();
                            return [2 /*return*/, false];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        return CyberVinciAgencyAgentService_1;
    }());
    __setFunctionName(_classThis, "CyberVinciAgencyAgentService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CyberVinciAgencyAgentService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CyberVinciAgencyAgentService = _classThis;
}();
exports.CyberVinciAgencyAgentService = CyberVinciAgencyAgentService;
