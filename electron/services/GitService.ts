import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';

interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export function createGitService(addLog: (level: string, service: string, msg: string, details?: string) => void) {
  function getGit(projectPath: string): SimpleGit {
    return simpleGit(projectPath);
  }

  async function wrapGit(opName: string, operation: (git: SimpleGit) => Promise<any>): Promise<CommandResult> {
    const startTime = Date.now();
    addLog('info', 'git', `$ git ${opName}`);
    try {
      const result = await operation((null as any) as SimpleGit);
      const stdout = typeof result === 'string' ? result : JSON.stringify(result);
      addLog('info', 'git', `git ${opName}: OK (${Date.now() - startTime}ms)`, stdout.slice(0, 300));
      return { success: true, stdout, stderr: '', exitCode: 0, duration: Date.now() - startTime };
    } catch (err: any) {
      const msg = err.message || String(err);
      addLog('error', 'git', `git ${opName}: FAILED`, msg);
      return { success: false, stdout: '', stderr: msg, exitCode: -1, duration: Date.now() - startTime };
    }
  }

  return {
    async init(projectPath: string): Promise<CommandResult> {
      return wrapGit('init', async () => { const git = getGit(projectPath); return git.init(); });
    },
    async add(projectPath: string): Promise<CommandResult> {
      return wrapGit('add .', async () => { const git = getGit(projectPath); return git.add('.'); });
    },
    async commit(projectPath: string, message: string): Promise<CommandResult> {
      return wrapGit(`commit -m "${message}"`, async () => { const git = getGit(projectPath); return git.commit(message); });
    },
    async push(projectPath: string, remote: string, branch: string): Promise<CommandResult> {
      return wrapGit(`push ${remote} ${branch}`, async () => {
        const git = getGit(projectPath);
        const remotes = await git.getRemotes(true);
        if (!remotes.some((r) => r.name === remote)) {
          return Promise.reject(new Error(`Remote "${remote}" not found. Configure deploy settings first.`));
        }
        return git.push(remote, branch);
      });
    },
    async status(projectPath: string): Promise<CommandResult> {
      return wrapGit('status', async () => { const git = getGit(projectPath); return git.status(); });
    },
    async pull(projectPath: string): Promise<CommandResult> {
      return wrapGit('pull', async () => { const git = getGit(projectPath); return git.pull(); });
    },

    async addRemote(
      projectPath: string,
      name: string,
      url: string
    ): Promise<CommandResult> {
      return wrapGit(async () => {
        const git = getGit(projectPath);
        return git.addRemote(name, url);
      });
    },

    async setRemote(
      projectPath: string,
      name: string,
      url: string
    ): Promise<CommandResult> {
      return wrapGit(async () => {
        const git = getGit(projectPath);
        // Remove existing then add
        const remotes = await git.getRemotes();
        if (remotes.some((r) => r.name === name)) {
          await git.removeRemote(name);
        }
        return git.addRemote(name, url);
      });
    },
  };
}
