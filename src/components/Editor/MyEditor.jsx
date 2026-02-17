import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode } from '@lexical/rich-text'
import { $getRoot } from 'lexical'
import { useMemo } from 'react'
import { useAutoSave } from '../../hooks/undebounceSave'
import { useEditorStore } from '../../store/useEditorStore'
import Toolbar from './Toolbar'

const theme = {
  paragraph: 'mb-2 text-slate-700',
  heading: {
    h1: 'mb-4 mt-2 text-4xl font-bold tracking-tight text-slate-900',
    h2: 'mb-3 mt-2 text-2xl font-semibold text-slate-900',
  },
  list: {
    listitem: 'ml-4',
    nested: {
      listitem: 'ml-6',
    },
    ol: 'list-decimal pl-6',
    ul: 'list-disc pl-6',
  },
  text: {
    bold: 'font-semibold',
    italic: 'italic',
  },
}

export default function SmartEditor() {
  const currentPostId = useEditorStore((state) => state.currentPostId)
  const editorState = useEditorStore((state) => state.editorState)
  const isLoadingPost = useEditorStore((state) => state.isLoadingPost)
  const setEditorSnapshot = useEditorStore((state) => state.setEditorSnapshot)

  useAutoSave(1200)

  const initialConfig = useMemo(
    () => ({
      namespace: `smart-editor-${currentPostId ?? 'new'}`,
      theme,
      nodes: [HeadingNode, ListNode, ListItemNode],
      editorState: JSON.stringify(editorState),
      onError: (error) => {
        console.error(error)
      },
    }),
    [currentPostId, editorState]
  )

  return (
    <LexicalComposer key={currentPostId ?? 'new-draft'} initialConfig={initialConfig}>
      <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm">
        <Toolbar />
        <div className="relative min-h-[520px]">
          {isLoadingPost && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-sm font-medium text-slate-600">
              Loading draft...
            </div>
          )}

          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[520px] p-5 text-base leading-7 outline-none" />
            }
            placeholder={
              <div className="pointer-events-none absolute left-5 top-5 text-sm text-slate-400">
                Start writing your blog post...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <OnChangePlugin
            ignoreSelectionChange
            onChange={(nextEditorState) => {
              const serialized = nextEditorState.toJSON()
              let nextText = ''
              nextEditorState.read(() => {
                nextText = $getRoot().getTextContent()
              })
              setEditorSnapshot(serialized, nextText)
            }}
          />
        </div>
      </div>
    </LexicalComposer>
  )
}
