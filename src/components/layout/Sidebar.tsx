import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useLocale } from '@/hooks/useLocale';
import { FileText, FileEdit, Plus, Trash2, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import type { Post } from '@/types';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface SidebarProps {
  onPostSelect?: () => void;
}

export default function Sidebar({ onPostSelect }: SidebarProps) {
  const { currentProject, projects, setCurrentProject, loadProjects, removeProject } = useProjectStore();
  const { currentPost, setCurrentPost } = useEditorStore();
  const { t } = useLocale();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [postsOpen, setPostsOpen] = useState(true);
  const [draftsOpen, setDraftsOpen] = useState(true);

  useEffect(() => {
    if (currentProject) {
      window.electronAPI.listPosts(currentProject.id).then(setPosts).catch(console.error);
    }
  }, [currentProject]);

  const publishedPosts = posts.filter((p) => !p.isDraft);
  const draftPosts = posts.filter((p) => p.isDraft);

  const handleSelectProject = async (project: any) => {
    try {
      const opened = await window.electronAPI.openProject(project.id);
      setCurrentProject(opened);
      await window.electronAPI.watchProject(opened.path);
    } catch (err) {
      console.error('打开项目失败:', err);
    }
  };

  const handleSelectPost = async (post: Post) => {
    setLoadingId(post.id);
    try {
      const fullPost = await window.electronAPI.readPost(post.filePath);
      setCurrentPost(fullPost);
      onPostSelect?.();
    } catch (err) {
      console.error('读取文章失败:', err);
    }
    setLoadingId(null);
  };

  const handleNewPost = async () => {
    if (!currentProject) return;
    try {
      const post = await window.electronAPI.createPost(
        currentProject.id,
        { title: t('post.untitled'), tags: [], categories: [] },
        false
      );
      setPosts((prev) => [post, ...prev]);
      setCurrentPost(post);
      onPostSelect?.();
    } catch (err) {
      console.error('创建文章失败:', err);
    }
  };

  const handleNewDraft = async () => {
    if (!currentProject) return;
    try {
      const draft = await window.electronAPI.createPost(
        currentProject.id,
        { title: t('draft.untitled'), tags: [], categories: [] },
        true
      );
      setPosts((prev) => [draft, ...prev]);
      setCurrentPost(draft);
      onPostSelect?.();
    } catch (err) {
      console.error('创建草稿失败:', err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    await window.electronAPI.deleteProject(projectId);
    removeProject(projectId);
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
    }
  };

  const confirmDeletePost = async () => {
    if (!deleteTarget) return;
    await window.electronAPI.deletePost(deleteTarget.id);
    setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    if (currentPost?.id === deleteTarget.id) {
      setCurrentPost(null);
    }
    setDeleteTarget(null);
  };

  return (
    <div className="h-full flex flex-col border-r border-border bg-card">
      {/* 项目列表 */}
      <div className="border-b border-border">
        <div
          className="panel-header cursor-pointer"
          onClick={() => setProjectsOpen(!projectsOpen)}
        >
          <div className="flex items-center gap-1">
            {projectsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="panel-title">{t('project.section')}</span>
          </div>
        </div>
        {projectsOpen && (
          <div className="p-2 space-y-0.5 max-h-48 overflow-y-auto">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`sidebar-item group ${currentProject?.id === project.id ? 'active' : ''}`}
              >
                <FolderOpen size={14} className="flex-shrink-0" />
                <span className="truncate flex-1 cursor-pointer" onClick={() => handleSelectProject(project)}>{project.name}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 btn-icon"
                  onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                  title="删除项目"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="text-xs text-muted-foreground p-2">
                暂无项目，请新建或导入
              </div>
            )}
          </div>
        )}
      </div>

      {/* 文章列表 */}
      {currentProject && (
        <>
          <div className="border-b border-border">
            <div
              className="panel-header cursor-pointer"
              onClick={() => setPostsOpen(!postsOpen)}
            >
              <div className="flex items-center gap-1">
                {postsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="panel-title">{t('post.section')}</span>
              </div>
              <button
                className="btn-icon"
                onClick={(e) => { e.stopPropagation(); handleNewPost(); }}
                title="新建文章"
              >
                <Plus size={14} />
              </button>
            </div>
            {postsOpen && (
              <div className="p-1 space-y-0.5 max-h-72 overflow-y-auto">
                {publishedPosts.map((post) => (
                  <div
                    key={post.id}
                    className={`sidebar-item group ${currentPost?.id === post.id ? 'active' : ''}`}
                  >
                    <FileText size={14} className="flex-shrink-0" />
                    <span
                      className="truncate flex-1 cursor-pointer"
                      onClick={() => handleSelectPost(post)}
                    >
                      {post.frontMatter.title || post.slug}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 btn-icon"
                      onClick={() => setDeleteTarget(post)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {publishedPosts.length === 0 && (
                  <div className="text-xs text-muted-foreground p-2">暂无文章</div>
                )}
              </div>
            )}
          </div>

          {/* 草稿列表 */}
          <div className="flex-1 border-b border-border">
            <div
              className="panel-header cursor-pointer"
              onClick={() => setDraftsOpen(!draftsOpen)}
            >
              <div className="flex items-center gap-1">
                {draftsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="panel-title">{t('draft.section')}</span>
              </div>
              <button
                className="btn-icon"
                onClick={(e) => { e.stopPropagation(); handleNewDraft(); }}
                title="新建草稿"
              >
                <Plus size={14} />
              </button>
            </div>
            {draftsOpen && (
              <div className="p-1 space-y-0.5 max-h-48 overflow-y-auto">
                {draftPosts.map((post) => (
                  <div
                    key={post.id}
                    className={`sidebar-item group ${currentPost?.id === post.id ? 'active' : ''}`}
                  >
                    <FileEdit size={14} className="flex-shrink-0 text-yellow-500" />
                    <span
                      className="truncate flex-1 cursor-pointer"
                      onClick={() => handleSelectPost(post)}
                    >
                      {post.frontMatter.title || post.slug}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 btn-icon"
                      onClick={() => setDeleteTarget(post)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {draftPosts.length === 0 && (
                  <div className="text-xs text-muted-foreground p-2">暂无草稿</div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="删除文章"
          message={`确定要删除「${deleteTarget.frontMatter.title || deleteTarget.slug}」吗？此操作不可撤销。`}
          confirmLabel="删除"
          onConfirm={confirmDeletePost}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
