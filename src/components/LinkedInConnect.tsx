import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { startLinkedInConnect } from "@/lib/linkedin";
import type { SocialAccount } from "@/lib/types";

export function LinkedInConnect() {
  const [account, setAccount] = useState<SocialAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAccount() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("user_social_accounts").select("*").eq("user_id", user.id).eq("platform", "linkedin").maybeSingle();
    setAccount(data as SocialAccount | null);
    setLoading(false);
  }

  useEffect(() => {
    loadAccount();
  }, []);

  function connect() {
    setError(null);
    try {
      startLinkedInConnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start LinkedIn connection");
    }
  }

  async function disconnect() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_social_accounts").delete().eq("user_id", user.id).eq("platform", "linkedin");
    loadAccount();
  }

  if (loading) {
    return <div className="card text-sm text-slate-500">Checking LinkedIn connection…</div>;
  }

  if (account) {
    return (
      <div className="card flex items-center gap-3">
        {account.platform_user_picture ? (
          <img src={account.platform_user_picture} alt={account.platform_user_name ?? "LinkedIn"} className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-medium">in</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate text-slate-900">{account.platform_user_name ?? "LinkedIn account"}</div>
          <div className="text-xs text-emerald-600">Connected</div>
        </div>
        <button onClick={disconnect} className="text-xs text-slate-400 hover:text-red-600">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand font-medium">in</div>
        <div className="flex-1">
          <div className="font-medium text-slate-900">Connect your LinkedIn</div>
          <div className="text-sm text-slate-500">SwiftBrand posts as you. One click to link your own account.</div>
        </div>
        <button onClick={connect} className="btn-primary">
          Connect
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
