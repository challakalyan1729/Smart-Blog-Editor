import { create } from 'zustand'
import {
  createPost,
  fetchPost,
  fetchPosts,
  publishPost,
  streamAIResponse,
  updatePost,
} from '../lib/api'

const EMPTY_EDITOR_STATE = {
  root: {
    children: [
      {
        children: [],
        direction: null,
        format: '',
        indent: 0,
        textFormat: 0,
        textStyle: '',
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

const isValidEditorState = (state) => {
  if (!state || typeof state !== 'object') return false
  if (!state.root || typeof state.root !== 'object') return false
  if (state.root.type !== 'root') return false
  if (!Array.isArray(state.root.children)) return false
  return true
}

const sanitizeEditorState = (state) => (isValidEditorState(state) ? state : EMPTY_EDITOR_STATE)

const titleFromText = (text) => {
  const normalized = (text || '').replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, 70) : 'Untitled draft'
}

const upsertDraft = (drafts, draft) => {
  const next = [draft, ...drafts.filter((item) => item.id !== draft.id)]
  return next.sort((a, b) => {
    const aDate = new Date(a.updated_at).getTime()
    const bDate = new Date(b.updated_at).getTime()
    return bDate - aDate
  })
}

export const useEditorStore = create((set, get) => ({
  drafts: [],
  currentPostId: null,
  activeStatus: 'draft',
  editorState: EMPTY_EDITOR_STATE,
  contentText: '',
  changeToken: 0,
  hasUnsavedChanges: false,
  isSaving: false,
  saveError: null,
  lastSavedAt: null,
  isLoadingDrafts: false,
  isLoadingPost: false,
  aiOutput: '',
  aiError: null,
  isGeneratingAI: false,

  initialize: async () => {
    set({ isLoadingDrafts: true, saveError: null })
    try {
      const posts = await fetchPosts()
      set({ drafts: posts, isLoadingDrafts: false })
      if (posts.length > 0) {
        await get().selectDraft(posts[0].id)
      } else {
        get().createNewDraft()
      }
    } catch (error) {
      set({
        isLoadingDrafts: false,
        saveError: error.message || 'Failed to load drafts.',
      })
      get().createNewDraft()
    }
  },

  createNewDraft: () => {
    set({
      currentPostId: null,
      activeStatus: 'draft',
      editorState: EMPTY_EDITOR_STATE,
      contentText: '',
      hasUnsavedChanges: false,
      saveError: null,
      lastSavedAt: null,
      aiOutput: '',
      aiError: null,
    })
  },

  selectDraft: async (postId) => {
    set({ isLoadingPost: true, saveError: null, aiOutput: '', aiError: null })
    try {
      const post = await fetchPost(postId)
      set((state) => ({
        currentPostId: post.id,
        activeStatus: post.status,
        editorState: sanitizeEditorState(post.content_json),
        contentText: post.content_text || '',
        hasUnsavedChanges: false,
        changeToken: state.changeToken + 1,
        lastSavedAt: post.updated_at,
        isLoadingPost: false,
        drafts: upsertDraft(state.drafts, post),
      }))
    } catch (error) {
      set({
        isLoadingPost: false,
        saveError: error.message || 'Unable to load draft.',
      })
    }
  },

  setEditorSnapshot: (nextEditorState, nextText) => {
    set((state) => {
      const sameText = state.contentText === nextText
      const sameJson =
        JSON.stringify(state.editorState || {}) === JSON.stringify(nextEditorState || {})

      if (sameText && sameJson) {
        return {}
      }

      return {
        editorState: nextEditorState,
        contentText: nextText,
        hasUnsavedChanges: true,
        changeToken: state.changeToken + 1,
      }
    })
  },

  persistSnapshot: async (snapshot) => {
    const state = get()
    const contentText = snapshot.content_text || ''
    const contentJson = snapshot.content_json || EMPTY_EDITOR_STATE
    const token = snapshot.changeToken
    const hasContent = contentText.trim().length > 0

    if (!state.currentPostId && !hasContent) {
      return null
    }

    const payload = {
      title: titleFromText(contentText),
      content_json: contentJson,
      content_text: contentText,
    }

    set({ isSaving: true, saveError: null })

    try {
      const response = state.currentPostId
        ? await updatePost(state.currentPostId, payload)
        : await createPost(payload)

      set((latest) => ({
        currentPostId: response.id,
        activeStatus: response.status,
        lastSavedAt: response.updated_at,
        isSaving: false,
        saveError: null,
        hasUnsavedChanges:
          latest.changeToken === token ? false : latest.hasUnsavedChanges,
        drafts: upsertDraft(latest.drafts, response),
      }))

      return response
    } catch (error) {
      set({
        isSaving: false,
        saveError: error.message || 'Auto-save failed.',
      })
      throw error
    }
  },

  publishCurrentPost: async () => {
    const postId = get().currentPostId
    if (!postId) return

    set({ saveError: null })
    try {
      const response = await publishPost(postId)
      set((state) => ({
        activeStatus: response.status,
        lastSavedAt: response.updated_at,
        drafts: upsertDraft(state.drafts, response),
      }))
    } catch (error) {
      set({ saveError: error.message || 'Failed to publish post.' })
    }
  },

  generateAI: async (mode) => {
    const text = get().contentText || ''
    if (!text.trim()) {
      set({
        aiOutput: '',
        aiError: 'Write some content first, then try AI.',
      })
      return
    }

    set({ aiOutput: '', aiError: null, isGeneratingAI: true })
    try {
      await streamAIResponse(
        { text, mode },
        (chunk) => {
          set((state) => ({ aiOutput: state.aiOutput + chunk }))
        }
      )
      set({ isGeneratingAI: false })
    } catch (error) {
      set({
        isGeneratingAI: false,
        aiError: error.message || 'AI generation failed.',
      })
    }
  },
}))
