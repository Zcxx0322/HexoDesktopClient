import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.electronAPI.windowIsMaximized().then(setIsMaximized);
  }, []);

  return (
    <div
      className="flex items-center justify-between h-8 bg-card border-b border-border select-none flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App title */}
      <div className="flex items-center gap-2 px-3">
        <span className="text-xs font-semibold text-primary tracking-wide">Hexo Desktop Client</span>
      </div>

      {/* Window controls */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          className="h-full px-3 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          onClick={() => window.electronAPI.windowMinimize()}
          title="最小化"
        >
          <Minus size={14} />
        </button>
        <button
          className="h-full px-3 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          onClick={() => {
            window.electronAPI.windowMaximize();
            setIsMaximized(!isMaximized);
          }}
          title={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? <Copy size={14} /> : <Square size={14} />}
        </button>
        <button
          className="h-full px-4 hover:bg-destructive transition-colors text-muted-foreground hover:text-destructive-foreground"
          onClick={() => window.electronAPI.windowClose()}
          title="关闭"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
