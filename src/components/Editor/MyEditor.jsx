import { useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import Toolbar from './Toolbar.jsx';
import { useEditorStore } from '../../store/useEditorStore.js';
import { useAutoSave } from '../../hooks/undebounceSave.js'; // Ensure file name matches

const themeVB = {
  paragraph: 'mb-2',
  text: {
    bold: 'font-bold',
    italic: 'italic',
  },
};

const initialConfig = {
  namespace: 'MyEditor',
  theme: themeVB,
  onError: (error) => console.error(error),
};

export default function SmartEditor() {
  const setEditorState = useEditorStore((s) => s.setEditorState);
  
  // Initialize the auto-save hook
  useAutoSave(); 

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container relative">
        <Toolbar />
        <div className="editor-inner bg-white min-h-[500px] rounded-b-lg shadow-inner">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[500px] p-4 outline-none prose max-w-none" />
            }
            placeholder={
              <div className="absolute top-14 left-4 text-gray-400 pointer-events-none">
                Start typing your blog post...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <OnChangePlugin onChange={(editorState) => {
             const json = editorState.toJSON();
             setEditorState(json);
          }} />
        </div>
      </div>
    </LexicalComposer>
  );
}
