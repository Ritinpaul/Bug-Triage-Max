import { useState } from "react";
import { Link } from "react-router";
import {
  Slack,
  Github,
  Mail,
  Terminal,
  Webhook,
  ArrowRight,
  Puzzle,
  Briefcase,
  CheckCircle2,
  Clock,
  MessageSquare
} from "lucide-react";
import { CodeBlock } from "@/components/CodeBlock";

interface IntegrationCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  status: "connected" | "available" | "coming_soon";
  docLink?: string;
  onClick?: () => void;
}

function IntegrationCard({ name, description, icon: Icon, iconBg, iconColor, status, docLink, onClick }: IntegrationCardProps) {
  return (
    <div 
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 flex flex-col ${
        status === "coming_soon" 
          ? "bg-slate-50/50 border-slate-100 dark:bg-slate-900/20 dark:border-slate-800/50" 
          : "bg-white border-slate-200 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 dark:bg-slate-900/50 dark:border-slate-800 dark:hover:border-sky-500/50 cursor-pointer"
      }`}
      onClick={status !== "coming_soon" ? onClick : undefined}
    >
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          {status === "connected" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </span>
          )}
          {status === "coming_soon" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5" /> Coming Soon
            </span>
          )}
        </div>
        
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{name}</h3>
        <p className={`text-sm flex-1 ${status === "coming_soon" ? "text-slate-400 dark:text-slate-500" : "text-slate-600 dark:text-slate-400"}`}>
          {description}
        </p>
      </div>

      {status !== "coming_soon" && (
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
          <span className="text-sm font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1 group-hover:gap-2 transition-all">
            Configure <ArrowRight className="w-4 h-4" />
          </span>
          {docLink && (
            <Link to={docLink} onClick={(e) => e.stopPropagation()} className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 underline underline-offset-2">
              View Docs
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function Integrations() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const integrations = [
    {
      id: "slack",
      name: "Slack",
      description: "Receive real-time bug alerts, update statuses, and assign team members directly from Slack channels.",
      icon: Slack,
      iconBg: "bg-purple-100 dark:bg-purple-500/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      status: "available" as const,
      docLink: "/docs/integrations/slack"
    },
    {
      id: "github",
      name: "GitHub Issues",
      description: "Automatically sync resolved bugs to GitHub Issues and link PRs to close them out automatically.",
      icon: Github,
      iconBg: "bg-slate-100 dark:bg-slate-700",
      iconColor: "text-slate-800 dark:text-slate-200",
      status: "available" as const,
      docLink: "/docs/integrations/github"
    },
    {
      id: "email",
      name: "Email Ingestion",
      description: "Pipe support emails directly into BugPulse. Our AI automatically extracts reproduction steps from customer rants.",
      icon: Mail,
      iconBg: "bg-sky-100 dark:bg-sky-500/20",
      iconColor: "text-sky-600 dark:text-sky-400",
      status: "available" as const,
      docLink: "/docs/integrations/email"
    },
    {
      id: "claude",
      name: "Claude Desktop",
      description: "Connect Claude to your bug pipeline via our MCP Server to triage bugs conversationally.",
      icon: MessageSquare,
      iconBg: "bg-amber-100 dark:bg-amber-500/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      status: "available" as const,
      docLink: "/docs/mcp"
    },
    {
      id: "cursor",
      name: "Cursor",
      description: "Bring BugPulse into your IDE. Ask Cursor to fix an issue and it will fetch the reproduction steps automatically.",
      icon: Terminal,
      iconBg: "bg-indigo-100 dark:bg-indigo-500/20",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      status: "available" as const,
      docLink: "/docs/mcp/cursor"
    },
    {
      id: "webhooks",
      name: "Custom Webhooks",
      description: "Send POST requests to your own infrastructure when a bug changes state or hits a certain severity threshold.",
      icon: Webhook,
      iconBg: "bg-rose-100 dark:bg-rose-500/20",
      iconColor: "text-rose-600 dark:text-rose-400",
      status: "available" as const,
      docLink: "/docs/integrations/webhooks"
    },
    {
      id: "zapier",
      name: "Zapier",
      description: "Connect BugPulse to 5,000+ apps. Trigger workflows when a P0 bug is created.",
      icon: Puzzle,
      iconBg: "bg-orange-100 dark:bg-orange-500/20",
      iconColor: "text-orange-500",
      status: "coming_soon" as const
    },
    {
      id: "linear",
      name: "Linear",
      description: "Sync bugs seamlessly to Linear issues with two-way status syncing.",
      icon: CheckCircle2,
      iconBg: "bg-blue-100 dark:bg-blue-500/20",
      iconColor: "text-blue-500",
      status: "coming_soon" as const
    },
    {
      id: "jira",
      name: "Jira",
      description: "Enterprise grade syncing with Jira Software. Map BugPulse fields to custom Jira fields.",
      icon: Briefcase,
      iconBg: "bg-blue-100 dark:bg-blue-500/20",
      iconColor: "text-blue-700",
      status: "coming_soon" as const
    }
  ];

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Integrations Hub</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
            Connect BugPulse to the tools your team already uses. Bring AI triage directly into your existing workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <IntegrationCard 
              key={integration.id} 
              {...integration} 
              onClick={() => setActiveModal(integration.id)}
            />
          ))}
        </div>
      </div>

      {/* Configuration Modals */}
      {activeModal === 'email' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configure Email Ingestion</h2>
                  <p className="text-xs text-slate-500">Route emails directly to BugPulse</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 rounded-xl p-4">
                <h4 className="font-semibold text-sky-800 dark:text-sky-300 mb-2">Your Inbound Address</h4>
                <p className="text-sm text-sky-700 dark:text-sky-400 mb-4">
                  Any emails sent to this address will be automatically processed by the AI agent and created as bugs.
                </p>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-sky-200 dark:border-sky-900 rounded-lg p-1 pr-3">
                  <div className="bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-md font-mono text-sm text-slate-700 dark:text-slate-300 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    [your-prefix]@inbound.bugpulse.com
                  </div>
                  <button className="text-sky-600 dark:text-sky-400 hover:text-sky-700 text-sm font-semibold shrink-0" onClick={() => navigator.clipboard.writeText("[your-prefix]@inbound.bugpulse.com")}>
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Forwarding Setup (Gmail/GSuite)</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  You can set up an auto-forwarding rule from your support email to your inbound address.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li>Go to Gmail Settings {'>'} Forwarding and POP/IMAP.</li>
                  <li>Click "Add a forwarding address".</li>
                  <li>Enter <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">[your-prefix]@inbound.bugpulse.com</code>.</li>
                  <li>A bug will be created in your dashboard containing the verification code.</li>
                  <li>Enter the code in Gmail to verify.</li>
                </ol>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'slack' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                  <Slack className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configure Slack Webhook</h2>
                  <p className="text-xs text-slate-500">Connect Slack Events API to BugPulse</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 rounded-xl p-4">
                <h4 className="font-semibold text-sky-800 dark:text-sky-300 mb-2">Slack Webhook URL</h4>
                <p className="text-sm text-sky-700 dark:text-sky-400 mb-4">
                  Provide this URL to your Slack App under "Event Subscriptions" to pipe messages directly to BugPulse.
                </p>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-sky-200 dark:border-sky-900 rounded-lg p-1 pr-3">
                  <div className="bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-md font-mono text-sm text-slate-700 dark:text-slate-300 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    https://your-domain.com/api/webhooks/slack
                  </div>
                  <button className="text-sky-600 dark:text-sky-400 hover:text-sky-700 text-sm font-semibold shrink-0" onClick={() => navigator.clipboard.writeText("https://your-domain.com/api/webhooks/slack")}>
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Setup Instructions</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Follow these steps to configure your Slack app:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li>Go to <a href="https://api.slack.com/apps" target="_blank" className="text-sky-500 underline">Slack API Apps</a> and create an app.</li>
                  <li>In your app settings, navigate to <strong>Event Subscriptions</strong> and toggle "Enable Events".</li>
                  <li>Paste the Webhook URL above. Slack will send a challenge request to verify the endpoint.</li>
                  <li>Under <strong>Subscribe to bot events</strong>, add <code>message.channels</code> and <code>message.im</code>.</li>
                  <li>If testing locally, use <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">ngrok http 3000</code> to expose your dev server, and use the ngrok URL.</li>
                </ol>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeModal && activeModal !== 'email' && activeModal !== 'slack' && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
         <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 text-center p-8">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Puzzle className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Configure {integrations.find(i => i.id === activeModal)?.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              This integration setting is a placeholder for the demo.
            </p>
            <button 
              onClick={() => setActiveModal(null)}
              className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-lg transition-colors w-full"
            >
              Close
            </button>
         </div>
       </div>
      )}
    </div>
  );
}
