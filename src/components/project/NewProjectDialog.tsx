import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { X, FolderSearch, Loader2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function NewProjectDialog({ onClose }: Props) {
  const { addProject, setCurrentProject } = useProjectStore();
  const [name, setName] = useState('');
  const [parentPath, setParentPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSelectDirectory = async () => {
    const dir = await window.electronAPI.selectDirectory();
    if (dir) setParentPath(dir);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('请输入项目名称');
      return;
    }
    if (!parentPath.trim()) {
      setError('请选择父目录');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const project = await window.electronAPI.createProject({ name: name.trim(), path: parentPath });

      try {
        await window.electronAPI.hexoInit(project.path);
      } catch (hexoErr) {
        console.warn('Hexo 初始化可能失败 (需要 hexo-cli):', hexoErr);
      }

      addProject(project);
      setCurrentProject(project);
      onClose();
    } catch (err: any) {
      setError(err.message || '创建项目失败');
    }
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="panel w-full max-w-md mx-4 shadow-2xl">
        <div className="panel-header">
          <span className="panel-title">新建 Hexo 项目</span>
          <button className="btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label mb-2 block">项目名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="my-hexo-blog" autoFocus />
          </div>
          <div>
            <label className="label mb-2 block">父目录</label>
            <div className="flex gap-2">
              <input type="text" value={parentPath} readOnly className="input-field flex-1" placeholder="选择目录..." />
              <button className="btn-secondary" onClick={handleSelectDirectory}>
                <FolderSearch size={14} />浏览
              </button>
            </div>
          </div>
          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
            <p className="font-medium mb-1">操作说明：</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>将创建新目录</li>
              <li>将初始化 Hexo (需要 hexo-cli)</li>
              <li>项目将添加到工作区</li>
            </ol>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <Loader2 size={14} className="animate-spin" /> : null}
            创建项目
          </button>
        </div>
      </div>
    </div>
  );
}
