import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useConfigStore } from '@/store/configStore';
import { useProjectStore } from '@/store/projectStore';
import { Eye, EyeOff, Code2, Type } from 'lucide-react';
import { marked } from 'marked';

// Configure marked for proper rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

export default function MarkdownEditor() {
  const { currentPost, updateContent, updateFrontMatter, isModified } = useEditorStore();
  const config = useConfigStore((s) => s.config);
  const { currentProject } = useProjectStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const previewHtml = useMemo(() => {
    if (!currentPost?.content) return '';
    return marked(currentPost.content) as string;
  }, [currentPost?.content]);

  // Apply font settings directly to the textarea DOM node
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta || !config) return;
    ta.style.fontSize = `${config.editorFontSize || 16}px`;
    ta.style.fontFamily = config.editorFontFamily || 'JetBrains Mono, Fira Code, Consolas, monospace';
  }, [config]);

  // Auto-save every 3 seconds
  useEffect(() => {
    const interval = config?.autoSaveInterval || 3000;
    autoSaveTimerRef.current = setInterval(() => {
      if (isModified && currentPost) {
        window.electronAPI.updatePost(currentPost).then(() => {
          // Post was saved
        }).catch(console.error);
      }
    }, interval);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [isModified, currentPost, config?.autoSaveInterval]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentPost && isModified) {
          window.electronAPI.updatePost(currentPost).catch(console.error);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPost, isModified]);

  const handleContentChange = (value: string) => {
    updateContent(value);

    // Parse title from first # heading
    const titleMatch = value.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      updateFrontMatter({ title: titleMatch[1].trim() });
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('image/') && currentProject) {
        try {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const relativePath = await window.electronAPI.copyImageFromData(
            dataUrl,
            file.name,
            currentProject.id
          );
          const imageMd = `![${file.name}](${relativePath})`;
          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const content = currentPost?.content || '';
            const newContent =
              content.slice(0, start) + imageMd + content.slice(textarea.selectionEnd);
            updateContent(newContent);
          }
        } catch (err) {
          console.error('Failed to copy image:', err);
        }
      }
    }
  };

  if (!currentPost) return null;

  const fontSize = config?.editorFontSize || 16;
  const fontFamily = config?.editorFontFamily || 'JetBrains Mono, Fira Code, Consolas, monospace';

  return (
    <div className="h-full flex flex-col">
      {/* Editor Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1">
          <button
            className={`btn-icon ${mode === 'edit' ? 'text-primary' : ''}`}
            onClick={() => setMode('edit')}
            title="Edit Mode"
          >
            <Code2 size={14} />
          </button>
          <button
            className={`btn-icon ${mode === 'preview' ? 'text-primary' : ''}`}
            onClick={() => setMode('preview')}
            title="Preview Mode"
          >
            <Eye size={14} />
          </button>
          <button
            className={`btn-icon ${mode === 'split' ? 'text-primary' : ''}`}
            onClick={() => setMode('split')}
            title="Split Mode"
          >
            <Type size={14} />
          </button>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {isModified ? '未保存' : '已保存'}
        </span>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Text Editor */}
        {(mode === 'edit' || mode === 'split') && (
          <div className={`${mode === 'split' ? 'w-1/2' : 'flex-1'} overflow-hidden`}>
            <textarea
              ref={textareaRef}
              value={currentPost.content ?? ''}
              onChange={(e) => handleContentChange(e.target.value)}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="w-full h-full resize-none bg-background text-foreground p-6 outline-none"
              style={{ fontSize: `${fontSize}px`, fontFamily, lineHeight: 1.8 }}
              placeholder="Start writing your post in Markdown...

# Title

Write your content here.

## Section

- Bullet points
- More points

```code blocks```

> Blockquotes

**Bold** and *italic* text."
              spellCheck
            />
          </div>
        )}

        {/* Divider in split mode */}
        {mode === 'split' && <div className="w-px bg-border" />}

        {/* Preview */}
        {(mode === 'preview' || mode === 'split') && (
          <div className={`${mode === 'split' ? 'w-1/2' : 'flex-1'} overflow-y-auto`}>
            <div
              className="p-6 prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
              style={{ fontSize: `${fontSize}px` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
