// Publishes a post directly to LinkedIn's API using the CURRENT user's own
// stored access token (from user_social_accounts) — no third-party service
// involved. Self-contained: no imports from other files.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { postId } = await req.json();
    if (!postId) throw new Error("postId is required");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) throw new Error("Not authenticated");

    const { data: post, error: postErr } = await supabase
      .from("posts")
      .select("id, caption")
      .eq("id", postId)
      .single();
    if (postErr || !post) throw new Error("Post not found");
    if (!post.caption?.trim()) throw new Error("Caption is required");

    const { data: account } = await supabase
      .from("user_social_accounts")
      .select("access_token, platform_user_id")
      .eq("user_id", user.id)
      .eq("platform", "linkedin")
      .maybeSingle();

    if (!account?.access_token || !account.platform_user_id) {
      throw new Error("LinkedIn is not connected yet");
    }

    await supabase.from("posts").update({ status: "publishing", error_message: null }).eq("id", postId);

    // Direct call to LinkedIn's UGC Posts API, authenticated as this user.
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: `urn:li:person:${account.platform_user_id}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: post.caption },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      await supabase
        .from("posts")
        .update({ status: "failed", error_message: body.slice(0, 300) })
        .eq("id", postId);
      throw new Error(`LinkedIn publish failed [${res.status}]: ${body.slice(0, 300)}`);
    }

    // LinkedIn returns the post's URN in this header.
    const postUrn = res.headers.get("x-restli-id");

    await supabase
      .from("posts")
      .update({
        status: "published",
        ayrshare_post_id: postUrn, // reused column name; holds the LinkedIn post URN now
        linkedin_url: postUrn ? `https://www.linkedin.com/feed/update/${postUrn}` : null,
        published_at: new Date().toISOString(),
      })
      .eq("id", postId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
