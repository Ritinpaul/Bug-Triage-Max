import { ArrowRight, BookOpen, Rocket, Shield } from "lucide-react";
import { Link } from "react-router";

export function GettingStarted() {
  return (
    <div className="max-w-4xl space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-black text-[#0f172a]">Getting Started</h1>
        <p className="text-lg text-[#0f172a]/60 leading-relaxed">
          BugPulse is an AI-native bug triage and management pipeline. It connects to your existing tools 
          (Slack, GitHub, Email) and uses AI to automatically categorize, score, and enrich bug reports before 
          they reach your team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/docs/mcp" className="p-6 rounded-2xl bg-white border border-[#0f172a]/10 hover:border-sky-400 hover:shadow-lg hover:shadow-sky-500/5 transition-all group">
          <Rocket className="w-8 h-8 text-sky-500 mb-4" />
          <h3 className="text-lg font-bold text-[#0f172a] mb-2">Connect your AI Assistant</h3>
          <p className="text-sm text-[#0f172a]/60 mb-4">Use our MCP server to let Claude or Cursor manage bugs directly.</p>
          <div className="flex items-center text-sm font-semibold text-sky-600 group-hover:text-sky-500">
            Setup MCP <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link to="/docs/cli" className="p-6 rounded-2xl bg-white border border-[#0f172a]/10 hover:border-sky-400 hover:shadow-lg hover:shadow-sky-500/5 transition-all group">
          <BookOpen className="w-8 h-8 text-sky-500 mb-4" />
          <h3 className="text-lg font-bold text-[#0f172a] mb-2">Terminal Power User</h3>
          <p className="text-sm text-[#0f172a]/60 mb-4">Install the BugPulse CLI to watch and manage bugs from your terminal.</p>
          <div className="flex items-center text-sm font-semibold text-sky-600 group-hover:text-sky-500">
            Install CLI <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#0f172a]" id="architecture">Architecture Overview</h2>
        <p className="text-[#0f172a]/70 leading-relaxed">
          BugPulse is built to be the central nervous system for your engineering team's issues:
        </p>
        <ul className="space-y-4">
          <li className="flex items-start gap-3">
            <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center">
              <span className="text-xs font-bold text-sky-600">1</span>
            </div>
            <div>
              <strong className="block text-[#0f172a]">Ingestion</strong>
              <span className="text-sm text-[#0f172a]/70">Bugs flow in via the UI, API, Slack, or Email.</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center">
              <span className="text-xs font-bold text-sky-600">2</span>
            </div>
            <div>
              <strong className="block text-[#0f172a]">AI Triage Pipeline</strong>
              <span className="text-sm text-[#0f172a]/70">Agents analyze the text, extract reproduction steps, identify the affected component, assign a priority score (0-100), and find similar existing bugs.</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center">
              <span className="text-xs font-bold text-sky-600">3</span>
            </div>
            <div>
              <strong className="block text-[#0f172a]">Action & Sync</strong>
              <span className="text-sm text-[#0f172a]/70">The enriched bug is saved. If configured, it automatically syncs to GitHub Issues, Jira, or alerts your team via Slack.</span>
            </div>
          </li>
        </ul>
      </div>

      <div className="p-6 bg-sky-50 rounded-2xl border border-sky-100 flex items-start gap-4">
        <Shield className="w-6 h-6 text-sky-500 flex-shrink-0" />
        <div>
          <h4 className="font-bold text-[#0f172a] mb-1">Security First</h4>
          <p className="text-sm text-[#0f172a]/70 leading-relaxed">
            All API endpoints require authentication. Ensure you have your API keys ready if you plan 
            to use the CLI, MCP server, or integrate custom webhooks.
          </p>
        </div>
      </div>
    </div>
  );
}
