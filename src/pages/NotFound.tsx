import { Link } from "react-router";
import { GlassCard } from "@/components/GlassCard";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <GlassCard className="p-6 text-center space-y-4 shadow-xl border border-slate-200/60">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-teal-500">404</h1>
          <p className="text-sm text-slate-500 font-semibold">Page not found</p>
          <Link
            to="/"
            className="inline-block w-full py-2.5 px-4 text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:opacity-95 rounded-xl transition-all shadow-sm text-center"
          >
            Back to Home
          </Link>
        </GlassCard>
      </motion.div>
    </div>
  );
}
