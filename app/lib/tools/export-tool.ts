import { toolRegistry } from "../execution-engine.ts";
import { generateProjectMarkdownReport, generateProjectJsonPackage } from "../export-engine.ts";
import { type Project } from "../project-store.ts";

toolRegistry.registerTool("export_project_report", async (input) => {
    const rawInput = (input || {}) as {
      project?: Project;
      projectName?: string;
      format?: "markdown" | "json";
    };

    const targetProject: Project = rawInput.project || {
      id: "proj-export-active",
      name: rawInput.projectName || "OpsPilot Event Operations",
      description: "Auto-generated report package.",
      brief: "Operational plan and evidence records.",
      targetBudget: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: [],
      evidence: [],
    };

    const format = rawInput.format || "markdown";
    const reportContent =
      format === "json"
        ? JSON.stringify(generateProjectJsonPackage(targetProject), null, 2)
        : generateProjectMarkdownReport(targetProject);

    return {
      success: true,
      result: {
        projectName: targetProject.name,
        format,
        exportedAt: new Date().toISOString(),
        summary: `Local project report compiled for "${targetProject.name}" in ${format.toUpperCase()} format.`,
        // Return the actual content so callers can save or display it
        content: reportContent,
        contentLength: reportContent.length,
        taskCount: targetProject.tasks.length,
        evidenceCount: targetProject.evidence.length,
      },
      // Accurate: local generation, no external resource, no external verification
      executionSource: "local_artifact" as const,
      disclaimer:
        "Report compiled deterministically from local project workspace. This is a local artifact — not externally verified or signed.",
    };
  }
);
