import { useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '../store/useEditorStore'

export const useAutoSave = (delayMs = 1200) => {
  const editorState = useEditorStore((state) => state.editorState)
  const contentText = useEditorStore((state) => state.contentText)
  const changeToken = useEditorStore((state) => state.changeToken)
  const hasUnsavedChanges = useEditorStore((state) => state.hasUnsavedChanges)
  const persistSnapshot = useEditorStore((state) => state.persistSnapshot)

  const debounceTimerRef = useRef(null)
  const queuedSnapshotRef = useRef(null)
  const isSavingRef = useRef(false)

  const flushQueue = useCallback(async () => {
    if (isSavingRef.current || !queuedSnapshotRef.current) {
      return
    }

    isSavingRef.current = true
    const snapshot = queuedSnapshotRef.current
    queuedSnapshotRef.current = null

    try {
      await persistSnapshot(snapshot)
    } catch {
      // Error state is tracked in store.
    } finally {
      isSavingRef.current = false
      if (queuedSnapshotRef.current) {
        void flushQueue()
      }
    }
  }, [persistSnapshot])

  useEffect(() => {
    if (!hasUnsavedChanges || !editorState) {
      return undefined
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      queuedSnapshotRef.current = {
        content_json: editorState,
        content_text: contentText,
        changeToken,
      }
      void flushQueue()
    }, delayMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [editorState, contentText, changeToken, hasUnsavedChanges, delayMs, flushQueue])
}
