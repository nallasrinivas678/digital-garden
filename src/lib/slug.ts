/** Turn free text into a URL-safe slug: lowercase, dashes, no punctuation. */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'note'
}

/** A random 4-char suffix, for making a fresh note's slug unique at creation. */
export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6)
}
