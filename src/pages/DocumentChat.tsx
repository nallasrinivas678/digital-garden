import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { AskError, askDocument } from '../lib/docsApi'
import { useDocument } from '../lib/hooks'
import { renderMarkdown } from '../lib/markdown'
import type { AskSource } from '../types'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  sources?: AskSource[]
  isError?: boolean
}

// Ask questions about one ready document. Answers come from llm-gateway as a
// single response (no streaming) with the pages they were drawn from. The
// conversation lives in component state only; nothing is saved.
export default function DocumentChat() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const { data: doc, isLoading } = useDocument(id)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAsking])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || isAsking || !session || !id) return

    setQuestion('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setIsAsking(true)
    try {
      const result = await askDocument(session.access_token, id, q)
      setMessages((m) => [...m, { role: 'assistant', text: result.answer, sources: result.sources }])
    } catch (err) {
      const text = err instanceof AskError ? err.message : 'Something went wrong. Please try again.'
      setMessages((m) => [...m, { role: 'assistant', text, isError: true }])
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-4">
      <Link to="/app" className="text-sm text-slate-500 hover:text-slate-900">
        ← Back
      </Link>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !doc ? (
        <p className="text-sm text-slate-500">This document could not be found.</p>
      ) : doc.status !== 'ready' ? (
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">{doc.title}</h1>
          <p className="text-sm text-slate-500">
            {doc.status === 'processing'
              ? 'This document is still being processed. Questions will work once it is ready.'
              : 'Processing this document failed. Go back and retry it.'}
          </p>
        </div>
      ) : (
        <>
          <header>
            <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Ask this document</p>
            <h1 className="text-xl font-semibold text-slate-900 mt-1">{doc.title}</h1>
          </header>

          <section className="card-glow rounded-xl bg-surface-card p-5 space-y-4">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">
                Ask a question. Answers come only from this document and cite the pages they use.
              </p>
            )}
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {isAsking && <p className="text-sm text-slate-400 italic animate-pulse">Thinking…</p>}
            <div ref={bottomRef} />
          </section>

          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={1000}
              placeholder="Ask a question about this document"
              className="flex-1 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isAsking || !question.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
            >
              Ask
            </button>
          </form>
        </>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return <p className="text-sm text-slate-900 font-medium">{message.text}</p>
  }
  if (message.isError) {
    return <p className="text-sm text-red-600">{message.text}</p>
  }
  return (
    <div className="space-y-2">
      <div
        className="prose-note text-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.text) }}
      />
      {message.sources && message.sources.length > 0 && (
        <ul className="space-y-1 border-t border-surface-border pt-2">
          {message.sources.map((s, i) => (
            <li key={i} className="text-xs text-slate-500">
              <span className="font-mono text-brand-600">Page {s.page}</span> — {s.snippet}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
