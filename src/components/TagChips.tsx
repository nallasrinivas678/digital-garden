import { useState } from 'react'

interface TagChipsProps {
  tags: string[]
  onChange?: (tags: string[]) => void
  suggestions?: string[]
  readOnly?: boolean
  className?: string
}

function normalize(tag: string): string {
  return tag.trim().toLowerCase()
}

/** Editable tag-chip input, or a read-only chip list when `readOnly`/no `onChange`. */
export default function TagChips({ tags, onChange, suggestions, readOnly, className }: TagChipsProps) {
  const [draft, setDraft] = useState('')
  const editable = !readOnly && !!onChange

  function addTag(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return
    if (tags.some((t) => normalize(t) === normalize(trimmed))) {
      setDraft('')
      return
    }
    onChange?.([...tags, trimmed])
    setDraft('')
  }

  function removeTag(tag: string) {
    onChange?.(tags.filter((t) => t !== tag))
  }

  const filteredSuggestions =
    editable && draft
      ? (suggestions ?? []).filter(
          (s) => normalize(s).includes(normalize(draft)) && !tags.some((t) => normalize(t) === normalize(s)),
        )
      : []

  if (!editable && tags.length === 0) return null

  return (
    <div className={`relative flex flex-wrap items-center gap-1 ${className ?? ''}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-surface-hover text-slate-600"
        >
          {tag}
          {editable && (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="text-slate-400 hover:text-red-500"
            >
              ×
            </button>
          )}
        </span>
      ))}
      {editable && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              addTag(draft)
            } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
              removeTag(tags[tags.length - 1])
            }
          }}
          onBlur={() => addTag(draft)}
          placeholder="+ tag"
          className="w-16 bg-transparent text-xs px-1 py-0.5 text-slate-500 placeholder-slate-400 focus:outline-none focus:w-24 transition-all"
        />
      )}
      {filteredSuggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 mt-1 w-40 card-glow rounded-xl bg-surface-card p-1">
          {filteredSuggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                addTag(s)
              }}
              className="block w-full text-left text-xs px-2 py-1 rounded hover:bg-brand-100 text-slate-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
