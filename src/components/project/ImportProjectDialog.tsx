import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { X, FolderSearch, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function ImportProjectDialog({ onClose }: Props) {
  const { addProject, setCurrentProject } = useProjectStore();
  const [projectPath, setProjectPath] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState<{ valid: boolean; message: string } | null>(null);

  const handleSelectDirectory = async () => {
    const dir = await window.electronAPI.selectDirectory();
    if (dir) {
      setProjectPath(dir);
      validatePath(dir);
    }
  };

  const validatePath = async (dir: string) => {
    try {
      const project = await window.electronAPI.importProject(dir);
      setValidation({ valid: true, message: `检测到有效的 Hexo 项目: ${project.name}` });
    } catch (err: any) {
      setValidation({ valid: false, message: err.message || '无效项目' });
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleImport = async () => {
    if (!projectPath.trim()) return;
    setIsImporting(true);
    setError('');
    try {
      const project = await window.electronAPI.importProject(projectPath);
      addProject(project);
      setCurrentProject(project);
      onClose();
    } catch (err: any) {
      setError(err.message || '导入项目失败');
    }
    setIsImporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="panel w-full max-w-md mx-4 shadow-2xl">
        <div className="panel-header">
          <span className="panel-title">导入已有项目</span>
          <button className="btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label mb-2 block">项目目录</label>
            <div className="flex gap-2">
              <input type="text" value={projectPath} readOnly className="input-field flex-1" placeholder="选择 Hexo 项目目录..." />
              <button className="btn-secondary" onClick={handleSelectDirectory}>
                <FolderSearch size={14} />浏览
              </button>
            </div>
          </div>
          {validation && projectPath && (
            <div className={`flex items-start gap-2 text-sm rounded-md p-3 ${validation.valid ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
              {validation.valid ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{validation.message}</span>
            </div>
          )}
          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
            <p className="font-medium mb-1">项目要求：</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>根目录包含 package.json</li>
              <li>根目录包含 _config.yml</li>
              <li>包含 source/_posts 目录结构</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleImport} disabled={isImporting || !validation?.valid}>
            {isImporting ? <Loader2 size={14} className="animate-spin" /> : null}
            导入项目
          </button>
        </div>
      </div>
    </div>
  );
}
