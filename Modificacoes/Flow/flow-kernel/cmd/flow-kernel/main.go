package main

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	protocolVersion = "flow-kernel/stdio/v1"
	workflowVersion = "flow.workflow/v1"
)

type Message map[string]any

type Workflow struct {
	Version     string            `json:"version"`
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Agents      map[string]string `json:"agents,omitempty"`
	Requires    map[string]any    `json:"requires,omitempty"`
	States      map[string]State  `json:"states"`
	Transitions []Transition      `json:"transitions"`
}

type State struct {
	Type            string           `json:"type"`
	Agent           string           `json:"agent,omitempty"`
	AgentRole       string           `json:"agentRole,omitempty"`
	Provider        any              `json:"provider,omitempty"`
	ModelExecution  any              `json:"modelExecution,omitempty"`
	Input           InputContract    `json:"input,omitempty"`
	Outputs         []string         `json:"outputs,omitempty"`
	WaitFor         []string         `json:"waitFor,omitempty"`
	Branches        map[string]State `json:"branches,omitempty"`
	DynamicParallel any              `json:"dynamicParallel,omitempty"`
	Tournament      any              `json:"tournament,omitempty"`
	GateID          string           `json:"gateId,omitempty"`
	Retry           map[string]any   `json:"retry,omitempty"`
	Signals         any              `json:"signals,omitempty"`
	Effects         []any            `json:"effects,omitempty"`
}

type InputContract struct {
	Include []string `json:"include,omitempty"`
	Signals []string `json:"signals,omitempty"`
}

type Transition struct {
	ID       string         `json:"id,omitempty"`
	From     string         `json:"from"`
	To       string         `json:"to"`
	On       string         `json:"on"`
	Guard    map[string]any `json:"guard,omitempty"`
	Priority int            `json:"priority,omitempty"`
}

type Run struct {
	ID              string              `json:"id"`
	WorkflowID      string              `json:"workflowId"`
	Workflow        Workflow            `json:"workflow"`
	Input           string              `json:"input,omitempty"`
	Status          string              `json:"status"`
	Error           string              `json:"error,omitempty"`
	CreatedAt       string              `json:"createdAt"`
	UpdatedAt       string              `json:"updatedAt"`
	ActiveStates    map[string]bool     `json:"activeStates,omitempty"`
	CompletedStates map[string]bool     `json:"completedStates,omitempty"`
	BranchCompleted map[string]bool     `json:"branchCompleted,omitempty"`
	Workloads       map[string]Workload `json:"workloads,omitempty"`
	Artifacts       map[string]Artifact `json:"artifacts,omitempty"`
	Effects         []Effect            `json:"effects,omitempty"`
	Signals         map[string]any      `json:"signals,omitempty"`
	Requests        []HostRequest       `json:"requests,omitempty"`
}

type Workload struct {
	ID                 string        `json:"id"`
	RunID              string        `json:"runId"`
	StateID            string        `json:"stateId"`
	ParentState        string        `json:"parentState,omitempty"`
	Agent              string        `json:"agent,omitempty"`
	Status             string        `json:"status"`
	Attempt            int           `json:"attempt,omitempty"`
	PreviousWorkloadID string        `json:"previousWorkloadId,omitempty"`
	Input              InputContract `json:"input,omitempty"`
	Outputs            []string      `json:"outputs,omitempty"`
	CreatedAt          string        `json:"createdAt"`
	StartedAt          string        `json:"startedAt,omitempty"`
	CompletedAt        string        `json:"completedAt,omitempty"`
}

type Artifact struct {
	ID         string `json:"id"`
	Type       string `json:"type,omitempty"`
	Path       string `json:"path"`
	StateID    string `json:"stateId,omitempty"`
	WorkloadID string `json:"workloadId,omitempty"`
	CreatedAt  string `json:"createdAt"`
}

type Effect struct {
	ID             string         `json:"id,omitempty"`
	Type           string         `json:"type"`
	Path           string         `json:"path,omitempty"`
	Command        string         `json:"command,omitempty"`
	HashBefore     string         `json:"hashBefore,omitempty"`
	HashAfter      string         `json:"hashAfter,omitempty"`
	Patch          string         `json:"patch,omitempty"`
	Summary        string         `json:"summary,omitempty"`
	Status         string         `json:"status,omitempty"`
	ApprovalPolicy string         `json:"approvalPolicy,omitempty"`
	StateID        string         `json:"stateId,omitempty"`
	WorkloadID     string         `json:"workloadId,omitempty"`
	CreatedAt      string         `json:"createdAt,omitempty"`
	Payload        map[string]any `json:"payload,omitempty"`
}

type HostRequest struct {
	ID             string   `json:"id"`
	RequestID      string   `json:"requestId"`
	Type           string   `json:"type"`
	RunID          string   `json:"runId"`
	WorkloadID     string   `json:"workloadId,omitempty"`
	StateID        string   `json:"stateId,omitempty"`
	Agent          string   `json:"agent,omitempty"`
	InputArtifacts []string `json:"inputArtifacts,omitempty"`
	OutputContract string   `json:"outputContract,omitempty"`
	ArtifactID     string   `json:"artifactId,omitempty"`
	GateID         string   `json:"gateId,omitempty"`
	Path           string   `json:"path,omitempty"`
}

type Event struct {
	Seq          int            `json:"seq"`
	Time         string         `json:"time"`
	Type         string         `json:"type"`
	RunID        string         `json:"runId"`
	StateID      string         `json:"stateId,omitempty"`
	WorkloadID   string         `json:"workloadId,omitempty"`
	GateID       string         `json:"gateId,omitempty"`
	TransitionID string         `json:"transitionId,omitempty"`
	Message      string         `json:"message,omitempty"`
	Data         map[string]any `json:"data,omitempty"`
}

type StoredRun struct {
	Run    Run     `json:"run"`
	Events []Event `json:"events"`
}

type Kernel struct {
	mu     sync.Mutex
	runs   map[string]*Run
	events map[string][]Event
}

func NewKernel() *Kernel {
	return &Kernel{runs: map[string]*Run{}, events: map[string][]Event{}}
}

func main() {
	if len(os.Args) != 3 || os.Args[1] != "serve" || os.Args[2] != "--stdio" {
		fmt.Fprintln(os.Stderr, "usage: flow-kernel serve --stdio")
		os.Exit(2)
	}
	if err := NewKernel().serveStdio(os.Stdin, os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}
}

func (k *Kernel) serveStdio(input io.Reader, output io.Writer) error {
	scanner := bufio.NewScanner(input)
	scanner.Buffer(make([]byte, 0, 64*1024), 16*1024*1024)
	writer := bufio.NewWriter(output)
	encoder := json.NewEncoder(writer)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var message Message
		if err := json.Unmarshal([]byte(line), &message); err != nil {
			_ = encoder.Encode(Message{"type": "error", "error": "invalid json payload"})
			_ = writer.Flush()
			continue
		}
		response := k.Handle(message)
		if err := encoder.Encode(response); err != nil {
			return err
		}
		if err := writer.Flush(); err != nil {
			return err
		}
	}
	return scanner.Err()
}

func (k *Kernel) Handle(message Message) Message {
	k.mu.Lock()
	defer k.mu.Unlock()

	id := stringValue(message["id"])
	requestType := stringValue(message["type"])
	response := Message{"id": id}
	if requestType == "" {
		response["type"] = "error"
		response["error"] = "missing request type"
		return response
	}

	var err error
	switch requestType {
	case "handshake":
		response["type"] = "handshake.ok"
		response["protocol"] = protocolVersion
		response["version"] = workflowVersion
	case "status":
		response["type"] = "status.ok"
		response["status"] = "ready"
	case "validate_workflow":
		workflow, validateErr := decodeWorkflow(message["workflow"])
		if validateErr == nil {
			validateErr = validateWorkflow(workflow)
		}
		response["type"] = "validate_workflow.ok"
		response["valid"] = validateErr == nil
		response["workflowId"] = workflow.ID
	case "start_run":
		response, err = k.startRun(id, message)
	case "tick_run":
		response, err = k.withRun(id, message, func(run *Run, _ string) Message {
			k.progressRun(run)
			return runResponse(id, "tick_run.ok", run)
		})
	case "get_run":
		response, err = k.withRun(id, message, func(run *Run, _ string) Message {
			return runResponse(id, "get_run.ok", run)
		})
	case "list_events":
		response, err = k.listEvents(id, message)
	case "pause_run", "resume_run", "cancel_run":
		response, err = k.lifecycle(id, requestType, message)
	case "workload_started":
		response, err = k.markWorkloadStarted(id, message)
	case "workload_completed", "workload_failed":
		response, err = k.markWorkloadDone(id, requestType, message)
	case "artifact_created":
		response, err = k.recordArtifact(id, message)
	case "effect_recorded":
		response, err = k.recordEffect(id, message)
	case "signal_recorded":
		response, err = k.recordSignal(id, message)
	case "issue_recorded":
		response, err = k.recordIssue(id, message)
	case "gate_approved", "gate_rejected":
		response, err = k.recordGateDecision(id, requestType, message)
	default:
		response["type"] = "error"
		response["error"] = fmt.Sprintf("unsupported request type %q", requestType)
	}
	if err != nil {
		return Message{"id": id, "type": "error", "error": err.Error()}
	}
	return response
}

func (k *Kernel) startRun(id string, message Message) (Message, error) {
	workflow, err := decodeWorkflow(message["workflow"])
	if err != nil {
		return nil, err
	}
	if err := validateWorkflow(workflow); err != nil {
		return nil, err
	}
	storeDir := stringValue(message["storeDir"])
	if storeDir == "" {
		return nil, errors.New("start_run requires storeDir")
	}
	if err := os.MkdirAll(storeDir, 0o755); err != nil {
		return nil, err
	}
	now := timestamp()
	run := &Run{
		ID:              "run_" + randomID(),
		WorkflowID:      workflow.ID,
		Workflow:        workflow,
		Input:           stringValue(message["input"]),
		Status:          "running",
		CreatedAt:       now,
		UpdatedAt:       now,
		ActiveStates:    map[string]bool{},
		CompletedStates: map[string]bool{},
		BranchCompleted: map[string]bool{},
		Workloads:       map[string]Workload{},
		Artifacts:       map[string]Artifact{},
		Signals:         map[string]any{},
		Requests:        []HostRequest{},
	}
	k.runs[run.ID] = run
	k.events[run.ID] = []Event{}
	k.addEvent(run, "run.started", "", "", "", "", "run started", nil)
	for _, stateID := range initialStates(workflow) {
		k.enterState(run, stateID, "")
		k.fireTransitions(run, stateID, "run.started")
	}
	k.progressRun(run)
	if err := k.saveRun(storeDir, run); err != nil {
		return nil, err
	}
	return runResponse(id, "start_run.ok", run), nil
}

func (k *Kernel) withRun(id string, message Message, fn func(*Run, string) Message) (Message, error) {
	runID := stringValue(message["runId"])
	storeDir := stringValue(message["storeDir"])
	run, err := k.loadRun(runID, storeDir)
	if err != nil {
		return nil, err
	}
	response := fn(run, storeDir)
	if storeDir != "" {
		if err := k.saveRun(storeDir, run); err != nil {
			return nil, err
		}
	}
	response["id"] = id
	return response, nil
}

func (k *Kernel) listEvents(id string, message Message) (Message, error) {
	runID := stringValue(message["runId"])
	storeDir := stringValue(message["storeDir"])
	if _, err := k.loadRun(runID, storeDir); err != nil {
		return nil, err
	}
	return Message{"id": id, "type": "list_events.ok", "events": k.events[runID]}, nil
}

func (k *Kernel) lifecycle(id, requestType string, message Message) (Message, error) {
	return k.withRun(id, message, func(run *Run, _ string) Message {
		eventType := strings.TrimSuffix(requestType, "_run")
		switch requestType {
		case "pause_run":
			run.Status = "paused"
			k.addEvent(run, "run.paused", "", "", "", "", stringValue(message["reason"]), nil)
		case "resume_run":
			run.Status = "running"
			k.addEvent(run, "run.resumed", "", "", "", "", stringValue(message["reason"]), nil)
			k.progressRun(run)
		case "cancel_run":
			run.Status = "cancelled"
			run.ActiveStates = map[string]bool{}
			run.Requests = nil
			k.addEvent(run, "run.cancelled", "", "", "", "", stringValue(message["reason"]), nil)
		}
		return runResponse(id, eventType+"_run.ok", run)
	})
}

func (k *Kernel) markWorkloadStarted(id string, message Message) (Message, error) {
	return k.withRun(id, message, func(run *Run, _ string) Message {
		workloadID := stringValue(message["workloadId"])
		workload := run.Workloads[workloadID]
		if workload.ID != "" && workload.Status != "started" {
			workload.Status = "started"
			workload.StartedAt = timestamp()
			run.Workloads[workloadID] = workload
			k.addEvent(run, "workload.started", workload.StateID, workload.ID, "", "", "workload started", nil)
		}
		return runResponse(id, "workload_started.ok", run)
	})
}

func (k *Kernel) markWorkloadDone(id, requestType string, message Message) (Message, error) {
	return k.withRun(id, message, func(run *Run, _ string) Message {
		workloadID := stringValue(message["workloadId"])
		workload := run.Workloads[workloadID]
		if workload.ID == "" {
			run.Status = "failed"
			run.Error = "unknown workload " + workloadID
			return runResponse(id, requestType+".ok", run)
		}
		failed := requestType == "workload_failed"
		workload.Status = "completed"
		if failed {
			workload.Status = "failed"
		}
		workload.CompletedAt = timestamp()
		run.Workloads[workloadID] = workload
		k.removeRequest(run, workloadID)
		if failed {
			k.addEvent(run, "workload.failed", workload.StateID, workload.ID, "", "", stringValue(message["error"]), nil)
			if !k.completeState(run, workload.StateID, "workload.failed") {
				run.Status = "failed"
				run.Error = stringValue(message["error"])
			}
		} else if hasGate(run.Workflow, workload.StateID) {
			k.waitForGate(run, workload.StateID, gateID(run.Workflow, workload.StateID))
		} else {
			k.addEvent(run, "workload.completed", workload.StateID, workload.ID, "", "", "workload completed", nil)
			k.completeState(run, workload.StateID, "workload.completed")
		}
		k.progressRun(run)
		return runResponse(id, requestType+".ok", run)
	})
}

func (k *Kernel) recordArtifact(id string, message Message) (Message, error) {
	return k.withRun(id, message, func(run *Run, _ string) Message {
		artifactID := nonEmpty(stringValue(message["artifactId"]), "artifact_"+randomID())
		artifact := Artifact{ID: artifactID, Type: stringValue(message["artifactType"]), Path: stringValue(message["path"]), StateID: stringValue(message["stateId"]), WorkloadID: stringValue(message["workloadId"]), CreatedAt: timestamp()}
		run.Artifacts[artifact.ID] = artifact
		k.addEvent(run, "artifact.created", artifact.StateID, artifact.WorkloadID, "", "", artifact.Path, map[string]any{"path": artifact.Path, "artifactId": artifact.ID})
		return runResponse(id, "artifact_created.ok", run)
	})
}

func (k *Kernel) recordEffect(id string, message Message) (Message, error) {
	return k.withRun(id, message, func(run *Run, _ string) Message {
		effect := Effect{ID: "effect_" + randomID(), Type: nonEmpty(stringValue(message["effectType"]), "effect.recorded"), Path: stringValue(message["path"]), Command: stringValue(message["command"]), HashBefore: stringValue(message["hashBefore"]), HashAfter: stringValue(message["hashAfter"]), Patch: stringValue(message["patch"]), Summary: stringValue(message["summary"]), Status: stringValue(message["status"]), ApprovalPolicy: stringValue(message["approvalPolicy"]), StateID: stringValue(message["stateId"]), WorkloadID: stringValue(message["workloadId"]), CreatedAt: timestamp(), Payload: mapValue(message["payload"])}
		if len(effect.Payload) == 0 {
			effect.Payload = mapValue(message["effect"])
		}
		run.Effects = append(run.Effects, effect)
		k.addEvent(run, "effect.recorded", effect.StateID, effect.WorkloadID, "", "", effect.Summary, map[string]any{"type": effect.Type, "path": effect.Path, "summary": effect.Summary, "hashBefore": effect.HashBefore, "hashAfter": effect.HashAfter, "patch": effect.Patch, "payload": effect.Payload})
		return runResponse(id, "effect_recorded.ok", run)
	})
}

func (k *Kernel) recordSignal(id string, message Message) (Message, error) {
	return k.withRun(id, message, func(run *Run, _ string) Message {
		key := stringValue(message["key"])
		if key != "" {
			run.Signals[key] = message["value"]
			k.addEvent(run, "signal.recorded", stringValue(message["stateId"]), stringValue(message["workloadId"]), "", "", key, map[string]any{"key": key, "value": message["value"]})
		}
		return runResponse(id, "signal_recorded.ok", run)
	})
}

func (k *Kernel) recordIssue(id string, message Message) (Message, error) {
	return k.withRun(id, message, func(run *Run, _ string) Message {
		issue, _ := message["issue"].(map[string]any)
		k.addEvent(run, "issue.recorded", stringValue(message["stateId"]), stringValue(message["workloadId"]), "", "", "issue recorded", issue)
		return runResponse(id, "issue_recorded.ok", run)
	})
}

func (k *Kernel) recordGateDecision(id, requestType string, message Message) (Message, error) {
	return k.withRun(id, message, func(run *Run, _ string) Message {
		gateID := stringValue(message["gateId"])
		stateID := k.stateForGate(run, gateID)
		if stateID == "" {
			run.Status = "failed"
			run.Error = "unknown gate " + gateID
			return runResponse(id, requestType+".ok", run)
		}
		k.removeRequest(run, gateID)
		if requestType == "gate_rejected" {
			k.addEvent(run, "gate.rejected", stateID, "", gateID, "", nonEmpty(stringValue(message["note"]), "gate rejected"), nil)
			run.Status = "failed"
			run.ActiveStates = map[string]bool{}
		} else {
			k.addEvent(run, "gate.approved", stateID, "", gateID, "", nonEmpty(stringValue(message["note"]), "gate approved"), nil)
			k.completeState(run, stateID, "gate.approved")
			k.progressRun(run)
		}
		return runResponse(id, requestType+".ok", run)
	})
}

func (k *Kernel) progressRun(run *Run) {
	if run.Status == "paused" || run.Status == "cancelled" || run.Status == "failed" || run.Status == "completed" {
		return
	}
	if hasHumanGateRequest(run) {
		run.Status = "waiting"
		return
	}
	if len(run.Requests) > 0 {
		run.Status = "running"
		return
	}
	if len(activeStateIDs(run)) == 0 {
		run.Status = "completed"
		k.addEvent(run, "run.completed", "", "", "", "", "run completed", nil)
	} else {
		run.Status = "running"
	}
	run.UpdatedAt = timestamp()
}

func (k *Kernel) enterState(run *Run, stateID, parent string) {
	if run.ActiveStates[stateID] {
		return
	}
	state, ok := findState(run.Workflow, stateID)
	if !ok {
		run.Status = "failed"
		run.Error = "unknown state " + stateID
		return
	}
	delete(run.CompletedStates, stateID)
	delete(run.BranchCompleted, stateID)
	run.ActiveStates[stateID] = true
	k.addEvent(run, "state.entered", stateID, "", "", "", "state entered", nil)
	switch state.Type {
	case "input", "join", "condition":
		k.completeState(run, stateID, "workload.completed")
	case "parallel":
		branchIDs := sortedStateIDs(state.Branches)
		if len(branchIDs) == 0 {
			k.completeState(run, stateID, "workload.completed")
			return
		}
		for _, branchID := range branchIDs {
			k.enterState(run, branchID, stateID)
		}
	case "gate":
		k.waitForGate(run, stateID, nonEmpty(state.GateID, stateID))
	case "report":
		k.createReportArtifact(run, stateID, state)
		k.completeState(run, stateID, "workload.completed")
	case "agent", "dynamic_parallel", "tournament", "command", "context", "memory_write":
		k.requestWorkload(run, stateID, parent, state)
	default:
		run.Status = "failed"
		run.Error = "unsupported state type " + state.Type
	}
}

func (k *Kernel) requestWorkload(run *Run, stateID, parent string, state State) {
	workloadID := "wl_" + randomID()
	workload := Workload{ID: workloadID, RunID: run.ID, StateID: stateID, ParentState: parentOf(run.Workflow, stateID, parent), Agent: state.Agent, Status: "pending", Input: state.Input, Outputs: state.Outputs, CreatedAt: timestamp()}
	run.Workloads[workloadID] = workload
	k.addEvent(run, "workload.created", stateID, workloadID, "", "", "workload created", nil)
	requestType := "execute_workload"
	if state.Type == "command" {
		requestType = "request_command_execution"
	} else if state.Type == "context" {
		requestType = "request_context_pack"
	} else if state.Type == "memory_write" {
		requestType = "request_memory_write"
	}
	run.Requests = append(run.Requests, HostRequest{ID: workloadID, RequestID: workloadID, Type: requestType, RunID: run.ID, WorkloadID: workloadID, StateID: stateID, Agent: state.Agent, InputArtifacts: state.Input.Include, OutputContract: strings.Join(state.Outputs, "\n")})
}

func (k *Kernel) waitForGate(run *Run, stateID, gateID string) {
	run.Status = "waiting"
	k.addEvent(run, "gate.waiting", stateID, "", gateID, "", "Approve this gate before the run continues.", nil)
	run.Requests = append(run.Requests, HostRequest{ID: gateID, RequestID: gateID, Type: "request_human_gate", RunID: run.ID, StateID: stateID, GateID: gateID})
}

func (k *Kernel) createReportArtifact(run *Run, stateID string, state State) {
	artifactPath := stateID + ".md"
	if len(state.Outputs) > 0 && state.Outputs[0] != "" {
		artifactPath = state.Outputs[0]
	}
	artifact := Artifact{ID: "artifact_" + stableID(stateID), Type: "report", Path: artifactPath, StateID: stateID, CreatedAt: timestamp()}
	run.Artifacts[artifact.ID] = artifact
	k.addEvent(run, "artifact.created", stateID, "", "", "", artifactPath, map[string]any{"path": artifactPath, "artifactId": artifact.ID})
}

func (k *Kernel) completeState(run *Run, stateID, event string) bool {
	if run.CompletedStates[stateID] {
		return false
	}
	run.ActiveStates[stateID] = false
	run.CompletedStates[stateID] = true
	k.addEvent(run, "state.completed", stateID, "", "", "", "state completed", nil)
	parent := parentOf(run.Workflow, stateID, "")
	parentFired := false
	if parent != "" {
		run.BranchCompleted[stateID] = true
		if k.allBranchesComplete(run, parent) {
			parentFired = k.completeState(run, parent, "workload.completed")
		}
	}
	localFired := k.fireTransitions(run, stateID, event)
	return parentFired || localFired
}

func (k *Kernel) fireTransitions(run *Run, from, event string) bool {
	fired := false
	transitions := append([]Transition{}, run.Workflow.Transitions...)
	sort.SliceStable(transitions, func(i, j int) bool { return transitions[i].Priority > transitions[j].Priority })
	for _, transition := range transitions {
		if transition.From != from || !transitionMatches(transition, event) || !k.guardMatches(run, transition.Guard) {
			continue
		}
		fired = true
		transitionID := transition.ID
		if transitionID == "" {
			transitionID = transition.From + "_to_" + transition.To
		}
		data := map[string]any{}
		if counter := transitionLoopCounter(transition.Guard); counter != "" {
			data["loopCounter"] = counter
		}
		if len(data) == 0 {
			data = nil
		}
		k.addEvent(run, "transition.fired", from, "", "", transitionID, "transition fired", data)
		k.enterState(run, transition.To, "")
		break
	}
	return fired
}

func (k *Kernel) guardMatches(run *Run, guard map[string]any) bool {
	if len(guard) == 0 {
		return true
	}
	for key, value := range guard {
		switch key {
		case "all":
			items, ok := value.([]any)
			if !ok {
				return false
			}
			for _, item := range items {
				child, ok := item.(map[string]any)
				if !ok || !k.guardMatches(run, child) {
					return false
				}
			}
		case "any":
			items, ok := value.([]any)
			if !ok {
				return false
			}
			matched := false
			for _, item := range items {
				child, ok := item.(map[string]any)
				if ok && k.guardMatches(run, child) {
					matched = true
					break
				}
			}
			if !matched {
				return false
			}
		case "artifact.exists":
			if !artifactExists(run, stringValue(value)) {
				return false
			}
		case "artifact.validates":
			record, ok := value.(map[string]any)
			if !ok || !artifactValidates(run, record) {
				return false
			}
		case "signal.equals":
			record, ok := value.(map[string]any)
			if !ok || !valuesEqual(run.Signals[stringValue(record["key"])], record["value"]) {
				return false
			}
		case "gate.status":
			record, ok := value.(map[string]any)
			if !ok || !k.gateHasStatus(run, stringValue(record["id"]), stringValue(record["value"])) {
				return false
			}
		case "branches.all_completed":
			branches, ok := stringSlice(value)
			if !ok {
				return false
			}
			for _, branchID := range branches {
				if !run.CompletedStates[branchID] {
					return false
				}
			}
		case "effect.status":
			record, ok := value.(map[string]any)
			if !ok || !effectStatusExists(run, stringValue(record["kind"]), stringValue(record["value"])) {
				return false
			}
		case "loop.lt", "loop.gte":
			record, ok := value.(map[string]any)
			if !ok {
				return false
			}
			current := k.loopCount(run, loopCounter(record))
			max := numericSignal(record["max"])
			if key == "loop.lt" && current >= max {
				return false
			}
			if key == "loop.gte" && current < max {
				return false
			}
		}
	}
	return true
}

func artifactExists(run *Run, target string) bool {
	if target == "" {
		return false
	}
	for _, artifact := range run.Artifacts {
		if artifactMatchesPath(artifact, target) {
			return true
		}
	}
	return false
}

func artifactValidates(run *Run, record map[string]any) bool {
	artifactPath := stringValue(record["path"])
	schema := stringValue(record["schema"])
	if artifactPath == "" || (schema != "contracts.schema.json" && schema != "flow-kernel/schemas/contracts.schema.json") {
		return false
	}
	var artifact Artifact
	found := false
	for _, candidate := range run.Artifacts {
		if artifactMatchesPath(candidate, artifactPath) {
			artifact = candidate
			found = true
			break
		}
	}
	if !found {
		return false
	}
	content, err := os.ReadFile(artifactFilesystemPath(artifact.Path))
	if err != nil || strings.TrimSpace(string(content)) == "" {
		return false
	}
	var parsed map[string]any
	if err := json.Unmarshal(content, &parsed); err != nil {
		return false
	}
	return stringValue(parsed["schemaVersion"]) == "flow.contracts/v1"
}

func artifactMatchesPath(artifact Artifact, target string) bool {
	normalizedTarget := normalizeArtifactPath(target)
	return artifact.ID == target || normalizeArtifactPath(artifact.Path) == normalizedTarget || strings.Contains(normalizeArtifactPath(artifact.Path), normalizedTarget)
}

func normalizeArtifactPath(value string) string {
	return strings.ReplaceAll(value, "\\", "/")
}

func artifactFilesystemPath(value string) string {
	if !strings.HasPrefix(value, "file:") {
		return value
	}
	parsed, err := url.Parse(value)
	if err != nil {
		return strings.TrimPrefix(value, "file://")
	}
	path := parsed.Path
	if parsed.Host != "" {
		path = "//" + parsed.Host + parsed.Path
	}
	if len(path) >= 3 && path[0] == '/' && path[2] == ':' {
		path = path[1:]
	}
	return path
}

func (k *Kernel) gateHasStatus(run *Run, gateID, status string) bool {
	if gateID == "" || status == "" {
		return false
	}
	for _, event := range k.events[run.ID] {
		if event.GateID != gateID {
			continue
		}
		if status == "approved" && event.Type == "gate.approved" {
			return true
		}
		if status == "rejected" && event.Type == "gate.rejected" {
			return true
		}
	}
	return false
}

func effectStatusExists(run *Run, kind, status string) bool {
	normalizedKind := normalizeToken(kind)
	for _, effect := range run.Effects {
		if effect.Status != status {
			continue
		}
		if normalizedKind == "" || normalizeToken(effect.Type) == normalizedKind || strings.Contains(normalizeToken(effect.Type), normalizedKind) {
			return true
		}
	}
	return false
}

func valuesEqual(left, right any) bool {
	switch expected := right.(type) {
	case bool:
		actual, ok := left.(bool)
		return ok && actual == expected
	case float64:
		return numericSignal(left) == int(expected)
	case int:
		return numericSignal(left) == expected
	default:
		return stringValue(left) == stringValue(right)
	}
}

func stringSlice(value any) ([]string, bool) {
	raw, ok := value.([]any)
	if !ok {
		return nil, false
	}
	items := make([]string, 0, len(raw))
	for _, item := range raw {
		text := stringValue(item)
		if text != "" {
			items = append(items, text)
		}
	}
	return items, true
}

func mapValue(value any) map[string]any {
	items, ok := value.(map[string]any)
	if !ok || len(items) == 0 {
		return nil
	}
	return items
}

func loopCounter(value map[string]any) string {
	if counter := stringValue(value["counter"]); counter != "" {
		return counter
	}
	return stringValue(value["key"])
}

func transitionLoopCounter(guard map[string]any) string {
	if len(guard) == 0 {
		return ""
	}
	for key, value := range guard {
		if key == "loop.lt" {
			if record, ok := value.(map[string]any); ok {
				return loopCounter(record)
			}
		}
		if key == "all" || key == "any" {
			items, ok := value.([]any)
			if !ok {
				continue
			}
			for _, item := range items {
				child, ok := item.(map[string]any)
				if !ok {
					continue
				}
				if counter := transitionLoopCounter(child); counter != "" {
					return counter
				}
			}
		}
	}
	return ""
}

func (k *Kernel) loopCount(run *Run, counter string) int {
	if counter == "" {
		return 0
	}
	count := 0
	for _, event := range k.events[run.ID] {
		if event.Type == "transition.fired" && stringValue(event.Data["loopCounter"]) == counter {
			count++
		}
	}
	return count
}

func numericSignal(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	case float32:
		return int(typed)
	case json.Number:
		parsed, _ := typed.Int64()
		return int(parsed)
	default:
		var parsed int
		_, _ = fmt.Sscanf(stringValue(value), "%d", &parsed)
		return parsed
	}
}

func (k *Kernel) allBranchesComplete(run *Run, parent string) bool {
	state, ok := findState(run.Workflow, parent)
	if !ok {
		return false
	}
	for branchID := range state.Branches {
		if !run.CompletedStates[branchID] {
			return false
		}
	}
	return true
}

func (k *Kernel) stateForGate(run *Run, gateID string) string {
	for stateID, active := range run.ActiveStates {
		if !active {
			continue
		}
		state, ok := findState(run.Workflow, stateID)
		if ok && nonEmpty(state.GateID, stateID) == gateID {
			return stateID
		}
	}
	for stateID := range flattenStates(run.Workflow) {
		state, _ := findState(run.Workflow, stateID)
		if nonEmpty(state.GateID, stateID) == gateID {
			return stateID
		}
	}
	return ""
}

func (k *Kernel) addEvent(run *Run, eventType, stateID, workloadID, gateID, transitionID, message string, data map[string]any) {
	events := k.events[run.ID]
	event := Event{Seq: len(events) + 1, Time: timestamp(), Type: eventType, RunID: run.ID, StateID: stateID, WorkloadID: workloadID, GateID: gateID, TransitionID: transitionID, Message: message, Data: data}
	k.events[run.ID] = append(events, event)
	run.UpdatedAt = event.Time
}

func (k *Kernel) removeRequest(run *Run, key string) {
	requests := run.Requests[:0]
	for _, request := range run.Requests {
		if request.ID == key || request.RequestID == key || request.WorkloadID == key || request.GateID == key {
			continue
		}
		requests = append(requests, request)
	}
	run.Requests = requests
}

func (k *Kernel) loadRun(runID, storeDir string) (*Run, error) {
	if runID == "" {
		return nil, errors.New("request requires runId")
	}
	if run := k.runs[runID]; run != nil {
		return run, nil
	}
	if storeDir == "" {
		return nil, errors.New("request requires storeDir")
	}
	content, err := os.ReadFile(runFile(storeDir, runID))
	if err != nil {
		return nil, err
	}
	var stored StoredRun
	if err := json.Unmarshal(content, &stored); err != nil {
		return nil, err
	}
	run := stored.Run
	normalizeRun(&run)
	k.runs[run.ID] = &run
	k.events[run.ID] = stored.Events
	return &run, nil
}

func normalizeRun(run *Run) {
	if run.ActiveStates == nil {
		run.ActiveStates = map[string]bool{}
	}
	if run.CompletedStates == nil {
		run.CompletedStates = map[string]bool{}
	}
	if run.BranchCompleted == nil {
		run.BranchCompleted = map[string]bool{}
	}
	if run.Workloads == nil {
		run.Workloads = map[string]Workload{}
	}
	if run.Artifacts == nil {
		run.Artifacts = map[string]Artifact{}
	}
	if run.Signals == nil {
		run.Signals = map[string]any{}
	}
}

func (k *Kernel) saveRun(storeDir string, run *Run) error {
	if storeDir == "" {
		return nil
	}
	if err := os.MkdirAll(storeDir, 0o755); err != nil {
		return err
	}
	content, err := json.MarshalIndent(StoredRun{Run: *run, Events: k.events[run.ID]}, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(runFile(storeDir, run.ID), content, 0o644)
}

func runFile(storeDir, runID string) string {
	return filepath.Join(storeDir, runID+".json")
}

func runResponse(id, responseType string, run *Run) Message {
	return Message{"id": id, "type": responseType, "run": run, "requests": run.Requests}
}

func decodeWorkflow(raw any) (Workflow, error) {
	var workflow Workflow
	content, err := json.Marshal(raw)
	if err != nil {
		return workflow, err
	}
	if err := json.Unmarshal(content, &workflow); err != nil {
		return workflow, err
	}
	return workflow, nil
}

func validateWorkflow(workflow Workflow) error {
	if workflow.ID == "" {
		return errors.New("workflow id is required")
	}
	if len(workflow.States) == 0 {
		return errors.New("workflow states are required")
	}
	for _, transition := range workflow.Transitions {
		if transition.From == "" || transition.To == "" {
			return errors.New("workflow transition requires from and to")
		}
		if _, ok := findState(workflow, transition.From); !ok {
			return fmt.Errorf("transition references unknown from state %q", transition.From)
		}
		if _, ok := findState(workflow, transition.To); !ok {
			return fmt.Errorf("transition references unknown to state %q", transition.To)
		}
	}
	return nil
}

func flattenStates(workflow Workflow) map[string]State {
	states := map[string]State{}
	var visit func(map[string]State)
	visit = func(source map[string]State) {
		for id, state := range source {
			states[id] = state
			if len(state.Branches) > 0 {
				visit(state.Branches)
			}
		}
	}
	visit(workflow.States)
	return states
}

func findState(workflow Workflow, stateID string) (State, bool) {
	states := flattenStates(workflow)
	state, ok := states[stateID]
	return state, ok
}

func parentOf(workflow Workflow, stateID, fallback string) string {
	if fallback != "" {
		return fallback
	}
	for parentID, state := range flattenStates(workflow) {
		if _, ok := state.Branches[stateID]; ok {
			return parentID
		}
	}
	return ""
}

func initialStates(workflow Workflow) []string {
	incoming := map[string]bool{}
	for _, transition := range workflow.Transitions {
		incoming[transition.To] = true
	}
	var candidates []string
	for stateID := range workflow.States {
		if !incoming[stateID] {
			candidates = append(candidates, stateID)
		}
	}
	if len(candidates) == 0 {
		candidates = sortedStateIDs(workflow.States)
		if len(candidates) > 1 {
			candidates = candidates[:1]
		}
	}
	sort.Strings(candidates)
	return candidates
}

func sortedStateIDs(states map[string]State) []string {
	ids := make([]string, 0, len(states))
	for id := range states {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	return ids
}

func activeStateIDs(run *Run) []string {
	ids := []string{}
	for id, active := range run.ActiveStates {
		if active {
			ids = append(ids, id)
		}
	}
	return ids
}

func hasHumanGateRequest(run *Run) bool {
	for _, request := range run.Requests {
		if request.Type == "request_human_gate" {
			return true
		}
	}
	return false
}

func hasGate(workflow Workflow, stateID string) bool {
	state, ok := findState(workflow, stateID)
	return ok && state.GateID != ""
}

func gateID(workflow Workflow, stateID string) string {
	state, ok := findState(workflow, stateID)
	if !ok {
		return stateID
	}
	return nonEmpty(state.GateID, stateID)
}

func transitionMatches(transition Transition, event string) bool {
	if transition.On == "" {
		return event == "workload.completed"
	}
	if transition.On == event {
		return true
	}
	if event == "workload.completed" && (transition.On == "state.completed" || transition.On == "always") {
		return true
	}
	return event == "workload.failed" && hasFailureGuard(transition.Guard) && (transition.On == "workload.completed" || transition.On == "state.completed" || transition.On == "always")
}

func hasFailureGuard(guard map[string]any) bool {
	for key, value := range guard {
		switch key {
		case "all", "any":
			items, ok := value.([]any)
			if !ok {
				continue
			}
			for _, item := range items {
				child, ok := item.(map[string]any)
				if ok && hasFailureGuard(child) {
					return true
				}
			}
		case "signal.equals":
			record, ok := value.(map[string]any)
			if ok && isFailureToken(record["value"]) {
				return true
			}
		case "gate.status":
			record, ok := value.(map[string]any)
			if ok && normalizeToken(stringValue(record["value"])) == "rejected" {
				return true
			}
		case "effect.status":
			record, ok := value.(map[string]any)
			if ok && isFailureToken(record["value"]) {
				return true
			}
		}
	}
	return false
}

func isFailureToken(value any) bool {
	token := normalizeToken(stringValue(value))
	return strings.Contains(token, "fail") || strings.Contains(token, "repair") || strings.Contains(token, "error") || strings.Contains(token, "block") || strings.Contains(token, "reject")
}

func timestamp() string {
	return time.Now().UTC().Format(time.RFC3339Nano)
}

func stringValue(value any) string {
	if value == nil {
		return ""
	}
	if text, ok := value.(string); ok {
		return strings.TrimSpace(text)
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func nonEmpty(value, fallback string) string {
	if strings.TrimSpace(value) != "" {
		return value
	}
	return fallback
}

func randomID() string {
	buffer := make([]byte, 8)
	if _, err := rand.Read(buffer); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buffer)
}

func stableID(value string) string {
	replacer := strings.NewReplacer("/", "-", "\\", "-", " ", "-", ":", "-")
	return strings.Trim(replacer.Replace(value), "-")
}

func normalizeToken(value string) string {
	replacer := strings.NewReplacer(".", "_", "-", "_", " ", "_")
	return replacer.Replace(strings.ToLower(strings.TrimSpace(value)))
}
