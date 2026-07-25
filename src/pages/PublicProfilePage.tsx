import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Linkedin, CheckCircle2, ArrowRight } from "lucide-react";

interface PublicBrand {
  full_name: string | null;
  role: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
}
interface PublicService {
  id: string;
  title: string;
  description: string | null;
  price_range: string | null;
}

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [brand, setBrand] = useState<PublicBrand | null>(null);
  const [linkedin, setLinkedin] = useState<{ platform_user_name: string; platform_user_picture: string | null } | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inquiry, setInquiry] = useState({ name: "", service: "", budget: "", details: "" });

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("public-profile", {
        body: { username },
      });
      if (error || (data as any)?.error) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setBrand(data.brand);
      setLinkedin(data.linkedin);
      setServices(data.services ?? []);
      if (data.services?.[0]) {
        setInquiry((prev) => ({
          ...prev,
          service: data.services[0].title,
          budget: data.services[0].price_range ?? "",
        }));
      }
      setLoading(false);
    })();
  }, [username]);

  async function handleInboundSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inquiry.name.trim() || !username) return;
    setSubmitting(true);
    setSubmitError(null);
    const { error, data } = await supabase.functions.invoke("submit-inquiry", {
      body: { username, ...inquiry },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      setSubmitError((data as any)?.error ?? "Could not send your inquiry — try again.");
      return;
    }
    setSubmitted(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-xs font-medium text-slate-400 animate-pulse">Loading profile…</div>
      </div>
    );
  }

  if (notFound || !brand) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-center px-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">Profile not found</h1>
          <p className="text-sm text-slate-500">This SwiftBrand profile doesn't exist or isn't public yet.</p>
        </div>
      </div>
    );
  }

  const avatarUrl = brand.avatar_url || linkedin?.platform_user_picture;
  const displayName = brand.full_name || linkedin?.platform_user_name || "SwiftBrand user";
  const displayRole = brand.role || "Independent professional";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans py-12 px-4 flex justify-center">
      <div className="w-full max-w-2xl bg-white border border-slate-200/80 rounded-2xl shadow-sm p-8 space-y-8 self-start">
        <div className="flex items-start gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-16 h-16 rounded-full object-cover ring-2 ring-purple-100" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xl">
                {displayName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
            )}
            {linkedin && (
              <div className="absolute -bottom-1 -right-1 bg-[#0A66C2] text-white p-1 rounded-full shadow-sm" title="Connected via LinkedIn">
                <Linkedin className="w-3 h-3" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{displayName}</h1>
            <p className="text-xs text-slate-500 font-medium">{displayRole}{brand.location ? ` • ${brand.location}` : ""}</p>
          </div>
        </div>

        {brand.bio && (
          <div className="text-xs leading-relaxed text-slate-600 space-y-2">
            <p>{brand.bio}</p>
          </div>
        )}

        {services.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Services & Pricing</h2>
            <div className="space-y-2.5">
              {services.map((s) => (
                <div key={s.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">{s.title}</h3>
                    {s.description && <p className="text-[11px] text-slate-400 mt-0.5">{s.description}</p>}
                  </div>
                  {s.price_range && <span className="text-xs font-bold text-slate-900 whitespace-nowrap">{s.price_range}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-6 text-center space-y-4">
          {!showForm && !submitted && (
            <>
              <p className="text-xs text-purple-900 font-medium">Tell me what you're working on — I'll reply within a day.</p>
              <button onClick={() => setShowForm(true)} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition shadow-xs">
                Connect
              </button>
            </>
          )}

          {showForm && !submitted && (
            <form onSubmit={handleInboundSubmit} className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Your Name</label>
                <input type="text" required value={inquiry.name} onChange={(e) => setInquiry({ ...inquiry, name: e.target.value })} className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500" />
              </div>
              {services.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">What do you need help with?</label>
                  <select value={inquiry.service} onChange={(e) => setInquiry({ ...inquiry, service: e.target.value })} className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500">
                    {services.map((s) => (<option key={s.id} value={s.title}>{s.title}</option>))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">A bit about the project</label>
                <textarea rows={3} value={inquiry.details} onChange={(e) => setInquiry({ ...inquiry, details: e.target.value })} className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500 resize-none" />
              </div>
              {submitError && <p className="text-[11px] text-red-600">{submitError}</p>}
              <button type="submit" disabled={submitting} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2">
                {submitting ? "Sending…" : <>Send <ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </form>
          )}

          {submitted && (
            <div className="py-4 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-xs font-bold text-slate-900">Sent</h4>
              <p className="text-[11px] text-slate-500">Your message is in — expect a reply soon.</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <span className="text-[10px] text-slate-400 font-mono">Built with <span className="font-bold text-purple-600">SwiftBrand</span></span>
        </div>
      </div>
    </div>
  );
}
