import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list'
import { $createHeadingNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical'
import { FORMAT_TEXT_COMMAND, REDO_COMMAND, UNDO_COMMAND } from 'lexical'
import { useEditorStore } from '../../store/useEditorStore'

const buttonStyles =
  'rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100'

function ToolButton({ label, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${buttonStyles} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {label}
    </button>
  )
}

export default function Toolbar() {
  const [editor] = useLexicalComposerContext()
  const aiOutput = useEditorStore((state) => state.aiOutput)
  const aiError = useEditorStore((state) => state.aiError)
  const isGeneratingAI = useEditorStore((state) => state.isGeneratingAI)
  const generateAI = useEditorStore((state) => state.generateAI)

  const setBlockType = (type) => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) {
        return
      }

      if (type === 'paragraph') {
        $setBlocksType(selection, () => $createParagraphNode())
        return
      }

      $setBlocksType(selection, () => $createHeadingNode(type))
    })
  }

  return (
    <div className="border-b border-slate-200 bg-slate-50/80 p-3">
      <div className="flex flex-wrap gap-2">
        <ToolButton label="Undo" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} />
        <ToolButton label="Redo" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} />
        <ToolButton
          label="Bold"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        />
        <ToolButton
          label="Italic"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        />
        <ToolButton label="H1" onClick={() => setBlockType('h1')} />
        <ToolButton label="H2" onClick={() => setBlockType('h2')} />
        <ToolButton label="P" onClick={() => setBlockType('paragraph')} />
        <ToolButton
          label="Bullet List"
          onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        />
        <ToolButton
          label="Numbered List"
          onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        />
        <ToolButton
          label={isGeneratingAI ? 'Summarizing...' : 'Generate Summary'}
          onClick={() => generateAI('summary')}
          disabled={isGeneratingAI}
        />
        <ToolButton
          label={isGeneratingAI ? 'Fixing...' : 'Fix Grammar'}
          onClick={() => generateAI('grammar')}
          disabled={isGeneratingAI}
        />
      </div>

      {(isGeneratingAI || aiOutput || aiError) && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            AI Output
          </p>
          {aiError ? (
            <p className="text-sm text-red-600">{aiError}</p>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {aiOutput || 'Generating...'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
