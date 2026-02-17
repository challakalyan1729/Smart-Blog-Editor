import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';

export default function Toolbar() {
  const [editor] = useLexicalComposerContext();

  const handleAISummary = async () => {
    // 1. Get current text from editor
    let textContent = "";
    editor.update(() => {
      textContent = $getRoot().getTextContent();
    });

    // 2. Send to Backend
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textContent })
      });
      
      const data = await response.json();
      alert(data.summary); // Show the AI result
    } catch (error) {
      console.error("AI Error:", error);
      alert("Failed to get AI summary. Is the backend running?");
    }
  };

  return (
    <div className="p-2 border-b border-gray-200 flex gap-2 bg-gray-50 rounded-t-lg">
      <button 
        onClick={handleAISummary}
        className="px-3 py-1 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition-colors"
      >
        ✨ AI Summary
      </button>
      {/* You can add Bold/Italic buttons here later */}
    </div>
  );
}