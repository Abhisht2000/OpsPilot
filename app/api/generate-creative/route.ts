
import { NextResponse } from "next/server";

export type CreativeGenerationRequest = {
  prompt: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  venue: string;
  targetAudience: string;
  brandColor: string;
  visualStyle: string;
  tagline: string;
  organizerName: string;
  budget?: string;
  participants?: string;
  dimension: "1:1" | "16:9" | "9:16";
};

export type CreativeLayout = {
  kicker: string;
  headline: string;
  subheadline: string;
  tagline: string;
  badge: string;
  eventDate: string;
  venue: string;
  footer: string;
  colorPrimary: string;
  colorAccent: string;
  colorBg: string;
  colorText: string;
  layoutStyle: "bold_center" | "top_left" | "split" | "minimal";
  suggestedTheme: "neon" | "minimal" | "bold" | "emerald";
  reasoning: string;
};

function parseLayout(content: string): CreativeLayout {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const data = JSON.parse(cleaned);
  const required = [
    "kicker", "headline", "subheadline", "tagline", "badge",
    "eventDate", "venue", "footer", "colorPrimary", "colorAccent",
    "colorBg", "colorText", "layoutStyle", "suggestedTheme", "reasoning",
  ];
  for (const key of required) {
    if (!data[key] && data[key] !== 0) throw new Error(`Missing field: ${key}`);
  }
  return data as CreativeLayout;
}

export async function POST(request: Request) {
  try {
    const body: CreativeGenerationRequest = await request.json();

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Creative prompt is required." }, { status: 400 });
    }

    const apiKey = process.env.MODEL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "MODEL_API_KEY missing in .env.local" }, { status: 500 });
    }

    const baseUrl = process.env.META_API_BASE_URL || "https://api.meta.ai/v1";

    const systemPrompt = `You are a world-class event creative director. Given event details and a creative request, generate a structured JSON layout for a promotional poster/banner.

Return ONLY valid JSON. No markdown fences. Use this exact structure:
{
  "kicker": "short category label (e.g. AI / HACKATHON)",
  "headline": "BOLD EVENT TITLE IN CAPS",
  "subheadline": "One compelling sentence about the event",
  "tagline": "Short punchy tagline (3-7 words)",
  "badge": "Key stat or highlight badge (e.g. ₹50,000 Prizes · 250 Builders)",
  "eventDate": "Human-readable event date",
  "venue": "Venue or format",
  "footer": "Call to action + website (e.g. REGISTER NOW · EVENT.IO/JOIN)",
  "colorPrimary": "#hexcolor — main brand/accent color",
  "colorAccent": "#hexcolor — secondary highlight color",
  "colorBg": "#hexcolor — dark background color",
  "colorText": "#hexcolor — primary text color",
  "layoutStyle": "bold_center | top_left | split | minimal",
  "suggestedTheme": "neon | minimal | bold | emerald",
  "reasoning": "Brief explanation of your creative choices (1-2 sentences)"
}

Rules:
- Use the brand color as the primary accent when provided.
- Choose colors that create strong visual contrast and feel premium.
- Make the headline punchy and memorable, all caps.
- The tagline must be inspiring and event-specific.
- Layout style: bold_center for square/portrait, split for landscape.
- Never fabricate confirmed details; use "[TBD]" for missing data.`;

    const userPrompt = `Event Name: ${body.eventName || "Untitled Event"}
Event Type: ${body.eventType || "Event"}
Date: ${body.eventDate || "TBD"}
Venue/Format: ${body.venue || "TBD"}
Target Audience: ${body.targetAudience || "General audience"}
Brand Color: ${body.brandColor || "#7c3aed"}
Visual Style: ${body.visualStyle || "Modern"}
Preferred Tagline: ${body.tagline || "(suggest one)"}
Organizer: ${body.organizerName || "Organizing Team"}
Budget: ${body.budget || "Not specified"}
Expected Participants: ${body.participants || "Not specified"}
Aspect Ratio: ${body.dimension}

Creative Request: ${body.prompt}`;

    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "muse-spark-1.3",
        reasoning_effort: "minimal",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Meta API error:", response.status, data);
      return NextResponse.json({ error: "AI provider request failed." }, { status: 502 });
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "AI returned empty response. Please retry." }, { status: 502 });
    }

    let layout: CreativeLayout;
    try {
      layout = parseLayout(content);
    } catch {
      console.error("Creative AI returned invalid JSON:", content.slice(0, 300));
      return NextResponse.json({ error: "AI response was not valid JSON. Please retry." }, { status: 502 });
    }

    return NextResponse.json({ layout });
  } catch (error) {
    console.error("generate-creative route error:", error);
    return NextResponse.json({ error: "Unable to generate creative." }, { status: 500 });
  }
}
