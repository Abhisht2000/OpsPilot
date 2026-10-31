import { type ExecutableTask } from "./execution-engine.ts";
import { type BudgetValidationResult } from "./budget-validator.ts";
import { type SponsorResearchResult } from "./sponsor-engine.ts";
import { type OutreachReviewResult } from "./outreach-engine.ts";

/** Structured event profile filled by the organizer before plan generation. */
export type EventProfile = {
  eventType: "Hackathon" | "Symposium" | "Workshop" | "Conference" | "Other" | "";
  eventDate: string;          // free text, e.g. "March 28-29, 2026"
  duration: string;           // e.g. "2 days"
  venue: string;              // free text
  format: "Physical" | "Virtual" | "Hybrid" | "";
  brandColor: string;         // hex, e.g. "#7c3aed"
  visualStyle: "Futuristic" | "Minimal" | "Bold" | "Academic" | "Playful" | "";
  organizerName: string;
  organizerEmail: string;
  tagline: string;            // empty = AI-suggested
  targetAudience: string;
};

export type EvidenceEventType =
  | "approval_granted"
  | "approval_revoked"
  | "tool_execution"
  | "manual_action"
  | "budget_confirmation";

export type VerificationLevel = "local" | "external_response" | "independently_verified";

export type EvidenceRecord = {
  id: string;
  taskId?: string;
  action: string;
  eventType?: EvidenceEventType;
  toolName?: string;
  status: "recorded" | "success" | "failed";
  verificationLevel?: VerificationLevel;
  details: string;
  timestamp: string;
  externalResourceId?: string;
  result?: unknown;
  error?: string;
  isExternalVerified?: boolean;
};

export type SavedCreative = {
  id: string;
  title: string;
  type?: "ai_generated_image" | "vector_poster";
  imageUrl?: string;
  reasoning?: string;
  promptUsed?: string;
  theme: "neon" | "minimal" | "bold" | "emerald";
  dimension: "1:1" | "16:9" | "9:16";
  content: {
    kicker: string;
    headline: string;
    subheadline: string;
    eventDate: string;
    venue: string;
    badge: string;
    footer: string;
  };
  svgSnippet?: string;
  svgContent?: string;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  brief: string;
  targetBudget: number;
  isBudgetConfirmed?: boolean;
  aiProposedBudget?: number;
  plan?: string;
  structuredPlan?: {
    eventName: string;
    summary: string;
    participants: number;
    totalBudget: number;
    tasks: { title: string; category: string; priority: "high" | "medium" | "low" }[];
    budget: { category: string; amount: number; details: string }[];
    schedule: { time: string; activity: string; details?: string }[];
    risks: { risk: string; mitigation: string }[];
    assumptions: string[];
    budgetUnspecified?: boolean;
  };
  budgetValidation?: BudgetValidationResult;
  tasks: ExecutableTask[];
  evidence: EvidenceRecord[];
  creatives?: SavedCreative[];
  sponsorResearch?: SponsorResearchResult;
  outreachReview?: OutreachReviewResult;
  reviewedDraftIds?: Record<string, boolean>;
  eventProfile?: EventProfile;
  savedOutreachEmails?: Array<{
    id: string;
    sponsorCompany: string;
    programName?: string;
    recipientName?: string;
    outreachType?: string;
    subject: string;
    body: string;
    reasoning?: string;
    prAngleSummary?: string;
    crValueExchange?: string;
    reviewed: boolean;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  /**
   * True when this project was pre-seeded as a demonstration example.
   * Demo projects are clearly labeled in the UI and do not represent real organizer data.
   */
  isDemoData?: boolean;
};

export const SEED_TIMESTAMP = "2026-03-28T09:00:00.000Z";

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: "proj-hackathon-2026",
    name: "National AI Hackathon 2026",
    description: "48-hour student hackathon for 250 AI builders with keynote speakers and demo day.",
    brief: "Plan a 2-day national level AI Hackathon for 250 students with ₹1,20,000 budget, research sponsors, and creative assets.",
    targetBudget: 120000,
    isBudgetConfirmed: true,
    isDemoData: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    tasks: [
      {
        id: "task-1",
        title: "Finalize hackathon event brief",
        category: "Event operations",
        priority: "high",
        state: "success",
        toolName: "finalize_brief",
        toolResult: { summary: "Brief verified and locked for hackathon operations." },
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
      {
        id: "task-2",
        title: "Prepare sponsor research shortlist",
        category: "Research agent",
        priority: "high",
        state: "approved",
        toolName: "sponsor_research",
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
      {
        id: "task-3",
        title: "Validate ₹1,20,000 prize budget",
        category: "Budget manager",
        priority: "medium",
        state: "approved",
        toolName: "validate_budget",
        toolInput: {
          requestedBudget: 120000,
          budget: [
            { category: "1st Prize", amount: 60000, details: "Grand Winner team" },
            { category: "2nd Prize", amount: 40000, details: "Runner up team" },
            { category: "Special Tracks", amount: 20000, details: "Best AI Innovation" },
          ],
        },
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
      {
        id: "task-4",
        title: "Generate registration announcement creatives",
        category: "Creative Studio",
        priority: "medium",
        state: "pending",
        toolName: "generate_creatives",
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
      {
        id: "task-5",
        title: "Review outreach email drafts",
        category: "Outreach assistant",
        priority: "low",
        state: "pending",
        toolName: "review_outreach",
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
    ],
    evidence: [
      {
        id: "ev-init-1",
        taskId: "task-1",
        action: "Tool executed: finalize_brief",
        eventType: "tool_execution",
        toolName: "finalize_brief",
        status: "success",
        verificationLevel: "local",
        details: "Brief verified and locked for hackathon operations.",
        timestamp: SEED_TIMESTAMP,
        isExternalVerified: false,
      },
      {
        id: "ev-init-2",
        taskId: "task-2",
        action: "Task approval granted",
        eventType: "approval_granted",
        toolName: "sponsor_research",
        status: "recorded",
        verificationLevel: "local",
        details: "Organizer granted execution approval for: Prepare sponsor research shortlist.",
        timestamp: SEED_TIMESTAMP,
        isExternalVerified: false,
      },
      {
        id: "ev-init-3",
        taskId: "task-3",
        action: "Task approval granted",
        eventType: "approval_granted",
        toolName: "validate_budget",
        status: "recorded",
        verificationLevel: "local",
        details: "Organizer granted execution approval for: Validate ₹1,20,000 prize budget.",
        timestamp: SEED_TIMESTAMP,
        isExternalVerified: false,
      },
    ],
    creatives: [
      {
        id: "cr-hackathon-1",
        title: "National AI Hackathon - 1:1 Social Poster",
        theme: "neon",
        dimension: "1:1",
        content: {
          kicker: "AI / INNOVATION",
          headline: "BUILD THE FUTURE",
          subheadline: "48-hour student hackathon for 250 AI builders with keynote speakers and live demo day.",
          eventDate: "March 28–29, 2026",
          venue: "Main Campus Auditorium & Virtual",
          badge: "₹1,20,000 Prizes · 250 Builders",
          footer: "REGISTER NOW · OPSPILOT.IO/JOIN",
        },
        createdAt: SEED_TIMESTAMP,
      },
    ],
  },
  {
    id: "proj-tech-symposium",
    name: "Autonomous Agents Symposium",
    description: "One-day conference on LLMs, agentic architectures, and enterprise deployments.",
    brief: "Organize a full-day research symposium on Autonomous Agents with ₹50,000 budget for 100 researchers.",
    targetBudget: 50000,
    isBudgetConfirmed: true,
    isDemoData: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    tasks: [
      {
        id: "symp-task-1",
        title: "Validate ₹50,000 conference venue & catering budget",
        category: "Budget manager",
        priority: "high",
        state: "approved",
        toolName: "validate_budget",
        toolInput: {
          requestedBudget: 50000,
          budget: [
            { category: "Catering", amount: 25000, details: "Lunch and tea breaks" },
            { category: "AV Equipment", amount: 15000, details: "Microphones & projectors" },
            { category: "Badges & kits", amount: 10000, details: "Attendee kits" },
          ],
        },
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
      {
        id: "symp-task-2",
        title: "Draft speaker invitations",
        category: "Outreach assistant",
        priority: "medium",
        state: "pending",
        toolName: "review_outreach",
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
    ],
    evidence: [],
  },
];

const STORAGE_KEY = "opspilot-projects-v2";
const ACTIVE_KEY = "opspilot-active-project-id";

/**
 * Loads all projects from persistence, with safe migration for legacy localStorage structures.
 */
export function loadProjectsFromStorage(): { projects: Project[]; activeId: string } {
  if (typeof window === "undefined") {
    return { projects: DEFAULT_PROJECTS, activeId: DEFAULT_PROJECTS[0].id };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let projects: Project[] = [];

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        projects = parsed;
      }
    }

    // Fallback and safe migration from v1 single-project data
    if (projects.length === 0) {
      projects = [...DEFAULT_PROJECTS];

      // Check legacy keys
      const legacyTasks = localStorage.getItem("opspilot-tasks");
      const legacyEvidence = localStorage.getItem("opspilot-evidence");

      if (legacyTasks) {
        try {
          const parsedTasks = JSON.parse(legacyTasks);
          if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
            // Merge legacy tasks into default project if newer
            projects[0].tasks = parsedTasks;
          }
        } catch {
          // Ignore legacy format errors
        }
      }

      if (legacyEvidence) {
        try {
          const parsedEv = JSON.parse(legacyEvidence);
          if (Array.isArray(parsedEv) && parsedEv.length > 0) {
            projects[0].evidence = parsedEv;
          }
        } catch {
          // Ignore legacy format errors
        }
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }

    const savedActiveId = localStorage.getItem(ACTIVE_KEY);
    const activeId = projects.some((p) => p.id === savedActiveId)
      ? (savedActiveId as string)
      : projects[0].id;

    return { projects, activeId };
  } catch (err) {
    console.error("Could not load projects from storage:", err);
    return { projects: DEFAULT_PROJECTS, activeId: DEFAULT_PROJECTS[0].id };
  }
}

/**
 * Saves projects array to localStorage.
 */
export function saveProjectsToStorage(projects: Project[], activeId?: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    if (activeId) {
      localStorage.setItem(ACTIVE_KEY, activeId);
    }
  } catch (err) {
    console.error("Could not persist projects:", err);
  }
}

/**
 * Creates a new project in the store.
 */
export function createNewProject(
  name: string,
  description: string,
  brief = "",
  targetBudget = 0,
  isBudgetConfirmed = false
): Project {
  const newProject: Project = {
    id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim() || "Untitled Project",
    description: description.trim() || "New AI operations event workspace",
    brief: brief.trim(),
    targetBudget: Number.isFinite(targetBudget) && targetBudget >= 0 ? targetBudget : 0,
    // Budget is only confirmed if the user explicitly provided a non-zero value.
    // Never default to true for a missing/zero budget — require explicit organizer confirmation.
    isBudgetConfirmed: isBudgetConfirmed || (Number.isFinite(targetBudget) && targetBudget > 0),
    isDemoData: false,
    tasks: [],
    evidence: [],
    creatives: [],
    eventProfile: {
      eventType: "",
      eventDate: "",
      duration: "",
      venue: "",
      format: "",
      brandColor: "#7c3aed",
      visualStyle: "",
      organizerName: "",
      organizerEmail: "",
      tagline: "",
      targetAudience: "",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return newProject;
}
