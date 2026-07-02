import { useState, useEffect } from "react";
import { GlassCard } from "@/components/GlassCard";
import { motion } from "framer-motion";
import { trpc } from "@/providers/trpc";
import { Loader2, Bug } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";

export default function Signup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // Already logged in? Skip the signup page
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, redirectTo]);

  const register = trpc.auth.register.useMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await register.mutateAsync(formData);
      navigate(redirectTo, { replace: true });
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to sign up");
      setIsSubmitting(false);
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
        <GlassCard className="p-8 space-y-6 shadow-2xl border border-white/70 bg-white/80 backdrop-blur-xl rounded-3xl text-center">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Bug className="w-7 h-7 text-white" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Create an Account</h1>
            <p className="text-sm text-slate-500 font-medium">Sign up to manage your AI triage system</p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 text-sm font-medium py-2 rounded-lg">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Name</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all shadow-sm"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email</label>
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all shadow-sm"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                required
                minLength={6}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all shadow-sm"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-3 px-4 text-sm font-bold text-white bg-sky-500 hover:bg-sky-400 rounded-xl transition-all shadow-lg shadow-sky-500/25 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isSubmitting ? "Creating account…" : "Sign Up"}
            </button>
          </form>

          <p className="text-sm text-slate-500">
            Already have an account? <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="text-sky-600 font-bold hover:underline">Log in</Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
