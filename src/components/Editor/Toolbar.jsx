import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND } from 'lexical';

export default function Toolbar() {
  const [editor] = useLexicalComposerContext();

  return (
    <div className="flex gap-2 p-2 border-b border-gray-200 bg-gray-50 mb-2 rounded-t-lg">
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold"
      >
        B
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 italic"
      >
        I
      </button>
    </div>
  );
}