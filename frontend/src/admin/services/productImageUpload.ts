/**
 * Product image upload abstraction.
 *
 * Current demo implementation:
 * - Validates type / size
 * - Optionally downscales large images via canvas
 * - Returns a durable `data:` URL suitable for localStorage JSON persistence
 *
 * Future backends (S3 / R2 / Supabase) should replace only this module:
 * upload → remote URL → return { id, url } with the same shape.
 *
 * Never persist File objects or ephemeral blob: URLs in the product store.
 */

import type { ProductImage } from '../types/product';

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

/** Soft cap before compression (bytes). */
export const MAX_UPLOAD_BYTES = 2.5 * 1024 * 1024;

/** Target max edge after compression. */
const MAX_DIMENSION = 1400;

/** Target max encoded data-URL payload (approx). */
const MAX_DATA_URL_CHARS = 900_000;

export type ImageUploadErrorCode =
  | 'unsupported_type'
  | 'too_large'
  | 'read_failed'
  | 'encode_failed';

export class ImageUploadError extends Error {
  code: ImageUploadErrorCode;

  constructor(code: ImageUploadErrorCode, message: string) {
    super(message);
    this.name = 'ImageUploadError';
    this.code = code;
  }
}

export const IMAGE_UPLOAD_MESSAGES: Record<ImageUploadErrorCode, string> = {
  unsupported_type:
    'فرمت فایل پشتیبانی نمی‌شود. فقط JPG، PNG یا WEBP مجاز است.',
  too_large: 'حجم تصویر بیش از حد مجاز است. حداکثر ۲٫۵ مگابایت.',
  read_failed: 'خواندن فایل با خطا مواجه شد. لطفاً دوباره تلاش کنید.',
  encode_failed: 'پردازش تصویر ناموفق بود. فایل دیگری را امتحان کنید.',
};

function createImageId(): string {
  return `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isAcceptedType(file: File): boolean {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return true;
  }

  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new ImageUploadError('read_failed', IMAGE_UPLOAD_MESSAGES.read_failed));
    };
    reader.onerror = () => {
      reject(new ImageUploadError('read_failed', IMAGE_UPLOAD_MESSAGES.read_failed));
    };
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new ImageUploadError('encode_failed', IMAGE_UPLOAD_MESSAGES.encode_failed));
    image.src = src;
  });
}

async function compressToDataUrl(file: File): Promise<string> {
  const original = await readFileAsDataUrl(file);
  const image = await loadImage(original);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new ImageUploadError('encode_failed', IMAGE_UPLOAD_MESSAGES.encode_failed);
  }

  context.drawImage(image, 0, 0, width, height);

  const outputType =
    file.type === 'image/png' || file.type === 'image/webp'
      ? file.type
      : 'image/jpeg';

  let quality = 0.85;
  let dataUrl = canvas.toDataURL(outputType, quality);

  while (dataUrl.length > MAX_DATA_URL_CHARS && quality > 0.45) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new ImageUploadError('too_large', IMAGE_UPLOAD_MESSAGES.too_large);
  }

  return dataUrl;
}

export interface UploadProductImageOptions {
  alt?: string;
  isPrimary?: boolean;
}

/**
 * Upload a product image for the mock/admin demo.
 * Returns a ProductImage whose `url` can later be swapped for an object-storage URL.
 */
export async function uploadProductImage(
  file: File,
  options: UploadProductImageOptions = {},
): Promise<ProductImage> {
  if (!isAcceptedType(file)) {
    throw new ImageUploadError(
      'unsupported_type',
      IMAGE_UPLOAD_MESSAGES.unsupported_type,
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageUploadError('too_large', IMAGE_UPLOAD_MESSAGES.too_large);
  }

  try {
    const url = await compressToDataUrl(file);
    return {
      id: createImageId(),
      url,
      alt: options.alt,
      isPrimary: Boolean(options.isPrimary),
    };
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError('encode_failed', IMAGE_UPLOAD_MESSAGES.encode_failed);
  }
}
