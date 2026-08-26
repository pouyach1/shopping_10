import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';

import { formatPrice } from '../../../lib/formatCurrency';
import { AdminConfirmDialog } from '../../components/AdminConfirmDialog';
import { AdminStatusBadge } from '../../components/AdminStatusBadge';
import { useAdminStore } from '../../hooks/useAdminStore';
import type { AdminProduct, ProductStatus } from '../../types';
import {
  PRODUCT_STATUS_LABELS,
  STOCK_FILTER_LABELS,
  getDiscountPercent,
  isLowStock,
  isOutOfStock,
  type StockFilter,
} from '../../utils/productForm';

import styles from './ProductsPage.module.css';

type StatusFilter = 'non-archived' | 'all' | ProductStatus;

export function ProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { data, getCategories, deleteProduct, updateProduct } = useAdminStore();

  const categories = getCategories();
  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category])),
    [categories],
  );

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('non-archived');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminProduct | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const state = location.state as { toast?: string } | null;
    if (state?.toast) {
      setToast(state.toast);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!menuOpenId) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [menuOpenId]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return data.products
      .filter((product) => {
        if (statusFilter === 'non-archived' && product.status === 'archived') {
          return false;
        }
        if (
          statusFilter !== 'non-archived' &&
          statusFilter !== 'all' &&
          product.status !== statusFilter
        ) {
          return false;
        }
        if (categoryId && product.categoryId !== categoryId) return false;
        if (stockFilter === 'low' && !isLowStock(product.stock, product.lowStockThreshold)) {
          return false;
        }
        if (stockFilter === 'out' && !isOutOfStock(product.stock)) return false;
        if (!normalized) return true;

        const haystack = [
          product.name,
          product.slug,
          product.sku ?? '',
          categoryMap[product.categoryId]?.name ?? '',
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalized);
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [data.products, query, categoryId, statusFilter, stockFilter, categoryMap]);

  const filtersActive =
    Boolean(query.trim()) ||
    Boolean(categoryId) ||
    statusFilter !== 'non-archived' ||
    stockFilter !== 'all';

  const clearFilters = () => {
    setQuery('');
    setCategoryId('');
    setStatusFilter('non-archived');
    setStockFilter('all');
  };

  const handleArchive = () => {
    if (!archiveTarget) return;
    deleteProduct(archiveTarget.id);
    setArchiveTarget(null);
    setMenuOpenId(null);
    setToast('محصول آرشیو شد.');
  };

  const handleActivate = (product: AdminProduct) => {
    updateProduct(product.id, { status: 'active' });
    setMenuOpenId(null);
    setToast('محصول فعال شد.');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>محصولات</h2>
          <p className={styles.subtitle}>
            مدیریت کاتالوگ فروشگاه — افزودن، ویرایش و آرشیو محصولات
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.count}>
            {formatPrice(filteredProducts.length)} محصول
          </span>
          <Link to="/admin/products/new" className={styles.primaryButton}>
            <Plus size={16} strokeWidth={1.75} />
            افزودن محصول
          </Link>
        </div>
      </header>

      <section className={styles.toolbar} aria-label="فیلتر محصولات">
        <label className={styles.search}>
          <Search size={16} strokeWidth={1.75} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجو بر اساس نام محصول..."
            aria-label="جستجوی محصول"
          />
        </label>

        <select
          className={styles.select}
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          aria-label="فیلتر دسته‌بندی"
        >
          <option value="">همه دسته‌ها</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as StatusFilter)
          }
          aria-label="فیلتر وضعیت"
        >
          <option value="non-archived">فعال و پیش‌نویس</option>
          <option value="all">همه وضعیت‌ها</option>
          <option value="active">{PRODUCT_STATUS_LABELS.active}</option>
          <option value="draft">{PRODUCT_STATUS_LABELS.draft}</option>
          <option value="archived">{PRODUCT_STATUS_LABELS.archived}</option>
        </select>

        <select
          className={styles.select}
          value={stockFilter}
          onChange={(event) => setStockFilter(event.target.value as StockFilter)}
          aria-label="فیلتر موجودی"
        >
          {(Object.keys(STOCK_FILTER_LABELS) as StockFilter[]).map((key) => (
            <option key={key} value={key}>
              {STOCK_FILTER_LABELS[key]}
            </option>
          ))}
        </select>

        {filtersActive ? (
          <button type="button" className={styles.clearButton} onClick={clearFilters}>
            <X size={14} strokeWidth={1.75} />
            پاک کردن فیلترها
          </button>
        ) : null}
      </section>

      {filteredProducts.length === 0 ? (
        <div className={styles.empty}>
          <Package size={28} strokeWidth={1.5} aria-hidden="true" />
          <h3>محصولی یافت نشد</h3>
          <p>
            {filtersActive
              ? 'با فیلترهای فعلی نتیجه‌ای نیست. فیلترها را تغییر دهید یا محصول جدیدی اضافه کنید.'
              : 'هنوز محصولی ثبت نشده است. اولین محصول فروشگاه را اضافه کنید.'}
          </p>
          <Link to="/admin/products/new" className={styles.primaryButton}>
            <Plus size={16} strokeWidth={1.75} />
            افزودن محصول
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>محصول</th>
                  <th>دسته‌بندی</th>
                  <th>قیمت</th>
                  <th>موجودی</th>
                  <th>وضعیت</th>
                  <th aria-label="اقدامات" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filteredProducts.map((product) => (
                    <motion.tr
                      key={product.id}
                      layout={!reduceMotion}
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0 }}
                    >
                      <td>
                        <div className={styles.productCell}>
                          <ProductThumb product={product} />
                          <div>
                            <strong>{product.name}</strong>
                            <span>{product.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td>{categoryMap[product.categoryId]?.name ?? '—'}</td>
                      <td>
                        <PriceCell product={product} />
                      </td>
                      <td>
                        <StockCell product={product} />
                      </td>
                      <td>
                        <AdminStatusBadge status={product.status} />
                      </td>
                      <td className={styles.actionsCell}>
                        <ActionsMenu
                          product={product}
                          open={menuOpenId === product.id}
                          menuRef={menuOpenId === product.id ? menuRef : undefined}
                          onToggle={() =>
                            setMenuOpenId((current) =>
                              current === product.id ? null : product.id,
                            )
                          }
                          onEdit={() => navigate(`/admin/products/${product.id}`)}
                          onArchive={() => setArchiveTarget(product)}
                          onActivate={() => handleActivate(product)}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          <div className={styles.cards} aria-label="فهرست موبایل محصولات">
            {filteredProducts.map((product) => (
              <article key={product.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <ProductThumb product={product} />
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitleRow}>
                      <strong>{product.name}</strong>
                      <ActionsMenu
                        product={product}
                        open={menuOpenId === product.id}
                        menuRef={menuOpenId === product.id ? menuRef : undefined}
                        onToggle={() =>
                          setMenuOpenId((current) =>
                            current === product.id ? null : product.id,
                          )
                        }
                        onEdit={() => navigate(`/admin/products/${product.id}`)}
                        onArchive={() => setArchiveTarget(product)}
                        onActivate={() => handleActivate(product)}
                      />
                    </div>
                    <span className={styles.cardMeta}>
                      {categoryMap[product.categoryId]?.name ?? 'بدون دسته'}
                    </span>
                    <div className={styles.cardFooter}>
                      <PriceCell product={product} />
                      <StockCell product={product} />
                      <AdminStatusBadge status={product.status} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <AdminConfirmDialog
        open={Boolean(archiveTarget)}
        title="آرشیو محصول"
        description="آیا از آرشیو کردن این محصول مطمئن هستید؟ محصول از کاتالوگ فعال حذف می‌شود اما در داده‌ها باقی می‌ماند."
        confirmLabel="آرشیو کردن"
        cancelLabel="انصراف"
        danger
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />

      <AnimatePresence>
        {toast ? (
          <motion.div
            className={styles.toast}
            role="status"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          >
            <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ProductThumb({ product }: { product: AdminProduct }) {
  const thumb =
    product.imageSrc ||
    product.images?.find((image) => image.isPrimary)?.url ||
    product.images?.[0]?.url;

  return thumb ? (
    <img
      src={thumb}
      alt={product.imageAlt || product.name}
      className={styles.thumb}
    />
  ) : (
    <div className={styles.thumbFallback} aria-hidden="true">
      <Package size={18} strokeWidth={1.5} />
    </div>
  );
}

function PriceCell({ product }: { product: AdminProduct }) {
  const discount = getDiscountPercent(product.price, product.originalPrice);

  return (
    <div className={styles.priceCell}>
      <strong>
        {formatPrice(product.price)} {product.currency}
      </strong>
      {product.originalPrice && product.originalPrice > product.price ? (
        <span className={styles.oldPrice}>
          {formatPrice(product.originalPrice)} {product.currency}
          {discount > 0 ? ` · ${formatPrice(discount)}٪` : ''}
        </span>
      ) : null}
    </div>
  );
}

function StockCell({ product }: { product: AdminProduct }) {
  const out = isOutOfStock(product.stock);
  const low = isLowStock(product.stock, product.lowStockThreshold);

  return (
    <div
      className={`${styles.stockCell} ${out ? styles.stockDanger : low ? styles.stockWarning : ''}`}
    >
      {(out || low) && (
        <AlertTriangle size={14} strokeWidth={1.75} aria-hidden="true" />
      )}
      <span>
        {formatPrice(product.stock)} عدد
        {out ? ' · ناموجود' : low ? ' · کم‌موجودی' : ''}
      </span>
    </div>
  );
}

interface ActionsMenuProps {
  product: AdminProduct;
  open: boolean;
  menuRef?: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onActivate: () => void;
}

function ActionsMenu({
  product,
  open,
  menuRef,
  onToggle,
  onEdit,
  onArchive,
  onActivate,
}: ActionsMenuProps) {
  return (
    <div className={styles.menu} ref={menuRef}>
      <button
        type="button"
        className={styles.menuButton}
        aria-label={`اقدامات ${product.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
      >
        <MoreHorizontal size={16} strokeWidth={1.75} />
      </button>
      {open ? (
        <div className={styles.menuPanel} role="menu">
          <button type="button" role="menuitem" onClick={onEdit}>
            <Pencil size={14} strokeWidth={1.75} />
            ویرایش
          </button>
          {product.status !== 'active' ? (
            <button type="button" role="menuitem" onClick={onActivate}>
              <CheckCircle2 size={14} strokeWidth={1.75} />
              فعال‌سازی
            </button>
          ) : null}
          {product.status !== 'archived' ? (
            <button
              type="button"
              role="menuitem"
              className={styles.menuDanger}
              onClick={onArchive}
            >
              <Archive size={14} strokeWidth={1.75} />
              آرشیو
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
