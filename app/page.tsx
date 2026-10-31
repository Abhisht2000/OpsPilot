
"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  Activity, ArrowUpRight, Bot, CalendarDays, ChevronRight,
  Clock3, FileCheck2, FolderKanban, ImagePlus, LayoutDashboard,
  ListChecks, Palette, Search, Settings2, ShieldCheck, Sparkles,
  Target, WandSparkles, Wallet, Zap, Play, CheckCircle2, AlertCircle,
  Loader2, RotateCcw, ThumbsUp, Trash2, Plus, Database,
  Download, Copy, Code2, RefreshCw, FileDown, Layers, Check,
  ExternalLink, Mail, CheckSquare, Square, FileText, X,
  Building2, Maximize2, Briefcase, Send
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  validateBudget,
  extractRequestedBudget,
  type BudgetValidationResult,
} from "./lib/budget-validator";
import {
  type ExecutableTask,
  transitionTask,
  isValidTransition,
  toolRegistry,
} from "./lib/execution-engine";
import "./lib/tools";
import {
  researchSponsors,
  searchSponsorsAndCompanies,
  SPONSOR_PROGRAM_DIRECTORY,
  type SponsorResearchResult,
  type SponsorTarget,
} from "./lib/sponsor-engine";
import {
  type OutreachReviewResult,
} from "./lib/outreach-engine";
import {
  generateProjectMarkdownReport,
  generateProjectJsonPackage,
  downloadReportFile,
} from "./lib/export-engine";
import {
  DIMENSIONS,
  THEMES,
  generateDefaultCopy,
  generatePosterSvg,
  drawPosterToCanvas,
  downloadCanvasAsPng,
  downloadSvg,
  type PosterContent,
  type PosterDimension,
  type PosterTheme,
} from "./lib/creative-engine";
import {
  DEFAULT_PROJECTS,
  loadProjectsFromStorage,
  saveProjectsToStorage,
  createNewProject,
  type Project,
  type EvidenceRecord,
  type SavedCreative,
  type EventProfile,
} from "./lib/project-store";

/** Safe UUID generator — works over both HTTPS and plain HTTP (crypto.randomUUID requires a secure context). */
function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: RFC-4122 v4 UUID via Math.random
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}


type GeneratedPlan = {
  eventName: string;
  summary: string;
  participants: number;
  totalBudget: number;
  tasks: {
    title: string;
    category: string;
    priority: "high" | "medium" | "low";
  }[];
  budget: {
    category: string;
    amount: number;
    details: string;
  }[];
  schedule: {
    time: string;
    activity: string;
    details: string;
  }[];
  risks: {
    risk: string;
    mitigation: string;
  }[];
  assumptions: string[];
};

type BudgetValidation = BudgetValidationResult;

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "AI Agent", icon: Bot },
  { label: "Event Operations", icon: CalendarDays },
  { label: "Research & Outreach", icon: Search },
  { label: "Creative Studio", icon: Palette },
  { label: "Evidence Ledger", icon: ShieldCheck },
  { label: "Settings & Docs", icon: Settings2 },
];

export default function Home() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>(DEFAULT_PROJECTS[0].id);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectBudget, setNewProjectBudget] = useState("");

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || DEFAULT_PROJECTS[0];
  }, [projects, activeProjectId]);

  const [tasks, setTasks] = useState<ExecutableTask[]>(activeProject.tasks);
  const [brief, setBrief] = useState(activeProject.brief);
  const [plan, setPlan] = useState(activeProject.plan || "");
  const [structuredPlan, setStructuredPlan] = useState<GeneratedPlan | null>(
    (activeProject.structuredPlan as GeneratedPlan) || null
  );
  const [budgetValidation, setBudgetValidation] = useState<BudgetValidation | null>(
    activeProject.budgetValidation || null
  );
  const [evidence, setEvidence] = useState<EvidenceRecord[]>(activeProject.evidence);

  const [isGenerating, setIsGenerating] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState<"all" | "success" | "failed" | "pending">("all");
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [notice, setNotice] = useState("OpsPilot workspace ready. Multi-project management active.");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [creatives, setCreatives] = useState<SavedCreative[]>(activeProject.creatives || []);
  const [studioTheme, setStudioTheme] = useState<PosterTheme>("neon");
  const [studioDimension, setStudioDimension] = useState<PosterDimension>("1:1");
  const [posterContent, setPosterContent] = useState<PosterContent>(() =>
    generateDefaultCopy(
      activeProject.name,
      activeProject.brief,
      activeProject.targetBudget,
      activeProject.structuredPlan?.participants || 0
    )
  );
  const [studioViewMode, setStudioViewMode] = useState<"visual" | "svgCode" | "gallery">("visual");
  const [mounted, setMounted] = useState(false);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Milestone 6: Sponsor Research & Outreach Review State
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [reviewedDraftIds, setReviewedDraftIds] = useState<Record<string, boolean>>(
    activeProject.reviewedDraftIds || {}
  );
  const [copiedPitchAngle, setCopiedPitchAngle] = useState<string | null>(null);

  // Milestone 7: Project & Evidence Export Package State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<"markdown" | "json">("markdown");
  const [copiedExportNotice, setCopiedExportNotice] = useState<boolean>(false);

  // Budget confirmation states (P0: never silently replace missing budget)
  // Default to false — require explicit organizer confirmation even for pre-seeded projects
  const [isBudgetConfirmed, setIsBudgetConfirmed] = useState<boolean>(activeProject.isBudgetConfirmed ?? false);
  const [aiProposedBudget, setAiProposedBudget] = useState<number | undefined>(activeProject.aiProposedBudget);

  // Event Profile
  const blankProfile: EventProfile = {
    eventType: "", eventDate: "", duration: "", venue: "", format: "",
    brandColor: "#7c3aed", visualStyle: "", organizerName: "",
    organizerEmail: "", tagline: "", targetAudience: "",
  };
  const [eventProfile, setEventProfile] = useState<EventProfile>(
    activeProject.eventProfile ?? blankProfile
  );
  const [isSuggestingTagline, setIsSuggestingTagline] = useState(false);
  const [isSuggestingTheme, setIsSuggestingTheme] = useState(false);

  // Creative Studio: Engine Mode & Meta AI muse-image-1.0 Generation
  const [creativeEngineMode, setCreativeEngineMode] = useState<"meta_ai_image" | "vector_poster">("meta_ai_image");
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [aiImageStyle, setAiImageStyle] = useState("Cyberpunk Neon 3D");
  const [aiImageColorMood, setAiImageColorMood] = useState("Obsidian dark with electric violet & cyan glows");
  const [aiImageExtraDetails, setAiImageExtraDetails] = useState("Prominent typography composition, glowing holographic nodes, 8k crisp artwork");
  const [aiImageRefinePrompt, setAiImageRefinePrompt] = useState("");
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [generatedAiImage, setGeneratedAiImage] = useState<null | {
    imageUrl: string;
    reasoning?: string;
    promptUsed: string;
  }>(null);
  const [aiImageError, setAiImageError] = useState("");
  const [aiImageZoomOpen, setAiImageZoomOpen] = useState(false);

  // Creative Studio vector poster AI generation (Muse Spark)
  const [creativePrompt, setCreativePrompt] = useState("");
  const [creativeRefinePrompt, setCreativeRefinePrompt] = useState("");
  const [isGeneratingCreative, setIsGeneratingCreative] = useState(false);
  const [aiCreativeLayout, setAiCreativeLayout] = useState<null | {
    kicker: string; headline: string; subheadline: string; tagline: string;
    badge: string; eventDate: string; venue: string; footer: string;
    colorPrimary: string; colorAccent: string; colorBg: string; colorText: string;
    layoutStyle: string; suggestedTheme: string; reasoning: string;
  }>(null);
  const [creativeGenError, setCreativeGenError] = useState("");

  // Research & Outreach: PR & Corporate Relations (CR) Agent
  const BLANK_MAIL_FORM = {
    organizerRole: "Corporate Relations Lead",
    organizationName: "",
    sponsorCompanyName: "",
    sponsorProgramName: "",
    recipientName: "",
    recipientRole: "Developer Relations / Partnerships",
    sponsorAsk: "",
    outreachType: "corporate_relations" as "corporate_relations" | "devrel_api" | "pr_media" | "inkind_swag",
    crStrategicFit: "",
    prPressHook: "",
    tone: "formal" as "formal" | "friendly" | "concise",
    extraContext: "",
  };
  const [mailForm, setMailForm] = useState(BLANK_MAIL_FORM);
  const [isGeneratingMail, setIsGeneratingMail] = useState(false);
  const [generatedMail, setGeneratedMail] = useState<null | {
    subject: string;
    body: string;
    reasoning: string;
    prAngleSummary?: string;
    crValueExchange?: string;
  }>(null);
  const [mailGenError, setMailGenError] = useState("");
  const [copiedGeneratedMail, setCopiedGeneratedMail] = useState(false);
  const [savedMailDrafts, setSavedMailDrafts] = useState<
    NonNullable<Project["savedOutreachEmails"]>
  >([]);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [selectedCrCategory, setSelectedCrCategory] = useState("all");

  // Load projects from persistent store on initial mount
  useEffect(() => {
    setMounted(true);
    const { projects: loaded, activeId } = loadProjectsFromStorage();
    setProjects(loaded);
    setActiveProjectId(activeId);

    const initial = loaded.find((p) => p.id === activeId) || loaded[0];
    if (initial) {
      setTasks(initial.tasks);
      setBrief(initial.brief);
      setPlan(initial.plan || "");
      setStructuredPlan((initial.structuredPlan as GeneratedPlan) || null);
      setBudgetValidation(initial.budgetValidation || null);
      setEvidence(initial.evidence);
      setCreatives(initial.creatives || []);
      setReviewedDraftIds(initial.reviewedDraftIds || {});
      setIsBudgetConfirmed(initial.isBudgetConfirmed ?? false);
      setAiProposedBudget(initial.aiProposedBudget);
      setEventProfile(initial.eventProfile ?? blankProfile);
      setSavedMailDrafts(initial.savedOutreachEmails ?? []);
      setPosterContent(
        generateDefaultCopy(
          initial.name,
          initial.brief,
          initial.targetBudget,
          initial.structuredPlan?.participants || 0
        )
      );
    }
  }, []);

  // Sync active project state whenever activeProjectId changes
  function switchProject(id: string) {
    setActiveProjectId(id);
    const target = projects.find((p) => p.id === id);
    if (target) {
      setTasks(target.tasks);
      setBrief(target.brief);
      setPlan(target.plan || "");
      setStructuredPlan((target.structuredPlan as GeneratedPlan) || null);
      setBudgetValidation(target.budgetValidation || null);
      setEvidence(target.evidence);
      setCreatives(target.creatives || []);
      setReviewedDraftIds(target.reviewedDraftIds || {});
      setIsBudgetConfirmed(target.isBudgetConfirmed ?? false);
      setAiProposedBudget(target.aiProposedBudget);
      setEventProfile(target.eventProfile ?? blankProfile);
      setSavedMailDrafts(target.savedOutreachEmails ?? []);
      setAiCreativeLayout(null);
      setGeneratedMail(null);
      setPosterContent(
        generateDefaultCopy(
          target.name,
          target.brief,
          target.targetBudget,
          target.structuredPlan?.participants || 0
        )
      );
      setNotice(`Switched active workspace to "${target.name}".`);
      saveProjectsToStorage(projects, id);
    }
  }

  // Update projects persistence whenever active project data changes
  function updateActiveProjectData(partial: Partial<Project>) {
    setProjects((prev) => {
      const updated = prev.map((p) => (p.id === activeProjectId ? { ...p, ...partial, updatedAt: new Date().toISOString() } : p));
      saveProjectsToStorage(updated, activeProjectId);
      return updated;
    });
  }

  function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setNotice("Project name is required.");
      return;
    }

    const budgetNum = Number(newProjectBudget.replace(/,/g, "")) || 0;
    const created = createNewProject(newProjectName, newProjectDesc, "", budgetNum);
    const updatedList = [created, ...projects];

    setProjects(updatedList);
    setActiveProjectId(created.id);
    setTasks(created.tasks);
    setBrief(created.brief);
    setPlan("");
    setStructuredPlan(null);
    setBudgetValidation(null);
    setEvidence(created.evidence);
    setCreatives([]);
    setPosterContent(generateDefaultCopy(created.name, "", budgetNum));

    saveProjectsToStorage(updatedList, created.id);

    setNewProjectName("");
    setNewProjectDesc("");
    setNewProjectBudget("");
    setIsCreatingProject(false);
    setNotice(`Created new project workspace "${created.name}".`);
  }

  const completed = useMemo(() => tasks.filter((task) => task.state === "success").length, [tasks]);
  const approved = useMemo(() => tasks.filter((task) => task.state === "approved").length, [tasks]);
  const pending = useMemo(() => tasks.filter((task) => task.state === "pending").length, [tasks]);

  function confirmTargetBudget(amount: number) {
    if (amount <= 0) {
      setNotice("Budget amount must be greater than zero.");
      return;
    }
    setIsBudgetConfirmed(true);
    setAiProposedBudget(undefined);

    let validation: BudgetValidation | null = null;
    if (structuredPlan?.budget && Array.isArray(structuredPlan.budget)) {
      validation = validateBudget(structuredPlan.budget, amount);
      setBudgetValidation(validation);
    }

    const newRecord: EvidenceRecord = {
      id: genId(),
      action: "Target budget confirmed by organizer",
      toolName: undefined,
      eventType: "budget_confirmation",
      status: "recorded",
      verificationLevel: "local",
      details: `Organizer confirmed target budget of ₹${formatInr(amount)} (previous AI proposal: ₹${formatInr(aiProposedBudget || activeProject.targetBudget)}).`,
      timestamp: new Date().toISOString(),
      isExternalVerified: false,
    };

    const nextEvidence = [newRecord, ...evidence];
    setEvidence(nextEvidence);

    updateActiveProjectData({
      targetBudget: amount,
      isBudgetConfirmed: true,
      aiProposedBudget: undefined,
      budgetValidation: validation || undefined,
      evidence: nextEvidence,
    });

    setNotice(`Target budget confirmed at ₹${formatInr(amount)}. Budget validation updated.`);
  }

  function approveTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    try {
      const updated = transitionTask(task, "approved");
      const nextTasks = tasks.map((t) => (t.id === id ? updated : t));
      setTasks(nextTasks);

      const newRecord: EvidenceRecord = {
        id: genId(),
        taskId: id,
        action: "Task approval granted",
        toolName: task.toolName,
        eventType: "approval_granted",
        status: "recorded",
        verificationLevel: "local",
        details: `Organizer granted execution approval for: "${task.title}". Task is now unlocked to run.`,
        timestamp: new Date().toISOString(),
        isExternalVerified: false,
      };

      const nextEvidence = [newRecord, ...evidence];
      setEvidence(nextEvidence);
      updateActiveProjectData({ tasks: nextTasks, evidence: nextEvidence });

      setNotice(`Task approved. Click "Run" to execute ${task.toolName ? `[${task.toolName}]` : "task"}.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to approve task.");
    }
  }

  function revokeApproval(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    try {
      const updated = transitionTask(task, "pending");
      const nextTasks = tasks.map((t) => (t.id === id ? updated : t));
      setTasks(nextTasks);

      const newRecord: EvidenceRecord = {
        id: genId(),
        taskId: id,
        action: "Task approval revoked",
        toolName: task.toolName,
        eventType: "approval_revoked",
        status: "recorded",
        verificationLevel: "local",
        details: `Approval revoked for: "${task.title}". Returned to pending state.`,
        timestamp: new Date().toISOString(),
        isExternalVerified: false,
      };

      const nextEvidence = [newRecord, ...evidence];
      setEvidence(nextEvidence);
      updateActiveProjectData({ tasks: nextTasks, evidence: nextEvidence });

      setNotice(`Approval revoked for "${task.title}".`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to revoke approval.");
    }
  }

  function resetTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    try {
      const wasCompleted = task.state === "success";
      const updated = transitionTask(task, "pending");
      const nextTasks = tasks.map((t) => (t.id === id ? updated : t));
      setTasks(nextTasks);

      if (wasCompleted) {
        const resetRecord: EvidenceRecord = {
          id: genId(),
          taskId: id,
          action: "Completed task reset to pending",
          toolName: task.toolName,
          eventType: "approval_revoked",
          status: "recorded",
          verificationLevel: "local",
          details: `Organizer reset previously completed task "${task.title}" back to pending state for re-evaluation.`,
          timestamp: new Date().toISOString(),
          isExternalVerified: false,
        };
        const nextEvidence = [resetRecord, ...evidence];
        setEvidence(nextEvidence);
        updateActiveProjectData({ tasks: nextTasks, evidence: nextEvidence });
      } else {
        updateActiveProjectData({ tasks: nextTasks });
      }

      setNotice(`Task "${task.title}" reset to pending state.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to reset task.");
    }
  }

  function markManualTaskCompleted(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    try {
      const successTask =
        task.state === "manual_only"
          ? transitionTask(task, "success", {
              toolResult: {
                manualCompletion: true,
                completionSource: "organizer_reported",
                completedAt: new Date().toISOString(),
              },
            })
          : (() => {
              const approvedTask = task.state === "approved" ? task : transitionTask(task, "approved");
              const runningTask = transitionTask(approvedTask, "running");
              return transitionTask(runningTask, "success", {
                toolResult: {
                  manualCompletion: true,
                  completionSource: "organizer_reported",
                  completedAt: new Date().toISOString(),
                },
              });
            })();
      const nextTasks = tasks.map((t) => (t.id === id ? successTask : t));
      setTasks(nextTasks);

      const newRecord: EvidenceRecord = {
        id: genId(),
        taskId: id,
        action: "Manual task completed (organizer-reported)",
        toolName: undefined,
        eventType: "manual_action",
        status: "success",
        verificationLevel: "local",
        details: `Organizer reported manual completion of: "${task.title}" (organizer-reported, not independently verified).`,
        timestamp: new Date().toISOString(),
        isExternalVerified: false,
      };

      const nextEvidence = [newRecord, ...evidence];
      setEvidence(nextEvidence);
      updateActiveProjectData({ tasks: nextTasks, evidence: nextEvidence });
      setNotice(`Manual task "${task.title}" marked as completed (organizer-reported).`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to complete manual task.");
    }
  }

  /**
   * Approve-and-run was removed.
   * Approval and execution must be separate explicit organizer actions to enforce the
   * human-in-the-loop governance requirement. Use approveTask() then runTask().
   */

  async function runTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    if (task.state !== "approved") {
      setNotice(`Cannot run task: Must be approved by organizer first. (Current state: ${task.state})`);
      return;
    }

    await executeApprovedTask(task, evidence);
  }

  async function executeApprovedTask(task: ExecutableTask, currentEvidence: EvidenceRecord[]) {
    const id = task.id;
    const toolName = task.toolName;

    if (!toolName) {
      setNotice(`Task "${task.title}" is a manual action task. Use "Mark Completed" once completed.`);
      return;
    }

    if (toolName === "validate_budget" && (!isBudgetConfirmed || activeProject.isBudgetConfirmed === false)) {
      setNotice("Please confirm the target budget before running budget validation.");
      return;
    }

    try {
      // 1. Move to running
      const runningTask = transitionTask(task, "running");
      const runningTasks = tasks.map((t) => (t.id === id ? runningTask : t));
      setTasks(runningTasks);
      setNotice(`Executing tool "${toolName}"...`);

      // 2. Prepare real input without fabricated defaults
      let input: Record<string, unknown> = task.toolInput || { title: task.title };

      if (toolName === "validate_budget") {
        if (structuredPlan?.budget && structuredPlan.budget.length > 0) {
          input = {
            budget: structuredPlan.budget,
            requestedBudget: budgetValidation?.requested || activeProject.targetBudget,
          };
        }
      } else if (toolName === "generate_creatives") {
        input = {
          theme: studioTheme,
          dimension: studioDimension,
          projectName: structuredPlan?.eventName || activeProject.name,
          brief: activeProject.brief,
          budget: structuredPlan?.totalBudget || activeProject.targetBudget,
          participants: structuredPlan?.participants || 0,
          content: posterContent,
        };
      } else if (toolName === "sponsor_research") {
        input = {
          eventType: structuredPlan?.eventName || activeProject.name,
          brief: activeProject.brief,
          budget: structuredPlan?.totalBudget || activeProject.targetBudget,
          participants: structuredPlan?.participants || 0,
        };
      } else if (toolName === "review_outreach") {
        input = {
          eventName: structuredPlan?.eventName || activeProject.name,
          brief: activeProject.brief,
          budget: structuredPlan?.totalBudget || activeProject.targetBudget,
          participants: structuredPlan?.participants || 0,
          isBudgetConfirmed: Boolean(activeProject.isBudgetConfirmed),
        };
      } else if (toolName === "export_project_report") {
        const projectSnapshot: Project = {
          ...activeProject,
          name: structuredPlan?.eventName || activeProject.name,
          brief: activeProject.brief,
          targetBudget: structuredPlan?.totalBudget || activeProject.targetBudget,
          plan,
          structuredPlan: structuredPlan || undefined,
          budgetValidation: budgetValidation || undefined,
          tasks: runningTasks,
          evidence: currentEvidence,
          creatives,
          sponsorResearch: activeProject.sponsorResearch,
          outreachReview: activeProject.outreachReview,
          reviewedDraftIds,
          updatedAt: new Date().toISOString(),
        };
        input = {
          project: projectSnapshot,
          projectName: projectSnapshot.name,
          format: exportFormat,
        };
      } else if (toolName === "finalize_brief") {
        input = {
          brief: activeProject.brief,
          title: task.title,
        };
      }

      // 3. Real Tool Execution via registry
      const result = await toolRegistry.execute(toolName, input, id);

      if (result.success) {
        const successTask = transitionTask(runningTask, "success", {
          toolResult: result.result,
        });
        const nextTasks = tasks.map((t) => (t.id === id ? successTask : t));
        setTasks(nextTasks);

        const newRecord: EvidenceRecord = {
          id: genId(),
          taskId: id,
          action: `Tool executed: ${toolName}`,
          toolName,
          eventType: "tool_execution",
          status: "success",
          verificationLevel: "local",
          details: `Tool "${toolName}" executed successfully. Result: ${JSON.stringify(result.result).slice(0, 150)}...`,
          timestamp: new Date().toISOString(),
          isExternalVerified: false,
          result: result.result,
        };

        const nextEvidence = [newRecord, ...currentEvidence];
        setEvidence(nextEvidence);

        let nextValidation = budgetValidation;
        if (toolName === "validate_budget" && result.result) {
          const res = result.result as Partial<BudgetValidationResult>;
          if (res.allocated !== undefined) {
            nextValidation = budgetValidation ? ({ ...budgetValidation, ...res } as BudgetValidationResult) : null;
            setBudgetValidation(nextValidation);
          }
        }

        let nextCreatives = creatives;
        if (toolName === "generate_creatives" && result.result) {
          const res = result.result as {
            themeId?: PosterTheme;
            dimension?: string;
            content?: PosterContent;
            action?: string;
            svgContent?: string;
          };
          const svgContent = res.svgContent || generatePosterSvg(res.content || posterContent, (res.themeId as PosterTheme) || studioTheme, studioDimension);
          const newCreative: SavedCreative = {
            id: `cr-${Date.now()}`,
            title: `${res.content?.headline || "Creative Asset"} (${studioDimension})`,
            theme: (res.themeId as PosterTheme) || studioTheme,
            dimension: studioDimension,
            content: res.content || posterContent,
            svgContent,
            svgSnippet: svgContent.slice(0, 300) + "...</svg>",
            createdAt: new Date().toISOString(),
          };
          nextCreatives = [newCreative, ...creatives];
          setCreatives(nextCreatives);
        }

        let nextSponsorResearch = activeProject.sponsorResearch;
        if (toolName === "sponsor_research" && result.result) {
          nextSponsorResearch = result.result as SponsorResearchResult;
        }

        let nextOutreachReview = activeProject.outreachReview;
        if (toolName === "review_outreach" && result.result) {
          nextOutreachReview = result.result as OutreachReviewResult;
        }

        updateActiveProjectData({
          tasks: nextTasks,
          evidence: nextEvidence,
          budgetValidation: nextValidation || undefined,
          creatives: nextCreatives,
          sponsorResearch: nextSponsorResearch,
          outreachReview: nextOutreachReview,
        });

        setNotice(`Task "${task.title}" executed successfully.`);
      } else {
        const failedTask = transitionTask(runningTask, "failed", {
          error: result.error || "Tool returned unsuccessful status.",
        });

        const newRecord: EvidenceRecord = {
          id: genId(),
          taskId: id,
          action: `Tool execution failed: ${toolName}`,
          toolName,
          eventType: "tool_execution",
          status: "failed",
          verificationLevel: "local",
          error: result.error || "Execution error",
          details: `Tool execution failed: ${result.error || "Execution error"}`,
          timestamp: new Date().toISOString(),
          isExternalVerified: false,
        };

        setTasks((prevTasks) => {
          const updatedTasks = prevTasks.map((t) => (t.id === id ? failedTask : t));
          setEvidence((prevEvidence) => {
            const updatedEvidence = [newRecord, ...prevEvidence];
            updateActiveProjectData({ tasks: updatedTasks, evidence: updatedEvidence });
            return updatedEvidence;
          });
          return updatedTasks;
        });

        setNotice(`Task execution failed: ${result.error || "Please re-approve and retry."}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected execution failure.";
      const newRecord: EvidenceRecord = {
        id: genId(),
        taskId: id,
        action: `Tool execution error: ${toolName}`,
        toolName,
        eventType: "tool_execution",
        status: "failed",
        verificationLevel: "local",
        error: msg,
        details: `Unexpected execution error encountered: ${msg}`,
        timestamp: new Date().toISOString(),
        isExternalVerified: false,
      };

      setTasks((prevTasks) => {
        const curTask = prevTasks.find((t) => t.id === id) || task;
        const failedTask = isValidTransition(curTask.state, "failed")
          ? transitionTask(curTask, "failed", { error: msg })
          : { ...curTask, state: "failed" as const, error: msg, updatedAt: new Date().toISOString() };
        const updatedTasks = prevTasks.map((t) => (t.id === id ? failedTask : t));

        setEvidence((prevEvidence) => {
          const updatedEvidence = [newRecord, ...prevEvidence];
          updateActiveProjectData({ tasks: updatedTasks, evidence: updatedEvidence });
          return updatedEvidence;
        });

        return updatedTasks;
      });

      setNotice(`Execution error: ${msg}`);
    }
  }

  /**
   * Maps a structured AI-generated task to the correct registered tool (or manual_only).
   * Tasks with no registered tool get manual_only state so they are never routed to finalize_brief
   * or any other tool that doesn't match their actual intent.
   */
  function mapTaskToTool(
    task: GeneratedPlan["tasks"][number],
    index: number,
    targetBudget: number,
    structured: GeneratedPlan,
    briefText: string
  ): ExecutableTask {
    const titleL = task.title.toLowerCase();
    const catL = task.category.toLowerCase();

    const isBudget    = titleL.includes("budget") || titleL.includes("prize") || catL.includes("budget");
    const isResearch  = titleL.includes("sponsor") || titleL.includes("research") || catL.includes("research");
    const isCreative  = titleL.includes("poster") || titleL.includes("creative") || titleL.includes("theme") || catL.includes("creative");
    const isOutreach  = titleL.includes("email") || titleL.includes("outreach") || catL.includes("outreach");
    const isBrief     = titleL.includes("brief") || titleL.includes("finalize");
    const isExport    = titleL.includes("export") || titleL.includes("report");

    let toolName: string | undefined;
    let toolInput: Record<string, unknown> | undefined;
    let state: ExecutableTask["state"] = "pending";

    if (isBudget) {
      toolName = "validate_budget";
      toolInput = { requestedBudget: targetBudget, budget: structured.budget };
    } else if (isResearch) {
      toolName = "sponsor_research";
      toolInput = { eventType: structured.eventName, brief: briefText, participants: structured.participants, budget: targetBudget };
    } else if (isCreative) {
      toolName = "generate_creatives";
      toolInput = { projectName: structured.eventName, brief: briefText, budget: targetBudget, participants: structured.participants };
    } else if (isOutreach) {
      toolName = "review_outreach";
      toolInput = { eventName: structured.eventName, brief: briefText, budget: targetBudget, participants: structured.participants };
    } else if (isBrief) {
      toolName = "finalize_brief";
      toolInput = { title: task.title, brief: briefText };
    } else if (isExport) {
      toolName = "export_project_report";
      toolInput = { projectName: structured.eventName };
    } else {
      // No registered tool — organizer must mark this completed manually
      toolName = undefined;
      toolInput = undefined;
      state = "manual_only";
    }

    return {
      id: `task-${Date.now()}-${index + 1}`,
      title: task.title,
      category: task.category,
      priority: task.priority,
      state,
      toolName,
      toolInput,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }


  // ─── Event Profile: save helper ─────────────────────────────────────────
  function updateEventProfile(patch: Partial<EventProfile>) {
    const next = { ...eventProfile, ...patch };
    setEventProfile(next);
    updateActiveProjectData({ eventProfile: next });
  }

  // ─── Event Profile: AI tagline suggestion ────────────────────────────────
  async function suggestTagline() {
    if (!activeProject.name && !eventProfile.eventType) {
      setNotice("Fill in at least the event name or type first.");
      return;
    }
    setIsSuggestingTagline(true);
    try {
      const resp = await fetch("/api/generate-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: activeProject.name,
          eventType: eventProfile.eventType,
          eventDate: eventProfile.eventDate,
          venue: eventProfile.venue,
          targetAudience: eventProfile.targetAudience,
          sponsorCompanyName: "__tagline_mode__",
          sponsorAsk: "Generate a short punchy event tagline only. Return JSON: {\"subject\":\"<tagline>\",\"body\":\"\",\"reasoning\":\"\"}",
          organizerName: eventProfile.organizerName,
          tone: "friendly",
        } as Parameters<typeof fetch>[1] extends { body: infer B } ? B : never),
      });
      const data: { mail?: { subject: string } } = await resp.json();
      if (data.mail?.subject) {
        updateEventProfile({ tagline: data.mail.subject });
        setNotice("Tagline suggested by Muse Spark. Edit it if needed.");
      }
    } catch {
      setNotice("Could not reach AI for tagline suggestion.");
    } finally {
      setIsSuggestingTagline(false);
    }
  }

  // ─── Event Profile: AI theme suggestion ──────────────────────────────────
  async function suggestTheme() {
    if (!activeProject.name && !eventProfile.eventType) {
      setNotice("Fill in at least the event name or type first.");
      return;
    }
    setIsSuggestingTheme(true);
    try {
      const resp = await fetch("/api/generate-creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Analyze this event and recommend the best visual aesthetic theme, visual style, and brand hex color. Event: ${activeProject.name || "Event"}, Type: ${eventProfile.eventType || "Tech Event"}, Audience: ${eventProfile.targetAudience || "Students & Developers"}.`,
          eventName: activeProject.name || "Event",
          eventType: eventProfile.eventType || "Tech Event",
          eventDate: eventProfile.eventDate || "",
          venue: eventProfile.venue || "",
          targetAudience: eventProfile.targetAudience || "",
          brandColor: eventProfile.brandColor || "#7c3aed",
          visualStyle: eventProfile.visualStyle || "Futuristic",
          tagline: eventProfile.tagline || "",
          organizerName: eventProfile.organizerName || "",
          dimension: "1:1",
        }),
      });
      const data = await resp.json();
      if (data.layout) {
        const layout = data.layout;
        const styleMap: Record<string, EventProfile["visualStyle"]> = {
          bold: "Bold",
          minimal: "Minimal",
          emerald: "Academic",
          neon: "Futuristic",
        };
        const suggestedStyle = styleMap[layout.suggestedTheme] || "Futuristic";
        updateEventProfile({
          visualStyle: suggestedStyle,
          brandColor: layout.colorPrimary || "#7c3aed",
          tagline: eventProfile.tagline || layout.tagline || "",
        });
        if (layout.suggestedTheme && ["neon", "minimal", "bold", "emerald"].includes(layout.suggestedTheme)) {
          setStudioTheme(layout.suggestedTheme as "neon" | "minimal" | "bold" | "emerald");
        }
        setNotice(`Muse Spark recommended "${suggestedStyle}" style with ${layout.colorPrimary} palette.`);
      }
    } catch {
      setNotice("Could not reach AI for theme suggestion.");
    } finally {
      setIsSuggestingTheme(false);
    }
  }

  // ─── Creative Studio: Meta AI Image Model (muse-image-1.0) ───────────────
  async function generateImageFromMetaAI(overridePrompt?: string) {
    const promptToUse = (overridePrompt || aiImagePrompt || creativePrompt).trim();
    if (!promptToUse) {
      setAiImageError("Please describe the creative artwork or poster you want to generate.");
      return;
    }
    setIsGeneratingAiImage(true);
    setAiImageError("");
    try {
      const resp = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToUse,
          eventName: activeProject.name || activeProject.structuredPlan?.eventName || "",
          visualStyle: aiImageStyle,
          aspectRatio: studioDimension,
          colorMood: aiImageColorMood,
          extraDetails: aiImageExtraDetails,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setAiImageError(data.error || "Meta AI image generation failed.");
        return;
      }
      if (data.imageUrl) {
        setGeneratedAiImage({
          imageUrl: data.imageUrl,
          reasoning: data.reasoning,
          promptUsed: data.promptUsed,
        });
        setNotice("Generated new image using Meta AI muse-image-1.0 model!");
      }
    } catch {
      setAiImageError("Network error connecting to Meta AI endpoint.");
    } finally {
      setIsGeneratingAiImage(false);
    }
  }

  function handleSaveAiImageToProject() {
    if (!generatedAiImage) return;
    const title = `${activeProject.name || "Event"} - Meta AI Artwork (${DIMENSIONS[studioDimension].label})`;
    const newCreative: SavedCreative = {
      id: genId(),
      title,
      type: "ai_generated_image",
      imageUrl: generatedAiImage.imageUrl,
      reasoning: generatedAiImage.reasoning,
      promptUsed: generatedAiImage.promptUsed,
      theme: studioTheme,
      dimension: studioDimension,
      content: { ...posterContent },
      createdAt: new Date().toISOString(),
    };
    const nextList = [newCreative, ...creatives];
    setCreatives(nextList);

    const newRecord: EvidenceRecord = {
      id: genId(),
      action: "Meta AI image generated and saved",
      toolName: "generate_creatives",
      status: "success",
      details: `Generated artwork using Meta AI muse-image-1.0 model. Resolution format: ${DIMENSIONS[studioDimension].label}.`,
      timestamp: new Date().toISOString(),
      isExternalVerified: false,
    };
    const nextEvidence = [newRecord, ...evidence];
    setEvidence(nextEvidence);

    updateActiveProjectData({
      creatives: nextList,
      evidence: nextEvidence,
    });
    setNotice("Saved Meta AI generated artwork to project gallery!");
  }

  function handleDownloadAiImage() {
    if (!generatedAiImage?.imageUrl) return;
    const link = document.createElement("a");
    link.download = `${(activeProject.name || "creative").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-muse-image.webp`;
    link.href = generatedAiImage.imageUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotice("Downloaded Meta AI generated image (.webp).");
  }

  // ─── Creative Studio: Vector Typographic AI generation ───────────────────
  async function generateCreativeFromAI(overridePrompt?: string) {
    const promptToUse = (overridePrompt ?? creativePrompt).trim();
    if (!promptToUse) {
      setCreativeGenError("Describe what you want to create.");
      return;
    }
    setIsGeneratingCreative(true);
    setCreativeGenError("");
    setAiCreativeLayout(null);
    try {
      const resp = await fetch("/api/generate-creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToUse,
          eventName: activeProject.name || activeProject.structuredPlan?.eventName || "",
          eventType: eventProfile.eventType,
          eventDate: eventProfile.eventDate || activeProject.structuredPlan?.schedule?.[0]?.time || "",
          venue: eventProfile.venue,
          targetAudience: eventProfile.targetAudience,
          brandColor: eventProfile.brandColor || "#7c3aed",
          visualStyle: eventProfile.visualStyle,
          tagline: eventProfile.tagline,
          organizerName: eventProfile.organizerName,
          budget: activeProject.targetBudget > 0 ? `₹${activeProject.targetBudget.toLocaleString("en-IN")}` : "",
          participants: activeProject.structuredPlan?.participants
            ? String(activeProject.structuredPlan.participants)
            : "",
          dimension: studioDimension,
        }),
      });
      const data: { layout?: typeof aiCreativeLayout; error?: string } = await resp.json();
      if (!resp.ok || data.error) {
        setCreativeGenError(data.error || "AI generation failed.");
        return;
      }
      if (data.layout) {
        setAiCreativeLayout(data.layout);
        setPosterContent({
          kicker: data.layout.kicker,
          headline: data.layout.headline,
          subheadline: data.layout.subheadline,
          eventDate: data.layout.eventDate,
          venue: data.layout.venue,
          badge: data.layout.badge,
          footer: data.layout.footer,
        });
        const suggestedTheme = data.layout.suggestedTheme as PosterTheme;
        if (["neon", "minimal", "bold", "emerald"].includes(suggestedTheme)) {
          setStudioTheme(suggestedTheme);
        }
        setNotice("AI creative layout generated. Preview updated below.");
      }
    } catch {
      setCreativeGenError("Network error. Is the dev server running?");
    } finally {
      setIsGeneratingCreative(false);
    }
  }

  // ─── Research & Outreach: PR & Corporate Relations (CR) Agent ────────────
  async function generateMailFromAI(strategyOverride?: "corporate_relations" | "devrel_api" | "pr_media" | "inkind_swag") {
    if (!mailForm.sponsorCompanyName.trim()) {
      setMailGenError("Sponsor / prospective company name is required.");
      return;
    }
    const activeStrategy = strategyOverride || mailForm.outreachType || "corporate_relations";
    setIsGeneratingMail(true);
    setMailGenError("");
    setGeneratedMail(null);
    try {
      const resp = await fetch("/api/generate-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizerName: eventProfile.organizerName || "Organizing Team",
          organizerEmail: eventProfile.organizerEmail || "",
          organizerRole: mailForm.organizerRole || "Head of Corporate Relations",
          organizationName: mailForm.organizationName || eventProfile.venue || "",
          eventName: activeProject.name || activeProject.structuredPlan?.eventName || "Our Event",
          eventType: eventProfile.eventType || "Flagship Tech Event",
          eventDate: eventProfile.eventDate || "",
          venue: eventProfile.venue || "",
          expectedParticipants: activeProject.structuredPlan?.participants
            ? String(activeProject.structuredPlan.participants)
            : "",
          budget: activeProject.targetBudget > 0
            ? `₹${activeProject.targetBudget.toLocaleString("en-IN")} (${activeProject.isBudgetConfirmed ? "confirmed" : "indicative"})`
            : "Target budget under planning",
          sponsorCompanyName: mailForm.sponsorCompanyName,
          sponsorProgramName: mailForm.sponsorProgramName,
          recipientName: mailForm.recipientName,
          recipientRole: mailForm.recipientRole,
          sponsorAsk: mailForm.sponsorAsk,
          outreachType: activeStrategy,
          crStrategicFit: mailForm.crStrategicFit,
          prPressHook: mailForm.prPressHook,
          tone: mailForm.tone,
          extraContext: mailForm.extraContext,
        }),
      });
      const data: { mail?: typeof generatedMail; error?: string } = await resp.json();
      if (!resp.ok || data.error) {
        setMailGenError(data.error || "PR & CR pitch generation failed.");
        return;
      }
      if (data.mail) {
        setGeneratedMail(data.mail);
        setNotice("PR & CR pitch proposal synthesized! Review and customize draft below.");
      }
    } catch {
      setMailGenError("Network error. Is the dev server running?");
    } finally {
      setIsGeneratingMail(false);
    }
  }

  function handleSelectCompanyForOutreach(
    sp: SponsorTarget,
    strategy: "corporate_relations" | "devrel_api" | "pr_media" | "inkind_swag" = "corporate_relations"
  ) {
    const defaultAsks = {
      corporate_relations: sp.typicalContribution,
      devrel_api: "Dedicated challenge track bounty & platform API credits for 200+ builder teams",
      pr_media: "Media partnership, keynote speaker representation, and press release distribution",
      inkind_swag: "Participant swag boxes, attendee perks, and product licenses",
    };
    const defaultRoles = {
      corporate_relations: "Head of Corporate Relations",
      devrel_api: "Developer Relations & Hackathon Lead",
      pr_media: "Director of Public Relations & Communications",
      inkind_swag: "Logistics & Sponsorship Coordinator",
    };

    setMailForm({
      organizerRole: defaultRoles[strategy] || "Corporate Relations Lead",
      organizationName: mailForm.organizationName || eventProfile.venue || "Organizing Committee",
      sponsorCompanyName: sp.name,
      sponsorProgramName: sp.listedProgram,
      recipientName: "",
      recipientRole: sp.contactChannel,
      sponsorAsk: defaultAsks[strategy] || sp.typicalContribution,
      outreachType: strategy,
      crStrategicFit: sp.crStrategicFit || sp.rationale,
      prPressHook: sp.prPressHook || "Empowering university developers to deploy real-world technological solutions",
      tone: mailForm.tone || "formal",
      extraContext: sp.recommendedPitchAngle,
    });
    setNotice(`Loaded ${sp.name} into PR & CR Agent (${strategy.replace("_", " ").toUpperCase()} Mode).`);
  }

  async function submitBrief() {

    if (!brief.trim()) {
      setNotice("Enter an event goal or instruction first.");
      return;
    }

    setIsGenerating(true);
    setPlan("");
    setStructuredPlan(null);
    setBudgetValidation(null);
    setNotice("Muse Spark is preparing your event plan...");

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ brief: brief.trim(), eventProfile }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to generate the plan.");
      }

      if (typeof data.plan !== "string" || !data.plan.trim()) {
        throw new Error("The AI returned an empty plan. Please retry.");
      }

      if (!data.structured || !Array.isArray(data.structured.tasks)) {
        throw new Error("The AI response is missing structured tasks. Please retry.");
      }

      setPlan(data.plan);
      setStructuredPlan(data.structured);
      const parsedBudget = extractRequestedBudget(brief);

      if (parsedBudget.needsClarification) {
        // Brief lacks a reliable explicit budget. Do NOT silently adopt the AI's estimate.
        // Surface the AI proposal and require organizer confirmation before validation.
        const aiEstimate = data.structured.totalBudget || 0;
        setAiProposedBudget(aiEstimate > 0 ? aiEstimate : undefined);
        setIsBudgetConfirmed(false);
        setBudgetValidation(null);
        updateActiveProjectData({
          brief: brief.trim(),
          plan: data.plan,
          structuredPlan: data.structured,
          isBudgetConfirmed: false,
          aiProposedBudget: aiEstimate > 0 ? aiEstimate : undefined,
        });
        setNotice(
          `Plan generated. Your brief does not include an explicit budget.${aiEstimate > 0 ? ` AI estimated ₹${formatInr(aiEstimate)} — please confirm or enter your target budget before running budget validation.` : " Please enter your target budget before running budget validation."}`
        );
        setTasks(data.structured.tasks.map(
          (task: GeneratedPlan["tasks"][number], index: number) => mapTaskToTool(task, index, 0, data.structured, brief.trim())
        ));
        setIsGenerating(false);
        return;
      }

      // Budget extracted reliably from the brief
      const targetBudget = parsedBudget.amount!;
      setIsBudgetConfirmed(true);

      if (Array.isArray(data.structured?.budget)) {
        const validation = validateBudget(data.structured.budget, targetBudget);
        setBudgetValidation(validation);

        if (validation.valid) {
          setNotice(`Budget validated: ₹${formatInr(validation.allocated)} perfectly balanced.`);
        } else if (validation.status === "under_allocated") {
          setNotice(`Budget needs review: ₹${formatInr(validation.difference)} remains unallocated.`);
        } else if (validation.status === "over_allocated") {
          setNotice(`Budget exceeds limit by ₹${formatInr(Math.abs(validation.difference))}.`);
        } else {
          setNotice(`Budget validation flagged issues: ${validation.errors[0] || "Invalid items"}`);
        }
      } else {
        setBudgetValidation(null);
        setNotice("Plan generated, but structured budget breakdown is missing.");
      }

      const mappedTasks: ExecutableTask[] = data.structured.tasks.map(
        (task: GeneratedPlan["tasks"][number], index: number) =>
          mapTaskToTool(task, index, targetBudget, data.structured, brief.trim())
      );

      setTasks(mappedTasks);
      const updatedCopy = generateDefaultCopy(
        data.structured.eventName,
        brief.trim(),
        targetBudget,
        data.structured.participants
      );
      setPosterContent(updatedCopy);

      updateActiveProjectData({
        brief: brief.trim(),
        plan: data.plan,
        structuredPlan: data.structured,
        budgetValidation: (data.structured.budget ? validateBudget(data.structured.budget, targetBudget) : undefined),
        tasks: mappedTasks,
      });

      setNotice("AI plan generated successfully. Review it before acting.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      setNotice(message);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleDownloadPng() {
    if (!hiddenCanvasRef.current) return;
    drawPosterToCanvas(hiddenCanvasRef.current, posterContent, studioTheme, studioDimension);
    const slug = (posterContent.headline || "poster").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `${slug}-${studioTheme}-${studioDimension.replace(":", "x")}.png`;
    downloadCanvasAsPng(hiddenCanvasRef.current, filename);
    setNotice(`Downloaded high-res PNG (${DIMENSIONS[studioDimension].width}×${DIMENSIONS[studioDimension].height}px).`);
  }

  function handleDownloadSvg() {
    const svg = generatePosterSvg(posterContent, studioTheme, studioDimension);
    const slug = (posterContent.headline || "poster").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `${slug}-${studioTheme}-${studioDimension.replace(":", "x")}.svg`;
    downloadSvg(svg, filename);
    setNotice("Downloaded scalable vector SVG asset.");
  }

  function handleSaveCreativeToProject() {
    const svg = generatePosterSvg(posterContent, studioTheme, studioDimension);
    const newCreative: SavedCreative = {
      id: `cr-${Date.now()}`,
      title: `${posterContent.headline || "Event Poster"} (${DIMENSIONS[studioDimension].label})`,
      theme: studioTheme,
      dimension: studioDimension,
      content: { ...posterContent },
      svgContent: svg,
      svgSnippet: svg.slice(0, 300) + "...</svg>",
      createdAt: new Date().toISOString(),
    };
    const nextList = [newCreative, ...creatives];
    setCreatives(nextList);

    const newRecord: EvidenceRecord = {
      id: genId(),
      action: "Creative asset generated and saved",
      toolName: "generate_creatives",
      status: "success",
      details: `Generated exact-text asset "${newCreative.title}" with theme ${THEMES[studioTheme].name}. Resolution: ${DIMENSIONS[studioDimension].width}x${DIMENSIONS[studioDimension].height}px.`,
      timestamp: new Date().toISOString(),
      isExternalVerified: false,
    };
    const nextEvidence = [newRecord, ...evidence];
    setEvidence(nextEvidence);

    updateActiveProjectData({
      creatives: nextList,
      evidence: nextEvidence,
    });
    setNotice(`Saved asset to project gallery. Audit record logged in Local Audit Trail.`);
  }

  function handleDeleteCreative(id: string) {
    const nextList = creatives.filter((c) => c.id !== id);
    setCreatives(nextList);
    updateActiveProjectData({ creatives: nextList });
    setNotice("Asset removed from project gallery.");
  }

  function handleLoadCreative(c: SavedCreative) {
    setStudioTheme(c.theme);
    setStudioDimension(c.dimension);
    setPosterContent({ ...c.content });
    setStudioViewMode("visual");
    setNotice(`Loaded "${c.title}" into studio editor.`);
  }

  function handleAutoFillCopy() {
    const name = structuredPlan?.eventName || activeProject.name;
    const targetBudget = budgetValidation?.requested || structuredPlan?.totalBudget || activeProject.targetBudget;
    const participants = structuredPlan?.participants || 0;
    const copy = generateDefaultCopy(name, activeProject.brief, targetBudget, participants, {
      eventDate: structuredPlan?.schedule?.[0]?.time,
      registrationUrl: "opspilot.io/join",
    });
    setPosterContent(copy);
    setNotice("Auto-filled exact copy and metadata from active project plan.");
  }

  function formatDisplayDate(isoString: string): string {
    if (!isoString) return "";
    if (!mounted) {
      return isoString.slice(0, 10);
    }
    try {
      const d = new Date(isoString);
      if (Number.isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  }

  function formatDateTime(isoString: string): string {
    if (!isoString) return "";
    if (!mounted) {
      return isoString.replace("T", " ").slice(0, 19);
    }
    try {
      const d = new Date(isoString);
      if (Number.isNaN(d.getTime())) return isoString;
      return d.toLocaleString();
    } catch {
      return isoString;
    }
  }

  function formatInr(amount: number): string {
    if (typeof amount !== "number" || isNaN(amount)) return "0";
    const parts = Math.round(amount).toString();
    if (parts.length <= 3) return parts;
    const lastThree = parts.substring(parts.length - 3);
    const otherNumbers = parts.substring(0, parts.length - 3);
    return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }

  return (
    <div className="app-shell" suppressHydrationWarning>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Zap size={20} fill="currentColor" /></div>
          <div className="brand-name">Ops<span>Pilot</span></div>
        </div>

        {/* Project Selector */}
        <div style={{ padding: "0 10px" }}>
          <div className="nav-label" style={{ padding: 0 }}>ACTIVE PROJECT</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              value={activeProjectId}
              onChange={(e) => switchProject(e.target.value)}
              style={{
                width: "100%",
                background: "#161b2b",
                border: "1px solid #282f45",
                color: "#e2e6f5",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.isDemoData ? `[Demo] ${p.name}` : p.name}
                </option>
              ))}
            </select>
            <button
              className="btn"
              style={{ padding: "8px", borderRadius: 8, flexShrink: 0 }}
              onClick={() => setIsCreatingProject(!isCreatingProject)}
              title="Create new project workspace"
            >
              <Plus size={14} />
            </button>
          </div>

          {isCreatingProject && (
            <form
              onSubmit={handleCreateProject}
              style={{
                marginTop: 10,
                padding: 12,
                background: "#141928",
                border: "1px solid #333d59",
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: "#a99cff" }}>
                CREATE NEW PROJECT
              </div>
              <input
                type="text"
                placeholder="Project Name *"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0c0f18",
                  border: "1px solid #2a334d",
                  borderRadius: 6,
                  padding: "6px 8px",
                  fontSize: 11,
                  color: "#fff",
                  marginBottom: 6,
                }}
              />
              <input
                type="text"
                placeholder="Target Budget (e.g. 50000)"
                value={newProjectBudget}
                onChange={(e) => setNewProjectBudget(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0c0f18",
                  border: "1px solid #2a334d",
                  borderRadius: 6,
                  padding: "6px 8px",
                  fontSize: 11,
                  color: "#fff",
                  marginBottom: 6,
                }}
              />
              <textarea
                placeholder="Short description..."
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0c0f18",
                  border: "1px solid #2a334d",
                  borderRadius: 6,
                  padding: "6px 8px",
                  fontSize: 11,
                  color: "#fff",
                  minHeight: 50,
                  marginBottom: 8,
                }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "5px 10px", fontSize: 11, flex: 1 }}
                >
                  Create
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: "5px 8px", fontSize: 11 }}
                  onClick={() => setIsCreatingProject(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div>
          <div className="nav-label">WORKSPACE</div>
          <nav className="nav-list">
            {navItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className={`nav-item ${activeNav === label ? "active" : ""}`}
                onClick={() => {
                  setActiveNav(label);
                  setNotice(
                    label === "Evidence Ledger"
                      ? "Viewing locally recorded audit trail."
                      : `${label} selected.`
                  );
                }}
              >
                <Icon size={17} className="nav-icon" /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <strong><Sparkles size={14} style={{ display: "inline", marginRight: 6, color: "#a99cff" }} /> Engine status</strong>
          <p>Execution engine & tools active · Approval-based execution state machine.</p>
          <div className="progress-track"><div className="progress-fill" style={{ width: "85%" }} /></div>
          <p style={{ marginTop: 8, color: "#a99cff", fontSize: 10, fontWeight: 600 }}>
            {activeProject.isDemoData ? `[Demo] ${activeProject.name}` : activeProject.name}
          </p>
        </div>
      </aside>

      <main className="main" suppressHydrationWarning>
        <header className="topbar">
          <div>
            <div className="eyebrow">AI OPERATIONS WORKSPACE</div>
            <h1>Good morning. Let&apos;s get things done.</h1>
            <p className="subtitle">Plan events, execute operational tasks, verify results, and create on-brand campaign assets from one place.</p>
          </div>
          <div className="top-actions">
            <button
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "7px 12px" }}
              onClick={() => setIsExportModalOpen(true)}
              title="Export complete project operations report and audit bundle"
            >
              <FileDown size={14} /> Export Package
            </button>
            <button className="btn" onClick={() => setNotice("Notifications are a planned feature.")}><Activity size={15} /> Activity</button>
            <div className="avatar">OP</div>
          </div>
        </header>

        {/* ─── Notice Bar (always visible) ─── */}
        <div className="ops-banner" style={{ marginBottom: 20 }} suppressHydrationWarning>
          <ShieldCheck size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 7 }} />{notice}
        </div>

        {/* ─────────────────── OVERVIEW TAB ─────────────────── */}
        {activeNav === "Overview" && (
          <div className="tab-view" key="overview">
            <section className="grid stats">
              <div className="card">
                <div className="stat-top"><span>Tasks completed</span><span className="stat-icon"><ListChecks size={17} /></span></div>
                <div className="stat-number">{completed}<span style={{ color: "#737b91", fontSize: 16 }}> / {tasks.length}</span></div>
                <div className="stat-note">
                  <ArrowUpRight size={12} style={{ display: "inline", color: "#80dfb0" }} /> {approved} approved · {pending} pending
                </div>
              </div>
              <div className="card">
                <div className="stat-top"><span>Budget planned</span><span className="stat-icon"><Wallet size={17} /></span></div>
                <div className="stat-number">
                  {structuredPlan
                    ? `₹${formatInr(structuredPlan.totalBudget)}`
                    : "—"}
                </div>
                <div className="stat-note">
                  {structuredPlan ? "AI-planned budget · review required" : "Generate a plan to calculate"}
                </div>
              </div>
              <div className="card" style={{ cursor: "pointer" }} onClick={() => setActiveNav("Creative Studio")}>
                <div className="stat-top"><span>Creative assets</span><span className="stat-icon"><Palette size={17} /></span></div>
                <div className="stat-number">{String(creatives.length).padStart(2, "0")}</div>
                <div className="stat-note">Exact-text templates · 4 themes</div>
              </div>
              <div className="card">
                <div className="stat-top"><span>Evidence records</span><span className="stat-icon"><ShieldCheck size={17} /></span></div>
                <div className="stat-number">
                  {String(evidence.length).padStart(2, "0")}
                </div>
                <div className="stat-note">
                  Locally recorded activity · audit trail active
                </div>
              </div>
            </section>

            {/* Quick actions row */}
            <section className="grid content-grid" style={{ marginTop: 8 }}>
              <div className="card">
                <div className="section-head">
                  <h2>Event operations</h2>
                  <button className="btn" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => setActiveNav("Event Operations")}>
                    <FolderKanban size={13} /> Open task board <ChevronRight size={12} />
                  </button>
                </div>
                <p className="small-muted">Approval-based execution: review, approve, then run registered tools.</p>
                <div className="task-list">
                  {tasks.slice(0, 3).map((task) => (
                    <div className="task-row" key={task.id} style={{ alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #1e2436" }}>
                      <div style={{ flexShrink: 0 }}>
                        {task.state === "success" && <CheckCircle2 size={16} color="#34d399" />}
                        {task.state === "running" && <Loader2 size={16} color="#a99cff" className="animate-spin" />}
                        {task.state === "approved" && <ThumbsUp size={15} color="#60a5fa" />}
                        {task.state === "failed" && <AlertCircle size={16} color="#f87171" />}
                        {task.state === "manual_only" && <Square size={15} color="#f59e0b" />}
                        {task.state === "pending" && <Clock3 size={15} color="#717a94" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: task.state === "success" ? "#858da2" : "#f4f6ff", textDecoration: task.state === "success" ? "line-through" : "none" }}>{task.title}</div>
                        <div className="task-meta"><span>{task.category}</span></div>
                      </div>
                      <span className={`priority ${task.priority}`}>{task.priority}</span>
                    </div>
                  ))}
                  {tasks.length > 3 && (
                    <button className="btn" style={{ marginTop: 10, fontSize: 11 }} onClick={() => setActiveNav("Event Operations")}>
                      View all {tasks.length} tasks <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="agent-box">
                  <div className="agent-title"><div className="agent-orb"><Bot size={17} /></div> OpsPilot Agent <span style={{ marginLeft: "auto", color: "#aaa0ff", fontSize: 10 }}>PREVIEW</span></div>
                  <p>Describe the outcome you want. OpsPilot will plan the steps, run tools, and verify the results.</p>
                  <button className="btn" style={{ marginTop: 10, fontSize: 11 }} onClick={() => setActiveNav("AI Agent")}>
                    <Sparkles size={12} /> Open AI workspace <ChevronRight size={12} />
                  </button>
                </div>

                <div className="card" style={{ marginTop: 14 }}>
                  <div className="section-head"><h2>Quick links</h2></div>
                  <div className="activity" style={{ cursor: "pointer" }} onClick={() => setActiveNav("Research & Outreach")}>
                    <div className="activity-icon"><Search size={15} /></div>
                    <div><strong>Research & Outreach</strong><span>Sponsor criteria and email drafts</span></div>
                  </div>
                  <div className="activity" style={{ cursor: "pointer" }} onClick={() => setActiveNav("Creative Studio")}>
                    <div className="activity-icon"><Palette size={15} /></div>
                    <div><strong>Creative Studio</strong><span>Poster themes and asset builder</span></div>
                  </div>
                  <div className="activity" style={{ cursor: "pointer" }} onClick={() => setActiveNav("Evidence Ledger")}>
                    <div className="activity-icon"><ShieldCheck size={15} /></div>
                    <div><strong>Evidence Ledger</strong><span>{evidence.length} audit records</span></div>
                  </div>
                  <div className="activity" style={{ cursor: "pointer" }} onClick={() => setActiveNav("Settings & Docs")}>
                    <div className="activity-icon"><Settings2 size={15} /></div>
                    <div><strong>Settings & Docs</strong><span>API keys, database, documentation</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Creative preview section */}
            <section style={{ marginTop: 26 }}>
              <div className="section-head">
                <div>
                  <h2>Creative Studio</h2>
                  <p className="small-muted" style={{ margin: "5px 0 0" }}>
                    Exact-text vector template previews · 4 high-fidelity themes.
                  </p>
                </div>
                <button className="btn" onClick={() => { setActiveNav("Creative Studio"); }}>
                  <ImagePlus size={14} /> Open studio <ChevronRight size={13} />
                </button>
              </div>
              <div className="grid creative-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                {(["neon", "minimal", "bold", "emerald"] as const).map((themeKey) => (
                  <div
                    key={themeKey}
                    className="card creative"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setStudioTheme(themeKey);
                      setActiveNav("Creative Studio");
                    }}
                  >
                    <div
                      className="saved-asset-preview"
                      style={{ aspectRatio: "4/5", minHeight: 180 }}
                      dangerouslySetInnerHTML={{
                        __html: generatePosterSvg(posterContent, themeKey, "1:1"),
                      }}
                    />
                    <div className="creative-info">
                      <strong>{THEMES[themeKey].name}</strong>
                      <span>{THEMES[themeKey].tagline}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid bottom-grid">
              <div className="card">
                <div className="section-head"><h2>Agent activity</h2><span className="small-muted">Prototype</span></div>
                <div className="activity"><div className="activity-icon"><Target size={15} /></div><div><strong>Event brief workspace ready</strong><span>Example project data loaded locally.</span></div></div>
                <div className="activity"><div className="activity-icon"><FileCheck2 size={15} /></div><div><strong>Evidence ledger awaiting tools</strong><span>No claims of external verification are made.</span></div></div>
                <div className="activity"><div className="activity-icon"><FolderKanban size={15} /></div><div><strong>Task board interactive</strong><span>Toggle tasks to explore the UI.</span></div></div>
              </div>
              <div className="card">
                <div className="section-head"><h2>Next build milestones</h2><span className="small-muted">MVP</span></div>
                <div className="activity"><div className="activity-icon"><Zap size={15} /></div><div><strong>1. Connect Meta Model API</strong><span>Secure server-side route and structured responses.</span></div></div>
                <div className="activity"><div className="activity-icon"><WandSparkles size={15} /></div><div><strong>2. Add real tool execution</strong><span>Budget validator, task creation and evidence logs.</span></div></div>
                <div className="activity"><div className="activity-icon"><Palette size={15} /></div><div><strong>3. Template-based Creative Studio</strong><span>Exact-text SVG and PNG vector template generation.</span></div></div>
              </div>
            </section>
          </div>
        )}

        {/* ─────────────────── AI AGENT TAB ─────────────────── */}
        {activeNav === "AI Agent" && (
          <div className="tab-view" key="ai-agent">
            <div className="tab-header">
              <h2>AI Planning Workspace</h2>
              <p>Fill your event profile first — this feeds creative generation and outreach. Then describe goals and let Muse Spark plan the rest.</p>
            </div>

            <div className="grid content-grid">
              <div>
                {/* ─── Event Profile Card ─── */}
                <div className="card" style={{ marginBottom: 16, border: "1px solid #2d3555" }}>
                  <div className="section-head" style={{ marginBottom: 14 }}>
                    <div>
                      <h2>Event Profile</h2>
                      <span className="small-muted" style={{ display: "block", marginTop: 2 }}>Required fields that power Creative Studio &amp; Outreach AI</span>
                    </div>
                    <span className="status-pill" style={{ background: Object.values({ a: eventProfile.eventType, b: eventProfile.organizerName, c: eventProfile.eventDate }).every(Boolean) ? "#0d2a1e" : "#1a1a2e", borderColor: Object.values({ a: eventProfile.eventType, b: eventProfile.organizerName, c: eventProfile.eventDate }).every(Boolean) ? "#34d399" : "#4b5280" }}>
                      <span className="dot" style={{ background: Object.values({ a: eventProfile.eventType, b: eventProfile.organizerName, c: eventProfile.eventDate }).every(Boolean) ? "#34d399" : "#6b7280" }} />
                      {Object.values({ a: eventProfile.eventType, b: eventProfile.organizerName, c: eventProfile.eventDate }).every(Boolean) ? "Profile ready" : "Incomplete"}
                    </span>
                  </div>

                  {/* Row 1: Event Type + Format */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div className="studio-field">
                      <label>Event Type *</label>
                      <select
                        className="studio-input"
                        value={eventProfile.eventType}
                        onChange={(e) => updateEventProfile({ eventType: e.target.value as EventProfile["eventType"] })}
                      >
                        <option value="">Select type…</option>
                        {["Hackathon", "Symposium", "Workshop", "Conference", "Other"].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="studio-field">
                      <label>Format *</label>
                      <select
                        className="studio-input"
                        value={eventProfile.format}
                        onChange={(e) => updateEventProfile({ format: e.target.value as EventProfile["format"] })}
                      >
                        <option value="">Select format…</option>
                        {["Physical", "Virtual", "Hybrid"].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Event Date + Duration */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div className="studio-field">
                      <label>Event Date *</label>
                      <input
                        type="text"
                        className="studio-input"
                        placeholder="e.g. March 28–29, 2026"
                        value={eventProfile.eventDate}
                        onChange={(e) => updateEventProfile({ eventDate: e.target.value })}
                      />
                    </div>
                    <div className="studio-field">
                      <label>Duration</label>
                      <input
                        type="text"
                        className="studio-input"
                        placeholder="e.g. 2 days / 8 hours"
                        value={eventProfile.duration}
                        onChange={(e) => updateEventProfile({ duration: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Row 3: Venue */}
                  <div className="studio-field" style={{ marginBottom: 12 }}>
                    <label>Venue / Location *</label>
                    <input
                      type="text"
                      className="studio-input"
                      placeholder="e.g. Main Auditorium, KIET Group of Institutions"
                      value={eventProfile.venue}
                      onChange={(e) => updateEventProfile({ venue: e.target.value })}
                    />
                  </div>

                  {/* Row 4: Organizer Name + Email */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div className="studio-field">
                      <label>Organizer Name *</label>
                      <input
                        type="text"
                        className="studio-input"
                        placeholder="Your full name"
                        value={eventProfile.organizerName}
                        onChange={(e) => updateEventProfile({ organizerName: e.target.value })}
                      />
                    </div>
                    <div className="studio-field">
                      <label>Organizer Email</label>
                      <input
                        type="email"
                        className="studio-input"
                        placeholder="you@college.edu"
                        value={eventProfile.organizerEmail}
                        onChange={(e) => updateEventProfile({ organizerEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Row 5: Target Audience */}
                  <div className="studio-field" style={{ marginBottom: 12 }}>
                    <label>Target Audience</label>
                    <input
                      type="text"
                      className="studio-input"
                      placeholder="e.g. Computer Science students, AI researchers, startup founders"
                      value={eventProfile.targetAudience}
                      onChange={(e) => updateEventProfile({ targetAudience: e.target.value })}
                    />
                  </div>

                  {/* Row 6: Visual Style + Brand Color */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div className="studio-field">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <label style={{ margin: 0 }}>Visual Style</label>
                        <button
                          type="button"
                          className="btn"
                          style={{ fontSize: 10, padding: "3px 8px", color: "#a99cff", borderColor: "#a99cff44" }}
                          onClick={() => void suggestTheme()}
                          disabled={isSuggestingTheme}
                          title="Ask Muse Spark to suggest best theme & color palette"
                        >
                          <Sparkles size={10} /> {isSuggestingTheme ? "Suggesting…" : "Suggest Theme"}
                        </button>
                      </div>
                      <select
                        className="studio-input"
                        value={eventProfile.visualStyle}
                        onChange={(e) => updateEventProfile({ visualStyle: e.target.value as EventProfile["visualStyle"] })}
                      >
                        <option value="">Select style…</option>
                        {["Futuristic", "Minimal", "Bold", "Academic", "Playful"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="studio-field">
                      <label>Brand Color</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="color"
                          value={eventProfile.brandColor || "#7c3aed"}
                          onChange={(e) => updateEventProfile({ brandColor: e.target.value })}
                          style={{ width: 36, height: 34, borderRadius: 6, border: "1px solid #2d3555", cursor: "pointer", background: "none", padding: 2 }}
                        />
                        <input
                          type="text"
                          className="studio-input"
                          value={eventProfile.brandColor || "#7c3aed"}
                          onChange={(e) => updateEventProfile({ brandColor: e.target.value })}
                          style={{ flex: 1 }}
                          placeholder="#7c3aed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 7: Tagline with AI suggest */}
                  <div className="studio-field">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <label style={{ margin: 0 }}>Event Tagline</label>
                      <button
                        className="btn"
                        style={{ fontSize: 10, padding: "3px 8px", color: "#a99cff", borderColor: "#a99cff44" }}
                        onClick={() => void suggestTagline()}
                        disabled={isSuggestingTagline}
                        title="Ask Muse Spark to suggest a tagline"
                      >
                        <Sparkles size={10} /> {isSuggestingTagline ? "Suggesting…" : "AI Suggest"}
                      </button>
                    </div>
                    <input
                      type="text"
                      className="studio-input"
                      placeholder="Leave blank to auto-suggest or type your own"
                      value={eventProfile.tagline}
                      onChange={(e) => updateEventProfile({ tagline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="agent-box">
                  <div className="agent-title"><div className="agent-orb"><Bot size={17} /></div> OpsPilot Agent <span style={{ marginLeft: "auto", color: "#aaa0ff", fontSize: 10 }}>PREVIEW</span></div>
                  <p>Describe the outcome you want. OpsPilot will plan the steps, run tools, and record tool results and verification status.</p>
                </div>
                <div className="card">
                  <div className="section-head"><h2>What should we work on?</h2><WandSparkles size={17} color="#a99cff" /></div>
                  <label className="prompt-label" htmlFor="brief">YOUR EVENT BRIEF OR TASK</label>
                  <textarea id="brief" className="prompt-input" value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="e.g. Plan a 2-day AI hackathon for 200 participants, prepare a budget, research sponsors, and create four poster themes..." />
                  <div className="prompt-footer">
                    <span className="small-muted">
                      <Clock3 size={12} style={{ display: "inline", verticalAlign: "middle" }} />
                      {isGenerating ? " AI is working..." : " Powered by Muse Spark"}
                    </span>
                    <button
                      className="btn btn-primary"
                      onClick={() => void submitBrief()}
                      disabled={isGenerating}
                    >
                      <Sparkles size={14} />
                      {isGenerating ? "Generating..." : "Create plan"}
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Generated Plan Output */}
                {(isGenerating || plan) && (
                  <div className="card" style={{ marginTop: 16 }}>
                    <div className="section-head">
                      <h2>AI-generated event plan</h2>
                      <span className="status-pill">
                        <span className="dot" />
                        {isGenerating ? "Working" : "Ready for review"}
                      </span>
                    </div>

                    {isGenerating ? (
                      <p className="small-muted">
                        Muse Spark is organizing your schedule, tasks, budget, and risks...
                      </p>
                    ) : (
                      <>
                        <div
                          className="markdown-plan"
                          style={{
                            lineHeight: 1.7,
                            fontSize: 13,
                            color: "#d5d9e6",
                            maxHeight: 560,
                            overflowY: "auto",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {structuredPlan ? (
                            <div className="markdown-plan">
                              <h3>{structuredPlan.eventName}</h3>
                              <p>{structuredPlan.summary}</p>

                              <h3>Event Overview</h3>
                              <p>Participants: {structuredPlan.participants}</p>
                              <p>Total budget: ₹{formatInr(structuredPlan.totalBudget)}</p>

                              <h3>Task Checklist</h3>
                              <ul>
                                {structuredPlan.tasks.map((task, index) => (
                                  <li key={index}>
                                    <strong>{task.title}</strong>{" — "}{task.category}{" · "}{task.priority} priority
                                  </li>
                                ))}
                              </ul>

                              <h3>Budget Breakdown</h3>
                              <ul>
                                {structuredPlan.budget.map((item, index) => (
                                  <li key={index}>
                                    <strong>{item.category}:</strong>{" "}₹{formatInr(item.amount)}{" — "}{item.details}
                                  </li>
                                ))}
                              </ul>

                              <h3>Schedule</h3>
                              <ul>
                                {structuredPlan.schedule.map((item, index) => (
                                  <li key={index}>
                                    <strong>{item.time}</strong>{" — "}{item.activity}{item.details ? `: ${item.details}` : ""}
                                  </li>
                                ))}
                              </ul>

                              <h3>Risks & Mitigations</h3>
                              <ul>
                                {structuredPlan.risks.map((item, index) => (
                                  <li key={index}>
                                    <strong>{item.risk}</strong>{" — Mitigation: "}{item.mitigation}
                                  </li>
                                ))}
                              </ul>

                              <h3>Assumptions</h3>
                              <ul>
                                {structuredPlan.assumptions.map((item, index) => (
                                  <li key={index}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {plan}
                            </ReactMarkdown>
                          )}
                        </div>

                        <div style={{ marginTop: 16 }}>
                          <button
                            className="btn"
                            onClick={() => {
                              void navigator.clipboard.writeText(plan);
                              setNotice("Generated plan copied to clipboard.");
                            }}
                          >
                            Copy plan
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Right sidebar: budget validation + stats */}
              <div>
                {/* Stats summary */}
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="section-head"><h2>Plan summary</h2></div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#9299ad" }}>Tasks generated</span>
                      <strong>{tasks.length}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#9299ad" }}>Budget target</span>
                      <strong>{structuredPlan ? `₹${formatInr(structuredPlan.totalBudget)}` : "—"}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#9299ad" }}>Participants</span>
                      <strong>{structuredPlan?.participants ?? "—"}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#9299ad" }}>Risks identified</span>
                      <strong>{structuredPlan?.risks?.length ?? 0}</strong>
                    </div>
                  </div>
                </div>

                {/* Budget validation panel */}
                {budgetValidation && (
                  <div
                    className="card"
                    style={{
                      border: `1px solid ${
                        budgetValidation.status === "balanced"
                          ? "#34d39944"
                          : budgetValidation.status === "under_allocated"
                          ? "#fbbf2444"
                          : "#f8717144"
                      }`,
                      background: "rgba(17, 21, 33, 0.7)",
                    }}
                  >
                    <div className="section-head" style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Wallet size={16} color="#a99cff" />
                        <strong style={{ fontSize: 13 }}>Budget Validation</strong>
                      </div>
                      <span
                        className={`priority ${
                          budgetValidation.status === "balanced" ? "low" : budgetValidation.status === "under_allocated" ? "medium" : "high"
                        }`}
                        style={{ textTransform: "capitalize" }}
                      >
                        {budgetValidation.status.replace("_", " ")}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12, fontSize: 12 }}>
                      <div style={{ padding: "8px 10px", background: "#0d111c", borderRadius: 8 }}>
                        <div className="small-muted">Requested</div>
                        <strong style={{ fontSize: 14 }}>₹{formatInr(budgetValidation.requested)}</strong>
                      </div>
                      <div style={{ padding: "8px 10px", background: "#0d111c", borderRadius: 8 }}>
                        <div className="small-muted">Allocated</div>
                        <strong style={{ fontSize: 14 }}>₹{formatInr(budgetValidation.allocated)}</strong>
                      </div>
                      <div style={{ padding: "8px 10px", background: "#0d111c", borderRadius: 8 }}>
                        <div className="small-muted">Difference</div>
                        <strong style={{ fontSize: 14, color: budgetValidation.difference === 0 ? "#34d399" : budgetValidation.difference > 0 ? "#fbbf24" : "#f87171" }}>
                          {budgetValidation.difference > 0 ? "+" : ""}₹{formatInr(budgetValidation.difference)}
                        </strong>
                      </div>
                    </div>

                    {budgetValidation.warnings.length > 0 && (
                      <div style={{ margin: "8px 0", color: "#fbbf24", fontSize: 11, lineHeight: 1.5 }}>
                        {budgetValidation.warnings.map((w, idx) => (
                          <p key={idx} style={{ margin: "2px 0" }}>⚠️ {w}</p>
                        ))}
                      </div>
                    )}

                    {budgetValidation.errors.length > 0 && (
                      <div style={{ margin: "8px 0", color: "#f87171", fontSize: 11, lineHeight: 1.5 }}>
                        {budgetValidation.errors.map((e, idx) => (
                          <p key={idx} style={{ margin: "2px 0" }}>❌ {e}</p>
                        ))}
                      </div>
                    )}

                    <p className="small-muted" style={{ margin: "8px 0 0", fontSize: 10, fontStyle: "italic" }}>
                      ℹ️ {budgetValidation.disclaimer}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────── EVENT OPERATIONS TAB ─────────────────── */}
        {activeNav === "Event Operations" && (
          <div className="tab-view" key="event-ops">
            <div className="tab-header">
              <h2>Event Operations — Task Board</h2>
              <p>Approval-based execution pipeline. Review each task, approve it, and run the registered tool. Every action is recorded in the Evidence Ledger.</p>
            </div>

            {/* Priority filter + stats */}
            <div className="filter-bar">
              <div className="filter-group">
                {(["all", "high", "medium", "low"] as const).map((pf) => (
                  <button
                    key={pf}
                    className={`filter-btn ${taskPriorityFilter === pf ? "active" : ""}`}
                    onClick={() => setTaskPriorityFilter(pf)}
                    style={{ textTransform: "capitalize" }}
                  >
                    {pf === "all" ? "All tasks" : `${pf} priority`}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 11, color: "#9299ad" }}>
                <span>✅ {completed} done</span>
                <span>👍 {approved} approved</span>
                <span>⏳ {pending} pending</span>
                <span>Total: {tasks.length}</span>
              </div>
            </div>

            <div className="card">
              <div className="section-head">
                <h2>Operations checklist</h2>
                <span className="status-pill">
                  <span className="dot" />
                  {structuredPlan ? "AI-generated tasks" : "Operations checklist"}
                </span>
              </div>

              {tasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><ListChecks size={24} /></div>
                  <h3>No tasks yet</h3>
                  <p>Generate an AI plan in the AI Agent tab to create your operational task list.</p>
                </div>
              ) : (
                <div className="task-list">
                  {tasks
                    .filter((task) => taskPriorityFilter === "all" || task.priority === taskPriorityFilter)
                    .map((task) => (
                    <div
                      className="task-row"
                      key={task.id}
                      style={{ alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #1e2436" }}
                    >
                      <div style={{ flexShrink: 0 }}>
                        {task.state === "success" && <span style={{ color: "#34d399", display: "grid", placeItems: "center" }} title="Task completed successfully"><CheckCircle2 size={19} /></span>}
                        {task.state === "running" && <span style={{ color: "#a99cff", display: "grid", placeItems: "center" }} className="animate-spin" title="Executing tool..."><Loader2 size={19} /></span>}
                        {task.state === "approved" && <span style={{ color: "#60a5fa", display: "grid", placeItems: "center" }} title="Approved · Ready to execute"><ThumbsUp size={18} /></span>}
                        {task.state === "failed" && <span style={{ color: "#f87171", display: "grid", placeItems: "center" }} title="Tool execution failed"><AlertCircle size={19} /></span>}
                        {task.state === "manual_only" && <span style={{ color: "#f59e0b", display: "grid", placeItems: "center" }} title="Manual task · Requires real-world action (no automated tool)"><Square size={18} /></span>}
                        {task.state === "pending" && <span style={{ color: "#717a94", display: "grid", placeItems: "center" }} title="Awaiting organizer approval"><Clock3 size={18} /></span>}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <div
                            className="task-title"
                            style={{
                              textDecoration: task.state === "success" ? "line-through" : "none",
                              color: task.state === "success" ? "#858da2" : "#f4f6ff",
                              fontSize: 13,
                            }}
                          >
                            {task.title}
                          </div>
                          <span className={`priority ${task.priority}`}>{task.priority}</span>
                        </div>

                        <div className="task-meta" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                          <span>{task.category}</span>
                          {task.state === "manual_only" && (
                            <span style={{ background: "#261a0d", padding: "2px 6px", borderRadius: 5, fontSize: 10, color: "#f59e0b", border: "1px solid #78350f" }}>
                              Manual Action (No Tool)
                            </span>
                          )}
                          {task.toolName && (
                            <span style={{ background: "#181d2d", padding: "2px 6px", borderRadius: 5, fontSize: 10, color: "#a99cff", border: "1px solid #2a3149" }}>
                              Tool: {task.toolName}
                            </span>
                          )}
                        </div>

                        {task.error && (
                          <div style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>
                            ❌ {task.error}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {task.state === "manual_only" && (
                          <button
                            className="btn"
                            style={{ padding: "6px 12px", fontSize: 11, borderColor: "#f59e0b55", color: "#f59e0b", background: "#f59e0b10" }}
                            onClick={() => markManualTaskCompleted(task.id)}
                            title="Mark manual action as completed by organizer"
                          >
                            <CheckSquare size={12} /> Mark Complete
                          </button>
                        )}

                        {task.state === "pending" && (
                          <button
                            className="btn"
                            style={{ padding: "6px 10px", fontSize: 11, borderColor: "#3b4260", background: "#171c2c" }}
                            onClick={() => approveTask(task.id)}
                            title="Approve this task for execution"
                          >
                            <ThumbsUp size={12} /> Approve
                          </button>
                        )}

                        {task.state === "approved" && (
                          <>
                            <button
                              className="btn btn-primary"
                              style={{ padding: "6px 12px", fontSize: 11 }}
                              onClick={() => void runTask(task.id)}
                              title="Run registered tool"
                            >
                              <Play size={11} fill="currentColor" /> Run
                            </button>
                            <button
                              className="btn"
                              style={{ padding: "6px 8px", fontSize: 10, color: "#8890a5" }}
                              onClick={() => revokeApproval(task.id)}
                              title="Revoke approval"
                            >
                              Revoke
                            </button>
                          </>
                        )}

                        {task.state === "running" && (
                          <button className="btn" disabled style={{ padding: "6px 10px", fontSize: 11, opacity: 0.7 }}>
                            <Loader2 size={12} className="animate-spin" /> Running...
                          </button>
                        )}

                        {task.state === "failed" && (
                          <button
                            className="btn"
                            style={{ padding: "6px 10px", fontSize: 11, borderColor: "#ef444455", color: "#f87171" }}
                            onClick={() => approveTask(task.id)}
                            title="Re-approve task before retrying"
                          >
                            <RotateCcw size={11} /> Re-approve
                          </button>
                        )}

                        {task.state === "success" && (
                          <span style={{ fontSize: 10, color: "#34d399", background: "#10b98115", border: "1px solid #10b98130", padding: "4px 8px", borderRadius: 6, fontWeight: 600 }}>
                            Success
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────── RESEARCH & OUTREACH TAB ─────────────────── */}
        {activeNav === "Research & Outreach" && (() => {
          const researchTask = tasks.find((t) => t.toolName === "sponsor_research");
          const outreachTask = tasks.find((t) => t.toolName === "review_outreach");

          // Directory & live search
          const allSearchedSponsors = searchSponsorsAndCompanies(companySearchQuery, selectedCrCategory);
          const sectors = ["all", "Cloud Infrastructure", "Developer Tools", "AI Platforms", "Community & Hardware"];

          return (
            <div className="tab-view" key="research">
              <div className="tab-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <h2 style={{ margin: 0 }}>PR &amp; Corporate Relations (CR) Agent</h2>
                    <span className="status-pill" style={{ background: "#1a1633", borderColor: "#7c3aed66", color: "#c4b5fd" }}>
                      <Bot size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                      Autonomous PR/CR Agent
                    </span>
                  </div>
                  <p>
                    Autonomous PR &amp; CR intelligence engine. Search prospective companies &amp; sponsors, inspect corporate strategic fit, and draft bespoke partnership pitches, DevRel tracks, and press releases on your behalf.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {researchTask && (
                    <button
                      className={`btn ${researchTask.state === "approved" ? "btn-primary" : ""}`}
                      style={{ fontSize: 11, padding: "7px 12px" }}
                      onClick={() => {
                        if (researchTask.state === "pending") approveTask(researchTask.id);
                        void runTask(researchTask.id);
                      }}
                    >
                      <Sparkles size={13} /> {researchTask.state === "success" ? "Re-run sponsor_research" : "Run sponsor_research"}
                    </button>
                  )}
                  {outreachTask && (
                    <button
                      className={`btn ${outreachTask.state === "approved" ? "btn-primary" : ""}`}
                      style={{ fontSize: 11, padding: "7px 12px" }}
                      onClick={() => {
                        if (outreachTask.state === "pending") approveTask(outreachTask.id);
                        void runTask(outreachTask.id);
                      }}
                    >
                      <Mail size={13} /> {outreachTask.state === "success" ? "Re-run review_outreach" : "Run review_outreach"}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>
                {/* ─── Column 1: PR & CR Prospect Discovery & Company Search ─── */}
                <div>
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="section-head" style={{ marginBottom: 12 }}>
                      <div>
                        <h2>Corporate Sponsors &amp; PR Opportunities</h2>
                        <span className="small-muted" style={{ display: "block", marginTop: 2 }}>
                          {allSearchedSponsors.length} prospective companies · Real-time search across developer grants &amp; PR angles
                        </span>
                      </div>
                      <span className="status-pill">
                        <span className="dot" style={{ background: "#34d399" }} />
                        {allSearchedSponsors.length} Targets
                      </span>
                    </div>

                    {/* PR & CR Company Search Bar */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ position: "relative" }}>
                        <Search
                          size={14}
                          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8a93aa" }}
                        />
                        <input
                          type="text"
                          className="studio-input"
                          style={{ paddingLeft: 34, fontSize: 12, background: "#090d18" }}
                          value={companySearchQuery}
                          onChange={(e) => setCompanySearchQuery(e.target.value)}
                          placeholder="Search companies &amp; sponsors (e.g. Google Cloud, NVIDIA, GitHub, Postman, MongoDB, Stripe, Red Bull...)"
                        />
                        {companySearchQuery && (
                          <button
                            type="button"
                            onClick={() => setCompanySearchQuery("")}
                            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#8a93aa", cursor: "pointer" }}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sector Filters */}
                    <div className="sponsor-sector-filters" style={{ marginBottom: 14 }}>
                      {sectors.map((sec) => {
                        const count = sec === "all"
                          ? SPONSOR_PROGRAM_DIRECTORY.length
                          : SPONSOR_PROGRAM_DIRECTORY.filter((s) => s.sector === sec).length;
                        return (
                          <button
                            key={sec}
                            className={`sector-filter-btn ${selectedCrCategory === sec ? "active" : ""}`}
                            onClick={() => setSelectedCrCategory(sec)}
                          >
                            {sec === "all" ? "All Companies" : sec} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Company Dossiers List */}
                    {allSearchedSponsors.length === 0 ? (
                      <div className="empty-state" style={{ padding: "24px 16px" }}>
                        <Building2 size={24} style={{ color: "#7a849d" }} />
                        <h4 style={{ margin: "8px 0 4px 0" }}>No Companies Matching &ldquo;{companySearchQuery}&rdquo;</h4>
                        <p style={{ fontSize: 12, color: "#8a93aa" }}>Try searching for &quot;Cloud&quot;, &quot;AI&quot;, &quot;API&quot;, or click below to clear.</p>
                        <button type="button" className="btn btn-primary" style={{ marginTop: 8, fontSize: 11 }} onClick={() => setCompanySearchQuery("")}>
                          Reset Search
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {allSearchedSponsors.map((sp, idx) => (
                          <div key={idx} className="sponsor-card-v2" style={{ borderLeft: "3px solid #7c3aed" }}>
                            <div className="sponsor-card-v2-header">
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                                  <h4 style={{ margin: 0, fontSize: 14, color: "#f4f6ff", fontWeight: 600 }}>{sp.name}</h4>
                                  <span className={`sponsor-tier-badge ${sp.tier}`}>{sp.tierLabel}</span>
                                </div>
                                <span style={{ fontSize: 11, color: "#79f0b5", fontWeight: 600 }}>
                                  🎁 {sp.typicalContribution}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                <a
                                  href={sp.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn"
                                  style={{ padding: "4px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                                  title="Open official company developer / grant program link"
                                >
                                  Portal <ExternalLink size={11} />
                                </a>
                              </div>
                            </div>

                            {/* CR Strategic Alignment & PR Angle */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6, margin: "6px 0" }}>
                              {sp.crStrategicFit && (
                                <div style={{ background: "#0a0f1d", padding: "6px 10px", borderRadius: 6, border: "1px solid #1a2238", fontSize: 11 }}>
                                  <strong style={{ color: "#60a5fa" }}>🏢 CR Strategic Value:</strong>{" "}
                                  <span style={{ color: "#c8cedf" }}>{sp.crStrategicFit}</span>
                                </div>
                              )}
                              {sp.prPressHook && (
                                <div style={{ background: "#0a0f1d", padding: "6px 10px", borderRadius: 6, border: "1px solid #1a2238", fontSize: 11 }}>
                                  <strong style={{ color: "#f472b6" }}>📰 PR &amp; Media Hook:</strong>{" "}
                                  <span style={{ color: "#c8cedf" }}>{sp.prPressHook}</span>
                                </div>
                              )}
                            </div>

                            {/* Pitch Angle Box */}
                            <div className="sponsor-pitch-box">
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                <strong style={{ fontSize: 11, color: "#c4bbff" }}>🎯 Recommended Pitch Angle:</strong>
                                <button
                                  type="button"
                                  className="btn"
                                  style={{ padding: "2px 7px", fontSize: 10, borderRadius: 6 }}
                                  onClick={() => {
                                    void navigator.clipboard.writeText(sp.recommendedPitchAngle);
                                    setCopiedPitchAngle(sp.name);
                                    setTimeout(() => setCopiedPitchAngle(null), 2500);
                                  }}
                                >
                                  {copiedPitchAngle === sp.name ? (
                                    <>
                                      <Check size={10} style={{ color: "#34d399", display: "inline", marginRight: 3 }} /> Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={10} style={{ display: "inline", marginRight: 3 }} /> Copy Pitch
                                    </>
                                  )}
                                </button>
                              </div>
                              <span>{sp.recommendedPitchAngle}</span>
                            </div>

                            {/* Suggested Offerings / Deliverables Matrix */}
                            {sp.suggestedOfferings && sp.suggestedOfferings.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                                {sp.suggestedOfferings.map((off, oIdx) => (
                                  <span
                                    key={oIdx}
                                    style={{
                                      fontSize: 10,
                                      background: "#121829",
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                      color: "#94a3b8",
                                      border: "1px solid #202942",
                                    }}
                                  >
                                    ✓ {off}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Action Buttons: 3 Autonomous Strategy Drafts */}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: "1px solid #1a2238" }}>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: "4px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                                onClick={() => handleSelectCompanyForOutreach(sp, "corporate_relations")}
                                title="Draft formal corporate sponsorship proposal"
                              >
                                <Briefcase size={11} /> 🏢 Draft CR Pitch
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: "4px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4, borderColor: "#38bdf844", color: "#38bdf8" }}
                                onClick={() => handleSelectCompanyForOutreach(sp, "devrel_api")}
                                title="Draft developer relations challenge track pitch"
                              >
                                <Sparkles size={11} /> 🚀 Draft DevRel Track
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: "4px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4, borderColor: "#f472b644", color: "#f472b6" }}
                                onClick={() => handleSelectCompanyForOutreach(sp, "pr_media")}
                                title="Draft PR and press announcement pitch"
                              >
                                <Mail size={11} /> 📰 Draft PR Pitch
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Source Transparency Disclaimer */}
                    <div className="ops-banner" style={{ marginTop: 14, fontSize: 10.5 }} suppressHydrationWarning>
                      <ShieldCheck size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                      Directory-based sponsor intelligence with official verified URLs and last-checked timestamps. All outreach remains strictly in local draft mode.
                    </div>
                  </div>
                </div>

                {/* ─── Column 2: PR & Corporate Relations (CR) Autonomous Agent Console ─── */}
                <div>
                  <div className="card">
                    <div className="section-head" style={{ marginBottom: 12 }}>
                      <div>
                        <h2>PR &amp; CR Autonomous Agent</h2>
                        <span className="small-muted" style={{ display: "block", marginTop: 2 }}>
                          Powered by Muse Spark · Generates bespoke, highly persuasive sponsorship proposals, DevRel tracks &amp; press releases
                        </span>
                      </div>
                      <span className="status-pill">
                        <span className="dot" style={{ background: generatedMail ? "#34d399" : "#a99cff" }} />
                        {generatedMail ? "Draft Ready" : "CR Agent Ready"}
                      </span>
                    </div>

                    {/* Strategy Mode Switcher */}
                    <div style={{ background: "#0e1322", padding: 10, borderRadius: 8, border: "1px solid #1f273d", marginBottom: 12 }}>
                      <label className="prompt-label" style={{ marginBottom: 6, display: "block", color: "#c4bbff" }}>
                        PR &amp; CR STRATEGY OBJECTIVE
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {[
                          { id: "corporate_relations", label: "🏢 Corporate Relations", desc: "Financial sponsorship, tier packages & recruiting" },
                          { id: "devrel_api", label: "🚀 DevRel & API Track", desc: "Challenge bounty, tool credits & mentor slots" },
                          { id: "pr_media", label: "📰 PR & Media Pitch", desc: "Press releases, keynotes & impact coverage" },
                          { id: "inkind_swag", label: "🎁 In-Kind Perks & Swag", desc: "Attendee kits, food/beverage & tool access" },
                        ].map((strat) => (
                          <button
                            key={strat.id}
                            type="button"
                            className={`btn ${mailForm.outreachType === strat.id ? "btn-primary" : ""}`}
                            style={{
                              fontSize: 11,
                              padding: "6px 8px",
                              textAlign: "left",
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                            onClick={() => {
                              setMailForm({ ...mailForm, outreachType: strat.id as typeof mailForm.outreachType });
                            }}
                          >
                            <strong>{strat.label}</strong>
                            <span style={{ fontSize: 9.5, opacity: 0.8 }}>{strat.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step 1: Organizer Identity */}
                    <div style={{ background: "#0e1322", padding: 12, borderRadius: 8, border: "1px solid #1f273d", marginBottom: 12 }}>
                      <label className="prompt-label" style={{ marginBottom: 8, display: "block" }}>
                        1. SENDER IDENTITY (ON BEHALF OF ORGANIZER)
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                        <div className="studio-field">
                          <label>Organizer Name *</label>
                          <input
                            type="text"
                            className="studio-input"
                            value={eventProfile.organizerName}
                            onChange={(e) => updateEventProfile({ organizerName: e.target.value })}
                            placeholder="e.g. Abhisht Singh"
                          />
                        </div>
                        <div className="studio-field">
                          <label>Organizer Email</label>
                          <input
                            type="email"
                            className="studio-input"
                            value={eventProfile.organizerEmail}
                            onChange={(e) => updateEventProfile({ organizerEmail: e.target.value })}
                            placeholder="e.g. organizer@institution.edu"
                          />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div className="studio-field">
                          <label>Role / Persona</label>
                          <input
                            type="text"
                            className="studio-input"
                            value={mailForm.organizerRole}
                            onChange={(e) => setMailForm({ ...mailForm, organizerRole: e.target.value })}
                            placeholder="e.g. Head of Corporate Relations"
                          />
                        </div>
                        <div className="studio-field">
                          <label>Organization / College</label>
                          <input
                            type="text"
                            className="studio-input"
                            value={mailForm.organizationName}
                            onChange={(e) => setMailForm({ ...mailForm, organizationName: e.target.value })}
                            placeholder="e.g. Dept. of CSE / Tech Club"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Prospective Partner Context */}
                    <div style={{ background: "#0e1322", padding: 12, borderRadius: 8, border: "1px solid #1f273d", marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <label className="prompt-label" style={{ margin: 0 }}>
                          2. TARGET PROSPECTIVE COMPANY
                        </label>
                        <span className="small-muted" style={{ fontSize: 10 }}>Select company from left to auto-fill</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                        <div className="studio-field">
                          <label>Company Name *</label>
                          <input
                            type="text"
                            className="studio-input"
                            value={mailForm.sponsorCompanyName}
                            onChange={(e) => setMailForm({ ...mailForm, sponsorCompanyName: e.target.value })}
                            placeholder="e.g. NVIDIA / Google Cloud / GitHub"
                          />
                        </div>
                        <div className="studio-field">
                          <label>Target Program / Department</label>
                          <input
                            type="text"
                            className="studio-input"
                            value={mailForm.sponsorProgramName}
                            onChange={(e) => setMailForm({ ...mailForm, sponsorProgramName: e.target.value })}
                            placeholder="e.g. Inception / DevRel &amp; Campus Outreach"
                          />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div className="studio-field">
                          <label>Recipient Name</label>
                          <input
                            type="text"
                            className="studio-input"
                            value={mailForm.recipientName}
                            onChange={(e) => setMailForm({ ...mailForm, recipientName: e.target.value })}
                            placeholder="e.g. Partnerships Lead"
                          />
                        </div>
                        <div className="studio-field">
                          <label>Recipient Department / Channel</label>
                          <input
                            type="text"
                            className="studio-input"
                            value={mailForm.recipientRole}
                            onChange={(e) => setMailForm({ ...mailForm, recipientRole: e.target.value })}
                            placeholder="e.g. Developer Relations Lead"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Value Exchange & PR Angle */}
                    <div style={{ background: "#0e1322", padding: 12, borderRadius: 8, border: "1px solid #1f273d", marginBottom: 12 }}>
                      <label className="prompt-label" style={{ marginBottom: 8, display: "block" }}>
                        3. VALUE PROPOSITION &amp; MUTUAL ROI
                      </label>
                      <div className="studio-field" style={{ marginBottom: 8 }}>
                        <label>What are you asking for? (The Specific Ask) *</label>
                        <input
                          type="text"
                          className="studio-input"
                          value={mailForm.sponsorAsk}
                          onChange={(e) => setMailForm({ ...mailForm, sponsorAsk: e.target.value })}
                          placeholder="e.g. ₹50,000 Challenge Track Sponsorship &amp; Cloud credits for 200 builders"
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                        <div className="studio-field">
                          <label>Corporate Relations Fit (ROI for Company)</label>
                          <input
                            type="text"
                            className="studio-input"
                            value={mailForm.crStrategicFit}
                            onChange={(e) => setMailForm({ ...mailForm, crStrategicFit: e.target.value })}
                            placeholder="e.g. Talent recruiting &amp; API consumption"
                          />
                        </div>
                        <div className="studio-field">
                          <label>Tone of Voice</label>
                          <select
                            className="studio-input"
                            value={mailForm.tone}
                            onChange={(e) => setMailForm({ ...mailForm, tone: e.target.value as "formal" | "friendly" | "concise" })}
                          >
                            <option value="formal">Formal &amp; Institutional (CR Proposal)</option>
                            <option value="friendly">Engaging &amp; Developer-Centric</option>
                            <option value="concise">Direct &amp; Executive Summary</option>
                          </select>
                        </div>
                      </div>
                      <div className="studio-field">
                        <label>PR Story Hook &amp; Extra Context</label>
                        <textarea
                          className="studio-input"
                          rows={2}
                          value={mailForm.extraContext}
                          onChange={(e) => setMailForm({ ...mailForm, extraContext: e.target.value })}
                          placeholder="e.g. Highlighting real-world student solutions; dedicated 30-min workshop slot; access to 250+ opt-in attendee portfolios."
                        />
                      </div>
                    </div>

                    {mailGenError && (
                      <div className="ops-banner" style={{ marginBottom: 12, borderColor: "#f87171", color: "#f87171", fontSize: 11 }}>
                        <AlertCircle size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                        {mailGenError}
                      </div>
                    )}

                    {/* Primary Generate Button */}
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: "8px 18px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                        onClick={() => void generateMailFromAI()}
                        disabled={isGeneratingMail}
                      >
                        {isGeneratingMail ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                        {isGeneratingMail ? "Synthesizing PR & CR Proposal…" : "✨ Draft Pitch with PR & CR Agent"}
                      </button>
                      {generatedMail && (
                        <span className="small-muted" style={{ fontSize: 11, color: "#34d399" }}>
                          ✓ Proposal synthesized by PR/CR Agent
                        </span>
                      )}
                    </div>

                    {/* ─── Generated Email Pitch Output Stage ─── */}
                    {generatedMail && (
                      <div className="email-draft-container" style={{ marginTop: 8 }}>
                        <div className="email-meta-row">
                          <span className="email-meta-label">To:</span>
                          <span className="email-meta-value">
                            {mailForm.recipientName || mailForm.recipientRole || "Partnerships Lead"} &lt;{mailForm.sponsorCompanyName}&gt;
                          </span>
                        </div>
                        <div className="email-meta-row">
                          <span className="email-meta-label">From:</span>
                          <span className="email-meta-value">
                            {eventProfile.organizerName || "Organizer"} ({mailForm.organizerRole || "Corporate Relations"}, {mailForm.organizationName || activeProject.name})
                          </span>
                        </div>
                        <div className="email-meta-row" style={{ alignItems: "center" }}>
                          <span className="email-meta-label">Subject:</span>
                          <input
                            type="text"
                            className="studio-input"
                            value={generatedMail.subject}
                            onChange={(e) => setGeneratedMail({ ...generatedMail, subject: e.target.value })}
                            style={{ flex: 1, fontWeight: 600, fontSize: 12, padding: "4px 8px" }}
                          />
                        </div>

                        {/* Editable Email Body */}
                        <div style={{ marginTop: 10 }}>
                          <label className="prompt-label" style={{ fontSize: 10, marginBottom: 4, display: "block" }}>
                            PROPOSAL BODY (EDITABLE BEFORE SENDING)
                          </label>
                          <textarea
                            className="studio-input"
                            rows={12}
                            value={generatedMail.body}
                            onChange={(e) => setGeneratedMail({ ...generatedMail, body: e.target.value })}
                            style={{ fontFamily: "inherit", fontSize: 12, lineHeight: 1.6, padding: 12 }}
                          />
                        </div>

                        {/* PR Angle & Mutual ROI Badges */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6, marginTop: 10 }}>
                          {generatedMail.prAngleSummary && (
                            <div style={{ fontSize: 11, color: "#f472b6", background: "#160d1b", borderRadius: 6, padding: "6px 10px", border: "1px solid #3b1742" }}>
                              <strong>📰 PR Narrative Angle:</strong> {generatedMail.prAngleSummary}
                            </div>
                          )}
                          {generatedMail.crValueExchange && (
                            <div style={{ fontSize: 11, color: "#60a5fa", background: "#0d1424", borderRadius: 6, padding: "6px 10px", border: "1px solid #1a284c" }}>
                              <strong>🏢 Corporate Value Exchange:</strong> {generatedMail.crValueExchange}
                            </div>
                          )}
                          {generatedMail.reasoning && (
                            <div style={{ fontSize: 11, color: "#8a93aa", background: "#0d111c", borderRadius: 6, padding: "6px 10px", border: "1px solid #1c2236" }}>
                              <strong style={{ color: "#a99cff" }}>Agent Strategy:</strong> {generatedMail.reasoning}
                            </div>
                          )}
                        </div>

                        {/* Actions Toolbar */}
                        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              className="btn"
                              style={{ padding: "7px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}
                              onClick={() => {
                                const fullEmail = `Subject: ${generatedMail.subject}\nTo: ${mailForm.sponsorCompanyName}\n\n${generatedMail.body}`;
                                void navigator.clipboard.writeText(fullEmail);
                                setCopiedGeneratedMail(true);
                                setTimeout(() => setCopiedGeneratedMail(false), 2500);
                              }}
                            >
                              {copiedGeneratedMail ? <Check size={12} style={{ color: "#34d399" }} /> : <Copy size={12} />}
                              {copiedGeneratedMail ? "Copied Full Pitch!" : "Copy Full Pitch"}
                            </button>

                            <a
                              href={`mailto:?subject=${encodeURIComponent(generatedMail.subject)}&body=${encodeURIComponent(generatedMail.body)}`}
                              className="btn"
                              style={{ padding: "7px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}
                            >
                              <ExternalLink size={12} /> Open in Mail App
                            </a>
                          </div>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: "7px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}
                              onClick={() => {
                                const newDraft = {
                                  id: `mail-${Date.now()}`,
                                  sponsorCompany: mailForm.sponsorCompanyName,
                                  programName: mailForm.sponsorProgramName,
                                  outreachType: mailForm.outreachType,
                                  subject: generatedMail.subject,
                                  body: generatedMail.body,
                                  reasoning: generatedMail.reasoning,
                                  prAngleSummary: generatedMail.prAngleSummary,
                                  crValueExchange: generatedMail.crValueExchange,
                                  reviewed: true,
                                  createdAt: new Date().toISOString(),
                                };
                                const updated = [newDraft, ...savedMailDrafts.filter((d) => d.sponsorCompany !== mailForm.sponsorCompanyName)];
                                setSavedMailDrafts(updated);
                                const newRecord: EvidenceRecord = {
                                  id: genId(),
                                  action: `Saved PR & CR email draft for ${mailForm.sponsorCompanyName}`,
                                  toolName: "review_outreach",
                                  status: "success",
                                  details: `Subject: "${generatedMail.subject}"`,
                                  timestamp: new Date().toISOString(),
                                  isExternalVerified: false,
                                };
                                const nextEvidence = [newRecord, ...evidence];
                                setEvidence(nextEvidence);
                                updateActiveProjectData({ savedOutreachEmails: updated, evidence: nextEvidence });
                                setNotice(`Saved PR & CR proposal for "${mailForm.sponsorCompanyName}" to pipeline.`);
                              }}
                            >
                              <FileCheck2 size={12} /> Save to CR Pipeline
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Saved Corporate Relations Pipeline */}
                    {savedMailDrafts.length > 0 && (
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #1f273d" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <strong style={{ fontSize: 12, color: "#e2e6f5" }}>CR Outreach Pipeline ({savedMailDrafts.length})</strong>
                          <span className="small-muted" style={{ fontSize: 10 }}>Tracked in &ldquo;{activeProject.name}&rdquo;</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {savedMailDrafts.map((draft) => (
                            <div
                              key={draft.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "8px 10px",
                                background: "#0d111c",
                                borderRadius: 6,
                                border: "1px solid #1c2236",
                                fontSize: 11,
                              }}
                            >
                              <div>
                                <strong style={{ color: "#a99cff" }}>{draft.sponsorCompany}</strong>
                                <span style={{ color: "#7a849d", marginLeft: 8 }}>{draft.subject.slice(0, 36)}…</span>
                                {draft.outreachType && (
                                  <span style={{ marginLeft: 6, fontSize: 9.5, background: "#1c2438", padding: "1px 5px", borderRadius: 4, color: "#93c5fd" }}>
                                    {draft.outreachType.replace("_", " ")}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <button
                                  type="button"
                                  className="btn"
                                  style={{ padding: "2px 7px", fontSize: 10 }}
                                  onClick={() => {
                                    setMailForm({
                                      ...mailForm,
                                      sponsorCompanyName: draft.sponsorCompany,
                                      sponsorProgramName: draft.programName || "",
                                      outreachType: (draft.outreachType as typeof mailForm.outreachType) || "corporate_relations",
                                    });
                                    setGeneratedMail({
                                      subject: draft.subject,
                                      body: draft.body,
                                      reasoning: draft.reasoning || "",
                                      prAngleSummary: draft.prAngleSummary,
                                      crValueExchange: draft.crValueExchange,
                                    });
                                    setNotice(`Loaded saved PR/CR proposal for ${draft.sponsorCompany}.`);
                                  }}
                                >
                                  Load
                                </button>
                                <button
                                  type="button"
                                  className="btn"
                                  style={{ padding: "2px 7px", fontSize: 10, color: "#f87171" }}
                                  onClick={() => {
                                    const nextDrafts = savedMailDrafts.filter((d) => d.id !== draft.id);
                                    setSavedMailDrafts(nextDrafts);
                                    updateActiveProjectData({ savedOutreachEmails: nextDrafts });
                                    setNotice(`Removed pitch for ${draft.sponsorCompany}.`);
                                  }}
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strict Local Safety Notice Banner */}
                    <div className="safety-notice-banner" style={{ marginTop: 14 }} suppressHydrationWarning>
                      <ShieldCheck size={16} style={{ flexShrink: 0, color: "#38bdf8" }} />
                      <div>
                        <strong>Safety Policy Enforced:</strong> All outreach emails are generated and stored strictly in local draft mode. No emails or external messages are ever dispatched automatically without organizer review and action.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─────────────────── CREATIVE STUDIO TAB ─────────────────── */}
        {activeNav === "Creative Studio" && (
          <div className="tab-view" key="creative">
            <div className="tab-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h2 style={{ margin: 0 }}>Creative Studio</h2>
                  <span className="status-pill" style={{ background: "#1a1633", borderColor: "#7c3aed66", color: "#c4b5fd" }}>
                    <Sparkles size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    Meta AI muse-image-1.0 &amp; Vector Studio
                  </span>
                </div>
                <p>
                  Generate authentic, high-resolution generative AI imagery using Meta AI&apos;s <code>muse-image-1.0</code> model via live API calls, or craft deterministic typography-perfect vector posters.
                </p>
              </div>

              {/* View mode switcher */}
              <div style={{ display: "flex", gap: 6, background: "#131726", padding: 4, borderRadius: 10, border: "1px solid #232a3e" }}>
                <button
                  className={`btn ${studioViewMode === "visual" ? "btn-primary" : ""}`}
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() => setStudioViewMode("visual")}
                >
                  <Palette size={13} /> Studio Editor
                </button>
                <button
                  className={`btn ${studioViewMode === "gallery" ? "btn-primary" : ""}`}
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() => setStudioViewMode("gallery")}
                >
                  <Layers size={13} /> Asset Gallery ({creatives.length})
                </button>
                <button
                  className={`btn ${studioViewMode === "svgCode" ? "btn-primary" : ""}`}
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() => setStudioViewMode("svgCode")}
                >
                  <Code2 size={13} /> Vector Source
                </button>
              </div>
            </div>

            {/* Hidden canvas for high-resolution PNG generation */}
            <canvas ref={hiddenCanvasRef} style={{ display: "none" }} />

            {/* Fullscreen Zoom Modal for Meta AI Artwork */}
            {aiImageZoomOpen && generatedAiImage && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(3, 7, 18, 0.88)",
                  backdropFilter: "blur(8px)",
                  zIndex: 9999,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 24,
                }}
                onClick={() => setAiImageZoomOpen(false)}
              >
                <div
                  style={{
                    maxWidth: "90vw",
                    maxHeight: "85vh",
                    position: "relative",
                    background: "#090d18",
                    borderRadius: 12,
                    padding: 12,
                    border: "1px solid #2b354f",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "#c4bbff", fontWeight: 600 }}>
                      Generated Artwork · Meta AI muse-image-1.0 ({DIMENSIONS[studioDimension].label})
                    </span>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: "2px 8px", fontSize: 11 }}
                      onClick={() => setAiImageZoomOpen(false)}
                    >
                      <X size={13} /> Close
                    </button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={generatedAiImage.imageUrl}
                    alt="Generated artwork zoom"
                    style={{
                      maxHeight: "72vh",
                      maxWidth: "85vw",
                      borderRadius: 8,
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                    <button type="button" className="btn btn-primary" onClick={handleDownloadAiImage} style={{ fontSize: 11 }}>
                      <Download size={12} /> Download High-Res
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW MODE 1: STUDIO EDITOR */}
            {studioViewMode === "visual" && (
              <div>
                {/* Engine Selector Bar: Meta AI Image vs Vector Studio */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16, background: "#0b0f1c", padding: 6, borderRadius: 10, border: "1px solid #1a2238" }}>
                  <button
                    type="button"
                    className={`btn ${creativeEngineMode === "meta_ai_image" ? "btn-primary" : ""}`}
                    style={{ flex: 1, padding: "8px 14px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                    onClick={() => setCreativeEngineMode("meta_ai_image")}
                  >
                    <Sparkles size={14} /> 🤖 Meta AI Image Model (muse-image-1.0)
                  </button>
                  <button
                    type="button"
                    className={`btn ${creativeEngineMode === "vector_poster" ? "btn-primary" : ""}`}
                    style={{ flex: 1, padding: "8px 14px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                    onClick={() => setCreativeEngineMode("vector_poster")}
                  >
                    <Palette size={14} /> 📐 Vector Typographic Studio (Exact-Text SVG)
                  </button>
                </div>

                {/* ════════════ ENGINE A: META AI IMAGE GENERATION (muse-image-1.0) ════════════ */}
                {creativeEngineMode === "meta_ai_image" && (
                  <div className="studio-layout">
                    {/* Left Column: Meta AI Image Controls */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div className="card">
                        <div className="section-head" style={{ marginBottom: 12 }}>
                          <div>
                            <h2>Meta AI Image Generator</h2>
                            <span className="small-muted" style={{ display: "block", marginTop: 2 }}>
                              Model: <code>muse-image-1.0</code> via Meta AI API · Generates true AI visual artwork
                            </span>
                          </div>
                          <span className="status-pill">
                            <span className="dot" style={{ background: generatedAiImage ? "#34d399" : "#a99cff" }} />
                            {generatedAiImage ? "Artwork Ready" : "muse-image-1.0"}
                          </span>
                        </div>

                        {/* Step 1: Prompt */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <label className="prompt-label" style={{ margin: 0 }}>
                              1. VISUAL ARTWORK PROMPT *
                            </label>
                            <button
                              type="button"
                              className="btn"
                              style={{ fontSize: 10, padding: "2px 8px", color: "#a99cff", borderColor: "#a99cff44" }}
                              onClick={() => {
                                const p = `Futuristic keynote promotional artwork for ${activeProject.name || "AI Innovation Summit"}, cyberpunk neon aesthetic with deep obsidian background, glowing holographic nodes, neural network circuits, and dramatic cinematic lighting.`;
                                setAiImagePrompt(p);
                                setNotice("Auto-filled prompt from active project!");
                              }}
                              title="Auto-fill creative prompt from active project"
                            >
                              <Sparkles size={11} /> Auto-fill from Plan
                            </button>
                          </div>

                          <textarea
                            className="prompt-input"
                            style={{ minHeight: 75, fontSize: 12 }}
                            value={aiImagePrompt}
                            onChange={(e) => setAiImagePrompt(e.target.value)}
                            placeholder={`e.g. "High-octane hackathon banner for AI Summit 2026, cyberpunk neon style with holographic glowing nodes and dark background, ultra-detailed 8k resolution"`}
                          />

                          {/* Quick Prompt Starters for muse-image */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                            {[
                              {
                                label: "⚡ Cyberpunk AI Hackathon",
                                prompt: `High-voltage, futuristic promotional artwork for ${activeProject.name || "AI Hackathon 2026"}. Deep dark obsidian background, glowing violet and cyan neon accents, holographic neural net HUD, and ultra-detailed 8k aesthetic.`,
                              },
                              {
                                label: "🎬 Cinematic Keynote Stage",
                                prompt: `Dramatic cinematic stage keynote graphic for ${activeProject.name || "Global AI Conference"}. Sleek architectural lines, volumetric blue rim lighting, elegant modern typography placeholder, stadium-scale stage view.`,
                              },
                              {
                                label: "🎓 Modern AI Workshop",
                                prompt: `Clean, vibrant educational design for ${activeProject.name || "Hands-on AI Workshop"}. Geometric abstract data visualizations, floating glowing code particles, emerald and mint gradient accents on deep space navy.`,
                              },
                              {
                                label: "🏆 ₹1.2L Championship Demo Day",
                                prompt: `Glorious tech competition championship poster for ${activeProject.name || "Demo Day"}. Glowing geometric trophy icon, celebratory volumetric light beams, cyber gold and electric purple energy waves.`,
                              },
                            ].map((starter, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                className="btn"
                                style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "#0e1322", borderColor: "#232b42" }}
                                onClick={() => {
                                  setAiImagePrompt(starter.prompt);
                                  setNotice(`Applied prompt template: "${starter.label}".`);
                                }}
                              >
                                {starter.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Step 2: Meta AI Visual Style & Canvas Specs */}
                        <div style={{ background: "#0e1322", padding: 12, borderRadius: 8, border: "1px solid #1f273d", marginBottom: 14 }}>
                          <label className="prompt-label" style={{ marginBottom: 8, display: "block" }}>
                            2. META AI IMAGE PARAMETERS
                          </label>

                          {/* Dimensions Toolbar */}
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: "#c4cbe0", fontWeight: 500 }}>Aspect Ratio &amp; Target Format</span>
                              <span className="small-muted" style={{ fontSize: 10 }}>{DIMENSIONS[studioDimension].label}</span>
                            </div>
                            <div className="studio-toolbar">
                              {(["1:1", "16:9", "9:16"] as const).map((dim) => (
                                <button
                                  key={dim}
                                  type="button"
                                  className={`dimension-badge ${studioDimension === dim ? "active" : ""}`}
                                  onClick={() => setStudioDimension(dim)}
                                >
                                  {DIMENSIONS[dim].label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Visual Style Preset */}
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: "#c4cbe0", fontWeight: 500 }}>Artwork Aesthetic</span>
                              <span className="small-muted" style={{ fontSize: 10 }}>Style Guidance</span>
                            </div>
                            <div className="studio-toolbar">
                              {[
                                "Cyberpunk Neon 3D",
                                "Cinematic Keynote",
                                "Minimalist Tech",
                                "Retro Hacker Terminal",
                                "3D Isometric Lab",
                              ].map((styleOpt) => (
                                <button
                                  key={styleOpt}
                                  type="button"
                                  className={`dimension-badge ${aiImageStyle === styleOpt ? "active" : ""}`}
                                  onClick={() => setAiImageStyle(styleOpt)}
                                >
                                  {styleOpt}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Color Mood & Lighting */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div className="studio-field">
                              <label>Color Mood &amp; Palette</label>
                              <input
                                type="text"
                                className="studio-input"
                                value={aiImageColorMood}
                                onChange={(e) => setAiImageColorMood(e.target.value)}
                                placeholder="e.g. Electric Violet & Obsidian Cyan"
                              />
                            </div>
                            <div className="studio-field">
                              <label>Extra Visual Directives</label>
                              <input
                                type="text"
                                className="studio-input"
                                value={aiImageExtraDetails}
                                onChange={(e) => setAiImageExtraDetails(e.target.value)}
                                placeholder="e.g. 8k crisp artwork, no blur"
                              />
                            </div>
                          </div>
                        </div>

                        {aiImageError && (
                          <div className="ops-banner" style={{ marginBottom: 12, borderColor: "#f87171", color: "#f87171", fontSize: 11 }}>
                            <AlertCircle size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                            {aiImageError}
                          </div>
                        )}

                        {/* Primary Generate Button */}
                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: "8px 20px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                            onClick={() => void generateImageFromMetaAI()}
                            disabled={isGeneratingAiImage}
                          >
                            {isGeneratingAiImage ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                            {isGeneratingAiImage ? "Calling Meta AI muse-image-1.0…" : "✨ Generate Image with Meta AI"}
                          </button>
                          {generatedAiImage && (
                            <span className="small-muted" style={{ fontSize: 11, color: "#34d399" }}>
                              ✓ Rendered with muse-image-1.0
                            </span>
                          )}
                        </div>

                        {/* AI Iterative Refinement Bar */}
                        {generatedAiImage && (
                          <div style={{ background: "#0d111c", padding: 12, borderRadius: 8, border: "1px solid #1f273d" }}>
                            <label className="prompt-label" style={{ marginBottom: 6, display: "block", color: "#a99cff" }}>
                              🔄 REFINE WITH META AI (PROMPT ITERATION)
                            </label>
                            <div style={{ display: "flex", gap: 8 }}>
                              <input
                                type="text"
                                className="studio-input"
                                value={aiImageRefinePrompt}
                                onChange={(e) => setAiImageRefinePrompt(e.target.value)}
                                placeholder="e.g. Add glowing holographic circuits, enhance purple rim lighting..."
                                style={{ flex: 1, fontSize: 12 }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && aiImageRefinePrompt.trim()) {
                                    void generateImageFromMetaAI(`${aiImagePrompt}. Refinement: ${aiImageRefinePrompt}`);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ fontSize: 11, padding: "6px 14px", flexShrink: 0 }}
                                disabled={isGeneratingAiImage || !aiImageRefinePrompt.trim()}
                                onClick={() => {
                                  void generateImageFromMetaAI(`${aiImagePrompt}. Refinement: ${aiImageRefinePrompt}`);
                                }}
                              >
                                Refine
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Live Render Stage for Meta AI Artwork */}
                    <div className="preview-stage">
                      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                          <strong style={{ fontSize: 13, color: "#fff" }}>Meta AI Artwork Canvas</strong>
                          <div className="small-muted" style={{ fontSize: 10 }}>
                            muse-image-1.0 · {DIMENSIONS[studioDimension].label}
                          </div>
                        </div>
                        <span className="creative-badge-tag" style={{ background: "#7c3aed22", borderColor: "#7c3aed66", color: "#c4b5fd" }}>
                          Meta AI Active
                        </span>
                      </div>

                      {/* Display Generated Meta AI Image */}
                      <div
                        className="preview-canvas-wrapper"
                        style={{
                          aspectRatio: DIMENSIONS[studioDimension].aspectRatio,
                          maxHeight: studioDimension === "9:16" ? 540 : 440,
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#080c18",
                          border: "1px solid #1f273d",
                          borderRadius: 10,
                          position: "relative",
                        }}
                      >
                        {generatedAiImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={generatedAiImage.imageUrl}
                            alt="Generated Meta AI Artwork"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: studioDimension === "16:9" ? "cover" : "contain",
                              borderRadius: 8,
                              display: "block",
                            }}
                          />
                        ) : (
                          <div style={{ textAlign: "center", padding: 24, color: "#7a849d" }}>
                            <ImagePlus size={40} style={{ margin: "0 auto 12px auto", opacity: 0.5 }} />
                            <h4 style={{ margin: "0 0 6px 0", color: "#e2e6f5" }}>No AI Artwork Generated Yet</h4>
                            <p style={{ fontSize: 11, maxWidth: 300, margin: "0 auto 12px auto", lineHeight: 1.5 }}>
                              Enter your creative prompt on the left and click <strong>&quot;Generate Image with Meta AI&quot;</strong> to call the <code>muse-image-1.0</code> model.
                            </p>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ fontSize: 11, padding: "6px 14px" }}
                              onClick={() => {
                                setAiImagePrompt(`High-octane hackathon banner for ${activeProject.name || "AI Hackathon 2026"}, cyberpunk neon style with holographic glowing nodes and dark background, ultra-detailed 8k resolution`);
                                void generateImageFromMetaAI(`High-octane hackathon banner for ${activeProject.name || "AI Hackathon 2026"}, cyberpunk neon style with holographic glowing nodes and dark background, ultra-detailed 8k resolution`);
                              }}
                              disabled={isGeneratingAiImage}
                            >
                              <Sparkles size={12} /> Generate Demo Artwork
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Meta AI Reasoning Box */}
                      {generatedAiImage?.reasoning && (
                        <div style={{ marginTop: 10, padding: "8px 12px", background: "#0c1120", borderRadius: 8, border: "1px solid #1c253d", fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
                          <strong style={{ color: "#a99cff" }}>🤖 Meta AI Visual Plan:</strong>
                          <div style={{ marginTop: 2, whiteSpace: "pre-line" }}>{generatedAiImage.reasoning}</div>
                        </div>
                      )}

                      {/* Actions Bar */}
                      {generatedAiImage && (
                        <div className="studio-actions-bar" style={{ marginTop: 12 }}>
                          <button className="btn btn-primary" onClick={handleDownloadAiImage} title="Download high-resolution generated WebP image">
                            <Download size={13} /> Download Image
                          </button>
                          <button className="btn" onClick={handleSaveAiImageToProject} title="Save this AI image to project gallery and record audit trail">
                            <CheckCircle2 size={13} color="#80dfb0" /> Save to Gallery
                          </button>
                          <button className="btn" onClick={() => setAiImageZoomOpen(true)} title="View full-size in zoom modal">
                            <Maximize2 size={13} /> Fullscreen Zoom
                          </button>
                        </div>
                      )}

                      <p className="small-muted" style={{ textAlign: "center", marginTop: 14, fontSize: 10 }}>
                        Powered by Meta AI <code>muse-image-1.0</code> · Generates 8k-aesthetic event imagery via live endpoint call.
                      </p>
                    </div>
                  </div>
                )}

                {/* ════════════ ENGINE B: VECTOR TYPOGRAPHIC POSTER STUDIO ════════════ */}
                {creativeEngineMode === "vector_poster" && (
                  <div className="studio-layout">
                    {/* Left Column: Vector Controls */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div className="card">
                        <div className="section-head" style={{ marginBottom: 12 }}>
                          <div>
                            <h2>Vector Typographic Studio</h2>
                            <span className="small-muted" style={{ display: "block", marginTop: 2 }}>
                              Powered by Muse Spark · Synthesizes exact-text, scalable vector layouts
                            </span>
                          </div>
                          <span className="status-pill">
                            <span className="dot" style={{ background: aiCreativeLayout ? "#34d399" : "#a99cff" }} />
                            {aiCreativeLayout ? "AI Synthesized" : "Vector Studio"}
                          </span>
                        </div>

                        {/* Creative Prompt */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <label className="prompt-label" style={{ margin: 0 }}>
                              DESCRIBE VECTOR POSTER LAYOUT *
                            </label>
                            <button
                              type="button"
                              className="btn"
                              style={{ fontSize: 10, padding: "2px 8px", color: "#a99cff", borderColor: "#a99cff44" }}
                              onClick={handleAutoFillCopy}
                              title="Auto-fill prompt and details from active project plan"
                            >
                              <Sparkles size={11} /> Auto-fill from Plan
                            </button>
                          </div>

                          <textarea
                            className="prompt-input"
                            style={{ minHeight: 70, fontSize: 12 }}
                            value={creativePrompt}
                            onChange={(e) => setCreativePrompt(e.target.value)}
                            placeholder={`e.g. "Clean, modern educational event poster for our AI Workshop with headline, badge, and date"`}
                          />
                        </div>

                        {/* Parameters */}
                        <div style={{ background: "#0e1322", padding: 12, borderRadius: 8, border: "1px solid #1f273d", marginBottom: 14 }}>
                          <label className="prompt-label" style={{ marginBottom: 8, display: "block" }}>
                            CANVAS &amp; THEME PRESETS
                          </label>

                          <div style={{ marginBottom: 12 }}>
                            <div className="studio-toolbar">
                              {(["1:1", "16:9", "9:16"] as const).map((dim) => (
                                <button
                                  key={dim}
                                  type="button"
                                  className={`dimension-badge ${studioDimension === dim ? "active" : ""}`}
                                  onClick={() => setStudioDimension(dim)}
                                >
                                  {DIMENSIONS[dim].label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div style={{ marginBottom: 12 }}>
                            <div className="studio-toolbar">
                              {(["neon", "minimal", "bold", "emerald"] as const).map((tKey) => (
                                <button
                                  key={tKey}
                                  type="button"
                                  className={`dimension-badge ${studioTheme === tKey ? "active" : ""}`}
                                  onClick={() => setStudioTheme(tKey)}
                                >
                                  {tKey === "neon" && "🌌 Neon Cyberpunk"}
                                  {tKey === "minimal" && "✨ Minimal Pro"}
                                  {tKey === "bold" && "🔥 High-Impact Violet"}
                                  {tKey === "emerald" && "🌿 Emerald Terminal"}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                            <div className="studio-field">
                              <label>Headline</label>
                              <input
                                type="text"
                                className="studio-input"
                                value={posterContent.headline}
                                onChange={(e) => setPosterContent({ ...posterContent, headline: e.target.value })}
                              />
                            </div>
                            <div className="studio-field">
                              <label>Badge</label>
                              <input
                                type="text"
                                className="studio-input"
                                value={posterContent.badge}
                                onChange={(e) => setPosterContent({ ...posterContent, badge: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>

                        {creativeGenError && (
                          <div className="ops-banner" style={{ marginBottom: 12, borderColor: "#f87171", color: "#f87171", fontSize: 11 }}>
                            <AlertCircle size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                            {creativeGenError}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: "8px 18px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                            onClick={() => void generateCreativeFromAI()}
                            disabled={isGeneratingCreative}
                          >
                            {isGeneratingCreative ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                            {isGeneratingCreative ? "Synthesizing Vector…" : "✨ Generate Vector Layout"}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ fontSize: 11, padding: "7px 12px" }}
                            onClick={() => {
                              setPosterContent(generateDefaultCopy(activeProject.name, activeProject.brief, activeProject.targetBudget));
                              setNotice("Reset poster content to clean defaults.");
                            }}
                          >
                            <RefreshCw size={11} /> Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Vector Render Stage */}
                    <div className="preview-stage">
                      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                          <strong style={{ fontSize: 13, color: "#fff" }}>Vector Preview</strong>
                          <div className="small-muted" style={{ fontSize: 10 }}>
                            {THEMES[studioTheme].name} · {DIMENSIONS[studioDimension].label}
                          </div>
                        </div>
                        <span className="creative-badge-tag">
                          {DIMENSIONS[studioDimension].width}×{DIMENSIONS[studioDimension].height}
                        </span>
                      </div>

                      <div
                        className="preview-canvas-wrapper"
                        style={{
                          aspectRatio: DIMENSIONS[studioDimension].aspectRatio,
                          maxHeight: studioDimension === "9:16" ? 540 : 440,
                        }}
                      >
                        <div
                          className="preview-svg-container"
                          dangerouslySetInnerHTML={{
                            __html: generatePosterSvg(posterContent, studioTheme, studioDimension),
                          }}
                        />
                      </div>

                      <div className="studio-actions-bar">
                        <button className="btn btn-primary" onClick={handleDownloadPng} title="Export 300 DPI high-resolution PNG">
                          <Download size={13} /> Download PNG
                        </button>
                        <button className="btn" onClick={handleDownloadSvg} title="Export scalable vector SVG file">
                          <FileDown size={13} /> Download SVG
                        </button>
                        <button className="btn" onClick={handleSaveCreativeToProject} title="Save this creative to project gallery">
                          <CheckCircle2 size={13} color="#80dfb0" /> Save Asset
                        </button>
                        <button
                          className="btn"
                          onClick={() => {
                            const svg = generatePosterSvg(posterContent, studioTheme, studioDimension);
                            void navigator.clipboard.writeText(svg);
                            setNotice("Scalable vector SVG code copied to clipboard.");
                          }}
                          title="Copy vector SVG markup to clipboard"
                        >
                          <Copy size={13} /> Copy SVG
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW MODE 2: ASSET GALLERY */}
            {studioViewMode === "gallery" && (
              <div className="card">
                <div className="section-head" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h2>Project Creative Assets ({creatives.length})</h2>
                    <p className="small-muted">Saved posters, Meta AI generated imagery, and marketing assets for &ldquo;{activeProject.name}&rdquo;.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setStudioViewMode("visual")}>
                    <Plus size={13} /> Create New Asset
                  </button>
                </div>

                {creatives.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon"><Palette size={24} /></div>
                    <h3>No Saved Creative Assets</h3>
                    <p>Use the Studio Editor to generate Meta AI imagery or design vector posters for this project.</p>
                    <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setStudioViewMode("visual")}>
                      Open Studio Editor
                    </button>
                  </div>
                ) : (
                  <div className="gallery-grid">
                    {creatives.map((creative) => (
                      <div key={creative.id} className="saved-asset-card">
                        {creative.imageUrl ? (
                          <div className="saved-asset-preview" style={{ padding: 0, overflow: "hidden", background: "#080c18" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={creative.imageUrl}
                              alt={creative.title}
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            />
                          </div>
                        ) : (
                          <div
                            className="saved-asset-preview"
                            dangerouslySetInnerHTML={{
                              __html: generatePosterSvg(creative.content, creative.theme, creative.dimension),
                            }}
                          />
                        )}
                        <div className="saved-asset-body">
                          <strong style={{ fontSize: 12, color: "#fff" }}>{creative.title}</strong>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span className="creative-badge-tag" style={{ textTransform: "capitalize" }}>
                              {creative.type === "ai_generated_image" ? "🤖 Meta AI" : (THEMES[creative.theme]?.name || creative.theme)}
                            </span>
                            <span className="small-muted" style={{ fontSize: 10 }}>
                              {DIMENSIONS[creative.dimension]?.label || creative.dimension}
                            </span>
                          </div>
                          <div className="small-muted" style={{ fontSize: 10, marginTop: 4 }} suppressHydrationWarning>
                            {formatDisplayDate(creative.createdAt)}
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                            {creative.imageUrl ? (
                              <button
                                className="btn btn-primary"
                                style={{ padding: "4px 8px", fontSize: 11, flex: 1 }}
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.download = `${creative.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.webp`;
                                  link.href = creative.imageUrl!;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  setNotice(`Downloaded artwork "${creative.title}".`);
                                }}
                              >
                                <Download size={11} /> Download
                              </button>
                            ) : (
                              <button
                                className="btn btn-primary"
                                style={{ padding: "4px 8px", fontSize: 11, flex: 1 }}
                                onClick={() => handleLoadCreative(creative)}
                              >
                                <Palette size={11} /> Load in Editor
                              </button>
                            )}
                            <button
                              className="btn"
                              style={{ padding: "4px 7px", fontSize: 11, color: "#f87171", borderColor: "#f8717144" }}
                              onClick={() => handleDeleteCreative(creative.id)}
                              title="Delete from project gallery"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW MODE 3: VECTOR SOURCE CODE */}
            {studioViewMode === "svgCode" && (
              <div className="card">
                <div className="section-head" style={{ justifyContent: "space-between" }}>
                  <div>
                    <h2>Scalable Vector Graphics (SVG) Source</h2>
                    <p className="small-muted">Direct vector code for import into Figma, Adobe Illustrator, or web rendering.</p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const svg = generatePosterSvg(posterContent, studioTheme, studioDimension);
                      void navigator.clipboard.writeText(svg);
                      setNotice("Vector SVG markup copied to clipboard.");
                    }}
                  >
                    <Copy size={13} /> Copy Vector SVG
                  </button>
                </div>
                <pre className="code-block" style={{ maxHeight: 420 }}>
                  <code>{generatePosterSvg(posterContent, studioTheme, studioDimension)}</code>
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────── EVIDENCE LEDGER TAB ─────────────────── */}
        {activeNav === "Evidence Ledger" && (
          <div className="tab-view" key="evidence">
            <div className="card">
              <div className="section-head" style={{ flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2>Evidence Ledger</h2>
                  <p className="small-muted">
                    Tamper-evident audit trail of organizer approvals and tool executions.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setExportFormat("markdown");
                      setIsExportModalOpen(true);
                    }}
                    style={{ fontSize: 11, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5 }}
                    title="Export complete verifiable audit package"
                  >
                    <FileDown size={13} /> Export Audit Package
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear all locally recorded evidence? This action cannot be undone.")) {
                        setEvidence([]);
                        updateActiveProjectData({ evidence: [] });
                        setNotice("Evidence ledger cleared.");
                      }
                    }}
                    disabled={evidence.length === 0}
                    style={{ color: "#f87171", borderColor: "#f8717133" }}
                  >
                    <Trash2 size={13} /> Clear records
                  </button>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "16px 0", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 5 }}>
                  {(["all", "success", "failed", "pending"] as const).map((filterOpt) => (
                    <button
                      key={filterOpt}
                      className={`filter-btn ${evidenceFilter === filterOpt ? "active" : ""}`}
                      style={{ textTransform: "capitalize" }}
                      onClick={() => setEvidenceFilter(filterOpt)}
                    >
                      {filterOpt}
                    </button>
                  ))}
                </div>

                <div style={{ marginLeft: "auto", minWidth: 200, flex: "1 1 200px" }}>
                  <input
                    type="text"
                    placeholder="Search actions or tools..."
                    value={evidenceSearch}
                    onChange={(e) => setEvidenceSearch(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#0d111c",
                      border: "1px solid #282e42",
                      borderRadius: 8,
                      padding: "7px 12px",
                      color: "#f4f6ff",
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div className="ops-banner" style={{ marginBottom: 16 }} suppressHydrationWarning>
                <ShieldCheck size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 7 }} />
                Every entry records the exact tool, input summary, outcome, and timestamp. Local executions are clearly distinguished from external integrations.
              </div>

              {evidence.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><FileCheck2 size={24} /></div>
                  <h3>No evidence records yet</h3>
                  <p>Approve and execute a task in Event Operations to generate your first audit record.</p>
                </div>
              ) : (
                <div className="task-list">
                  {evidence
                    .filter((record) => {
                      if (evidenceFilter !== "all" && record.status !== evidenceFilter) return false;
                      if (evidenceSearch.trim()) {
                        const q = evidenceSearch.toLowerCase();
                        return (
                          record.action.toLowerCase().includes(q) ||
                          record.details.toLowerCase().includes(q) ||
                          (record.toolName && record.toolName.toLowerCase().includes(q))
                        );
                      }
                      return true;
                    })
                    .map((record) => (
                      <div
                        className="task-row"
                        key={record.id}
                        style={{ alignItems: "flex-start", padding: "14px 0", borderBottom: "1px solid #1e2436" }}
                      >
                        <div className="activity-icon" style={{ marginTop: 2 }}>
                          {record.status === "success" ? (
                            <CheckCircle2 size={16} color="#34d399" />
                          ) : record.status === "failed" ? (
                            <AlertCircle size={16} color="#f87171" />
                          ) : (
                            <FileCheck2 size={16} color="#a99cff" />
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <strong style={{ fontSize: 13, color: "#f4f6ff" }}>{record.action}</strong>
                            {record.toolName && (
                              <span style={{ background: "#181d2d", border: "1px solid #2d344b", color: "#a99cff", borderRadius: 5, fontSize: 10, padding: "2px 6px" }}>
                                Tool: {record.toolName}
                              </span>
                            )}
                            <span
                              style={{
                                background: record.isExternalVerified ? "#10b98120" : "#6366f115",
                                border: `1px solid ${record.isExternalVerified ? "#10b98144" : "#6366f133"}`,
                                color: record.isExternalVerified ? "#34d399" : "#a5b4fc",
                                borderRadius: 5,
                                fontSize: 9,
                                padding: "2px 6px",
                                fontWeight: 600,
                              }}
                            >
                              {record.isExternalVerified ? "External Verified" : "Local Verified Engine"}
                            </span>
                          </div>

                          <div className="task-meta" style={{ marginTop: 6, color: "#b3b9cc", fontSize: 11 }}>
                            {record.details}
                          </div>

                          <div className="task-meta" style={{ marginTop: 6, fontSize: 10, color: "#687086" }} suppressHydrationWarning>
                            {formatDateTime(record.timestamp)}
                            {record.taskId && <span> · Task ID: {record.taskId}</span>}
                            {record.externalResourceId && (
                              <span style={{ color: "#34d399" }}> · Resource ID: {record.externalResourceId}</span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`priority ${
                            record.status === "success" ? "low" : record.status === "failed" ? "high" : "medium"
                          }`}
                          style={{ textTransform: "capitalize" }}
                        >
                          {record.status}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────── SETTINGS & DOCS TAB ─────────────────── */}
        {activeNav === "Settings & Docs" && (
          <div className="tab-view" key="settings">
            <div className="tab-header">
              <h2>Settings & Documentation</h2>
              <p>View integration status, configure database adapters, and access deployment documentation.</p>
            </div>

            {/* Integration Status */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="section-head"><h2>Integration Status</h2></div>
              <div className="settings-grid">
                <div className="settings-item">
                  <div className="settings-icon connected"><Zap size={17} /></div>
                  <div>
                    <div className="settings-label">Muse Spark API</div>
                    <div className="settings-value">Connected · Model API key configured in .env.local</div>
                  </div>
                </div>
                <div className="settings-item">
                  <div className="settings-icon connected"><ShieldCheck size={17} /></div>
                  <div>
                    <div className="settings-label">Execution Engine</div>
                    <div className="settings-value">Active · State machine verified · {Object.keys(toolRegistry.listTools()).length} tools registered</div>
                  </div>
                </div>
                <div className="settings-item">
                  <div className="settings-icon info"><Database size={17} /></div>
                  <div>
                    <div className="settings-label">Database</div>
                    <div className="settings-value">Using localStorage · Supabase/Firebase adapter available for production</div>
                  </div>
                </div>
                <div className="settings-item">
                  <div className="settings-icon disconnected"><CalendarDays size={17} /></div>
                  <div>
                    <div className="settings-label">Google Calendar / Email</div>
                    <div className="settings-value">Not configured · OAuth credentials required in .env.local</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Registered tools */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="section-head"><h2>Registered Tools</h2></div>
              <div className="task-list">
                {Object.entries(toolRegistry.listTools()).map(([name, desc]) => (
                  <div key={name} className="task-row" style={{ padding: "10px 0", gap: 12 }}>
                    <div className="activity-icon"><WandSparkles size={14} /></div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 12, color: "#f4f6ff" }}>{name}</strong>
                      <div className="task-meta">{String(desc)}</div>
                    </div>
                    <span style={{ fontSize: 10, color: "#34d399", background: "#10b98115", border: "1px solid #10b98130", padding: "3px 8px", borderRadius: 5, fontWeight: 600 }}>
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Documentation */}
            <div className="card">
              <div className="section-head"><h2>Documentation & Demo</h2></div>

              <div className="docs-block">
                <h4>🎯 Demo Scenario: College AI Hackathon</h4>
                <p>To demonstrate OpsPilot at a hackathon:</p>
                <ol>
                  <li>Navigate to <strong>AI Agent</strong> and enter: &ldquo;Plan a 2-day AI hackathon for 200 students with ₹1,00,000 budget&rdquo;</li>
                  <li>Review the generated plan with tasks, budget, schedule, and risks</li>
                  <li>Open <strong>Event Operations</strong> and approve tasks one-by-one</li>
                  <li>Run each tool (validate_budget, sponsor_research, etc.) and watch evidence records appear</li>
                  <li>Check the <strong>Evidence Ledger</strong> for a complete audit trail</li>
                  <li>Use <strong>Creative Studio</strong> to configure poster specs with dimensions and styles</li>
                </ol>
              </div>

              <div className="docs-block">
                <h4>🏗️ Architecture</h4>
                <p>
                  <strong>Frontend:</strong> Next.js 15 + React 19 + Tailwind CSS v4<br />
                  <strong>AI Engine:</strong> Muse Spark via <code>/api/plan</code> server route<br />
                  <strong>Execution Engine:</strong> State machine (<code>pending → approved → running → success/failed</code>)<br />
                  <strong>Tool Registry:</strong> <code>validate_budget</code>, <code>finalize_brief</code>, <code>sponsor_research</code>, <code>generate_creatives</code>, <code>review_outreach</code><br />
                  <strong>Persistence:</strong> localStorage with multi-project support (database adapter ready)
                </p>
              </div>

              <div className="docs-block">
                <h4>🔧 Local Setup</h4>
                <p>
                  1. Clone the repo and run <code>npm install</code><br />
                  2. Create <code>.env.local</code> with <code>MODEL_API_KEY</code> and <code>META_API_BASE_URL</code><br />
                  3. Run <code>npm run dev</code> to start on <code>localhost:3000</code><br />
                  4. Run <code>npm test</code> to execute all 16+ unit tests
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────── EXPORT PACKAGE MODAL ─────────────────── */}
        {isExportModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(6, 8, 14, 0.8)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 20,
            }}
            onClick={() => setIsExportModalOpen(false)}
          >
            <div
              style={{
                background: "#0f1322",
                border: "1px solid #283049",
                borderRadius: 14,
                width: "100%",
                maxWidth: 860,
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #20273c",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#141829",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FileDown size={18} color="#a99cff" />
                    <h3 style={{ margin: 0, fontSize: 16, color: "#f4f6ff", fontWeight: 700 }}>
                      Export Project Operations Package
                    </h3>
                  </div>
                  <span style={{ fontSize: 11, color: "#8d96ad", marginTop: 2, display: "block" }}>
                    Verified operations report for judges, mentors, and institutional sponsors · {activeProject.name}
                  </span>
                </div>
                <button
                  className="btn"
                  style={{ padding: "6px", borderRadius: 8 }}
                  onClick={() => setIsExportModalOpen(false)}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Format Switcher & Actions Toolbar */}
              <div
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid #1c2235",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  background: "#0c0f1c",
                }}
              >
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className={`btn ${exportFormat === "markdown" ? "btn-primary" : ""}`}
                    style={{ fontSize: 12, padding: "6px 12px" }}
                    onClick={() => setExportFormat("markdown")}
                  >
                    <FileText size={13} /> Executive Markdown (.md)
                  </button>
                  <button
                    className={`btn ${exportFormat === "json" ? "btn-primary" : ""}`}
                    style={{ fontSize: 12, padding: "6px 12px" }}
                    onClick={() => setExportFormat("json")}
                  >
                    <Code2 size={13} /> Machine-Readable JSON (.json)
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn"
                    style={{ fontSize: 12, padding: "6px 12px" }}
                    onClick={() => {
                      const text =
                        exportFormat === "markdown"
                          ? generateProjectMarkdownReport(activeProject)
                          : JSON.stringify(generateProjectJsonPackage(activeProject), null, 2);
                      void navigator.clipboard.writeText(text);
                      setCopiedExportNotice(true);
                      setTimeout(() => setCopiedExportNotice(false), 2500);
                      setNotice(`Copied project ${exportFormat.toUpperCase()} package to clipboard.`);
                    }}
                  >
                    {copiedExportNotice ? (
                      <>
                        <Check size={13} color="#34d399" style={{ marginRight: 4 }} /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={13} style={{ marginRight: 4 }} /> Copy Content
                      </>
                    )}
                  </button>

                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: "6px 14px" }}
                    onClick={() => {
                      const dateSlug = new Date().toISOString().slice(0, 10);
                      const safeName = activeProject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                      if (exportFormat === "markdown") {
                        const content = generateProjectMarkdownReport(activeProject);
                        downloadReportFile(`${safeName}-report-${dateSlug}.md`, content, "text/markdown");
                      } else {
                        const content = JSON.stringify(generateProjectJsonPackage(activeProject), null, 2);
                        downloadReportFile(`${safeName}-package-${dateSlug}.json`, content, "application/json");
                      }
                      setNotice(`Downloaded ${exportFormat.toUpperCase()} operations package.`);
                    }}
                  >
                    <Download size={13} style={{ marginRight: 4 }} /> Download {exportFormat === "markdown" ? ".md Report" : ".json Bundle"}
                  </button>
                </div>
              </div>

              {/* Live Preview Area */}
              <div
                style={{
                  padding: 16,
                  overflowY: "auto",
                  flex: 1,
                  background: "#080b14",
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 11.5,
                    lineHeight: 1.6,
                    color: "#cad1e5",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {exportFormat === "markdown"
                    ? generateProjectMarkdownReport(activeProject)
                    : JSON.stringify(generateProjectJsonPackage(activeProject), null, 2)}
                </pre>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "10px 20px",
                  borderTop: "1px solid #1c2235",
                  background: "#101424",
                  fontSize: 11,
                  color: "#7e88a2",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  Includes {tasks.length} tasks · {evidence.length} evidence records · {(creatives || []).length} creative specs
                </span>
                <span style={{ color: "#34d399", fontWeight: 600 }}>
                  ✔ Tamper-evident local audit trail verified
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
