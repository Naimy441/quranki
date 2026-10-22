'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (message: string, opts?: { kind?: ToastKind; action?: Toast['action'] }) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback<ToastContextValue['toast']>((message, opts) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, kind: opts?.kind ?? 'success', action: opts?.action }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 lg:bottom-6 z-[90] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = t.kind === 'error' ? XCircle : t.kind === 'info' ? Info : CheckCircle2;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="pointer-events-auto flex items-center gap-2.5 rounded-pill border border-border bg-card/95 pl-3.5 pr-2 py-2 text-sm shadow-lift backdrop-blur"
              >
                <Icon className={t.kind === 'error' ? 'w-4 h-4 text-danger' : 'w-4 h-4 text-primary'} />
                <span className="text-text pr-1.5">{t.message}</span>
                {t.action && (
                  <button
                    onClick={t.action.onClick}
                    className="rounded-pill px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                  >
                    {t.action.label}
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
