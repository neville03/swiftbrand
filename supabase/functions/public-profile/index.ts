// PUBLIC endpoint — no auth required. Looks up a user's public profile by
// username using the service-role key, so we can safely read across RLS
// while controlling exactly which columns are ever returned. Never returns
// LinkedIn access tokens or anything else private.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { username } = await req.json();
    if (!username?.trim()) throw new Error("username is required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: brand, error } = await admin
      .from("brand_foundation")
      .select("user_id, full_name, role, industry, target_audience, brand_voice, key_topics, bio, location, avatar_url, username")
      .eq("username", username.trim().toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!brand) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only ever select the two safe, public display fields from the
    // LinkedIn connection — never the access token.
    const { data: linkedin } = await admin
      .from("user_social_accounts")
      .select("platform_user_name, platform_user_picture")
      .eq("user_id", brand.user_id)
      .eq("platform", "linkedin")
      .maybeSingle();

    const { data: services } = await admin
      .from("profile_services")
      .select("id, title, description, price_range, sort_order")
      .eq("user_id", brand.user_id)
      .order("sort_order", { ascending: true });

    // Never leak the internal user_id to the public response.
    const { user_id, ...safeBrand } = brand;

    return new Response(JSON.stringify({ brand: safeBrand, linkedin, services: services ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
