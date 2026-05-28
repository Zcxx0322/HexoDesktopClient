import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './ipcChannels';

const api = {
  // Project
  createProject: (config: { name: string; path: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CREATE, config),
  openProject: (projectId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECT_OPEN, projectId),
  deleteProject: (projectId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECT_DELETE, projectId),
  listProjects: () =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECT_LIST),
  importProject: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECT_IMPORT, path),

  // Posts
  createPost: (projectId: string, frontMatter: any, isDraft: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.POST_CREATE, projectId, frontMatter, isDraft),
  updatePost: (post: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.POST_UPDATE, post),
  deletePost: (postId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.POST_DELETE, postId),
  listPosts: (projectId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.POST_LIST, projectId),
  readPost: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.POST_READ, filePath),
  publishDraft: (postId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.POST_PUBLISH_DRAFT, postId),

  // Hexo
  hexoInit: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.HEXO_INIT, projectPath),
  hexoGenerate: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.HEXO_GENERATE, projectPath),
  hexoServer: (projectPath: string, port?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.HEXO_SERVER, projectPath, port),
  hexoServerStop: () =>
    ipcRenderer.invoke(IPC_CHANNELS.HEXO_SERVER_STOP),
  hexoDeploy: (projectPath: string, config: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.HEXO_DEPLOY, projectPath, config),
  hexoClean: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.HEXO_CLEAN, projectPath),

  // Git
  gitInit: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_INIT, projectPath),
  gitAdd: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_ADD, projectPath),
  gitCommit: (projectPath: string, message: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, projectPath, message),
  gitPush: (projectPath: string, remote: string, branch: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_PUSH, projectPath, remote, branch),
  gitStatus: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_STATUS, projectPath),
  gitPull: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_PULL, projectPath),

  // Environment
  detectEnvironment: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ENV_DETECT),

  // File operations
  saveFile: (filePath: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE, filePath, content),
  readFile: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, filePath),
  copyImage: (sourcePath: string, projectId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_COPY_IMAGE, sourcePath, projectId),
  copyImageFromData: (dataUrl: string, fileName: string, projectId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_COPY_IMAGE_DATA, dataUrl, fileName, projectId),
  watchProject: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_WATCH, projectPath),
  unwatchProject: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_UNWATCH, projectPath),

  // Config
  getAppConfig: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET),
  setAppConfig: (config: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SET, config),
  getDeployConfig: (projectId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DEPLOY_CONFIG_GET, projectId),
  setDeployConfig: (config: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.DEPLOY_CONFIG_SET, config),

  // Dialogs
  selectDirectory: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY),
  selectFile: (filters?: any[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_FILE, filters),

  // Logs
  getCommandLogs: () =>
    ipcRenderer.invoke(IPC_CHANNELS.LOG_GET_ALL),

  // Window controls
  windowMinimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
  windowMaximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
  windowClose: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
  windowIsMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
  openExternal: (url: string) => ipcRenderer.send(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, url),

  // YAML config
  readYaml: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_READ_YML, filePath),
  writeYaml: (filePath: string, data: any) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_WRITE_YML, filePath, data),

  // Theme management
  themeList: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.THEME_LIST, projectPath),
  themeInstallNpm: (projectPath: string, packageName: string) => ipcRenderer.invoke(IPC_CHANNELS.THEME_INSTALL_NPM, projectPath, packageName),
  themeInstallGit: (projectPath: string, repoUrl: string, themeName: string) => ipcRenderer.invoke(IPC_CHANNELS.THEME_INSTALL_GIT, projectPath, repoUrl, themeName),
  themeGetPopular: () => ipcRenderer.invoke(IPC_CHANNELS.THEME_GET_POPULAR),

  // Event listeners
  onFileChanged: (callback: (filePath: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on(IPC_CHANNELS.EVENT_FILE_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_FILE_CHANGED, handler);
  },

  onCommandLog: (callback: (log: any) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, log: any) => callback(log);
    ipcRenderer.on(IPC_CHANNELS.EVENT_COMMAND_LOG, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_COMMAND_LOG, handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
