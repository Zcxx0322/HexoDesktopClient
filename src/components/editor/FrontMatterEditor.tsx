import { useEditorStore } from '@/store/editorStore';
import { useLocale } from '@/hooks/useLocale';
import { Tag, FolderOpen, Calendar, FileText, Clock } from 'lucide-react';
import { useState } from 'react';

export default function FrontMatterEditor() {
  const { currentPost, updateFrontMatter } = useEditorStore();
  const { t } = useLocale();
  const [tagInput, setTagInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');

  if (!currentPost) return null;

  const fm = currentPost.frontMatter;
  const safeTags: string[] = Array.isArray(fm.tags) ? fm.tags : [];
  const safeCategories: string[] = Array.isArray(fm.categories) ? fm.categories : [];

  const handleTitleChange = (title: string) => {
    const slug = title.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '');
    updateFrontMatter({ title, slug } as any);
  };

  const now = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    updateFrontMatter({ date: new Date().toISOString() });
  };

  const fmtDate = (d: string) => {
    try { const dt = new Date(d); if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 16); } catch {}
    return String(d).slice(0, 16);
  };

  const addTag = () => { const t = tagInput.trim(); if (t && !safeTags.includes(t)) updateFrontMatter({ tags: [...safeTags, t] }); setTagInput(''); };
  const removeTag = (tag: string) => updateFrontMatter({ tags: safeTags.filter((x: string) => x !== tag) });
  const addCategory = () => { const c = categoryInput.trim(); if (c && !safeCategories.includes(c)) updateFrontMatter({ categories: [...safeCategories, c] }); setCategoryInput(''); };
  const removeCategory = (cat: string) => updateFrontMatter({ categories: safeCategories.filter((x: string) => x !== cat) });

  const labelCls = "text-muted-foreground font-medium uppercase tracking-wider w-10 flex-shrink-0 pt-1.5";
  const labelStyle: React.CSSProperties = { fontSize: 'var(--ui-font-size, 12px)' };

  return (
    <div className="space-y-2">
      {/* Row 1: Title + Date */}
      <div className="flex gap-3">
        <span className={labelCls} style={labelStyle}>标题</span>
        <input type="text" value={fm.title || ''} onChange={(e) => handleTitleChange(e.target.value)}
          className="input-field h-7 text-sm flex-1" placeholder={t('editor.titlePlaceholder')} />
        <span className={labelCls} style={labelStyle}>日期</span>
        <div className="flex gap-1">
          <input type="text" value={fm.date ? fmtDate(fm.date) : ''}
            onChange={(e) => { const d = new Date(e.target.value); updateFrontMatter({ date: isNaN(d.getTime()) ? e.target.value : d.toISOString() }); }}
            className="input-field h-7 text-sm w-44" />
          <button className="btn-icon p-1" onClick={now} title="填入当前时间">
            <Clock size={14} />
          </button>
        </div>
      </div>

      {/* Row 2: Tags */}
      <div className="flex gap-3">
        <span className={labelCls} style={labelStyle}>标签</span>
        <div className="flex-1 min-w-0 flex items-center gap-1 flex-wrap">
          {safeTags.map((tag: string) => (
            <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0 text-xs rounded-full bg-primary/10 text-primary">
              {tag}<button onClick={() => removeTag(tag)} className="hover:text-destructive leading-none">&times;</button>
            </span>
          ))}
          <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            className="bg-transparent border-none outline-none text-xs text-muted-foreground w-20 h-6 placeholder:text-muted-foreground/50"
            placeholder="+ 标签" />
          {tagInput.trim() && (
            <button className="text-xs text-primary hover:underline" onClick={addTag}>添加</button>
          )}
        </div>
      </div>

      {/* Row 3: Categories */}
      <div className="flex gap-3">
        <span className={labelCls} style={labelStyle}>分类</span>
        <div className="flex-1 min-w-0 flex items-center gap-1 flex-wrap">
          {safeCategories.map((cat: string) => (
            <span key={cat} className="inline-flex items-center gap-0.5 px-1.5 py-0 text-xs rounded-full bg-secondary text-secondary-foreground">
              {cat}<button onClick={() => removeCategory(cat)} className="hover:text-destructive leading-none">&times;</button>
            </span>
          ))}
          <input type="text" value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
            className="bg-transparent border-none outline-none text-xs text-muted-foreground w-20 h-6 placeholder:text-muted-foreground/50"
            placeholder="+ 分类" />
          {categoryInput.trim() && (
            <button className="text-xs text-primary hover:underline" onClick={addCategory}>添加</button>
          )}
        </div>
      </div>
    </div>
  );
}
