
import { NextResponse } from "next/server";
import { validateBudget } from "../../lib/budget-validator.ts";

type PlanTask = {
    title: string;
    category: string;
    priority: "high" | "medium" | "low";
};

type BudgetItem = {
    category: string;
    amount: number;
    details: string;
};

type EventPlan = {
    eventName: string;
    summary: string;
    participants: number;
    totalBudget: number;
    budgetUnspecified?: boolean;
    schedule: { time: string; activity: string }[];
    tasks: PlanTask[];
    budget: BudgetItem[];
    risks: { risk: string; mitigation: string }[];
    assumptions: string[];
};

function parsePlan(content: string): EventPlan {
    const cleaned = content
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

    const data = JSON.parse(cleaned);

    if (
        !data ||
        typeof data !== "object" ||
        typeof data.eventName !== "string" ||
        !data.eventName.trim() ||
        typeof data.summary !== "string" ||
        !data.summary.trim() ||
        !Array.isArray(data.tasks) ||
        !Array.isArray(data.budget) ||
        !Array.isArray(data.schedule) ||
        !Array.isArray(data.risks) ||
        !Array.isArray(data.assumptions) ||
        typeof data.totalBudget !== "number" ||
        !Number.isFinite(data.totalBudget) ||
        data.totalBudget < 0 ||
        typeof data.participants !== "number" ||
        !Number.isFinite(data.participants) ||
        data.participants < 0
    ) {
        throw new Error("Invalid plan structure");
    }

    // Strict validation for budgetUnspecified flag if present
    if (
        data.budgetUnspecified !== undefined &&
        typeof data.budgetUnspecified !== "boolean"
    ) {
        throw new Error("Invalid budgetUnspecified flag: must be a boolean");
    }

    // Strict validation for assumptions array: each must be a non-empty string
    for (const assumption of data.assumptions) {
        if (typeof assumption !== "string" || !assumption.trim()) {
            throw new Error("Invalid assumption: must be a non-empty string");
        }
    }

    // Strict validation for tasks
    for (const task of data.tasks) {
        if (
            !task ||
            typeof task !== "object" ||
            typeof task.title !== "string" ||
            !task.title.trim() ||
            typeof task.category !== "string" ||
            !task.category.trim() ||
            !["high", "medium", "low"].includes(task.priority)
        ) {
            throw new Error("Invalid task data: title, category and valid priority are required");
        }
    }

    // Strict validation for budget items
    for (const item of data.budget) {
        if (
            !item ||
            typeof item !== "object" ||
            typeof item.category !== "string" ||
            !item.category.trim() ||
            typeof item.details !== "string" ||
            typeof item.amount !== "number" ||
            !Number.isFinite(item.amount) ||
            item.amount < 0
        ) {
            throw new Error("Invalid budget item data: category, details and non-negative amount required");
        }
    }

    // Strict validation for schedule items
    for (const item of data.schedule) {
        if (
            !item ||
            typeof item !== "object" ||
            typeof item.time !== "string" ||
            !item.time.trim() ||
            typeof item.activity !== "string" ||
            !item.activity.trim()
        ) {
            throw new Error("Invalid schedule item: non-empty time and activity required");
        }
    }

    // Strict validation for risks items
    for (const item of data.risks) {
        if (
            !item ||
            typeof item !== "object" ||
            typeof item.risk !== "string" ||
            !item.risk.trim() ||
            typeof item.mitigation !== "string" ||
            !item.mitigation.trim()
        ) {
            throw new Error("Invalid risk data: non-empty risk and mitigation required");
        }
    }

    return data as EventPlan;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const brief = body?.brief;

        if (typeof brief !== "string" || !brief.trim()) {
            return NextResponse.json(
                { error: "Please enter an event brief." },
                { status: 400 }
            );
        }

        if (brief.length > 10000) {
            return NextResponse.json(
                { error: "The event brief must be under 10,000 characters." },
                { status: 400 }
            );
        }

        const apiKey = process.env.MODEL_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "MODEL_API_KEY is missing in .env.local." },
                { status: 500 }
            );
        }

        const baseUrl =
            process.env.META_API_BASE_URL || "https://api.meta.ai/v1";

        const eventProfile = body?.eventProfile;

        let enrichedPrompt = brief.trim();
        if (eventProfile && typeof eventProfile === "object") {
            const parts: string[] = [];
            if (eventProfile.eventType) parts.push(`Event Type: ${eventProfile.eventType}`);
            if (eventProfile.format) parts.push(`Format: ${eventProfile.format}`);
            if (eventProfile.eventDate) parts.push(`Event Date: ${eventProfile.eventDate}`);
            if (eventProfile.duration) parts.push(`Duration: ${eventProfile.duration}`);
            if (eventProfile.venue) parts.push(`Venue: ${eventProfile.venue}`);
            if (eventProfile.organizerName) parts.push(`Lead Organizer: ${eventProfile.organizerName}`);
            if (eventProfile.targetAudience) parts.push(`Target Audience: ${eventProfile.targetAudience}`);
            if (eventProfile.visualStyle) parts.push(`Visual Style: ${eventProfile.visualStyle}`);
            if (eventProfile.tagline) parts.push(`Event Tagline: ${eventProfile.tagline}`);

            if (parts.length > 0) {
                enrichedPrompt = `ORGANIZER EVENT PROFILE:\n${parts.join("\n")}\n\nEVENT BRIEF & GOALS:\n${enrichedPrompt}`;
            }
        }

        const response = await fetch(
            `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "muse-spark-1.3",
                    reasoning_effort: "minimal",
                    messages: [
                        {
                            role: "system",
                            content: `You are OpsPilot, an event operations planning assistant.

Return ONLY a valid JSON object. Do not use Markdown fences or text outside JSON.

Use this exact structure:
{
  "eventName": "string",
  "summary": "string",
  "participants": 100,
  "totalBudget": 50000,
  "budgetUnspecified": false,
  "schedule": [{"time": "string", "activity": "string"}],
  "tasks": [{"title": "string", "category": "string", "priority": "high"}],
  "budget": [{"category": "string", "amount": 0, "details": "string"}],
  "risks": [{"risk": "string", "mitigation": "string"}],
  "assumptions": ["string"]
}

Rules:
- Respect the provided Organizer Event Profile (dates, duration, physical/virtual format, venue, and audience) when crafting the schedule, budget categories, and tasks.
- Extract the requested participant count and budget from the brief.
- If the brief does NOT specify an exact budget amount, set "budgetUnspecified": true and provide a recommended estimate in totalBudget. Note in assumptions that this budget is an estimate and requires organizer confirmation.
- If the brief DOES specify a budget amount, set "budgetUnspecified": false and use the exact requested amount.
- Budget amounts must be non-negative numbers in INR.
- The sum of budget item amounts should equal totalBudget when possible.
- Never invent confirmed bookings, sponsors, prices, or completed actions.
- Tasks are proposed tasks, not executed actions.
- Use practical schedules, actionable tasks, and realistic risks.
- Keep all required fields present, even if arrays are empty.
- Priorities must be high, medium, or low.`,
                        },
                        {
                            role: "user",
                            content: enrichedPrompt,
                        },
                    ],
                    max_tokens: 2500,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Meta API error:", response.status, data);

            return NextResponse.json(
                { error: "AI provider request failed. Check server logs." },
                { status: 502 }
            );
        }

        const content = data.choices?.[0]?.message?.content;

        if (typeof content !== "string" || !content.trim()) {
            return NextResponse.json(
                { error: "The AI returned an empty response. Please retry." },
                { status: 502 }
            );
        }

        let structured: EventPlan;

        try {
            structured = parsePlan(content);
        } catch {
            console.error(
                "AI returned invalid JSON. Finish reason:",
                data.choices?.[0]?.finish_reason
            );

            return NextResponse.json(
                {
                    error:
                        "The AI response was not valid structured JSON. Please retry.",
                },
                { status: 502 }
            );
        }

        // Verify budget allocation totals using the shared validateBudget() function
        const budgetValidation = validateBudget(
            structured.budget,
            structured.totalBudget
        );

        return NextResponse.json({
            plan: structured.summary,
            structured,
            budgetValidation,
        });
    } catch (error) {
        console.error("Plan route error:", error);

        return NextResponse.json(
            { error: "Unable to generate the plan." },
            { status: 500 }
        );
    }
}
