import { toolRegistry } from "../execution-engine.ts";
import { researchSponsors } from "../sponsor-engine.ts";

export const SPONSOR_TOOL_NAME = "sponsor_research";

export function registerSponsorTool(): void {
  if (toolRegistry.hasTool(SPONSOR_TOOL_NAME)) return;

  toolRegistry.registerTool(SPONSOR_TOOL_NAME, async (input) => {
    const eventName = (input.eventType as string) || (input.eventName as string) || "Event";
    const eventBrief = (input.eventBrief as string) || (input.brief as string) || "";
    // Use actual values; 0 means not specified — engine will omit them rather than fabricate
    const budget = Number(input.requestedBudget) || Number(input.budget) || 0;
    const participants = Number(input.participants) || 0;

    const result = researchSponsors(eventName, eventBrief, budget, participants);

    return {
      success: true,
      result: {
        action: SPONSOR_TOOL_NAME,
        eventType: result.eventType,
        targetCount: result.targetCount,
        sectors: result.sectors,
        sponsors: result.sponsors,
        criteria: result.criteria,
        isLiveSearch: result.isLiveSearch,
        retrievedAt: result.retrievedAt,
      },
      executionSource: "local_execution" as const,
      disclaimer: result.sourceDisclaimer,
    };
  });
}

// Auto-register on import
registerSponsorTool();
