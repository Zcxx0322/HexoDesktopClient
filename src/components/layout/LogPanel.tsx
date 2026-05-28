import { useRef, useEffect, useCallback } from 'react';
import { useConfigStore } from '@/store/configStore';
import { Trash2 } from 'lucide-react';

const S = (base: string, off = '0px') =>
  ({ fontSize: `calc(${base} + ${off})` }) as React.CSSProperties;

const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <a key={i} className="underline cursor-pointer hover:text-primary"
            onClick={(e) => { e.stopPropagation(); window.electronAPI.openExternal(part); }}
          >{part}</a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function LogPanel() {
  const { logs, clearLogs } = useConfigStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const base = 'var(--ui-font-size, 13px)';

  return (
    <div className="h-full flex flex-col border-t border-border bg-card">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">日志输出</span>
        <button className="btn-icon" onClick={clearLogs} title="清空日志">
          <Trash2 size={12} />
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 bg-muted/20">
        {logs.length === 0 ? (
          <div className="text-muted-foreground p-2" style={S(base)}>
            暂无日志，执行命令后将在此显示输出。
          </div>
        ) : (
          logs.slice(-200).map((log) => (
            <div key={log.id} className={`log-line ${log.level} select-text`}>
              <span className="text-muted-foreground" style={S(base, '-1px')}>
                {new Date(log.timestamp).toLocaleTimeString()} [{log.service}]
              </span>{' '}
              <span style={S(base)}><Linkify text={log.message} /></span>
              {log.details && (log.level === 'error' || log.level === 'warn') && (
                <div className="text-muted-foreground ml-4 whitespace-pre-wrap" style={S(base, '-1px')}>
                  <Linkify text={log.details.slice(-300)} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
