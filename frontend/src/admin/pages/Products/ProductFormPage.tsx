import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Plus, Trash2, X } from 'lucide-react';

import { formatPrice } from '../../../lib/formatCurrency';
import { AdminConfirmDialog } from '../../components/AdminConfirmDialog';
import { useAdminStore } from '../../hooks/useAdminStore';
import type { AdminProduct } from '../../types';
import {
  PRODUCT_STATUS_LABELS,
  createEmptyProductForm,
  getDiscountPercent,
  parseLines,
  parseSizes,
  slugifyProductName,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues,
} from '../../utils/productForm';

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
    existing ? productToForm(existing) : createEmptyProductForm({
      currency: settings.currency || 'تومان',
      lowStockThreshold: String(settings.lowStockThreshold ?? 5),
    }),
  );
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [dirty, setDirty] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  useEffect(() => {
    if (isEdit && !existing) return;
    if (existing) {
      setValues(productToForm(existing));
      setSlugTouched(true);
      setDirty(false);
    }
  }, [existing, isEdit]);

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

  const galleryPreview = useMemo(
    () => parseLines(values.galleryText),
    [values.galleryText],
  );

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
    const nextErrors = validateProductForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = formToProductPayload(values);

    if (isEdit && existing) {
      updateProduct(existing.id, payload);
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
            اطلاعات محصول را کامل کنید و ذخیره نمایید.
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

              <label className={styles.field}>
                <span>آدرس تصویر اصلی</span>
                <input
                  value={values.imageSrc}
                  onChange={(event) => updateField('imageSrc', event.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                />
                {errors.imageSrc ? <em>{errors.imageSrc}</em> : null}
              </label>

              <label className={styles.field}>
                <span>متن جایگزین تصویر</span>
                <input
                  value={values.imageAlt}
                  onChange={(event) => updateField('imageAlt', event.target.value)}
                  placeholder={values.name || 'توضیح تصویر'}
                />
              </label>

              {values.imageSrc ? (
                <div className={styles.primaryPreview}>
                  <img src={values.imageSrc} alt={values.imageAlt || values.name} />
                  <span>تصویر اصلی</span>
                  <button
                    type="button"
                    className={styles.removeImage}
                    onClick={() => updateField('imageSrc', '')}
                    aria-label="حذف تصویر اصلی"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : null}

              <label className={styles.field}>
                <span>گالری (هر آدرس در یک خط)</span>
                <textarea
                  rows={4}
                  value={values.galleryText}
                  onChange={(event) =>
                    updateField('galleryText', event.target.value)
                  }
                  placeholder={'https://...\nhttps://...'}
                  dir="ltr"
                />
                {errors.galleryText ? <em>{errors.galleryText}</em> : null}
              </label>

              {galleryPreview.length > 0 ? (
                <div className={styles.galleryPreview}>
                  {galleryPreview.map((url) => (
                    <div key={url} className={styles.galleryItem}>
                      <img src={url} alt="" />
                      <button
                        type="button"
                        aria-label="حذف تصویر گالری"
                        onClick={() =>
                          updateField(
                            'galleryText',
                            galleryPreview.filter((item) => item !== url).join('\n'),
                          )
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className={styles.card}>
              <h3 className={styles.sectionTitle}>گزینه‌های محصول</h3>

              <label className={styles.field}>
                <span>سایزها (با ویرگول جدا کنید)</span>
                <input
                  value={values.sizesText}
                  onChange={(event) => updateField('sizesText', event.target.value)}
                  placeholder="S, M, L, XL"
                />
              </label>

              <div className={styles.colorsHeader}>
                <span>رنگ‌ها</span>
                <button
                  type="button"
                  className={styles.addColor}
                  onClick={() =>
                    updateField('colors', [
                      ...values.colors,
                      { name: '', hex: '#B89B5E' },
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
                      <input
                        value={color.name}
                        onChange={(event) => {
                          const next = values.colors.slice();
                          next[index] = { ...next[index], name: event.target.value };
                          updateField('colors', next);
                        }}
                        placeholder="نام رنگ"
                      />
                      <input
                        value={color.hex}
                        onChange={(event) => {
                          const next = values.colors.slice();
                          next[index] = { ...next[index], hex: event.target.value };
                          updateField('colors', next);
                        }}
                        placeholder="#B89B5E"
                        dir="ltr"
                      />
                      <span
                        className={styles.swatch}
                        style={{ backgroundColor: color.hex || '#ccc' }}
                        aria-hidden="true"
                      />
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
                      </button>
                    </div>
                  ))
                )}
              </div>
              {errors.colors ? <em className={styles.errorText}>{errors.colors}</em> : null}
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

            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton}>
                {isEdit ? 'ذخیره تغییرات' : 'ذخیره محصول'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
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

function productToForm(product: AdminProduct): ProductFormValues {
  return createEmptyProductForm({
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    description: product.description ?? '',
    price: String(product.price),
    originalPrice:
      product.originalPrice !== undefined ? String(product.originalPrice) : '',
    currency: product.currency,
    imageSrc: product.imageSrc ?? '',
    imageAlt: product.imageAlt ?? '',
    galleryText: (product.gallery ?? []).join('\n'),
    sizesText: (product.sizes ?? []).join(', '),
    colors: product.colors ?? [],
    stock: String(product.stock),
    lowStockThreshold: String(product.lowStockThreshold),
    status: product.status,
    badge: product.badge ?? '',
    sku: product.sku ?? '',
  });
}

function formToProductPayload(values: ProductFormValues) {
  const original = values.originalPrice.trim();
  const colors = values.colors
    .map((color) => ({
      name: color.name.trim(),
      hex: color.hex.trim(),
    }))
    .filter((color) => color.name);

  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    categoryId: values.categoryId,
    description: values.description.trim() || undefined,
    price: Number(values.price),
    originalPrice: original ? Number(original) : undefined,
    currency: values.currency.trim() || 'تومان',
    imageSrc: values.imageSrc.trim() || undefined,
    imageAlt: values.imageAlt.trim() || values.name.trim(),
    gallery: parseLines(values.galleryText),
    sizes: parseSizes(values.sizesText),
    colors,
    stock: Number(values.stock),
    lowStockThreshold: Number(values.lowStockThreshold),
    status: values.status,
    badge: values.badge.trim() || undefined,
    sku: values.sku.trim() || undefined,
  };
}
