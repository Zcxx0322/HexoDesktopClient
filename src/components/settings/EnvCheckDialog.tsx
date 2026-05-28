import { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function EnvCheckDialog({ onClose }: Props) {
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);

  const checkEnv = async () => {
    setIsChecking(true);
    try {
      const status = await window.electronAPI.detectEnvironment();
      setEnvStatus(status);
    } catch (err) {
      console.error('环境检测失败:', err);
    }
    setIsChecking(false);
  };

  useEffect(() => {
    checkEnv();
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const tools = [
    { key: 'node', label: 'Node.js', required: true, help: '从 nodejs.org 下载安装' },
    { key: 'npm', label: 'npm', required: true, help: '随 Node.js 一同安装' },
    { key: 'git', label: 'Git', required: true, help: '从 git-scm.com 下载安装' },
    { key: 'hexo', label: 'Hexo CLI', required: true, help: '运行 npm install -g hexo-cli' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="panel w-full max-w-lg mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <span className="panel-title">环境检测</span>
          <div className="flex items-center gap-1">
            <button className="btn-icon" onClick={checkEnv} disabled={isChecking}>
              <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
            </button>
            <button className="btn-icon" onClick={onClose}><X size={14} /></button>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {isChecking ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">正在检测环境...</span>
            </div>
          ) : envStatus ? (
            tools.map((tool) => {
              const info = envStatus[tool.key];
              const isInstalled = info?.installed;
              return (
                <div key={tool.key} className={`flex items-center justify-between rounded-md p-3 ${isInstalled ? 'bg-green-500/5' : 'bg-destructive/5'}`}>
                  <div className="flex items-center gap-3">
                    {isInstalled ? <CheckCircle size={18} className="text-green-500" /> : <XCircle size={18} className="text-destructive" />}
                    <div>
                      <div className="text-sm font-medium">{tool.label}</div>
                      <div className="text-xs text-muted-foreground">{isInstalled ? info.version : '未安装'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tool.required && !isInstalled && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle size={12} />必需
                      </span>
                    )}
                    {isInstalled ? (
                      <span className="text-xs text-green-500 font-medium">就绪</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{tool.help}</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : null}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3 mt-4">
            <p className="font-medium mb-1">完整功能需要：</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Node.js — Hexo 运行环境</li>
              <li>npm — 包管理器</li>
              <li>Git — 版本控制与部署</li>
              <li>Hexo CLI — 博客引擎</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
