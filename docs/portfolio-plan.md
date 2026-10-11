# TaskTide (digital-garden) — Public Portfolio Plan

Goal: add a public, unauthenticated portfolio surface (Home, Projects, Garden index)
to the existing `digital-garden` repo, so a resume/job application can link directly
to it — without disturbing the existing authenticated app (Tasks, Upcoming, Career).

---

## 1. Routing changes

The app currently has an auth-gated shell (`ProtectedRoute`) plus one public
route (`/privacy`). Add three more public routes alongside it:

```
/              → Home.tsx        (NEW — public landing/portfolio page)
/projects      → Projects.tsx    (NEW — TaskTide + llm-gateway showcase)
/notes         → GardenIndex.tsx (NEW — public list of published posts)
/notes/:slug   → (existing)      (already public per current Garden feature)
/privacy       → (existing)
/app/*         → existing authenticated routes (Tasks, Upcoming, Career)
                 ← consider moving the current authenticated "/" to "/app"
                   so "/" is free for the public Home page
/login         → (existing)
```

**Note on the root path conflict:** right now `/` likely routes to the
authenticated Tasks page or Login. Decide:
- **Option A (recommended):** `/` becomes the public Home page; signed-in
  users click "Open App" → redirects to `/app` (Tasks). Cleanest for a
  resume link ("here's my site") vs. an app link (TestFlight/`/app`).
- **Option B:** keep `/` as the app entry, and use a subdomain or `/about`
  for the portfolio. More routing overhead for little benefit — go with A
  unless you have a reason not to.

---

## 2. New components

```
src/pages/
  Home.tsx            # public landing page
  Projects.tsx         # project showcase (TaskTide, llm-gateway, etc.)
  GardenIndex.tsx       # public list of Garden posts (title, date, excerpt)

src/components/
  PublicLayout.tsx      # header/footer wrapper for public pages (distinct
                         # from the authenticated app's Layout.tsx/Navbar)
  Hero.tsx               # name, title, bio, links — reused on Home
  ProjectCard.tsx         # reusable card: name, stack badges, links, screenshot
  PostListItem.tsx         # reusable row for GardenIndex and Home's "recent posts"
```

### Home.tsx — sections
1. `Hero` — name, title ("Senior Software Engineer — Backend & Distributed
   Systems"), 1–2 sentence bio, links (GitHub, LinkedIn, resume PDF, email)
2. Featured Projects (2–3 `ProjectCard`s, pulled from a shared constant or
   Supabase table — see Section 3)
3. Recent Garden posts (3 most recent, via existing `hooks.ts` query,
   reused with a `limit` param)
4. Experience summary (GEICO, years, core stack — short, not a full resume)
5. Contact / resume download footer

### Projects.tsx — sections
- Full project list using `ProjectCard`, each with:
  - Name + one-line description
  - Live link (TestFlight for TaskTide, Vercel URL for this site, GitHub
    for llm-gateway)
  - Tech stack badges
  - Architecture summary (2–4 bullets — the "why," not just "what")
  - Link to a related Garden post if one exists (deep-dive writeup)

### GardenIndex.tsx
- List all published notes (reuse existing Garden data hook, remove the
  `slug`-specific filter, add pagination/sort by date)
- Each item links to the existing `/notes/:slug` page

---

## 3. Data: where project info lives

Two options — pick based on how often you'll update it:

**Option A — hardcoded constant (simplest, good for v1)**
```ts
// src/data/projects.ts
export const projects = [
  {
    id: "tasktide",
    name: "TaskTide",
    description: "Personal task + life hub with an AI assistant backend.",
    liveUrl: "https://testflight.apple.com/join/XXXXX",
    repoUrl: "https://github.com/nallasrinivas678/digital-garden",
    stack: ["React Native", "Expo", "Supabase", ".NET", "Azure"],
    highlights: [
      "Provider-agnostic LLM orchestrator with tool-calling",
      "Event-driven task sync across web + mobile",
    ],
    relatedPostSlug: "building-tasktide-ai-assistant", // optional
  },
  {
    id: "llm-gateway",
    name: "llm-gateway",
    description: "A .NET backend for orchestrating LLM providers and tools.",
    repoUrl: "https://github.com/nallasrinivas678/llm-gateway",
    stack: [".NET Core", "Azure AKS", "Anthropic", "Gemini"],
    highlights: [
      "Tool-calling dispatcher shared across providers",
      "Deployed on AKS with Key Vault-backed secrets",
    ],
  },
];
```

**Option B — Supabase table (`projects`)**
Only worth it if you want to edit projects without redeploying, or show
them dynamically elsewhere (e.g., in TaskTide's mobile app too). For a
portfolio page that changes rarely, Option A is less overhead — skip the
schema/migration unless you have a concrete reason to need it editable
at runtime.

**Recommendation:** start with Option A. Revisit only if you find yourself
redeploying frequently just to tweak project copy.

---

## 4. Styling / reuse

- Reuse existing Tailwind config and design tokens — don't introduce a
  second style system for the public pages.
- `PublicLayout.tsx` can be intentionally simpler than the authenticated
  `Layout.tsx`/`Navbar` (no sidebar, just a top nav: Home / Projects /
  Garden / Resume, plus a "Sign in" link for returning users).

---

## 5. Content to prepare (not code, but needed before building)

- [ ] Finalized bio/one-liner for the Hero section
- [ ] Resume PDF (place in `public/resume.pdf`, link from Hero + footer)
- [ ] 1–2 screenshots or a short screen recording of TaskTide for `ProjectCard`
- [ ] TestFlight public link for TaskTide
- [ ] 2–3 architecture highlight bullets per project (why, not just what)
- [ ] At least one Garden post about the llm-gateway/orchestrator build —
      this is the piece that turns "I built an app" into a real technical
      discussion in an interview

---

## 6. Build order

1. `PublicLayout.tsx` + route restructuring (`/` → Home, move app to `/app`)
2. `Hero.tsx` + static `Home.tsx` shell (no dynamic data yet — just layout)
3. `src/data/projects.ts` + `ProjectCard.tsx` → wire into `Home.tsx` and new `Projects.tsx`
4. `GardenIndex.tsx` — reuse existing Garden data hook with a list view
5. Pull 3 recent Garden posts into `Home.tsx` via the same hook
6. Add resume PDF + download link
7. Deploy to Vercel, verify `/`, `/projects`, `/notes` all render without auth
8. Update Supabase Auth **Site URL / Redirect URLs** if the root path
   changed meaningfully (shouldn't be needed, but verify login redirect
   still lands signed-in users at `/app` correctly)
9. Write the first Garden post (llm-gateway architecture) and link it from
   the `llm-gateway` `ProjectCard`

---

## 7. Checklist

- [ ] Decide root path strategy (Option A: `/` = public Home, app moves to `/app`)
- [ ] Build `PublicLayout.tsx`
- [ ] Build `Hero.tsx` + `Home.tsx`
- [ ] Create `src/data/projects.ts`
- [ ] Build `ProjectCard.tsx`
- [ ] Build `Projects.tsx`
- [ ] Build `GardenIndex.tsx` (public post list)
- [ ] Wire recent posts into `Home.tsx`
- [ ] Add resume PDF + link
- [ ] Gather screenshots/TestFlight link for TaskTide
- [ ] Verify public routes work unauthenticated (incognito test)
- [ ] Verify login/redirect flow still works after root path change
- [ ] Write first technical Garden post (llm-gateway orchestrator)
- [ ] Add portfolio URL to resume/LinkedIn
