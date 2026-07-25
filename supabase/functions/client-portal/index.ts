// PUBLIC endpoint — no Supabase auth. This is the CLIENT-facing side of a
// deal: authorized only by knowing the share-link token (like a Stripe
// payment link), never by a user_id or session. Supports:
//   { token }                                  -> read-only project state
//   { token, action: "approve", milestoneId }   -> client approves & releases funds
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token, action, milestoneId } = await req.json();
    if (!token?.trim()) throw new Error("A valid link is required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: link, error: linkErr } = await admin
      .from("opportunity_share_links")
      .select("id, opportunity_id, user_id, client_name, is_active")
      .eq("token", token.trim())
      .maybeSingle();

    if (linkErr) throw linkErr;
    if (!link || !link.is_active) {
      return new Response(JSON.stringify({ error: "This link is inactive or doesn't exist" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      if (!milestoneId) throw new Error("milestoneId is required to approve");

      const { data: milestone, error: msErr } = await admin
        .from("opportunity_milestones")
        .select("*")
        .eq("id", milestoneId)
        .eq("opportunity_id", link.opportunity_id)
        .single();
      if (msErr || !milestone) throw new Error("Milestone not found on this project");
      if (milestone.status !== "DELIVERED") throw new Error("This milestone isn't ready for approval yet");

      const { data: txRows } = await admin
        .from("escrow_transactions")
        .select("type, amount")
        .eq("opportunity_id", link.opportunity_id);
      const balance = (txRows ?? []).reduce((bal, tx) => {
        if (tx.type === "DEPOSIT_HELD") return bal + Number(tx.amount);
        if (tx.type === "RELEASED" || tx.type === "REFUNDED") return bal - Number(tx.amount);
        return bal;
      }, 0);
      if (balance < Number(milestone.amount)) {
        throw new Error("Not enough held in escrow to release this milestone — contact the professional");
      }

      const nowIso = new Date().toISOString();
      await admin.from("opportunity_milestones").update({
        status: "APPROVED", approved_at: nowIso, approved_by: "client",
      }).eq("id", milestoneId);

      await admin.from("escrow_transactions").insert({
        opportunity_id: link.opportunity_id, user_id: link.user_id,
        type: "RELEASED", amount: milestone.amount, milestone_id: milestoneId,
        note: `Client-approved release: ${milestone.title}`,
      });

      await admin.from("opportunity_documents").insert({
        opportunity_id: link.opportunity_id, user_id: link.user_id,
        type: "Receipt", title: `Client approved — ${milestone.title}`,
        amount: milestone.amount, status: "Paid",
      });

      // Advance the next queued milestone.
      const { data: all } = await admin
        .from("opportunity_milestones")
        .select("id, sequence, status")
        .eq("opportunity_id", link.opportunity_id)
        .order("sequence", { ascending: true });
      const idx = (all ?? []).findIndex((m) => m.id === milestoneId);
      const next = (all ?? [])[idx + 1];
      if (next && next.status === "NOT_STARTED") {
        await admin.from("opportunity_milestones").update({ status: "IN_PROGRESS" }).eq("id", next.id);
      }
    }

    // Return current, read-only project state (after any action above).
    const { data: opportunity } = await admin
      .from("opportunities")
      .select("name, category, pipeline_stage, deal_value")
      .eq("id", link.opportunity_id)
      .single();

    const { data: milestones } = await admin
      .from("opportunity_milestones")
      .select("*")
      .eq("opportunity_id", link.opportunity_id)
      .order("sequence", { ascending: true });

    const { data: escrowRows } = await admin
      .from("escrow_transactions")
      .select("type, amount")
      .eq("opportunity_id", link.opportunity_id);

    const escrowBalance = (escrowRows ?? []).reduce((bal, tx) => {
      if (tx.type === "DEPOSIT_HELD") return bal + Number(tx.amount);
      if (tx.type === "RELEASED" || tx.type === "REFUNDED") return bal - Number(tx.amount);
      return bal;
    }, 0);

    return new Response(
      JSON.stringify({ opportunity, milestones: milestones ?? [], escrowBalance, clientName: link.client_name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
