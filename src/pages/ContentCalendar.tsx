import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import type { Post } from "@/lib/types";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2
} from "lucide-react";

export function ContentCalendarPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Default July 2026

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setPosts((data as Post[]) ?? []);
    })();
  }, []);

  // Delete post handler with LinkedIn sync support
  async function handleDelete(post: Post) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this post? If it has already been published, this will also attempt to delete it from LinkedIn."
    );
    if (!confirmDelete) return;

    setDeletingId(post.id);

    try {
      if (post.status === "published" && (post as any).linkedin_post_urn) {
        const { error: apiError } = await supabase.functions.invoke("delete-linkedin-post", {
          body: { linkedin_post_urn: (post as any).linkedin_post_urn },
        });

        if (apiError) {
          throw new Error(`Failed to delete from LinkedIn: ${apiError.message}`);
        }
      }

      const { error: dbError } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (dbError) throw dbError;

      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (err: any) {
      alert(err.message || "Failed to delete post.");
    } finally {
      setDeletingId(null);
    }
  }

  // Date controls
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthYearLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Days in Month calculation
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfWeek = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  // Map posts to days
  const getPostsForDay = (day: number) => {
    return posts.filter((p) => {
      const pDate = new Date(p.created_at);
      return (
        pDate.getDate() === day &&
        pDate.getMonth() === currentDate.getMonth() &&
        pDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  return (
    <AppShell>
      <div className="space-y-6 font-sans">

        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
          <span>POSTWEL OPERATING SYSTEM</span>
          <span>/</span>
          <span className="text-slate-700">CONTENT CALENDAR</span>
        </div>

        {/* Pillar Drift Alert Banner */}
        <div className="bg-amber-500/10 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  PILLAR BALANCE FLAG
                </span>
                <span className="text-xs font-bold text-slate-900">Content Mix Drift Detected</span>
              </div>
              <p className="text-xs text-slate-600">
                Your scheduled queue currently favors <span className="font-semibold text-slate-900">Industry Insights (70%)</span> heavily, while <span className="font-semibold text-slate-900">Behind-The-Scenes (0%)</span> and <span className="font-semibold text-slate-900">Case Studies (10%)</span> are under-represented relative to your Brand Foundation goals.
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-[#8B4513] hover:bg-[#6e370f] text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 cursor-pointer">
            Auto-Balance Queue
          </button>
        </div>

        {/* Calendar Title & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h1 className="text-2xl font-bold font-display text-slate-900">Content Calendar</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Autonomous publishing matrix. Review, tweak, or regenerate scheduled items across channels.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Month Selector */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm px-1 py-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-800 px-3 min-w-[90px] text-center">
                {monthYearLabel}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Schedule Post Link */}
            <Link
              to="/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Post</span>
            </Link>
          </div>
        </div>

        {/* Calendar Grid View */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3">
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-fr border-slate-100">
            {/* Empty Offset Slots */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[110px] p-2 border-b border-r border-slate-100 bg-slate-50/20" />
            ))}

            {/* Days in current month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const isToday = dayNum === 20; // Hardcoded highlight based on design mock (July 20)
              const dayPosts = getPostsForDay(dayNum);

              return (
                <div
                  key={dayNum}
                  className="min-h-[110px] p-2 border-b border-r border-slate-100 relative group flex flex-col justify-between hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? "w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-sm"
                          : "text-slate-700"
                      }`}
                    >
                      {dayNum}
                    </span>

                    {isToday && (
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded uppercase">
                        TODAY
                      </span>
                    )}
                  </div>

                  {/* Render Posts for Day */}
                  <div className="space-y-1.5 mt-2 flex-1">
                    {dayPosts.map((post) => (
                      <div
                        key={post.id}
                        className="group/item flex items-center justify-between gap-1 p-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800 shadow-2xs transition-all"
                      >
                        <span className="truncate flex-1 font-medium">{post.caption}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDelete(post)}
                            disabled={deletingId === post.id}
                            className="text-slate-400 hover:text-red-600 cursor-pointer p-0.5 rounded"
                            title="Delete"
                          >
                            {deletingId === post.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </AppShell>
  );
}