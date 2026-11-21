// Turns the plain text of a resume into a simple layout (a header, then sections of lines and
// bullets) for the preview and the printed PDF. Pure code: it only decides where headings,
// role lines and bullets are. It never changes, adds or drops a word of the text.

export type ResumeItem =
  | { kind: 'bullet'; text: string }
  // A role or school line: followed by bullets, or carrying a year or "Present".
  | { kind: 'role'; text: string }
  | { kind: 'line'; text: string }
  // A blank line in the text: a little space.
  | { kind: 'gap' }

export interface ResumeSection {
  // Null for the lines before the first heading when there is no header.
  heading: string | null
  items: ResumeItem[]
}

export interface ResumeLayout {
  /** The first line (the name), or null when the text is empty. */
  name: string | null
  /** Short lines under the name, before the first heading: email, phone, links. */
  contact: string[]
  sections: ResumeSection[]
}

const BULLET = /^\s*[-*•▪●◦·–]\s+(\S.*)$/
const YEAR_OR_PRESENT = /\b(19|20)\d{2}\b|\bpresent\b/i
// A line that is just a section name, whatever its case, with an optional trailing colon.
const KNOWN_HEADING =
  /^(professional |career |executive )?(summary|profile|objective)$|^(work |professional |relevant |technical )?(experience|history)$|^employment( history)?$|^education( and training)?$|^(technical |key |core )?skills( summary)?$|^(selected )?projects$|^certifications?( and licenses)?$|^(awards|honors|publications|languages|volunteer( experience)?|interests|references|achievements)$/i
const MAX_HEADING_CHARS = 40
const MAX_CONTACT_CHARS = 100

function headingOf(line: string): string | null {
  const text = line.trim().replace(/:$/, '')
  if (!text || text.length > MAX_HEADING_CHARS || BULLET.test(line) || /[.,;@]/.test(text)) return null
  if (KNOWN_HEADING.test(text)) return text
  // A short line in capitals ("TECHNICAL SKILLS") is a heading too.
  const letters = text.replace(/[^A-Za-z]/g, '')
  return letters.length >= 3 && letters === letters.toUpperCase() ? text : null
}

export function parseResume(text: string): ResumeLayout {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const first = lines.findIndex((l) => l.trim() !== '')
  if (first === -1) return { name: null, contact: [], sections: [] }

  // The name is the first line, unless that line is itself a heading (a resume with no name line).
  const firstIsHeading = headingOf(lines[first]!) !== null
  const name = firstIsHeading ? null : lines[first]!.trim()
  let at = firstIsHeading ? first : first + 1

  // The header: short lines up to the first blank line or heading.
  const contact: string[] = []
  const body: string[] = []
  if (name !== null) {
    while (at < lines.length && lines[at]!.trim() !== '' && headingOf(lines[at]!) === null && lines[at]!.trim().length <= MAX_CONTACT_CHARS && !BULLET.test(lines[at]!)) {
      contact.push(lines[at]!.trim())
      at++
    }
  }
  body.push(...lines.slice(at))

  const sections: ResumeSection[] = []
  let current: ResumeSection | null = null
  for (const [i, raw] of body.entries()) {
    const trimmed = raw.trim()
    const heading = headingOf(raw)
    if (heading !== null) {
      current = { heading, items: [] }
      sections.push(current)
      continue
    }
    if (trimmed === '') {
      // One gap between groups, never at the start or twice in a row.
      const last = current?.items.at(-1)
      if (current && last && last.kind !== 'gap') current.items.push({ kind: 'gap' })
      continue
    }
    // Lines before any heading (no header, or text that has none) go in a section with no heading.
    current ??= sections[sections.push({ heading: null, items: [] }) - 1]!
    const bullet = BULLET.exec(raw)
    if (bullet) {
      current.items.push({ kind: 'bullet', text: bullet[1]!.trim() })
      continue
    }
    // A role line: the next non-blank line is a bullet, or this line carries a date.
    const next = body.slice(i + 1).find((l) => l.trim() !== '')
    const isRole = YEAR_OR_PRESENT.test(trimmed) || (next !== undefined && BULLET.test(next))
    current.items.push({ kind: isRole ? 'role' : 'line', text: trimmed })
  }
  for (const section of sections) {
    while (section.items.at(-1)?.kind === 'gap') section.items.pop()
  }
  return { name, contact, sections }
}

// The name for the printed page's title, which browsers use as the file name: the name part of the
// first line ("Jane Doe - Senior Engineer" gives "Jane Doe"), or just "Resume" when the first line
// does not look like a name.
export function documentTitle(layout: ResumeLayout): string {
  const first = layout.name?.split(/\s[-–|]\s|,/)[0]?.trim() ?? ''
  const looksLikeName = first.length > 0 && first.length <= 60 && !/[@\d]/.test(first)
  return looksLikeName ? `${first} - Resume` : 'Resume'
}
