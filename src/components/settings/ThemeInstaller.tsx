import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useConfigStore } from '@/store/configStore';
import { Download, Loader2, CheckCircle2, XCircle, Search, GitBranch, X } from 'lucide-react';

interface ThemeInfo {
  name: string;
  git: string;
  desc: string;
}

interface Props {
  onClose: () => void;
  onInstalled: (themeName: string) => void;
}

export default function ThemeInstaller({ onClose, onInstalled }: Props) {
  const { currentProject } = useProjectStore();
  const { loadLogs } = useConfigStore();
  const [popular, setPopular] = useState<ThemeInfo[]>([]);
  const [installed, setInstalled] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const base = currentProject?.path || '';

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const loadData = async () => {
    const [ins] = await Promise.all([
      base ? window.electronAPI.themeList(base) : Promise.resolve([]),
    ]);
    setInstalled(ins);
    setPopular([
      { name: 'NexT', git: 'https://github.com/next-theme/hexo-theme-next', desc: 'Elegant and powerful theme' },
      { name: 'Butterfly', git: 'https://github.com/jerryc127/hexo-theme-butterfly', desc: 'A cute and beautiful theme' },
      { name: 'Fluid', git: 'https://github.com/fluid-dev/hexo-theme-fluid', desc: 'Material design theme' },
      { name: 'Icarus', git: 'https://github.com/ppoffice/hexo-theme-icarus', desc: 'Modern and responsive' },
      { name: 'Stellar', git: 'https://github.com/xaoxuu/hexo-theme-stellar', desc: 'Elegant documentation theme' },
      { name: 'Yilia', git: 'https://github.com/litten/hexo-theme-yilia', desc: '简洁优雅' },
      { name: 'Cactus', git: 'https://github.com/probberechts/hexo-theme-cactus', desc: 'Minimalist theme' },
      { name: 'Volantis', git: 'https://github.com/volantis-x/hexo-theme-volantis', desc: 'Material design' },
      { name: 'Matery', git: 'https://github.com/blinkfox/hexo-theme-matery', desc: 'Material design + beautiful' },
      { name: 'Pure', git: 'https://github.com/cofess/hexo-theme-pure', desc: 'Pure and clean' },
      { name: 'Melody', git: 'https://github.com/Molunerfinn/hexo-theme-melody', desc: 'Simple and beautiful' },
      { name: 'Shoka', git: 'https://github.com/amehime/hexo-theme-shoka', desc: 'Anime-style theme' },
    ]);
  };

  const extractName = (url: string): string => {
    // Extract folder name from git URL: ".../hexo-theme-xxx" → "xxx" or full repo name
    const parts = url.replace(/\.git$/, '').split('/');
    const repo = parts[parts.length - 1];
    return repo.replace(/^hexo-theme-/, '');
  };

  const installGit = async (repoUrl: string) => {
    if (!base) return;
    const name = extractName(repoUrl);
    setInstalling(name);
    setStatus(null);
    try {
      const result = await window.electronAPI.themeInstallGit(base, repoUrl, name);
      if (result.success) {
        setStatus({ ok: true, msg: `${name} 安装成功！请到站点配置中将 theme 改为 ${name}` });
        onInstalled(name);
        setInstalled((prev) => [...prev, name]);
      } else {
        setStatus({ ok: false, msg: result.stderr?.slice(0, 300) || '安装失败' });
      }
    } catch (err: any) {
      setStatus({ ok: false, msg: err.message });
    }
    setInstalling(null);
    loadLogs();
  };

  const filtered = popular.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="panel w-full max-w-xl mx-4 max-h-[80vh] flex flex-col shadow-2xl">
        <div className="panel-header flex-shrink-0">
          <span className="panel-title">安装主题 (Git 克隆)</span>
          <button className="btn-icon" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {status && (
            <div className={`rounded-md p-3 text-sm flex items-center gap-2 ${status.ok ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
              {status.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {status.msg}
            </div>
          )}

          {/* Search popular themes */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="input-field pl-9" placeholder="搜索热门主题..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="space-y-2">
            {filtered.map((theme) => {
              const isInstalled = installed.includes(theme.name) || installed.includes(theme.name.toLowerCase());
              const isInstalling = installing === theme.name;
              return (
                <div key={theme.name} className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{theme.name}</span>
                      {isInstalled && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">已安装</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{theme.desc}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{theme.git}</p>
                  </div>
                  <button className="btn-primary text-xs flex-shrink-0" onClick={() => installGit(theme.git)}
                    disabled={isInstalled || !!installing}>
                    {isInstalling ? <Loader2 size={14} className="animate-spin" /> :
                     isInstalled ? <CheckCircle2 size={14} /> : <Download size={14} />}
                    <span className="ml-1">{isInstalled ? '已安装' : isInstalling ? '克隆中' : '安装'}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Custom git URL */}
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-2">或输入任意 Git 仓库地址：</p>
            <div className="flex gap-2">
              <input className="input-field flex-1" placeholder="https://github.com/user/hexo-theme-xxx.git"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const url = (e.target as HTMLInputElement).value.trim();
                    if (url) installGit(url);
                  }
                }}
              />
              <button className="btn-primary flex-shrink-0"
                onClick={() => {
                  const input = document.querySelector('.input-field[placeholder*="github"]') as HTMLInputElement;
                  if (input?.value?.trim()) installGit(input.value.trim());
                }}
                disabled={!!installing}>
                {installing ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />}
                <span className="ml-1 hidden sm:inline">克隆</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
