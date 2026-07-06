import { useState } from "react";
import { Link, useParams, Navigate } from "react-router";
import { BookOpen, Rocket, Terminal, Server, Plug, HardDrive, Menu, X, Bug } from "lucide-react";
import { GettingStarted } from "./docs/GettingStarted";
import { MCPDocs } from "./docs/MCPDocs";
import { CLIDocs } from "./docs/CLIDocs";
import { APIReference, IntegrationsDocs, SelfHostingDocs } from "./docs/OtherDocs";

const DOCS_STRUCTURE = [
  {
    title: "Getting Started",
    icon: BookOpen,
    items: [
      { id: "getting-started/intro", label: "Introduction" },
    ]
  },
  {
    title: "MCP Server",
    icon: Rocket,
    items: [
      { id: "mcp", label: "Overview" },
      { id: "mcp/installation", label: "Installation & Build", hash: "installation" },
      { id: "mcp/configuration", label: "Configuration", hash: "configuration" },
      { id: "mcp/claude-desktop", label: "Claude Desktop", hash: "claude-desktop" },
      { id: "mcp/cursor", label: "Cursor Integration", hash: "cursor" },
      { id: "mcp/tools", label: "Tools Reference", hash: "tools" },
    ]
  },
  {
    title: "CLI Reference",
    icon: Terminal,
    items: [
      { id: "cli", label: "Overview" },
      { id: "cli/installation", label: "Installation", hash: "cli-installation" },
      { id: "cli/configuration", label: "Configuration", hash: "cli-configuration" },
      { id: "cli/commands", label: "Commands", hash: "cli-commands" },
    ]
  },
  {
    title: "API Reference",
    icon: Server,
    items: [
      { id: "api", label: "Overview" },
    ]
  },
  {
    title: "Integrations",
    icon: Plug,
    items: [
      { id: "integrations", label: "Overview" },
    ]
  },
  {
    title: "Self-Hosting",
    icon: HardDrive,
    items: [
      { id: "self-hosting", label: "Overview" },
    ]
  }
];

export default function Docs() {
  const { section, subsection } = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine current path ID to highlight active state
  let currentPath = "getting-started/intro";
  if (section) {
    currentPath = section;
    if (subsection) currentPath += `/${subsection}`;
  }

  // Determine which component to render
  const renderContent = () => {
    if (!section || section === "getting-started") return <GettingStarted />;
    if (section === "mcp") return <MCPDocs />;
    if (section === "cli") return <CLIDocs />;
    if (section === "api") return <APIReference />;
    if (section === "integrations") return <IntegrationsDocs />;
    if (section === "self-hosting") return <SelfHostingDocs />;
    return <Navigate to="/docs/getting-started/intro" replace />;
  };

  const SidebarContent = () => (
    <div className="py-6 px-4 space-y-8">
      {DOCS_STRUCTURE.map((group, i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center gap-2 px-2 text-[#0f172a] font-bold">
            <group.icon className="w-4 h-4 text-sky-500" />
            <h4 className="text-sm tracking-wide">{group.title}</h4>
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-slate-100 ml-4 pl-3">
            {group.items.map((item) => {
              const isActive = currentPath === item.id || (item.id.includes('/') && currentPath === item.id.split('/')[0]);
              
              // We handle in-page scrolling manually if it's the same section
              const [itemSection] = item.id.split('/');
              const isSameSection = section === itemSection || (!section && itemSection === "getting-started");
              
              const href = isSameSection && item.hash 
                ? `#${item.hash}` 
                : `/docs/${item.id}`;

              return (
                <a
                  key={item.id}
                  href={href}
                  onClick={(e) => {
                    if (isSameSection && item.hash) {
                      e.preventDefault();
                      document.getElementById(item.hash)?.scrollIntoView({ behavior: 'smooth' });
                    }
                    setMobileMenuOpen(false);
                  }}
                  className={`text-sm py-1.5 px-2 rounded-lg transition-colors ${
                    isActive
                      ? "text-sky-600 font-semibold bg-sky-50"
                      : "text-slate-500 hover:text-[#0f172a] hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-[#0f172a] font-sans flex flex-col">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center">
                <Bug className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg hidden sm:block">BugPulse</span>
              <span className="font-semibold text-slate-400 mx-2 hidden sm:block">/</span>
              <span className="font-semibold text-slate-700">Docs</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              Log In
            </Link>
            <Link to="/" className="text-sm font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-full transition-colors">
              App Home
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Mobile Sidebar Overlay ─── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl flex flex-col">
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
              <span className="font-bold text-lg">Documentation</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Content Area ─── */}
      <div className="max-w-[90rem] mx-auto w-full flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 flex-shrink-0 border-r border-slate-200">
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            <SidebarContent />
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 py-12 lg:px-12 lg:py-16">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
