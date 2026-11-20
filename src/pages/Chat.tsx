import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'
import { ChatError, sendChatMessage, toolLabel } from '../lib/chatApi'
import { renderMarkdown } from '../lib/markdown'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  tools?: string[]
  isError?: boolean
}

// Ask the assistant about your calendar, email drafts, documents, tasks, or the web. The service
// saves the conversation; this page keeps only the conversation id, so "New chat" starts a fresh one.
export default function Chat() {
  const { session } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const message = text.trim()
    if (!message || isSending || !session) return

    setText('')
    setMessages((m) => [...m, { role: 'user', text: message }])
    setIsSending(true)
    try {
      const result = await sendChatMessage(session.access_token, message, conversationId)
      setConversationId(result.conversationId)
      setMessages((m) => [...m, { role: 'assistant', text: result.reply, tools: result.toolCallsExecuted }])
    } catch (err) {
      const reply = err instanceof ChatError ? err.message : 'Something went wrong. Please try again.'
      setMessages((m) => [...m, { role: 'assistant', text: reply, isError: true }])
    } finally {
      setIsSending(false)
    }
  }

  function onNewChat() {
    if (isSending) return
    setMessages([])
    setConversationId(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Assistant</p>
          <h1 className="text-xl font-semibold text-slate-900 mt-1">Chat</h1>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onNewChat}
            disabled={isSending}
            className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-slate-600 hover:bg-surface-hover disabled:opacity-40"
          >
            New chat
          </button>
        )}
      </header>

      <section className="card-glow rounded-xl bg-surface-card p-5 space-y-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Ask about your calendar, search your email, save an email draft, read or add to a Google Doc, manage your tasks,
            or look something up on the web. It saves email as a draft only and never sends it.
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {isSending && <p className="text-sm text-slate-400 italic animate-pulse">Thinking…</p>}
        <div ref={bottomRef} />
      </section>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
          aria-label="Message the assistant"
          placeholder="Message the assistant"
          className="flex-1 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isSending || !text.trim()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </form>
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
      <div className="prose-note text-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(message.text) }} />
      {message.tools && message.tools.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {message.tools.map((tool) => (
            <li key={tool} className="rounded-full border border-surface-border px-2 py-0.5 text-xs text-slate-500">
              {toolLabel(tool)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
