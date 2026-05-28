import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useConfigStore } from '@/store/configStore';
import { useLocale } from '@/hooks/useLocale';
import { Circle, CheckCircle2, AlertCircle } from 'lucide-react';

export default function StatusBar() {
  const { currentProject } = useProjectStore();
  const { currentPost, isModified, lastSavedAt } = useEditorStore();
  const { envStatus } = useConfigStore();
  const { t } = useLocale();

  const wordCount = currentPost?.wordCount ?? 0;
  const charCount = currentPost?.content?.length ?? 0;

  return (
    <div className="statusbar">
      <div className="flex items-center gap-4">
        {currentProject && (
          <span className="flex items-center gap-1">
            <Circle size={8} className="text-green-500 fill-green-500" />
            {currentProject.name}
          </span>
        )}

        {currentPost && (
          <>
            <span>
              {currentPost.isDraft ? t('status.draft') : t('status.post')}: {currentPost.frontMatter.title || currentPost.slug}
            </span>
            <span className="flex items-center gap-1">
              {isModified ? (
                <AlertCircle size={10} className="text-yellow-500" />
              ) : lastSavedAt ? (
                <CheckCircle2 size={10} className="text-green-500" />
              ) : null}
              {isModified ? t('status.modified') : lastSavedAt ? t('status.saved') : ''}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {currentPost && (
          <>
            <span>{wordCount} 词</span>
            <span>{charCount} 字符</span>
          </>
        )}

        <div className="flex items-center gap-2">
          {envStatus && (
            <>
              <span className={envStatus.node.installed ? 'text-green-500' : 'text-red-500'}>
                Node {envStatus.node.version?.replace(/v/, '') || '?'}
              </span>
              <span className={envStatus.git.installed ? 'text-green-500' : 'text-red-500'}>
                Git {envStatus.git.version?.replace(/git version /, '') || '?'}
              </span>
              <span className={envStatus.hexo.installed ? 'text-green-500' : 'text-red-500'}>
                Hexo {envStatus.hexo.version || '?'}
              </span>
            </>
          )}
        </div>

        <span className="text-muted-foreground">UTF-8</span>
      </div>
    </div>
  );
}
