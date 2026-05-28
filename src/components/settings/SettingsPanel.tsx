import { useState, useEffect } from 'react';
import { useConfigStore } from '@/store/configStore';
import { useLocale } from '@/hooks/useLocale';
import { Monitor, Type, Palette, Save, RotateCcw } from 'lucide-react';

export default function SettingsPanel() {
  const { config, updateConfig, loadConfig } = useConfigStore();
  const { t, locale } = useLocale();
  const [localConfig, setLocalConfig] = useState<any>(null);

  useEffect(() => {
    if (config) {
      setLocalConfig({ ...config });
    }
  }, [config]);

  const handleSave = async () => {
    if (localConfig) {
      await updateConfig(localConfig);
    }
  };

  const handleReset = async () => {
    await loadConfig();
  };

  if (!localConfig) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        {t('settings.loading')}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={handleReset}>
              <RotateCcw size={14} />
              {t('settings.reset')}
            </button>
            <button className="btn-primary" onClick={handleSave}>
              <Save size={14} />
              {t('settings.save')}
            </button>
          </div>
        </div>

        {/* {t('settings.appearance')} */}
        <section className="panel p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Palette size={18} />
            {t('settings.appearance')}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label mb-2 block">{t('settings.theme')}</label>
              <select value={localConfig.theme} onChange={(e) => setLocalConfig({ ...localConfig, theme: e.target.value })} className="input-field">
                <option value="dark">{t('settings.themeDark')}</option>
                <option value="light">{t('settings.themeLight')}</option>
                <option value="system">{t('settings.themeSystem')}</option>
              </select>
            </div>
            <div>
              <label className="label mb-2 block">{t('settings.language')}</label>
              <select value={localConfig.locale} onChange={(e) => setLocalConfig({ ...localConfig, locale: e.target.value })} className="input-field">
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>
          </div>
        </section>

        {/* Editor */}
        <section className="panel p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Type size={18} />
            {t('settings.editor')}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label mb-2 block">{t('settings.fontSize')} ({localConfig.editorFontSize}px)</label>
              <input type="range" min="12" max="28" value={localConfig.editorFontSize} onChange={(e) => setLocalConfig({ ...localConfig, editorFontSize: Number(e.target.value) })} className="w-full" />
            </div>
            <div>
              <label className="label mb-2 block">界面字号 ({localConfig.uiFontSize ?? 14}px)</label>
              <input type="range" min="11" max="18" value={localConfig.uiFontSize ?? 14} onChange={(e) => setLocalConfig({ ...localConfig, uiFontSize: Number(e.target.value) })} className="w-full" />
            </div>
            <div>
              <label className="label mb-2 block">{t('settings.font')}</label>
              <select value={localConfig.editorFontFamily} onChange={(e) => setLocalConfig({ ...localConfig, editorFontFamily: e.target.value })} className="input-field">
                <option value="JetBrains Mono, Fira Code, Consolas, monospace">JetBrains Mono</option>
                <option value="Fira Code, Consolas, monospace">Fira Code</option>
                <option value="Consolas, monospace">Consolas</option>
                <option value="system-ui, sans-serif">{t('settings.fontDefault')}</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label mb-2 block">预览效果</label>
              <div className="input-field h-auto py-3 cursor-text select-text"
                style={{ fontSize: `${localConfig.editorFontSize}px`, fontFamily: localConfig.editorFontFamily, lineHeight: 1.8 }}>
                <p className="font-bold">标题预览 Title Preview</p>
                <p>正文文字 The quick brown fox jumps over the lazy dog.</p>
                <p className="text-muted-foreground">1234567890 !@#$%^&*() 中文演示文本</p>
              </div>
            </div>
            <div>
              <label className="label mb-2 block">{t('settings.editMode')}</label>
              <select value={localConfig.defaultEditor} onChange={(e) => setLocalConfig({ ...localConfig, defaultEditor: e.target.value })} className="input-field">
                <option value="wysiwyg">{t('settings.wysiwyg')}</option>
                <option value="markdown">{t('settings.markdown')}</option>
              </select>
            </div>
            <div>
              <label className="label mb-2 block">{t('settings.previewMode')}</label>
              <select value={localConfig.previewMode} onChange={(e) => setLocalConfig({ ...localConfig, previewMode: e.target.value })} className="input-field">
                <option value="side">{t('settings.previewSide')}</option>
                <option value="tab">{t('settings.previewTab')}</option>
              </select>
            </div>
            <div>
              <label className="label mb-2 block">{t('settings.autoSave')} ({(localConfig.autoSaveInterval / 1000).toFixed(0)}{t('settings.seconds')})</label>
              <input type="range" min="1000" max="10000" step="1000" value={localConfig.autoSaveInterval} onChange={(e) => setLocalConfig({ ...localConfig, autoSaveInterval: Number(e.target.value) })} className="w-full" />
            </div>
          </div>
        </section>

        {/* External Tools */}
        <section className="panel p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Monitor size={18} />
            {t('settings.tools')}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="label mb-2 block">{t('settings.nodePath')}</label>
              <input type="text" value={localConfig.nodePath} onChange={(e) => setLocalConfig({ ...localConfig, nodePath: e.target.value })} className="input-field" placeholder={t('settings.autoDetect')} />
            </div>
            <div>
              <label className="label mb-2 block">{t('settings.npmPath')}</label>
              <input type="text" value={localConfig.npmPath} onChange={(e) => setLocalConfig({ ...localConfig, npmPath: e.target.value })} className="input-field" placeholder={t('settings.autoDetect')} />
            </div>
            <div>
              <label className="label mb-2 block">{t('settings.gitPath')}</label>
              <input type="text" value={localConfig.gitPath} onChange={(e) => setLocalConfig({ ...localConfig, gitPath: e.target.value })} className="input-field" placeholder={t('settings.autoDetect')} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('settings.toolsHint')}</p>
        </section>
      </div>
    </div>
  );
}
