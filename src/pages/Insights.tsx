import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import type { Post, PostMetrics } from "@/lib/types";

export function InsightsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [metrics, setMetrics] = useState<Record<string, PostMetrics>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ likes: 0, comments: 0, shares: 0 });
  const [saving, setSaving] = useState(false);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: postData } = await supabase.from("posts").select("*").eq("user_id", user.id).eq("status", "published").order("published_at", { ascending: false });
    setPosts((postData as Post[]) ?? []);
    if (postData?.length) {
      const { data: metricData } = await supabase.from("post_metrics").select("*").in("post_id", postData.map((p) => p.id)).order("fetched_at", { ascending: false });
      const latestByPost: Record<string, PostMetrics> = {};
      for (const m of (metricData as PostMetrics[]) ?? []) {
        if (!latestByPost[m.post_id]) latestByPost[m.post_id] = m;
      }
      setMetrics(latestByPost);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(postId: string) {
    const existing = metrics[postId];
    setForm({ likes: existing?.likes ?? 0, comments: existing?.comments ?? 0, shares: existing?.shares ?? 0 });
    setEditingId(postId);
  }

  async function save(postId: string) {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("post_metrics").insert({ post_id: postId, user_id: user.id, likes: form.likes, comments: form.comments, shares: form.shares });
    setSaving(false);
    setEditingId(null);
    load();
  }

  return (
    <AppShell>
      <div className="max-w-3xl space-y-4">
        <div>
          <p className="text-xs font-medium text-brand uppercase tracking-wide mb-1">Insights</p>
          <h1 className="font-display text-2xl font-bold text-slate-900">Post performance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Update numbers manually from LinkedIn's post view — automatic sync needs LinkedIn's restricted analytics access.
          </p>
        </div>
        {posts.length === 0 ? (
          <p className="text-sm text-slate-500">No published posts yet.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => {
              const m = metrics[p.id];
              const isEditing = editingId === p.id;
              return (
                <div key={p.id} className="card">
                  <p className="text-sm mb-3 text-slate-700 line-clamp-2">{p.caption}</p>
                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <NumberField label="Likes" value={form.likes} onChange={(v) => setForm({ ...form, likes: v })} />
                      <NumberField label="Comments" value={form.comments} onChange={(v) => setForm({ ...form, comments: v })} />
                      <NumberField label="Shares" value={form.shares} onChange={(v) => setForm({ ...form, shares: v })} />
                      <button onClick={() => save(p.id)} disabled={saving} className="btn-primary ml-auto">
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-6 text-sm text-slate-600">
                      <span>👍 {m?.likes ?? "—"}</span>
                      <span>💬 {m?.comments ?? "—"}</span>
                      <span>🔁 {m?.shares ?? "—"}</span>
                      <button onClick={() => startEdit(p.id)} className="ml-auto text-xs text-brand hover:text-brand-dark font-medium">
                        Update numbers
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      {label}
      <input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} className="input w-20 py-1.5" />
    </label>
  );
}
