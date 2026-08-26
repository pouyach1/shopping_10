import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

import { Reveal } from '../../components/ui/Reveal';
import { useProfileAuth } from '../../hooks/useProfileAuth';
import {
  DEMO_CUSTOMER,
  ProfileAuthError,
  PROFILE_AUTH_MESSAGES,
} from '../../services/profileAuth';

import { ProfileAccountHub } from './ProfileAccountHub';
import { ProfileAccountInfo } from './ProfileAccountInfo';
import { ProfileCart } from './ProfileCart';
import { ProfileHome } from './ProfileHome';
import { ProfileOrders } from './ProfileOrders';
import { ProfileWishlist } from './ProfileWishlist';

import styles from './ProfilePage.module.css';

type FieldErrors = {
  identifier?: string;
  password?: string;
  form?: string;
};

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
              بازیابی رمز عبور هنوز فعال نشده است. برای ورود آزمایشی از حساب دمو
              استفاده کنید.
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
            ثبت‌نام آنلاین به‌زودی در دسترس قرار می‌گیرد. فعلاً می‌توانید با حساب
            دمو وارد شوید.
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

const LEGACY_SECTION_REDIRECTS: Record<string, string> = {
  orders: '/profile/orders',
  wishlist: '/profile/wishlist',
  cart: '/profile/cart',
  account: '/profile/account',
};

function ProfileIndex() {
  const [params] = useSearchParams();
  const legacyPath = LEGACY_SECTION_REDIRECTS[params.get('section') ?? ''];
  if (legacyPath) return <Navigate to={legacyPath} replace />;
  return <ProfileHome />;
}

export function ProfilePage() {
  const { isAuthenticated } = useProfileAuth();

  return (
    <div className={styles.page} dir="rtl">
      {isAuthenticated ? (
        <Routes>
          <Route element={<ProfileAccountHub />}>
            <Route index element={<ProfileIndex />} />
            <Route path="orders" element={<ProfileOrders />} />
            <Route path="wishlist" element={<ProfileWishlist />} />
            <Route path="cart" element={<ProfileCart />} />
            <Route path="account" element={<ProfileAccountInfo />} />
            <Route path="*" element={<Navigate to="/profile" replace />} />
          </Route>
        </Routes>
      ) : (
        <ProfileLogin />
      )}
    </div>
  );
}
