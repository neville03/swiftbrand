import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";
import { AppShell } from "./AppShell";

// Shared shell for modules gated behind a future Pro plan. Honest about
// what's real (nothing is billed yet — no payment flow exists) while
// framing the module as a paid upgrade rather than an unfinished feature.
export function ComingSoonPage({
  icon: Icon,
  eyebrow,
  title,
  description,
  bullets,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <AppShell>
      <div className="max-w-2xl">
        <p className="text-xs font-medium text-brand uppercase tracking-wide mb-1">{eyebrow}</p>
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-500 text-sm mb-6">{description}</p>
        <div className="card relative overflow-hidden">
          <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-4">
            <Icon size={20} strokeWidth={2} />
          </div>
          <div className="badge bg-brand/10 text-brand mb-4 inline-flex items-center gap-1.5">
            <Lock size={11} strokeWidth={2.5} /> Pro plan
          </div>
          <p className="text-sm text-slate-600 mb-4">Included on the Pro plan:</p>
          <ul className="space-y-2 mb-6">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-brand mt-0.5">→</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <button
            disabled
            title="Billing isn't live yet — this is a preview of what Pro unlocks"
            className="btn-primary opacity-60 cursor-not-allowed"
          >
            Upgrade to Pro
          </button>
          <p className="text-xs text-slate-400 mt-2">Billing isn't set up yet — this shows what unlocks once it is.</p>
        </div>
      </div>
    </AppShell>
  );
}
