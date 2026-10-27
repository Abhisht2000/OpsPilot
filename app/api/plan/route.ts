
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { brief } = await request.json();

        if (typeof brief !== "string" || !brief.trim()) {
            return NextResponse.json(
                { error: "Please enter an event brief." },
                { status: 400 }
            );
        }

        if (!process.env.MODEL_API_KEY) {
            return NextResponse.json(
                { error: "MODEL_API_KEY is missing in .env.local" },
                { status: 500 }
            );
        }

        const response = await fetch(
            `${process.env.META_API_BASE_URL || "https://api.meta.ai/v1"}/chat/completions`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.MODEL_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "muse-spark-1.3",
                    reasoning_effort: "minimal",
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are OpsPilot, an event operations planning assistant. Create practical plans with a summary, schedule, task checklist, budget breakdown, and risks. Clearly label assumptions. Do not claim tasks have been executed. Return a well-structured response with headings and bullet points.",
                        },
                        {
                            role: "user",
                            content: brief,
                        },
                    ],
                    max_tokens: 1500,
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

        const plan = data.choices?.[0]?.message?.content;

        if (!plan) {
            return NextResponse.json(
                { error: "The AI returned an empty response. Please retry." },
                { status: 502 }
            );
        }

        return NextResponse.json({ plan });
    } catch (error) {
        console.error("Plan route error:", error);
        return NextResponse.json(
            { error: "Unable to generate the plan." },
            { status: 500 }
        );
    }
}
