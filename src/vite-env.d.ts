/// <reference types="vite/client" />

interface ElectronAPI {
  createProject: (config: { name: string; path: string }) => Promise<any>;
  openProject: (projectId: string) => Promise<any>;
  deleteProject: (projectId: string) => Promise<void>;
  listProjects: () => Promise<any[]>;
  importProject: (path: string) => Promise<any>;

  createPost: (projectId: string, frontMatter: any, isDraft: boolean) => Promise<any>;
  updatePost: (post: any) => Promise<any>;
  deletePost: (postId: string) => Promise<void>;
  listPosts: (projectId: string) => Promise<any[]>;
  readPost: (filePath: string) => Promise<any>;
  publishDraft: (postId: string) => Promise<any>;

  hexoInit: (projectPath: string) => Promise<any>;
  hexoGenerate: (projectPath: string) => Promise<any>;
  hexoServer: (projectPath: string, port?: number) => Promise<{ port: number; pid: number }>;
  hexoServerStop: () => Promise<void>;
  hexoDeploy: (projectPath: string, config: any) => Promise<any>;
  hexoClean: (projectPath: string) => Promise<any>;

  gitInit: (projectPath: string) => Promise<any>;
  gitAdd: (projectPath: string) => Promise<any>;
  gitCommit: (projectPath: string, message: string) => Promise<any>;
  gitPush: (projectPath: string, remote: string, branch: string) => Promise<any>;
  gitStatus: (projectPath: string) => Promise<any>;
  gitPull: (projectPath: string) => Promise<any>;

  detectEnvironment: () => Promise<any>;
  getCommandLogs: () => Promise<any[]>;

  saveFile: (filePath: string, content: string) => Promise<void>;
  readFile: (filePath: string) => Promise<string>;
  copyImage: (sourcePath: string, projectId: string) => Promise<string>;
  copyImageFromData: (dataUrl: string, fileName: string, projectId: string) => Promise<string>;
  watchProject: (projectPath: string) => Promise<void>;
  unwatchProject: (projectPath: string) => Promise<void>;

  getAppConfig: () => Promise<any>;
  setAppConfig: (config: any) => Promise<any>;
  getDeployConfig: (projectId: string) => Promise<any>;
  setDeployConfig: (config: any) => Promise<any>;

  selectDirectory: () => Promise<string | null>;
  selectFile: (filters?: any[]) => Promise<string | null>;

  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  windowIsMaximized: () => Promise<boolean>;
  openExternal: (url: string) => void;
  readYaml: (filePath: string) => Promise<any>;
  writeYaml: (filePath: string, data: any) => Promise<any>;
  themeList: (projectPath: string) => Promise<string[]>;
  themeInstallNpm: (projectPath: string, packageName: string) => Promise<any>;
  themeInstallGit: (projectPath: string, repoUrl: string, themeName: string) => Promise<any>;
  themeGetPopular: () => Promise<{name: string; npm?: string; git?: string; desc: string}[]>;

  onFileChanged: (callback: (filePath: string) => void) => () => void;
  onCommandLog: (callback: (log: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
