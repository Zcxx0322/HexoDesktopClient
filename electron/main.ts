import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import { IPC_CHANNELS } from './ipcChannels';
import { getDatabase } from './database';
import { createHexoService } from './services/HexoService';
import { createGitService } from './services/GitService';
import { createFileService } from './services/FileService';

// ---- Initialized after addLog is defined ----
let db: ReturnType<typeof getDatabase> = null as any;
let hexoService: ReturnType<typeof createHexoService> = null as any;
let gitService: ReturnType<typeof createGitService> = null as any;
let fileService: ReturnType<typeof createFileService> = null as any;

// ---- Window ----
let mainWindow: BrowserWindow | null = null;
let hexoServerPort = 4000;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'Hexo Desktop Client',
    icon: path.join(__dirname, '../resources/icon.png'),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#0f172a',
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  hexoService?.stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  hexoService?.stopServer();
});

// ---- Log Store ----
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  message: string;
  details?: string;
}

const commandLogs: LogEntry[] = [];

function addLog(level: LogEntry['level'], service: string, message: string, details?: string) {
  const entry: LogEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    details,
  };
  commandLogs.push(entry);
  if (commandLogs.length > 1000) commandLogs.shift();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.EVENT_COMMAND_LOG, entry);
  }
}

// Strip ANSI escape codes from output
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[mGKHF]|\x1b\][^\x07]*\x07/g, '');
}

// ---- Shell Execution Helper ----
interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

function execCommand(
  command: string,
  args: string[],
  cwd: string,
  env?: Record<string, string>
): Promise<CommandResult> {
  const startTime = Date.now();
  addLog('info', 'system', `$ ${command} ${args.join(' ')}`, `cwd: ${cwd}`);

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const child = spawn(command, args, {
      cwd,
      shell: process.platform === 'win32',
      env: { ...process.env, ...env },
    });

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      const cleaned = stripAnsi(text).trim();
      if (cleaned) addLog('debug', 'system', cleaned);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      const cleaned = stripAnsi(text).trim();
      if (cleaned) addLog('warn', 'system', cleaned);
    });

    child.on('error', (err) => {
      stderr += err.message;
      addLog('error', 'system', err.message);
    });

    child.on('close', (exitCode) => {
      const duration = Date.now() - startTime;
      const result: CommandResult = {
        success: exitCode === 0,
        stdout,
        stderr,
        exitCode: exitCode ?? -1,
        duration,
      };
      const detail = stripAnsi(stdout || stderr).slice(-300).trim();
      addLog(
        result.success ? 'info' : 'error',
        'system',
        `Exit code: ${exitCode} (${duration}ms)`,
        detail || undefined
      );
      resolve(result);
    });
  });
}

// ---- IPC Handlers ----
function registerIpcHandlers(): void {
  // Initialize services (addLog must be hoisted/available)
  db = getDatabase();
  hexoService = createHexoService(addLog);
  gitService = createGitService(addLog);
  fileService = createFileService(db);

  // ============ Project ============
  ipcMain.handle(IPC_CHANNELS.PROJECT_LIST, async () => {
    try {
      return db.getAllProjects();
    } catch (err: any) {
      addLog('error', 'system', 'Failed to list projects', err.message);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, async (_e, config: { name: string; path: string }) => {
    const projectPath = path.join(config.path, config.name);
    fs.mkdirSync(projectPath, { recursive: true });
    const project = db.createProject(config.name, projectPath);
    addLog('info', 'system', `Project created: ${config.name} at ${projectPath}`);
    return project;
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_IMPORT, async (_e, projectPath: string) => {
    const pkgPath = path.join(projectPath, 'package.json');
    const configPath = path.join(projectPath, '_config.yml');

    if (!fs.existsSync(pkgPath) || !fs.existsSync(configPath)) {
      throw new Error('Not a valid Hexo project: missing package.json or _config.yml');
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const name = path.basename(projectPath);
    const project = db.createProject(name, projectPath);
    addLog('info', 'system', `Project imported: ${name}`);
    return project;
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_OPEN, async (_e, projectId: string) => {
    const project = db.getProject(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    db.updateProjectLastOpened(projectId);
    addLog('info', 'system', `Project opened: ${project.name}`);
    return project;
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_DELETE, async (_e, projectId: string) => {
    db.deleteProject(projectId);
    addLog('info', 'system', `Project deleted: ${projectId}`);
  });

  // ============ Posts ============
  ipcMain.handle(IPC_CHANNELS.POST_LIST, async (_e, projectId: string) => {
    const project = db.getProject(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    return fileService.scanPosts(project.path);
  });

  ipcMain.handle(IPC_CHANNELS.POST_CREATE, async (_e, projectId: string, frontMatter: any, isDraft: boolean) => {
    const project = db.getProject(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    return fileService.createPost(project.path, frontMatter, isDraft);
  });

  ipcMain.handle(IPC_CHANNELS.POST_READ, async (_e, filePath: string) => {
    return fileService.readPost(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.POST_UPDATE, async (_e, post: any) => {
    return fileService.updatePost(post);
  });

  ipcMain.handle(IPC_CHANNELS.POST_DELETE, async (_e, postId: string) => {
    fileService.deletePost(postId);
  });

  ipcMain.handle(IPC_CHANNELS.POST_PUBLISH_DRAFT, async (_e, postId: string) => {
    return fileService.publishDraft(postId);
  });

  // ============ Hexo ============
  ipcMain.handle(IPC_CHANNELS.HEXO_INIT, async (_e, projectPath: string) => {
    return execCommand('npx', ['hexo', 'init'], projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.HEXO_GENERATE, async (_e, projectPath: string) => {
    return hexoService.generate(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.HEXO_SERVER, async (_e, projectPath: string, port?: number) => {
    hexoService.stopServer();
    return hexoService.startServer(projectPath, port || hexoServerPort);
  });

  ipcMain.handle(IPC_CHANNELS.HEXO_SERVER_STOP, async () => {
    hexoService.stopServer();
  });

  ipcMain.handle(IPC_CHANNELS.HEXO_DEPLOY, async (_e, projectPath: string, config: any) => {
    return hexoService.deploy(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.HEXO_CLEAN, async (_e, projectPath: string) => {
    return execCommand('npx', ['hexo', 'clean'], projectPath);
  });

  // ============ Git ============
  ipcMain.handle(IPC_CHANNELS.GIT_INIT, async (_e, projectPath: string) => {
    return gitService.init(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.GIT_ADD, async (_e, projectPath: string) => {
    return gitService.add(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.GIT_COMMIT, async (_e, projectPath: string, message: string) => {
    return gitService.commit(projectPath, message);
  });

  ipcMain.handle(IPC_CHANNELS.GIT_PUSH, async (_e, projectPath: string, remote: string, branch: string) => {
    return gitService.push(projectPath, remote, branch);
  });

  ipcMain.handle(IPC_CHANNELS.GIT_STATUS, async (_e, projectPath: string) => {
    return gitService.status(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.GIT_PULL, async (_e, projectPath: string) => {
    return gitService.pull(projectPath);
  });

  // ============ Environment ============
  ipcMain.handle(IPC_CHANNELS.ENV_DETECT, async () => {
    const envStatus = {
      node: { installed: false, version: '', path: '' },
      npm: { installed: false, version: '', path: '' },
      git: { installed: false, version: '', path: '' },
      hexo: { installed: false, version: '', path: '' },
    };

    try {
      const nodeResult = await execCommand('node', ['--version'], process.cwd());
      envStatus.node = {
        installed: nodeResult.success,
        version: nodeResult.stdout.trim(),
        path: process.execPath,
      };
    } catch {}

    try {
      const npmResult = await execCommand('npm', ['--version'], process.cwd());
      envStatus.npm = {
        installed: npmResult.success,
        version: npmResult.stdout.trim(),
        path: '',
      };
    } catch {}

    try {
      const gitResult = await execCommand('git', ['--version'], process.cwd());
      envStatus.git = {
        installed: gitResult.success,
        version: gitResult.stdout.trim(),
        path: '',
      };
    } catch {}

    try {
      const hexoResult = await execCommand('npx', ['hexo', '--version'], process.cwd());
      envStatus.hexo = {
        installed: hexoResult.success,
        version: hexoResult.stdout.split('\n')[0]?.trim() || '',
        path: '',
      };
    } catch {}

    return envStatus;
  });

  // ============ File Operations ============
  ipcMain.handle(IPC_CHANNELS.FILE_SAVE, async (_e, filePath: string, content: string) => {
    fs.writeFileSync(filePath, content, 'utf-8');
  });

  ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_e, filePath: string) => {
    return fs.readFileSync(filePath, 'utf-8');
  });

  ipcMain.handle(IPC_CHANNELS.FILE_COPY_IMAGE, async (_e, sourcePath: string, projectId: string) => {
    const project = db.getProject(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const ext = path.extname(sourcePath);
    const basename = path.basename(sourcePath, ext);
    const timestamp = Date.now().toString(36);
    const filename = `${basename}-${timestamp}${ext}`;
    const destDir = path.join(project.path, 'source', 'images');
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, filename);
    fs.copyFileSync(sourcePath, destPath);
    return `/images/${filename}`;
  });

  // Copy image from base64 data (renderer-safe, no file.path required)
  ipcMain.handle(IPC_CHANNELS.FILE_COPY_IMAGE_DATA, async (_e, dataUrl: string, fileName: string, projectId: string) => {
    const project = db.getProject(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const matches = dataUrl.match(/^data:image\/([\w+]+);base64,(.+)$/);
    if (!matches) throw new Error('Invalid data URL');

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const timestamp = Date.now().toString(36);
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
    const filename = `${path.parse(safeName).name}-${timestamp}.${ext}`;
    const destDir = path.join(project.path, 'source', 'images');
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, filename);
    fs.writeFileSync(destPath, Buffer.from(base64Data, 'base64'));
    return `/images/${filename}`;
  });

  ipcMain.handle(IPC_CHANNELS.FILE_WATCH, async (_e, projectPath: string) => {
    fileService.startWatching(projectPath, (filePath: string) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.EVENT_FILE_CHANGED, filePath);
      }
    });
  });

  ipcMain.handle(IPC_CHANNELS.FILE_UNWATCH, async (_e, projectPath: string) => {
    fileService.stopWatching(projectPath);
  });

  // ============ Config ============
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, async () => {
    return db.getAppConfig();
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_SET, async (_e, config: any) => {
    return db.setAppConfig(config);
  });

  ipcMain.handle(IPC_CHANNELS.DEPLOY_CONFIG_GET, async (_e, projectId: string) => {
    return db.getDeployConfig(projectId);
  });

  ipcMain.handle(IPC_CHANNELS.DEPLOY_CONFIG_SET, async (_e, config: any) => {
    return db.setDeployConfig(config);
  });

  // ============ Dialogs ============
  ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY, async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_FILE, async (_e, filters: any[]) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // ============ Logs ============
  ipcMain.handle(IPC_CHANNELS.LOG_GET_ALL, async () => {
    return commandLogs;
  });

  ipcMain.on(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, (_e, url: string) => {
    shell.openExternal(url);
  });

  // ============ Theme Management ============
  ipcMain.handle(IPC_CHANNELS.THEME_LIST, async (_e, projectPath: string) => {
    const themesDir = path.join(projectPath, 'themes');
    if (!fs.existsSync(themesDir)) return [];
    return fs.readdirSync(themesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  });

  ipcMain.handle(IPC_CHANNELS.THEME_INSTALL_NPM, async (_e, projectPath: string, packageName: string) => {
    addLog('info', 'npm', `$ npm install --save ${packageName}`, `cwd: ${projectPath}`);
    return execCommand('npm', ['install', '--save', packageName], projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.THEME_INSTALL_GIT, async (_e, projectPath: string, repoUrl: string, themeName: string) => {
    const dest = path.join(projectPath, 'themes', themeName);
    addLog('info', 'git', `$ git clone ${repoUrl} ${dest}`);
    return execCommand('git', ['clone', repoUrl, dest], projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.THEME_GET_POPULAR, async () => {
    return [
      { name: 'NexT', npm: 'hexo-theme-next', git: 'https://github.com/next-theme/hexo-theme-next', desc: 'Elegant and powerful theme' },
      { name: 'Butterfly', npm: 'hexo-theme-butterfly', git: 'https://github.com/jerryc127/hexo-theme-butterfly', desc: 'A cute and beautiful theme' },
      { name: 'Fluid', npm: 'hexo-theme-fluid', git: 'https://github.com/fluid-dev/hexo-theme-fluid', desc: 'Material design theme' },
      { name: 'Icarus', npm: 'hexo-theme-icarus', git: 'https://github.com/ppoffice/hexo-theme-icarus', desc: 'Modern and responsive' },
      { name: 'Stellar', npm: 'hexo-theme-stellar', git: 'https://github.com/xaoxuu/hexo-theme-stellar', desc: 'Elegant documentation theme' },
      { name: 'Yilia', git: 'https://github.com/litten/hexo-theme-yilia', desc: '简洁优雅' },
      { name: 'Cactus', npm: 'hexo-theme-cactus', git: 'https://github.com/probberechts/hexo-theme-cactus', desc: 'Minimalist theme' },
      { name: 'Volantis', npm: 'hexo-theme-volantis', git: 'https://github.com/volantis-x/hexo-theme-volantis', desc: 'Material design' },
      { name: 'Matery', git: 'https://github.com/blinkfox/hexo-theme-matery', desc: 'Material design + beautiful' },
      { name: 'Pure', git: 'https://github.com/cofess/hexo-theme-pure', desc: 'Pure and clean' },
      { name: 'Melody', npm: 'hexo-theme-melody', git: 'https://github.com/Molunerfinn/hexo-theme-melody', desc: 'Simple and beautiful' },
      { name: 'Shoka', git: 'https://github.com/amehime/hexo-theme-shoka', desc: 'Anime-style theme' },
    ];
  });

  // ============ YAML Config ============
  ipcMain.handle(IPC_CHANNELS.CONFIG_READ_YML, async (_e, filePath: string) => {
    if (!fs.existsSync(filePath)) {
      return { _error: `File not found: ${filePath}` };
    }
    const yaml = require('js-yaml');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return yaml.load(raw) || {};
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_WRITE_YML, async (_e, filePath: string, data: any) => {
    const yaml = require('js-yaml');
    const raw = fs.readFileSync(filePath, 'utf-8');
    // Preserve the file structure by doing a simple key-value merge
    const current = yaml.load(raw) || {};
    const merged = { ...current, ...data };
    fs.writeFileSync(filePath, yaml.dump(merged, { lineWidth: -1, noCompatMode: true, quotingType: '"' }), 'utf-8');
    return { success: true };
  });

  // ============ Window Controls ============
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    mainWindow?.minimize();
  });
  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
    mainWindow?.close();
  });
  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
    return mainWindow?.isMaximized() ?? false;
  });

  // Notify renderer when maximize state changes
  mainWindow?.on('maximize', () => {
    mainWindow?.webContents.send('event:window-maximized', true);
  });
  mainWindow?.on('unmaximize', () => {
    mainWindow?.webContents.send('event:window-maximized', false);
  });
}
