import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { User as UserIcon, CreditCard, KeyRound } from "lucide-react";

const TABS = [
  { id: "account", label: "Account", icon: UserIcon },
  { id: "billing", label: "Plans & Billing", icon: CreditCard },
  { id: "api", label: "Developer API Keys", icon: KeyRound },
] as const;

export function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("account");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
    })();
  }, []);

  return (
    <AppShell>
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Workspace Settings</h1>
        <p className="text-slate-500 text-sm mb-6">Manage your account, billing, and API access.</p>

        <div className="grid md:grid-cols-[220px_1fr] gap-6">
          <div className="card p-2 h-fit">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  tab === id ? "bg-brand/10 text-brand font-medium" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>

          <div className="card">
            {tab === "account" && (
              <>
                <h2 className="font-display font-semibold text-slate-900 mb-4">Account</h2>
                <div className="text-sm">
                  <div className="text-slate-500 mb-1">Signed in as</div>
                  <div className="text-slate-900 font-medium">{email ?? "—"}</div>
                </div>
              </>
            )}
            {tab === "billing" && (
              <>
                <h2 className="font-display font-semibold text-slate-900 mb-2">Plans & Billing</h2>
                <p className="text-sm text-slate-500">Billing isn't set up yet — SwiftBrand is free while in development.</p>
              </>
            )}
            {tab === "api" && (
              <>
                <h2 className="font-display font-semibold text-slate-900 mb-2">Developer API Keys</h2>
                <p className="text-sm text-slate-500">No public API yet — this is where personal access tokens will live once it ships.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
