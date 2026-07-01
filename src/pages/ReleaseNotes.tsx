import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Sparkles,
  Github,
  Save,
  Trash2,
  ExternalLink,
  Loader2,
  ChevronDown,
  Calendar,
  Bug,
  CheckCircle2,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { toast } from "sonner";

const DAY_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 14 days", value: 14 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
];

// ─── Minimal Markdown renderer ─────────────────────────────────────────
function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="text-sm leading-relaxed space-y-1 font-mono">
      {lines.map((line, i) => {
        if (line.startsWith("# "))
          return <h1 key={i} className="text-xl font-bold text-white mt-2">{line.slice(2)}</h1>;
        if (line.startsWith("## "))
          return <h2 key={i} className="text-base font-semibold text-violet-300 mt-4 mb-1">{line.slice(3)}</h2>;
        if (line.startsWith("### "))
          return <h3 key={i} className="text-sm font-semibold text-blue-300 mt-3 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith("> "))
          return <blockquote key={i} className="border-l-2 border-violet-500/40 pl-3 text-muted-foreground italic">{line.slice(2)}</blockquote>;
        if (line.startsWith("- "))
          return <p key={i} className="text-muted-foreground pl-2">• {line.slice(2)}</p>;
        if (line.startsWith("---"))
          return <hr key={i} className="border-white/[0.06] my-2" />;
        if (line === "")
          return <div key={i} className="h-1" />;
        return <p key={i} className="text-foreground">{line}</p>;
      })}
    </div>
  );
}

export default function ReleaseNotes() {
  const [days, setDays] = useState(7);
  const [tagName, setTagName] = useState("");
  const [releaseName, setReleaseName] = useState("");
  const [preview, setPreview] = useState<{
    markdown: string;
    tagName: string;
    bugCount: number;
    days: number;
    bugs: { id: number; title: string; component: string; severity: string }[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: savedNotes, refetch: refetchList } = trpc.releaseNotes.list.useQuery();

  const generateMutation = trpc.releaseNotes.generate.useMutation({
    onSuccess: (data) => {
      setPreview(data);
      setTagName(data.tagName);
      setReleaseName(`Release ${data.tagName}`);
      toast.success(`Generated changelog for ${data.bugCount} bugs`);
    },
    onError: (err) => toast.error(`Generation failed: ${err.message}`),
  });

  const saveMutation = trpc.releaseNotes.save.useMutation({
    onSuccess: () => {
      toast.success("Release note saved as draft");
      refetchList();
    },
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  });

  const publishMutation = trpc.releaseNotes.publish.useMutation({
    onSuccess: (result) => {
      if (result.alreadyPublished) toast.info("Already published to GitHub");
      else toast.success("Published to GitHub as draft release!");
      refetchList();
    },
    onError: (err) => toast.error(`Publish failed: ${err.message}`),
  });

  const deleteMutation = trpc.releaseNotes.delete.useMutation({
    onSuccess: () => { toast.success("Draft deleted"); refetchList(); },
    onError: (err) => toast.error(err.message),
  });

  function handleCopy() {
    if (!preview) return;
    navigator.clipboard.writeText(preview.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    if (!preview) return;
    saveMutation.mutate({
      tagName: tagName || preview.tagName,
      name: releaseName || `Release ${preview.tagName}`,
      body: preview.markdown,
      daysRange: preview.days,
      bugCount: preview.bugCount,
    });
  }

  const severityColor: Record<string, string> = {
    P0: "text-red-400",
    P1: "text-orange-400",
    P2: "text-yellow-400",
    P3: "text-muted-foreground",
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Release Notes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              AI-generated changelogs from resolved bugs
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Generator Panel */}
        <div className="col-span-1 lg:col-span-7 space-y-4">
          {/* Generator Config */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Generate Changelog
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {/* Day Range */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Time Range</label>
                  <div className="relative">
                    <select
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-full appearance-none text-sm bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 pr-8 text-foreground cursor-pointer hover:bg-white/[0.08] transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    >
                      {DAY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Tag Name */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    Tag Name <span className="text-white/30">(auto-suggested)</span>
                  </label>
                  <input
                    type="text"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="e.g. v2026.07.01"
                    className="w-full text-sm bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <button
                onClick={() =>
                  generateMutation.mutate({ days, tagName: tagName || undefined })
                }
                disabled={generateMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500/80 to-teal-500/80 hover:from-emerald-500 hover:to-teal-500 rounded-lg transition-all disabled:opacity-50"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Changelog
                  </>
                )}
              </button>
            </GlassCard>
          </motion.div>

          {/* Preview */}
          <AnimatePresence>
            {preview && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <GlassCard className="p-5 space-y-4">
                  {/* Preview Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-violet-400" />
                      Preview
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {preview.tagName}
                      </span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground bg-white/[0.04] hover:bg-white/[0.08] rounded-md transition-all"
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Bug className="w-3 h-3" />
                      {preview.bugCount} bugs resolved
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Last {preview.days} days
                    </span>
                  </div>

                  {/* Markdown */}
                  <div className="max-h-96 overflow-y-auto rounded-lg bg-black/20 p-4 border border-white/[0.04]">
                    <MarkdownPreview content={preview.markdown} />
                  </div>

                  {/* Release Name Input */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Release Name</label>
                    <input
                      type="text"
                      value={releaseName}
                      onChange={(e) => setReleaseName(e.target.value)}
                      className="w-full text-sm bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={saveMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-all disabled:opacity-50"
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save Draft
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Included Bugs List */}
          <AnimatePresence>
            {preview && preview.bugs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <GlassCard className="p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Bug className="w-3.5 h-3.5" />
                    Included Bugs ({preview.bugs.length})
                  </h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {preview.bugs.map((bug) => (
                      <div
                        key={bug.id}
                        className="flex items-center gap-2 py-1 border-b border-white/[0.03] last:border-0"
                      >
                        <span className={`text-[10px] font-mono font-semibold ${severityColor[bug.severity] || "text-muted-foreground"}`}>
                          {bug.severity}
                        </span>
                        <span className="text-[10px] text-white/30 capitalize">[{bug.component}]</span>
                        <span className="text-xs text-muted-foreground flex-1 truncate">{bug.title}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Saved Release Notes History */}
        <div className="col-span-1 lg:col-span-5 space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Saved Releases
              {savedNotes && (
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  {savedNotes.length} total
                </span>
              )}
            </h2>

            {!savedNotes || savedNotes.length === 0 ? (
              <GlassCard className="p-6 flex flex-col items-center justify-center text-center gap-2">
                <FileText className="w-8 h-8 text-white/10" />
                <p className="text-sm text-muted-foreground">No saved releases yet</p>
                <p className="text-xs text-muted-foreground/60">
                  Generate and save a changelog to see it here
                </p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {savedNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <GlassCard className="p-4 space-y-2.5">
                      {/* Note Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white truncate">
                              {note.name}
                            </span>
                            <StatusPill status={note.status} />
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400 mt-0.5 block">
                            {note.tagName}
                          </span>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bug className="w-3 h-3" />
                          {note.bugCount} bugs
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {note.daysRange}d window
                        </span>
                        <span className="ml-auto">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        {note.status === "draft" ? (
                          <>
                            <button
                              onClick={() => publishMutation.mutate({ id: note.id })}
                              disabled={publishMutation.isPending}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] text-white bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 rounded-md transition-all disabled:opacity-50"
                            >
                              {publishMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Github className="w-3 h-3" />
                              )}
                              Publish to GitHub
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate({ id: note.id })}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          note.githubReleaseUrl && (
                            <a
                              href={note.githubReleaseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md hover:bg-emerald-500/20 transition-all"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View on GitHub
                            </a>
                          )
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "published")
    return (
      <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Published
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
      <Clock className="w-2.5 h-2.5" />
      Draft
    </span>
  );
}
