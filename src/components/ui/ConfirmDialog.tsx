import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel = '确认', cancelLabel = '取消', onConfirm, onCancel }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="panel w-full max-w-sm mx-4 shadow-2xl">
        <div className="panel-header">
          <span className="panel-title flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-500" />{title}</span>
          <button className="btn-icon" onClick={onCancel}><X size={14} /></button>
        </div>
        <div className="p-6">
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn-primary bg-destructive hover:bg-destructive/90" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
