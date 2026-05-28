import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useConfigStore } from '@/store/configStore';
import { useLocale } from '@/hooks/useLocale';
import { Rocket, GitBranch, Globe, Key, Loader2, CheckCircle, AlertCircle, Settings, Save } from 'lucide-react';

interface DeployConfig {
  id: string;
  projectId: string;
  type: 'github' | 'gitee' | 'gitlab' | 'custom';
  repo: string;
  branch: string;
  remoteName: string;
  token?: string;
  username?: string;
  email?: string;
  customCommand?: string;
  autoDeploy: boolean;
}

const PLATFORM_NAMES: Record<string, string> = {
  github: 'GitHub Pages',
  gitee: 'Gitee Pages',
  gitlab: 'GitLab Pages',
  custom: '自定义 Git 服务器',
};

const PLATFORM_PLACEHOLDERS: Record<string, string> = {
  github: 'https://github.com/username/repo.git',
  gitee: 'https://gitee.com/username/repo.git',
  gitlab: 'https://gitlab.com/username/repo.git',
  custom: 'git@your-server.com:repo.git',
};

export default function DeployPanel({ onShowLogPanel }: { onShowLogPanel?: () => void }) {
  const { currentProject } = useProjectStore();
  const { addLog, loadLogs } = useConfigStore();
  const { t } = useLocale();
  const [config, setConfig] = useState<DeployConfig | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployLog, setDeployLog] = useState('');

  useEffect(() => {
    if (currentProject) {
      loadConfig();
      loadLogs();
    }
  }, [currentProject]);

  const loadConfig = async () => {
    if (!currentProject) return;
    const cfg = await window.electronAPI.getDeployConfig(currentProject.id);
    if (cfg) {
      setConfig(cfg);
    } else {
      setConfig({
        id: '',
        projectId: currentProject.id,
        type: 'github',
        repo: '',
        branch: 'master',
        remoteName: 'origin',
        token: '',
        username: '',
        email: '',
        customCommand: '',
        autoDeploy: false,
      });
    }
  };

  const handleSave = async () => {
    if (!config || !currentProject) return;
    setIsLoading(true);
    try {
      const saved = await window.electronAPI.setDeployConfig(config);
      setConfig(saved);
    } catch (err: any) {
      console.error('保存配置失败:', err);
    }
    setIsLoading(false);
  };

  const handleGitInit = async () => {
    if (!currentProject) return;
    try {
      const result = await window.electronAPI.gitInit(currentProject.path);
      setDeployLog((prev) => prev + '\n[Git 初始化] ' + (result.success ? '成功' : result.stderr));
      addLog({ id: '', timestamp: new Date().toISOString(), level: 'info', service: 'git', message: 'Git 初始化成功' });
      loadLogs();
    } catch (err: any) {
      addLog({ id: '', timestamp: new Date().toISOString(), level: 'error', service: 'git', message: 'Git 初始化失败: ' + err.message });
    }
  };

  const handleDeploy = async () => {
    if (!currentProject || !config) return;
    setIsDeploying(true);
    setDeployLog('');
    onShowLogPanel?.();
    let failed = false;

    const log = (msg: string) => {
      setDeployLog((prev) => prev + '\n' + msg);
      addLog({ id: '', timestamp: new Date().toISOString(), level: 'info', service: 'deploy', message: msg });
    };

    try {
      // Step 1: Generate
      log('>>> 生成静态文件...');
      const genResult = await window.electronAPI.hexoGenerate(currentProject.path);
      if (!genResult.success) {
        log('[生成] 失败: ' + (genResult.stderr || '未知错误'));
        failed = true;
      } else {
        log('[生成] 成功');
      }

      if (failed) { setIsDeploying(false); return; }

      // Step 2: Git add
      log('>>> Git 添加文件...');
      const addResult = await window.electronAPI.gitAdd(currentProject.path);
      if (!addResult.success) {
        log('[Git 添加] 失败: ' + (addResult.stderr || '未知错误'));
        failed = true;
      } else {
        log('[Git 添加] 成功');
      }

      if (failed) { setIsDeploying(false); return; }

      // Step 3: Git commit
      log('>>> Git 提交...');
      const commitMsg = `Update blog - ${new Date().toLocaleString('zh-CN')}`;
      const commitResult = await window.electronAPI.gitCommit(currentProject.path, commitMsg);
      if (!commitResult.success) {
        // "nothing to commit" is not a fatal error
        if (commitResult.stderr?.includes('nothing to commit') || commitResult.stdout?.includes('nothing to commit')) {
          log('[Git 提交] 没有新内容需要提交，跳过');
        } else {
          log('[Git 提交] 失败: ' + (commitResult.stderr || '未知错误'));
          failed = true;
        }
      } else {
        log('[Git 提交] 成功');
      }

      if (failed) { setIsDeploying(false); return; }

      // Step 4: Git push
      log('>>> Git 推送...');
      const pushResult = await window.electronAPI.gitPush(currentProject.path, config.remoteName, config.branch);
      if (!pushResult.success) {
        log('[Git 推送] 失败: ' + (pushResult.stderr || '未配置远程仓库'));
        failed = true;
      } else {
        log('[Git 推送] 成功');
      }

      if (failed) { setIsDeploying(false); return; }

      // Step 5: Hexo deploy (optional)
      if (config.type !== 'custom') {
        log('>>> Hexo 部署...');
        const deployResult = await window.electronAPI.hexoDeploy(currentProject.path, config);
        if (!deployResult.success) {
          log('[Hexo 部署] 失败: ' + (deployResult.stderr || '未知错误'));
          failed = true;
        } else {
          log('[Hexo 部署] 成功');
        }
      }

      if (failed) {
        log('!!! 部署失败，请检查上方错误信息');
        setToast({ type: 'err', msg: '部署失败' });
      } else {
        log('✓ 部署成功完成！');
        setToast({ type: 'ok', msg: '部署成功！' });
      }
    } catch (err: any) {
      log('✗ 异常: ' + err.message);
      setToast({ type: 'err', msg: '部署异常' });
    }
    setIsDeploying(false);
    loadLogs();
  };

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <Rocket size={48} className="mx-auto opacity-30" />
          <p>请先打开一个项目以配置部署</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket size={24} />
            发布部署
          </h1>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={handleGitInit}>
              <GitBranch size={14} />
              Git 初始化
            </button>
            <button className="btn-primary" onClick={handleDeploy} disabled={isDeploying}>
              {isDeploying ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
              立即部署
            </button>
          </div>
        </div>

        {toast && (
          <div className={`rounded-md p-3 text-sm font-medium flex items-center gap-2 ${toast.type === 'ok' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
            {toast.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {toast.msg}
            <button className="ml-auto text-xs opacity-50 hover:opacity-100" onClick={() => setToast(null)}>✕</button>
          </div>
        )}

        {config && (
          <section className="panel p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings size={18} />
              部署配置
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label mb-2 block">部署平台</label>
                <select
                  value={config.type}
                  onChange={(e) => setConfig({ ...config, type: e.target.value as any })}
                  className="input-field"
                >
                  <option value="github">GitHub Pages</option>
                  <option value="gitee">Gitee Pages</option>
                  <option value="gitlab">GitLab Pages</option>
                  <option value="custom">自定义</option>
                </select>
              </div>

              <div>
                <label className="label mb-2 block">分支</label>
                <input
                  type="text"
                  value={config.branch}
                  onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                  className="input-field"
                  placeholder="master"
                />
              </div>
            </div>

            <div>
              <label className="label mb-2 block">仓库地址</label>
              <input
                type="text"
                value={config.repo}
                onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                className="input-field font-mono text-sm"
                placeholder={PLATFORM_PLACEHOLDERS[config.type]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label mb-2 block">用户名</label>
                <input
                  type="text"
                  value={config.username || ''}
                  onChange={(e) => setConfig({ ...config, username: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label mb-2 block">邮箱</label>
                <input
                  type="email"
                  value={config.email || ''}
                  onChange={(e) => setConfig({ ...config, email: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button className="btn-primary" onClick={handleSave} disabled={isLoading}>
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                保存配置
              </button>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
