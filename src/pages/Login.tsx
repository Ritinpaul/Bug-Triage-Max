import { GlassCard } from "@/components/GlassCard";
import { motion } from "framer-motion";

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
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
          <button
            onClick={() => {
              window.location.href = getOAuthUrl();
            }}
            className="w-full py-2.5 px-4 text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:opacity-95 rounded-xl transition-all shadow-sm"
          >
            Sign in with Kimi
          </button>
        </GlassCard>
      </motion.div>
    </div>
  );
}
