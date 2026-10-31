export type TaskState = "pending" | "approved" | "running" | "success" | "failed" | "manual_only";

export type TaskPriority = "high" | "medium" | "low";

/**
 * Describes how a tool execution result was produced and whether it represents
 * external verification or local artifact generation.
 *
 * - "local_execution": A local handler ran deterministically on local data.
 * - "local_artifact": A file/content was generated locally (e.g. export, SVG).
 * - "external_response": A real external API response was received.
 * - "independently_verified": A result has been independently confirmed outside the system.
 *
 * Do NOT set "external_response" or "independently_verified" for any locally-executed tool.
 */
export type ExecutionSource =
  | "local_execution"
  | "local_artifact"
  | "external_response"
  | "independently_verified";

export type ExecutableTask = {
  id: string;
  title: string;
  category: string;
  priority: TaskPriority;
  state: TaskState;
  /** Registered tool name. Undefined means manual-only task. */
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  error?: string;
  executionId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ToolExecutionResult = {
  success: boolean;
  result?: unknown;
  error?: string;
  disclaimer?: string;
  /** How the result was produced. Always set by tools; never implies external verification for local tools. */
  executionSource?: ExecutionSource;
};

export type ToolHandler = (
  input: Record<string, unknown>,
  context?: { taskId: string }
) => Promise<ToolExecutionResult>;

// Valid state machine transitions enforcing human-in-the-loop governance
const ALLOWED_TRANSITIONS: Record<TaskState, TaskState[]> = {
  pending: ["approved", "manual_only"],
  approved: ["pending", "running"],
  running: ["success", "failed"],
  failed: ["pending", "approved"], // Retrying requires explicit re-approval; cannot jump directly to running
  success: ["pending"],            // Re-run workflow: explicitly reset to pending for re-evaluation and re-approval
  manual_only: ["success", "pending"], // Manual tasks: organizer marks complete or resets them
};

/**
 * Validates if a state transition is legal in the execution state machine.
 */
export function isValidTransition(from: TaskState, to: TaskState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Transitions a task to a new state while strictly enforcing the approval and execution pipeline.
 * Throws an error if the transition violates the state machine rules.
 */
export function transitionTask(
  task: ExecutableTask,
  toState: TaskState,
  options?: {
    toolResult?: unknown;
    error?: string;
    executionId?: string;
  }
): ExecutableTask {
  if (!isValidTransition(task.state, toState)) {
    throw new Error(
      `Invalid task transition: Cannot move task from "${task.state}" to "${toState}". Tasks must be explicitly approved before execution, and can only complete through tool execution.`
    );
  }

  const now = new Date().toISOString();

  return {
    ...task,
    state: toState,
    toolResult: options?.toolResult !== undefined ? options.toolResult : (toState === "pending" ? undefined : task.toolResult),
    error: options?.error !== undefined ? options.error : (toState === "running" || toState === "pending" || toState === "approved" ? undefined : task.error),
    executionId: options?.executionId !== undefined ? options.executionId : (toState === "pending" ? undefined : task.executionId),
    updatedAt: now,
  };
}

/**
 * Registry of executable operational tools.
 */
class ToolRegistryClass {
  private tools = new Map<string, ToolHandler>();
  private activeExecutions = new Set<string>();

  registerTool(name: string, handler: ToolHandler): void {
    if (this.tools.has(name)) {
      console.warn(`Tool "${name}" is already registered. Overwriting.`);
    }
    this.tools.set(name, handler);
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Returns a record of tool names to description strings for display purposes.
   */
  listTools(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const name of this.tools.keys()) {
      result[name] = `Registered tool handler`;
    }
    return result;
  }

  /**
   * Executes a registered tool with duplicate-execution lock and strict error isolation.
   */
  async execute(
    toolName: string,
    input: Record<string, unknown>,
    taskId: string
  ): Promise<ToolExecutionResult> {
    if (this.activeExecutions.has(taskId)) {
      return {
        success: false,
        error: `Task ${taskId} is already executing. Duplicate execution prevented.`,
      };
    }

    const handler = this.tools.get(toolName);
    if (!handler) {
      return {
        success: false,
        error: `Tool "${toolName}" is not registered in the tool registry. Available tools: ${this.getToolNames().join(", ") || "none"}`,
      };
    }

    this.activeExecutions.add(taskId);

    try {
      const result = await handler(input, { taskId });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown execution failure occurred.";
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      this.activeExecutions.delete(taskId);
    }
  }
}

export const toolRegistry = new ToolRegistryClass();
