# OpsPilot

OpsPilot is an AI-powered operations workspace for event planning, combining agentic task execution, evidence logging, and a multi-theme Creative Studio.

## Current status

- **Multi-Project Workspace**: Create and switch between isolated operational projects with persistent localStorage storage. Pre-seeded demo projects are clearly labeled `[Demo]` and isolated from real project data.
- **Server-Side AI Agent (`/api/plan`)**: Connects to Meta Model API (`muse-spark-1.3`) for structured JSON plans.
- **Deterministic Tool Registry & State Machine**: Approval-based execution pipeline (`pending` → `approved` → `running` → `success`/`failed`). Tasks without a registered tool start in `manual_only` state and cannot be silently routed to `finalize_brief`.
- **Mathematical Budget Validator**: Rigorous arithmetic validation with INR format parsing (`validate_budget`). Validates mathematical consistency of a budget breakdown — does **not** verify external vendor quotations or live prices.
- **Evidence Ledger**: Chronological append-only audit log stored in local browser workspace. **Not cryptographically signed or tamper-proof.** Each record is labeled with its verification level (`local`, `external_response`, or `independently_verified`).
- **Exact-Text Creative Studio**: Deterministic SVG template rendering engine. Not AI image generation.
  - 4 curated themes: 🌌 Neon Futuristic, ✨ Minimal Pro, 🔥 Campus Bold, 🌿 Cyber Emerald
  - 3 standard aspect ratios: Square (1:1, 1080×1080), Landscape (16:9, 1920×1080), Portrait (9:16, 1080×1920)
  - One SVG generated per tool call for the selected dimension. Use "Download PNG" or "Download SVG" to export.
  - Live SVG preview, 300 DPI canvas PNG download, vector SVG export, and saved asset gallery.
- **Sponsor Intelligence & Outreach Review Pipeline**:
  - Source-backed developer grants directory (Google Cloud, AWS Activate, GitHub Campus, Postman, MongoDB, Vercel) with verified portal links.
  - Results are **directory matches only** (`isLiveSearch: false`) — program eligibility and availability must be confirmed by the organizer before outreach.
  - Bespoke multi-tier outreach pitch drafts with organizer review gate. Outreach email placeholders (e.g. `[Your Contact Email]`) must be filled by the organizer before use.
  - Strict local draft mode: no emails or network requests dispatched automatically.
- **Project & Evidence Export Engine**:
  - Executive Markdown report (`.md`) and machine-readable JSON bundle (`.json`) — both returned as actual content in tool results.
  - In-app Export Modal with live syntax preview, clipboard copy, and browser download.
  - Evidence ledger accurately labeled as local workspace audit log — not externally verified.

## Accuracy & trust guarantees

- Sponsor directory results are **never** labeled "Evidence Verified" or "Externally Verified". Only real external API responses can produce that label.
- Budget validation is strictly mathematical arithmetic. It does not query vendors or market prices.
- If the project brief lacks an explicit target budget, the system will ask the organizer to confirm the budget before running budget validation — the AI's estimate is surfaced as a proposal, not silently adopted.
- All tool results are labeled `local_execution` or `local_artifact`. External integrations (Supabase, Firebase, etc.) have **not been implemented** and are not claimed.

## Requirements

- Node.js 20.9+
- npm

## Run locally

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000.

## Milestones Roadmap

- [x] **Milestone 1**: Verify Meta Model API access and model IDs.
- [x] **Milestone 2**: Implement server-side agent route with structured outputs (`/api/plan`).
- [x] **Milestone 3**: Add deterministic tools: budget calculator, task creator, validation state machine.
- [x] **Milestone 4**: Store tasks and evidence records with project workspace persistence.
- [x] **Milestone 5**: Integrate exact-text template rendering engine and multi-theme creative asset generator.
- [x] **Milestone 6**: Add source-backed sponsor research, verified grant criteria, and outreach review pipeline with safety policy.
- [x] **Milestone 7**: Add full project operations and evidence export engine (Markdown & JSON package).
- [x] **Milestone 8**: Audit and correctness improvements — remove false verification claims, fix task mapping, enforce approval gate, accurate labeling.

## Security

- Never expose API keys in browser code.
- Never commit `.env.local`.
- Require user approval for external side effects such as sending emails.
- Mark demo/sample data clearly; only mark actions complete based on real tool results.
- Every tool execution requires explicit organizer approval. Approval and execution are separate steps.
