import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { Sparkles, Upload, X } from "lucide-react";

interface Angle {
  angle: string;
  content: string;
}

const MEDIA_BUCKET = "media";

export function NewPostPage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  // Step 1: the rough idea
  const [idea, setIdea] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Step 2: the 3 AI drafts to choose from
  const [angles, setAngles] = useState<Angle[] | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<number | null>(null);

  // Final caption (editable regardless of whether it came from AI or was typed)
  const [caption, setCaption] = useState("");

  // Optional flyer image
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);

  const [schedule, setSchedule] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!idea.trim()) return;
    setGenerating(true);
    setGenError(null);
    setAngles(null);
    setSelectedAngle(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-angles", {
        body: { topic: idea, inputMode: "rough" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAngles(data.angles as Angle[]);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Could not generate drafts");
    } finally {
      setGenerating(false);
    }
  }

  function pickAngle(i: number) {
    if (!angles) return;
    setSelectedAngle(i);
    setCaption(angles[i].content);
  }

  function handleFlyerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFlyerFile(file);
    setFlyerPreview(URL.createObjectURL(file));
  }

  function removeFlyer() {
    setFlyerFile(null);
    setFlyerPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function uploadFlyerIfNeeded(userId: string): Promise<string | null> {
    if (!flyerFile) return null;
    const path = `${userId}/${Date.now()}-${flyerFile.name}`;
    const { error: uploadErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, flyerFile);
    if (uploadErr) throw uploadErr;
    return path;
  }

  async function saveDraft(): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const flyerPath = await uploadFlyerIfNeeded(user.id);
    const { data, error } = await supabase
      .from("posts")
      .insert({ user_id: user.id, caption, flyer_path: flyerPath, status: "draft" })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const postId = await saveDraft();
      const { error: pubErr } = await supabase.functions.invoke("publish-post", { body: { postId } });
      if (pubErr) throw pubErr;
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish");
    } finally {
      setPublishing(false);
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    setError(null);
    try {
      await saveDraft();
      navigate("/calendar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save draft");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <div>
          <p className="text-xs font-medium text-brand uppercase tracking-wide mb-1">Writing Assistant</p>
          <h1 className="font-display text-2xl font-bold text-slate-900">Create a post</h1>
          <p className="text-slate-500 text-sm">Drop in a rough idea — the AI drafts 3 different angles for you to choose from.</p>
        </div>

        {/* Step 1: rough idea input */}
        <div className="card">
          <label className="text-sm font-medium text-slate-700 block mb-1.5">What's the idea?</label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. we just closed our biggest client yet and I want to talk about what it took to land them, without sounding braggy…"
            className="input min-h-[100px]"
          />
          {genError && <p className="text-sm text-red-600 mt-2">{genError}</p>}
          <button
            onClick={handleGenerate}
            disabled={generating || !idea.trim()}
            className="btn-primary mt-3 flex items-center gap-2"
          >
            <Sparkles size={16} strokeWidth={2} />
            {generating ? "Drafting 3 versions…" : "Generate 3 drafts"}
          </button>
        </div>

        {/* Step 2: pick an angle */}
        {angles && (
          <div>
            <h2 className="font-display font-semibold text-slate-900 mb-3">Pick a starting point</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {angles.map((a, i) => (
                <button
                  key={a.angle}
                  onClick={() => pickAngle(i)}
                  className={`text-left rounded-xl border p-4 transition-colors ${
                    selectedAngle === i ? "border-brand bg-brand/5" : "border-slate-200 hover:border-brand/40"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-brand mb-2">{a.angle}</div>
                  <p className="text-xs text-slate-600 line-clamp-6 whitespace-pre-wrap">{a.content}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: final caption + flyer + publish */}
        <div className="grid md:grid-cols-[1fr_260px] gap-6">
          <div className="card">
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write or edit your caption here…"
              className="input min-h-[220px]"
            />
            <div className="text-xs text-slate-400 mt-1 text-right">{caption.length} chars</div>

            <div className="mt-4">
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Flyer (optional)</label>
              {flyerPreview ? (
                <div className="relative w-32">
                  <img src={flyerPreview} alt="Flyer preview" className="rounded-lg border border-slate-200 w-32 h-32 object-cover" />
                  <button onClick={removeFlyer} className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 text-slate-500 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1.5 border border-dashed border-slate-300 rounded-lg py-6 text-slate-400 cursor-pointer hover:border-brand/40 hover:text-brand transition-colors">
                  <Upload size={18} strokeWidth={2} />
                  <span className="text-xs">Click to upload flyer</span>
                  <span className="text-[10px] text-slate-300">PNG, JPG up to 10MB</span>
                  <input ref={fileInput} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFlyerChange} />
                </label>
              )}
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Schedule (optional)</label>
              <input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} className="input" />
            </div>

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={handleSaveDraft} disabled={saving || !caption.trim()} className="btn-outline">
                {saving ? "Saving…" : "Save draft"}
              </button>
              <button onClick={handlePublish} disabled={publishing || !caption.trim()} className="btn-primary">
                {publishing ? "Publishing…" : "Publish to LinkedIn"}
              </button>
            </div>
          </div>

          {/* Live preview */}
          <div className="card h-fit">
            <div className="text-xs font-medium text-slate-500 mb-3">LinkedIn preview</div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div>
                <div className="text-sm font-medium text-slate-900">You</div>
                <div className="text-[10px] text-slate-400">Just now</div>
              </div>
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-wrap mb-3">{caption || "Your caption will appear here…"}</p>
            {flyerPreview ? (
              <img src={flyerPreview} alt="" className="rounded-lg w-full object-cover" />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 h-32 flex items-center justify-center text-slate-300 text-xs">
                Flyer preview
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
