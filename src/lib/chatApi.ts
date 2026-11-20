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

export async function sendChatMessage(accessToken: string, message: string, conversationId: string | null): Promise<ChatReply> {
  let res: Response
  try {
    res = await fetch(`${baseUrl()}/assistant/chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, message }),
    })
  } catch {
    throw new ChatError('Could not reach the assistant. Check your connection and try again.', 0)
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: unknown; detail?: unknown } | null
    const text = [body?.error, body?.detail].find((v): v is string => typeof v === 'string')
    throw new ChatError(text ?? 'Something went wrong. Please try again.', res.status)
  }
  return (await res.json()) as ChatReply
}
