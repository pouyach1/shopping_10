import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Heart,
  LogOut,
  Package,
  Pencil,
  UserRound,
  X,
} from 'lucide-react';

import { useProfileAuth } from '../../hooks/useProfileAuth';
import { formatPrice } from '../../lib/formatCurrency';
import { Reveal } from '../../components/ui/Reveal';
import {
  DEMO_CUSTOMER,
  ProfileAuthError,
  PROFILE_AUTH_MESSAGES,
} from '../../services/profileAuth';
import {
  CUSTOMER_ORDER_STATUS_LABELS,
  formatCustomerOrderDate,
  getCustomerOrders,
} from '../../services/customerOrders';

import styles from './ProfilePage.module.css';

type FieldErrors = {
  identifier?: string;
  password?: string;
  form?: string;
};

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
  const errorId = `${formId}-error`;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotHint, setShowForgotHint] = useState(false);
  const [showRegisterHint, setShowRegisterHint] = useState(false);
  const [success, setSuccess] = useState(false);
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

    if (nextErrors.identifier || nextErrors.password) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ identifier, password, remember });
      setSuccess(true);
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
    <Reveal variant="subtle" className={styles.shell}>
      <div
        className={`${styles.card} ${success ? styles.cardSuccess : ''}`}
        aria-busy={isSubmitting}
      >
        <header className={styles.header}>
          <span className={styles.eyebrow}>LUXORA</span>
          <h1 className={styles.title}>ورود به حساب کاربری</h1>
          <p className={styles.subtitle}>
            مدیریت سفارش‌ها و علاقه‌مندی‌های شما در یک نگاه.
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
              enterKeyHint="next"
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
                enterKeyHint="done"
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
            <p id={errorId} className={styles.formError} role="alert">
              {errors.form}
            </p>
          ) : null}

          <button
            type="submit"
            className={styles.submit}
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

function ProfileAccount() {
  const { customer, logout, updateProfile } = useProfileAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer?.name ?? '');
  const [savedFlash, setSavedFlash] = useState(false);

  if (!customer) return null;

  const orders = getCustomerOrders(customer.id);

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    updateProfile({ name: trimmed });
    setEditing(false);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <Reveal variant="subtle" className={styles.shellWide}>
      <div className={styles.account}>
        <header className={styles.accountHeader}>
          <div className={styles.avatar} aria-hidden="true">
            {getInitials(customer.name)}
          </div>
          <div className={styles.accountMeta}>
            <h1 className={styles.accountName}>{customer.name}</h1>
            <p className={styles.accountIdentifier} dir="ltr">
              {customer.phone ?? customer.email ?? customer.identifier}
            </p>
            {customer.email && customer.phone ? (
              <p className={styles.accountSecondary} dir="ltr">
                {customer.email}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.editButton}
            onClick={() => {
              setName(customer.name);
              setEditing((open) => !open);
            }}
            aria-expanded={editing}
          >
            {editing ? (
              <X size={16} strokeWidth={1.6} aria-hidden="true" />
            ) : (
              <Pencil size={16} strokeWidth={1.6} aria-hidden="true" />
            )}
            {editing ? 'بستن' : 'ویرایش'}
          </button>
        </header>

        {savedFlash ? (
          <p className={styles.savedFlash} role="status">
            اطلاعات حساب به‌روزرسانی شد.
          </p>
        ) : null}

        {editing ? (
          <form className={styles.editForm} onSubmit={handleSave}>
            <label className={styles.field}>
              <span>نام نمایشی</span>
              <input
                type="text"
                value={name}
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <p className={styles.hint}>
              تغییرات فقط در این مرورگر ذخیره می‌شوند (حالت نمایشی).
            </p>
            <button type="submit" className={styles.submit}>
              ذخیره تغییرات
            </button>
          </form>
        ) : null}

        <nav className={styles.quickActions} aria-label="دسترسی سریع">
          <a href="#orders" className={styles.actionCard}>
            <Package size={18} strokeWidth={1.6} aria-hidden="true" />
            <span>سفارش‌های من</span>
          </a>
          <Link to="/wishlist" className={styles.actionCard}>
            <Heart size={18} strokeWidth={1.6} aria-hidden="true" />
            <span>علاقه‌مندی‌ها</span>
          </Link>
          <button
            type="button"
            className={styles.actionCard}
            onClick={() => {
              setName(customer.name);
              setEditing(true);
            }}
          >
            <UserRound size={18} strokeWidth={1.6} aria-hidden="true" />
            <span>اطلاعات حساب</span>
          </button>
          <button
            type="button"
            className={`${styles.actionCard} ${styles.actionDanger}`}
            onClick={logout}
          >
            <LogOut size={18} strokeWidth={1.6} aria-hidden="true" />
            <span>خروج</span>
          </button>
        </nav>

        <section
          id="orders"
          className={styles.orders}
          aria-labelledby="profile-orders-title"
        >
          <div className={styles.sectionHeading}>
            <h2 id="profile-orders-title">سفارش‌های من</h2>
            <p>خلاصه سفارش‌های اخیر شما</p>
          </div>

          {orders.length === 0 ? (
            <p className={styles.emptyOrders}>هنوز سفارشی ثبت نشده است.</p>
          ) : (
            <ul className={styles.orderList}>
              {orders.map((order) => (
                <li key={order.id} className={styles.orderItem}>
                  <div className={styles.orderMain}>
                    <span className={styles.orderNumber} dir="ltr">
                      {order.orderNumber}
                    </span>
                    <span className={styles.orderDate}>
                      {formatCustomerOrderDate(order.createdAt)}
                    </span>
                  </div>
                  <div className={styles.orderMeta}>
                    <span className={styles.orderTotal}>
                      {formatPrice(order.total)} تومان
                    </span>
                    <span
                      className={`${styles.orderStatus} ${styles[`status_${order.status}`]}`}
                    >
                      {CUSTOMER_ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Reveal>
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
