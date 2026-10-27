"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bot, CalendarDays, Check, ChevronRight,
  CircleHelp, Clock3, FileCheck2, FolderKanban, ImagePlus, LayoutDashboard,
  ListChecks, Mail, Palette, Plus, Search, Settings2, ShieldCheck, Sparkles,
  Target, WandSparkles, Wallet, Zap
} from "lucide-react";

type Task = { id: number; title: string; meta: string; priority: "high" | "medium" | "low"; done: boolean };

const initialTasks: Task[] = [
  { id: 1, title: "Finalize hackathon event brief", meta: "Today · Event operations", priority: "high", done: true },
  { id: 2, title: "Prepare sponsor research shortlist", meta: "Today · Research agent", priority: "high", done: false },
  { id: 3, title: "Validate ₹1,20,000 prize budget", meta: "Tomorrow · Budget manager", priority: "medium", done: false },
  { id: 4, title: "Generate registration announcement creatives", meta: "Tomorrow · Creative Studio", priority: "medium", done: false },
  { id: 5, title: "Review outreach email drafts", meta: "31 Oct · Outreach assistant", priority: "low", done: false },
];

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "AI Agent", icon: Bot },
  { label: "Event Operations", icon: CalendarDays },
  { label: "Research & Outreach", icon: Search },
  { label: "Creative Studio", icon: Palette },
  { label: "Evidence Ledger", icon: ShieldCheck },
];

export default function Home() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [tasks, setTasks] = useState(initialTasks);
  const [brief, setBrief] = useState("");
  const [notice, setNotice] = useState("Demo workspace loaded. AI execution is not connected yet.");
  const completed = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);

  function toggleTask(id: number) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
    setNotice("Task status updated locally. This starter does not yet persist data to a database.");
  }

  function submitBrief() {
    if (!brief.trim()) {
      setNotice("Enter an event goal or instruction first.");
      return;
    }
    setNotice("Brief captured in the UI. Next step: connect the server-side Meta API agent route.");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Zap size={20} fill="currentColor" /></div>
          <div className="brand-name">Ops<span>Pilot</span></div>
        </div>

        <div>
          <div className="nav-label">WORKSPACE</div>
          <nav className="nav-list">
            {navItems.map(({ label, icon: Icon }) => (
              <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => { setActiveNav(label); setNotice(`${label} selected. Module navigation is a UI prototype at this stage.`); }}>
                <Icon size={17} className="nav-icon" /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div>
          <div className="nav-label">MANAGE</div>
          <nav className="nav-list">
            <button className="nav-item" onClick={() => setNotice("Settings will be implemented after the core agent flow.")}><Settings2 size={17} className="nav-icon" /> Settings</button>
            <button className="nav-item" onClick={() => setNotice("Help documentation will be added with the first working workflow.")}><CircleHelp size={17} className="nav-icon" /> Help & docs</button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <strong><Sparkles size={14} style={{ display: "inline", marginRight: 6, color: "#a99cff" }} /> MVP build progress</strong>
          <p>Start with one complete workflow: brief → plan → execute → verify.</p>
          <div className="progress-track"><div className="progress-fill" /></div>
          <p style={{ marginTop: 8 }}>Prototype stage · API not connected</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">AI OPERATIONS WORKSPACE</div>
            <h1>Good morning. Let&apos;s get things done.</h1>
            <p className="subtitle">Plan events, execute operational tasks, verify results, and create on-brand campaign assets from one place.</p>
          </div>
          <div className="top-actions">
            <button className="btn" onClick={() => setNotice("Notifications are a planned feature.")}><Activity size={15} /> Activity</button>
            <div className="avatar">OP</div>
          </div>
        </header>

        <section className="grid stats">
          <div className="card">
            <div className="stat-top"><span>Tasks completed</span><span className="stat-icon"><ListChecks size={17}/></span></div>
            <div className="stat-number">{completed}<span style={{ color: "#737b91", fontSize: 16 }}> / {tasks.length}</span></div>
            <div className="stat-note"><ArrowUpRight size={12} style={{ display: "inline", color: "#80dfb0" }}/> Demo workspace tasks</div>
          </div>
          <div className="card">
            <div className="stat-top"><span>Budget planned</span><span className="stat-icon"><Wallet size={17}/></span></div>
            <div className="stat-number">₹1.2L</div>
            <div className="stat-note">Example event budget · not verified</div>
          </div>
          <div className="card">
            <div className="stat-top"><span>Creative concepts</span><span className="stat-icon"><Palette size={17}/></span></div>
            <div className="stat-number">03</div>
            <div className="stat-note">Illustrative UI previews</div>
          </div>
          <div className="card">
            <div className="stat-top"><span>Evidence records</span><span className="stat-icon"><ShieldCheck size={17}/></span></div>
            <div className="stat-number">00</div>
            <div className="stat-note">No external actions executed</div>
          </div>
        </section>

        <section className="grid content-grid">
          <div className="card">
            <div className="section-head">
              <h2>Event operations</h2>
              <span className="status-pill"><span className="dot"/> Demo data</span>
            </div>
            <p className="small-muted">Build and track the work behind your next event.</p>
            <div className="task-list">
              {tasks.map((task) => (
                <div className="task-row" key={task.id}>
                  <button aria-label={task.done ? "Mark incomplete" : "Mark complete"} className={`task-check ${task.done ? "done" : ""}`} onClick={() => toggleTask(task.id)}>{task.done && <Check size={12}/>}</button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="task-title" style={{ textDecoration: task.done ? "line-through" : "none", color: task.done ? "#858da2" : undefined }}>{task.title}</div>
                    <div className="task-meta">{task.meta}</div>
                  </div>
                  <span className={`priority ${task.priority}`}>{task.priority}</span>
                </div>
              ))}
            </div>
            <div className="notice"><ShieldCheck size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 7 }}/>{notice}</div>
          </div>

          <div>
            <div className="agent-box">
              <div className="agent-title"><div className="agent-orb"><Bot size={17}/></div> OpsPilot Agent <span style={{ marginLeft: "auto", color: "#aaa0ff", fontSize: 10 }}>PREVIEW</span></div>
              <p>Describe the outcome you want. OpsPilot will eventually plan the steps, run tools, and verify the results before reporting completion.</p>
            </div>
            <div className="card">
              <div className="section-head"><h2>What should we work on?</h2><WandSparkles size={17} color="#a99cff"/></div>
              <label className="prompt-label" htmlFor="brief">YOUR EVENT BRIEF OR TASK</label>
              <textarea id="brief" className="prompt-input" value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="e.g. Plan a 2-day AI hackathon for 200 participants, prepare a budget, research sponsors, and create four poster themes..." />
              <div className="prompt-footer">
                <span className="small-muted"><Clock3 size={12} style={{ display: "inline", verticalAlign: "middle" }}/> Agent connection coming next</span>
                <button className="btn btn-primary" onClick={submitBrief}><Sparkles size={14}/> Create plan <ChevronRight size={14}/></button>
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 26 }}>
          <div className="section-head">
            <div><h2>Creative Studio</h2><p className="small-muted" style={{ margin: "5px 0 0" }}>Sample theme previews — not AI-generated assets.</p></div>
            <button className="btn" onClick={() => { setActiveNav("Creative Studio"); setNotice("Creative Studio selected. Next step: integrate Muse Image generation."); }}><ImagePlus size={14}/> Open studio <ChevronRight size={13}/></button>
          </div>
          <div className="grid creative-grid">
            <div className="card creative">
              <div className="poster neon"><div className="poster-kicker">AI / INNOVATION</div><div><h3>BUILD<br/>THE<br/>FUTURE.</h3><p>One event. Big ideas. Real-world impact.</p></div><div className="poster-footer">HACKATHON · 2026</div></div>
              <div className="creative-info"><strong>Future Tech</strong><span>Neon · High energy</span></div>
            </div>
            <div className="card creative">
              <div className="poster minimal"><div className="poster-kicker">STUDENT INNOVATION</div><div><h3>IDEAS<br/>INTO<br/>IMPACT.</h3><p>Build something that matters.</p></div><div className="poster-footer">REGISTER NOW · 2026</div></div>
              <div className="creative-info"><strong>Minimal Pro</strong><span>Clean · Professional</span></div>
            </div>
            <div className="card creative">
              <div className="poster bold"><div className="poster-kicker">MAKE IT HAPPEN</div><div><h3>THINK<br/>LOUD.<br/>BUILD BIG.</h3><p>Bring your boldest ideas to life.</p></div><div className="poster-footer">THE NEXT CHAPTER STARTS HERE</div></div>
              <div className="creative-info"><strong>Campus Bold</strong><span>Editorial · Energetic</span></div>
            </div>
          </div>
        </section>

        <section className="grid bottom-grid">
          <div className="card">
            <div className="section-head"><h2>Agent activity</h2><span className="small-muted">Prototype</span></div>
            <div className="activity"><div className="activity-icon"><Target size={15}/></div><div><strong>Event brief workspace ready</strong><span>Example project data loaded locally.</span></div></div>
            <div className="activity"><div className="activity-icon"><FileCheck2 size={15}/></div><div><strong>Evidence ledger awaiting tools</strong><span>No claims of external verification are made.</span></div></div>
            <div className="activity"><div className="activity-icon"><FolderKanban size={15}/></div><div><strong>Task board interactive</strong><span>Toggle tasks to explore the UI.</span></div></div>
          </div>
          <div className="card">
            <div className="section-head"><h2>Next build milestones</h2><span className="small-muted">MVP</span></div>
            <div className="activity"><div className="activity-icon"><Zap size={15}/></div><div><strong>1. Connect Meta Model API</strong><span>Secure server-side route and structured responses.</span></div></div>
            <div className="activity"><div className="activity-icon"><WandSparkles size={15}/></div><div><strong>2. Add real tool execution</strong><span>Budget validator, task creation and evidence logs.</span></div></div>
            <div className="activity"><div className="activity-icon"><Palette size={15}/></div><div><strong>3. Integrate image generation</strong><span>Connect supported image API and export pipeline.</span></div></div>
          </div>
        </section>
      </main>
    </div>
  );
}
