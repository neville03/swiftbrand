# SwiftBrand — Project History & Handoff

This document exists so a new session (e.g. Claude Code) can pick up exactly
where this one left off. It covers the full journey, the decisions made and
why, current state, and what's next.

## The business idea

Nev (Gracen Studio / SwiftBrand) is building a LinkedIn content management
platform: onboard a client, capture their brand foundation, connect their own
LinkedIn account, publish posts on their behalf, and show engagement metrics.
The founding insight: "if I can onboard a client and connect their LinkedIn
successfully, I have a business I can run."

## Where this started: Lovable

The project began as a Lovable-built app called "Social Ally Pro"
(github.com/neville03/social-ally-pro), a React + Vite + TanStack Router app
with Supabase (via **Lovable Cloud**, not an independently-owned Supabase
project) for the backend.

### Problems discovered along the way

1. **The logo was too small/subtle.** Turned out to just be a small icon
   (lucide `Sparkles`) in a gradient box, not a real logo asset.
2. **LinkedIn "Connect" button didn't work.** The code
   (`linkedin.functions.ts`) called Lovable's own connector gateway
   (`connector-gateway.lovable.dev`), which requires `LOVABLE_API_KEY` +
   `LINKEDIN_API_KEY` — and more importantly:
3. **Lovable's LinkedIn connector only supports ONE shared LinkedIn account
   per project** — confirmed via Lovable's own docs. It's built for "connect
   your own account and post as you," not multi-tenant, per-user connections.
   A screenshot of the Lovable Connectors UI showed literally "Neville's
   LinkedIn" with "1 person with access" — proving the architecture, not a
   misconfiguration.
4. **"Idea Bank / Content Calendar / Media Library / Brand Kit" pages showed
   "coming soon"** and didn't actually exist in the GitHub repo at all —
   likely nav items added directly in the Lovable editor, never synced.
5. **Lovable Cloud doesn't export Supabase credentials** — you can't just
   "grab your own Supabase keys," because the backend was never really yours;
   Lovable added an official "Remove Lovable Cloud" export path for this.
6. **LinkedIn's own Community Management API** (the sanctioned way to read
   engagement metrics like likes/comments) requires partner-tier approval:
   a registered business, a verified LinkedIn Company Page, a live privacy
   policy, and a multi-month (3–4 month, non-guaranteed) review process. Not
   viable for an early-stage solo builder right now.

### The pivot: Ayrshare

Instead of chasing LinkedIn's own partner approval, we pivoted to
**Ayrshare** (ayrshare.com) — a third-party service that already has
approved LinkedIn API access (posting + analytics) and is explicitly built
for multi-tenant platforms: you get one Ayrshare API key for your whole app,
then create a separate "Profile Key" per end-user, and each user connects
their own LinkedIn account through Ayrshare's hosted OAuth flow. This
directly solves the "any user can connect their own LinkedIn" requirement
that Lovable's connector couldn't.

### The full rebuild decision

Once Ayrshare closed the LinkedIn gap, the remaining reason to depend on
Lovable disappeared. Decision: **rebuild the whole app from scratch**,
independent of Lovable entirely — own Supabase project, own codebase, no
credit limits, works with Claude Code / Fleet locally.

## Current tech stack

- **Frontend**: React + Vite + TypeScript, Tailwind CSS, React Router
  (plain SPA — deliberately simpler than the original TanStack Start setup,
  since there's no SSR need here and it removes a layer of complexity)
- **Backend**: The user's own Supabase project — Postgres + Auth + Storage +
  Edge Functions (Deno)
- **LinkedIn integration**: Ayrshare's Business Plan multi-user Profiles API,
  called from Supabase Edge Functions (never from the browser, to keep the
  Ayrshare API key secret)
- **Design**: Glassmorphism (frosted translucent cards over a dark mesh
  gradient background), Plus Jakarta Sans (headings) + Inter (body) via
  Google Fonts

## Project structure

```
src/
  pages/
    Landing.tsx          marketing/landing page
    Auth.tsx              sign in / sign up
    Onboarding.tsx         brand foundation capture (has a Back button)
    Dashboard.tsx          home screen after login
    NewPost.tsx            compose + publish a post
    Insights.tsx           published posts + engagement metrics
    IdeaBank.tsx           save/list/delete content ideas
    ContentCalendar.tsx    posts grouped by month
    MediaLibrary.tsx       image upload/list/delete via Supabase Storage
    BrandKit.tsx           view/edit the brand foundation data
  components/
    AppShell.tsx           glass sidebar nav (all modules linked here)
    Logo.tsx               renders /public/logo.png (real SwiftBrand logo,
                            background removed, transparent PNG)
    LinkedInConnect.tsx     the connect-LinkedIn-via-Ayrshare UI
    ProtectedRoute.tsx      redirects to /login if not authenticated
  hooks/useAuth.ts
  lib/
    supabase.ts            Supabase client (reads VITE_SUPABASE_URL / ANON_KEY)
    types.ts                shared TS types for every table
supabase/
  migrations/
    0001_init.sql           brand_foundation, linkedin_profile, posts,
                            post_metrics tables + RLS policies
    0002_ideas_and_media.sql  ideas table + "media" storage bucket + policies
  functions/                (each is SELF-CONTAINED — no shared imports —
                            because they're deployed via the Supabase
                            Dashboard's "Via Editor" browser tool, which
                            doesn't support multi-file imports easily)
    create-ayrshare-profile/  creates a per-user Ayrshare sub-profile
    linkedin-connect/         gets a one-time LinkedIn connect URL per user
    check-linkedin-status/    confirms connection after user returns from
                              Ayrshare's hosted OAuth page
    publish-post/              publishes a post via Ayrshare, per-user
    refresh-metrics/           pulls likes/comments/shares for a post
```

## Database schema (as built)

- `brand_foundation` (user_id PK, full_name, role, industry,
  target_audience, brand_voice, key_topics[])
- `linkedin_profile` (user_id PK, ayrshare_profile_key, linkedin_connected,
  name, picture, connected_at)
- `posts` (id, user_id, caption, flyer_path, status [draft/publishing/
  published/failed], ayrshare_post_id, linkedin_url, error_message,
  published_at, created_at)
- `post_metrics` (id, post_id, user_id, likes, comments, impressions,
  shares, fetched_at)
- `ideas` (id, user_id, title, note, created_at)
- Storage bucket `media` (public read, per-user-folder write via RLS)

All tables have Row Level Security: every policy is `auth.uid() = user_id`,
so users can only ever see/touch their own rows.

## How deployment has actually been happening

**Important context**: the person building this is a solo, non-full-time
developer working in Fleet, not comfortable with the Supabase CLI. All
Supabase work — running SQL migrations, setting secrets, deploying edge
functions — has been done through the **Supabase Dashboard in the browser**,
not the CLI. This is why edge functions are written as fully self-contained
files (no `_shared/` imports) — the Dashboard's function editor doesn't
handle multi-file relative imports well.

Steps already walked through together:
1. Created a Supabase project.
2. Ran `0001_init.sql` via the SQL Editor.
3. Deployed all 5 edge functions via Dashboard → Edge Functions → Deploy a
   new function → "Via Editor," pasting each self-contained file.
4. Set `AYRSHARE_API_KEY` and `APP_REDIRECT_URL` as secrets via Dashboard →
   Edge Functions → Secrets (no CLI).
5. Created `.env.local` locally with `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`.
6. Hit and resolved a real bug: `vite.config.ts` was missing the `@/` path
   alias resolution (tsconfig.json had it, Vite didn't) — fixed by adding
   `resolve.alias` pointing `@` at `./src`.
7. Hit and resolved a real Supabase auth issue: manually-created test users
   via Dashboard → Authentication → Add User were created via a path that
   didn't actually set a usable password (likely an invite-style creation),
   causing persistent "Invalid login credentials" even after confirming the
   account. Fixed by deleting and recreating the user through the dialog
   that shows both email AND password fields together, with "Auto Confirm
   User" checked.
8. Successfully signed in for the first time.
9. Uploaded the real SwiftBrand logo (paper airplane icon + wordmark, blue on
   white). It had no real transparency (fully opaque alpha channel) —
   background was removed programmatically by converting near-white pixels
   to transparent and cropping to content, saved as `public/logo.png`.

## NOT yet done / verified

- **The `// CHECK THIS` comments in every Ayrshare-calling edge function**:
  these mark field names and endpoint shapes built against Ayrshare's
  documented API at time of writing, but never yet verified against a real
  Ayrshare account/response. This is the biggest remaining risk — the whole
  LinkedIn connect/publish/metrics flow is unverified against the real
  Ayrshare API.
- The person has **not yet signed up for Ayrshare** or gotten a real API key
  — this was the last big open step before LinkedIn connect can actually be
  tested end-to-end.
- Storage bucket `media` needs to actually be created (the SQL in
  `0002_ideas_and_media.sql` does this, but it hasn't been run yet as of
  this handoff — only `0001_init.sql` has definitely been run).
- Flyer/image attachment on posts (currently caption-only).
- The AI comment-analysis / lead-matching feature (read post comments,
  assess business potential, check profile alignment, suggest outreach) —
  discussed early on, deliberately deferred as a separate, later feature
  once the core onboarding+connect+publish loop is solid. Not started.
- Real LinkedIn partner-tier API access — deliberately not pursued; Ayrshare
  is the chosen path instead.

## Design system reference (for consistency in future work)

- Background: dark (`#0a0a12`) with a fixed radial mesh gradient
  (indigo/purple/sky blurred blobs) — defined directly on `body` in
  `src/index.css`.
- Glass surface: `.glass` utility class — `bg-white/[0.06] backdrop-blur-xl
  border border-white/10` — used for the sidebar and via `.card` (adds
  rounded-2xl + padding) for every content panel.
- Buttons: `.btn-primary` (brand-to-purple gradient) and `.btn-ghost`
  (transparent, hover-highlight) utility classes, defined in `index.css`.
- Fonts: Plus Jakarta Sans for headings/display text (`font-display` class
  or `h1`-`h4` by default), Inter for body — loaded via Google Fonts in
  `index.html`.
- Brand color: `brand` (`#6366f1`, indigo) with `brand-light`/`brand-dark`
  variants, defined in `tailwind.config.js`.

## Suggested next steps, in order

1. Sign up for Ayrshare (Business Plan, for the multi-user Profiles API),
   get the API key, set it as the `AYRSHARE_API_KEY` secret.
2. Test `create-ayrshare-profile` and `linkedin-connect` end-to-end with a
   real LinkedIn account — this will surface which `// CHECK THIS` fields
   actually need correcting against Ayrshare's real response shapes.
3. Run `0002_ideas_and_media.sql` in the SQL Editor, and create the `media`
   storage bucket if the SQL insert doesn't take effect automatically
   (check Storage tab in the dashboard to confirm it exists).
4. Test publish-post and refresh-metrics similarly.
5. Only after that loop is solid: revisit the AI comment-analysis /
   lead-matching feature as its own scoped piece of work.
