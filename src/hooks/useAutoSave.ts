import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useConfigStore } from '@/store/configStore';

export function useAutoSave() {
  const { currentPost, isModified } = useEditorStore();
  const { config } = useConfigStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const interval = config?.autoSaveInterval || 3000;

    timerRef.current = setInterval(async () => {
      if (isModified && currentPost) {
        try {
          await window.electronAPI.updatePost(currentPost);
          useEditorStore.getState().markSaved();
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isModified, currentPost, config?.autoSaveInterval]);
}
