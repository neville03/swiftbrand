import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { consumeStoredState } from "@/lib/linkedin";

// The page LinkedIn redirects back to after the user grants (or denies)
// access. Exchanges the `code` for a token via our edge function, then
// sends the user on to the dashboard.
export function LinkedInCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [error, setError] = useState<string | null>(null);
  // Guards against React StrictMode's dev-mode double-invoke of effects.
  // LinkedIn's authorization code is single-use — running this twice would
  // make the second call fail, which looks identical to a real bug.
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const oauthError = params.get("error_description") ?? params.get("error");

      if (oauthError) {
        setStatus("error");
        setError(oauthError);
        return;
      }

      const expectedState = consumeStoredState();
      if (!code || !state || state !== expectedState) {
        setStatus("error");
        setError("This connection link is invalid or expired. Please try connecting again.");
        return;
      }

      const { error: fnError } = await supabase.functions.invoke("linkedin-oauth-callback", {
        body: { code },
      });

      if (fnError) {
        // supabase-js's generic error message hides the real reason our
        // function sent back — read the actual response body to surface it.
        let detail = fnError.message ?? "Could not complete the LinkedIn connection";
        const ctx = (fnError as { context?: Response }).context;
        if (ctx) {
          try {
            const body = await ctx.clone().json();
            if (body?.error) detail = body.error;
          } catch {
            /* response wasn't JSON — fall back to the generic message */
          }
        }
        setStatus("error");
        setError(detail);
        return;
      }

      navigate("/dashboard");
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="card max-w-sm text-center">
        {status === "working" ? (
          <p className="text-sm text-slate-600">Connecting your LinkedIn account…</p>
        ) : (
          <>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button onClick={() => navigate("/dashboard")} className="btn-primary">
              Back to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
