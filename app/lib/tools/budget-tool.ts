import { validateBudget, type BudgetItem } from "../budget-validator.ts";
import { toolRegistry } from "../execution-engine.ts";

export const BUDGET_VALIDATOR_TOOL = "validate_budget";

export function registerBudgetTool(): void {
  if (toolRegistry.hasTool(BUDGET_VALIDATOR_TOOL)) return;

  toolRegistry.registerTool(BUDGET_VALIDATOR_TOOL, async (input) => {
    const budget = input.budget as BudgetItem[];
    const requestedBudget = Number(input.requestedBudget);

    if (!Array.isArray(budget)) {
      return {
        success: false,
        error: "Budget breakdown data was not provided to the Budget Validator.",
      };
    }

    if (!Number.isFinite(requestedBudget) || requestedBudget < 0) {
      return {
        success: false,
        error: "Valid non-negative target budget must be provided.",
      };
    }

    // Execute local real budget validator
    const result = validateBudget(budget, requestedBudget);

    return {
      success: result.valid,
      result: {
        allocated: result.allocated,
        requested: result.requested,
        difference: result.difference,
        status: result.status,
        matches: result.matches,
        warnings: result.warnings,
        errors: result.errors,
      },
      disclaimer: result.disclaimer,
      error: result.errors.length > 0 ? result.errors[0] : undefined,
    };
  });
}

// Auto-register on import
registerBudgetTool();
