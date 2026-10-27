# OpsPilot

OpsPilot is an AI-powered operations workspace concept combining agentic task execution, event operations, evidence-based verification, and a multi-theme Creative Studio.

## Current status

This is the first UI scaffold:
- Interactive task checklist
- Event operations dashboard
- Event brief input
- Illustrative creative-theme previews
- Responsive layout
- No live AI, database, search, or image-generation integration yet

## Requirements

- Node.js 20.9+
- npm

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Next milestones

1. Verify Meta Model API access and exact model IDs in the hackathon account.
2. Implement a server-side agent route with structured outputs.
3. Add deterministic tools: create task, calculate budget, validate deadlines.
4. Store tasks and evidence records.
5. Integrate supported image generation and exact-text template rendering.
6. Add source-backed sponsor research only after a search provider is configured.

## Security

- Never expose API keys in browser code.
- Never commit `.env.local`.
- Require user approval for external side effects such as sending emails.
- Mark demo/sample data clearly; only mark actions complete based on real tool results.
