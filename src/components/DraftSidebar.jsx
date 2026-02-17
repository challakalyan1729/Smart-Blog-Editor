import { useEditorStore } from '../store/useEditorStore'

function formatUpdatedAt(value) {
  if (!value) return 'Not saved'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not saved'
  return date.toLocaleString()
}

export default function DraftSidebar() {
  const drafts = useEditorStore((state) => state.drafts)
  const currentPostId = useEditorStore((state) => state.currentPostId)
  const isLoadingDrafts = useEditorStore((state) => state.isLoadingDrafts)
  const createNewDraft = useEditorStore((state) => state.createNewDraft)
  const selectDraft = useEditorStore((state) => state.selectDraft)

  return (
    <aside className="h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Drafts</h2>
        <button
          type="button"
          onClick={createNewDraft}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
        >
          New
        </button>
      </div>

      {isLoadingDrafts ? (
        <p className="text-sm text-slate-500">Loading drafts...</p>
      ) : drafts.length === 0 ? (
        <p className="text-sm text-slate-500">No saved drafts yet.</p>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft) => {
            const active = currentPostId === draft.id
            return (
              <button
                key={draft.id}
                type="button"
                onClick={() => selectDraft(draft.id)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  active
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {draft.title || 'Untitled draft'}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      draft.status === 'published'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {draft.status}
                  </span>
                </div>
                <p className="max-h-8 overflow-hidden text-xs text-slate-500">
                  {draft.content_text || 'No content yet.'}
                </p>
                <p className="mt-2 text-[11px] text-slate-400">
                  Updated: {formatUpdatedAt(draft.updated_at)}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </aside>
  )
}
