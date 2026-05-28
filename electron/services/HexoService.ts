import { spawn, ChildProcess, execSync } from 'child_process';
import path from 'path';

interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

function killProcess(proc: ChildProcess | null) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: 'ignore' });
    } else {
      proc.kill('SIGKILL');
    }
  } catch {}
}

export function createHexoService(addLog: (level: string, service: string, msg: string, details?: string) => void) {
  let serverProcess: ChildProcess | null = null;

  async function execNpx(args: string[], cwd: string): Promise<CommandResult> {
    const startTime = Date.now();
    const cmd = `npx hexo ${args.join(' ')}`;
    addLog('info', 'hexo', `$ ${cmd}`, `cwd: ${cwd}`);

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const child = spawn('npx', ['hexo', ...args], {
        cwd,
        shell: process.platform === 'win32',
        env: { ...process.env },
      });

      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        const cleaned = text.replace(/\x1b\[[0-9;]*[mGKHF]|\x1b\][^\x07]*\x07/g, '').trim();
        if (cleaned) addLog('debug', 'hexo', cleaned);
      });

      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        const cleaned = text.replace(/\x1b\[[0-9;]*[mGKHF]|\x1b\][^\x07]*\x07/g, '').trim();
        if (cleaned) addLog('warn', 'hexo', cleaned);
      });

      child.on('error', (err) => {
        stderr += err.message;
        addLog('error', 'hexo', err.message);
      });

      child.on('close', (exitCode) => {
        const result: CommandResult = {
          success: exitCode === 0,
          stdout,
          stderr,
          exitCode: exitCode ?? -1,
          duration: Date.now() - startTime,
        };
        const detail = (stdout || stderr).replace(/\x1b\[[0-9;]*[mGKHF]|\x1b\][^\x07]*\x07/g, '').slice(-300).trim();
        addLog(result.success ? 'info' : 'error', 'hexo', `hexo ${args[0]}: exit ${exitCode} (${result.duration}ms)`, detail || undefined);
        resolve(result);
      });
    });
  }

  return {
    async init(projectPath: string): Promise<CommandResult> {
      return execNpx(['init'], path.dirname(projectPath));
    },

    async generate(projectPath: string): Promise<CommandResult> {
      return execNpx(['generate'], projectPath);
    },

    async startServer(
      projectPath: string,
      port: number
    ): Promise<{ port: number; pid: number }> {
      if (serverProcess) {
        killProcess(serverProcess)
        serverProcess = null;
      }

      // Find an available port
      const actualPort = port;

      addLog('info', 'hexo', `$ npx hexo server -p ${actualPort}`, `cwd: ${projectPath}`);

      return new Promise((resolve, reject) => {
        serverProcess = spawn('npx', ['hexo', 'server', '-p', String(actualPort)], {
          cwd: projectPath,
          shell: process.platform === 'win32',
          env: { ...process.env },
        });

        let started = false;

        serverProcess.stdout?.on('data', (data: Buffer) => {
          const text = data.toString();
          const cleaned = text.replace(/\x1b\[[0-9;]*[mGKHF]|\x1b\][^\x07]*\x07/g, '').trim();
          if (cleaned) addLog('debug', 'hexo', cleaned);
          if (!started && text.includes('Hexo is running')) {
            started = true;
            addLog('info', 'hexo', `Server started on port ${actualPort}`);
            resolve({ port: actualPort, pid: serverProcess!.pid! });
          }
        });

        serverProcess.stderr?.on('data', (data: Buffer) => {
          const text = data.toString();
          const cleaned = text.replace(/\x1b\[[0-9;]*[mGKHF]|\x1b\][^\x07]*\x07/g, '').trim();
          if (cleaned) addLog('warn', 'hexo', cleaned);
          if (!started && text.includes('Hexo is running')) {
            started = true;
            addLog('info', 'hexo', `Server started on port ${actualPort}`);
            resolve({ port: actualPort, pid: serverProcess!.pid! });
          }
        });

        serverProcess.on('error', (err) => {
          if (!started) {
            reject(err);
          }
        });

        serverProcess.on('close', () => {
          serverProcess = null;
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (!started) {
            // Assume it started
            started = true;
            resolve({ port: actualPort, pid: serverProcess?.pid || 0 });
          }
        }, 30000);
      });
    },

    stopServer(): void {
      if (serverProcess) {
        killProcess(serverProcess)
        serverProcess = null;
      }
    },

    async deploy(projectPath: string): Promise<CommandResult> {
      return execNpx(['deploy'], projectPath);
    },

    async clean(projectPath: string): Promise<CommandResult> {
      return execNpx(['clean'], projectPath);
    },
  };
}
