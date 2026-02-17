import { useEffect, useRef } from 'react'
import DraftSidebar from './components/DraftSidebar'
import SmartEditor from './components/Editor/MyEditor'
import EditorHeader from './components/EditorHeader'
import { useEditorStore } from './store/useEditorStore'

function App() {
  const initialize = useEditorStore((state) => state.initialize)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) {
      return
    }
    initRef.current = true
    void initialize()
  }, [initialize])

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[300px_1fr]">
        <DraftSidebar />
        <main className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <EditorHeader />
          <SmartEditor />
        </main>
      </div>
    </div>
  )
}

export default App
