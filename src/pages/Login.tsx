import { useState, useEffect } from "react";
import { GlassCard } from "@/components/GlassCard";
import { motion } from "framer-motion";
import { trpc } from "@/providers/trpc";
import { Loader2, Bug } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // Already logged in? Skip the login page
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, redirectTo]);

  const guestLogin = trpc.auth.guestLogin.useMutation();
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    try {
      await guestLogin.mutateAsync();
      navigate(redirectTo, { replace: true });
    } catch (e) {
      console.error(e);
      setIsGuestLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#c9e4f8] via-[#dbedfb] to-[#f0f7ff]">
        <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#c9e4f8] via-[#dbedfb] to-[#f0f7ff]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
        className="w-full max-w-sm"
      >
        <GlassCard className="p-8 text-center space-y-6 shadow-2xl border border-white/70 bg-white/80 backdrop-blur-xl rounded-3xl">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Bug className="w-7 h-7 text-white" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Welcome back</h1>
            <p className="text-sm text-slate-400 font-medium">Sign in to manage your AI triage system</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGuestLogin}
              disabled={isGuestLoading}
              className="w-full flex items-center justify-center py-3 px-4 text-sm font-bold text-white bg-sky-500 hover:bg-sky-400 rounded-xl transition-all shadow-lg shadow-sky-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGuestLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isGuestLoading ? "Signing in…" : "Continue as Guest"}
            </button>

            <p className="text-xs text-slate-400">
              No account needed · Demo mode · Full access
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

