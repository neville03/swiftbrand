import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import {
  Sparkles,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Zap,
  BarChart3,
  CheckCircle2,
  Layers,
  Command,
  Shield,
  Cpu,
  Globe,
  PlayCircle,
} from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">

      {/* 1. NAVBAR */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 lg:px-16 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <Logo size={32} />
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#workflow" className="hover:text-slate-900 transition-colors">Workflow</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm px-4 py-2">
            Sign in
          </Link>
          <Link to="/login" className="btn-primary text-sm px-5 py-2.5 rounded-full font-semibold shadow-md shadow-indigo-500/10">
            Start Free
          </Link>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="px-6 lg:px-16 pt-16 pb-20 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-12 gap-12 items-center">

          {/* Hero Copy */}
          <div className="lg:col-span-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold mb-6">
              Built for African professionals turning visibility into revenue
            </div>

            <h1 className="font-display text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.08] tracking-tight">
              Your expertise is real. <br />
              Your pipeline shouldn't <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 bg-clip-text text-transparent">
                depend on luck.
              </span>
            </h1>

            <p className="mt-6 text-slate-600 text-lg leading-relaxed max-w-xl">
              SwiftBrand turns your LinkedIn presence into real client work — brand voice, content, a public profile clients can book from, and an escrow-secured pipeline to get paid, all built for how business actually gets done across African markets.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <Link to="/login" className="btn-primary text-base px-6 py-3.5 rounded-full font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#demo" className="btn-ghost text-base px-6 py-3.5 rounded-full font-semibold border border-slate-200 flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-slate-500" /> Watch Demo
              </a>
            </div>
          </div>

          {/* Hero Dashboard Visual (Clean, unobscured) */}
          <div className="lg:col-span-6">
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-6 shadow-2xl shadow-indigo-500/5 backdrop-blur-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-mono text-slate-400">SwiftBrand Workspace / Acme Corp</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Engagement Velocity</span>
                  <div className="text-2xl font-black text-slate-900 mt-2 flex items-center gap-3">
                    142,890
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">+34.2%</span>
                  </div>
                  <div className="h-20 mt-4 w-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border-b-2 border-indigo-500/40" />
                </div>

                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Voice Profile</span>
                    <div className="text-2xl font-black text-indigo-600 mt-2">98.4%</div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Strategy synced 2m ago</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. LOGO CLOUD */}
      <section className="border-y border-slate-100 py-10 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
            Trusted by hyper-growth agencies and category leaders
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all">
            <div className="flex items-center gap-2 font-black text-slate-800 text-lg"><Layers className="w-5 h-5 text-indigo-600" /> NEXUS</div>
            <div className="flex items-center gap-2 font-black text-slate-800 text-lg"><Command className="w-5 h-5 text-indigo-600" /> LINEARITY</div>
            <div className="flex items-center gap-2 font-black text-slate-800 text-lg"><Shield className="w-5 h-5 text-indigo-600" /> VERITAS</div>
            <div className="flex items-center gap-2 font-black text-slate-800 text-lg"><Cpu className="w-5 h-5 text-indigo-600" /> PULSE AI</div>
            <div className="flex items-center gap-2 font-black text-slate-800 text-lg"><Globe className="w-5 h-5 text-indigo-600" /> VENTURES</div>
          </div>
        </div>
      </section>

      {/* 4. BENTO GRID FEATURES */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold mb-4">
            Capabilities
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Engineered for absolute client leadership.
          </h2>
        </div>

        <div className="grid md:grid-cols-12 gap-6">

          {/* Card 1 (Large) */}
          <div className="md:col-span-8 bg-slate-50 border border-slate-200/80 rounded-3xl p-8 text-left flex flex-col justify-between hover:border-indigo-200 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-6 shadow-md shadow-indigo-600/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-slate-900 mb-3">AI Brand Voice Synthesis</h3>
              <p className="text-slate-600 leading-relaxed max-w-lg">
                Train hyper-tuned content models on your client’s actual past performance, publications, and exact tonal voice profile.
              </p>
            </div>
            <div className="mt-8 bg-white border border-slate-200/80 rounded-2xl p-4 flex gap-2 flex-wrap">
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full">Authoritative</span>
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full">Data-Driven</span>
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full">Thought Leader</span>
            </div>
          </div>

          {/* Card 2 (Small) */}
          <div className="md:col-span-4 bg-slate-50 border border-slate-200/80 rounded-3xl p-8 text-left flex flex-col justify-between hover:border-indigo-200 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mb-6 shadow-md shadow-purple-600/20">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-slate-900 mb-3">Smart Calendar</h3>
              <p className="text-slate-600 leading-relaxed">
                Multi-account scheduling visualizer with automatic queue optimization.
              </p>
            </div>
            <div className="mt-8 bg-white border border-slate-200/80 rounded-2xl p-4 text-center font-bold text-indigo-600 text-sm">
              Optimal Posting Slot: 08:30 AM
            </div>
          </div>

          {/* Card 3 (Small) */}
          <div className="md:col-span-4 bg-slate-50 border border-slate-200/80 rounded-3xl p-8 text-left hover:border-indigo-200 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-6 shadow-md shadow-indigo-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-display text-2xl font-bold text-slate-900 mb-3">Client Isolation</h3>
            <p className="text-slate-600 leading-relaxed">
              Secure OAuth token isolation ensuring client privacy and zero shared access risks.
            </p>
          </div>

          {/* Card 4 (Large) */}
          <div className="md:col-span-8 bg-slate-50 border border-slate-200/80 rounded-3xl p-8 text-left hover:border-indigo-200 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mb-6 shadow-md shadow-purple-600/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-display text-2xl font-bold text-slate-900 mb-3">Deep Impact Analytics</h3>
            <p className="text-slate-600 leading-relaxed max-w-lg">
              Track follower quality, impression velocity, inbound leads, and client brand authority across customizable reporting windows.
            </p>
          </div>

        </div>
      </section>

      {/* 5. AI STRATEGIST SECTION (DARK BLOCK) */}
      <section className="py-12 max-w-7xl mx-auto px-6 w-full">
        <div className="bg-slate-950 text-white rounded-3xl p-10 md:p-16 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-6">
              Autonomous Strategy Engine
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">
              Meet your AI Brand Strategist.
            </h2>
            <p className="mt-4 text-slate-400 text-base md:text-lg leading-relaxed">
              SwiftBrand continuously analyzes engagement patterns to write, refine, and queue posts tailored to executive-level audiences.
            </p>

            <div className="mt-8 bg-slate-900/90 border border-purple-500/30 rounded-2xl p-6 text-left font-mono text-sm text-purple-300 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <code>&gt; Generating 30-day viral content flywheel for Executive Profile...</code>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WORKFLOW / TIMELINE */}
      <section id="workflow" className="py-24 max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold mb-4">
            Workflow
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            From onboarding to market dominance.
          </h2>
        </div>

        <div className="space-y-8 relative before:absolute before:inset-0 before:left-1/2 before:-translate-x-px before:h-full before:w-0.5 before:bg-indigo-100 hidden sm:block">

          <div className="relative flex items-center justify-between group">
            <div className="w-5/12 text-right pr-8">
              <h3 className="font-display font-bold text-xl text-slate-900">1. Client Onboarding</h3>
              <p className="text-sm text-slate-500 mt-1">Invite clients to securely connect their LinkedIn credentials via zero-friction auth.</p>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">1</div>
            <div className="w-5/12 pl-8" />
          </div>

          <div className="relative flex items-center justify-between group">
            <div className="w-5/12 pr-8" />
            <div className="absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">2</div>
            <div className="w-5/12 text-left pl-8">
              <h3 className="font-display font-bold text-xl text-slate-900">2. Voice Extraction</h3>
              <p className="text-sm text-slate-500 mt-1">Our AI synthesizes brand guidelines, past posts, and goals into a strategy matrix.</p>
            </div>
          </div>

          <div className="relative flex items-center justify-between group">
            <div className="w-5/12 text-right pr-8">
              <h3 className="font-display font-bold text-xl text-slate-900">3. Automated Execution</h3>
              <p className="text-sm text-slate-500 mt-1">Generate, schedule, and approve posts with seamless human-in-the-loop workflows.</p>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">3</div>
            <div className="w-5/12 pl-8" />
          </div>

        </div>
      </section>

      {/* 7. METRICS BAR */}
      <section className="bg-slate-50 border-y border-slate-200/80 py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="font-display text-4xl lg:text-5xl font-black text-indigo-600">10M+</div>
            <div className="text-sm font-semibold text-slate-500 mt-2">Posts Published</div>
          </div>
          <div>
            <div className="font-display text-4xl lg:text-5xl font-black text-indigo-600">95%</div>
            <div className="text-sm font-semibold text-slate-500 mt-2">Time Saved</div>
          </div>
          <div>
            <div className="font-display text-4xl lg:text-5xl font-black text-indigo-600">3.4X</div>
            <div className="text-sm font-semibold text-slate-500 mt-2">Higher Engagement</div>
          </div>
          <div>
            <div className="font-display text-4xl lg:text-5xl font-black text-indigo-600">500+</div>
            <div className="text-sm font-semibold text-slate-500 mt-2">Agencies Powered</div>
          </div>
        </div>
      </section>

      {/* 8. PRICING SECTION */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-6 text-center">
        <div className="max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold mb-4">
            Pricing Plans
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Scale your brand operating system.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Starter */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-left flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-xl text-slate-900">Starter</h3>
              <p className="text-xs text-slate-500 mt-1">For solo creators & consultants</p>
              <div className="mt-6 mb-8">
                <span className="text-4xl font-black text-slate-900">$49</span>
                <span className="text-slate-400 text-sm">/mo</span>
              </div>
            </div>
            <Link to="/login" className="btn-ghost w-full py-3 border border-slate-200 rounded-2xl font-semibold text-center block">
              Get Started
            </Link>
          </div>

          {/* Agency (Featured) */}
          <div className="bg-white border-2 border-indigo-600 rounded-3xl p-8 text-left flex flex-col justify-between shadow-xl shadow-indigo-600/10 relative scale-105">
            <div>
              <span className="bg-indigo-600 text-white text-[10px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full inline-block mb-4">
                Most Popular
              </span>
              <h3 className="font-display font-bold text-xl text-slate-900">Agency</h3>
              <p className="text-xs text-slate-500 mt-1">For growing marketing agencies</p>
              <div className="mt-6 mb-8">
                <span className="text-4xl font-black text-slate-900">$199</span>
                <span className="text-slate-400 text-sm">/mo</span>
              </div>
            </div>
            <Link to="/login" className="btn-primary w-full py-3 rounded-2xl font-semibold text-center block shadow-lg shadow-indigo-600/20">
              Start Free Trial
            </Link>
          </div>

          {/* Enterprise */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-left flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-xl text-slate-900">Enterprise</h3>
              <p className="text-xs text-slate-500 mt-1">For large networks & brands</p>
              <div className="mt-6 mb-8">
                <span className="text-4xl font-black text-slate-900">Custom</span>
              </div>
            </div>
            <Link to="/login" className="btn-ghost w-full py-3 border border-slate-200 rounded-2xl font-semibold text-center block">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <section className="py-12 max-w-7xl mx-auto px-6 w-full">
        <div className="bg-slate-950 text-white rounded-3xl p-12 md:p-20 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight max-w-2xl mx-auto">
            Ready to transform your LinkedIn presence?
          </h2>
          <p className="mt-4 text-slate-400 text-base md:text-lg max-w-lg mx-auto">
            Join top agencies and creators who manage high-impact LinkedIn brands effortlessly.
          </p>
          <div className="mt-8">
            <Link to="/login" className="btn-primary text-base px-8 py-4 rounded-full font-semibold inline-flex items-center gap-2 shadow-xl shadow-indigo-500/20">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="border-t border-slate-200/80 mt-16 py-12 bg-white text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size={24} />
          <div className="flex gap-6">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="#privacy" className="hover:text-slate-900">Privacy</a>
            <a href="#terms" className="hover:text-slate-900">Terms</a>
          </div>
          <div>© {new Date().getFullYear()} SwiftBrand. All rights reserved.</div>
        </div>
      </footer>

    </div>
  );
}