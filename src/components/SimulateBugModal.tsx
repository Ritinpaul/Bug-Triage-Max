import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/providers/trpc";
import {
  X,
  Send,
  Zap,
  Slack,
  Mail,
  FileText,
  Loader2,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router";

const SAMPLE_BUGS = [
  {
    label: "Login crash",
    source: "slack" as const,
    content:
      "🚨 URGENT: Production login is completely broken since the last deploy. Users can't sign in at all. Getting a 500 error on POST /auth/login. Started ~20 mins ago.",
    channel: "#incidents",
    sender: "ops-team",
  },
  {
    label: "Payment failure",
    source: "email" as const,
    content:
      "Hi support, I've been trying to complete my purchase for the past hour and keep getting 'Payment failed' after entering my card details. I've tried three different cards. Please help ASAP — order #ORD-9284.",
    channel: "Support Ticket #4821",
    sender: "customer@example.com",
  },
  {
    label: "Data export bug",
    source: "form" as const,
    content:
      "When I click the 'Export to CSV' button on the Reports page, nothing happens. The button appears to react (highlights briefly) but no download starts. Using Chrome 125 on Windows 11.",
    channel: "Bug Report Form",
    sender: "user-reporter",
  },
  {
    label: "Null pointer crash",
    source: "slack" as const,
    content:
      "Getting a NullPointerException in the user dashboard for accounts with >500 projects. Stack trace: UserDashboardController.java:142 → ProjectListService.java:89. Reproducible 100% of the time.",
    channel: "#engineering",
    sender: "dev-team",
  },
  {
    label: "Mobile layout broken",
    source: "form" as const,
    content:
      "The sidebar navigation overlaps the main content on mobile (iPhone 15, Safari). The hamburger menu doesn't close when a nav item is tapped. Makes the app unusable on phone.",
    channel: "Bug Report Form",
    sender: "mobile-user",
  },
];

interface SimulateBugModalProps {
  open: boolean;
  onClose: () => void;
}

export function SimulateBugModal({ open, onClose }: SimulateBugModalProps) {
  const [step, setStep] = useState<"input" | "processing" | "done">("input");
  const [source, setSource] = useState<"slack" | "email" | "form">("slack");
  const [content, setContent] = useState("");
  const [channel, setChannel] = useState("");
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMessage = trpc.messages.create.useMutation({
    onSuccess: (data) => {
      setCreatedId(data.id);
      setStep("done");
    },
    onError: (err) => {
      setError(err.message);
      setStep("input");
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) return;
    setError(null);
    setStep("processing");
    createMessage.mutate({
      source,
      rawContent: content.trim(),
      senderId: `demo-user-${Date.now()}`,
      senderName: "Demo User",
      senderEmail: "demo@example.com",
      channel: channel || (source === "slack" ? "#general" : source === "email" ? "support@company.com" : "Bug Report Form"),
    });
  };

  const handleSample = (sample: typeof SAMPLE_BUGS[0]) => {
    setSource(sample.source);
    setContent(sample.content);
    setChannel(sample.channel);
  };

  const handleClose = () => {
    setStep("input");
    setContent("");
    setChannel("");
    setCreatedId(null);
    setError(null);
    onClose();
  };

  const sourceIcon = {
    slack: Slack,
    email: Mail,
    form: FileText,
  };

  const sourceColors = {
    slack: "bg-[#4A154B] text-white border-[#4A154B]",
    email: "bg-blue-600 text-white border-blue-600",
    form: "bg-slate-600 text-white border-slate-600",
  };

  const sourceInactive = "bg-white/50 text-slate-500 border-slate-200 hover:bg-slate-50";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-100 pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-teal-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center shadow-md shadow-sky-500/30">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-800">Simulate Incoming Bug</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Watch the AI pipeline run live</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {step === "input" && (
                  <div className="space-y-4">
                    {/* Source picker */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-2 block">Source Channel</label>
                      <div className="flex gap-2">
                        {(["slack", "email", "form"] as const).map((s) => {
                          const Icon = sourceIcon[s];
                          return (
                            <button
                              key={s}
                              onClick={() => setSource(s)}
                              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all ${
                                source === s ? sourceColors[s] : sourceInactive
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sample bugs */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-2 block">
                        Quick Fill — Pick a sample
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {SAMPLE_BUGS.map((bug) => {
                          const Icon = sourceIcon[bug.source];
                          return (
                            <button
                              key={bug.label}
                              onClick={() => handleSample(bug)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 hover:bg-sky-50 text-slate-500 hover:text-sky-600 border border-slate-100 hover:border-sky-200 transition-all"
                            >
                              <Icon className="w-3 h-3" />
                              {bug.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Content */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-2 block">
                        Message / Bug Report Content
                      </label>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Paste a Slack message, email, or bug report here… the AI will parse it, determine priority, assign to a team member, and generate reproduction steps."
                        rows={5}
                        className="w-full text-sm text-slate-700 placeholder-slate-300 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                      />
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        {content.length} characters — try writing anything messy and realistic
                      </p>
                    </div>

                    {error && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {error}
                      </div>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={!content.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-md shadow-sky-500/20 hover:shadow-sky-500/30"
                    >
                      <Send className="w-4 h-4" />
                      Submit to AI Pipeline
                    </button>
                  </div>
                )}

                {step === "processing" && (
                  <div className="py-8 flex flex-col items-center gap-5">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-sky-500 flex items-center justify-center shadow-xl shadow-sky-500/30">
                        <Zap className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -inset-1 rounded-2xl border-2 border-sky-400 animate-ping opacity-30" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-black text-slate-800">AI Pipeline Running…</p>
                      <p className="text-xs text-slate-400">Parser → Triage → Reproduction Steps</p>
                    </div>
                    <div className="w-full space-y-2">
                      {["🧠 Parsing intent & severity", "⚡ Triaging & assigning priority", "🔬 Generating reproduction steps"].map(
                        (label, i) => (
                          <motion.div
                            key={label}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.6 }}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100"
                          >
                            <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin shrink-0" />
                            <span className="text-xs text-slate-600 font-medium">{label}</span>
                          </motion.div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {step === "done" && (
                  <div className="py-6 flex flex-col items-center gap-5">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 12 }}
                      className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/30"
                    >
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    </motion.div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-black text-slate-800">Bug Triaged Successfully!</p>
                      <p className="text-xs text-slate-400">
                        The AI has parsed, prioritized, and assigned this issue.
                        <br />Reproduction steps are being generated in the background.
                      </p>
                    </div>
                    <div className="w-full space-y-3">
                      {createdId && (
                        <Link
                          to="/issues"
                          onClick={handleClose}
                          className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm transition-all shadow-md shadow-sky-500/20"
                        >
                          View in Issues <ChevronRight className="w-4 h-4" />
                        </Link>
                      )}
                      <button
                        onClick={() => { setStep("input"); setContent(""); setChannel(""); setCreatedId(null); }}
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-6 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm transition-all border border-slate-200"
                      >
                        Submit Another
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
