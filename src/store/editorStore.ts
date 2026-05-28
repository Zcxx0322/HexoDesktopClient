import { create } from 'zustand';
import type { Post, PostFrontMatter } from '@/types';

interface EditorState {
  currentPost: Post | null;
  isModified: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;

  setCurrentPost: (post: Post | null) => void;
  updateContent: (content: string) => void;
  updateFrontMatter: (fm: Partial<PostFrontMatter>) => void;
  markSaved: () => void;
  markModified: () => void;
  closePost: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentPost: null,
  isModified: false,
  isSaving: false,
  lastSavedAt: null,

  setCurrentPost: (post) => {
    set({ currentPost: post, isModified: false, lastSavedAt: null });
  },

  updateContent: (content) => {
    const { currentPost } = get();
    if (!currentPost) return;
    set({
      currentPost: { ...currentPost, content },
      isModified: true,
    });
  },

  updateFrontMatter: (fm) => {
    const { currentPost } = get();
    if (!currentPost) return;
    set({
      currentPost: {
        ...currentPost,
        frontMatter: { ...currentPost.frontMatter, ...fm },
      },
      isModified: true,
    });
  },

  markSaved: () => {
    set({ isModified: false, lastSavedAt: new Date().toISOString() });
  },

  markModified: () => {
    set({ isModified: true });
  },

  closePost: () => {
    set({ currentPost: null, isModified: false, lastSavedAt: null });
  },
}));
