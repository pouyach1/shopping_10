import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';

import { formatPrice } from '../../../lib/formatCurrency';
import { AdminConfirmDialog } from '../../components/AdminConfirmDialog';
import { AdminImageUploader } from '../../components/AdminImageUploader';
import { useAdminStore } from '../../hooks/useAdminStore';
import type { AdminProduct, ProductImage } from '../../types';
import {
  FASHION_SIZE_OPTIONS,
  PRODUCT_STATUS_LABELS,
  createEmptyProductForm,
  getDiscountPercent,
  getLegacySizeOptions,
  productToFormValues,
  slugifyProductName,
  toggleSizeSelection,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues,
} from '../../utils/productForm';
import { syncLegacyImageFields } from '../../utils/productImages';

import styles from './ProductFormPage.module.css';

export function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const {
    getProduct,
    getCategories,
    getSettings,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useAdminStore();

  const categories = getCategories().filter((category) => category.active);
  const settings = getSettings();
  const existing = id ? getProduct(id) : undefined;

  const [values, setValues] = useState<ProductFormValues>(() =>
    buildInitialValues(existing, settings.currency, settings.lowStockThreshold),
  );
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reload form when route id / product identity changes (edit reliability).
  useEffect(() => {
    if (isEdit) {
      if (!existing) return;
      setValues(productToFormValues(existing));
      setSlugTouched(true);
      setDirty(false);
      setErrors({});
      setSaveError(null);
      return;
    }

    setValues(
      createEmptyProductForm({
        currency: settings.currency || 'تومان',
        lowStockThreshold: String(settings.lowStockThreshold ?? 5),
      }),
    );
    setSlugTouched(false);
    setDirty(false);
    setErrors({});
    setSaveError(null);
    // Intentionally keyed by product id so store refreshes do not wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit, existing?.id, existing?.updatedAt]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const priceNumber = Number(values.price);
  const originalNumber = Number(values.originalPrice);
  const discount =
    !Number.isNaN(priceNumber) && !Number.isNaN(originalNumber)
      ? getDiscountPercent(priceNumber, originalNumber)
      : 0;

  const sizeChoices = useMemo(() => {
    const legacy = getLegacySizeOptions(values.sizes);
    return [...FASHION_SIZE_OPTIONS, ...legacy];
  }, [values.sizes]);

  if (isEdit && !existing) {
    return (
      <div className={styles.missing}>
        <h2>محصول پیدا نشد</h2>
        <p>این محصول وجود ندارد یا حذف شده است.</p>
        <Link to="/admin/products" className={styles.secondaryButton}>
          بازگشت به فهرست
        </Link>
      </div>
    );
  }

  const updateField = <K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) => {
    setDirty(true);
    setSaveError(null);
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === 'name' && !slugTouched && typeof value === 'string') {
        next.slug = slugifyProductName(value);
      }
      return next;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors = validateProductForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSaveError(null);

    try {
      const payload = formToProductPayload(values);

      if (isEdit && existing) {
        const updated = updateProduct(existing.id, payload);
        if (!updated) {
          setSaveError('ذخیره تغییرات انجام نشد. محصول پیدا نشد.');
          setSaving(false);
          return;
        }
        setDirty(false);
        navigate('/admin/products', {
          state: { toast: 'تغییرات محصول ذخیره شد.' },
        });
        return;
      }

      createProduct(payload);
      setDirty(false);
      navigate('/admin/products', {
        state: { toast: 'محصول جدید با موفقیت ذخیره شد.' },
      });
    } catch {
      setSaveError(
        'ذخیره انجام نشد. ممکن است فضای ذخیره‌سازی مرورگر کافی نباشد (به‌ویژه برای تصاویر بزرگ).',
      );
      setSaving(false);
    }
  };

  const handleArchive = () => {
    if (!existing) return;
    deleteProduct(existing.id);
    setDirty(false);
    setArchiveOpen(false);
    navigate('/admin/products', {
      state: { toast: 'محصول آرشیو شد.' },
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link to="/admin/products" className={styles.backLink}>
            <ArrowRight size={16} strokeWidth={1.75} />
            بازگشت به محصولات
          </Link>
          <h2 className={styles.title}>
            {isEdit ? 'ویرایش محصول' : 'افزودن محصول'}
          </h2>
          <p className={styles.subtitle}>
            نام و قیمت را وارد کنید، عکس را آپلود کنید، سایز و رنگ را انتخاب کنید.
          </p>
        </div>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <section className={styles.card}>
              <h3 className={styles.sectionTitle}>اطلاعات محصول</h3>

              <label className={styles.field}>
                <span>نام محصول *</span>
                <input
                  value={values.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="مثال: کیف دستی چرم لونا"
                />
                {errors.name ? <em>{errors.name}</em> : null}
              </label>

              <label className={styles.field}>
                <span>شناسه (slug) *</span>
                <input
                  value={values.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    updateField('slug', event.target.value);
                  }}
                  placeholder="luna-leather-handbag"
                  dir="ltr"
                />
                {errors.slug ? <em>{errors.slug}</em> : null}
              </label>

              <label className={styles.field}>
                <span>توضیحات</span>
                <textarea
                  rows={5}
                  value={values.description}
                  onChange={(event) =>
                    updateField('description', event.target.value)
                  }
                  placeholder="توضیح کوتاه و جذاب درباره محصول..."
                />
              </label>

              <div className={styles.inlineFields}>
                <label className={styles.field}>
                  <span>SKU</span>
                  <input
                    value={values.sku}
                    onChange={(event) => updateField('sku', event.target.value)}
                    placeholder="LX-BAG-012"
                    dir="ltr"
                  />
                </label>
                <label className={styles.field}>
                  <span>برچسب نمایشی</span>
                  <input
                    value={values.badge}
                    onChange={(event) => updateField('badge', event.target.value)}
                    placeholder="جدید / تخفیف"
                  />
                </label>
              </div>
            </section>

            <section className={styles.card}>
              <h3 className={styles.sectionTitle}>تصاویر</h3>
              <AdminImageUploader
                images={values.images}
                productName={values.name}
                error={errors.images}
                onChange={(images: ProductImage[]) => updateField('images', images)}
              />
            </section>

            <section className={styles.card}>
              <h3 className={styles.sectionTitle}>گزینه‌های محصول</h3>

              <div className={styles.optionsBlock}>
                <div className={styles.optionsLabel}>سایزها</div>
                <div className={styles.sizeChips} role="group" aria-label="سایزهای محصول">
                  {sizeChoices.map((size) => {
                    const selected = values.sizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        className={`${styles.sizeChip} ${
                          selected ? styles.sizeChipSelected : ''
                        }`}
                        aria-pressed={selected}
                        onClick={() =>
                          updateField('sizes', toggleSizeSelection(values.sizes, size))
                        }
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
                <p className={styles.hint}>
                  فقط سایزهای قابل فروش را انتخاب کنید. برای لغو، دوباره روی سایز کلیک کنید.
                </p>
              </div>

              <div className={styles.optionsBlock}>
                <div className={styles.colorsHeader}>
                  <span>رنگ‌ها</span>
                  <button
                    type="button"
                    className={styles.addColor}
                    onClick={() =>
                      updateField('colors', [
                        ...values.colors,
                        { name: '', hex: '#1A1A1A' },
                      ])
                    }
                  >
                    <Plus size={14} />
                    افزودن رنگ
                  </button>
                </div>

                <div className={styles.colorsList}>
                  {values.colors.length === 0 ? (
                    <p className={styles.hint}>هنوز رنگی اضافه نشده است.</p>
                  ) : (
                    values.colors.map((color, index) => (
                      <div key={`color-${index}`} className={styles.colorRow}>
                        <span
                          className={styles.swatch}
                          style={{ backgroundColor: color.hex || '#ccc' }}
                          aria-hidden="true"
                        />
                        <input
                          value={color.name}
                          onChange={(event) => {
                            const next = values.colors.slice();
                            next[index] = {
                              ...next[index],
                              name: event.target.value,
                            };
                            updateField('colors', next);
                          }}
                          placeholder="نام رنگ (مثلاً مشکی)"
                          aria-label={`نام رنگ ${index + 1}`}
                        />
                        <label className={styles.colorPickerWrap}>
                          <span className={styles.srOnly}>انتخاب رنگ</span>
                          <input
                            type="color"
                            value={toColorInputValue(color.hex)}
                            onChange={(event) => {
                              const next = values.colors.slice();
                              next[index] = {
                                ...next[index],
                                hex: event.target.value.toUpperCase(),
                              };
                              updateField('colors', next);
                            }}
                            aria-label={`انتخابگر رنگ ${index + 1}`}
                          />
                        </label>
                        <button
                          type="button"
                          aria-label="حذف رنگ"
                          onClick={() =>
                            updateField(
                              'colors',
                              values.colors.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 size={14} />
                          <span>حذف</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
                {errors.colors ? (
                  <em className={styles.errorText}>{errors.colors}</em>
                ) : null}
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.card}>
              <h3 className={styles.sectionTitle}>دسته‌بندی و وضعیت</h3>

              <label className={styles.field}>
                <span>دسته‌بندی *</span>
                <select
                  value={values.categoryId}
                  onChange={(event) => updateField('categoryId', event.target.value)}
                >
                  <option value="">انتخاب کنید</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId ? <em>{errors.categoryId}</em> : null}
              </label>

              <label className={styles.field}>
                <span>وضعیت</span>
                <select
                  value={values.status}
                  onChange={(event) =>
                    updateField(
                      'status',
                      event.target.value as ProductFormValues['status'],
                    )
                  }
                >
                  {(Object.keys(PRODUCT_STATUS_LABELS) as Array<
                    keyof typeof PRODUCT_STATUS_LABELS
                  >).map((status) => (
                    <option key={status} value={status}>
                      {PRODUCT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className={styles.card}>
              <h3 className={styles.sectionTitle}>قیمت</h3>

              <label className={styles.field}>
                <span>قیمت فروش *</span>
                <input
                  type="number"
                  min={0}
                  value={values.price}
                  onChange={(event) => updateField('price', event.target.value)}
                  placeholder="2890000"
                />
                {errors.price ? <em>{errors.price}</em> : null}
              </label>

              <label className={styles.field}>
                <span>قیمت قبل از تخفیف</span>
                <input
                  type="number"
                  min={0}
                  value={values.originalPrice}
                  onChange={(event) =>
                    updateField('originalPrice', event.target.value)
                  }
                  placeholder="3290000"
                />
                {errors.originalPrice ? <em>{errors.originalPrice}</em> : null}
              </label>

              <label className={styles.field}>
                <span>واحد پول</span>
                <input
                  value={values.currency}
                  onChange={(event) => updateField('currency', event.target.value)}
                />
              </label>

              {discount > 0 ? (
                <p className={styles.discountHint}>
                  تخفیف محاسبه‌شده: {formatPrice(discount)}٪
                </p>
              ) : null}
            </section>

            <section className={styles.card}>
              <h3 className={styles.sectionTitle}>موجودی</h3>

              <label className={styles.field}>
                <span>موجودی</span>
                <input
                  type="number"
                  min={0}
                  value={values.stock}
                  onChange={(event) => updateField('stock', event.target.value)}
                />
                {errors.stock ? <em>{errors.stock}</em> : null}
              </label>

              <label className={styles.field}>
                <span>آستانه کم‌موجودی</span>
                <input
                  type="number"
                  min={0}
                  value={values.lowStockThreshold}
                  onChange={(event) =>
                    updateField('lowStockThreshold', event.target.value)
                  }
                />
                {errors.lowStockThreshold ? (
                  <em>{errors.lowStockThreshold}</em>
                ) : null}
              </label>

              <p className={styles.hint}>
                وقتی موجودی به این عدد برسد، محصول به‌عنوان کم‌موجودی نمایش داده
                می‌شود.
              </p>
            </section>

            {saveError ? <p className={styles.saveError}>{saveError}</p> : null}

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving}
              >
                {saving
                  ? 'در حال ذخیره...'
                  : isEdit
                    ? 'ذخیره تغییرات'
                    : 'ذخیره محصول'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={saving}
                onClick={() => {
                  if (dirty) {
                    setLeaveOpen(true);
                    return;
                  }
                  navigate('/admin/products');
                }}
              >
                لغو
              </button>
              {isEdit && existing?.status !== 'archived' ? (
                <button
                  type="button"
                  className={styles.dangerButton}
                  disabled={saving}
                  onClick={() => setArchiveOpen(true)}
                >
                  آرشیو محصول
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      </form>

      <AdminConfirmDialog
        open={archiveOpen}
        title="آرشیو محصول"
        description="آیا از آرشیو کردن این محصول مطمئن هستید؟"
        confirmLabel="آرشیو کردن"
        cancelLabel="انصراف"
        danger
        onConfirm={handleArchive}
        onCancel={() => setArchiveOpen(false)}
      />

      <AdminConfirmDialog
        open={leaveOpen}
        title="تغییرات ذخیره‌نشده"
        description="تغییراتی ذخیره نشده‌اند. آیا می‌خواهید بدون ذخیره خارج شوید؟"
        confirmLabel="خروج بدون ذخیره"
        cancelLabel="ماندن در صفحه"
        danger
        onConfirm={() => {
          setDirty(false);
          setLeaveOpen(false);
          navigate('/admin/products');
        }}
        onCancel={() => {
          setLeaveOpen(false);
        }}
      />
    </div>
  );
}

function buildInitialValues(
  existing: AdminProduct | undefined,
  currency: string,
  lowStockThreshold: number,
): ProductFormValues {
  if (existing) return productToFormValues(existing);
  return createEmptyProductForm({
    currency: currency || 'تومان',
    lowStockThreshold: String(lowStockThreshold ?? 5),
  });
}

function formToProductPayload(values: ProductFormValues) {
  const original = values.originalPrice.trim();
  const colors = values.colors
    .map((color) => ({
      name: color.name.trim(),
      hex: color.hex.trim().toUpperCase(),
    }))
    .filter((color) => color.name);

  const legacyImages = syncLegacyImageFields(values.images);

  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    categoryId: values.categoryId,
    description: values.description.trim() || undefined,
    price: Number(values.price),
    originalPrice: original ? Number(original) : undefined,
    currency: values.currency.trim() || 'تومان',
    images: values.images.map((image) => ({
      ...image,
      alt: image.alt || values.name.trim(),
    })),
    imageSrc: legacyImages.imageSrc,
    imageAlt: legacyImages.imageAlt || values.name.trim(),
    gallery: legacyImages.gallery,
    sizes: values.sizes,
    colors,
    stock: Number(values.stock),
    lowStockThreshold: Number(values.lowStockThreshold),
    status: values.status,
    badge: values.badge.trim() || undefined,
    sku: values.sku.trim() || undefined,
  };
}

/** Native color inputs require #RRGGBB. */
function toColorInputValue(hex: string): string {
  const value = hex.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const [, r, g, b] = value;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return '#1A1A1A';
}
