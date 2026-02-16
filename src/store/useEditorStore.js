import { create } from 'zustand';

export const useEditorStore = create((set) => ({
  editorState: null,
  isSaving: false,
  setEditorState: (state) => set({ editorState: state }),
  setIsSaving: (status) => set({ isSaving: status }),
}));