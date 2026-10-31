import { toolRegistry } from "../execution-engine.ts";
import {
  DIMENSIONS,
  THEMES,
  generateDefaultCopy,
  generatePosterSvg,
  validatePosterContent,
  type PosterContent,
  type PosterDimension,
  type PosterTheme,
} from "../creative-engine.ts";

export const CREATIVE_TOOL_NAME = "generate_creatives";

export function registerCreativeTool(): void {
  if (toolRegistry.hasTool(CREATIVE_TOOL_NAME)) return;

  toolRegistry.registerTool(CREATIVE_TOOL_NAME, async (input) => {
    const rawTheme = (input.theme as string) || "neon";
    const themeKey = (rawTheme in THEMES ? rawTheme : "neon") as PosterTheme;

    const rawDim = (input.dimension as string) || "1:1";
    const dimKey = (rawDim in DIMENSIONS ? rawDim : "1:1") as PosterDimension;

    const projectName = (input.projectName as string) || (input.title as string) || "Event Operations";
    const brief = (input.brief as string) || "";
    const budget = Number(input.budget) || 0;
    const participants = Number(input.participants) || 0;

    let content: PosterContent;
    if (input.content && typeof input.content === "object") {
      content = input.content as PosterContent;
    } else {
      content = generateDefaultCopy(projectName, brief, budget, participants);
    }

    const validation = validatePosterContent(content);
    if (!validation.valid) {
      return {
        success: false,
        error: `Creative validation failed: ${validation.errors.join("; ")}`,
      };
    }

    const svg = generatePosterSvg(content, themeKey, dimKey);
    const themeSpec = THEMES[themeKey];
    const dimSpec = DIMENSIONS[dimKey];

    return {
      success: true,
      result: {
        action: CREATIVE_TOOL_NAME,
        studioType: "Template-based Creative Studio",
        theme: themeSpec.name,
        themeId: themeKey,
        dimension: dimSpec.label,
        resolution: `${dimSpec.width}x${dimSpec.height}px`,
        aspectRatio: dimSpec.aspectRatio,
        useCase: dimSpec.useCase,
        content: {
          kicker: content.kicker,
          headline: content.headline,
          subheadline: content.subheadline,
          eventDate: content.eventDate,
          venue: content.venue,
          badge: content.badge,
          footer: content.footer,
        },
        // Return full SVG asset content as well as short preview snippet
        svgSnippet: svg.slice(0, 300) + "...</svg>",
        svgContent: svg,
        assetContent: svg,
        // Exactly one asset is generated per tool call for the specified dimension
        generatedAsset: `${dimSpec.label} — ${dimSpec.width}x${dimSpec.height}px (${dimSpec.aspectRatio})`,
        generatedAt: new Date().toISOString(),
      },
      executionSource: "local_artifact" as const,
      disclaimer:
        "Deterministic exact-text SVG template rendered locally via Template-based Creative Studio. Exactly one asset is generated per tool call for the selected aspect ratio (not three assets). This is template rendering, not AI image generation.",
    };
  });
}

// Auto-register on import
registerCreativeTool();
