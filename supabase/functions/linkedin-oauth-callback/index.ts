// Exchanges the LinkedIn authorization `code` for an access token, fetches
// the user's profile, and stores both against the CURRENT Supabase user —
// meaning every user who connects gets their own row, own token.
// Self-contained: no imports from other files (works with Dashboard's
// "Via Editor" deploy).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { code } = await req.json();
    if (!code) throw new Error("Missing authorization code");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) throw new Error("Not authenticated");

    const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
    const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
    const redirectUri = Deno.env.get("LINKEDIN_REDIRECT_URI");
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("LinkedIn OAuth secrets are not fully set on this project");
    }

    // 1. Exchange the code for an access token, directly with LinkedIn.
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      throw new Error(tokenData.error_description ?? `Token exchange failed [${tokenRes.status}]`);
    }

    // 2. Fetch this user's LinkedIn profile with the fresh token.
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) throw new Error(`Could not fetch LinkedIn profile [${profileRes.status}]`);
    const profile = await profileRes.json();

    // 3. Store the token + profile against THIS user only.
    const { error: upsertErr } = await supabase.from("user_social_accounts").upsert(
      {
        user_id: user.id,
        platform: "linkedin",
        platform_user_id: profile.sub,
        platform_user_name: profile.name,
        platform_user_picture: profile.picture ?? null,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? null,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      },
      { onConflict: "user_id,platform" }
    );
    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ ok: true, name: profile.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
