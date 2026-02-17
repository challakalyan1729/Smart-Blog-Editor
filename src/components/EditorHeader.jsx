import { useEditorStore } from '../store/useEditorStore'

function formatSavedAt(value) {
  if (!value) return 'Not saved yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not saved yet'
  return `Saved ${date.toLocaleString()}`
}

export default function EditorHeader() {
  const currentPostId = useEditorStore((state) => state.currentPostId)
  const activeStatus = useEditorStore((state) => state.activeStatus)
  const isSaving = useEditorStore((state) => state.isSaving)
  const hasUnsavedChanges = useEditorStore((state) => state.hasUnsavedChanges)
  const saveError = useEditorStore((state) => state.saveError)
  const lastSavedAt = useEditorStore((state) => state.lastSavedAt)
  const publishCurrentPost = useEditorStore((state) => state.publishCurrentPost)

  const statusLabel = saveError
    ? `Error: ${saveError}`
    : isSaving
      ? 'Saving...'
      : hasUnsavedChanges
        ? 'Unsaved changes'
        : formatSavedAt(lastSavedAt)

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Smart Blog Editor</h1>
        <p className={`text-sm ${saveError ? 'text-red-600' : 'text-slate-500'}`}>{statusLabel}</p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            activeStatus === 'published'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {activeStatus}
        </span>
        <button
          type="button"
          onClick={publishCurrentPost}
          disabled={!currentPostId || activeStatus === 'published' || isSaving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Publish
        </button>
      </div>
    </div>
  )
}
