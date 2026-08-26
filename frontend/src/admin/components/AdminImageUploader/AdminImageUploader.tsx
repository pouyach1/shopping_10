import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { GripVertical, ImagePlus, Star, Trash2, Upload } from 'lucide-react';

import {
  ACCEPTED_EXTENSIONS,
  ImageUploadError,
  uploadProductImage,
} from '../../services/productImageUpload';
import type { ProductImage } from '../../types/product';
import {
  reorderImages,
  setPrimaryImage,
} from '../../utils/productImages';

import styles from './AdminImageUploader.module.css';

const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(',');

export interface AdminImageUploaderProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  productName?: string;
  error?: string;
  disabled?: boolean;
}

export function AdminImageUploader({
  images,
  onChange,
  productName = '',
  error,
  disabled = false,
}: AdminImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const displayError = localError || error;

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0 || disabled) return;

      setBusy(true);
      setLocalError(null);

      try {
        const uploaded: ProductImage[] = [];
        for (const file of files) {
          const image = await uploadProductImage(file, {
            alt: productName || file.name,
            isPrimary: images.length === 0 && uploaded.length === 0,
          });
          uploaded.push(image);
        }

        const next =
          images.length === 0
            ? uploaded.map((image, index) => ({
                ...image,
                isPrimary: index === 0,
              }))
            : [...images, ...uploaded.map((image) => ({ ...image, isPrimary: false }))];

        onChange(next);
      } catch (err) {
        const message =
          err instanceof ImageUploadError
            ? err.message
            : 'آپلود تصویر با خطا مواجه شد.';
        setLocalError(message);
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [disabled, images, onChange, productName],
  );

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      void processFiles(event.target.files);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled || busy) return;
    if (event.dataTransfer.files?.length) {
      void processFiles(event.dataTransfer.files);
    }
  };

  const removeImage = (id: string) => {
    const remaining = images.filter((image) => image.id !== id);
    if (remaining.length === 0) {
      onChange([]);
      return;
    }
    if (!remaining.some((image) => image.isPrimary)) {
      remaining[0] = { ...remaining[0], isPrimary: true };
    }
    onChange(remaining);
  };

  const makePrimary = (id: string) => {
    onChange(setPrimaryImage(images, id));
  };

  const onThumbDragStart = (index: number) => {
    setDragIndex(index);
  };

  const onThumbDragOver = (event: DragEvent<HTMLLIElement>, index: number) => {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    onChange(reorderImages(images, dragIndex, index));
    setDragIndex(index);
  };

  const onThumbDragEnd = () => {
    setDragIndex(null);
  };

  const onThumbKeyDown = (event: KeyboardEvent<HTMLLIElement>, index: number) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const delta = event.key === 'ArrowLeft' ? 1 : -1;
      const target = index + delta;
      if (target < 0 || target >= images.length) return;
      onChange(reorderImages(images, index, target));
    }
  };

  return (
    <div className={styles.root}>
      <div
        className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''} ${
          disabled || busy ? styles.dropzoneDisabled : ''
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled && !busy) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) setDragging(false);
        }}
        onDrop={onDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || busy}
        aria-label="آپلود تصویر محصول"
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!disabled && !busy) inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className={styles.hiddenInput}
          disabled={disabled || busy}
          onChange={onInputChange}
        />
        <div className={styles.dropzoneIcon} aria-hidden="true">
          {busy ? <Upload size={22} /> : <ImagePlus size={22} />}
        </div>
        <strong>{busy ? 'در حال آپلود...' : '+ آپلود تصویر'}</strong>
        <span>تصویر را اینجا بکشید یا کلیک کنید</span>
        <em>JPG، PNG یا WEBP — حداکثر ۲٫۵ مگابایت</em>
      </div>

      {displayError ? <p className={styles.error}>{displayError}</p> : null}

      {images.length > 0 ? (
        <ul className={styles.grid} aria-label="تصاویر محصول">
          {images.map((image, index) => (
            <li
              key={image.id}
              className={`${styles.item} ${image.isPrimary ? styles.itemPrimary : ''}`}
              draggable={!disabled}
              onDragStart={() => onThumbDragStart(index)}
              onDragOver={(event) => onThumbDragOver(event, index)}
              onDragEnd={onThumbDragEnd}
              onKeyDown={(event) => onThumbKeyDown(event, index)}
              tabIndex={0}
              aria-label={
                image.isPrimary
                  ? `تصویر اصلی، موقعیت ${index + 1}`
                  : `تصویر ${index + 1}`
              }
            >
              <span className={styles.grip} aria-hidden="true">
                <GripVertical size={14} />
              </span>
              <img src={image.url} alt={image.alt || productName || 'تصویر محصول'} />
              {image.isPrimary ? (
                <span className={styles.primaryBadge}>تصویر اصلی</span>
              ) : null}
              <div className={styles.itemActions}>
                {!image.isPrimary ? (
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => makePrimary(image.id)}
                    disabled={disabled}
                    title="تنظیم به‌عنوان تصویر اصلی"
                    aria-label="تنظیم به‌عنوان تصویر اصلی"
                  >
                    <Star size={14} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.danger}`}
                  onClick={() => removeImage(image.id)}
                  disabled={disabled}
                  title="حذف تصویر"
                  aria-label="حذف تصویر"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyHint}>هنوز تصویری اضافه نشده است.</p>
      )}
    </div>
  );
}
