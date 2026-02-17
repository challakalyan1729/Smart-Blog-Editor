import { create } from 'zustand';

export const useEditorStore = create((set) => ({
  editorState: null,
  postId: null, // Track if we are editing an existing draft
  isSaving: false,
  setEditorState: (state) => set({ editorState: state }),
  setPostId: (id) => set({ postId: id }),
  setIsSaving: (status) => set({ isSaving: status }),
}));
