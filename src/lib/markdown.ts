// Markdown rendering for the Garden module. Notes are eventually shown on a
// public, unauthenticated page (/notes/:slug), so the rendered HTML is
// sanitized even though only the signed-in owner ever writes the source.

import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: true })

export function renderMarkdown(source: string): string {
  const html = marked.parse(source) as string
  return DOMPurify.sanitize(html)
}
