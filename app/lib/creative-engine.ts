export type PosterTheme = "neon" | "minimal" | "bold" | "emerald";

export type PosterDimension = "1:1" | "16:9" | "9:16";

export type PosterContent = {
  kicker: string;
  headline: string;
  subheadline: string;
  eventDate: string;
  venue: string;
  badge: string;
  footer: string;
};

export type DimensionSpec = {
  width: number;
  height: number;
  label: string;
  aspectRatio: string;
  useCase: string;
};

export type ThemeSpec = {
  id: PosterTheme;
  name: string;
  tagline: string;
  bgDark: string;
  bgLight?: string;
  primaryGlow: string;
  secondaryGlow: string;
  accentColor: string;
  textColor: string;
  mutedTextColor: string;
  kickerColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  footerBorder: string;
  fontFamily: string;
  fontHeading: string;
};

export const DIMENSIONS: Record<PosterDimension, DimensionSpec> = {
  "1:1": {
    width: 1080,
    height: 1080,
    label: "Square (1:1)",
    aspectRatio: "1/1",
    useCase: "Instagram Feed, LinkedIn, Discord Announcement",
  },
  "16:9": {
    width: 1920,
    height: 1080,
    label: "Landscape (16:9)",
    aspectRatio: "16/9",
    useCase: "X/Twitter Banner, YouTube Thumb, Stage Screen",
  },
  "9:16": {
    width: 1080,
    height: 1920,
    label: "Portrait (9:16)",
    aspectRatio: "9/16",
    useCase: "Instagram Stories, Mobile Wallpaper, Print Poster",
  },
};

export const THEMES: Record<PosterTheme, ThemeSpec> = {
  neon: {
    id: "neon",
    name: "Neon Futuristic",
    tagline: "Cyberpunk · High Energy · Glow Accents",
    bgDark: "#0d0b1f",
    primaryGlow: "#8257e5",
    secondaryGlow: "#00d2ff",
    accentColor: "#a78bfa",
    textColor: "#ffffff",
    mutedTextColor: "#a5b4fc",
    kickerColor: "#38bdf8",
    badgeBg: "rgba(130, 87, 229, 0.25)",
    badgeBorder: "rgba(167, 139, 250, 0.5)",
    badgeText: "#c4b5fd",
    footerBorder: "rgba(255, 255, 255, 0.15)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontHeading: "system-ui, -apple-system, sans-serif",
  },
  minimal: {
    id: "minimal",
    name: "Minimal Pro",
    tagline: "Swiss Modern · Clean Structure · Architectural",
    bgDark: "#0f172a",
    primaryGlow: "#3b82f6",
    secondaryGlow: "#64748b",
    accentColor: "#60a5fa",
    textColor: "#f8fafc",
    mutedTextColor: "#94a3b8",
    kickerColor: "#38bdf8",
    badgeBg: "rgba(59, 130, 246, 0.15)",
    badgeBorder: "rgba(96, 165, 250, 0.4)",
    badgeText: "#93c5fd",
    footerBorder: "rgba(148, 163, 184, 0.2)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontHeading: "system-ui, -apple-system, sans-serif",
  },
  bold: {
    id: "bold",
    name: "Campus Bold",
    tagline: "Brutalist Editorial · Warm Ember · High Contrast",
    bgDark: "#180c0a",
    primaryGlow: "#ea580c",
    secondaryGlow: "#f59e0b",
    accentColor: "#fb923c",
    textColor: "#fff7ed",
    mutedTextColor: "#fdba74",
    kickerColor: "#facc15",
    badgeBg: "rgba(234, 88, 12, 0.25)",
    badgeBorder: "rgba(251, 146, 60, 0.5)",
    badgeText: "#fed7aa",
    footerBorder: "rgba(251, 146, 60, 0.25)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontHeading: "system-ui, -apple-system, sans-serif",
  },
  emerald: {
    id: "emerald",
    name: "Cyber Emerald",
    tagline: "Terminal Matrix · Obsidian & Mint · Bio-Tech",
    bgDark: "#051610",
    primaryGlow: "#059669",
    secondaryGlow: "#10b981",
    accentColor: "#34d399",
    textColor: "#ecfdf5",
    mutedTextColor: "#a7f3d0",
    kickerColor: "#6ee7b7",
    badgeBg: "rgba(16, 185, 129, 0.2)",
    badgeBorder: "rgba(52, 211, 153, 0.4)",
    badgeText: "#6ee7b7",
    footerBorder: "rgba(52, 211, 153, 0.2)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontHeading: "system-ui, -apple-system, sans-serif",
  },
};

/**
 * Validates poster content to ensure exact text is printable and non-empty.
 */
export function validatePosterContent(content: Partial<PosterContent>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!content.headline || !content.headline.trim()) {
    errors.push("Headline is required.");
  }

  if (content.headline && content.headline.length > 80) {
    errors.push("Headline must be 80 characters or fewer for optimal poster layout.");
  }

  if (content.subheadline && content.subheadline.length > 200) {
    errors.push("Subheadline must be 200 characters or fewer.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export type PosterCopyOptions = {
  eventDate?: string;
  venue?: string;
  registrationUrl?: string;
  duration?: string;
};

/**
 * Generates initial poster copy tailored to project details and user-configurable parameters.
 * Eliminates hardcoded dates, venues, registration links, and durations.
 */
export function generateDefaultCopy(
  projectName: string,
  eventBrief = "",
  budget = 0,
  participants = 0,
  options?: PosterCopyOptions
): PosterContent {
  const name = projectName.trim() || "Event Operations";
  const upperName = name.toUpperCase();

  const formattedBudget =
    budget > 0
      ? `₹${budget.toLocaleString("en-IN")} Prize Pool`
      : "Cash Prizes & API Credits";

  const formattedParticipants =
    participants > 0
      ? `${participants}+ Builders`
      : "Open Registration";

  const badge = `${formattedBudget} · ${formattedParticipants}`;

  let kicker = "AI / INNOVATION";
  if (name.toLowerCase().includes("symposium") || name.toLowerCase().includes("conference")) {
    kicker = "TECH SYMPOSIUM";
  } else if (name.toLowerCase().includes("summit")) {
    kicker = "LEADERSHIP SUMMIT";
  } else if (name.toLowerCase().includes("workshop")) {
    kicker = "HANDS-ON WORKSHOP";
  }

  // Duration: extract from options or brief or omit fixed 48h claim
  let duration = options?.duration?.trim();
  if (!duration) {
    const durMatch = eventBrief.match(/(\d+[\s-]*(?:hour|hr|day)s?)/i);
    duration = durMatch ? durMatch[1] : "";
  }

  // Event Date: read from options or placeholder
  const eventDate = options?.eventDate?.trim() || "[Event Date]";

  // Venue: read from options or placeholder
  const venue = options?.venue?.trim() || "[Venue / Virtual]";

  // Registration URL: configurable
  const regUrl = options?.registrationUrl?.trim() || "opspilot.io/join";
  const footer = `REGISTER NOW · ${regUrl.toUpperCase()}`;

  // Subheadline: project-driven without hardcoded 48-hour claim
  const subheadline = eventBrief.trim()
    ? eventBrief.slice(0, 120).trim() + (eventBrief.length > 120 ? "..." : "")
    : duration
    ? `Build the future of intelligent systems. Collaborate, innovate, and deploy in ${duration}.`
    : "Build the future of intelligent systems. Collaborate, innovate, and deploy.";

  return {
    kicker,
    headline: upperName,
    subheadline,
    eventDate,
    venue,
    badge,
    footer,
  };
}

/**
 * Generates an SVG string representation of the poster with exact-text rendering.
 * Can be exported or rendered directly in the browser or saved as a vector asset.
 */
export function generatePosterSvg(
  content: PosterContent,
  themeId: PosterTheme,
  dimension: PosterDimension
): string {
  const spec = DIMENSIONS[dimension] || DIMENSIONS["1:1"];
  const theme = THEMES[themeId] || THEMES.neon;
  const { width, height } = spec;

  // Responsive typography scale based on dimension
  const scale = width / 1080;
  const isLandscape = dimension === "16:9";

  const kickerSize = Math.round(18 * scale);
  const headlineSize = Math.round((isLandscape ? 48 : 56) * scale);
  const subSize = Math.round(22 * scale);
  const metaSize = Math.round(18 * scale);
  const badgeSize = Math.round(16 * scale);
  const footerSize = Math.round(16 * scale);

  const paddingX = Math.round(60 * scale);
  const paddingY = Math.round(60 * scale);

  // Split headline into multi-line if needed
  const headlineLines = wrapTextLines(content.headline, isLandscape ? 32 : 22);

  // SVG Markup
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: ${theme.bgDark};">
  <defs>
    <!-- Background glow gradients -->
    <radialGradient id="glow-primary" cx="80%" cy="20%" r="50%">
      <stop offset="0%" stop-color="${theme.primaryGlow}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${theme.bgDark}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-secondary" cx="20%" cy="85%" r="60%">
      <stop offset="0%" stop-color="${theme.secondaryGlow}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${theme.bgDark}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.accentColor}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${theme.accentColor}" stop-opacity="0.02"/>
    </linearGradient>
  </defs>

  <!-- Background Base -->
  <rect width="${width}" height="${height}" fill="${theme.bgDark}" />
  <rect width="${width}" height="${height}" fill="url(#glow-primary)" />
  <rect width="${width}" height="${height}" fill="url(#glow-secondary)" />

  <!-- Subtle Matrix/Grid Accent -->
  <g stroke="url(#grid-fade)" stroke-width="1">
    ${generateGridLines(width, height, Math.round(60 * scale))}
  </g>

  <!-- Top Kicker & Badge -->
  <g transform="translate(${paddingX}, ${paddingY + 30 * scale})">
    <text font-family="${theme.fontFamily}" font-size="${kickerSize}" font-weight="800" letter-spacing="4" fill="${theme.kickerColor}" text-transform="uppercase">
      ${escapeXml(content.kicker)}
    </text>
  </g>

  <!-- Highlight Pill Badge -->
  ${content.badge ? `
  <g transform="translate(${paddingX}, ${paddingY + 65 * scale})">
    <rect x="0" y="0" width="${Math.min(width - paddingX * 2, content.badge.length * 10 * scale + 30 * scale)}" height="${34 * scale}" rx="${17 * scale}" fill="${theme.badgeBg}" stroke="${theme.badgeBorder}" stroke-width="1.5" />
    <text x="${16 * scale}" y="${22 * scale}" font-family="${theme.fontFamily}" font-size="${badgeSize}" font-weight="700" fill="${theme.badgeText}">
      ★ ${escapeXml(content.badge)}
    </text>
  </g>` : ""}

  <!-- Center Headline Block -->
  <g transform="translate(${paddingX}, ${isLandscape ? height * 0.36 : height * 0.32})">
    ${headlineLines.map((line, i) => `
      <text x="0" y="${i * headlineSize * 1.15}" font-family="${theme.fontHeading}" font-size="${headlineSize}" font-weight="900" fill="${theme.textColor}" letter-spacing="-1">
        ${escapeXml(line)}
      </text>
    `).join("")}

    <!-- Subheadline -->
    <text x="0" y="${headlineLines.length * headlineSize * 1.15 + 25 * scale}" font-family="${theme.fontFamily}" font-size="${subSize}" font-weight="400" fill="${theme.mutedTextColor}">
      ${escapeXml(content.subheadline)}
    </text>
  </g>

  <!-- Event Date & Venue Metadata Card -->
  <g transform="translate(${paddingX}, ${height - paddingY - 110 * scale})">
    <text x="0" y="0" font-family="${theme.fontFamily}" font-size="${metaSize}" font-weight="700" fill="${theme.accentColor}">
      📅 ${escapeXml(content.eventDate)}
    </text>
    <text x="0" y="${26 * scale}" font-family="${theme.fontFamily}" font-size="${metaSize}" font-weight="500" fill="${theme.mutedTextColor}">
      📍 ${escapeXml(content.venue)}
    </text>
  </g>

  <!-- Bottom CTA Footer Bar -->
  <g transform="translate(${paddingX}, ${height - paddingY})">
    <line x1="0" y1="0" x2="${width - paddingX * 2}" y2="0" stroke="${theme.footerBorder}" stroke-width="1.5" />
    <text x="0" y="${26 * scale}" font-family="${theme.fontFamily}" font-size="${footerSize}" font-weight="800" letter-spacing="2" fill="${theme.textColor}">
      ${escapeXml(content.footer)}
    </text>
    <text x="${width - paddingX * 2}" y="${26 * scale}" text-anchor="end" font-family="${theme.fontFamily}" font-size="${footerSize * 0.9}" font-weight="600" fill="${theme.mutedTextColor}">
      POWERED BY OPSPILOT
    </text>
  </g>
</svg>`;
}

/**
 * Draws the poster onto an HTML5 Canvas element for high-res PNG export.
 */
export function drawPosterToCanvas(
  canvas: HTMLCanvasElement,
  content: PosterContent,
  themeId: PosterTheme,
  dimension: PosterDimension
): void {
  const spec = DIMENSIONS[dimension] || DIMENSIONS["1:1"];
  const theme = THEMES[themeId] || THEMES.neon;

  canvas.width = spec.width;
  canvas.height = spec.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = spec;
  const scale = width / 1080;
  const isLandscape = dimension === "16:9";

  // 1. Background Fill
  ctx.fillStyle = theme.bgDark;
  ctx.fillRect(0, 0, width, height);

  // 2. Primary Radial Glow
  const glow1 = ctx.createRadialGradient(
    width * 0.8,
    height * 0.2,
    0,
    width * 0.8,
    height * 0.2,
    width * 0.55
  );
  glow1.addColorStop(0, hexToRgba(theme.primaryGlow, 0.6));
  glow1.addColorStop(1, hexToRgba(theme.bgDark, 0));
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  // 3. Secondary Radial Glow
  const glow2 = ctx.createRadialGradient(
    width * 0.2,
    height * 0.85,
    0,
    width * 0.2,
    height * 0.85,
    width * 0.6
  );
  glow2.addColorStop(0, hexToRgba(theme.secondaryGlow, 0.45));
  glow2.addColorStop(1, hexToRgba(theme.bgDark, 0));
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // 4. Subtle Grid Pattern
  ctx.strokeStyle = hexToRgba(theme.accentColor, 0.05);
  ctx.lineWidth = 1;
  const gridSize = Math.round(60 * scale);
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const paddingX = Math.round(60 * scale);
  const paddingY = Math.round(60 * scale);

  // 5. Kicker Text
  const kickerSize = Math.round(18 * scale);
  ctx.font = `800 ${kickerSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = theme.kickerColor;
  ctx.textBaseline = "top";
  ctx.fillText(content.kicker.toUpperCase(), paddingX, paddingY + 20 * scale);

  // 6. Highlight Badge Pill
  if (content.badge) {
    const badgeSize = Math.round(16 * scale);
    ctx.font = `700 ${badgeSize}px system-ui, -apple-system, sans-serif`;
    const badgeText = `★ ${content.badge}`;
    const textWidth = ctx.measureText(badgeText).width;
    const badgeWidth = textWidth + 30 * scale;
    const badgeHeight = 34 * scale;
    const badgeY = paddingY + 55 * scale;

    ctx.fillStyle = theme.badgeBg;
    roundRect(ctx, paddingX, badgeY, badgeWidth, badgeHeight, 17 * scale);
    ctx.fill();

    ctx.strokeStyle = theme.badgeBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = theme.badgeText;
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, paddingX + 15 * scale, badgeY + badgeHeight / 2);
  }

  // 7. Headline Block
  const headlineSize = Math.round((isLandscape ? 48 : 56) * scale);
  ctx.font = `900 ${headlineSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = theme.textColor;
  ctx.textBaseline = "top";

  const headlineY = isLandscape ? height * 0.35 : height * 0.3;
  const lines = wrapTextLines(content.headline, isLandscape ? 32 : 22);

  lines.forEach((line, i) => {
    ctx.fillText(line, paddingX, headlineY + i * headlineSize * 1.15);
  });

  // 8. Subheadline
  const subheadlineY = headlineY + lines.length * headlineSize * 1.15 + 20 * scale;
  const subSize = Math.round(22 * scale);
  ctx.font = `400 ${subSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = theme.mutedTextColor;

  const subLines = wrapTextLines(content.subheadline, isLandscape ? 55 : 38);
  subLines.forEach((sLine, idx) => {
    ctx.fillText(sLine, paddingX, subheadlineY + idx * subSize * 1.3);
  });

  // 9. Date and Venue Metadata
  const metaY = height - paddingY - 110 * scale;
  const metaSize = Math.round(18 * scale);

  ctx.font = `700 ${metaSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = theme.accentColor;
  ctx.fillText(`📅 ${content.eventDate}`, paddingX, metaY);

  ctx.font = `500 ${metaSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = theme.mutedTextColor;
  ctx.fillText(`📍 ${content.venue}`, paddingX, metaY + 28 * scale);

  // 10. Footer Bar
  const footerY = height - paddingY;
  ctx.strokeStyle = theme.footerBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(paddingX, footerY);
  ctx.lineTo(width - paddingX, footerY);
  ctx.stroke();

  const footerSize = Math.round(16 * scale);
  ctx.font = `800 ${footerSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = theme.textColor;
  ctx.fillText(content.footer, paddingX, footerY + 16 * scale);

  ctx.textAlign = "right";
  ctx.font = `600 ${Math.round(footerSize * 0.9)}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = theme.mutedTextColor;
  ctx.fillText("POWERED BY OPSPILOT", width - paddingX, footerY + 16 * scale);
  ctx.textAlign = "left"; // reset
}

/**
 * Triggers client-side download of a high-resolution canvas.
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement("a");
  link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Triggers client-side download of an SVG string.
 */
export function downloadSvg(svgString: string, filename: string): void {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ────────── Helpers ────────── */

function wrapTextLines(text: string, maxCharsPerLine: number): string[] {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= maxCharsPerLine) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function generateGridLines(width: number, height: number, step: number): string {
  const lines: string[] = [];
  for (let x = 0; x <= width; x += step) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" />`);
  }
  for (let y = 0; y <= height; y += step) {
    lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" />`);
  }
  return lines.join("\n    ");
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
