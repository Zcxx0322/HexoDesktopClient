import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';

// Since we can't guarantee gray-matter is installed, use a simple frontmatter parser
function parseFrontMatter(content: string): { data: Record<string, any>; content: string } {
  const lines = content.split('\n');
  if (!lines[0] || lines[0].trim() !== '---') {
    return { data: {}, content };
  }

  const endIndex = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (endIndex === -1) {
    return { data: {}, content };
  }

  const fmLines = lines.slice(1, endIndex);
  const bodyContent = lines.slice(endIndex + 1).join('\n');
  const data: Record<string, any> = {};

  let currentKey = '';
  for (const line of fmLines) {
    const match = line.match(/^(\w[\w_-]*):\s*(.*)/);
    if (match) {
      currentKey = match[1];
      const value = match[2].trim();
      if (value === '') {
        data[currentKey] = [];
      } else if (value.startsWith('[') && value.endsWith(']')) {
        try {
          data[currentKey] = JSON.parse(value.replace(/'/g, '"'));
        } catch {
          data[currentKey] = [value];
        }
      } else {
        // Strip surrounding quotes from quoted values
        if (value.length >= 2 &&
            ((value.startsWith('"') && value.endsWith('"')) ||
             (value.startsWith("'") && value.endsWith("'")))) {
          data[currentKey] = value.slice(1, -1);
        } else {
          data[currentKey] = value;
        }
      }
    } else {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') && currentKey) {
        if (!Array.isArray(data[currentKey])) {
          data[currentKey] = [];
        }
        data[currentKey].push(trimmed.replace(/^-\s*/, '').trim());
      }
    }
  }

  return { data, content: bodyContent };
}

function serializeFrontMatter(fm: Record<string, any>, content: string): string {
  const lines: string[] = ['---'];
  for (const [key, value] of Object.entries(fm)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else if (typeof value === 'string' && value.includes(':')) {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  lines.push('');
  lines.push(content);
  return lines.join('\n');
}

export function createFileService(_db: any) {
  const watchers = new Map<string, chokidar.FSWatcher>();

  return {
    scanPosts(projectPath: string) {
      const posts: any[] = [];
      const sourceDir = path.join(projectPath, 'source');

      if (!fs.existsSync(sourceDir)) {
        return posts;
      }

      // Scan _posts
      const postsDir = path.join(sourceDir, '_posts');
      if (fs.existsSync(postsDir)) {
        const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'));
        for (const file of files) {
          const filePath = path.join(postsDir, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const { data, content } = parseFrontMatter(raw);
          const stat = fs.statSync(filePath);
          const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);
          const categories = Array.isArray(data.categories) ? data.categories : (data.categories ? [data.categories] : []);
          posts.push({
            id: filePath,
            projectId: '',
            filePath,
            slug: file.replace(/\.md$/, ''),
            frontMatter: {
              ...data,
              title: data.title || file.replace(/\.md$/, ''),
              date: data.date || '',
              tags,
              categories,
            },
            content,
            isDraft: false,
            createdAt: data.date || stat.birthtime.toISOString(),
            updatedAt: stat.mtime.toISOString(),
            wordCount: content.split(/\s+/).filter(Boolean).length,
          });
        }
      }

      // Scan _drafts
      const draftsDir = path.join(sourceDir, '_drafts');
      if (fs.existsSync(draftsDir)) {
        const files = fs.readdirSync(draftsDir).filter((f) => f.endsWith('.md'));
        for (const file of files) {
          const filePath = path.join(draftsDir, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const { data, content } = parseFrontMatter(raw);
          const stat = fs.statSync(filePath);
          const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);
          const categories = Array.isArray(data.categories) ? data.categories : (data.categories ? [data.categories] : []);
          posts.push({
            id: filePath,
            projectId: '',
            filePath,
            slug: file.replace(/\.md$/, ''),
            frontMatter: {
              ...data,
              title: data.title || file.replace(/\.md$/, ''),
              date: data.date || '',
              tags,
              categories,
            },
            content,
            isDraft: true,
            createdAt: data.date || stat.birthtime.toISOString(),
            updatedAt: stat.mtime.toISOString(),
            wordCount: content.split(/\s+/).filter(Boolean).length,
          });
        }
      }

      return posts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    readPost(filePath: string) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = parseFrontMatter(raw);
      const stat = fs.statSync(filePath);
      const isDraft = filePath.includes('_drafts');

      const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);
      const categories = Array.isArray(data.categories) ? data.categories : (data.categories ? [data.categories] : []);

      return {
        id: filePath,
        projectId: '',
        filePath,
        slug: path.basename(filePath).replace(/\.md$/, ''),
        frontMatter: {
          ...data,
          title: data.title || '',
          date: data.date || '',
          tags,
          categories,
        },
        content,
        isDraft,
        createdAt: data.date || stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString(),
        wordCount: content.split(/\s+/).filter(Boolean).length,
      };
    },

    createPost(
      projectPath: string,
      frontMatter: Record<string, any>,
      isDraft: boolean
    ) {
      const subDir = isDraft ? '_drafts' : '_posts';
      const dir = path.join(projectPath, 'source', subDir);
      fs.mkdirSync(dir, { recursive: true });

      const slug =
        (frontMatter.title || 'untitled')
          .toLowerCase()
          .replace(/[^a-z0-9一-鿿]+/g, '-')
          .replace(/^-|-$/g, '') ||
        `post-${Date.now().toString(36)}`;

      const now = new Date().toISOString();
      const fm: Record<string, any> = {
        ...frontMatter,
        title: frontMatter.title || 'Untitled',
        date: now,
        tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : (frontMatter.tags ? [frontMatter.tags] : []),
        categories: Array.isArray(frontMatter.categories) ? frontMatter.categories : (frontMatter.categories ? [frontMatter.categories] : []),
      };

      const filePath = path.join(dir, `${slug}.md`);
      const content = serializeFrontMatter(fm, frontMatter.content || '');

      fs.writeFileSync(filePath, content, 'utf-8');
      return this.readPost(filePath);
    },

    updatePost(post: any) {
      const content = serializeFrontMatter(post.frontMatter, post.content);
      fs.writeFileSync(post.filePath, content, 'utf-8');
      return this.readPost(post.filePath);
    },

    deletePost(postId: string) {
      if (fs.existsSync(postId)) {
        fs.unlinkSync(postId);
      }
    },

    publishDraft(postId: string) {
      const post = this.readPost(postId);
      if (!post.isDraft) throw new Error('Post is not a draft');

      const postsDir = post.filePath.replace('_drafts', '_posts');
      const newPath = path.join(path.dirname(postsDir), path.basename(post.filePath));
      fs.mkdirSync(path.dirname(newPath), { recursive: true });
      fs.renameSync(post.filePath, newPath);

      // Update frontmatter date
      const raw = fs.readFileSync(newPath, 'utf-8');
      const { data, content } = parseFrontMatter(raw);
      data.date = new Date().toISOString();
      const updated = serializeFrontMatter(data, content);
      fs.writeFileSync(newPath, updated, 'utf-8');

      return { ...post, filePath: newPath, isDraft: false };
    },

    startWatching(projectPath: string, onChange: (filePath: string) => void) {
      this.stopWatching(projectPath);

      const watchDir = path.join(projectPath, 'source');
      if (!fs.existsSync(watchDir)) return;

      const watcher = chokidar.watch(watchDir, {
        ignored: /(^|[\/\\])\../, // dotfiles
        persistent: true,
        ignoreInitial: true,
        depth: 10,
      });

      watcher.on('change', (filePath: string) => onChange(filePath));
      watcher.on('add', (filePath: string) => onChange(filePath));
      watcher.on('unlink', (filePath: string) => onChange(filePath));

      watchers.set(projectPath, watcher);
    },

    stopWatching(projectPath: string) {
      const watcher = watchers.get(projectPath);
      if (watcher) {
        watcher.close();
        watchers.delete(projectPath);
      }
    },
  };
}
