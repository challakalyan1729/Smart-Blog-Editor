import { useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';

export const useAutoSave = () => {
  const { editorState } = useEditorStore();

  useEffect(() => {
    // Your auto-save logic here
    console.log("Auto-save hook active");
  }, [editorState]);
};