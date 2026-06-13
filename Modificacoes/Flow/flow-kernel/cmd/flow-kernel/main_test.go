package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestKernelExecutesAgentGateReportFlow(t *testing.T) {
	kernel := NewKernel()
	workflow := Workflow{
		Version: workflowVersion,
		ID:      "gate_flow",
		Name:    "Gate Flow",
		States: map[string]State{
			"input":  {Type: "input"},
			"review": {Type: "agent", Agent: "reviewer", GateID: "review_gate", Outputs: []string{"review.md"}},
			"report": {Type: "report", Outputs: []string{"final.md"}},
		},
		Transitions: []Transition{
			{From: "input", To: "review", On: "workload.completed"},
			{From: "review", To: "report", On: "gate.approved"},
		},
	}

	start := kernel.Handle(Message{"id": "1", "type": "start_run", "workflow": workflow, "input": "do work", "storeDir": t.TempDir()})
	if start["type"] != "start_run.ok" {
		t.Fatalf("unexpected start response: %#v", start)
	}
	run := start["run"].(*Run)
	if len(run.Requests) != 1 || run.Requests[0].Type != "execute_workload" {
		t.Fatalf("expected one execute_workload request, got %#v", run.Requests)
	}
	workloadID := run.Requests[0].WorkloadID

	kernel.Handle(Message{"id": "2", "type": "workload_started", "runId": run.ID, "workloadId": workloadID})
	completed := kernel.Handle(Message{"id": "3", "type": "workload_completed", "runId": run.ID, "workloadId": workloadID})
	run = completed["run"].(*Run)
	if run.Status != "waiting" || len(run.Requests) != 1 || run.Requests[0].Type != "request_human_gate" {
		t.Fatalf("expected waiting human gate, got status=%s requests=%#v", run.Status, run.Requests)
	}

	approved := kernel.Handle(Message{"id": "4", "type": "gate_approved", "runId": run.ID, "gateId": "review_gate"})
	run = approved["run"].(*Run)
	if run.Status != "completed" {
		t.Fatalf("expected completed run, got %s", run.Status)
	}
	if !run.CompletedStates["report"] {
		t.Fatalf("expected report state completed: %#v", run.CompletedStates)
	}
	if _, ok := run.Artifacts["artifact_report"]; !ok {
		t.Fatalf("expected report artifact, got %#v", run.Artifacts)
	}
}

func TestKernelFiresRunStartedTransitionFromInput(t *testing.T) {
	kernel := NewKernel()
	workflow := Workflow{
		Version: workflowVersion,
		ID:      "run_started_flow",
		Name:    "Run Started Flow",
		States: map[string]State{
			"input": {Type: "input"},
			"agent": {Type: "agent", Agent: "worker", Outputs: []string{"work/result.md"}},
		},
		Transitions: []Transition{
			{From: "input", To: "agent", On: "run.started"},
		},
	}

	start := kernel.Handle(Message{"id": "1", "type": "start_run", "workflow": workflow, "input": "do work", "storeDir": t.TempDir()})
	if start["type"] != "start_run.ok" {
		t.Fatalf("unexpected start response: %#v", start)
	}
	run := start["run"].(*Run)
	if !run.ActiveStates["agent"] || len(run.Requests) != 1 || run.Requests[0].StateID != "agent" {
		t.Fatalf("expected run.started to enter agent state, active=%#v requests=%#v", run.ActiveStates, run.Requests)
	}
}

func TestKernelHonorsSignalGuardsAndPriority(t *testing.T) {
	kernel := NewKernel()
	workflow := Workflow{
		Version: workflowVersion,
		ID:      "guarded_flow",
		Name:    "Guarded Flow",
		States: map[string]State{
			"input":    {Type: "input"},
			"reviewer": {Type: "agent", Agent: "reviewer", Outputs: []string{"review.md"}},
			"passed":   {Type: "report", Outputs: []string{"passed.md"}},
			"failed":   {Type: "report", Outputs: []string{"failed.md"}},
		},
		Transitions: []Transition{
			{From: "input", To: "reviewer", On: "run.started"},
			{From: "reviewer", To: "passed", On: "workload.completed", Priority: 30, Guard: map[string]any{"signal.equals": map[string]any{"key": "review.status", "value": "passed"}}},
			{From: "reviewer", To: "failed", On: "workload.completed", Priority: 20, Guard: map[string]any{"signal.equals": map[string]any{"key": "review.status", "value": "failed"}}},
		},
	}

	start := kernel.Handle(Message{"id": "1", "type": "start_run", "workflow": workflow, "input": "do work", "storeDir": t.TempDir()})
	run := start["run"].(*Run)
	workloadID := run.Requests[0].WorkloadID
	kernel.Handle(Message{"id": "2", "type": "signal_recorded", "runId": run.ID, "workloadId": workloadID, "stateId": "reviewer", "key": "review.status", "value": "failed"})
	completed := kernel.Handle(Message{"id": "3", "type": "workload_completed", "runId": run.ID, "workloadId": workloadID})
	run = completed["run"].(*Run)

	if !run.CompletedStates["failed"] {
		t.Fatalf("expected failed route to complete, completed=%#v", run.CompletedStates)
	}
	if run.CompletedStates["passed"] {
		t.Fatalf("did not expect passed route to fire, completed=%#v", run.CompletedStates)
	}
}

func TestKernelNormalizesPersistedRunMaps(t *testing.T) {
	storeDir := t.TempDir()
	firstKernel := NewKernel()
	workflow := Workflow{
		Version: workflowVersion,
		ID:      "persisted_guard_flow",
		Name:    "Persisted Guard Flow",
		States: map[string]State{
			"input":    {Type: "input"},
			"reviewer": {Type: "agent", Agent: "reviewer", Outputs: []string{"review.md"}},
			"failed":   {Type: "report", Outputs: []string{"failed.md"}},
		},
		Transitions: []Transition{
			{From: "input", To: "reviewer", On: "run.started"},
			{From: "reviewer", To: "failed", On: "workload.completed", Guard: map[string]any{"signal.equals": map[string]any{"key": "review.status", "value": "failed"}}},
		},
	}

	start := firstKernel.Handle(Message{"id": "1", "type": "start_run", "workflow": workflow, "input": "do work", "storeDir": storeDir})
	run := start["run"].(*Run)
	workloadID := run.Requests[0].WorkloadID

	secondKernel := NewKernel()
	signal := secondKernel.Handle(Message{"id": "2", "type": "signal_recorded", "runId": run.ID, "storeDir": storeDir, "workloadId": workloadID, "stateId": "reviewer", "key": "review.status", "value": "failed"})
	if signal["type"] != "signal_recorded.ok" {
		t.Fatalf("expected signal callback to succeed after persisted load, got %#v", signal)
	}
	completed := secondKernel.Handle(Message{"id": "3", "type": "workload_completed", "runId": run.ID, "storeDir": storeDir, "workloadId": workloadID})
	run = completed["run"].(*Run)
	if !run.CompletedStates["failed"] {
		t.Fatalf("expected persisted guarded route to complete, completed=%#v", run.CompletedStates)
	}
}

func TestKernelRejectsInvalidWorkflow(t *testing.T) {
	kernel := NewKernel()
	response := kernel.Handle(Message{"id": "bad", "type": "validate_workflow", "workflow": Workflow{ID: "empty"}})
	if response["type"] != "validate_workflow.ok" || response["valid"] != false {
		t.Fatalf("expected invalid workflow response, got %#v", response)
	}
}

func TestKernelRoutesFailedWorkloadThroughGuardedRepairTransition(t *testing.T) {
	kernel := NewKernel()
	workflow := Workflow{
		Version: workflowVersion,
		ID:      "failed_repair_flow",
		Name:    "Failed Repair Flow",
		States: map[string]State{
			"input":  {Type: "input"},
			"review": {Type: "agent", Agent: "reviewer", Outputs: []string{"review.md"}},
			"repair": {Type: "report", Outputs: []string{"repair.md"}},
		},
		Transitions: []Transition{
			{From: "input", To: "review", On: "run.started"},
			{From: "review", To: "repair", On: "workload.completed", Guard: map[string]any{"signal.equals": map[string]any{"key": "review.status", "value": "needs_repair"}}},
		},
	}

	start := kernel.Handle(Message{"id": "1", "type": "start_run", "workflow": workflow, "input": "do work", "storeDir": t.TempDir()})
	run := start["run"].(*Run)
	workloadID := run.Requests[0].WorkloadID
	kernel.Handle(Message{"id": "2", "type": "signal_recorded", "runId": run.ID, "workloadId": workloadID, "stateId": "review", "key": "review.status", "value": "needs_repair"})
	failed := kernel.Handle(Message{"id": "3", "type": "workload_failed", "runId": run.ID, "workloadId": workloadID, "error": "review failed"})
	run = failed["run"].(*Run)

	if run.Status == "failed" {
		t.Fatalf("expected failed workload to route through repair, got error=%q", run.Error)
	}
	if !run.CompletedStates["repair"] {
		t.Fatalf("expected repair route to complete, completed=%#v", run.CompletedStates)
	}
	if run.ActiveStates["review"] {
		t.Fatalf("expected failed source state to be inactive, active=%#v", run.ActiveStates)
	}
}

func TestKernelDoesNotRouteFailedWorkloadThroughUnguardedSuccessTransition(t *testing.T) {
	kernel := NewKernel()
	workflow := Workflow{
		Version: workflowVersion,
		ID:      "failed_success_flow",
		Name:    "Failed Success Flow",
		States: map[string]State{
			"input":   {Type: "input"},
			"worker":  {Type: "agent", Agent: "worker", Outputs: []string{"work.md"}},
			"success": {Type: "report", Outputs: []string{"success.md"}},
		},
		Transitions: []Transition{
			{From: "input", To: "worker", On: "run.started"},
			{From: "worker", To: "success", On: "workload.completed"},
		},
	}

	start := kernel.Handle(Message{"id": "1", "type": "start_run", "workflow": workflow, "input": "do work", "storeDir": t.TempDir()})
	run := start["run"].(*Run)
	workloadID := run.Requests[0].WorkloadID
	failed := kernel.Handle(Message{"id": "2", "type": "workload_failed", "runId": run.ID, "workloadId": workloadID, "error": "worker failed"})
	run = failed["run"].(*Run)

	if run.Status != "failed" {
		t.Fatalf("expected unguarded success transition not to mask failure, got status=%s completed=%#v", run.Status, run.CompletedStates)
	}
	if run.CompletedStates["success"] {
		t.Fatalf("did not expect success route after workload_failed, completed=%#v", run.CompletedStates)
	}
}

func TestKernelDoesNotRouteFailedWorkloadThroughArtifactSuccessGuard(t *testing.T) {
	kernel := NewKernel()
	workflow := Workflow{
		Version: workflowVersion,
		ID:      "failed_artifact_success_flow",
		Name:    "Failed Artifact Success Flow",
		States: map[string]State{
			"input":   {Type: "input"},
			"worker":  {Type: "agent", Agent: "worker", Outputs: []string{"reports/report.md"}},
			"success": {Type: "report", Outputs: []string{"success.md"}},
		},
		Transitions: []Transition{
			{From: "input", To: "worker", On: "run.started"},
			{From: "worker", To: "success", On: "workload.completed", Guard: map[string]any{"artifact.exists": "reports/report.md"}},
		},
	}

	start := kernel.Handle(Message{"id": "1", "type": "start_run", "workflow": workflow, "input": "do work", "storeDir": t.TempDir()})
	run := start["run"].(*Run)
	workloadID := run.Requests[0].WorkloadID
	kernel.Handle(Message{"id": "2", "type": "artifact_created", "runId": run.ID, "artifactId": "report", "artifactType": "report", "path": "reports/report.md", "stateId": "worker", "workloadId": workloadID})
	failed := kernel.Handle(Message{"id": "3", "type": "workload_failed", "runId": run.ID, "workloadId": workloadID, "error": "worker failed"})
	run = failed["run"].(*Run)

	if run.Status != "failed" {
		t.Fatalf("expected artifact success guard not to mask failure, got status=%s completed=%#v", run.Status, run.CompletedStates)
	}
	if run.CompletedStates["success"] {
		t.Fatalf("did not expect artifact success route after workload_failed, completed=%#v", run.CompletedStates)
	}
}

func TestKernelFailedParallelBranchRepairCompletesParent(t *testing.T) {
	kernel := NewKernel()
	workflow := Workflow{
		Version: workflowVersion,
		ID:      "failed_parallel_repair_flow",
		Name:    "Failed Parallel Repair Flow",
		States: map[string]State{
			"input": {Type: "input"},
			"parallel": {Type: "parallel", Branches: map[string]State{
				"qa":      {Type: "agent", Agent: "qa", Outputs: []string{"qa.md"}},
				"summary": {Type: "report", Outputs: []string{"summary.md"}},
			}},
			"repair": {Type: "report", Outputs: []string{"repair.md"}},
			"done":   {Type: "report", Outputs: []string{"done.md"}},
		},
		Transitions: []Transition{
			{From: "input", To: "parallel", On: "run.started"},
			{From: "qa", To: "repair", On: "workload.completed", Priority: 20, Guard: map[string]any{"signal.equals": map[string]any{"key": "qa.status", "value": "needs_repair"}}},
			{From: "parallel", To: "done", On: "workload.completed"},
		},
	}

	start := kernel.Handle(Message{"id": "1", "type": "start_run", "workflow": workflow, "input": "do work", "storeDir": t.TempDir()})
	run := start["run"].(*Run)
	if len(run.Requests) != 1 || run.Requests[0].StateID != "qa" {
		t.Fatalf("expected qa request after parallel entry, got %#v", run.Requests)
	}
	workloadID := run.Requests[0].WorkloadID
	kernel.Handle(Message{"id": "2", "type": "signal_recorded", "runId": run.ID, "workloadId": workloadID, "stateId": "qa", "key": "qa.status", "value": "needs_repair"})
	failed := kernel.Handle(Message{"id": "3", "type": "workload_failed", "runId": run.ID, "workloadId": workloadID, "error": "qa failed"})
	run = failed["run"].(*Run)

	if !run.CompletedStates["parallel"] || run.ActiveStates["parallel"] {
		t.Fatalf("expected failed branch completion to propagate to parallel parent, active=%#v completed=%#v", run.ActiveStates, run.CompletedStates)
	}
	if !run.CompletedStates["done"] || !run.CompletedStates["repair"] {
		t.Fatalf("expected parent route and repair route to complete, completed=%#v", run.CompletedStates)
	}
	if run.Status != "completed" {
		t.Fatalf("expected completed run after repair and parent completion, got status=%s active=%#v", run.Status, run.ActiveStates)
	}
}

func TestKernelFailedParallelBranchParentRoutePreventsFalseFailure(t *testing.T) {
	kernel := NewKernel()
	workflow := Workflow{
		Version: workflowVersion,
		ID:      "failed_parallel_parent_route_flow",
		Name:    "Failed Parallel Parent Route Flow",
		States: map[string]State{
			"input": {Type: "input"},
			"parallel": {Type: "parallel", Branches: map[string]State{
				"qa":      {Type: "agent", Agent: "qa", Outputs: []string{"qa.md"}},
				"summary": {Type: "report", Outputs: []string{"summary.md"}},
			}},
			"done": {Type: "report", Outputs: []string{"done.md"}},
		},
		Transitions: []Transition{
			{From: "input", To: "parallel", On: "run.started"},
			{From: "parallel", To: "done", On: "workload.completed"},
		},
	}

	start := kernel.Handle(Message{"id": "1", "type": "start_run", "workflow": workflow, "input": "do work", "storeDir": t.TempDir()})
	run := start["run"].(*Run)
	if len(run.Requests) != 1 || run.Requests[0].StateID != "qa" {
		t.Fatalf("expected qa request after parallel entry, got %#v", run.Requests)
	}
	workloadID := run.Requests[0].WorkloadID
	failed := kernel.Handle(Message{"id": "2", "type": "workload_failed", "runId": run.ID, "workloadId": workloadID, "error": "qa failed"})
	run = failed["run"].(*Run)

	if run.Status != "completed" {
		t.Fatalf("expected parent route to prevent false failure, got status=%s error=%q completed=%#v", run.Status, run.Error, run.CompletedStates)
	}
	if !run.CompletedStates["parallel"] || !run.CompletedStates["done"] {
		t.Fatalf("expected parent and done route complete, completed=%#v", run.CompletedStates)
	}
}

func TestKernelLoopCountersAllowReentryUntilLimit(t *testing.T) {
	kernel := NewKernel()
	workflow := Workflow{
		Version: workflowVersion,
		ID:      "repair_loop_flow",
		Name:    "Repair Loop Flow",
		States: map[string]State{
			"input":  {Type: "input"},
			"qa":     {Type: "agent", Agent: "qa", Outputs: []string{"qa.md"}},
			"repair": {Type: "report", Outputs: []string{"repair.md"}},
			"done":   {Type: "report", Outputs: []string{"done.md"}},
		},
		Transitions: []Transition{
			{From: "input", To: "qa", On: "run.started"},
			{ID: "qa_to_repair", From: "qa", To: "repair", On: "workload.completed", Priority: 30, Guard: map[string]any{"all": []any{map[string]any{"signal.equals": map[string]any{"key": "qa.status", "value": "failed"}}, map[string]any{"loop.lt": map[string]any{"counter": "qa.repair", "max": 2}}}}},
			{From: "qa", To: "done", On: "workload.completed", Priority: 20, Guard: map[string]any{"all": []any{map[string]any{"signal.equals": map[string]any{"key": "qa.status", "value": "failed"}}, map[string]any{"loop.gte": map[string]any{"counter": "qa.repair", "max": 2}}}}},
			{From: "repair", To: "qa", On: "workload.completed"},
		},
	}

	start := kernel.Handle(Message{"id": "1", "type": "start_run", "workflow": workflow, "input": "do work", "storeDir": t.TempDir()})
	run := start["run"].(*Run)
	for attempt := 0; attempt < 3; attempt++ {
		if len(run.Requests) != 1 || run.Requests[0].StateID != "qa" {
			t.Fatalf("attempt %d expected qa workload request, got %#v", attempt+1, run.Requests)
		}
		workloadID := run.Requests[0].WorkloadID
		kernel.Handle(Message{"id": "signal", "type": "signal_recorded", "runId": run.ID, "workloadId": workloadID, "stateId": "qa", "key": "qa.status", "value": "failed"})
		completed := kernel.Handle(Message{"id": "complete", "type": "workload_completed", "runId": run.ID, "workloadId": workloadID})
		run = completed["run"].(*Run)
	}

	if !run.CompletedStates["done"] {
		t.Fatalf("expected loop to stop at done after max repair attempts, completed=%#v", run.CompletedStates)
	}
	loopTransitions := 0
	for _, event := range kernel.events[run.ID] {
		if event.Type == "transition.fired" && event.TransitionID == "qa_to_repair" && event.Data["loopCounter"] == "qa.repair" {
			loopTransitions++
		}
	}
	if loopTransitions != 2 {
		t.Fatalf("expected exactly two repair loop transitions with loopCounter, got %d events=%#v", loopTransitions, kernel.events[run.ID])
	}
}

func TestKernelArtifactValidatesContractsSchemaVersion(t *testing.T) {
	for _, test := range []struct {
		name       string
		content    string
		expectsOK  bool
		expectsBad bool
	}{
		{name: "valid", content: `{"schemaVersion":"flow.contracts/v1"}`, expectsOK: true},
		{name: "invalid", content: `{"schemaVersion":"wrong"}`, expectsBad: true},
	} {
		t.Run(test.name, func(t *testing.T) {
			kernel := NewKernel()
			dir := t.TempDir()
			artifactPath := filepath.Join(dir, "contracts.json")
			if err := os.WriteFile(artifactPath, []byte(test.content), 0o644); err != nil {
				t.Fatal(err)
			}
			workflow := Workflow{
				Version: workflowVersion,
				ID:      "artifact_validation_flow",
				Name:    "Artifact Validation Flow",
				States: map[string]State{
					"input":  {Type: "input"},
					"verify": {Type: "agent", Agent: "verifier", Outputs: []string{"contracts.json"}},
					"ok":     {Type: "report", Outputs: []string{"ok.md"}},
					"bad":    {Type: "report", Outputs: []string{"bad.md"}},
				},
				Transitions: []Transition{
					{From: "input", To: "verify", On: "run.started"},
					{From: "verify", To: "ok", On: "workload.completed", Priority: 20, Guard: map[string]any{"artifact.validates": map[string]any{"path": "contracts.json", "schema": "contracts.schema.json"}}},
					{From: "verify", To: "bad", On: "workload.completed", Priority: 10},
				},
			}

			start := kernel.Handle(Message{"id": "1", "type": "start_run", "workflow": workflow, "input": "do work", "storeDir": dir})
			run := start["run"].(*Run)
			workloadID := run.Requests[0].WorkloadID
			kernel.Handle(Message{"id": "2", "type": "artifact_created", "runId": run.ID, "artifactId": "contracts", "artifactType": "contract", "path": artifactPath, "stateId": "verify", "workloadId": workloadID})
			completed := kernel.Handle(Message{"id": "3", "type": "workload_completed", "runId": run.ID, "workloadId": workloadID})
			run = completed["run"].(*Run)

			if run.CompletedStates["ok"] != test.expectsOK || run.CompletedStates["bad"] != test.expectsBad {
				t.Fatalf("unexpected route for %s contract: completed=%#v", test.name, run.CompletedStates)
			}
		})
	}
}

func TestKernelEffectRecordedPersistsBridgeFields(t *testing.T) {
	storeDir := t.TempDir()
	firstKernel := NewKernel()
	workflow := Workflow{Version: workflowVersion, ID: "effect_flow", Name: "Effect Flow", States: map[string]State{"input": {Type: "input"}}}
	start := firstKernel.Handle(Message{"id": "1", "type": "start_run", "workflow": workflow, "input": "do work", "storeDir": storeDir})
	run := start["run"].(*Run)
	firstKernel.Handle(Message{"id": "2", "type": "effect_recorded", "runId": run.ID, "storeDir": storeDir, "effectType": "file.patch", "path": "src/file.ts", "hashBefore": "before", "hashAfter": "after", "patch": "@@ patch", "payload": map[string]any{"linesChanged": float64(3)}})

	secondKernel := NewKernel()
	reloaded := secondKernel.Handle(Message{"id": "3", "type": "get_run", "runId": run.ID, "storeDir": storeDir})
	run = reloaded["run"].(*Run)
	if len(run.Effects) != 1 {
		t.Fatalf("expected one persisted effect, got %#v", run.Effects)
	}
	effect := run.Effects[0]
	if effect.HashBefore != "before" || effect.HashAfter != "after" || effect.Patch != "@@ patch" || effect.Payload["linesChanged"] != float64(3) {
		t.Fatalf("effect fields were not persisted: %#v", effect)
	}
}
