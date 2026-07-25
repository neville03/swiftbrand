import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { startLinkedInConnect } from "@/lib/linkedin";
import type { BrandFoundation, Post, SocialAccount } from "@/lib/types";

interface BriefingItem {
  id: string;
  rank: string;
  type: "lead" | "engagement" | "reconnect" | "content_gap" | "human_call";
  priority: "high" | "mid" | "you";
  title: string;
  context: string;
  draftLabel?: string;
  draftContent?: string;
  ctaText?: string;
  ctaLink?: string;
  quote?: string;
}

export function DashboardPage() {
  const [brand, setBrand] = useState<BrandFoundation | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [ideasCount, setIdeasCount] = useState<number | null>(null);
  const [linkedin, setLinkedin] = useState<SocialAccount | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [openDraftId, setOpenDraftId] = useState<string | null>(null);
  const [showSetupDetails, setShowSetupDetails] = useState(false);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: brandData }, { data: postData }, { count: ideaCount }, { data: liData }] =
      await Promise.all([
        supabase.from("brand_foundation").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ideas").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("user_social_accounts")
          .select("*")
          .eq("user_id", user.id)
          .eq("platform", "linkedin")
          .maybeSingle(),
      ]);

    setBrand(brandData as BrandFoundation | null);
    setPosts((postData as Post[]) ?? []);
    setIdeasCount(ideaCount ?? 0);
    setLinkedin(liData as SocialAccount | null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const published = posts.filter((p) => p.status === "published").length;
  const queued = posts.filter((p) => p.status === "draft" || p.status === "publishing").length;

  const setupSteps = [
    { label: "Brand Foundation", done: !!brand, to: "/brand-foundation" },
    { label: "Connect LinkedIn", done: !!linkedin, action: () => startLinkedInConnect() },
    { label: "Create an Idea", done: (ideasCount ?? 0) > 0, to: "/ideas" },
    { label: "Publish First Post", done: published > 0, to: "/new" },
  ];

  const completedCount = setupSteps.filter((s) => s.done).length;
  const completionPct = Math.round((completedCount / setupSteps.length) * 100);

  // Briefing items synthesized based on state
  const briefingItems: BriefingItem[] = [];

  if (!brand) {
    briefingItems.push({
      id: "brand-setup",
      rank: "01",
      type: "content_gap",
      priority: "high",
      title: "Your Brand Foundation is empty",
      context: "The Ghostwriter needs your voice parameters to start auto-generating posts.",
      ctaText: "Set up voice →",
      ctaLink: "/brand-foundation",
    });
  }

  if (!linkedin) {
    briefingItems.push({
      id: "connect-linkedin",
      rank: "02",
      type: "engagement",
      priority: "high",
      title: "LinkedIn is not connected",
      context: "Link your profile so posts and replies can be scheduled seamlessly.",
    });
  }

  if (published === 0) {
    briefingItems.push({
      id: "first-post",
      rank: "03",
      type: "content_gap",
      priority: "mid",
      title: "No published activity yet",
      context: "Publish your first post to activate reach and conversion tracking.",
      draftLabel: "Suggested Post Outline",
      draftContent: "3 positioning mistakes founder-operators make in early-stage messaging (and how to fix them).",
      ctaText: "Write with Ghostwriter →",
      ctaLink: "/new",
    });
  }

  // Fallback items if fully configured
  if (briefingItems.length === 0) {
    briefingItems.push(
      {
        id: "lead-reply",
        rank: "01",
        type: "lead",
        priority: "high",
        title: "Kofi Mensah at Aza Finance replied to your DM",
        context: '"This is exactly the positioning work we need — can we talk this week?"',
        draftLabel: "Drafted Reply",
        draftContent:
          "Kofi — glad it landed. I've got Tuesday 2pm or Thursday 10am open for a 30-min call. Here's my link: cal.link/neville",
      },
      {
        id: "human-pricing",
        rank: "02",
        type: "human_call",
        priority: "you",
        title: "Inbound quote request for 3-month retainer",
        context: "Pricing conversation requiring your decision.",
        quote: '"What would a 3-month retainer look like, roughly, so we can see if it fits our budget?"',
      }
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[300px] text-xs font-mono text-slate-400">
          Loading briefing…
        </div>
      </AppShell>
    );
  }

  const firstName = brand?.full_name ? brand.full_name.split(" ")[0] : "there";

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ULTRA-COMPACT SETUP PROGRESS BANNER (Only when < 100%) */}
        {completedCount < setupSteps.length && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                <span className="font-medium text-slate-700">
                  Workspace Setup: <span className="font-semibold text-slate-900">{completionPct}% Complete</span>
                </span>
                <span className="text-slate-400 hidden sm:inline">• {completedCount} of 4 steps finished</span>
              </div>
              <button
                onClick={() => setShowSetupDetails(!showSetupDetails)}
                className="text-purple-600 font-medium hover:underline text-[11px]"
              >
                {showSetupDetails ? "Hide steps" : "View checklist →"}
              </button>
            </div>

            {showSetupDetails && (
              <div className="grid sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-200/60">
                {setupSteps.map((s) => (
                  <div
                    key={s.label}
                    className={`p-2 rounded-lg border text-left ${
                      s.done ? "bg-slate-100/60 border-slate-200 text-slate-400" : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono">{s.done ? "✓ Done" : "Pending"}</span>
                    </div>
                    <div className={`font-medium ${s.done ? "line-through" : "text-slate-900"}`}>{s.label}</div>
                    {!s.done && (
                      <div className="mt-1.5">
                        {s.action ? (
                          <button onClick={s.action} className="text-purple-600 hover:underline font-medium text-[11px]">
                            Connect →
                          </button>
                        ) : (
                          <Link to={s.to!} className="text-purple-600 hover:underline font-medium text-[11px]">
                            Open →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-200/60 pb-5">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
              Daily Briefing · {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Good morning, {firstName}. <span className="text-slate-400 font-normal">Here's today's pulse.</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/calendar"
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg transition"
            >
              Queue ({queued})
            </Link>
            <Link
              to="/new"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg transition"
            >
              ✦ Ghostwriter
            </Link>
          </div>
        </div>

        {/* MAIN 2-COLUMN LAYOUT */}
        <div className="grid lg:grid-cols-[1fr_260px] gap-8 items-start">

          {/* LEFT: BRIEFING FEED */}
          <div className="space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
              Action Items ({briefingItems.length})
            </div>

            {briefingItems.map((item) => {
              const isOpen = openDraftId === item.id;
              const railColor =
                item.priority === "high"
                  ? "bg-amber-500"
                  : item.priority === "you"
                  ? "bg-teal-600"
                  : "bg-purple-600";

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden flex transition hover:border-slate-300"
                >
                  <div className={`w-1 shrink-0 ${railColor}`} />
                  <div className="p-4 sm:p-5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs text-slate-400">{item.rank}</span>
                      <span className="text-[10px] font-mono font-medium uppercase text-slate-500 tracking-wide">
                        {item.type.replace("_", " ")}
                      </span>
                    </div>

                    <h3 className="font-semibold text-slate-900 text-base">{item.title}</h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">{item.context}</p>

                    {item.quote && (
                      <div className="mt-2.5 p-2.5 bg-teal-50/50 border border-teal-100 rounded-lg text-xs text-teal-900 font-medium italic">
                        {item.quote}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-3">
                      {item.draftContent && (
                        <button
                          onClick={() => setOpenDraftId(isOpen ? null : item.id)}
                          className="text-xs font-medium text-slate-900 underline hover:text-purple-600 transition"
                        >
                          {isOpen ? "Hide draft" : "View AI draft →"}
                        </button>
                      )}

                      {item.ctaLink && (
                        <Link
                          to={item.ctaLink}
                          className="text-xs font-medium text-purple-600 hover:underline"
                        >
                          {item.ctaText ?? "Open →"}
                        </Link>
                      )}

                      {item.id === "connect-linkedin" && (
                        <button
                          onClick={() => startLinkedInConnect()}
                          className="text-xs font-medium text-purple-600 hover:underline"
                        >
                          Connect LinkedIn →
                        </button>
                      )}
                    </div>

                    {/* DRAFT DRAWER */}
                    {isOpen && item.draftContent && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                        <div className="text-[10px] font-mono text-slate-400 uppercase">{item.draftLabel ?? "Suggested Draft"}</div>
                        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-mono text-slate-800 leading-relaxed">
                          {item.draftContent}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => alert("Action triggered!")}
                            className="px-2.5 py-1 text-xs font-medium bg-slate-900 text-white rounded hover:bg-black transition"
                          >
                            Send / Approve
                          </button>
                          <Link
                            to="/new"
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
                          >
                            Edit in Ghostwriter
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: QUIET SIDEBAR (Channels & Stats) */}
          <div className="space-y-6">

            {/* Quick Metrics */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Activity</div>
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500">Queued</span>
                  <span className="text-sm font-semibold font-mono text-slate-900">{queued}</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-slate-100 pt-2">
                  <span className="text-xs text-slate-500">Published</span>
                  <span className="text-sm font-semibold font-mono text-slate-900">{published}</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-slate-100 pt-2">
                  <span className="text-xs text-slate-500">Ideas Stashed</span>
                  <span className="text-sm font-semibold font-mono text-slate-900">{ideasCount ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Social Channels */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Channels</div>
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs p-1.5">
                  <span className="font-medium text-slate-800">LinkedIn</span>
                  {linkedin ? (
                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={() => startLinkedInConnect()}
                      className="text-[11px] text-purple-600 hover:underline font-medium"
                    >
                      Connect
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs p-1.5 text-slate-400 border-t border-slate-100">
                  <span>X (Twitter)</span>
                  <span className="text-[10px] font-mono text-slate-400">Soon</span>
                </div>
                <div className="flex items-center justify-between text-xs p-1.5 text-slate-400 border-t border-slate-100">
                  <span>Instagram</span>
                  <span className="text-[10px] font-mono text-slate-400">Soon</span>
                </div>
              </div>
            </div>

            {/* Recent Posts Log */}
            {posts.length > 0 && (
              <div className="space-y-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Recent Posts</div>
                <div className="bg-white border border-slate-200/80 rounded-xl p-3 divide-y divide-slate-100">
                  {posts.slice(0, 3).map((p) => (
                    <div key={p.id} className="py-2 first:pt-0 last:pb-0">
                      <p className="text-xs text-slate-700 truncate">{p.caption}</p>
                      <span className="text-[9px] font-mono uppercase text-slate-400 mt-0.5 inline-block">
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </AppShell>
  );
}