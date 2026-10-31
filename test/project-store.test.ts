import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PROJECTS,
  createNewProject,
  type Project,
} from "../app/lib/project-store.ts";

test("Project Store - default projects have valid schema", () => {
  assert.ok(DEFAULT_PROJECTS.length >= 2);
  const hackathon = DEFAULT_PROJECTS[0];

  assert.equal(hackathon.id, "proj-hackathon-2026");
  assert.equal(hackathon.name, "National AI Hackathon 2026");
  assert.equal(hackathon.targetBudget, 120000);
  assert.ok(hackathon.tasks.length > 0);
  assert.ok(hackathon.evidence.length > 0);

  // Each task has valid state
  for (const t of hackathon.tasks) {
    assert.ok(["pending", "approved", "running", "success", "failed"].includes(t.state));
  }
});

test("Project Store - createNewProject creates clean isolated project", () => {
  const project = createNewProject(
    "Robotics Expo 2026",
    "Showcase of autonomous robotics",
    "Plan a robotics showcase with ₹80,000 budget",
    80000
  );

  assert.ok(project.id.startsWith("proj-"));
  assert.equal(project.name, "Robotics Expo 2026");
  assert.equal(project.description, "Showcase of autonomous robotics");
  assert.equal(project.targetBudget, 80000);
  assert.deepEqual(project.tasks, []);
  assert.deepEqual(project.evidence, []);
  assert.ok(Date.parse(project.createdAt) > 0);
});

test("Project Store - preserves project-specific briefs and evidence isolation", () => {
  const p1 = createNewProject("Project Alpha", "First project", "Alpha brief", 50000);
  const p2 = createNewProject("Project Beta", "Second project", "Beta brief", 100000);

  p1.tasks.push({
    id: "task-alpha-1",
    title: "Alpha Task",
    category: "Operations",
    priority: "high",
    state: "approved",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert.equal(p1.tasks.length, 1);
  assert.equal(p2.tasks.length, 0);
  assert.notEqual(p1.id, p2.id);
  assert.notEqual(p1.brief, p2.brief);
});

test("Project Store - marks default projects as demo data and new projects as non-demo", () => {
  assert.ok(DEFAULT_PROJECTS.every((p) => p.isDemoData === true), "All default projects must be marked as demo data");
  assert.ok(DEFAULT_PROJECTS.every((p) => p.isBudgetConfirmed === true), "Default projects have confirmed budgets");

  const newProjWithBudget = createNewProject("Real Hackathon", "Real event", "Real brief", 50000);
  assert.equal(newProjWithBudget.isDemoData, false, "New project must not be marked as demo data");
  assert.equal(newProjWithBudget.isBudgetConfirmed, true, "New project with targetBudget > 0 is confirmed");

  const newProjNoBudget = createNewProject("Draft Event", "Draft desc", "Draft brief", 0);
  assert.equal(newProjNoBudget.isDemoData, false);
  assert.equal(newProjNoBudget.isBudgetConfirmed, false, "New project with 0/unspecified budget is unconfirmed");
});

test("Project Store - localStorage persistence and roundtrip", async () => {
  const { loadProjectsFromStorage, saveProjectsToStorage } = await import("../app/lib/project-store.ts");

  // Mock localStorage
  const storageMap = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => storageMap.set(key, String(val)),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  try {
    // @ts-expect-error Mocking window for testing
    globalThis.window = {} as Window;
    globalThis.localStorage = mockLocalStorage as unknown as Storage;

    // 1. Initial load when storage is empty returns default projects
    const initial = loadProjectsFromStorage();
    assert.equal(initial.projects.length, DEFAULT_PROJECTS.length);
    assert.equal(initial.activeId, DEFAULT_PROJECTS[0].id);

    // 2. Save custom projects and activeId
    const customProject = createNewProject("Saved AI Summit", "Production summit", "Summit brief", 95000, true);
    const updatedProjects = [customProject, ...initial.projects];
    saveProjectsToStorage(updatedProjects, customProject.id);

    // Verify stored JSON string
    assert.ok(storageMap.has("opspilot-projects-v2"));
    assert.equal(storageMap.get("opspilot-active-project-id"), customProject.id);

    // 3. Reload from storage
    const reloaded = loadProjectsFromStorage();
    assert.equal(reloaded.projects.length, updatedProjects.length);
    assert.equal(reloaded.activeId, customProject.id);
    assert.equal(reloaded.projects[0].name, "Saved AI Summit");
    assert.equal(reloaded.projects[0].targetBudget, 95000);
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("Project Store - migration from legacy single-project localStorage", async () => {
  const { loadProjectsFromStorage } = await import("../app/lib/project-store.ts");

  const storageMap = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => storageMap.set(key, String(val)),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  try {
    // @ts-expect-error Mocking window
    globalThis.window = {} as Window;
    globalThis.localStorage = mockLocalStorage as unknown as Storage;

    // Set legacy v1 data (no opspilot-projects-v2)
    const legacyTasks = [
      {
        id: "task-legacy-1",
        title: "Legacy task",
        category: "Ops",
        priority: "high",
        state: "success",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const legacyEvidence = [
      {
        id: "ev-legacy-1",
        action: "Legacy evidence",
        status: "success",
        details: "Recovered from v1",
        timestamp: "2026-01-01T00:00:00.000Z",
      },
    ];

    mockLocalStorage.setItem("opspilot-tasks", JSON.stringify(legacyTasks));
    mockLocalStorage.setItem("opspilot-evidence", JSON.stringify(legacyEvidence));

    // Load should migrate legacy data into primary project
    const loaded = loadProjectsFromStorage();
    assert.ok(loaded.projects.length >= 1);
    assert.equal(loaded.projects[0].tasks[0].id, "task-legacy-1");
    assert.equal(loaded.projects[0].evidence[0].id, "ev-legacy-1");

    // Must have persisted to modern opspilot-projects-v2 key
    assert.ok(storageMap.has("opspilot-projects-v2"));
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});
