'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let toasts: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

function notifyListeners() {
  listeners.forEach((listener) => listener([...toasts]));
}

export const toast = {
  success: (message: string) => {
    const id = Math.random().toString(36);
    toasts.push({ id, type: 'success', message });
    notifyListeners();
    setTimeout(() => toast.dismiss(id), 5000);
  },
  error: (message: string) => {
    const id = Math.random().toString(36);
    toasts.push({ id, type: 'error', message });
    notifyListeners();
    setTimeout(() => toast.dismiss(id), 7000);
  },
  info: (message: string) => {
    const id = Math.random().toString(36);
    toasts.push({ id, type: 'info', message });
    notifyListeners();
    setTimeout(() => toast.dismiss(id), 5000);
  },
  dismiss: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  },
};

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setCurrentToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setCurrentToasts);
    };
  }, []);

  if (currentToasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {currentToasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => toast.dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };

  const colors = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={`${colors[toast.type]} border rounded-xl p-4 flex items-start gap-3 shadow-xl backdrop-blur-sm animate-in slide-in-from-right duration-300`}
    >
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <p className="text-sm flex-1">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
