import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

import styles from './Toast.module.css';

export type ToastAction = {
  label: string;
  to: string;
};

interface ToastProps {
  message: string;
  open: boolean;
  onClose: () => void;
  durationMs?: number;
  action?: ToastAction;
}

export function Toast({
  message,
  open,
  onClose,
  durationMs = 3200,
  action,
}: ToastProps) {
  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.toast}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        {action ? (
          <Link to={action.to} className={styles.actionLink} onClick={onClose}>
            {action.label}
          </Link>
        ) : null}
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="بستن"
        >
          <X size={16} strokeWidth={1.7} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
