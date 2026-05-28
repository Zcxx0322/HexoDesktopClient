import { useProjectStore } from '@/store/projectStore';
import { useConfigStore } from '@/store/configStore';
import { useLocale } from '@/hooks/useLocale';
import {
  FilePlus, FolderOpen, Settings, Rocket, Terminal, Eye, EyeOff,
  Moon, Sun, Monitor, Play, Square, RefreshCw, CheckCircle2, XCircle, Loader2, FileCode,
} from 'lucide-react';
import { useState, useRef } from 'react';

type View = 'editor' | 'settings' | 'deploy' | 'config';

interface ToolbarProps {
  view: View;
  onViewChange: (view: View) => void;
  onNewProject: () => void;
  onImportProject: () => void;
  onEnvCheck: () => void;
  onToggleLogPanel: () => void;
  onTogglePreview: () => void;
  onShowLogPanel: () => void;
  showLogPanel: boolean;
  showPreview: boolean;
}

export default function Toolbar({
  view, onViewChange, onNewProject, onImportProject, onEnvCheck,
  onToggleLogPanel, onTogglePreview, onShowLogPanel, showLogPanel, showPreview,
}: ToolbarProps) {
  const { currentProject } = useProjectStore();
  const { isDark, toggleDarkMode, loadLogs } = useConfigStore();
  const { t } = useLocale();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isServerStarting, setIsServerStarting] = useState(false);
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [serverPort, setServerPort] = useState<number | null>(null);
  const [genStatus, setGenStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const genTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const flashGenStatus = (status: 'ok' | 'err') => {
    setGenStatus(status);
    if (genTimerRef.current) clearTimeout(genTimerRef.current);
    genTimerRef.current = setTimeout(() => setGenStatus('idle'), 2000);
  };

  const handleGenerate = async () => {
    if (!currentProject) return;
    setIsGenerating(true);
    setGenStatus('loading');
    onShowLogPanel();
    try {
      const result = await window.electronAPI.hexoGenerate(currentProject.path);
      flashGenStatus(result.success ? 'ok' : 'err');
    } catch (err) {
      flashGenStatus('err');
    }
    setIsGenerating(false);
    loadLogs(); // Refresh log panel
  };

  const handleServer = async () => {
    if (!currentProject) return;
    if (isServerRunning) {
      await window.electronAPI.hexoServerStop();
      setIsServerRunning(false);
      setServerPort(null);
      loadLogs();
    } else {
      setIsServerStarting(true);
      onShowLogPanel();
      try {
        const result = await window.electronAPI.hexoServer(currentProject.path, 4000);
        setIsServerRunning(true);
        setServerPort(result.port);
      } catch (err) {
        console.error('启动失败:', err);
      }
      setIsServerStarting(false);
      loadLogs();
    }
  };

  const genIcon = isGenerating
    ? <Loader2 size={14} className="animate-spin" />
    : genStatus === 'ok'
    ? <CheckCircle2 size={14} className="text-green-500" />
    : genStatus === 'err'
    ? <XCircle size={14} className="text-red-500" />
    : <RefreshCw size={14} />;

  const genLabel = isGenerating ? t('post.generating') : genStatus === 'ok' ? t('post.generateDone') : genStatus === 'err' ? t('post.generateFail') : t('post.generate');

  return (
    <div className="toolbar flex items-center justify-between">
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-2 mr-3 pr-3 border-r border-border">
          <span className="text-sm font-bold text-primary">Hexo</span>
          <span className="text-xs text-muted-foreground">
            {currentProject?.name || t('project.none')}
          </span>
        </div>

        <button className="btn-ghost text-xs" onClick={onNewProject} title={t('project.new') + ' (Ctrl+N)'}>
          <FilePlus size={14} /> <span className="hidden lg:inline">{t('project.new')}</span>
        </button>
        <button className="btn-ghost text-xs" onClick={onImportProject} title={t('project.import') + ' (Ctrl+O)'}>
          <FolderOpen size={14} /> <span className="hidden lg:inline">{t('project.import')}</span>
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <button
          className={`btn-ghost text-xs ${isGenerating ? 'text-blue-400' : genStatus === 'err' ? 'text-red-400' : ''}`}
          onClick={handleGenerate}
          disabled={!currentProject || isGenerating}
          title="hexo generate"
        >
          {genIcon}
          <span className="hidden lg:inline">{genLabel}</span>
        </button>

        <button
          className={`btn-ghost text-xs ${isServerStarting ? 'text-yellow-400' : isServerRunning ? 'text-green-500 bg-green-500/10' : ''}`}
          onClick={handleServer}
          disabled={!currentProject || isServerStarting}
          title={isServerRunning ? '停止 hexo server' : '启动 hexo server — 等同于 hexo s'}
        >
          {isServerStarting ? <Loader2 size={14} className="animate-spin" /> :
           isServerRunning ? <Square size={14} /> : <Play size={14} />}
          <span className="hidden lg:inline">
            {isServerStarting ? t('post.previewStarting') : isServerRunning ? `${t('post.previewStop')} :${serverPort}` : t('post.preview')}
          </span>
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <button className={`btn-ghost text-xs ${view === 'editor' ? 'bg-accent' : ''}`} onClick={() => onViewChange('editor')}>{t('view.editor')}</button>
        <button className={`btn-ghost text-xs ${view === 'deploy' ? 'bg-accent' : ''}`} onClick={() => onViewChange('deploy')} disabled={!currentProject}>
          <Rocket size={14} /> <span className="hidden lg:inline">{t('view.deploy')}</span>
        </button>
        <button className={`btn-ghost text-xs ${view === 'settings' ? 'bg-accent' : ''}`} onClick={() => onViewChange('settings')}>
          <Settings size={14} /> <span className="hidden lg:inline">{t('view.settings')}</span>
        </button>
        <button className={`btn-ghost text-xs ${view === 'config' ? 'bg-accent' : ''}`} onClick={() => onViewChange('config')} disabled={!currentProject}>
          <FileCode size={14} /> <span className="hidden lg:inline">配置</span>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button className={`btn-icon ${showPreview ? 'text-primary' : ''}`} onClick={onTogglePreview}
          title={showPreview ? '隐藏预览面板 (Ctrl+P)' : '显示预览面板 (Ctrl+P)'}>
          {showPreview ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button className={`btn-icon ${showLogPanel ? 'text-primary' : ''}`} onClick={onToggleLogPanel}
          title="切换日志面板 (Ctrl+J)">
          <Terminal size={14} />
        </button>
        <button className="btn-icon" onClick={toggleDarkMode} title="切换主题">
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button className="btn-icon" onClick={onEnvCheck} title="环境检测">
          <Monitor size={14} />
        </button>
      </div>
    </div>
  );
}
