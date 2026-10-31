import { test } from "node:test";
import assert from "node:assert/strict";
import { researchSponsors, SPONSOR_PROGRAM_DIRECTORY, VERIFIED_SPONSOR_DIRECTORY } from "../app/lib/sponsor-engine.ts";
import { generateOutreachDrafts } from "../app/lib/outreach-engine.ts";
import { toolRegistry } from "../app/lib/execution-engine.ts";
import "../app/lib/tools/index.ts";

test("Sponsor Engine - directory targets have official links, last-checked date and indicative contributions", () => {
  assert.ok(SPONSOR_PROGRAM_DIRECTORY.length >= 5);
  assert.equal(VERIFIED_SPONSOR_DIRECTORY, SPONSOR_PROGRAM_DIRECTORY);
  for (const s of SPONSOR_PROGRAM_DIRECTORY) {
    assert.ok(s.name, "Sponsor should have a name");
    assert.ok(s.sector, "Sponsor should have a sector");
    assert.ok(s.sourceUrl.startsWith("https://"), "Sponsor should have a valid HTTPS source URL");
    assert.ok(s.officialProgramLink.startsWith("https://"), "Sponsor should have an official program link");
    assert.ok(s.lastChecked, "Sponsor should have a lastChecked date");
    assert.ok(s.listedProgram, "Sponsor should have a listedProgram");
    assert.ok(s.typicalContribution, "Sponsor should list typical contribution");
    assert.ok(s.typicalContribution.includes("Indicative, not confirmed"), "Contribution should be labeled indicative");
    assert.equal(s.isContributionIndicative, true);
    assert.ok(s.recommendedPitchAngle, "Sponsor should have recommended pitch angle");
  }
});

test("Sponsor Engine - researchSponsors matches AI and hackathon keywords", () => {
  const result = researchSponsors("National AI Hackathon 2026", "250 student developers", 120000, 250);

  assert.equal(result.eventType, "National AI Hackathon 2026");
  assert.ok(result.targetCount >= 4);
  assert.ok(result.sponsors.length >= 4);
  assert.equal(result.isLiveSearch, false);
  assert.ok(result.sourceDisclaimer.includes("Directory-based recommendations"));

  // First matches should be relevant cloud or developer tools
  const topSponsor = result.sponsors[0];
  assert.ok(
    topSponsor.sector === "Cloud Infrastructure" || topSponsor.sector === "AI Platforms" || topSponsor.sector === "Developer Tools"
  );
});

test("Outreach Engine - generates customized draft emails with exact project metrics", () => {
  const draftsResult = generateOutreachDrafts("Autonomous Agents Summit", "50 AI researchers", 80000, 100);

  assert.equal(draftsResult.eventName, "Autonomous Agents Summit");
  assert.equal(draftsResult.draftsCount, 3);
  assert.ok(draftsResult.safetyPolicy.includes("No emails or external messages are ever dispatched automatically"));

  const cloudDraft = draftsResult.drafts.find((d) => d.id === "draft-cloud-tier1");
  assert.ok(cloudDraft);
  assert.ok(cloudDraft?.subject.includes("Autonomous Agents Summit"));
  assert.ok(cloudDraft?.body.includes("100+"));
  assert.ok(cloudDraft?.body.includes("₹80,000"));
});

test("Tool Registry - executes sponsor_research and review_outreach tools", async () => {
  assert.ok(toolRegistry.hasTool("sponsor_research"));
  assert.ok(toolRegistry.hasTool("review_outreach"));

  // 1. Run sponsor_research
  const sponsorRes = await toolRegistry.execute(
    "sponsor_research",
    { eventType: "Robotics & AI Expo", budget: 150000, participants: 300 },
    "task-test-sponsor-1"
  );
  assert.equal(sponsorRes.success, true);
  const sponsorData = sponsorRes.result as { targetCount: number; sponsors: unknown[] };
  assert.ok(sponsorData.targetCount > 0);
  assert.ok(sponsorData.sponsors.length > 0);

  // 2. Run review_outreach
  const outreachRes = await toolRegistry.execute(
    "review_outreach",
    { eventName: "Robotics & AI Expo", budget: 150000, participants: 300 },
    "task-test-outreach-1"
  );
  assert.equal(outreachRes.success, true);
  const outreachData = outreachRes.result as { draftsCount: number; drafts: unknown[] };
  assert.equal(outreachData.draftsCount, 3);
  assert.ok(outreachRes.disclaimer?.includes("No emails or external messages"));
});

// ---- New correctness tests ----

test("Sponsor Engine - directory results are never labeled live-verified", () => {
  const result = researchSponsors("Some Hackathon", "", 50000, 100);

  // isLiveSearch must always be false for directory-backed research
  assert.equal(result.isLiveSearch, false,
    "Sponsor directory results must never claim to be a live search");

  // sourceDisclaimer must not claim external verification
  assert.ok(
    !result.sourceDisclaimer.toLowerCase().includes("externally verified"),
    "Sponsor source disclaimer must not claim external verification"
  );
  assert.ok(
    !result.sourceDisclaimer.toLowerCase().includes("live verified"),
    "Sponsor source disclaimer must not claim live verification"
  );
});

test("Outreach Engine - does not fabricate contact email or participant count", () => {
  // When no participants/budget provided, must show placeholder not fabricated data
  const drafts = generateOutreachDrafts("Test Summit", "", 0, 0);
  const cloudDraft = drafts.drafts[0];

  assert.ok(
    !cloudDraft.body.includes("ops@opspilot.events"),
    "Must not include fabricated ops@opspilot.events email address"
  );
  assert.ok(
    !cloudDraft.body.includes("250+"),
    "Must not fabricate '250+' participants when none were specified"
  );
  assert.ok(
    cloudDraft.body.includes("[Participant Count Not Specified]") ||
    cloudDraft.body.includes("[Budget Not Specified]") ||
    cloudDraft.body.includes("[Your Contact Email]"),
    "Must use explicit placeholders when project data is not available"
  );
});
