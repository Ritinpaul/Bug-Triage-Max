import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FlaskConical, ExternalLink } from "lucide-react";

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="relative flex items-center justify-between gap-4 px-4 py-2.5 bg-gradient-to-r from-sky-500 via-sky-500 to-teal-500 text-white text-xs font-semibold z-50 shadow-md shadow-sky-500/20"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 bg-white/20 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide">
            <FlaskConical className="w-3 h-3" />
            DEMO MODE
          </span>
          <span className="text-white/90">
            Viewing sample data — all AI features are live.{" "}
            <span className="text-white font-bold">
              Submit a bug below to watch the pipeline run in real time.
            </span>
          </span>
          <a
            href="https://github.com/Ritinpaul/Bug-Triage-Max"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1 underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity"
          >
            View Source <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Dismiss demo banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
