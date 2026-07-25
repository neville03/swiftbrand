// Generates 3 distinct post angles from a topic/idea, grounded in the
// user's own Brand Foundation (voice, audience, pillars). Calls Groq
// (groq.com) — free, fast, and its free-tier models rotate far less
// aggressively than Gemini's did. Groq doesn't support a "try these models
// in order" list in a single request the way OpenRouter does, so we loop
// over a small ranked list ourselves and fall through on any failure.
// Self-contained: no imports from other files.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Ordered fallback list — tried in order, falling through to the next on
// any error (rate limit, retirement, outage). Free-tier rosters do still
// rotate occasionally — check https://console.groq.com/docs/models if every
// model in this list starts failing, and swap in whatever's current.
const MODEL_FALLBACK_LIST = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "llama-3.1-8b-instant"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { topic, inputMode } = await req.json();
    if (!topic?.trim()) throw new Error("A topic or idea is required");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) throw new Error("Not authenticated");

    const { data: brand } = await supabase
      .from("brand_foundation")
      .select("full_name, role, industry, target_audience, brand_voice, key_topics, self_description")
      .eq("user_id", user.id)
      .maybeSingle();

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) throw new Error("GROQ_API_KEY secret is not set on this project");

    const brandContext = brand
      ? `The author is ${brand.full_name ?? "a professional"}, ${brand.role ?? ""} in ${brand.industry ?? "their industry"}.
Target audience: ${brand.target_audience ?? "professionals in their industry"}.
Brand voice: ${brand.brand_voice ?? "professional and direct"}.
Content pillars: ${(brand.key_topics ?? []).join(", ") || "general industry insight"}.
${brand.self_description ? `In their own words, here is how this person describes themselves and how they want to come across — weight this heavily, it's the strongest signal of their authentic voice:\n"${brand.self_description}"` : ""}`
      : "No brand foundation is set up yet — write in a generally professional, direct voice.";

    const modeContext =
      inputMode === "photo"
        ? "The input describes a photo or visual asset context."
        : inputMode === "rough"
          ? "The input is a rough, unpolished idea or rant — clean it up while keeping its authentic energy."
          : "The input is a topic or prompt.";

    const systemPrompt = `You are a ghostwriter producing LinkedIn posts. ${brandContext}

${modeContext}

Given the input, write exactly 3 distinct LinkedIn post drafts, each a genuinely different angle:
1. "Thought Leadership" — bold, authoritative, provocative take.
2. "Actionable Playbook" — a concrete, structured framework or steps.
3. "Storytelling / Personal Journey" — a first-person narrative angle.

Each post should be 80-180 words, ready to publish as-is, in the brand voice described above. Do not use hashtags unless they fit naturally.

Respond with ONLY valid JSON in this exact shape, nothing else, no markdown fences, no commentary before or after:
{"angles":[{"angle":"Thought Leadership","content":"..."},{"angle":"Actionable Playbook","content":"..."},{"angle":"Storytelling / Personal Journey","content":"..."}]}`;

    let angles: unknown = null;
    let modelUsed = "";
    const attemptErrors: string[] = [];

    for (const model of MODEL_FALLBACK_LIST) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: topic },
            ],
            max_tokens: 1500,
            temperature: 0.8,
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          attemptErrors.push(`${model} [${res.status}]: ${body.slice(0, 200)}`);
          continue; // try the next model in the list
        }

        const data = await res.json();
        const text: string = data.choices?.[0]?.message?.content ?? "";
        const cleaned = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned).angles;
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("empty angles array");

        angles = parsed;
        modelUsed = model;
        break; // success — stop trying further models
      } catch (attemptErr) {
        attemptErrors.push(`${model}: ${(attemptErr as Error).message}`);
        continue;
      }
    }

    if (!angles) {
      console.error("All Groq models failed:", attemptErrors.join(" | "));
      throw new Error("Could not parse the AI's response into angles (all fallback models failed)");
    }

    return new Response(JSON.stringify({ angles, model: modelUsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
