import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateProjectMarkdownReport,
  generateProjectJsonPackage,
} from "../app/lib/export-engine.ts";
import { DEFAULT_PROJECTS } from "../app/lib/project-store.ts";
import { toolRegistry } from "../app/lib/execution-engine.ts";
import "../app/lib/tools/index.ts";

test("Export Engine - compiles full markdown report with all required sections", () => {
  const sampleProject = DEFAULT_PROJECTS[0];
  const markdown = generateProjectMarkdownReport(sampleProject);

  assert.ok(markdown.includes("# OpsPilot Project Operations Report: National AI Hackathon 2026"));
  assert.ok(markdown.includes("## 1. Executive Summary & Event Brief"));
  assert.ok(markdown.includes("## 2. Structured Operational Plan"));
  assert.ok(markdown.includes("## 3. Mathematical Budget Verification"));
  assert.ok(markdown.includes("## 5. Operations Audit Ledger"));
  assert.ok(markdown.includes("## 9. Operational Provenance & Safety Policy"));

  // Check currency formatting
  assert.ok(markdown.includes("₹1,20,000"));

  // Check task rows
  assert.ok(markdown.includes("Finalize hackathon event brief"));
  assert.ok(markdown.includes("Validate ₹1,20,000 prize budget"));
});

test("Export Engine - compiles full machine-readable JSON package with valid stats", () => {
  const sampleProject = DEFAULT_PROJECTS[0];
  const jsonPkg = generateProjectJsonPackage(sampleProject);

  assert.equal(jsonPkg.version, "1.0.0");
  assert.equal(jsonPkg.project.id, sampleProject.id);
  assert.equal(jsonPkg.stats.totalTasks, sampleProject.tasks.length);
  assert.equal(jsonPkg.stats.evidenceRecordsCount, sampleProject.evidence.length);
  assert.ok(jsonPkg.exportedAt);
});

test("Tool Registry - executes export_project_report tool successfully", async () => {
  assert.ok(toolRegistry.hasTool("export_project_report"));

  const sampleProject = DEFAULT_PROJECTS[0];
  const res = await toolRegistry.execute(
    "export_project_report",
    { project: sampleProject, format: "markdown" },
    "task-test-export-1"
  );

  assert.equal(res.success, true);
  const data = res.result as {
    projectName: string;
    format: string;
    summary: string;
    contentLength: number;
    content: string;
  };

  assert.equal(data.projectName, sampleProject.name);
  assert.equal(data.format, "markdown");
  assert.ok(data.contentLength > 500, "Report should have substantial content");

  // Actual content must be returned, not just its length
  assert.ok(typeof data.content === "string" && data.content.length > 0,
    "Export tool must return actual report content, not just contentLength");
  assert.ok(data.content.includes("# OpsPilot Project Operations Report"),
    "Returned content must be the actual markdown report");

  // Disclaimer must be accurate (local artifact, not externally verified)
  assert.ok(res.disclaimer?.includes("local artifact"),
    "Export disclaimer must describe the result as a local artifact");
  assert.ok(!res.disclaimer?.toLowerCase().includes("cryptographic"),
    "Export disclaimer must not claim cryptographic properties");

  // executionSource must be local
  assert.equal(res.executionSource, "local_artifact",
    "Export tool must label itself as local_artifact, not external_response");
});

test("Export Engine - provenance section does not claim tamper-evidence", () => {
  const sampleProject = DEFAULT_PROJECTS[0];
  const markdown = generateProjectMarkdownReport(sampleProject);

  // Must NOT include old tamper-evident false claim
  assert.ok(!markdown.toLowerCase().includes("tamper-evident"),
    "Report must not claim tamper-evident properties for localStorage-backed evidence");

  // Should explain what the ledger actually is
  assert.ok(
    markdown.includes("local browser workspace") || markdown.includes("append-only"),
    "Report should accurately describe the evidence ledger's actual storage"
  );
});

