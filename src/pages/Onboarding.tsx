import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { BrandFoundation } from "@/lib/types";

const INDUSTRIES = ["Technology / Software", "Marketing / Creative", "Finance", "Healthcare", "Education", "Consulting", "E-commerce / Retail", "Other"];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [audience, setAudience] = useState("");
  const [voice, setVoice] = useState("");
  const [topics, setTopics] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("user_social_accounts").select("platform_user_name").eq("user_id", user.id).eq("platform", "linkedin").maybeSingle();
      if (data?.platform_user_name) setFullName(data.platform_user_name);
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const payload: BrandFoundation = {
        user_id: user.id,
        full_name: fullName || null,
        role: role || null,
        industry: industry || null,
        target_audience: audience || null,
        brand_voice: voice || null,
        key_topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
        self_description: null,
      };

      const { error } = await supabase.from("brand_foundation").upsert(payload);
      if (error) throw error;
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your details");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-10 flex justify-center bg-slate-50">
      <div className="w-full max-w-xl">
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-3 flex items-center gap-1.5">
          <span aria-hidden>←</span> Back
        </button>

        <h1 className="font-display text-2xl font-bold mb-1 text-slate-900">Let's set up your brand foundation</h1>
        <p className="text-slate-500 text-sm mb-6">This takes two minutes and shapes everything SwiftBrand creates for you.</p>
        <form onSubmit={handleSubmit} className="card space-y-5">
          <Field label="Full name">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" required />
          </Field>
          <Field label="Role / title">
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Founder, Marketing Lead" className="input" required />
          </Field>
          <Field label="Industry">
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="input">
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </Field>
          <Field label="Who is your target audience?">
            <textarea value={audience} onChange={(e) => setAudience(e.target.value)} className="input min-h-[70px]" placeholder="e.g. Founders and marketing leads at African SMEs" required />
          </Field>
          <Field label="Brand voice / tone">
            <textarea value={voice} onChange={(e) => setVoice(e.target.value)} className="input min-h-[70px]" placeholder="e.g. Direct, substantive, no fluff" required />
          </Field>
          <Field label="Key topics you post about (comma separated)">
            <input value={topics} onChange={(e) => setTopics(e.target.value)} className="input" placeholder="e.g. AI agents, African tech, HR software" />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Saving…" : "Continue to dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-600 block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
