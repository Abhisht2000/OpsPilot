import { toolRegistry } from "../execution-engine.ts";
import { registerBudgetTool, BUDGET_VALIDATOR_TOOL } from "./budget-tool.ts";
import { registerCreativeTool, CREATIVE_TOOL_NAME } from "./creative-tool.ts";
import { registerSponsorTool, SPONSOR_TOOL_NAME } from "./sponsor-tool.ts";
import { registerOutreachTool, OUTREACH_TOOL_NAME } from "./outreach-tool.ts";
import "./export-tool.ts";

export function initializeToolRegistry(): void {
  // 1. Budget Validator Tool
  registerBudgetTool();

  // 2. Event Operations Checklist Finalizer (Local Brief Lock)
  if (!toolRegistry.hasTool("finalize_brief")) {
    toolRegistry.registerTool("finalize_brief", async (input) => {
      const title = (input.title as string) || "Event Brief";
      return {
        success: true,
        result: {
          action: "finalize_brief",
          status: "confirmed",
          summary: `Operational brief verified and locked for execution. Title: "${title}". Local confirmation only — does not book external venues or catering.`,
          timestamp: new Date().toISOString(),
        },
        disclaimer: "Local document confirmation. Does not reserve or purchase external physical resources.",
      };
    });
  }

  // 3. Sponsor Research Shortlist Tool
  registerSponsorTool();

  // 4. Creative Studio Theme & Exact-Text Render Tool
  registerCreativeTool();

  // 5. Outreach Draft Review Tool
  registerOutreachTool();
}

// Auto-initialize on import
initializeToolRegistry();

export {
  BUDGET_VALIDATOR_TOOL,
  CREATIVE_TOOL_NAME,
  SPONSOR_TOOL_NAME,
  OUTREACH_TOOL_NAME,
};
