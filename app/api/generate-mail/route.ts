import { NextResponse } from "next/server";

export type MailGenerationRequest = {
  // Sender / organizer
  organizerName: string;
  organizerEmail: string;
  organizerRole: string;        // e.g. "Head of Corporate Relations", "Lead Organizer", "PR Director"
  organizationName: string;     // college / company / community name

  // Event
  eventName: string;
  eventType: string;
  eventDate: string;
  venue: string;
  expectedParticipants: string;
  budget: string;               // indicative or confirmed

  // Sponsor / recipient
  sponsorCompanyName: string;
  sponsorProgramName: string;   // e.g. "Google for Startups Cloud Program"
  recipientName: string;        // "Hiring Manager", "DevRel Lead" or actual name
  recipientRole: string;        // e.g. "Developer Relations Lead"
  sponsorAsk: string;           // what you're asking for: credits, cash, mentors, etc.

  // PR & CR Strategic Agent Parameters
  outreachType?: "corporate_relations" | "devrel_api" | "pr_media" | "inkind_swag";
  crStrategicFit?: string;      // Why this sponsor benefits (e.g. talent hiring, cloud consumption)
  prPressHook?: string;         // Public Relations & press release narrative angle
  keyDeliverables?: string[];   // What the sponsor receives in return

  // Tone & instructions
  tone: "formal" | "friendly" | "concise";
  extraContext: string;         // anything extra the user wants included
};

export type GeneratedMail = {
  subject: string;
  body: string;
  reasoning: string;
  prAngleSummary?: string;
  crValueExchange?: string;
};

function parseMail(content: string): GeneratedMail {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const data = JSON.parse(cleaned);
  if (typeof data.subject !== "string" || !data.subject.trim()) throw new Error("Missing subject");
  if (typeof data.body !== "string" || !data.body.trim()) throw new Error("Missing body");
  return {
    subject: data.subject,
    body: data.body,
    reasoning: data.reasoning || "",
    prAngleSummary: data.prAngleSummary || "",
    crValueExchange: data.crValueExchange || "",
  };
}

export async function POST(request: Request) {
  try {
    const body: MailGenerationRequest = await request.json();

    if (!body.eventName?.trim() || !body.sponsorCompanyName?.trim()) {
      return NextResponse.json(
        { error: "Event name and sponsor company name are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.MODEL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "MODEL_API_KEY missing in .env.local" }, { status: 500 });
    }

    const baseUrl = process.env.META_API_BASE_URL || "https://api.meta.ai/v1";

    const systemPrompt = `You are an elite Public Relations (PR) and Corporate Relations (CR) autonomous agent representing event organizers and collegiate tech communities.
Your mission is to craft high-conversion, deeply personalized sponsorship proposals, partnership inquiries, and PR outreach pitches on behalf of the organizing team.

Return ONLY valid JSON. No markdown fences. Use this exact structure:
{
  "subject": "High open-rate, professional subject line tailored to the recipient",
  "body": "Complete email pitch with clean paragraph formatting using \\n\\n",
  "reasoning": "Strategic explanation of the pitch angle and tone selected (1-2 sentences)",
  "prAngleSummary": "Core public relations narrative used (e.g. Student AI breakthrough stories)",
  "crValueExchange": "Explicit mutual ROI stated for the corporate partner (e.g. Talent recruiting & API usage)"
}

Rules:
- Write on behalf of the organizer (${body.organizerName || "Organizer"}, ${body.organizerRole || "Lead Organizer"}).
- Write a complete, ready-to-dispatch draft. Never produce placeholders or generic templates.
- Tailor the pitch directly to ${body.sponsorCompanyName} and their specific technology ecosystem or community grant program.
- Clearly articulate the "Mutual Value Exchange":
  1. What the event delivers to the company (targeted developer adoption, recruiting access, campus brand equity, media coverage).
  2. What the organizers are requesting (the specific ask, e.g. credits, challenge bounty, mentorship, cash sponsorship).
- Structure the pitch logically:
  • Warm, respectful opening showing familiarity with ${body.sponsorCompanyName}'s recent developer initiatives.
  • The Event Opportunity: Who is attending, scale, and theme.
  • The Corporate Relations Angle: Why this partnership uniquely benefits ${body.sponsorCompanyName}.
  • Specific Proposed Integration / Tier.
  • Call to Action: Proposing a brief 10-15 minute discussion or sharing the sponsorship deck.
  • Professional sign-off with sender name, title, and organization.
- Tone must strictly adhere to the requested tone: ${body.tone || "formal"}.
- Never fabricate false data; if budget or details are unconfirmed, label them as indicative or target.`;

    const userPrompt = `DRAFT PR & CR SPONSORSHIP PROPOSAL:

SENDER IDENTITY (ORGANIZER):
Name: ${body.organizerName || "Organizing Team"}
Title/Role: ${body.organizerRole || "Corporate Relations Lead"}
Organization: ${body.organizationName || "Event Organizing Committee"}
Contact: ${body.organizerEmail || "[organizer email]"}

EVENT SPECIFICATIONS:
Name: ${body.eventName}
Type: ${body.eventType || "Flagship Tech Event"}
Date: ${body.eventDate || "Upcoming (Dates TBD)"}
Venue / Location: ${body.venue || "Campus / Hybrid"}
Expected Participants: ${body.expectedParticipants || "200+ Developers & Builders"}
Budget: ${body.budget || "Target budget under planning"}

PROSPECTIVE CORPORATE PARTNER:
Target Company: ${body.sponsorCompanyName}
Target Program / Dept: ${body.sponsorProgramName || "Developer Relations & Campus Outreach"}
Recipient: ${body.recipientName || "Developer Relations & Partnerships Team"}
Recipient Role: ${body.recipientRole || "Partnerships Lead"}
Requested Contribution / Ask: ${body.sponsorAsk || "Event Sponsorship & Tooling Access"}

PR & CR STRATEGIC ANGLES:
Outreach Strategy Type: ${body.outreachType || "corporate_relations"}
Corporate Relations Fit: ${body.crStrategicFit || "Developer tool adoption, recruiting top student engineers, campus brand mindshare"}
PR & Press Hook: ${body.prPressHook || "Empowering university developers to deploy real-world technological solutions"}
Key Deliverables to Propose: ${Array.isArray(body.keyDeliverables) ? body.keyDeliverables.join(", ") : "Keynote address, Challenge Track, Mentorship, Logo on promotional creatives"}

TONE & EXTRA DIRECTIVES:
Tone: ${body.tone || "formal"}
Additional Context: ${body.extraContext || "None"}`;

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
        max_tokens: 1800,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Meta API error in generate-mail:", response.status, data);
      return NextResponse.json({ error: "AI provider request failed." }, { status: 502 });
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "AI returned empty response. Please retry." }, { status: 502 });
    }

    let mail: GeneratedMail;
    try {
      mail = parseMail(content);
    } catch {
      console.error("Mail AI returned invalid JSON:", content.slice(0, 300));
      return NextResponse.json({ error: "AI response was not valid JSON. Please retry." }, { status: 502 });
    }

    return NextResponse.json({ mail });
  } catch (error) {
    console.error("generate-mail route error:", error);
    return NextResponse.json({ error: "Unable to generate mail." }, { status: 500 });
  }
}
