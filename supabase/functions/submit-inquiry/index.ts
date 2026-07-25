// PUBLIC endpoint — no auth required. A visitor on someone's public profile
// submits an inquiry; this looks up the profile owner by username and
// creates a real row in THEIR opportunities pipeline, using the
// service-role key (the visitor has no Supabase session to do this with
// directly, and shouldn't need one).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { username, name, service, budget, details } = await req.json();
    if (!username?.trim()) throw new Error("username is required");
    if (!name?.trim()) throw new Error("Your name is required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: brand, error: brandErr } = await admin
      .from("brand_foundation")
      .select("user_id")
      .eq("username", username.trim().toLowerCase())
      .maybeSingle();

    if (brandErr) throw brandErr;
    if (!brand) throw new Error("Profile not found");

    // Rough deal-value estimate from the selected budget range — a
    // starting number for the pipeline, not a final quote.
    const dealValue = (() => {
      const match = String(budget ?? "").match(/[\d,]+/g);
      if (!match) return 0;
      const nums = match.map((n) => Number(n.replace(/,/g, "")));
      return Math.max(...nums);
    })();

    const { error: insertErr } = await admin.from("opportunities").insert({
      user_id: brand.user_id,
      name: name.trim(),
      company_or_role: "Inbound — Public Profile",
      category: service || "General Inquiry",
      deal_value: dealValue,
      pipeline_stage: "LEAD_CAPTURED",
      source_platform: "Public Profile",
      last_interaction: "Submitted via public profile inquiry form",
      note: details || "",
      next_step: "Review and respond to inbound inquiry",
      has_ongoing_business: "No",
    });

    if (insertErr) throw insertErr;

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
