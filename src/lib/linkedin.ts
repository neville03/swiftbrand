// Client-side helpers for the direct LinkedIn OAuth flow. The Client ID is
// public and safe to use in the browser; the Client Secret never appears
// here — that only ever lives in Supabase's edge function secrets.
const STATE_KEY = "postwel_linkedin_oauth_state";

export function startLinkedInConnect() {
  const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID as string;
  if (!clientId) throw new Error("Missing VITE_LINKEDIN_CLIENT_ID in .env.local");

  const redirectUri = `${window.location.origin}/auth/callback/linkedin`;

  // Random state value, checked on return, to prevent CSRF.
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);

  const scope = "openid profile w_member_social";

  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);

  window.location.href = url.toString();
}

export function consumeStoredState(): string | null {
  const state = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return state;
}
