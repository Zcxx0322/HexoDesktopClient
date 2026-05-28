import { useEffect, useCallback, useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';

/**
 * Hook to listen for file changes from the main process and
 * auto-refresh the post list and current post content.
 */
export function useFileWatcher() {
  const { currentProject } = useProjectStore();
  const { currentPost, setCurrentPost } = useEditorStore();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentProject) return;

    window.electronAPI.watchProject(currentProject.path).catch(console.error);

    const unsubscribe = window.electronAPI.onFileChanged(async (filePath: string) => {
      // Debounce: refresh if it's the current post that changed
      if (currentPost && filePath === currentPost.filePath && refreshTimerRef.current === null) {
        refreshTimerRef.current = setTimeout(async () => {
          try {
            const updated = await window.electronAPI.readPost(filePath);
            setCurrentPost(updated);
          } catch (err) {
            console.error('Failed to refresh post:', err);
          }
          refreshTimerRef.current = null;
        }, 500);
      }
    });

    return () => {
      unsubscribe();
      window.electronAPI.unwatchProject(currentProject.path).catch(console.error);
    };
  }, [currentProject?.id]);

  // Re-fetch post list periodically
  const refreshPosts = useCallback(async () => {
    if (!currentProject) return;
    // Posts are loaded via Sidebar component
  }, [currentProject?.id]);
}

/**
 * Hook to listen for keyboard shortcuts at the app level
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      // Ctrl+S: Save current post
      if (mod && e.key === 's') {
        e.preventDefault();
        const { currentPost, isModified } = useEditorStore.getState();
        if (currentPost && isModified) {
          window.electronAPI.updatePost(currentPost).then(() => {
            useEditorStore.getState().markSaved();
          }).catch(console.error);
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
