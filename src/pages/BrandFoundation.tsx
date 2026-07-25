import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import type { BrandFoundation } from "@/lib/types";
import {
  Sparkles,
  Target,
  Volume2,
  Layers,
  Globe,
  Copy,
  User,
  Check,
  X,
  Info
} from "lucide-react";

const MAX_WORDS = 300;

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function BrandFoundationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showExplainer, setShowExplainer] = useState(true);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [niche, setNiche] = useState("B2B Software & AI Automation for West African Enterprises");
  const [targetAudience, setTargetAudience] = useState(
    "Founders, Marketing Leads, and Tech Executives seeking fast digital growth."
  );
  const [voiceAndTone, setVoiceAndTone] = useState(
    "Authoritative yet accessible, witty, bold, and culturally resonant."
  );
  const [primaryGoal, setPrimaryGoal] = useState(
    "Establish thought leadership and generate qualified inbound leads."
  );
  const [pillars, setPillars] = useState<string[]>([
    "Industry Insights & Regulatory Shifts",
    "Behind-The-Scenes Founder Journey",
    "Actionable Frameworks & How-To Playbooks",
    "Customer Impact & Case Studies",
  ]);
  const [newPillarInput, setNewPillarInput] = useState("");
  const [selfDescription, setSelfDescription] = useState("");

  // Public Profile fields — these are what /u/:username actually shows to
  // the public and to inbound client inquiries.
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [services, setServices] = useState<{ id?: string; title: string; description: string; price_range: string }[]>([]);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [bioVariants, setBioVariants] = useState({
    linkedin: "Building SwiftBrand • Helping African founders & brands master social engagement with AI handlers.",
    twitter: "Founder @SwiftBrand | AI social media agent handler for personal brands & tech scaleups 🚀",
    instagram: "✨ SwiftBrand AI Handler\n📈 Scalable Social Brand OS\n📍 Lagos & Nairobi | Remote",
    tiktok: "SwiftBrand AI Handler for African Creators & Tech Brands 💫 Link in bio!",
  });

  // Load brand foundation from Supabase
  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("brand_foundation")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      const b = data as BrandFoundation & Record<string, any>;
      setFullName(b.full_name || "");
      setRole(b.role || "");
      setIndustry(b.industry || "");
      if (b.niche) setNiche(b.niche);
      if (b.target_audience) setTargetAudience(b.target_audience);
      if (b.brand_voice) setVoiceAndTone(b.brand_voice);
      if (b.primary_goal) setPrimaryGoal(b.primary_goal);
      if (b.key_topics && Array.isArray(b.key_topics) && b.key_topics.length > 0) {
        setPillars(b.key_topics);
      }
      if (b.self_description) setSelfDescription(b.self_description);
      if (b.username) setUsername(b.username);
      if (b.bio) setBio(b.bio);
      if (b.location) setLocation(b.location);
      if (b.bio_variants) {
        setBioVariants({
          linkedin: b.bio_variants.linkedin || bioVariants.linkedin,
          twitter: b.bio_variants.twitter || bioVariants.twitter,
          instagram: b.bio_variants.instagram || bioVariants.instagram,
          tiktok: b.bio_variants.tiktok || bioVariants.tiktok,
        });
      }
    }
    setLoading(false);

    const { data: serviceRows } = await supabase
      .from("profile_services")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });
    if (serviceRows) {
      setServices(serviceRows.map((s) => ({ id: s.id, title: s.title, description: s.description ?? "", price_range: s.price_range ?? "" })));
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Save changes to Supabase
  async function handleSave() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      full_name: fullName,
      role: role,
      industry: industry,
      niche: niche,
      target_audience: targetAudience,
      brand_voice: voiceAndTone,
      primary_goal: primaryGoal,
      key_topics: pillars,
      self_description: selfDescription,
      bio_variants: bioVariants,
      username: username.trim() ? username.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") : null,
      bio: bio,
      location: location,
      updated_at: new Date().toISOString(),
    };

    const { error: saveErr } = await supabase.from("brand_foundation").upsert(payload);

    if (saveErr) {
      setSaving(false);
      if (saveErr.message.toLowerCase().includes("username")) {
        setUsernameError("That username is already taken — try another.");
      }
      return;
    }
    setUsernameError(null);

    // Sync services: simplest correct approach is replace-all for this user.
    await supabase.from("profile_services").delete().eq("user_id", user.id);
    if (services.length > 0) {
      await supabase.from("profile_services").insert(
        services
          .filter((s) => s.title.trim())
          .map((s, i) => ({
            user_id: user.id,
            title: s.title,
            description: s.description || null,
            price_range: s.price_range || null,
            sort_order: i,
          }))
      );
    }

    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  }

  function addService() {
    setServices([...services, { title: "", description: "", price_range: "" }]);
  }
  function updateService(index: number, field: "title" | "description" | "price_range", value: string) {
    setServices(services.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }
  function removeService(index: number) {
    setServices(services.filter((_, i) => i !== index));
  }

  const handleAddPillar = () => {
    if (!newPillarInput.trim()) return;
    setPillars([...pillars, newPillarInput.trim()]);
    setNewPillarInput("");
  };

  const handleRemovePillar = (index: number) => {
    setPillars(pillars.filter((_, i) => i !== index));
  };

  const copyBio = (platform: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  const handleSelfDescriptionChange = (text: string) => {
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    if (words.length <= MAX_WORDS) {
      setSelfDescription(text);
    } else {
      setSelfDescription(words.slice(0, MAX_WORDS).join(" "));
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="text-sm text-slate-500">Loading Brand Foundation...</div>
      </AppShell>
    );
  }

  const selfDescWords = countWords(selfDescription);

  return (
    <AppShell>
      <div className="space-y-6 font-sans max-w-7xl mx-auto">

        {/* Explainer Notice Banner */}
        {showExplainer && (
          <div className="bg-[#1E293B] text-white p-4 rounded-xl flex items-center justify-between shadow-md border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Brand Foundation Explainer
                </span>
                <p className="text-xs text-slate-200">
                  This module captures your core niche, target audience, voice attributes, and content pillars. SwiftBrand AI references this foundation during every ghostwriting session.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowExplainer(false)}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-600 transition-colors shrink-0 cursor-pointer"
            >
              Close Explainer
            </button>
          </div>
        )}

        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-blue-300 border border-white/10 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Brand DNA Intelligence Layer</span>
              </div>
              <h1 className="text-xl font-bold font-display text-white">Brand Foundation Setup</h1>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Every AI tool across SwiftBrand (Ghostwriter, Idea Bank, Strategist, Insights) reads this brand foundation to ensure 100% on-voice content generation.
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 shrink-0 cursor-pointer flex items-center gap-2"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Foundation Saved!</span>
                </>
              ) : (
                <span>{saving ? "Saving..." : "Save Brand Foundation"}</span>
              )}
            </button>
          </div>
        </div>

        {/* Public Profile Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-brand" /> Public Profile
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                What clients see when they land on your public page and submit an inquiry.
              </p>
            </div>
            {username.trim() && (
              <a
                href={`/u/${username.trim().toLowerCase()}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-brand hover:text-brand-dark whitespace-nowrap"
              >
                View public profile ↗
              </a>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-slate-600 block mb-1.5">Username</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">swiftbrand.app/u/</span>
                <input
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. neville-akoragye"
                />
              </div>
              {usernameError && <p className="text-xs text-red-600 mt-1">{usernameError}</p>}
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1.5">Location</label>
              <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kampala, Uganda" />
            </div>
          </div>

          <div className="mb-5">
            <label className="text-sm text-slate-600 block mb-1.5">Public bio</label>
            <textarea
              className="input min-h-[80px]"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short positioning statement clients will read first."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Services & pricing</label>
              <button type="button" onClick={addService} className="text-xs font-semibold text-brand hover:text-brand-dark">
                + Add service
              </button>
            </div>
            {services.length === 0 ? (
              <p className="text-xs text-slate-400">No services listed yet — add at least one so inquiries know what to ask for.</p>
            ) : (
              services.map((s, i) => (
                <div key={i} className="grid sm:grid-cols-[1fr_1fr_140px_auto] gap-2 items-start">
                  <input className="input" placeholder="Service title" value={s.title} onChange={(e) => updateService(i, "title", e.target.value)} />
                  <input className="input" placeholder="Short description" value={s.description} onChange={(e) => updateService(i, "description", e.target.value)} />
                  <input className="input" placeholder="$1,000–2,000" value={s.price_range} onChange={(e) => updateService(i, "price_range", e.target.value)} />
                  <button type="button" onClick={() => removeService(i)} className="text-slate-400 hover:text-red-600 text-sm px-2">✕</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Form Fields (2 columns) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Founder Profile Details */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#2563EB]" />
                <span>Founder / Personal Profile</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-xs focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="e.g. Neville Akoragye"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-xs focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="e.g. Co-Founder & CEO"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Industry / Sector
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-xs focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="e.g. Artificial Intelligence / B2B SaaS"
                />
              </div>
            </div>

            {/* Niche & Target Audience */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#2563EB]" />
                <span>Niche & Target Audience</span>
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Your Market Niche / Specialization
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-xs focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="e.g. B2B SaaS & Enterprise AI for Emerging Markets"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Ideal Target Audience & Persona
                </label>
                <textarea
                  rows={3}
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-xs focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all leading-relaxed"
                  placeholder="African Founders, Tech Executives, VCs, and Innovation Directors..."
                />
              </div>
            </div>

            {/* Voice, Tone & Primary Goal */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#7C3AED]" />
                <span>Brand Voice, Tone & Primary Goal</span>
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Voice & Tone Guidelines
                </label>
                <input
                  type="text"
                  value={voiceAndTone}
                  onChange={(e) => setVoiceAndTone(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-xs focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Confident, Insightful, Direct, and Visionary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Primary Brand Goal
                </label>
                <input
                  type="text"
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-xs focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Build Thought Leadership & Generate Inbound B2B Leads"
                />
              </div>
            </div>

            {/* Stated Content Pillars */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Stated Content Pillars</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {pillars.length} Active Pillars
                </span>
              </div>
              <p className="text-xs text-slate-500">
                SwiftBrand's Calendar automatically flags when your scheduled queue drifts away from these ratios.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPillarInput}
                  onChange={(e) => setNewPillarInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPillar()}
                  placeholder="Add a content pillar (e.g. Industry News, Founder Story...)"
                  className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-xs outline-none focus:bg-white focus:border-[#2563EB]"
                />
                <button
                  onClick={handleAddPillar}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Add Pillar
                </button>
              </div>

              <div className="space-y-2">
                {pillars.map((pillar, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                      <span className="text-xs font-bold text-slate-800">{pillar}</span>
                    </div>
                    <button
                      onClick={() => handleRemovePillar(idx)}
                      className="text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Personal Description */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-slate-900">
                  Detailed Bio / Personal Style Prompt
                </h3>
                <span className={`text-xs font-medium ${selfDescWords >= MAX_WORDS ? "text-red-600" : "text-slate-400"}`}>
                  {selfDescWords} / {MAX_WORDS} words
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Describe how you think, your background, and key perspectives. The AI references this to write captions that actually sound like you.
              </p>
              <textarea
                rows={4}
                value={selfDescription}
                onChange={(e) => handleSelfDescriptionChange(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-xs focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all leading-relaxed"
                placeholder="What matters to you? What makes your background unique? What generic phrases should the AI never use?"
              />
            </div>

          </div>

          {/* Right Column: Platform Bio Variants */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 sticky top-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-600" />
                  <span>Platform Bio Variants</span>
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  AI Sync Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tailored bios generated for each platform based on your Brand DNA.
              </p>

              <div className="space-y-4">
                {[
                  { key: "linkedin", label: "LinkedIn Bio", val: bioVariants.linkedin },
                  { key: "twitter", label: "X (Twitter) Bio", val: bioVariants.twitter },
                  { key: "instagram", label: "Instagram Bio", val: bioVariants.instagram },
                  { key: "tiktok", label: "TikTok Bio", val: bioVariants.tiktok },
                ].map((b) => (
                  <div key={b.key} className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        {b.label}
                      </span>
                      <button
                        onClick={() => copyBio(b.key, b.val)}
                        className="text-[10px] text-[#2563EB] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        {copiedPlatform === b.key ? (
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Copied!
                          </span>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={b.val}
                      onChange={(e) =>
                        setBioVariants({ ...bioVariants, [b.key]: e.target.value })
                      }
                      className="w-full text-xs bg-white p-2 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-[#2563EB] resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}