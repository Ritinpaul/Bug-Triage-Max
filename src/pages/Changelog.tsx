import { Calendar, Tag, ArrowRight, Zap, Bug, Sparkles, Shield } from "lucide-react";
import { Link } from "react-router";

// Mock public changelog data
const CHANGELOG_DATA = [
  {
    id: 1,
    version: "v2026.07.1",
    date: "July 06, 2026",
    title: "BugPulse MCP & Custom Webhooks",
    description: "Introducing our biggest update yet: connect BugPulse directly to Claude Desktop and Cursor using the Model Context Protocol (MCP). We've also added custom webhooks to give you full control over your bug tracking pipeline.",
    changes: [
      { type: "feature", text: "Added Model Context Protocol (MCP) server support." },
      { type: "feature", text: "New Integrations Hub to easily manage active integrations." },
      { type: "feature", text: "Custom Webhooks for receiving payloads when bugs change status." },
      { type: "improvement", text: "Redesigned landing page with improved navigation." },
      { type: "fix", text: "Fixed an issue where markdown wasn't parsing correctly in bug titles." }
    ]
  },
  {
    id: 2,
    version: "v2026.06.2",
    date: "June 28, 2026",
    title: "Email Ingestion Engine",
    description: "You can now pipe support emails directly into BugPulse. Our AI automatically extracts reproduction steps from customer rants and turns them into actionable engineering tasks.",
    changes: [
      { type: "feature", text: "Inbound email parsing and processing." },
      { type: "feature", text: "AI-driven extraction of reproduction steps from raw emails." },
      { type: "improvement", text: "UI enhancements to the Issue Detail page." },
      { type: "fix", text: "Resolved a UI jitter when dragging cards in the Kanban board." }
    ]
  },
  {
    id: 3,
    version: "v2026.06.1",
    date: "June 15, 2026",
    title: "The Beta Launch",
    description: "Welcome to the first beta of BugPulse! We're excited to help you triage bugs with AI.",
    changes: [
      { type: "feature", text: "Initial release of the BugPulse dashboard." },
      { type: "feature", text: "AI Bug triage and deduplication." },
      { type: "feature", text: "GitHub issue syncing." }
    ]
  }
];

function TypeBadge({ type }: { type: string }) {
  switch (type) {
    case "feature":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-sky-600 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
          <Sparkles className="w-3 h-3" /> Feature
        </span>
      );
    case "improvement":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <Zap className="w-3 h-3" /> Improvement
        </span>
      );
    case "fix":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
          <Bug className="w-3 h-3" /> Fix
        </span>
      );
    case "security":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
          <Shield className="w-3 h-3" /> Security
        </span>
      );
    default:
      return null;
  }
}

export default function Changelog() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020817] text-slate-900 dark:text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/20 transition-transform group-hover:scale-105">
              <Bug className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-slate-800 dark:text-white tracking-tight">BugPulse</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/docs" className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              Documentation
            </Link>
            <Link to="/integrations" className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              Integrations
            </Link>
            <Link to="/login" className="text-sm font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors">
              Sign In <ArrowRight className="w-4 h-4 inline-block ml-1" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            Changelog
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Stay up to date with the latest features, improvements, and bug fixes in BugPulse.
          </p>
        </div>

        <div className="space-y-16 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
          {CHANGELOG_DATA.map((release) => (
            <div key={release.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              {/* Timeline dot */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-[#020817] bg-sky-100 dark:bg-sky-900/50 text-sky-500 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 absolute left-0 md:left-1/2 -ml-5 md:ml-0">
                <Tag className="w-4 h-4" />
              </div>

              {/* Content Card */}
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-12 md:ml-0 p-6 md:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{release.version}</span>
                  <span className="text-sm font-semibold text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {release.date}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-sky-600 dark:text-sky-400 mb-2">
                  {release.title}
                </h3>
                
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
                  {release.description}
                </p>

                <div className="space-y-3">
                  {release.changes.map((change, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <TypeBadge type={change.type} />
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {change.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer CTA */}
      <div className="border-t border-slate-200/50 dark:border-white/10 bg-white dark:bg-slate-900/50 mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Start squashing bugs faster</h2>
          <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors shadow-lg shadow-sky-500/20">
            Get Started for Free
          </Link>
        </div>
      </div>
    </div>
  );
}
