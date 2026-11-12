import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useDeleteDocument, useDocuments, useRetryDocument, useUploadDocument } from '../lib/hooks'
import { showToast } from './Toast'
import type { Doc, DocStatus } from '../types'

const STATUS_META: Record<DocStatus, { label: string; className: string }> = {
  processing: { label: 'Processing', className: 'bg-amber-100 text-amber-700' },
  ready: { label: 'Ready', className: 'bg-brand-100 text-brand-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
}

// PDF Q&A: upload a PDF, watch it get processed by llm-gateway, then open it
// to ask questions. Status is polled by useDocuments while anything is processing.
export default function DocumentList() {
  const { data: docs, isLoading } = useDocuments()
  const upload = useUploadDocument()
  const fileInput = useRef<HTMLInputElement>(null)

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be chosen again
    if (!file) return
    upload.mutate(file, { onError: (err) => showToast(err instanceof Error ? err.message : 'Upload failed.') })
  }

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Documents</p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1">PDF Q&amp;A</h1>
        </div>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={upload.isPending}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
        >
          {upload.isPending ? 'Uploading…' : '+ Upload PDF'}
        </button>
        <input ref={fileInput} type="file" accept="application/pdf" className="hidden" onChange={onFileChosen} />
      </header>

      <section className="card-glow rounded-xl bg-surface-card p-5">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : !docs || docs.length === 0 ? (
          <p className="text-sm text-slate-500">Upload a PDF to ask questions about it.</p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {docs.map((d) => (
              <DocumentRow key={d.id} doc={d} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function DocumentRow({ doc }: { doc: Doc }) {
  const retry = useRetryDocument()
  const remove = useDeleteDocument()
  const meta = STATUS_META[doc.status]

  function onDelete() {
    if (!window.confirm(`Delete "${doc.title}"? This can't be undone.`)) return
    remove.mutate(doc, { onError: () => showToast("Couldn't delete the document. Please try again.") })
  }

  function onRetry() {
    retry.mutate(doc.id, { onError: () => showToast("Couldn't restart processing. Please try again.") })
  }

  return (
    <li className="py-3 space-y-1">
      <div className="flex items-center gap-3">
        {doc.status === 'ready' ? (
          <Link to={`/app/docs/${doc.id}`} className="flex-1 text-sm text-slate-800 truncate hover:text-slate-900">
            {doc.title}
          </Link>
        ) : (
          <span className="flex-1 text-sm text-slate-800 truncate">{doc.title}</span>
        )}
        {doc.page_count != null && (
          <span className="hidden sm:inline text-xs font-mono text-slate-500 shrink-0">{doc.page_count} pages</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${meta.className}`}>{meta.label}</span>
        {doc.status !== 'ready' && (
          <button
            onClick={onRetry}
            disabled={retry.isPending}
            className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-40"
          >
            Retry
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={remove.isPending}
          className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-40"
        >
          Delete
        </button>
      </div>
      {doc.status === 'failed' && doc.error && <p className="text-xs text-red-600">{doc.error}</p>}
    </li>
  )
}
