import { useState, useEffect } from "react";
import { GlassCard } from "@/components/GlassCard";
import { motion } from "framer-motion";
import { trpc } from "@/providers/trpc";
import { Loader2, Bug, Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router";
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

  const login = trpc.auth.login.useMutation();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await login.mutateAsync(formData);
      navigate(redirectTo, { replace: true });
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to log in");
      setIsSubmitting(false);
    }
  };

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

          {errorMsg && (
            <div className="bg-red-50 text-red-600 text-sm font-medium py-2 rounded-lg">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email</label>
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all shadow-sm text-slate-900"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all shadow-sm pr-10 text-slate-900"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting || isGuestLoading}
              className="w-full flex items-center justify-center py-3 px-4 text-sm font-bold text-white bg-sky-500 hover:bg-sky-400 rounded-xl transition-all shadow-lg shadow-sky-500/25 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isSubmitting ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/80 px-2 text-slate-400">Or continue with</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isGuestLoading || isSubmitting}
              className="w-full flex items-center justify-center py-3 px-4 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGuestLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isGuestLoading ? "Signing in…" : "Continue as Guest"}
            </button>

            <p className="text-sm text-slate-500">
              Don't have an account? <Link to={`/signup?redirect=${encodeURIComponent(redirectTo)}`} className="text-sky-600 font-bold hover:underline">Sign up</Link>
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

