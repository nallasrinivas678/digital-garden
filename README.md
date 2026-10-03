# TaskTide

A private personal hub: plan your days (tasks, recurring reminders, upcoming
appointments), track your job search, and grow a notes garden of tech
write-ups you can publish elsewhere. Built to be a personal web app first,
with a clean path to a mobile (Expo / React Native) port later — that port
is underway, see [mobile/](mobile/README.md).

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + TypeScript |
| Data fetching | TanStack Query (react-query) |
| Routing | React Router |
| Styling | Tailwind CSS |
| Backend / DB / Auth | Supabase (Postgres + Auth) |
| Hosting | Vercel |

## Features (v1)

- **Tasks** — the landing page: open tasks sorted by due date, with a checkbox and an inline add form. Due dates are picked from a popover calendar (`DatePicker`), not the native browser date input.
- **Upcoming** — appointments and outings for the next two months, grouped by day, with a quick add form (including recurring ones). Replaced the old month-grid Calendar view.
- **Career** — job application tracker: company, role, status pipeline (saved → applied → interviewing → offer/rejected/withdrawn), contact info, next follow-up date, compensation, and notes.
- **Garden** — write, publish, and export Markdown notes (tech notes, exercises, system design write-ups) at a public `/notes/:slug` page.
- **Google sign-in** via Supabase Auth. Every row is protected by Row Level Security, so you only ever see your own data.
- **Privacy policy** — public, unauthenticated page at `/privacy` (required by app store listings, not just a document).

## Mobile app (Expo)

A native port lives in [`mobile/`](mobile/README.md) — same Supabase
project, `lib/`/`types/` copied verbatim (see that folder's README for
which files and why). Currently a walking skeleton: native Google sign-in
+ the Tasks screen, both verified working. Getting it ready for the App
Store and Google Play is tracked in
[`mobile/PUBLISHING.md`](mobile/PUBLISHING.md).

## Roadmap

- Reminder notifications
- Port Career, Upcoming, and Garden to the mobile app
- App Store and Google Play submission (see `mobile/PUBLISHING.md`)

## Project layout

```
src/
  lib/
    supabase.ts   # Supabase client
    auth.tsx      # AuthProvider, useAuth, Google sign-in  ← portable to Expo
    hooks.ts      # all data reads/writes (react-query)     ← portable to Expo
    dates.ts      # date + streak helpers                   ← portable to Expo
  pages/          # Tasks, UpcomingAppointments, Career, Garden, Login (the UI — rebuilt for mobile)
  components/     # Layout, Navbar, ProtectedRoute, DatePicker
  types/          # shared domain types                     ← portable to Expo
supabase/
  schema.sql      # tables + RLS policies
```

The `lib/` and `types/` folders hold all the logic and are framework-agnostic
on purpose — when you build the Expo app, you copy those over and only rebuild
the screens in `pages/`.

---

## Setup — get it running

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to https://supabase.com → **New project**. Pick a name and a strong DB password.
2. Once it's ready, open **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

### 3. Create the database tables

In the Supabase dashboard, open **SQL Editor → New query**, paste the contents
of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This sets up
the shared `set_updated_at()` trigger function every other schema file relies
on. Then run [`supabase/schema_scheduler.sql`](supabase/schema_scheduler.sql)
(Tasks/Upcoming), [`supabase/schema_task_priority.sql`](supabase/schema_task_priority.sql)
(task priority), [`supabase/schema_event_tags.sql`](supabase/schema_event_tags.sql)
(tags on tasks/appointments/outings), [`supabase/schema_event_reminders.sql`](supabase/schema_event_reminders.sql)
(in-app reminders), [`supabase/schema_career.sql`](supabase/schema_career.sql)
(job applications), and [`supabase/schema_notes.sql`](supabase/schema_notes.sql)
(Garden) the same way — each is additive and safe to re-run. If you ran an
earlier version of this project, also run
[`supabase/schema_drop_unused.sql`](supabase/schema_drop_unused.sql) once to
remove the old journal/habit tables (that feature was never built and has
been removed from the codebase).

### 4. Turn on Google sign-in

1. In Supabase: **Authentication → Providers → Google → Enable**.
2. You need a Google OAuth client. In the [Google Cloud Console](https://console.cloud.google.com):
   - **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**.
   - Under **Authorized redirect URIs**, add the callback URL Supabase shows you
     on the Google provider screen (looks like
     `https://<your-project-ref>.supabase.co/auth/v1/callback`).
   - Copy the generated **Client ID** and **Client secret** back into Supabase's
     Google provider settings and save.
3. In Supabase **Authentication → URL Configuration**, set **Site URL** to
   `http://localhost:5173` for local dev (add your Vercel URL later for prod).

### 5. Add your environment variables

```bash
cp .env.local.example .env.local
```

Then edit `.env.local`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 6. Run it

```bash
npm run dev
```

Open http://localhost:5173, sign in with Google, and you're in.

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel's **Environment
Variables**. After the first deploy, add your Vercel URL to Supabase's
**Authentication → URL Configuration** (Site URL + Redirect URLs) and to the
Google OAuth client's authorized redirect URIs.

## Scripts

```bash
npm run dev      # local dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
npm run lint     # oxlint
```

## Next ideas

- Reminder notifications (a natural fit once you build the Expo app)
