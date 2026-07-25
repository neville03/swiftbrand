import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Lock, CheckCircle2, Clock, Circle } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  amount: number;
  sequence: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "DELIVERED" | "APPROVED";
  deliverable_note: string | null;
}

// The CLIENT-facing side of a deal — reached via a share link, not a
// Supabase login. Lets the client see milestone progress and approve
// releasing funds held in escrow, without ever needing an account.
export function SharedProjectView() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opportunity, setOpportunity] = useState<{ name: string; category: string; deal_value: number } | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [escrowBalance, setEscrowBalance] = useState(0);
  const [clientName, setClientName] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    const { data, error: fnErr } = await supabase.functions.invoke("client-portal", { body: { token } });
    if (fnErr || (data as any)?.error) {
      setError((data as any)?.error ?? "This link is invalid or has expired.");
      setLoading(false);
      return;
    }
    setOpportunity(data.opportunity);
    setMilestones(data.milestones ?? []);
    setEscrowBalance(data.escrowBalance ?? 0);
    setClientName(data.clientName);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function approve(milestoneId: string) {
    setApprovingId(milestoneId);
    const { data, error: fnErr } = await supabase.functions.invoke("client-portal", {
      body: { token, action: "approve", milestoneId },
    });
    setApprovingId(null);
    if (fnErr || (data as any)?.error) {
      alert((data as any)?.error ?? "Could not approve this milestone.");
      return;
    }
    load();
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Loading project…</div>;
  }

  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">Link unavailable</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const statusMeta: Record<Milestone["status"], { label: string; icon: JSX.Element; pill: string }> = {
    NOT_STARTED: { label: "Not started", icon: <Circle className="w-3.5 h-3.5" />, pill: "bg-slate-100 text-slate-400" },
    IN_PROGRESS: { label: "In progress", icon: <Clock className="w-3.5 h-3.5" />, pill: "bg-amber-50 text-amber-600" },
    DELIVERED: { label: "Delivered — your review needed", icon: <CheckCircle2 className="w-3.5 h-3.5" />, pill: "bg-indigo-50 text-indigo-600" },
    APPROVED: { label: "Approved & released", icon: <CheckCircle2 className="w-3.5 h-3.5" />, pill: "bg-emerald-50 text-emerald-600" },
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center">
      <div className="w-full max-w-xl space-y-5">
        <div className="text-center">
          <p className="text-xs text-slate-400 font-medium">{clientName ? `Hi ${clientName} — here's your` : "Your"} project with SwiftBrand</p>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{opportunity.name}</h1>
          <p className="text-xs text-slate-500">{opportunity.category}</p>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between">
          <span className="text-xs font-bold flex items-center gap-1.5"><Lock className="w-4 h-4 text-blue-400" /> Held in escrow</span>
          <span className="text-lg font-bold">${escrowBalance.toLocaleString()}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-500" /> Milestones
          </h2>
          {milestones.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No milestones set up yet.</p>
          ) : (
            milestones.map((m) => {
              const meta = statusMeta[m.status];
              return (
                <div key={m.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-800">{m.title}</span>
                    <span className="font-bold text-slate-900">${m.amount.toLocaleString()}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${meta.pill}`}>{meta.icon}{meta.label}</span>
                  {m.status === "DELIVERED" && (
                    <>
                      {m.deliverable_note && <p className="text-xs text-slate-500 italic">"{m.deliverable_note}"</p>}
                      <button
                        onClick={() => approve(m.id)}
                        disabled={approvingId === m.id}
                        className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg"
                      >
                        {approvingId === m.id ? "Approving…" : `Approve & release $${m.amount.toLocaleString()}`}
                      </button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400">Secured by SwiftBrand escrow</p>
      </div>
    </div>
  );
}
