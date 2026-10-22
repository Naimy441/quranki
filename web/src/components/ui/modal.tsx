'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** "center" for dialogs, "sheet" slides in from the right on desktop and up from the bottom on phones. */
  variant?: 'center' | 'sheet';
  hideClose?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  variant = 'center',
  hideClose,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  const isSheet = variant === 'sheet';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 z-[80] flex', isSheet ? 'items-end sm:items-stretch sm:justify-end' : 'items-end sm:items-center justify-center sm:p-4')}>
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            initial={isSheet ? { x: 40, opacity: 0 } : { y: 24, opacity: 0, scale: 0.98 }}
            animate={isSheet ? { x: 0, opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
            exit={isSheet ? { x: 40, opacity: 0 } : { y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn(
              'relative w-full bg-card border border-border shadow-lift outline-none flex flex-col max-h-[92dvh]',
              isSheet
                ? 'rounded-t-xlarge sm:rounded-none sm:rounded-l-xlarge sm:max-w-md sm:max-h-none sm:h-full'
                : 'rounded-t-xlarge sm:rounded-xlarge sm:max-w-lg',
              className,
            )}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
                <div className="min-w-0">
                  {title && <h2 className="text-base font-semibold text-text">{title}</h2>}
                  {description && <p className="mt-0.5 text-sm text-textSecondary">{description}</p>}
                </div>
                {!hideClose && (
                  <button onClick={onClose} className="icon-btn -mr-2 -mt-1 shrink-0" aria-label="Close">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <div className="overflow-y-auto px-5 pb-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
