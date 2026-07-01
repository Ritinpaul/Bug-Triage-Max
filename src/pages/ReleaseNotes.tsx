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
          return <h1 key={i} className="text-xl font-black text-slate-800 mt-2">{line.slice(2)}</h1>;
        if (line.startsWith("## "))
          return <h2 key={i} className="text-base font-bold text-sky-600 mt-4 mb-1">{line.slice(3)}</h2>;
        if (line.startsWith("### "))
          return <h3 key={i} className="text-sm font-bold text-blue-600 mt-3 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith("> "))
          return <blockquote key={i} className="border-l-2 border-sky-500/40 pl-3 text-slate-550 italic">{line.slice(2)}</blockquote>;
        if (line.startsWith("- "))
          return <p key={i} className="text-slate-500 pl-2 font-medium">• {line.slice(2)}</p>;
        if (line.startsWith("---"))
          return <hr key={i} className="border-[#0f172a]/08 my-2" />;
        if (line === "")
          return <div key={i} className="h-1" />;
        return <p key={i} className="text-slate-650 font-medium">{line}</p>;
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
    P0: "text-red-500",
    P1: "text-orange-600",
    P2: "text-yellow-600",
    P3: "text-slate-450",
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shadow-sm">
            <FileText className="w-4.5 h-4.5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Release Notes</h1>
            <p className="text-sm text-slate-450 mt-0.5 font-medium">
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
            <GlassCard className="p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-500" />
                Generate Changelog
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {/* Day Range */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Time Range</label>
                  <div className="relative">
                    <select
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-full appearance-none text-sm bg-slate-100 border border-slate-200/60 rounded-xl px-3 py-2 pr-8 text-slate-705 font-bold cursor-pointer hover:bg-slate-200 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                    >
                      {DAY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Tag Name */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                    Tag Name <span className="text-slate-450">(auto-suggested)</span>
                  </label>
                  <input
                    type="text"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="e.g. v2026.07.01"
                    className="w-full text-sm bg-slate-100 border border-slate-200/60 rounded-xl px-3 py-2 text-slate-700 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  />
                </div>
              </div>

              <button
                onClick={() =>
                  generateMutation.mutate({ days, tagName: tagName || undefined })
                }
                disabled={generateMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:opacity-95 rounded-xl transition-all disabled:opacity-50 shadow-sm"
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
                <GlassCard className="p-5 space-y-4 shadow-sm">
                  {/* Preview Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-500" />
                      Preview
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">
                        {preview.tagName}
                      </span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/60 rounded-lg font-bold transition-all shadow-sm border border-slate-200/30"
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-sky-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-slate-400 font-semibold">
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
                  <div className="max-h-96 overflow-y-auto rounded-xl bg-slate-100/65 p-4 border border-slate-200/40">
                    <MarkdownPreview content={preview.markdown} />
                  </div>

                  {/* Release Name Input */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Release Name</label>
                    <input
                      type="text"
                      value={releaseName}
                      onChange={(e) => setReleaseName(e.target.value)}
                      className="w-full text-sm bg-slate-100 border border-slate-200/60 rounded-xl px-3 py-2 text-slate-700 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={saveMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-sky-600 bg-sky-500/10 border border-sky-500/25 rounded-xl hover:bg-sky-500/20 font-bold transition-all disabled:opacity-50 shadow-sm"
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
                <GlassCard className="p-4 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
                    <Bug className="w-3.5 h-3.5 text-slate-400" />
                    Included Bugs ({preview.bugs.length})
                  </h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {preview.bugs.map((bug) => (
                      <div
                        key={bug.id}
                        className="flex items-center gap-2 py-1 border-b border-[#0f172a]/04 last:border-0"
                      >
                        <span className={`text-[10px] font-mono font-bold ${severityColor[bug.severity] || "text-slate-450"}`}>
                          {bug.severity}
                        </span>
                        <span className="text-[10px] text-slate-450 capitalize font-bold">[{bug.component}]</span>
                        <span className="text-xs text-slate-650 flex-1 truncate font-medium">{bug.title}</span>
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
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-slate-400" />
              Saved Releases
              {savedNotes && (
                <span className="ml-auto text-xs text-slate-400 font-bold">
                  {savedNotes.length} total
                </span>
              )}
            </h2>

            {!savedNotes || savedNotes.length === 0 ? (
              <GlassCard className="p-6 flex flex-col items-center justify-center text-center gap-2 shadow-sm">
                <FileText className="w-8 h-8 text-slate-200" />
                <p className="text-sm text-slate-700 font-bold">No saved releases yet</p>
                <p className="text-xs text-slate-450 font-medium">
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
                    <GlassCard className="p-4 space-y-2.5 shadow-sm">
                      {/* Note Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-700 truncate">
                              {note.name}
                            </span>
                            <StatusPill status={note.status} />
                          </div>
                          <span className="text-[10px] font-mono text-sky-650 mt-0.5 block font-bold">
                            {note.tagName}
                          </span>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <Bug className="w-3 h-3" />
                          {note.bugCount} bugs
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {note.daysRange}d window
                        </span>
                        <span className="ml-auto text-slate-450 font-bold">
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
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] text-white bg-slate-700 hover:bg-slate-800 rounded-lg font-bold transition-all disabled:opacity-50 shadow-sm"
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
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all border border-slate-200/40 shadow-sm"
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
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-sky-650 bg-sky-500/10 border border-sky-500/25 rounded-lg hover:bg-sky-500/20 font-bold transition-all shadow-sm"
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
      <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded-full font-bold">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Published
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-[10px] text-sky-600 bg-sky-500/10 border border-sky-500/25 px-1.5 py-0.5 rounded-full font-bold">
      <Clock className="w-2.5 h-2.5" />
      Draft
    </span>
  );
}
