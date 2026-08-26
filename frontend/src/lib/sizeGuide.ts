export type SizeGuideCategory = 'clothing' | 'shoes' | 'accessories';

export type SizeGuideRow = {
  size: string;
  note: string;
};

export type SizeGuideContent = {
  category: SizeGuideCategory;
  title: string;
  intro: string;
  rows: SizeGuideRow[];
  footnote: string;
};

/** Generic clothing guide — no fabricated body measurements. */
export const CLOTHING_SIZE_GUIDE: SizeGuideContent = {
  category: 'clothing',
  title: 'راهنمای سایز',
  intro:
    'سایزهای لوکسورا بر اساس استاندارد پوشاک آماده ارائه شده‌اند. این راهنما معنای کلی هر سایز را توضیح می‌دهد و جایگزین اندازه‌گیری دقیق بدن نیست.',
  rows: [
    { size: 'XS', note: 'سایز خیلی کوچک — مناسب اندام ظریف‌تر' },
    { size: 'S', note: 'سایز کوچک' },
    { size: 'M', note: 'سایز متوسط — متداول‌ترین انتخاب' },
    { size: 'L', note: 'سایز بزرگ' },
    { size: 'XL', note: 'سایز خیلی بزرگ' },
    { size: 'XXL', note: 'سایز دوبل خیلی بزرگ' },
    { size: 'Free Size', note: 'یک سایز آزاد — معمولاً با فرم گشاد یا قابل تنظیم' },
  ],
  footnote:
    'در صورت قرار گرفتن بین دو سایز، معمولاً سایز بزرگ‌تر انتخاب مطمئن‌تری است. برای راهنمایی بیشتر با پشتیبانی تماس بگیرید.',
};

export function resolveSizeGuide(
  sizes: string[],
): SizeGuideContent | null {
  if (!sizes.length) return null;

  const normalized = sizes.map((size) => size.trim()).filter(Boolean);
  if (normalized.length === 0) return null;

  const rows = CLOTHING_SIZE_GUIDE.rows.filter((row) =>
    normalized.some(
      (size) => size.toLowerCase() === row.size.toLowerCase(),
    ),
  );

  // If product uses custom labels, still show a useful generic table for those sizes.
  const customRows =
    rows.length > 0
      ? rows
      : normalized.map((size) => ({
          size,
          note: 'سایز اعلام‌شده برای این محصول',
        }));

  return {
    ...CLOTHING_SIZE_GUIDE,
    rows: customRows,
  };
}
