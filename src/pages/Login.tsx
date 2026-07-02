import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { motion } from "framer-motion";
import { trpc } from "@/providers/trpc";
import { Loader2 } from "lucide-react";

export default function Login() {
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    try {
      await guestLogin.mutateAsync();
      window.location.href = "/dashboard";
    } catch (e) {
      console.error(e);
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <GlassCard className="p-6 text-center space-y-6 shadow-xl border border-slate-200/60">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Welcome to Bug Triage</h1>
            <p className="text-xs text-slate-450 font-semibold">Sign in to manage your agent triage system</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleGuestLogin}
              disabled={isGuestLoading}
              className="w-full flex items-center justify-center py-2.5 px-4 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              {isGuestLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-400" />
              ) : null}
              {isGuestLoading ? "Logging in..." : "Continue as Guest"}
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
