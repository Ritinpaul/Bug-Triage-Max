import { Link } from "react-router";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";
import {
  Bug,
  Zap,
  Shield,
  Github,
  ArrowRight,
  Globe,
  Check,
} from "lucide-react";

/* ─── Floating Bug Icon (like the envelopes in the reference) ── */
function FloatingBugIcon({
  className,
  size = 80,
  delay = 0,
  duration = 6,
  rotate = 0,
}: {
  className?: string;
  size?: number;
  delay?: number;
  duration?: number;
  rotate?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, rotate: rotate - 20 }}
      animate={{ opacity: 1, scale: 1, rotate }}
      transition={{ duration: 1.2, delay, type: "spring", stiffness: 60, damping: 12 }}
      className={`absolute pointer-events-none select-none ${className}`}
    >
      <motion.div
        animate={{ 
          y: [0, -25, 15, -10, 0], 
          x: [0, 20, -15, 10, 0],
          rotate: [rotate - 2, rotate + 6, rotate - 6, rotate + 3, rotate - 2] 
        }}
        transition={{ 
          duration: duration * 1.2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        <div
          className="rounded-[1.25rem] bg-white/70 backdrop-blur-md shadow-2xl shadow-sky-900/10 flex items-center justify-center border border-white/80 transition-transform"
          style={{
            width: size,
            height: size,
            transform: `rotate(${rotate}deg)`,
          }}
        >
          <Bug className="text-sky-400/80 drop-shadow-md" style={{ width: size * 0.45, height: size * 0.45 }} />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Mouse Parallax Hook ─────────────────────────────────────── */
function useMouseParallax(strength = 20) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 50, damping: 20 });
  const springY = useSpring(y, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      x.set(((e.clientX - cx) / cx) * strength);
      y.set(((e.clientY - cy) / cy) * strength);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [x, y, strength]);

  return { x: springX, y: springY };
}

/* ─── Pricing Card ────────────────────────────────────────────── */
function PricingCard({
  title,
  price,
  features,
  highlighted = false,
  delay = 0,
}: {
  title: string;
  price: string;
  features: string[];
  highlighted?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`relative p-8 rounded-3xl border flex flex-col ${
        highlighted
          ? "bg-[#0f172a] text-white border-sky-400/30 shadow-2xl shadow-sky-500/10"
          : "bg-white/70 backdrop-blur-sm text-[#0f172a] border-white/60 shadow-lg shadow-black/5"
      }`}
    >
      <p className={`text-sm font-semibold mb-2 ${highlighted ? "text-sky-300" : "text-sky-600"}`}>
        {title}
      </p>
      <p className="text-4xl font-black mb-6">{price}</p>
      <ul className="space-y-3 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${highlighted ? "text-sky-400" : "text-sky-500"}`} />
            <span className={highlighted ? "text-white/70" : "text-gray-600"}>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/dashboard"
        className={`mt-8 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all ${
          highlighted
            ? "bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/30"
            : "bg-[#0f172a] hover:bg-[#1e293b] text-white"
        }`}
      >
        Get Started <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const mouse = useMouseParallax(15);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#c9e4f8] via-[#dbedfb] to-[#f0f7ff] text-[#0f172a] overflow-x-hidden font-sans">
      {/* ─── Navbar (dark glassmorphic pill) ─────────────── */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-3xl">
        <motion.nav
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
          className="w-full"
        >
          <div className="bg-[#1e2336]/95 backdrop-blur-2xl border border-white/[0.08] rounded-full px-6 sm:px-8 h-16 flex items-center justify-between shadow-2xl shadow-black/30 relative">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0 z-10">
              <div className="w-10 h-10 rounded-full bg-[#52b1e4] flex items-center justify-center">
                <Bug className="w-5 h-5 text-white" />
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              {["Home", "Solutions", "Pricing", "Contact"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-sm font-semibold text-white/70 hover:text-white transition-colors whitespace-nowrap tracking-wide"
                >
                  {item}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-4 z-10 flex-shrink-0">
              <Link to="/login" className="text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 px-4 sm:px-5 py-2.5 rounded-full transition-colors whitespace-nowrap">
                Log In
              </Link>
              <Link
                to="/dashboard"
                className="text-sm font-bold text-[#0f172a] bg-white hover:bg-gray-100 px-5 sm:px-6 py-2.5 rounded-full transition-all whitespace-nowrap hidden sm:block"
              >
                Start Today
              </Link>
            </div>
          </div>
        </motion.nav>
      </div>

      {/* ─── Hero Section ───────────────────────────────── */}
      <section id="home" className="relative min-h-screen flex items-center justify-center px-6 pt-20 overflow-hidden">
        {/* Floating Bug Icons (like envelopes) with mouse parallax */}
        <motion.div style={{ x: mouse.x, y: mouse.y }} className="absolute inset-0 pointer-events-none z-0">
          <FloatingBugIcon className="top-[10%] left-[3%]" size={90} delay={0.3} duration={7} rotate={-15} />
          <FloatingBugIcon className="top-[8%] right-[5%]" size={100} delay={0.5} duration={6} rotate={20} />
          <FloatingBugIcon className="bottom-[30%] left-[2%]" size={70} delay={0.7} duration={8} rotate={10} />
          <FloatingBugIcon className="bottom-[22%] right-[3%]" size={85} delay={0.9} duration={7} rotate={-10} />
          <FloatingBugIcon className="top-[45%] left-[10%]" size={55} delay={1.1} duration={9} rotate={25} />
          <FloatingBugIcon className="top-[30%] right-[12%]" size={60} delay={1.3} duration={6.5} rotate={-20} />
          <FloatingBugIcon className="bottom-[45%] left-[18%]" size={45} delay={1.5} duration={8.5} rotate={5} />
          <FloatingBugIcon className="bottom-[35%] right-[15%]" size={50} delay={0.4} duration={7.5} rotate={-8} />
        </motion.div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center text-center">
          {/* Social Proof Pill */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/70 backdrop-blur-md border border-white/80 shadow-lg shadow-black/5 mb-10"
          >
            <div className="flex -space-x-1.5">
              {["#4f46e5", "#06b6d4", "#f59e0b"].map((c, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border-2 border-white"
                  style={{ background: c }}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-[#0f172a]/70">
              16,000+ founders raising with OpenVC
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black leading-[1.05] tracking-tight text-[#0f172a] mb-8"
          >
            The best bug triage,
            <br />
            <span className="text-[#0f172a]">ever made.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="text-base md:text-lg text-[#0f172a]/50 leading-relaxed max-w-lg mx-auto mb-10"
          >
            Get <span className="text-[#0f172a]/80 font-medium">real-time notifications</span> with our AI agents,
            ensuring you never miss an <span className="text-[#0f172a]/80 font-medium italic">important issue</span>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="flex items-center justify-center gap-4"
          >
            <Link
              to="/dashboard"
              className="group flex items-center gap-2 px-8 py-4 bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold rounded-2xl transition-all text-sm shadow-xl shadow-black/10"
            >
              Start Today
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="https://github.com/Ritinpaul/Bug-Triage-Max"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white/70 backdrop-blur-sm hover:bg-white border border-white/80 text-[#0f172a]/80 hover:text-[#0f172a] font-bold rounded-2xl transition-all text-sm shadow-lg shadow-black/5"
            >
              Try it first
            </a>
          </motion.div>
        </div>
      </section>

      {/* ─── Simple Pricing ─────────────────────────────── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-[#0f172a] mb-4">Simple pricing</h2>
            <p className="text-[#0f172a]/40 max-w-md mx-auto">
              No hidden fees. No surprises. Choose the plan that fits your team.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PricingCard
              title="Free"
              price="$0/mo"
              features={["3 AI agents", "100 bugs/month", "Slack integration", "Basic analytics"]}
              delay={0.1}
            />
            <PricingCard
              title="Pro"
              price="$29/mo"
              features={["Unlimited bugs", "GitHub auto-sync", "Priority scoring", "Team management", "Email ingestion"]}
              highlighted
              delay={0.2}
            />
            <PricingCard
              title="Enterprise"
              price="Custom"
              features={["Custom agents", "SSO & SAML", "SLA guarantee", "Dedicated support", "On-premise option"]}
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* ─── Features Row ───────────────────────────────── */}
      <section id="solutions" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-[#0f172a]">
              Everything you need.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Secure by default",
                desc: "OAuth 2.0, JWT sessions, webhook signature verification. Your data stays safe.",
                cardBg: "bg-[#f8eed1]",
                textColor: "text-[#0f172a]",
                descColor: "text-[#0f172a]/70",
                iconColor: "text-[#0f172a]",
              },
              {
                icon: Zap,
                title: "Lightning fast",
                desc: "End-to-end processing in under 3 seconds. Real-time SSE updates.",
                cardBg: "bg-[#8b5cf6]",
                textColor: "text-white",
                descColor: "text-white/80",
                iconColor: "text-white",
              },
              {
                icon: Globe,
                title: "Works everywhere",
                desc: "Slack, Email, Forms, GitHub — ingest bug reports from every channel.",
                cardBg: "bg-[#9cd3a1]",
                textColor: "text-[#0f172a]",
                descColor: "text-[#0f172a]/70",
                iconColor: "text-[#0f172a]",
              },
            ].map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className={`p-8 rounded-3xl ${feat.cardBg} shadow-lg shadow-black/5 group hover:shadow-xl transition-all duration-300 relative overflow-hidden`}
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <feat.icon className={`w-8 h-8 ${feat.iconColor} mb-8`} />
                  </div>
                  <div>
                    <h3 className={`text-2xl md:text-3xl font-black tracking-tight ${feat.textColor} mb-3 leading-tight`}>{feat.title}</h3>
                    <p className={`text-sm ${feat.descColor} leading-relaxed font-semibold`}>{feat.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────── */}
      <section id="contact" className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-5xl font-black text-[#0f172a] mb-4">
            Ready to ship faster?
          </h2>
          <p className="text-[#0f172a]/40 mb-8 max-w-md mx-auto">
            Stop letting bugs slip through the cracks. Let AI handle the chaos while your team focuses on building.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="group flex items-center gap-2 px-8 py-4 bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold rounded-2xl transition-all text-sm shadow-xl shadow-black/10"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ─────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-[#0f172a]/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-sky-400 flex items-center justify-center">
              <Bug className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-[#0f172a]/60">Bug Triage Max</span>
          </div>
          <p className="text-xs text-[#0f172a]/30">© 2026 Bug Triage Max. Built for teams that ship.</p>
          <a
            href="https://github.com/Ritinpaul/Bug-Triage-Max"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0f172a]/30 hover:text-[#0f172a]/60 transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </footer>
    </div>
  );
}
