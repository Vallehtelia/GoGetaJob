'use client';

import { Button } from './ui/Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-navy-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'secondary' : 'primary'}
            onClick={onConfirm}
            className={isDestructive ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : ''}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
