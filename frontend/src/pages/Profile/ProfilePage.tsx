import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Heart,
  LogOut,
  Package,
  Pencil,
  ShoppingBag,
  Store,
  UserRound,
} from 'lucide-react';

import { Reveal } from '../../components/ui/Reveal';
import { useCart } from '../../hooks/useCart';
import { useProfileAuth } from '../../hooks/useProfileAuth';
import { useWishlist } from '../../hooks/useWishlist';
import { formatPrice } from '../../lib/formatCurrency';
import {
  DEMO_CUSTOMER,
  ProfileAuthError,
  PROFILE_AUTH_MESSAGES,
} from '../../services/profileAuth';
import {
  CUSTOMER_ORDER_STATUS_LABELS,
  formatCustomerOrderDate,
  formatMemberSince,
  getCustomerOrders,
  toPersianItemCount,
  type CustomerOrderSummary,
} from '../../services/customerOrders';

import styles from './ProfilePage.module.css';

type FieldErrors = {
  identifier?: string;
  password?: string;
  form?: string;
};

type AccountSection = 'overview' | 'orders' | 'wishlist' | 'cart' | 'account';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ل';
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

function ProfileLogin() {
  const { login } = useProfileAuth();
  const formId = useId();
  const identifierId = `${formId}-identifier`;
  const passwordId = `${formId}-password`;
  const rememberId = `${formId}-remember`;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotHint, setShowForgotHint] = useState(false);
  const [showRegisterHint, setShowRegisterHint] = useState(false);
  const identifierRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    identifierRef.current?.focus();
  }, []);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!identifier.trim()) {
      next.identifier = PROFILE_AUTH_MESSAGES.empty_identifier;
    }
    if (!password) {
      next.password = PROFILE_AUTH_MESSAGES.empty_password;
    }
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    setShowForgotHint(false);
    setShowRegisterHint(false);
    if (nextErrors.identifier || nextErrors.password) return;

    setIsSubmitting(true);
    try {
      await login({ identifier, password, remember });
    } catch (error) {
      if (error instanceof ProfileAuthError) {
        setErrors({ form: error.message });
      } else {
        setErrors({ form: PROFILE_AUTH_MESSAGES.service_unavailable });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Reveal variant="subtle" className={styles.loginShell}>
      <div className={styles.loginCard} aria-busy={isSubmitting}>
        <header className={styles.loginHeader}>
          <span className={styles.eyebrow}>LUXORA</span>
          <h1 className={styles.loginTitle}>ورود به حساب کاربری</h1>
          <p className={styles.loginSubtitle}>
            سفارش‌ها، علاقه‌مندی‌ها و خریدهای خود را از یک مکان مدیریت کنید.
          </p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor={identifierId}>شماره موبایل یا ایمیل</label>
            <input
              ref={identifierRef}
              id={identifierId}
              name="identifier"
              type="text"
              inputMode="email"
              autoComplete="username"
              value={identifier}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.identifier)}
              aria-describedby={
                errors.identifier ? `${identifierId}-error` : undefined
              }
              placeholder="۰۹۱۲۱۲۳۴۵۶۷"
              onChange={(event) => {
                setIdentifier(event.target.value);
                if (errors.identifier || errors.form) {
                  setErrors((prev) => ({
                    ...prev,
                    identifier: undefined,
                    form: undefined,
                  }));
                }
              }}
            />
            {errors.identifier ? (
              <p
                id={`${identifierId}-error`}
                className={styles.fieldError}
                role="alert"
              >
                {errors.identifier}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label htmlFor={passwordId}>رمز عبور</label>
            <div className={styles.passwordWrap}>
              <input
                id={passwordId}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? `${passwordId}-error` : undefined
                }
                placeholder="••••••••"
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password || errors.form) {
                    setErrors((prev) => ({
                      ...prev,
                      password: undefined,
                      form: undefined,
                    }));
                  }
                }}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((open) => !open)}
                aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                aria-pressed={showPassword}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff size={18} strokeWidth={1.6} aria-hidden="true" />
                ) : (
                  <Eye size={18} strokeWidth={1.6} aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p
                id={`${passwordId}-error`}
                className={styles.fieldError}
                role="alert"
              >
                {errors.password}
              </p>
            ) : null}
          </div>

          <div className={styles.rowBetween}>
            <label htmlFor={rememberId} className={styles.remember}>
              <input
                id={rememberId}
                type="checkbox"
                checked={remember}
                disabled={isSubmitting}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span>مرا به خاطر بسپار</span>
            </label>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => {
                setShowRegisterHint(false);
                setShowForgotHint((open) => !open);
              }}
            >
              فراموشی رمز عبور
            </button>
          </div>

          {showForgotHint ? (
            <p className={styles.hint} role="status">
              بازیابی رمز عبور هنوز فعال نشده است. برای ورود آزمایشی از حساب
              دمو استفاده کنید.
            </p>
          ) : null}

          {errors.form ? (
            <p className={styles.formError} role="alert">
              {errors.form}
            </p>
          ) : null}

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'در حال ورود...' : 'ورود'}
          </button>
        </form>

        <p className={styles.footerNote}>
          حساب ندارید؟{' '}
          <button
            type="button"
            className={styles.textButton}
            onClick={() => {
              setShowForgotHint(false);
              setShowRegisterHint((open) => !open);
            }}
          >
            ثبت‌نام
          </button>
        </p>

        {showRegisterHint ? (
          <p className={styles.hint} role="status">
            ثبت‌نام آنلاین به‌زودی در دسترس قرار می‌گیرد. فعلاً می‌توانید با
            حساب دمو وارد شوید.
          </p>
        ) : null}

        <p className={styles.demoHint}>
          ورود آزمایشی:{' '}
          <span dir="ltr">{DEMO_CUSTOMER.identifierOptions[0]}</span>
          {' / '}
          <span dir="ltr">{DEMO_CUSTOMER.password}</span>
        </p>
      </div>
    </Reveal>
  );
}

function OrderCard({
  order,
  expanded,
  onToggle,
}: {
  order: CustomerOrderSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <li className={`${styles.orderCard} ${expanded ? styles.orderExpanded : ''}`}>
      <div className={styles.orderTop}>
        <div className={styles.orderIdentity}>
          <span className={styles.orderNumber} dir="ltr">
            #{order.orderNumber}
          </span>
          <span className={styles.orderDate}>
            {formatCustomerOrderDate(order.createdAt)}
          </span>
        </div>
        <span
          className={`${styles.orderStatus} ${styles[`status_${order.status}`]}`}
        >
          {CUSTOMER_ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className={styles.orderBody}>
        <p className={styles.orderItems}>
          محصولات: {toPersianItemCount(order.itemCount)} مورد
        </p>
        <p className={styles.orderTotal}>
          {formatPrice(order.total)} تومان
        </p>
      </div>

      <button
        type="button"
        className={styles.orderAction}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {expanded ? 'بستن جزئیات' : 'مشاهده سفارش'}
        <ChevronLeft size={16} strokeWidth={1.7} aria-hidden="true" />
      </button>

      {expanded ? (
        <div className={styles.orderDetail} role="region">
          <p>
            شماره سفارش: <span dir="ltr">{order.orderNumber}</span>
          </p>
          <p>وضعیت: {CUSTOMER_ORDER_STATUS_LABELS[order.status]}</p>
          <p>
            تعداد اقلام: {toPersianItemCount(order.itemCount)} مورد
          </p>
          <p>مبلغ کل: {formatPrice(order.total)} تومان</p>
          <p className={styles.orderDetailNote}>
            صفحه جزئیات سفارش پس از اتصال به سامانه سفارش‌ها فعال می‌شود.
          </p>
        </div>
      ) : null}
    </li>
  );
}

function ProfileAccount() {
  const { customer, session, logout, updateProfile } = useProfileAuth();
  const { itemCount: wishlistCount } = useWishlist();
  const { itemCount: cartCount } = useCart();

  const [section, setSection] = useState<AccountSection>('overview');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [editErrors, setEditErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
  }>({});
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setName(customer.name);
    setPhone(customer.phone ?? '');
    setEmail(customer.email ?? '');
    setAddress(customer.address ?? '');
  }, [customer]);

  if (!customer || !session) return null;

  const orders = getCustomerOrders(customer.id);
  const memberSince = formatMemberSince(session.signedInAt);
  const orderTotalSpent = orders
    .filter((order) => order.status !== 'cancelled')
    .reduce((sum, order) => sum + order.total, 0);

  const openEdit = () => {
    setSection('account');
    setEditing(true);
    setName(customer.name);
    setPhone(customer.phone ?? '');
    setEmail(customer.email ?? '');
    setAddress(customer.address ?? '');
    setEditErrors({});
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof editErrors = {};
    if (!name.trim()) nextErrors.name = 'نام را وارد کنید.';
    if (!phone.trim() && !email.trim()) {
      nextErrors.phone = 'شماره موبایل یا ایمیل را وارد کنید.';
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'ایمیل معتبر نیست.';
    }
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    updateProfile({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
    });
    setEditing(false);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  const navItems: Array<{
    id: AccountSection;
    label: string;
    icon: typeof Package;
  }> = [
    { id: 'overview', label: 'نمای کلی', icon: UserRound },
    { id: 'orders', label: 'سفارش‌ها', icon: Package },
    { id: 'wishlist', label: 'علاقه‌مندی‌ها', icon: Heart },
    { id: 'cart', label: 'سبد خرید', icon: ShoppingBag },
    { id: 'account', label: 'اطلاعات حساب', icon: Pencil },
  ];

  return (
    <div className={styles.accountLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.identityCard}>
          <div className={styles.avatar} aria-hidden="true">
            {getInitials(customer.name)}
          </div>
          <div className={styles.identityCopy}>
            <p className={styles.identityEyebrow}>حساب کاربری</p>
            <h1 className={styles.identityName}>{customer.name}</h1>
            <p className={styles.identityContact} dir="ltr">
              {customer.phone ?? customer.email ?? customer.identifier}
            </p>
            {customer.email && customer.phone ? (
              <p className={styles.identitySecondary} dir="ltr">
                {customer.email}
              </p>
            ) : null}
            {memberSince ? (
              <p className={styles.memberSince}>عضویت از {memberSince}</p>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.editChip}
            onClick={openEdit}
          >
            <Pencil size={14} strokeWidth={1.7} aria-hidden="true" />
            ویرایش پروفایل
          </button>
        </div>

        <nav className={styles.sideNav} aria-label="بخش‌های حساب">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.sideNavItem} ${
                  section === item.id ? styles.sideNavActive : ''
                }`}
                onClick={() => {
                  setSection(item.id);
                  if (item.id === 'account') setEditing(true);
                }}
                aria-current={section === item.id ? 'page' : undefined}
              >
                <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            className={`${styles.sideNavItem} ${styles.sideNavDanger}`}
            onClick={logout}
          >
            <LogOut size={17} strokeWidth={1.6} aria-hidden="true" />
            <span>خروج</span>
          </button>
        </nav>
      </aside>

      <div className={styles.mainColumn}>
        {savedFlash ? (
          <p className={styles.savedFlash} role="status">
            اطلاعات حساب ذخیره شد.
          </p>
        ) : null}

        {(section === 'overview' || section === 'orders') && (
          <Reveal variant="subtle" className={styles.panel}>
            {section === 'overview' ? (
              <>
                <header className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>نمای کلی حساب</h2>
                    <p className={styles.panelLead}>
                      وضعیت خرید و دسترسی سریع به بخش‌های مهم.
                    </p>
                  </div>
                </header>

                <div className={styles.statGrid}>
                  <button
                    type="button"
                    className={styles.statCard}
                    onClick={() => setSection('orders')}
                  >
                    <Package size={18} strokeWidth={1.6} aria-hidden="true" />
                    <strong>{toPersianItemCount(orders.length)}</strong>
                    <span>سفارش</span>
                  </button>
                  <button
                    type="button"
                    className={styles.statCard}
                    onClick={() => setSection('wishlist')}
                  >
                    <Heart size={18} strokeWidth={1.6} aria-hidden="true" />
                    <strong>{toPersianItemCount(wishlistCount)}</strong>
                    <span>علاقه‌مندی</span>
                  </button>
                  <button
                    type="button"
                    className={styles.statCard}
                    onClick={() => setSection('cart')}
                  >
                    <ShoppingBag size={18} strokeWidth={1.6} aria-hidden="true" />
                    <strong>{toPersianItemCount(cartCount)}</strong>
                    <span>سبد خرید</span>
                  </button>
                  <div className={styles.statCard}>
                    <Store size={18} strokeWidth={1.6} aria-hidden="true" />
                    <strong>
                      {orderTotalSpent > 0
                        ? formatPrice(orderTotalSpent)
                        : '۰'}
                    </strong>
                    <span>مجموع خرید (تومان)</span>
                  </div>
                </div>

                <div className={styles.shortcutGrid}>
                  <button
                    type="button"
                    className={styles.shortcutCard}
                    onClick={() => setSection('orders')}
                  >
                    <div>
                      <strong>سفارش‌های من</strong>
                      <span>
                        {orders.length > 0
                          ? `${toPersianItemCount(orders.length)} سفارش اخیر`
                          : 'هنوز سفارشی ثبت نشده'}
                      </span>
                    </div>
                    <ChevronLeft size={18} aria-hidden="true" />
                  </button>
                  <Link to="/wishlist" className={styles.shortcutCard}>
                    <div>
                      <strong>علاقه‌مندی‌ها</strong>
                      <span>
                        {wishlistCount > 0
                          ? `${toPersianItemCount(wishlistCount)} محصول ذخیره شده`
                          : 'لیست علاقه‌مندی خالی است'}
                      </span>
                    </div>
                    <ChevronLeft size={18} aria-hidden="true" />
                  </Link>
                  <Link to="/cart" className={styles.shortcutCard}>
                    <div>
                      <strong>سبد خرید</strong>
                      <span>
                        {cartCount > 0
                          ? `${toPersianItemCount(cartCount)} محصول آماده خرید`
                          : 'سبد خرید خالی است'}
                      </span>
                    </div>
                    <ChevronLeft size={18} aria-hidden="true" />
                  </Link>
                </div>
              </>
            ) : null}

            <section
              className={styles.ordersBlock}
              aria-labelledby="profile-orders-title"
            >
              <div className={styles.sectionHeading}>
                <h2 id="profile-orders-title" className={styles.panelTitle}>
                  سفارش‌های من
                </h2>
                <p className={styles.panelLead}>
                  پیگیری وضعیت و جزئیات سفارش‌های اخیر
                </p>
              </div>

              {orders.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon} aria-hidden="true">
                    <Package size={22} strokeWidth={1.5} />
                  </span>
                  <h3>هنوز سفارشی ثبت نکرده‌اید</h3>
                  <p>
                    اولین انتخابتان را از مجموعه لوکسورا پیدا کنید.
                  </p>
                  <Link to="/shop" className={styles.primaryButton}>
                    مشاهده فروشگاه
                  </Link>
                </div>
              ) : (
                <ul className={styles.orderList}>
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      expanded={expandedOrderId === order.id}
                      onToggle={() =>
                        setExpandedOrderId((current) =>
                          current === order.id ? null : order.id,
                        )
                      }
                    />
                  ))}
                </ul>
              )}
            </section>
          </Reveal>
        )}

        {section === 'wishlist' ? (
          <Reveal variant="subtle" className={styles.panel}>
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true">
                <Heart size={22} strokeWidth={1.5} />
              </span>
              <h3>علاقه‌مندی‌های شما</h3>
              <p>
                {wishlistCount > 0
                  ? `${toPersianItemCount(wishlistCount)} محصول ذخیره شده — برای ادامه خرید به لیست علاقه‌مندی‌ها بروید.`
                  : 'هنوز چیزی به علاقه‌مندی‌ها اضافه نکرده‌اید.'}
              </p>
              <Link
                to={wishlistCount > 0 ? '/wishlist' : '/shop'}
                className={styles.primaryButton}
              >
                {wishlistCount > 0 ? 'مشاهده علاقه‌مندی‌ها' : 'کشف محصولات'}
              </Link>
            </div>
          </Reveal>
        ) : null}

        {section === 'cart' ? (
          <Reveal variant="subtle" className={styles.panel}>
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true">
                <ShoppingBag size={22} strokeWidth={1.5} />
              </span>
              <h3>سبد خرید شما</h3>
              <p>
                {cartCount > 0
                  ? `${toPersianItemCount(cartCount)} محصول آماده خرید است.`
                  : 'سبد خرید شما منتظر انتخاب‌های شماست.'}
              </p>
              <Link
                to={cartCount > 0 ? '/cart' : '/shop'}
                className={styles.primaryButton}
              >
                {cartCount > 0 ? 'مشاهده سبد' : 'شروع خرید'}
              </Link>
            </div>
          </Reveal>
        ) : null}

        {section === 'account' ? (
          <Reveal variant="subtle" className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>اطلاعات حساب</h2>
                <p className={styles.panelLead}>
                  مشخصات تماس برای پیگیری سفارش‌ها
                </p>
              </div>
              {!editing ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setEditing(true)}
                >
                  ویرایش
                </button>
              ) : null}
            </header>

            {editing ? (
              <form className={styles.editForm} onSubmit={handleSave} noValidate>
                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <label htmlFor="profile-name">نام و نام خانوادگی</label>
                    <input
                      id="profile-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      aria-invalid={Boolean(editErrors.name)}
                      onChange={(event) => setName(event.target.value)}
                    />
                    {editErrors.name ? (
                      <p className={styles.fieldError} role="alert">
                        {editErrors.name}
                      </p>
                    ) : null}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="profile-phone">شماره موبایل</label>
                    <input
                      id="profile-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      dir="ltr"
                      value={phone}
                      aria-invalid={Boolean(editErrors.phone)}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                    {editErrors.phone ? (
                      <p className={styles.fieldError} role="alert">
                        {editErrors.phone}
                      </p>
                    ) : null}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="profile-email">ایمیل</label>
                    <input
                      id="profile-email"
                      type="email"
                      autoComplete="email"
                      dir="ltr"
                      value={email}
                      aria-invalid={Boolean(editErrors.email)}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                    {editErrors.email ? (
                      <p className={styles.fieldError} role="alert">
                        {editErrors.email}
                      </p>
                    ) : null}
                  </div>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label htmlFor="profile-address">آدرس</label>
                    <input
                      id="profile-address"
                      type="text"
                      autoComplete="street-address"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                    />
                  </div>
                </div>
                <p className={styles.hint}>
                  تغییرات در این نسخه به‌صورت محلی ذخیره می‌شوند و برای اتصال
                  به سرور آماده هستند.
                </p>
                <div className={styles.formActions}>
                  <button type="submit" className={styles.primaryButton}>
                    ذخیره تغییرات
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => {
                      setEditing(false);
                      setName(customer.name);
                      setPhone(customer.phone ?? '');
                      setEmail(customer.email ?? '');
                      setAddress(customer.address ?? '');
                      setEditErrors({});
                    }}
                  >
                    انصراف
                  </button>
                </div>
              </form>
            ) : (
              <dl className={styles.detailList}>
                <div>
                  <dt>نام</dt>
                  <dd>{customer.name}</dd>
                </div>
                <div>
                  <dt>موبایل</dt>
                  <dd dir="ltr">{customer.phone || '—'}</dd>
                </div>
                <div>
                  <dt>ایمیل</dt>
                  <dd dir="ltr">{customer.email || '—'}</dd>
                </div>
                <div>
                  <dt>آدرس</dt>
                  <dd>{customer.address || '—'}</dd>
                </div>
              </dl>
            )}
          </Reveal>
        ) : null}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { isAuthenticated } = useProfileAuth();

  return (
    <div className={styles.page} dir="rtl">
      {isAuthenticated ? <ProfileAccount /> : <ProfileLogin />}
    </div>
  );
}
