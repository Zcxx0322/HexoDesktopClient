// ============ Blog Project ============
export interface BlogProject {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  lastOpenedAt: string;
  hexoVersion: string;
  theme: string;
  postCount: number;
  isActive: boolean;
}

// ============ Post / Draft ============
export interface PostFrontMatter {
  title: string;
  date: string;
  tags: string[];
  categories: string[];
  updated?: string;
  description?: string;
  cover?: string;
  published?: boolean;
  [key: string]: unknown;
}

export interface Post {
  id: string;
  projectId: string;
  filePath: string;
  slug: string;
  frontMatter: PostFrontMatter;
  content: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
}

// ============ Deploy Config ============
export interface DeployConfig {
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

// ============ App Config ============
export interface AppConfig {
  id: string;
  hexoPath: string;
  nodePath: string;
  gitPath: string;
  npmPath: string;
  editorFontSize: number;
  editorFontFamily: string;
  uiFontSize: number;
  theme: 'light' | 'dark' | 'system';
  locale: 'zh-CN' | 'en-US';
  autoSaveInterval: number;
  defaultEditor: 'wysiwyg' | 'markdown';
  previewMode: 'side' | 'tab';
  sidebarWidth: number;
  editorWidth: number;
  logPanelHeight: number;
  recentProjects: string[];
}

// ============ Environment Detection ============
export interface EnvStatus {
  node: { installed: boolean; version: string; path: string };
  npm: { installed: boolean; version: string; path: string };
  git: { installed: boolean; version: string; path: string };
  hexo: { installed: boolean; version: string; path: string };
}

// ============ Command Execution ============
export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export interface CommandLog {
  id: string;
  command: string;
  cwd: string;
  result: CommandResult;
  timestamp: string;
  service: 'hexo' | 'git' | 'system' | 'npm';
}

// ============ IPC Channels ============
export interface IpcApi {
  // Project
  createProject: (config: CreateProjectConfig) => Promise<CommandResult>;
  openProject: (projectId: string) => Promise<BlogProject>;
  deleteProject: (projectId: string) => Promise<void>;
  listProjects: () => Promise<BlogProject[]>;
  importProject: (path: string) => Promise<BlogProject>;

  // Posts
  createPost: (projectId: string, frontMatter: PostFrontMatter, isDraft: boolean) => Promise<Post>;
  updatePost: (post: Post) => Promise<Post>;
  deletePost: (postId: string) => Promise<void>;
  listPosts: (projectId: string) => Promise<Post[]>;
  readPost: (filePath: string) => Promise<Post>;
  publishDraft: (postId: string) => Promise<Post>;

  // Hexo commands
  hexoInit: (projectPath: string) => Promise<CommandResult>;
  hexoGenerate: (projectPath: string) => Promise<CommandResult>;
  hexoServer: (projectPath: string, port?: number) => Promise<{ port: number; pid: number }>;
  hexoServerStop: () => Promise<void>;
  hexoDeploy: (projectPath: string, config: DeployConfig) => Promise<CommandResult>;
  hexoClean: (projectPath: string) => Promise<CommandResult>;

  // Git
  gitInit: (projectPath: string) => Promise<CommandResult>;
  gitAdd: (projectPath: string) => Promise<CommandResult>;
  gitCommit: (projectPath: string, message: string) => Promise<CommandResult>;
  gitPush: (projectPath: string, remote: string, branch: string) => Promise<CommandResult>;
  gitStatus: (projectPath: string) => Promise<CommandResult>;
  gitPull: (projectPath: string) => Promise<CommandResult>;

  // Environment
  detectEnvironment: () => Promise<EnvStatus>;
  getCommandLogs: () => Promise<CommandLog[]>;

  // File operations
  saveFile: (filePath: string, content: string) => Promise<void>;
  readFile: (filePath: string) => Promise<string>;
  copyImage: (sourcePath: string, projectId: string) => Promise<string>;
  watchProject: (projectPath: string) => Promise<void>;
  unwatchProject: (projectPath: string) => Promise<void>;

  // Database
  getAppConfig: () => Promise<AppConfig>;
  setAppConfig: (config: Partial<AppConfig>) => Promise<AppConfig>;
  getDeployConfig: (projectId: string) => Promise<DeployConfig | null>;
  setDeployConfig: (config: DeployConfig) => Promise<DeployConfig>;

  // Dialog
  selectDirectory: () => Promise<string | null>;
  selectFile: (filters: FileFilter[]) => Promise<string | null>;

  // Events
  onFileChanged: (callback: (filePath: string) => void) => () => void;
  onCommandLog: (callback: (log: CommandLog) => void) => () => void;
}

export interface CreateProjectConfig {
  name: string;
  path: string;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

// ============ Plugin System ============
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  engines: {
    hexoDesktop: string;
  };
  permissions: PluginPermission[];
  config?: Record<string, unknown>;
}

export type PluginPermission =
  | 'filesystem'
  | 'hexo'
  | 'git'
  | 'network'
  | 'editor'
  | 'preview'
  | 'settings';

export interface PluginContext {
  app: {
    getConfig: () => AppConfig;
    setConfig: (config: Partial<AppConfig>) => Promise<void>;
    getCurrentProject: () => BlogProject | null;
  };
  editor: {
    getContent: () => string;
    setContent: (content: string) => void;
    getSelection: () => string;
    insertText: (text: string) => void;
    onSave: (callback: (content: string) => void) => () => void;
  };
  hexo: {
    executeCommand: (command: string, args: string[]) => Promise<CommandResult>;
    getPosts: () => Post[];
  };
  git: {
    executeCommand: (args: string[]) => Promise<CommandResult>;
  };
  ui: {
    showNotification: (title: string, message: string, type: 'info' | 'success' | 'error') => void;
    showDialog: (options: DialogOptions) => Promise<boolean>;
  };
}

export interface DialogOptions {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  buttons: string[];
}

export interface Plugin {
  manifest: PluginManifest;
  activate: (context: PluginContext) => Promise<void>;
  deactivate: () => Promise<void>;
}

// ============ Window State ============
export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

// ============ Log Entry ============
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  message: string;
  details?: string;
}
