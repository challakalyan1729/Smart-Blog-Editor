import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import Toolbar from './Toolbar.jsx';
import { useEditorStore } from '../../store/useEditorStore.js';
import { useAutoSave } from '../../hooks/useDebounceSave.js';

export default function SmartEditor() {
  const setEditorState = useEditorStore((s) => s.setEditorState);
  useAutoSave(); // Activate auto-save logic

  return (
    <LexicalComposer initialConfig={initialConfig}>
  <Toolbar />
  <div className="editor-inner">
    <RichTextPlugin
      contentEditable={<ContentEditable className="min-h-[450px] p-4 outline-none border rounded" />}
      placeholder={<div className="placeholder">Start typing...</div>}
      ErrorBoundary={LexicalErrorBoundary}
    />
    {/* Important: This plugin must be here */}
    <OnChangePlugin onChange={(state) => setEditorState(JSON.stringify(state))} /> 
  </div>
     </LexicalComposer>
  );
}