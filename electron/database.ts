import path from 'path';
import { app } from 'electron';

let Database: any;
try {
  Database = require('better-sqlite3');
} catch {
  Database = null;
}

interface BlogProject {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  lastOpenedAt: string;
  hexoVersion: string;
  theme: string;
  postCount: number;
  isActive: number;
}

interface DeployConfig {
  id: string;
  projectId: string;
  type: string;
  repo: string;
  branch: string;
  remoteName: string;
  token?: string;
  username?: string;
  email?: string;
  customCommand?: string;
  autoDeploy: number;
}

interface AppConfig {
  id: string;
  hexoPath: string;
  nodePath: string;
  gitPath: string;
  npmPath: string;
  editorFontSize: number;
  editorFontFamily: string;
  theme: string;
  locale: string;
  autoSaveInterval: number;
  defaultEditor: string;
  previewMode: string;
  sidebarWidth: number;
  editorWidth: number;
  logPanelHeight: number;
  recentProjects: string;
}

const DEFAULT_CONFIG: Omit<AppConfig, 'id'> = {
  hexoPath: '',
  nodePath: '',
  gitPath: '',
  npmPath: '',
  editorFontSize: 16,
  editorFontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
  uiFontSize: 14,
  theme: 'dark',
  locale: 'zh-CN',
  autoSaveInterval: 3000,
  defaultEditor: 'wysiwyg',
  previewMode: 'side',
  sidebarWidth: 280,
  editorWidth: -1,
  logPanelHeight: 200,
  recentProjects: '[]',
};

export function getDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'hexo-desktop.db');
  const db = Database ? new Database(dbPath) : createMemoryDb();

  if (Database) {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      lastOpenedAt TEXT NOT NULL DEFAULT (datetime('now')),
      hexoVersion TEXT DEFAULT '',
      theme TEXT DEFAULT 'landscape',
      postCount INTEGER DEFAULT 0,
      isActive INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS deploy_configs (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'github',
      repo TEXT DEFAULT '',
      branch TEXT DEFAULT 'master',
      remoteName TEXT DEFAULT 'origin',
      token TEXT DEFAULT '',
      username TEXT DEFAULT '',
      email TEXT DEFAULT '',
      customCommand TEXT DEFAULT '',
      autoDeploy INTEGER DEFAULT 0,
      commitMessage TEXT DEFAULT 'Update blog via Hexo Desktop Client',
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      hexoPath TEXT DEFAULT '',
      nodePath TEXT DEFAULT '',
      gitPath TEXT DEFAULT '',
      npmPath TEXT DEFAULT '',
      editorFontSize INTEGER DEFAULT 16,
      editorFontFamily TEXT DEFAULT 'JetBrains Mono, Fira Code, Consolas, monospace',
      uiFontSize INTEGER DEFAULT 14,
      theme TEXT DEFAULT 'dark',
      locale TEXT DEFAULT 'zh-CN',
      autoSaveInterval INTEGER DEFAULT 3000,
      defaultEditor TEXT DEFAULT 'wysiwyg',
      previewMode TEXT DEFAULT 'side',
      sidebarWidth INTEGER DEFAULT 280,
      editorWidth INTEGER DEFAULT -1,
      logPanelHeight INTEGER DEFAULT 200,
      recentProjects TEXT DEFAULT '[]'
    );

    INSERT OR IGNORE INTO app_config (id) VALUES ('default');
  `);

  // Migration: add uiFontSize column if missing (for existing installs)
  try {
    db.exec(`ALTER TABLE app_config ADD COLUMN uiFontSize INTEGER DEFAULT 14`);
  } catch { /* column already exists */ }

  return {
    // ---- Projects ----
    createProject(name: string, projectPath: string) {
      // Check if project with this path already exists
      const existing = db.prepare('SELECT * FROM projects WHERE path = ?').get(projectPath) as BlogProject | undefined;
      if (existing) {
        // Update lastOpenedAt and return the existing project
        db.prepare('UPDATE projects SET lastOpenedAt = ? WHERE id = ?').run(
          new Date().toISOString(),
          existing.id
        );
        return this.getProject(existing.id);
      }
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO projects (id, name, path, createdAt, lastOpenedAt) VALUES (?, ?, ?, ?, ?)'
      ).run(id, name, projectPath, now, now);
      return this.getProject(id);
    },

    getProject(id: string) {
      const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as BlogProject | undefined;
      if (!row) return null;
      return { ...row, isActive: Boolean(row.isActive) };
    },

    getAllProjects() {
      const rows = db.prepare('SELECT * FROM projects ORDER BY lastOpenedAt DESC').all() as BlogProject[];
      return rows.map((row) => ({ ...row, isActive: Boolean(row.isActive) }));
    },

    updateProjectLastOpened(id: string) {
      db.prepare('UPDATE projects SET lastOpenedAt = ? WHERE id = ?').run(
        new Date().toISOString(),
        id
      );
    },

    deleteProject(id: string) {
      db.prepare('DELETE FROM deploy_configs WHERE projectId = ?').run(id);
      db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    },

    updateProject(id: string, updates: Partial<BlogProject>) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return;
      const sets = keys.map((k) => `${k} = ?`).join(', ');
      const values = keys.map((k) => {
        const v = (updates as any)[k];
        return typeof v === 'boolean' ? (v ? 1 : 0) : v;
      });
      db.prepare(`UPDATE projects SET ${sets} WHERE id = ?`).run(...values, id);
    },

    // ---- Deploy Config ----
    getDeployConfig(projectId: string) {
      const row = db
        .prepare('SELECT * FROM deploy_configs WHERE projectId = ?')
        .get(projectId) as DeployConfig | undefined;
      if (!row) return null;
      return { ...row, autoDeploy: Boolean(row.autoDeploy) };
    },

    setDeployConfig(config: DeployConfig) {
      const existing = db
        .prepare('SELECT id FROM deploy_configs WHERE projectId = ?')
        .get(config.projectId) as { id: string } | undefined;

      if (existing) {
        const keys = Object.keys(config);
        const sets = keys.map((k) => `${k} = ?`).join(', ');
        const values = keys.map((k) => {
          const v = (config as any)[k];
          return typeof v === 'boolean' ? (v ? 1 : 0) : v;
        });
        db.prepare(`UPDATE deploy_configs SET ${sets} WHERE projectId = ?`).run(
          ...values,
          config.projectId
        );
      } else {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        db.prepare(
          `INSERT INTO deploy_configs (id, projectId, type, repo, branch, remoteName, token, username, email, customCommand, autoDeploy, commitMessage)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id,
          config.projectId,
          config.type,
          config.repo,
          config.branch,
          config.remoteName,
          config.token || '',
          config.username || '',
          config.email || '',
          config.customCommand || '',
          config.autoDeploy ? 1 : 0,
          'Blog update'
        );
      }

      return this.getDeployConfig(config.projectId);
    },

    // ---- App Config ----
    getAppConfig() {
      const row = db.prepare('SELECT * FROM app_config WHERE id = ?').get('default') as AppConfig | undefined;
      if (!row) return { ...DEFAULT_CONFIG, id: 'default', recentProjects: '[]' };

      let recentProjects: string[] = [];
      try {
        recentProjects = JSON.parse(row.recentProjects || '[]');
      } catch {}

      return { ...row, recentProjects };
    },

    setAppConfig(updates: Partial<AppConfig>) {
      const existing = db.prepare('SELECT * FROM app_config WHERE id = ?').get('default') as AppConfig | undefined;
      if (!existing) {
        db.prepare(
          `INSERT INTO app_config (id) VALUES ('default')`
        ).run();
      }

      const data = { ...DEFAULT_CONFIG, ...existing, ...updates };

      if (Array.isArray(data.recentProjects)) {
        data.recentProjects = JSON.stringify(data.recentProjects) as any;
      }

      db.prepare(
        `UPDATE app_config SET
          hexoPath=?, nodePath=?, gitPath=?, npmPath=?,
          editorFontSize=?, editorFontFamily=?, uiFontSize=?, theme=?, locale=?,
          autoSaveInterval=?, defaultEditor=?, previewMode=?,
          sidebarWidth=?, editorWidth=?, logPanelHeight=?, recentProjects=?
        WHERE id='default'`
      ).run(
        data.hexoPath, data.nodePath, data.gitPath, data.npmPath,
        data.editorFontSize, data.editorFontFamily, data.uiFontSize, data.theme, data.locale,
        data.autoSaveInterval, data.defaultEditor, data.previewMode,
        data.sidebarWidth, data.editorWidth, data.logPanelHeight, data.recentProjects
      );

      return this.getAppConfig();
    },

    close() {
      if (Database) db.close();
    },
  };
}

// Fallback in-memory DB if better-sqlite3 is not available
function createMemoryDb() {
  console.warn('better-sqlite3 not available, using in-memory storage (data will not persist)');

  let projects: any[] = [];
  let deployConfigs: any[] = [];
  let appConfig: any = {
    id: 'default',
    hexoPath: '',
    nodePath: '',
    gitPath: '',
    npmPath: '',
    editorFontSize: 16,
    editorFontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
    uiFontSize: 14,
    theme: 'dark',
    locale: 'zh-CN',
    autoSaveInterval: 3000,
    defaultEditor: 'wysiwyg',
    previewMode: 'side',
    sidebarWidth: 280,
    editorWidth: -1,
    logPanelHeight: 200,
    recentProjects: '[]',
  };

  return {
    createProject(name: string, projectPath: string) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const now = new Date().toISOString();
      const project = { id, name, path: projectPath, createdAt: now, lastOpenedAt: now, hexoVersion: '', theme: 'landscape', postCount: 0, isActive: 1 };
      projects.push(project);
      return { ...project, isActive: true };
    },
    getProject(id: string) {
      const p = projects.find((p) => p.id === id);
      return p ? { ...p, isActive: Boolean(p.isActive) } : null;
    },
    getAllProjects() {
      return projects
        .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
        .map((p) => ({ ...p, isActive: Boolean(p.isActive) }));
    },
    updateProjectLastOpened(id: string) {
      const p = projects.find((p) => p.id === id);
      if (p) p.lastOpenedAt = new Date().toISOString();
    },
    deleteProject(id: string) {
      projects = projects.filter((p) => p.id !== id);
      deployConfigs = deployConfigs.filter((d) => d.projectId !== id);
    },
    updateProject(id: string, updates: any) {
      const p = projects.find((p) => p.id === id);
      if (p) Object.assign(p, updates);
    },
    getDeployConfig(projectId: string) {
      const d = deployConfigs.find((d) => d.projectId === projectId);
      return d ? { ...d, autoDeploy: Boolean(d.autoDeploy) } : null;
    },
    setDeployConfig(config: any) {
      const idx = deployConfigs.findIndex((d) => d.projectId === config.projectId);
      if (idx >= 0) {
        deployConfigs[idx] = { ...deployConfigs[idx], ...config };
      } else {
        deployConfigs.push({ ...config, id: Date.now().toString(36) });
      }
      const d = deployConfigs.find((d) => d.projectId === config.projectId);
      return d ? { ...d, autoDeploy: Boolean(d.autoDeploy) } : null;
    },
    getAppConfig() {
      let recent: string[] = [];
      try { recent = JSON.parse(appConfig.recentProjects || '[]'); } catch {}
      return { ...appConfig, recentProjects: recent };
    },
    setAppConfig(updates: any) {
      const data = { ...appConfig, ...updates };
      if (Array.isArray(data.recentProjects)) {
        data.recentProjects = JSON.stringify(data.recentProjects);
      }
      appConfig = data;
      return this.getAppConfig();
    },
    close() {},
  };
}
