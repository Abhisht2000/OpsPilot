import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSIONS,
  THEMES,
  generateDefaultCopy,
  validatePosterContent,
  generatePosterSvg,
  type PosterTheme,
  type PosterDimension,
} from "../app/lib/creative-engine.ts";
import { toolRegistry } from "../app/lib/execution-engine.ts";
import "../app/lib/tools/index.ts";

test("Creative Engine - dimensions configuration adheres to standard export specs", () => {
  assert.equal(DIMENSIONS["1:1"].width, 1080);
  assert.equal(DIMENSIONS["1:1"].height, 1080);
  assert.equal(DIMENSIONS["1:1"].aspectRatio, "1/1");

  assert.equal(DIMENSIONS["16:9"].width, 1920);
  assert.equal(DIMENSIONS["16:9"].height, 1080);
  assert.equal(DIMENSIONS["16:9"].aspectRatio, "16/9");

  assert.equal(DIMENSIONS["9:16"].width, 1080);
  assert.equal(DIMENSIONS["9:16"].height, 1920);
  assert.equal(DIMENSIONS["9:16"].aspectRatio, "9/16");
});

test("Creative Engine - themes have distinct styling and required color tokens", () => {
  const themeKeys: PosterTheme[] = ["neon", "minimal", "bold", "emerald"];
  for (const key of themeKeys) {
    const theme = THEMES[key];
    assert.ok(theme, `Theme ${key} should exist`);
    assert.ok(theme.name, `Theme ${key} should have a name`);
    assert.ok(theme.bgDark.startsWith("#"), `Theme ${key} background should be hex color`);
    assert.ok(theme.primaryGlow, `Theme ${key} should have primary glow`);
    assert.ok(theme.accentColor, `Theme ${key} should have accent color`);
    assert.ok(theme.textColor, `Theme ${key} should have text color`);
  }
});

test("Creative Engine - default copy generator extracts metrics from event plan", () => {
  const copy = generateDefaultCopy(
    "National AI Hackathon 2026",
    "48-hour student hackathon for 250 AI builders.",
    120000,
    250
  );

  assert.equal(copy.headline, "NATIONAL AI HACKATHON 2026");
  assert.ok(copy.badge.includes("₹1,20,000"));
  assert.ok(copy.badge.includes("250+ Builders"));
  assert.ok(copy.kicker.includes("AI / INNOVATION"));
  assert.ok(copy.footer.includes("REGISTER NOW"));
});

test("Creative Engine - validates content and enforces required headline", () => {
  const invalid = validatePosterContent({
    headline: "",
    subheadline: "Short description",
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((e) => e.includes("Headline is required")));

  const tooLongHeadline = validatePosterContent({
    headline: "A".repeat(85),
  });
  assert.equal(tooLongHeadline.valid, false);
  assert.ok(tooLongHeadline.errors.some((e) => e.includes("80 characters or fewer")));

  const valid = validatePosterContent({
    headline: "VALID EVENT HEADLINE",
    subheadline: "Valid subheadline under limit",
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});

test("Creative Engine - exact-text vector SVG rendering renders exact text without distortion", () => {
  const exactContent = {
    kicker: "SPECIAL HACKATHON EDITION",
    headline: "QUANTUM AI SUMMIT 2026",
    subheadline: "Where quantum computing meets deep generative models.",
    eventDate: "April 15–16, 2026",
    venue: "Auditorium Hall B",
    badge: "₹2,50,000 Cash Pool · 300 Seats",
    footer: "APPLY AT QUANTUM.OPSPILOT.IO",
  };

  const svg = generatePosterSvg(exactContent, "neon", "1:1");

  // Verify SVG structure and exact content presence
  assert.ok(svg.startsWith("<svg"));
  assert.ok(svg.endsWith("</svg>"));
  assert.ok(svg.includes("viewBox=\"0 0 1080 1080\""));
  assert.ok(svg.includes("SPECIAL HACKATHON EDITION"));
  assert.ok(svg.includes("QUANTUM AI SUMMIT 2026"));
  assert.ok(svg.includes("April 15–16, 2026"));
  assert.ok(svg.includes("Auditorium Hall B"));
  assert.ok(svg.includes("₹2,50,000 Cash Pool · 300 Seats"));
  assert.ok(svg.includes("APPLY AT QUANTUM.OPSPILOT.IO"));
});

test("Creative Engine - supports landscape and portrait dimensions in SVG rendering", () => {
  const content = generateDefaultCopy("Campus Tech Fest", "", 50000, 100);

  const landscapeSvg = generatePosterSvg(content, "bold", "16:9");
  assert.ok(landscapeSvg.includes("viewBox=\"0 0 1920 1080\""));

  const portraitSvg = generatePosterSvg(content, "emerald", "9:16");
  assert.ok(portraitSvg.includes("viewBox=\"0 0 1080 1920\""));
});

test("Tool Registry - executes generate_creatives tool and produces deterministic creative spec", async () => {
  assert.ok(toolRegistry.hasTool("generate_creatives"), "generate_creatives should be registered in tool registry");

  const input = {
    theme: "neon",
    dimension: "1:1",
    projectName: "Autonomous Agents Conference",
    brief: "Conference on LLM agents.",
    budget: 80000,
    participants: 150,
  };

  const result = await toolRegistry.execute("generate_creatives", input, "task-creative-test-1");

  assert.equal(result.success, true);
  assert.ok(result.result);

  const data = result.result as {
    action: string;
    theme: string;
    themeId: string;
    resolution: string;
    content: { headline: string; badge: string };
    generatedAsset?: string;
    assetsReady?: string[];
  };

  assert.equal(data.action, "generate_creatives");
  assert.equal(data.themeId, "neon");
  assert.equal(data.resolution, "1080x1080px");
  assert.equal(data.content.headline, "AUTONOMOUS AGENTS CONFERENCE");
  assert.ok(data.content.badge.includes("₹80,000"));
  assert.ok(data.generatedAsset?.includes("1080x1080px"), "Should describe single generated asset");
  assert.equal(data.assetsReady, undefined, "Misleading assetsReady array should be removed");
  assert.equal(result.executionSource, "local_artifact");
  assert.ok(result.disclaimer?.includes("Deterministic exact-text SVG template rendered locally"));
});
