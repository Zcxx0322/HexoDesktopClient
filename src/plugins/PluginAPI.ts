/**
 * Hexo Desktop Client - Plugin API
 *
 * This module defines the plugin architecture for extending the app.
 * Plugins can hook into various parts of the system: editor, preview,
 * hexo commands, git operations, UI extensions.
 *
 * Usage:
 *   const plugin: Plugin = {
 *     manifest: { ... },
 *     activate: async (ctx) => { ... },
 *     deactivate: async () => { ... },
 *   };
 *
 *   pluginManager.register(plugin);
 *   pluginManager.activate('my-plugin-id');
 */

import type { Plugin, PluginManifest, PluginContext, PluginPermission } from '@/types';

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private activePlugins: Set<string> = new Set();
  private context: PluginContext | null = null;

  setContext(context: PluginContext): void {
    this.context = context;
  }

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.manifest.id)) {
      console.warn(`Plugin "${plugin.manifest.id}" already registered, overwriting.`);
    }
    this.plugins.set(plugin.manifest.id, plugin);
  }

  unregister(pluginId: string): void {
    if (this.activePlugins.has(pluginId)) {
      this.deactivate(pluginId);
    }
    this.plugins.delete(pluginId);
  }

  async activate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" not found`);
    }
    if (this.activePlugins.has(pluginId)) {
      console.warn(`Plugin "${pluginId}" is already active`);
      return;
    }
    if (!this.context) {
      throw new Error('PluginContext not set. Call setContext() before activating plugins.');
    }

    // Check permissions
    if (plugin.manifest.permissions.includes('network')) {
      console.log(`Plugin "${pluginId}" requests network access`);
    }

    await plugin.activate(this.context);
    this.activePlugins.add(pluginId);
  }

  async deactivate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    await plugin.deactivate();
    this.activePlugins.delete(pluginId);
  }

  async deactivateAll(): Promise<void> {
    for (const id of this.activePlugins) {
      await this.deactivate(id);
    }
  }

  getActivePlugins(): string[] {
    return Array.from(this.activePlugins);
  }

  getAllPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map((p) => p.manifest);
  }

  isActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }
}

export const pluginManager = new PluginManager();

/**
 * Example plugin: AI Writing Assistant
 *
 * This shows how a plugin would be structured.
 * When the plugin ecosystem is ready (Phase 2+), external
 * packages can implement this interface and be loaded dynamically.
 */
export const exampleAIPlugin: Plugin = {
  manifest: {
    id: 'ai-writing-assistant',
    name: 'AI Writing Assistant',
    version: '1.0.0',
    description: 'AI-powered writing suggestions and content generation',
    author: 'HexoDesktopClient',
    main: 'index.js',
    engines: {
      hexoDesktop: '>=1.0.0',
    },
    permissions: ['editor', 'network'],
    config: {
      apiEndpoint: 'https://api.openai.com/v1',
      model: 'gpt-4',
      maxTokens: 2000,
    },
  },

  activate: async (ctx: PluginContext) => {
    // Get current editor content
    const content = ctx.editor.getContent();
    ctx.ui.showNotification(
      'AI Assistant',
      'AI Writing Assistant activated. Select text to get suggestions.',
      'info'
    );

    // Listen for save events
    ctx.editor.onSave((content: string) => {
      console.log('[AI Plugin] Post saved, length:', content.length);
    });
  },

  deactivate: async () => {
    console.log('[AI Plugin] Deactivated');
  },
};

/**
 * Example plugin: Image Uploader (图床)
 */
export const exampleImageUploaderPlugin: Plugin = {
  manifest: {
    id: 'image-uploader',
    name: 'Image Uploader',
    version: '1.0.0',
    description: 'Auto-upload images to cloud storage (OSS, S3, etc.)',
    author: 'HexoDesktopClient',
    main: 'index.js',
    engines: {
      hexoDesktop: '>=1.0.0',
    },
    permissions: ['filesystem', 'network', 'editor'],
    config: {
      provider: 'oss',
      bucket: '',
      region: '',
      accessKeyId: '',
    },
  },

  activate: async (ctx: PluginContext) => {
    console.log('[Image Uploader] Activated');
    // Would hook into image paste/drop events
    // and auto-upload images to configured cloud storage
  },

  deactivate: async () => {
    console.log('[Image Uploader] Deactivated');
  },
};

/**
 * Plugin Loader for external plugins
 *
 * In the future, this would scan a plugins directory
 * and dynamically require() each plugin package.
 */
export async function loadExternalPlugins(pluginsDir: string): Promise<void> {
  try {
    // In production, this would use fs to scan the plugins directory
    // and dynamic imports to load each plugin
    //
    // const pluginDirs = fs.readdirSync(pluginsDir);
    // for (const dir of pluginDirs) {
    //   const pluginPath = path.join(pluginsDir, dir);
    //   const plugin = await import(pluginPath);
    //   pluginManager.register(plugin.default);
    // }
    console.log('[PluginAPI] External plugin loading from:', pluginsDir);
  } catch (err) {
    console.error('[PluginAPI] Failed to load external plugins:', err);
  }
}
