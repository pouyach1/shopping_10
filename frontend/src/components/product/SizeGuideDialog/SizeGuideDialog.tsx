import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

import type { SizeGuideContent } from '../../../lib/sizeGuide';
import styles from './SizeGuideDialog.module.css';

interface SizeGuideDialogProps {
  open: boolean;
  content: SizeGuideContent;
  onClose: () => void;
}

export function SizeGuideDialog({
  open,
  content,
  onClose,
}: SizeGuideDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.root} role="presentation">
      <button
        type="button"
        className={styles.backdrop}
        aria-label="بستن راهنمای سایز"
        onClick={onClose}
      />

      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>SIZE GUIDE</span>
            <h2 id={titleId} className={styles.title}>
              {content.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="بستن"
          >
            <X size={18} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </header>

        <p className={styles.intro}>{content.intro}</p>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">سایز</th>
                <th scope="col">توضیح</th>
              </tr>
            </thead>
            <tbody>
              {content.rows.map((row) => (
                <tr key={row.size}>
                  <th scope="row">{row.size}</th>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={styles.footnote}>{content.footnote}</p>
      </div>
    </div>
  );
}
