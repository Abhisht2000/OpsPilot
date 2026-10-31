import test from "node:test";
import assert from "node:assert/strict";
import {
  type ExecutableTask,
  isValidTransition,
  transitionTask,
  toolRegistry,
} from "../app/lib/execution-engine.ts";

function createMockTask(overrides?: Partial<ExecutableTask>): ExecutableTask {
  return {
    id: "task-1",
    title: "Validate prize budget",
    category: "Budget manager",
    priority: "high",
    state: "pending",
    toolName: "budget_validator",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("State Machine - valid state transitions", () => {
  assert.equal(isValidTransition("pending", "approved"), true);
  assert.equal(isValidTransition("approved", "running"), true);
  assert.equal(isValidTransition("running", "success"), true);
  assert.equal(isValidTransition("running", "failed"), true);
  assert.equal(isValidTransition("failed", "approved"), true);
  assert.equal(isValidTransition("failed", "pending"), true);
  assert.equal(isValidTransition("failed", "running"), false); // Blocked: retry requires explicit re-approval
  assert.equal(isValidTransition("success", "pending"), true); // Reset / re-run flow
  assert.equal(isValidTransition("approved", "pending"), true); // Revoke approval
});

test("State Machine - blocks illegal direct transitions", () => {
  // Cannot jump from pending to running without user approval
  assert.equal(isValidTransition("pending", "running"), false);

  // Cannot mark pending as success directly
  assert.equal(isValidTransition("pending", "success"), false);

  // Cannot mark approved as success without running
  assert.equal(isValidTransition("approved", "success"), false);

  // Throws when transitioning illegally
  const task = createMockTask({ state: "pending" });
  assert.throws(() => {
    transitionTask(task, "success");
  }, /Invalid task transition/);
});

test("State Machine - full legitimate workflow", () => {
  let task = createMockTask();
  assert.equal(task.state, "pending");

  // Step 1: User explicitly approves task
  task = transitionTask(task, "approved");
  assert.equal(task.state, "approved");

  // Step 2: Task starts execution
  task = transitionTask(task, "running");
  assert.equal(task.state, "running");

  // Step 3: Tool returns result and marks success
  task = transitionTask(task, "success", {
    toolResult: { allocated: 50000, valid: true },
  });
  assert.equal(task.state, "success");
  assert.deepEqual(task.toolResult, { allocated: 50000, valid: true });
});

test("State Machine - tool failure and retry workflow", () => {
  let task = createMockTask({ state: "approved" });

  // Execute -> fails
  task = transitionTask(task, "running");
  task = transitionTask(task, "failed", { error: "Network timeout" });
  assert.equal(task.state, "failed");
  assert.equal(task.error, "Network timeout");

  // Cannot run directly from failed state without explicit re-approval
  assert.throws(() => transitionTask(task, "running"), /Invalid task transition/);

  // Explicit re-approval granted -> running
  task = transitionTask(task, "approved");
  assert.equal(task.state, "approved");

  task = transitionTask(task, "running");
  assert.equal(task.state, "running");
  assert.equal(task.error, undefined);

  // Now succeeds
  task = transitionTask(task, "success", { toolResult: { done: true } });
  assert.equal(task.state, "success");
});

test("Tool Registry - registers and runs tool with duplicate prevention", async () => {
  const toolName = "test_echo_tool";
  toolRegistry.registerTool(toolName, async (input) => {
    return {
      success: true,
      result: { echo: input.text },
    };
  });

  assert.equal(toolRegistry.hasTool(toolName), true);

  const res = await toolRegistry.execute(toolName, { text: "hello opspilot" }, "task-echo-1");
  assert.equal(res.success, true);
  assert.deepEqual(res.result, { echo: "hello opspilot" });

  // Unregistered tool handling
  const unregRes = await toolRegistry.execute("non_existent_tool", {}, "task-fail-1");
  assert.equal(unregRes.success, false);
  assert.match(unregRes.error || "", /is not registered/);
});

// ---- New tests for audit requirements ----

test("State Machine - manual_only task can be marked complete or reset", () => {
  // pending → manual_only is valid (tasks without registered tools)
  assert.equal(isValidTransition("pending", "manual_only"), true);
  // manual_only → success is valid (organizer marks it done)
  assert.equal(isValidTransition("manual_only", "success"), true);
  // manual_only → pending is valid (organizer resets it)
  assert.equal(isValidTransition("manual_only", "pending"), true);
  // manual_only → running is NOT valid (no tool to run)
  assert.equal(isValidTransition("manual_only", "running"), false);
  // manual_only → approved is NOT valid (no tool to approve)
  assert.equal(isValidTransition("manual_only", "approved"), false);

  // Actual transition works
  let task = createMockTask({ state: "pending", toolName: undefined });
  task = transitionTask(task, "manual_only");
  assert.equal(task.state, "manual_only");

  task = transitionTask(task, "success", { toolResult: { manualCompletion: true } });
  assert.equal(task.state, "success");
});

test("State Machine - pending task cannot be run without approval", () => {
  const task = createMockTask({ state: "pending" });
  assert.equal(isValidTransition("pending", "running"), false);
  assert.throws(() => transitionTask(task, "running"), /Invalid task transition/);
});

test("State Machine - failed task cannot retry without explicit re-approval", () => {
  const task = createMockTask({ state: "failed", error: "Connection refused" });
  // Direct retry blocked
  assert.equal(isValidTransition("failed", "running"), false);
  assert.throws(() => transitionTask(task, "running"), /Invalid task transition/);

  // Re-approval then retry is allowed
  const reApproved = transitionTask(task, "approved");
  assert.equal(reApproved.state, "approved");
  assert.equal(reApproved.error, undefined, "Error should be cleared when moving to approved");

  const retrying = transitionTask(reApproved, "running");
  assert.equal(retrying.state, "running");
});

test("Tool Registry - local tool result does not contain externalResourceId or external verification claim", async () => {
  const toolName = "test_local_only_tool";
  toolRegistry.registerTool(toolName, async () => {
    return {
      success: true,
      result: { data: "local artifact" },
      executionSource: "local_artifact" as const,
      disclaimer: "Generated locally. Not externally verified.",
    };
  });

  const res = await toolRegistry.execute(toolName, {}, "task-verify-local");
  assert.equal(res.success, true);

  // Must not claim external resource ID
  assert.equal((res as Record<string, unknown>).externalResourceId, undefined,
    "No externalResourceId should exist on any locally-executed tool result");

  // executionSource must be a local value
  assert.ok(
    res.executionSource === "local_execution" || res.executionSource === "local_artifact",
    `executionSource for local tool must be 'local_execution' or 'local_artifact', got: ${res.executionSource}`
  );
});

test("Tool Registry - blocks duplicate concurrent execution on same taskId", async () => {
  const asyncToolName = "test_async_long_tool";
  let finishExecution: () => void = () => {};

  toolRegistry.registerTool(asyncToolName, async () => {
    await new Promise<void>((resolve) => {
      finishExecution = resolve;
    });
    return { success: true, result: { done: true } };
  });

  const taskId = "task-concurrent-duplicate-test";

  // Start first execution
  const exec1Promise = toolRegistry.execute(asyncToolName, {}, taskId);

  // Start second execution on SAME taskId immediately before first finishes
  const exec2Result = await toolRegistry.execute(asyncToolName, {}, taskId);

  // Second execution must be rejected immediately with duplicate execution error
  assert.equal(exec2Result.success, false);
  assert.ok(exec2Result.error?.includes("already executing. Duplicate execution prevented"));

  // Finish first execution cleanly
  finishExecution();
  const exec1Result = await exec1Promise;
  assert.equal(exec1Result.success, true);
});

test("State Machine - comprehensive invalid state transitions matrix", () => {
  const illegalTransitions: [from: any, to: any][] = [
    ["pending", "success"],
    ["pending", "running"],
    ["pending", "failed"],
    ["approved", "success"],
    ["approved", "failed"],
    ["approved", "manual_only"],
    ["running", "pending"],
    ["running", "approved"],
    ["running", "manual_only"],
    ["failed", "running"],
    ["failed", "success"],
    ["failed", "manual_only"],
    ["success", "running"],
    ["success", "approved"],
    ["success", "failed"],
    ["success", "manual_only"],
    ["manual_only", "running"],
    ["manual_only", "approved"],
    ["manual_only", "failed"],
  ];

  for (const [from, to] of illegalTransitions) {
    assert.equal(
      isValidTransition(from, to),
      false,
      `Transition from "${from}" to "${to}" must be disallowed in state machine`
    );

    const task = createMockTask({ state: from });
    assert.throws(
      () => transitionTask(task, to),
      /Invalid task transition/,
      `transitionTask must throw error when moving from "${from}" to "${to}"`
    );
  }
});

test("State Machine - full retry approval cycle with error reset", () => {
  const task = createMockTask({ state: "pending" });

  // 1. Initial approval
  const approved = transitionTask(task, "approved");
  assert.equal(approved.state, "approved");

  // 2. Start running
  const running = transitionTask(approved, "running");
  assert.equal(running.state, "running");

  // 3. Execution fails
  const failed = transitionTask(running, "failed", { error: "ETIMEDOUT: Connection lost" });
  assert.equal(failed.state, "failed");
  assert.equal(failed.error, "ETIMEDOUT: Connection lost");

  // 4. Cannot retry directly without explicit approval
  assert.throws(() => transitionTask(failed, "running"), /Invalid task transition/);

  // 5. Explicit retry re-approval clears error and allows retry
  const reApproved = transitionTask(failed, "approved");
  assert.equal(reApproved.state, "approved");
  assert.equal(reApproved.error, undefined, "Error must be cleared upon re-approval");

  // 6. Retry executes and succeeds
  const retryRunning = transitionTask(reApproved, "running");
  assert.equal(retryRunning.state, "running");

  const succeeded = transitionTask(retryRunning, "success", {
    toolResult: { recovered: true },
  });
  assert.equal(succeeded.state, "success");
  assert.deepEqual(succeeded.toolResult, { recovered: true });
});
