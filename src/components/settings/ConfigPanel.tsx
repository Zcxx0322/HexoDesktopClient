import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Save, FileCode, Palette, Loader2, ChevronDown, ChevronRight, RefreshCw, Download } from 'lucide-react';
import ThemeInstaller from './ThemeInstaller';

type Tab = 'site' | 'theme';

// ---- field helpers ----
function F({ label, value, onChange, type = 'text', placeholder }: { label: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      {type === 'textarea' ? (
        <textarea className="input-field h-20 resize-y font-mono text-sm" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      ) : type === 'number' ? (
        <input type="number" className="input-field font-mono text-sm" value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} />
      ) : type === 'bool' ? (
        <select className="input-field" value={String(value)} onChange={(e) => onChange(e.target.value === 'true')}>
          <option value="true">true</option><option value="false">false</option>
        </select>
      ) : (
        <input type="text" className="input-field font-mono text-sm" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

// Collapsible nested section
function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-md">
      <div className="flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-muted/30 rounded-t-md" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-sm font-medium">{title}</span>
      </div>
      {open && <div className="px-3 pb-3 space-y-2 border-t border-border">{children}</div>}
    </div>
  );
}

// ---- main component ----
export default function ConfigPanel() {
  const { currentProject } = useProjectStore();
  const [tab, setTab] = useState<Tab>('site');
  const [siteConfig, setSiteConfig] = useState<Record<string, any> | null>(null);
  const [themeConfig, setThemeConfig] = useState<Record<string, any> | null>(null);
  const [themeName, setThemeName] = useState('');
  const [installedThemes, setInstalledThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showInstaller, setShowInstaller] = useState(false);

  const base = currentProject?.path || '';

  useEffect(() => { if (currentProject) loadSite(); }, [currentProject]);

  const loadSite = async () => {
    if (!base) return;
    setLoading(true);
    try {
      const site = await window.electronAPI.readYaml(`${base}/_config.yml`);
      if (site._error) { console.warn(site._error); setLoading(false); return; }
      setSiteConfig(site);
      // Detect actually installed themes
      const installed = await window.electronAPI.themeList(base);
      setInstalledThemes(installed);
      const t = site?.theme || installed[0] || '';
      if (t) {
        setThemeName(t);
        loadTheme(t);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadTheme = async (t: string) => {
    setLoading(true);
    try {
      const cfg = await window.electronAPI.readYaml(`${base}/themes/${t}/_config.yml`);
      if (cfg._error) { setThemeConfig(null); setLoading(false); return; }
      setThemeConfig(cfg);
    } catch { setThemeConfig(null); }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === 'site' && siteConfig) {
        await window.electronAPI.writeYaml(`${base}/_config.yml`, siteConfig);
      } else if (tab === 'theme' && themeConfig && themeName) {
        await window.electronAPI.writeYaml(`${base}/themes/${themeName}/_config.yml`, themeConfig);
      }
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const set = (key: string, value: any) => {
    setSiteConfig((prev) => prev ? { ...prev, [key]: value } : null);
  };

  const setNested = (parent: string, key: string, value: any) => {
    setSiteConfig((prev) => prev ? { ...prev, [parent]: { ...(prev[parent] || {}), [key]: value } } : null);
  };

  const setT = (key: string, value: any) => {
    setThemeConfig((prev) => prev ? { ...prev, [key]: value } : null);
  };

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2"><FileCode size={48} className="mx-auto opacity-30" /><p>请先打开一个项目</p></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileCode size={24} /> Hexo 配置</h1>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-xs" onClick={loadSite}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || loading}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? '已保存' : <><Save size={14} /> 保存</>}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          <button className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'site' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab('site')}><FileCode size={14} className="inline mr-1" />站点配置 (_config.yml)</button>
          <button className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'theme' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab('theme')}><Palette size={14} className="inline mr-1" />主题配置{themeName ? ` (${themeName})` : ''}</button>
        </div>

        {loading && <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 size={24} className="animate-spin mr-2" /> 加载中...</div>}

        {/* ---- SITE CONFIG ---- */}
        {!loading && tab === 'site' && siteConfig && (
          <div className="space-y-4">
            <Section title="站点信息" defaultOpen>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <F label="网站标题" value={siteConfig.title} onChange={(v) => set('title', v)} />
                <F label="副标题" value={siteConfig.subtitle} onChange={(v) => set('subtitle', v)} />
                <F label="描述" value={siteConfig.description} onChange={(v) => set('description', v)} type="textarea" />
                <F label="作者" value={siteConfig.author} onChange={(v) => set('author', v)} />
                <F label="语言" value={siteConfig.language} onChange={(v) => set('language', v)} placeholder="zh-CN" />
                <F label="时区" value={siteConfig.timezone} onChange={(v) => set('timezone', v)} placeholder="Asia/Shanghai" />
              </div>
            </Section>

            <Section title="URL 设置">
              <div className="grid grid-cols-2 gap-3 pt-2">
                <F label="网站 URL" value={siteConfig.url} onChange={(v) => set('url', v)} placeholder="https://example.com" />
                <F label="根路径" value={siteConfig.root} onChange={(v) => set('root', v)} placeholder="/" />
                <F label="文章链接格式" value={siteConfig.permalink} onChange={(v) => set('permalink', v)} placeholder=":year/:month/:day/:title/" />
                <div /><div />
                <F label="外部链接 - 启用" value={siteConfig.external_link?.enable} onChange={(v) => setNested('external_link', 'enable', v)} type="bool" />
                <F label="外部链接 - 字段" value={siteConfig.external_link?.field} onChange={(v) => setNested('external_link', 'field', v)} placeholder="site" />
                <F label="美化 URL - 尾随 index.html" value={siteConfig.pretty_urls?.trailing_index} onChange={(v) => setNested('pretty_urls', 'trailing_index', v)} type="bool" />
                <F label="美化 URL - 尾随 .html" value={siteConfig.pretty_urls?.trailing_html} onChange={(v) => setNested('pretty_urls', 'trailing_html', v)} type="bool" />
              </div>
            </Section>

            <Section title="目录设置">
              <div className="grid grid-cols-2 gap-3 pt-2">
                <F label="源文件目录" value={siteConfig.source_dir} onChange={(v) => set('source_dir', v)} placeholder="source" />
                <F label="发布目录" value={siteConfig.public_dir} onChange={(v) => set('public_dir', v)} placeholder="public" />
                <F label="标签目录" value={siteConfig.tag_dir} onChange={(v) => set('tag_dir', v)} placeholder="tags" />
                <F label="归档目录" value={siteConfig.archive_dir} onChange={(v) => set('archive_dir', v)} placeholder="archives" />
                <F label="分类目录" value={siteConfig.category_dir} onChange={(v) => set('category_dir', v)} placeholder="categories" />
                <F label="代码目录" value={siteConfig.code_dir} onChange={(v) => set('code_dir', v)} placeholder="downloads/code" />
                <F label="i18n 目录" value={siteConfig.i18n_dir} onChange={(v) => set('i18n_dir', v)} placeholder=":lang" />
              </div>
            </Section>

            <Section title="写作设置">
              <div className="grid grid-cols-2 gap-3 pt-2">
                <F label="新文章文件名" value={siteConfig.new_post_name} onChange={(v) => set('new_post_name', v)} placeholder=":title.md" />
                <F label="默认布局" value={siteConfig.default_layout} onChange={(v) => set('default_layout', v)} placeholder="post" />
                <F label="自动空格" value={siteConfig.auto_spacing} onChange={(v) => set('auto_spacing', v)} type="bool" />
                <F label="标题大小写" value={siteConfig.titlecase} onChange={(v) => set('titlecase', v)} type="bool" />
                <F label="文件名小写" value={siteConfig.filename_case} onChange={(v) => set('filename_case', v)} type="number" />
                <F label="渲染草稿" value={siteConfig.render_drafts} onChange={(v) => set('render_drafts', v)} type="bool" />
                <F label="文章资源文件夹" value={siteConfig.post_asset_folder} onChange={(v) => set('post_asset_folder', v)} type="bool" />
                <F label="相对链接" value={siteConfig.relative_link} onChange={(v) => set('relative_link', v)} type="bool" />
                <F label="显示未来文章" value={siteConfig.future} onChange={(v) => set('future', v)} type="bool" />
              </div>
            </Section>

            <Section title="首页设置">
              <div className="grid grid-cols-2 gap-3 pt-2">
                <F label="每页文章数" value={siteConfig.per_page ?? siteConfig.index_generator?.per_page} onChange={(v) => { set('per_page', v); setNested('index_generator', 'per_page', v); }} type="number" />
                <F label="分页目录" value={siteConfig.pagination_dir} onChange={(v) => set('pagination_dir', v)} placeholder="page" />
                <F label="首页路径" value={siteConfig.index_generator?.path} onChange={(v) => setNested('index_generator', 'path', v)} placeholder="" />
                <F label="排序方式" value={siteConfig.index_generator?.order_by} onChange={(v) => setNested('index_generator', 'order_by', v)} placeholder="-date" />
              </div>
            </Section>

            <Section title="日期与格式">
              <div className="grid grid-cols-2 gap-3 pt-2">
                <F label="日期格式" value={siteConfig.date_format} onChange={(v) => set('date_format', v)} placeholder="YYYY-MM-DD" />
                <F label="时间格式" value={siteConfig.time_format} onChange={(v) => set('time_format', v)} placeholder="HH:mm:ss" />
                <F label="更新选项" value={siteConfig.updated_option} onChange={(v) => set('updated_option', v)} placeholder="mtime" />
              </div>
            </Section>

            <Section title="分类与标签">
              <div className="grid grid-cols-2 gap-3 pt-2">
                <F label="默认分类" value={siteConfig.default_category} onChange={(v) => set('default_category', v)} placeholder="uncategorized" />
              </div>
            </Section>

            <Section title="代码高亮">
              <div className="grid grid-cols-2 gap-3 pt-2">
                <F label="高亮引擎" value={siteConfig.syntax_highlighter} onChange={(v) => set('syntax_highlighter', v)} placeholder="highlight.js" />
                <F label="highlight - 启用" value={siteConfig.highlight?.enable} onChange={(v) => setNested('highlight', 'enable', v)} type="bool" />
                <F label="highlight - 行号" value={siteConfig.highlight?.line_number} onChange={(v) => setNested('highlight', 'line_number', v)} type="bool" />
                <F label="highlight - 自动检测" value={siteConfig.highlight?.auto_detect} onChange={(v) => setNested('highlight', 'auto_detect', v)} type="bool" />
                <F label="highlight - tab 替换" value={siteConfig.highlight?.tab_replace} onChange={(v) => setNested('highlight', 'tab_replace', v)} />
              </div>
            </Section>

            <Section title="部署设置 (deploy)">
              <div className="grid grid-cols-2 gap-3 pt-2">
                <F label="部署类型" value={siteConfig.deploy?.type} onChange={(v) => setNested('deploy', 'type', v)} placeholder="git" />
                <F label="仓库地址" value={siteConfig.deploy?.repo} onChange={(v) => setNested('deploy', 'repo', v)} placeholder="git@github.com:user/repo.git" />
                <F label="分支" value={siteConfig.deploy?.branch} onChange={(v) => setNested('deploy', 'branch', v)} placeholder="main" />
                <F label="提交信息" value={siteConfig.deploy?.message} onChange={(v) => setNested('deploy', 'message', v)} placeholder="Site updated" />
              </div>
            </Section>

            <Section title="扩展">
              <div className="grid grid-cols-2 gap-3 pt-2">
                <F label="主题名称" value={siteConfig.theme} onChange={(v) => { set('theme', v); setThemeName(v); }} placeholder="landscape" />
              </div>
            </Section>
          </div>
        )}

        {/* ---- THEME CONFIG ---- */}
        {!loading && tab === 'theme' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
              <Palette size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">主题:</span>
              <select className="input-field w-28 h-9 text-sm" value={themeName}
                onChange={async (e) => {
                  const name = e.target.value;
                  setThemeName(name);
                  set('theme', name);
                  loadTheme(name);
                  // Auto-save the theme change
                  if (siteConfig) {
                    await window.electronAPI.writeYaml(`${base}/_config.yml`, { ...siteConfig, theme: name });
                  }
                }}>
                {installedThemes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {installedThemes.length === 0 && (
                  <option value="">无主题</option>
                )}
              </select>
              <span className="text-xs text-muted-foreground">({installedThemes.length} 个已安装)</span>
              <div className="flex-1" />
              <button className="btn-primary text-xs" onClick={() => setShowInstaller(true)}>
                <Download size={14} /> 安装主题
              </button>
            </div>
            {!themeConfig && (
              <button className="btn-primary text-sm" onClick={() => siteConfig?.theme && loadTheme(siteConfig.theme || themeName)}>
                <RefreshCw size={14} /> 加载主题配置
              </button>
            )}
            {themeConfig && Object.keys(themeConfig).length > 0 ? (
              Object.entries(themeConfig).map(([key, value]) => {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                  return (
                    <Section key={key} title={key}>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {Object.entries(value as Record<string, any>).map(([k, v]) => {
                          if (typeof v === 'object') return null;
                          return (
                            <F key={k} label={k} value={v} onChange={(val) => {
                              setThemeConfig((prev) => prev ? { ...prev, [key]: { ...(prev[key] || {}), [k]: val } } : null);
                            }} type={typeof v === 'boolean' ? 'bool' : typeof v === 'number' ? 'number' : 'text'} />
                          );
                        })}
                      </div>
                    </Section>
                  );
                }
                if (Array.isArray(value) || typeof value === 'object') return null;
                return (
                  <div key={key} className="grid grid-cols-2 gap-3">
                    <F label={key} value={value} onChange={(v) => setT(key, v)} type={typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? 'number' : 'text'} />
                  </div>
                );
              })
            ) : themeConfig ? (
              <p className="text-muted-foreground text-sm py-8 text-center">主题配置文件为空</p>
            ) : null}
          </div>
        )}

        {showInstaller && (
          <ThemeInstaller
            onClose={() => setShowInstaller(false)}
            onInstalled={async (name) => {
              setThemeName(name);
              setShowInstaller(false);
              // Refresh theme list and config
              const list = await window.electronAPI.themeList(base);
              setInstalledThemes(list);
              set('theme', name);
              loadTheme(name);
            }}
          />
        )}
      </div>
    </div>
  );
}
