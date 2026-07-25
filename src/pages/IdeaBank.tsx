import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface MoodboardItem {
  id: string;
  board_id: string;
  type: "IMAGE" | "TEXT" | "VOICE_NOTE";
  title: string;
  content: string | null;
  image_url: string | null;
  transcript: string | null;
  tags: string[];
  created_at: string;
}

interface Moodboard {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  created_at: string;
  shared_with: string[];
}

export function IdeaBankPage() {
  const navigate = useNavigate();
  const [showExplainer, setShowExplainer] = useState(true);
  const [boards, setBoards] = useState<Moodboard[]>([]);
  const [items, setItems] = useState<MoodboardItem[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [newBoardCategory, setNewBoardCategory] = useState("Campaign Ideas");

  const [showAddPin, setShowAddPin] = useState(false);
  const [pinType, setPinType] = useState<"TEXT" | "IMAGE" | "VOICE_NOTE">("TEXT");
  const [pinTitle, setPinTitle] = useState("");
  const [pinBody, setPinBody] = useState(""); // content / image_url / transcript depending on type

  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");

  const [convertingPlan, setConvertingPlan] = useState(false);
  const [planAngles, setPlanAngles] = useState<{ angle: string; content: string }[] | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: boardData } = await supabase
      .from("moodboards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setBoards((boardData as Moodboard[]) ?? []);
    if (boardData?.length && !activeBoardId) setActiveBoardId(boardData[0].id);

    if (boardData?.length) {
      const { data: itemData } = await supabase
        .from("moodboard_items")
        .select("*")
        .in("board_id", boardData.map((b) => b.id))
        .order("created_at", { ascending: false });
      setItems((itemData as MoodboardItem[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeBoard = boards.find((b) => b.id === activeBoardId) ?? null;
  const activeItems = items.filter((i) => i.board_id === activeBoardId);

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("moodboards")
      .insert({ user_id: user.id, title: newBoardTitle, description: newBoardDesc || null, category: newBoardCategory })
      .select()
      .single();
    if (!error && data) {
      setNewBoardTitle("");
      setNewBoardDesc("");
      setShowNewBoard(false);
      await load();
      setActiveBoardId(data.id);
    }
  }

  async function addPin(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBoardId || !pinTitle.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload: Record<string, unknown> = {
      board_id: activeBoardId,
      user_id: user.id,
      type: pinType,
      title: pinTitle,
      tags: [],
    };
    if (pinType === "TEXT") payload.content = pinBody;
    if (pinType === "IMAGE") payload.image_url = pinBody;
    if (pinType === "VOICE_NOTE") payload.transcript = pinBody;

    const { error } = await supabase.from("moodboard_items").insert(payload);
    if (!error) {
      setPinTitle("");
      setPinBody("");
      setShowAddPin(false);
      load();
    }
  }

  async function shareBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBoard || !shareEmail.trim()) return;
    const updated = [...activeBoard.shared_with, shareEmail.trim()];
    await supabase.from("moodboards").update({ shared_with: updated }).eq("id", activeBoard.id);
    setShareEmail("");
    setShowShare(false);
    load();
  }

  async function turnIntoAIPlan() {
    if (!activeBoard) return;
    setConvertingPlan(true);
    setPlanError(null);
    setPlanAngles(null);
    try {
      // Combine this board's pins into one topic prompt for the AI Writer.
      const combined = activeItems
        .map((i) => i.content ?? i.transcript ?? i.title)
        .filter(Boolean)
        .join("\n\n");
      const topic = `${activeBoard.title}: ${activeBoard.description ?? ""}\n\n${combined}`.slice(0, 4000);

      const { data, error } = await supabase.functions.invoke("generate-angles", {
        body: { topic, inputMode: "rough" },
      });
      if (error) {
        let detail = error.message ?? "Could not generate a plan";
        const ctx = (error as { context?: Response }).context;
        if (ctx) {
          try {
            const body = await ctx.clone().json();
            if (body?.error) detail = body.error;
          } catch { /* ignore */ }
        }
        throw new Error(detail);
      }
      setPlanAngles(data.angles);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Could not generate a plan");
    } finally {
      setConvertingPlan(false);
    }
  }

  async function scheduleAngle(content: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("posts").insert({ user_id: user.id, caption: content, status: "draft" });
    navigate("/calendar");
  }

  if (loading) {
    return (
      <AppShell>
        <div className="text-sm text-slate-500">Loading your idea bank…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
          <span>SWIFTBRAND OPERATING SYSTEM</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600">IDEA BANK & MOODBOARDS</span>
        </div>

        {showExplainer && (
          <div className="rounded-2xl p-6 bg-[#12183B] text-white flex items-center justify-between flex-wrap gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white/10 text-white mt-0.5">✦</div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">IDEA BANK EXPLAINER</h4>
                <p className="text-sm text-white/90 mt-0.5">
                  Collect visual inspiration, competitor links, and voice notes here. Turn any board into an AI-generated content plan.
                </p>
              </div>
            </div>
            <button onClick={() => setShowExplainer(false)} className="bg-white text-[#12183B] text-xs font-bold px-4 py-2 rounded-xl hover:bg-white/90 transition">
              Close Explainer
            </button>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-4 pt-1">
          <div>
            <span className="badge text-[10px] font-bold tracking-wider text-brand uppercase mb-1 inline-block">VISUAL DIRECTION ENGINE</span>
            <h1 className="font-display text-2xl font-bold text-slate-900">Idea Bank & Moodboards</h1>
            <p className="text-sm text-slate-500 mt-0.5">Pin ideas, then turn any board into an AI content plan.</p>
          </div>
          <button onClick={() => setShowNewBoard(true)} className="bg-[#12183B] text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-[#12183B]/90 transition flex items-center gap-1.5 shadow-sm">
            <span>+</span> New Moodboard
          </button>
        </div>

        {boards.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-sm text-slate-500 mb-3">No moodboards yet.</p>
            <button onClick={() => setShowNewBoard(true)} className="btn-primary">Create your first moodboard</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
              {boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => setActiveBoardId(board.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                    activeBoardId === board.id ? "bg-brand text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{board.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeBoardId === board.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {items.filter((i) => i.board_id === board.id).length}
                  </span>
                </button>
              ))}
            </div>

            {activeBoard && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                      <span className="text-brand font-bold uppercase tracking-wider text-[10px]">{activeBoard.category}</span>
                      <span>•</span>
                      <span>Created {new Date(activeBoard.created_at).toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">{activeBoard.title}</h2>
                    {activeBoard.description && <p className="text-xs text-slate-500 mt-0.5">{activeBoard.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowShare(true)} className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5">
                      <span>↗</span> Share Board
                    </button>
                    <button onClick={() => setShowAddPin(true)} className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-50 transition flex items-center gap-1">
                      <span>+</span> Add Pin
                    </button>
                    <button onClick={turnIntoAIPlan} disabled={convertingPlan || activeItems.length === 0} className="px-4 py-1.5 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand/90 transition shadow-sm flex items-center gap-1.5 disabled:opacity-50">
                      <span>✦</span> {convertingPlan ? "Generating…" : "Turn into AI Plan"}
                    </button>
                  </div>
                </div>

                {activeBoard.shared_with.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span className="font-medium text-slate-400">Shared with:</span>
                    {activeBoard.shared_with.map((email, i) => (
                      <span key={i} className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md">{email}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {planError && <p className="text-sm text-red-600">{planError}</p>}

            {planAngles && (
              <div className="space-y-3">
                <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">AI Content Plan from Moodboard</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {planAngles.map((a, i) => (
                    <div key={i} className="card space-y-3">
                      <span className="badge bg-brand/10 text-brand text-[10px] uppercase">{a.angle}</span>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.content}</p>
                      <button onClick={() => scheduleAngle(a.content)} className="btn-outline w-full text-xs">Schedule this</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeItems.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <p className="text-sm text-slate-500">No pins inside this moodboard yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {activeItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      <span className="flex items-center gap-1 text-slate-500">
                        {item.type === "IMAGE" && "🖼 IMAGE"}
                        {item.type === "TEXT" && "📝 TEXT"}
                        {item.type === "VOICE_NOTE" && "🎙 VOICE NOTE"}
                      </span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                    {item.image_url && (
                      <div className="rounded-xl overflow-hidden border border-slate-100 max-h-48">
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {item.content && <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">{item.content}</div>}
                    {item.transcript && <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 italic">{item.transcript}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* New Moodboard modal */}
        {showNewBoard && (
          <Modal onClose={() => setShowNewBoard(false)} title="Create New Moodboard">
            <form onSubmit={createBoard} className="space-y-3">
              <input className="input" placeholder="Board title" value={newBoardTitle} onChange={(e) => setNewBoardTitle(e.target.value)} required autoFocus />
              <textarea className="input" placeholder="Description (optional)" value={newBoardDesc} onChange={(e) => setNewBoardDesc(e.target.value)} />
              <select className="input" value={newBoardCategory} onChange={(e) => setNewBoardCategory(e.target.value)}>
                <option>Campaign Ideas</option>
                <option>Brand Visuals</option>
                <option>Event Strategy</option>
                <option>Product Teasers</option>
              </select>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowNewBoard(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Create Board</button>
              </div>
            </form>
          </Modal>
        )}

        {/* Add Pin modal */}
        {showAddPin && (
          <Modal onClose={() => setShowAddPin(false)} title="Pin Reference to Board">
            <form onSubmit={addPin} className="space-y-3">
              <div className="flex gap-2">
                {(["TEXT", "IMAGE", "VOICE_NOTE"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setPinType(t)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${pinType === t ? "border-brand bg-brand/5 text-brand" : "border-slate-200 text-slate-500"}`}>
                    {t === "VOICE_NOTE" ? "Voice Transcript" : t === "IMAGE" ? "Image URL" : "Text Note"}
                  </button>
                ))}
              </div>
              <input className="input" placeholder="Pin title" value={pinTitle} onChange={(e) => setPinTitle(e.target.value)} required autoFocus />
              <textarea
                className="input min-h-[90px]"
                placeholder={pinType === "IMAGE" ? "Paste an image URL…" : pinType === "VOICE_NOTE" ? "Paste the transcript…" : "Type your note…"}
                value={pinBody}
                onChange={(e) => setPinBody(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowAddPin(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Save Pin</button>
              </div>
            </form>
          </Modal>
        )}

        {/* Share Board modal */}
        {showShare && (
          <Modal onClose={() => setShowShare(false)} title="Share Board with Teammate">
            <p className="text-xs text-slate-500 mb-3">
              This adds their email to the board's shared list — it doesn't send an invite email yet, since that needs its own notification setup.
            </p>
            <form onSubmit={shareBoard} className="space-y-3">
              <input type="email" className="input" placeholder="teammate@email.com" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} required autoFocus />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowShare(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Add</button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default IdeaBankPage;
