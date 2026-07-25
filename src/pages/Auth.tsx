import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Lock, Mail, User, Loader2 } from "lucide-react";

export function AuthPage() {
  const navigate = useNavigate();

  // Authentication States
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Form Submission Logic
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        navigate("/brand-foundation");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Google OAuth Logic
  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google sign-in isn't set up yet for this project"
      );
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900 font-sans antialiased">

      {/* 1. LEFT PANEL: Brand, Vision Copy & Grounded Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-100 flex-col justify-between p-12 border-r border-slate-200/60 min-h-screen">
        <div>
          <Logo size={32} />
        </div>

        <div className="my-auto py-8">
          <div className="max-w-md mb-8">
            <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              {mode === "signup"
                ? "Start building executive presence on LinkedIn in minutes."
                : '"SwiftBrand transformed how our agency handles LinkedIn personal branding."'}
            </h2>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              {mode === "signup"
                ? "Join 500+ agencies and leaders scaling client content, capturing brand voice, and automating growth."
                : "Onboard clients in minutes, capture authentic brand voices, and scale publishing workflows effortlessly."}
            </p>
          </div>

          <div className="w-full max-w-md h-80 rounded-2xl overflow-hidden border border-slate-200/80 shadow-lg">
            <img
              src="/signin.png"
              alt="SwiftBrand Professional Workspace"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          The LinkedIn Operating System for Agencies
        </div>
      </div>

      {/* 2. RIGHT PANEL: Navigation & Auth Form */}
      <div className="flex-1 flex flex-col justify-between p-8 lg:p-16 max-w-xl mx-auto w-full min-h-screen">

        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo size={28} />
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors ml-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Return to swiftbrand.io
          </Link>
        </div>

        {/* Form Container */}
        <div className="my-auto py-8">
          <h1 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            {mode === "signin"
              ? "Sign in to manage your clients, content queues, and brand metrics."
              : "Start your 14-day free trial. No credit card required."}
          </p>

          <div className="mt-8 space-y-5">
            {/* Google SSO Button */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              className="w-full py-3 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100/80 transition-colors flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
            >
              <GoogleIcon />
              {googleLoading ? "Redirecting…" : mode === "signup" ? "Sign up with Google" : "Continue with Google"}
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-slate-50 px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase absolute">
                or work email
              </span>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name field — Only shown during Sign Up */}
              {mode === "signup" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all shadow-sm"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@agency.com"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Password
                  </label>
                  {mode === "signin" && (
                    <a href="#forgot" className="text-xs font-semibold text-indigo-600 hover:underline">
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    placeholder={mode === "signup" ? "Create password (min 6 chars)" : "••••••••"}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="btn-primary w-full py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/20 mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Please wait…
                  </>
                ) : mode === "signin" ? (
                  "Sign in to SwiftBrand →"
                ) : (
                  "Create Free Account →"
                )}
              </button>
            </form>
          </div>

          {/* Mode Switcher */}
          <p className="text-xs text-slate-500 text-center mt-6">
            {mode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("signup");
                  }}
                  className="font-semibold text-indigo-600 hover:underline inline-block"
                >
                  Start free trial
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("signin");
                  }}
                  className="font-semibold text-indigo-600 hover:underline inline-block"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-400">
          © {new Date().getFullYear()} SwiftBrand. All rights reserved.
        </div>
      </div>

    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
      <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
      <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
    </svg>
  );
}