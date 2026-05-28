import { useMemo } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useLocale } from '@/hooks/useLocale';
import { Monitor, X, FileText } from 'lucide-react';
import { marked } from 'marked';

interface PreviewPanelProps {
  onClose: () => void;
}

export default function PreviewPanel({ onClose }: PreviewPanelProps) {
  const { currentPost } = useEditorStore();
  const { t } = useLocale();

  const htmlPreview = useMemo(() => {
    if (!currentPost?.content) return '';
    return marked(currentPost.content) as string;
  }, [currentPost?.content]);

  return (
    <div className="h-full flex flex-col border-l border-border bg-card">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">{t('preview.title')}</span>
        <div className="flex items-center gap-1">
          <button className="btn-icon" onClick={onClose} title="关闭预览面板">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {currentPost ? (
          <div className="h-full overflow-y-auto p-6 bg-white dark:bg-[#1e1e1e]">
            <article
              className="prose prose-slate dark:prose-invert max-w-none
                prose-headings:font-semibold prose-headings:tracking-tight
                prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                prose-p:leading-relaxed prose-p:my-3
                prose-code:bg-muted prose-code:text-primary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-medium prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-[#1e293b] dark:prose-pre:bg-[#0f172a] prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:shadow
                prose-pre:text-gray-100
                prose-img:rounded-lg prose-img:shadow-md
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-primary prose-blockquote:bg-muted/20 prose-blockquote:py-1 prose-blockquote:px-4
                prose-li:my-0.5
                [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-gray-100
                [&_code]:bg-muted [&_code]:text-primary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm"
              dangerouslySetInnerHTML={{ __html: htmlPreview }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <FileText size={36} className="mx-auto opacity-20" />
              <p className="text-sm">{t('preview.selectPost')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
