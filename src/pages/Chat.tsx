import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  approveAction,
  ChatError,
  deleteConversation,
  getConversation,
  listConversations,
  rejectAction,
  sendChatMessage,
  toolLabel,
  type ConversationSummary,
  type PendingAction,
} from '../lib/chatApi'
import { renderMarkdown } from '../lib/markdown'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  tools?: string[]
  isError?: boolean
  /** The result of a change the user decided on (shown as a short note). */
  isNote?: boolean
}

const errorText = (err: unknown) => (err instanceof ChatError ? err.message : 'Something went wrong. Please try again.')

// Ask the assistant about your calendar, email drafts, documents, tasks, or the web. The service
// saves each conversation; the list on the left reopens one, and the open one is in the address
// (?c=<id>) so a refresh keeps it.
export default function Chat() {
  const { session } = useAuth()
  const token = session?.access_token
  const [params, setParams] = useSearchParams()
  const openId = params.get('c')

  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null)
  const [listFailed, setListFailed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // Changes the assistant proposed that wait for Approve or Reject, and the one being decided now.
  const [pending, setPending] = useState<PendingAction[]>([])
  const [deciding, setDeciding] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const refreshList = useCallback(async () => {
    if (!token) return
    try {
      setConversations(await listConversations(token))
      setListFailed(false)
    } catch {
      setListFailed(true)
    }
  }, [token])

  useEffect(() => {
    void refreshList()
  }, [refreshList])

  // Open the conversation named in the address. A reply to a new chat sets the address itself,
  // so the conversation already on screen is not loaded again.
  useEffect(() => {
    if (!token) return
    if (!openId) {
      setConversationId(null)
      setMessages([])
      setPending([])
      return
    }
    if (openId === conversationId) return
    let cancelled = false
    setIsLoading(true)
    getConversation(token, openId)
      .then((conversation) => {
        if (cancelled) return
        setConversationId(conversation.id)
        setMessages(conversation.messages.map((m) => ({ role: m.role, text: m.text, tools: m.tools })))
        setPending(conversation.pendingActions ?? [])
      })
      .catch((err) => {
        if (cancelled) return
        setConversationId(null)
        setPending([])
        setMessages([{ role: 'assistant', text: errorText(err), isError: true }])
      })
      .finally(() => !cancelled && setIsLoading(false))
    return () => {
      cancelled = true
    }
    // conversationId is left out on purpose: only a change of address should load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const message = text.trim()
    if (!message || isSending || isLoading || !token) return

    setText('')
    setMessages((m) => [...m, { role: 'user', text: message }])
    setIsSending(true)
    try {
      const result = await sendChatMessage(token, message, conversationId)
      setMessages((m) => [...m, { role: 'assistant', text: result.reply, tools: result.toolCallsExecuted }])
      setPending((p) => [...p, ...(result.pendingActions ?? [])])
      if (result.conversationId !== conversationId) {
        setConversationId(result.conversationId)
        setParams({ c: result.conversationId }, { replace: true })
      }
      void refreshList()
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: errorText(err), isError: true }])
    } finally {
      setIsSending(false)
    }
  }

  // Approve runs the change as the user; reject drops it. Either way the card goes and a short note
  // says what happened. A 409 means it was already decided (or expired), so the card goes too.
  async function onDecide(action: PendingAction, verb: 'approve' | 'reject') {
    if (!token || deciding) return
    setDeciding(action.id)
    try {
      const outcome = await (verb === 'approve' ? approveAction : rejectAction)(token, action.id)
      setPending((p) => p.filter((a) => a.id !== action.id))
      const text =
        outcome.status === 'rejected'
          ? `Dropped: ${action.preview}.`
          : outcome.status === 'done'
            ? outcome.result ?? 'Done.'
            : `That did not go through: ${outcome.result ?? 'unknown error'}`
      setMessages((m) => [...m, { role: 'assistant', text, isNote: true, isError: outcome.status === 'failed' }])
    } catch (err) {
      if (err instanceof ChatError && err.status === 409) setPending((p) => p.filter((a) => a.id !== action.id))
      setMessages((m) => [...m, { role: 'assistant', text: errorText(err), isError: true }])
    } finally {
      setDeciding(null)
    }
  }

  function open(id: string | null) {
    if (isSending) return
    setConfirmDelete(null)
    setParams(id ? { c: id } : {})
  }

  async function onDelete(id: string) {
    if (!token) return
    if (confirmDelete !== id) {
      setConfirmDelete(id)
      return
    }
    setConfirmDelete(null)
    try {
      await deleteConversation(token, id)
      if (id === conversationId) open(null)
      void refreshList()
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: errorText(err), isError: true }])
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Assistant</p>
          <h1 className="text-xl font-semibold text-slate-900 mt-1">Chat</h1>
        </div>
        <button
          onClick={() => open(null)}
          disabled={isSending || (!conversationId && messages.length === 0)}
          className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-slate-600 hover:bg-surface-hover disabled:opacity-40"
        >
          New chat
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-[15rem_1fr]">
        <nav aria-label="Conversations" className="card-glow rounded-xl bg-surface-card p-3 max-h-56 md:max-h-[70vh] overflow-auto">
          <p className="px-2 pb-2 text-xs font-medium text-slate-500">Conversations</p>
          {listFailed && <p className="px-2 text-xs text-slate-400">Your conversations could not be loaded.</p>}
          {!listFailed && conversations?.length === 0 && <p className="px-2 text-xs text-slate-400">No conversations yet.</p>}
          <ul className="space-y-0.5">
            {conversations?.map((c) => (
              <li key={c.id} className="group flex items-center gap-1">
                <button
                  onClick={() => open(c.id)}
                  aria-current={c.id === conversationId ? 'page' : undefined}
                  className={`flex-1 min-w-0 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-hover ${
                    c.id === conversationId ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                  }`}
                >
                  <span className="block truncate">{c.title || 'Untitled'}</span>
                  <span className="block text-xs text-slate-400">{new Date(c.updatedAt).toLocaleDateString()}</span>
                </button>
                <button
                  onClick={() => void onDelete(c.id)}
                  onBlur={() => setConfirmDelete((d) => (d === c.id ? null : d))}
                  aria-label={confirmDelete === c.id ? `Confirm deleting ${c.title || 'Untitled'}` : `Delete ${c.title || 'Untitled'}`}
                  className={`shrink-0 rounded px-1.5 py-1 text-xs ${
                    confirmDelete === c.id ? 'text-red-600 font-medium' : 'text-slate-400 hover:text-red-600'
                  }`}
                >
                  {confirmDelete === c.id ? 'Delete?' : '×'}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-4 min-w-0">
          <section className="card-glow rounded-xl bg-surface-card p-5 space-y-4" aria-live="polite">
            {isLoading && <p className="text-sm text-slate-400 italic">Loading…</p>}
            {!isLoading && messages.length === 0 && (
              <p className="text-sm text-slate-500">
                Ask about your calendar, search your email, save an email draft, read or add to a Google Doc, manage your
                tasks, or look something up on the web. It saves email as a draft only and never sends it.
              </p>
            )}
            {!isLoading && messages.map((m, i) => <MessageBubble key={i} message={m} />)}
            {!isLoading && pending.length > 0 && (
              <ul className="space-y-2" aria-label="Changes waiting for your approval">
                {pending.map((action) => (
                  <li key={action.id} className="rounded-lg border border-brand-200 bg-brand-50 p-3 space-y-2">
                    <p className="text-xs font-medium text-brand-700">Waiting for your approval</p>
                    <p className="text-sm text-slate-900 break-words">{action.preview}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void onDecide(action, 'approve')}
                        disabled={deciding !== null}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-40"
                      >
                        {deciding === action.id ? 'Working…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => void onDecide(action, 'reject')}
                        disabled={deciding !== null}
                        className="rounded-lg border border-surface-border bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-surface-hover disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
              className="flex-1 min-w-0 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isSending || isLoading || !text.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return <p className="text-sm text-slate-900 font-medium whitespace-pre-wrap">{message.text}</p>
  }
  if (message.isError) {
    return <p className="text-sm text-red-600">{message.text}</p>
  }
  if (message.isNote) {
    return <p className="text-sm text-emerald-700">{message.text}</p>
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
