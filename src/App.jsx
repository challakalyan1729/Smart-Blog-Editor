import SmartEditor from './components/Editor/MyEditor.jsx';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          My Smart Blog Editor
        </h1>
        
        {/* The Editor Card */}
        <div className="bg-white p-6 rounded-lg shadow-md min-h-[500px] border border-gray-200">
           <SmartEditor />
        </div>
        
      </div>
    </div>
  );
}

export default App;