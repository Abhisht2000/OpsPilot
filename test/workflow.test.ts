import test from "node:test";
import assert from "node:assert/strict";
import {
  extractRequestedBudget,
  type BudgetItem,
} from "../app/lib/budget-validator.ts";
import {
  type ExecutableTask,
  transitionTask,
  toolRegistry,
} from "../app/lib/execution-engine.ts";
import "../app/lib/tools/index.ts";

test("Complete End-to-End Workflow: Brief -> Parse -> Task Approval -> Tool Execution -> Evidence", async () => {
  // Step 1: User enters a brief with budget in Indian Rupee format
  const brief = "Plan a 2-day national level AI Hackathon for 250 students with ₹1,20,000 budget.";
  const parseResult = extractRequestedBudget(brief);

  assert.equal(parseResult.isReliable, true);
  assert.equal(parseResult.amount, 120000);
  assert.equal(parseResult.needsClarification, false);

  // Step 2: System generates structured budget and tasks
  const sampleBudget: BudgetItem[] = [
    { category: "1st Prize", amount: 60000, details: "Winner team" },
    { category: "2nd Prize", amount: 40000, details: "Runner-up team" },
    { category: "Special Tracks", amount: 20000, details: "Best AI model" },
  ];

  // AI-generated tasks enter the system strictly in "pending" state
  let task: ExecutableTask = {
    id: "task-workflow-1",
    title: "Validate ₹1,20,000 prize budget",
    category: "Budget manager",
    priority: "high",
    state: "pending",
    toolName: "validate_budget",
    toolInput: {
      budget: sampleBudget,
      requestedBudget: parseResult.amount,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assert.equal(task.state, "pending");

  // Step 3: Verify illegal direct completion is blocked
  assert.throws(() => {
    transitionTask(task, "success");
  }, /Invalid task transition/);

  // Step 4: Organizer explicitly reviews and approves the task
  task = transitionTask(task, "approved");
  assert.equal(task.state, "approved");

  // Evidence of approval is logged
  const approvalEvidence = {
    id: "ev-1",
    taskId: task.id,
    action: "Task approval granted",
    toolName: task.toolName,
    status: "success" as const,
    timestamp: new Date().toISOString(),
  };
  assert.equal(approvalEvidence.status, "success");

  // Step 5: User clicks "Run" -> transition to running
  task = transitionTask(task, "running");
  assert.equal(task.state, "running");

  // Step 6: Execute the real registered tool
  const executionResult = await toolRegistry.execute(
    task.toolName!,
    task.toolInput!,
    task.id
  );

  assert.equal(executionResult.success, true);
  const resultData = executionResult.result as {
    allocated: number;
    requested: number;
    difference: number;
    status: string;
    matches: boolean;
  };

  assert.equal(resultData.allocated, 120000);
  assert.equal(resultData.requested, 120000);
  assert.equal(resultData.difference, 0);
  assert.equal(resultData.status, "balanced");
  assert.equal(resultData.matches, true);

  // Step 7: Transition task to success with real output
  task = transitionTask(task, "success", {
    toolResult: executionResult.result,
  });

  assert.equal(task.state, "success");
  assert.deepEqual(task.toolResult, executionResult.result);

  // Step 8: Log audit trail in Evidence Ledger
  const executionEvidence = {
    id: "ev-2",
    taskId: task.id,
    action: `Tool executed: ${task.toolName}`,
    toolName: task.toolName,
    status: "success" as const,
    details: `Allocated ₹${resultData.allocated} matched requested ₹${resultData.requested}`,
    timestamp: new Date().toISOString(),
    result: task.toolResult,
  };

  assert.equal(executionEvidence.status, "success");
  assert.equal(executionEvidence.toolName, "validate_budget");
});

test("Workflow Error Handling: Tool failure records honest error and supports retry", async () => {
  let task: ExecutableTask = {
    id: "task-workflow-error",
    title: "Validate invalid budget",
    category: "Budget manager",
    priority: "medium",
    state: "approved",
    toolName: "validate_budget",
    toolInput: {
      budget: [{ category: "Broken item", amount: -1000, details: "Negative" }],
      requestedBudget: 50000,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Run -> fails validation
  task = transitionTask(task, "running");
  const result = await toolRegistry.execute(task.toolName!, task.toolInput!, task.id);

  assert.equal(result.success, false);
  assert.match(result.error || "", /invalid or negative amount/i);

  // Transition to failed state
  task = transitionTask(task, "failed", { error: result.error });
  assert.equal(task.state, "failed");
  assert.ok(task.error);

  // Fix toolInput and Retry
  task.toolInput = {
    budget: [{ category: "Valid item", amount: 50000, details: "Fixed" }],
    requestedBudget: 50000,
  };

  // Retrying requires explicit re-approval before running
  task = transitionTask(task, "approved");
  assert.equal(task.state, "approved");
  task = transitionTask(task, "running");
  const retryResult = await toolRegistry.execute(task.toolName!, task.toolInput!, task.id);
  assert.equal(retryResult.success, true);

  task = transitionTask(task, "success", { toolResult: retryResult.result });
  assert.equal(task.state, "success");
});

test("Workflow Manual-Only Tasks: Unsupported operations route to manual_only and can be completed manually", () => {
  // A task like venue booking or catering has no automated tool
  let task: ExecutableTask = {
    id: "task-venue-reserve",
    title: "Reserve Main Auditorium and Setup AV",
    category: "Logistics",
    priority: "high",
    state: "manual_only",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assert.equal(task.state, "manual_only");
  assert.equal(task.toolName, undefined, "Manual tasks should not have a fake tool assigned");

  // Cannot transition directly from manual_only to running
  assert.throws(() => transitionTask(task, "running"), /Invalid task transition/);

  // Organizer completes the manual action in the real world and marks it complete
  task = transitionTask(task, "success", {
    toolResult: { manualNote: "Auditorium reserved and confirmed with facility manager" },
  });

  assert.equal(task.state, "success");
  assert.ok((task.toolResult as { manualNote: string }).manualNote.includes("Auditorium reserved"));
});

