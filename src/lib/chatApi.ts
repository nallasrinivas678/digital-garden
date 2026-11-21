// The assistant chat: one POST per message. The service keeps the conversation, so the page only
// remembers the conversation id it was given. Served by llm-gateway (.NET) by default; set
// VITE_CHAT_API_URL to use the Node service (assistant-node), which has the same request and answer.

const baseUrl = () => (import.meta.env.VITE_CHAT_API_URL || import.meta.env.VITE_ASSISTANT_API_URL) as string

export interface ChatReply {
  conversationId: string
  reply: string
  /** Names of the tools the assistant used for this answer. */
  toolCallsExecuted: string[]
}

/** The service answers with a readable `error`; show it as is. */
export class ChatError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Plain words for the tool names shown under an answer. Unknown names are shown as they are. */
const TOOL_LABELS: Record<string, string> = {
  list_events: 'Checked your calendar',
  create_event: 'Added a calendar event',
  search_emails: 'Searched your email',
  create_draft: 'Saved an email draft',
  read_doc: 'Read a Google Doc',
  append_to_doc: 'Added to a Google Doc',
  list_tasks: 'Looked at your tasks',
  create_task: 'Added a task',
  complete_task: 'Marked a task done',
  web_search: 'Searched the web',
}

export const toolLabel = (name: string): string => TOOL_LABELS[name] ?? name

export interface ConversationSummary {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
}

/** A saved message as the page shows it: the user's words, or an answer with the tools it used. */
export interface SavedMessage {
  role: 'user' | 'assistant'
  text: string
  tools: string[]
}

export interface Conversation {
  id: string
  title: string | null
  messages: SavedMessage[]
}

async function request(accessToken: string, path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    })
  } catch {
    throw new ChatError('Could not reach the assistant. Check your connection and try again.', 0)
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: unknown; detail?: unknown } | null
    const text = [body?.error, body?.detail].find((v): v is string => typeof v === 'string')
    throw new ChatError(text ?? 'Something went wrong. Please try again.', res.status)
  }
  return res
}

export async function sendChatMessage(accessToken: string, message: string, conversationId: string | null): Promise<ChatReply> {
  const res = await request(accessToken, '/assistant/chat', { method: 'POST', body: JSON.stringify({ conversationId, message }) })
  return (await res.json()) as ChatReply
}

// Saved conversations are served by the Node service only (the .NET service has no list).
export async function listConversations(accessToken: string): Promise<ConversationSummary[]> {
  const res = await request(accessToken, '/assistant/conversations')
  return ((await res.json()) as { conversations: ConversationSummary[] }).conversations
}

export async function getConversation(accessToken: string, id: string): Promise<Conversation> {
  const res = await request(accessToken, `/assistant/conversations/${encodeURIComponent(id)}`)
  return (await res.json()) as Conversation
}

export async function deleteConversation(accessToken: string, id: string): Promise<void> {
  await request(accessToken, `/assistant/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
