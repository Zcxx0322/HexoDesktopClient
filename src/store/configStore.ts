import { create } from 'zustand';
import type { AppConfig, EnvStatus, LogEntry } from '@/types';

interface ConfigState {
  config: AppConfig | null;
  envStatus: EnvStatus | null;
  logs: LogEntry[];
  isDark: boolean;

  loadConfig: () => Promise<void>;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
  detectEnv: () => Promise<void>;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  loadLogs: () => Promise<void>;
  toggleDarkMode: () => void;
}

function applyUiConfig(config: AppConfig) {
  const root = document.documentElement;
  root.style.setProperty('--ui-font-size', `${config.uiFontSize || 14}px`);
  root.style.setProperty('--editor-font-size', `${config.editorFontSize || 16}px`);
  root.style.setProperty('--editor-font-family', config.editorFontFamily || 'monospace');
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  envStatus: null,
  logs: [],
  isDark: true,

  loadConfig: async () => {
    try {
      const config = await window.electronAPI.getAppConfig();
      const isDark =
        config.theme === 'dark' ||
        (config.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      applyUiConfig(config as AppConfig);
      set({ config: { ...config, recentProjects: config.recentProjects || [] }, isDark });
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  },

  updateConfig: async (updates) => {
    try {
      const config = await window.electronAPI.setAppConfig(updates);
      const isDark =
        config.theme === 'dark' ||
        (config.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      applyUiConfig(config as AppConfig);
      set({ config: { ...config, recentProjects: config.recentProjects || [] }, isDark });
    } catch (err) {
      console.error('Failed to update config:', err);
    }
  },

  detectEnv: async () => {
    try {
      const envStatus = await window.electronAPI.detectEnvironment();
      set({ envStatus });
    } catch (err) {
      console.error('Failed to detect environment:', err);
    }
  },

  addLog: (log) => {
    set((state) => {
      // Skip if already present (deduplicate by id)
      if (state.logs.some((l) => l.id === log.id)) return state;
      return { logs: [...state.logs.slice(-500), log] };
    });
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  loadLogs: async () => {
    try {
      const raw = await window.electronAPI.getCommandLogs();
      // Deduplicate by id
      const seen = new Set<string>();
      const logs = raw.filter((l: any) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });
      set({ logs });
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  },

  toggleDarkMode: () => {
    const isDark = !get().isDark;
    document.documentElement.classList.toggle('dark', isDark);
    set({ isDark });
    const { config } = get();
    if (config) {
      get().updateConfig({ theme: isDark ? 'dark' : 'light' } as any);
    }
  },
}));
