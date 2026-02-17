import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../store/useEditorStore';

export const useAutoSave = (delay = 2000) => {
  const { editorState, postId, setPostId, setIsSaving } = useEditorStore();
  const timerRef = useRef(null);

  const saveContent = useCallback(async (content) => {
    setIsSaving(true);
    try {
      const endpoint = postId 
        ? `http://127.0.0.1:8000/api/posts/${postId}` 
        : `http://127.0.0.1:8000/api/posts/`;
      
      const method = postId ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: JSON.stringify(content) }),
      });

      const data = await response.json();
      
      // If it was a new post, save the ID so future edits are updates (PATCH), not new creates (POST)
      // ... inside saveContent function ...
      if (!postId && data.id) {
        setPostId(data.id);
      }
      
      // FIX: Change newDgite() to new Date().toLocaleTimeString()
      console.log('Saved successfully at', new Date().toLocaleTimeString()); 
    } catch (error) {
      console.error('Auto-save failed:', error);
// ...
    } finally {
      setIsSaving(false);
    }
  }, [postId, setPostId, setIsSaving]);

  useEffect(() => {
    if (!editorState) return;

    // DSA Logic: Clear previous timer if user types again before delay finishes
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      saveContent(editorState);
    }, delay);

    return () => clearTimeout(timerRef.current);
  }, [editorState, saveContent, delay]);
};
