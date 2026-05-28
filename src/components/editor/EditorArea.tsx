import { useEditorStore } from '@/store/editorStore';
import { useLocale } from '@/hooks/useLocale';
import MarkdownEditor from './MarkdownEditor';
import FrontMatterEditor from './FrontMatterEditor';
import { FileText } from 'lucide-react';

export default function EditorArea() {
  const { currentPost } = useEditorStore();
  const { t } = useLocale();

  if (!currentPost) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-4">
          <FileText size={48} className="mx-auto text-muted-foreground/30" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-muted-foreground">{t('editor.noPost')}</h3>
            <p className="text-sm text-muted-foreground/60">{t('editor.hint')}</p>
            <p className="text-xs text-muted-foreground/40">{t('editor.hint2')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* FrontMatter Editor */}
      <div className="border-b border-border bg-card">
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-border">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">文章属性</span>
        </div>
        <div className="px-3 py-1.5">
          <FrontMatterEditor />
        </div>
      </div>

      {/* Markdown Editor */}
      <div className="flex-1 overflow-hidden">
        <MarkdownEditor />
      </div>
    </div>
  );
}
