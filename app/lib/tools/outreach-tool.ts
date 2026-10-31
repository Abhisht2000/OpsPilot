import { toolRegistry } from "../execution-engine.ts";
import { generateOutreachDrafts } from "../outreach-engine.ts";

export const OUTREACH_TOOL_NAME = "review_outreach";

export function registerOutreachTool(): void {
  if (toolRegistry.hasTool(OUTREACH_TOOL_NAME)) return;

  toolRegistry.registerTool(OUTREACH_TOOL_NAME, async (input) => {
    const eventName = (input.eventName as string) || (input.eventType as string) || "Event";
    const brief = (input.brief as string) || "";
    // No fabricated defaults: 0 means unspecified
    const budget = Number(input.budget) || 0;
    const participants = Number(input.participants) || 0;

    const options = {
      organizerName: input.organizerName as string | undefined,
      organizerContact: input.organizerContact as string | undefined,
      recipientEmail: input.recipientEmail as string | undefined,
      sponsorName: input.sponsorName as string | undefined,
      duration: input.duration as string | undefined,
      isBudgetConfirmed: Boolean(input.isBudgetConfirmed),
    };

    const result = generateOutreachDrafts(eventName, brief, budget, participants, options);

    return {
      success: true,
      result: {
        action: OUTREACH_TOOL_NAME,
        eventName: result.eventName,
        draftsCount: result.draftsCount,
        drafts: result.drafts,
        reviewedAt: result.reviewedAt,
      },
      executionSource: "local_execution" as const,
      disclaimer: result.safetyPolicy,
    };
  });
}

// Auto-register on import
registerOutreachTool();
