// Add inside your Toolbar component
const handleAISummary = async () => {
    const editorState = editor.getEditorState();
    editorState.read(async () => {
        const textContent = $getRoot().getTextContent();
        const response = await fetch('http://127.0.0.1:8000/api/ai/generate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ text: textContent })
        });
        const data = await response.json();
        alert(data.summary); // Simple UI for the demo
    });
};

// Add button in JSX
<button onClick={handleAISummary} className="...">✨ AI Summary</button>
