# SwiftBrand

A from-scratch rebuild: React + Vite + TypeScript frontend, your own Supabase
project for auth/database/edge functions, and Ayrshare for LinkedIn
connect/publish/analytics (per-user, multi-tenant — no Lovable dependency).

## What's here

```
src/
  pages/           Landing, Auth, Onboarding, Dashboard, NewPost, Insights
  components/      AppShell (nav), Logo, LinkedInConnect, ProtectedRoute
  hooks/useAuth.ts
  lib/             supabase client, shared TS types
supabase/
  migrations/0001_init.sql       tables + Row Level Security policies
  functions/
    create-ayrshare-profile/     creates a per-user Ayrshare sub-profile
    linkedin-connect/            gets a one-time LinkedIn connect URL for that user
    check-linkedin-status/       confirms the connection after the user returns
    publish-post/                publishes a post via Ayrshare, per-user
    refresh-metrics/             pulls likes/comments/shares for a published post
```

## 1. Create your own Supabase project

1. Go to supabase.com, create a new project.
2. In the SQL Editor, paste and run `supabase/migrations/0001_init.sql`.
3. In Project Settings -> API, copy the **Project URL** and **anon public key**.
4. Copy `.env.example` to `.env.local` and fill those two values in as
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## 2. Deploy the edge functions

You'll need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed
and logged in (`supabase login`), then linked to your project
(`supabase link --project-ref YOUR_PROJECT_REF`).

```bash
supabase functions deploy create-ayrshare-profile
supabase functions deploy linkedin-connect
supabase functions deploy check-linkedin-status
supabase functions deploy publish-post
supabase functions deploy refresh-metrics
```

Then set these as **secrets** on the project (never in your frontend `.env`):

```bash
supabase secrets set AYRSHARE_API_KEY=your-ayrshare-business-api-key
supabase secrets set APP_REDIRECT_URL=http://localhost:5173/dashboard
```

(`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically — you
don't set those yourself.)

## 3. Get your Ayrshare API key

1. Sign up at ayrshare.com and pick the Business plan (needed for the
   multi-user Profiles API this app relies on).
2. Copy your API key from the dashboard into the secret above.

## 4. Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173, sign up, complete onboarding, and click Connect
on the dashboard.

## Important: verify the Ayrshare integration details

The four `supabase/functions/*` files that talk to Ayrshare are written
against Ayrshare's documented endpoints and field names as of when this was
written, but third-party APIs do shift over time. Every place in that code
marked `// CHECK THIS` is a field name or endpoint path worth confirming
against Ayrshare's current docs (ayrshare.com/docs) before you rely on it —
these are the exact spots most likely to need a small tweak.

## What's intentionally not built yet

- Flyer/image upload for posts (currently text-only captions)
- The AI comment-analysis / lead-matching feature discussed separately —
  worth its own follow-up once onboarding + connect + publish are solid
- Real LinkedIn partner-tier API access (this app deliberately routes
  through Ayrshare instead, to avoid LinkedIn's own multi-month partner
  review)

## Update: glassmorphism redesign + new modules

The UI has been redesigned with a glassmorphism aesthetic (frosted glass
cards over a dark mesh-gradient background) and Plus Jakarta Sans + Inter
fonts. Four new modules were added: Idea Bank, Content Calendar, Media
Library, and Brand Kit — all wired to real Supabase data (`ideas` table,
the `media` storage bucket, and the existing `brand_foundation` table).

Run `supabase/migrations/0002_ideas_and_media.sql` in the SQL Editor (after
0001) to create the `ideas` table and the `media` storage bucket.

See `PROJECT_HISTORY.md` for the full history and current state — read this
first if you're picking up this project fresh (e.g. in Claude Code).
