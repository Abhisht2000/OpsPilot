import { NextResponse } from "next/server";

export type ImageGenerationRequest = {
  prompt: string;
  eventName?: string;
  visualStyle?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16";
  colorMood?: string;
  extraDetails?: string;
};

export type ImageGenerationResponse = {
  imageUrl: string;
  reasoning?: string;
  promptUsed: string;
  model: string;
};

export async function POST(request: Request) {
  try {
    const body: ImageGenerationRequest = await request.json();

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Image generation prompt is required." }, { status: 400 });
    }

    const apiKey = process.env.MODEL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "MODEL_API_KEY is not configured in .env.local" },
        { status: 500 }
      );
    }

    const baseUrl = process.env.META_API_BASE_URL || "https://api.meta.ai/v1";

    // Enrich the user's prompt for Meta AI muse-image-1.0
    const parts: string[] = [body.prompt.trim()];
    if (body.eventName?.trim()) {
      parts.push(`Official visual artwork for "${body.eventName.trim()}"`);
    }
    if (body.visualStyle?.trim()) {
      parts.push(`Style: ${body.visualStyle.trim()}`);
    }
    if (body.colorMood?.trim()) {
      parts.push(`Color Mood: ${body.colorMood.trim()}`);
    }
    if (body.aspectRatio) {
      const dimMap = {
        "1:1": "1:1 square canvas",
        "16:9": "16:9 widescreen landscape banner",
        "9:16": "9:16 vertical portrait poster",
      };
      parts.push(`Format: ${dimMap[body.aspectRatio] || body.aspectRatio}`);
    }
    if (body.extraDetails?.trim()) {
      parts.push(body.extraDetails.trim());
    }
    parts.push("High aesthetic, crisp detail, balanced composition, modern graphic design, 8k resolution.");

    const composedPrompt = parts.join(". ");

    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "muse-image-1.0",
        input: composedPrompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Meta AI muse-image API error:", response.status, data);
      return NextResponse.json(
        { error: data?.error?.message || `Meta AI returned error (${response.status})` },
        { status: response.status >= 500 ? 502 : 400 }
      );
    }

    let rawImage = "";
    let reasoningText = "";

    if (Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === "image_generation_call" && item.result) {
          rawImage = String(item.result);
        }
        if (item.type === "reasoning") {
          if (Array.isArray(item.summary)) {
            reasoningText = item.summary
              .map((s: { text?: string }) => s.text || "")
              .filter(Boolean)
              .join("\n");
          } else if (typeof item.text === "string") {
            reasoningText = item.text;
          }
        }
      }
    }

    if (!rawImage) {
      console.error("No image_generation_call in Meta AI response:", JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: "Meta AI response did not contain generated image data. Please try with a revised prompt." },
        { status: 502 }
      );
    }

    const imageUrl = rawImage.startsWith("data:")
      ? rawImage
      : `data:image/webp;base64,${rawImage}`;

    const result: ImageGenerationResponse = {
      imageUrl,
      reasoning: reasoningText,
      promptUsed: composedPrompt,
      model: "muse-image-1.0",
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("generate-image route error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while invoking Meta AI image model." },
      { status: 500 }
    );
  }
}
