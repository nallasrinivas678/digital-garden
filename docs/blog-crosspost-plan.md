# TaskTide (digital-garden) — Blog Cross-Posting Plan

Goal: the Garden feature already covers "write and publish tech blog posts"
(draft/publish workflow, public page at `/:username/notes/:slug`, MD/HTML
export). What's missing is cross-posting hygiene: when the same post also
goes out on Medium or Substack, there's currently no way to mark your own
site as the canonical source, and no attribution back to it on the copy you
paste elsewhere. This plan closes just that gap — no renaming, no new
surfaces, no schema overhaul.

Decided out of scope for this pass (candidates for a later roadmap item):
cover images, excerpt/OG meta tags, syntax-highlighted code blocks, tag
filtering on the index, RSS feed, scheduled publish.

---

## 1. Why this, concretely

- **Medium's importer** (already linked from the Export panel) sets a
  canonical link automatically when you import from a URL — so Medium
  cross-posts are already fine today.
- **Substack has no importer** for this; you paste Markdown into a new
  post. Nothing in that paste tells Substack or search engines that
  `tasktide.app/srnalla/notes/:slug` is the original. Two fixes, both
  cheap:
  1. Let a post optionally declare a **canonical URL** — normally that's
     just its own public page, but override it for the rare case where a
     post was first published somewhere else and mirrored into the Garden.
  2. Auto-append an **attribution footer** ("Originally published at
     ...") to both the Markdown and HTML the Export panel copies, so it
     travels with the content wherever it's pasted.

---

## 2. Schema change (additive, matches existing migration pattern)

New file `supabase/schema_notes_canonical.sql`:

```sql
alter table notes add column if not exists canonical_url text;
```

No RLS changes needed — it's just another column on `notes`, covered by
the existing owner/public-read policies in `schema_notes.sql`.

---

## 3. Types (`src/types/index.ts`)

```ts
export interface Note {
  // ...existing fields
  canonical_url: string | null
}
```

## 4. Hooks (`src/lib/hooks.ts`)

- `UpdateNoteInput` gains `canonical_url?: string | null` — `useUpdateNote`
  already spreads arbitrary fields into the Supabase `.update()` call, so
  no logic change there.
- No change needed to `useCreateNote`, `useNote`, `useNotes`,
  `usePublicNote(s)` — they already `select('*')`.

## 5. Editor UI (`src/pages/GardenEditor.tsx`)

- Pull the signed-in user's username via the existing
  `useMyPortfolioProfile()` hook (already used elsewhere for the public
  profile) to compute this post's own default public URL:
  `https://tasktide.app/${profile.username}/notes/${note.slug}`.
- Add a small "Canonical URL" text input near the slug/type/tags row,
  placeholder = the computed default, only relevant once a post is
  published. Leave it blank to just use the default (most posts); fill it
  in only to point elsewhere.
- In `ExportPanel`, build the footer once:
  ```ts
  const canonical = note.canonical_url || defaultPublicUrl
  const mdFooter = `\n\n---\n*Originally published at [${canonical}](${canonical})*`
  const htmlFooter = `<hr><p><em>Originally published at <a href="${canonical}">${canonical}</a></em></p>`
  ```
  and append `mdFooter` to the Markdown copy, `htmlFooter` to the HTML
  copy (after `renderMarkdown(body)`).

## 6. Build order

1. `supabase/schema_notes_canonical.sql` — run in Supabase SQL editor.
2. `src/types/index.ts` — add `canonical_url`.
3. `src/lib/hooks.ts` — extend `UpdateNoteInput`.
4. `src/pages/GardenEditor.tsx` — canonical URL field + footer logic in
   `ExportPanel`.
5. Manual verification (see below).
6. Update `README.md`'s Garden bullet to mention canonical-URL export if
   it's worth a one-line callout.

## 7. Verification checklist

- [ ] Publish a note, leave canonical URL blank → "Copy Markdown" /
      "Copy HTML" both end with a footer linking to the note's own
      `/:username/notes/:slug` page.
- [ ] Set a canonical URL override → exported footer uses the override,
      not the default.
- [ ] Existing notes (no `canonical_url` set) still load/save fine — the
      new column is nullable, no backfill needed.
- [ ] Unpublished (draft) notes: Export panel still only shows for
      published notes (unchanged), so no footer logic runs on drafts.
