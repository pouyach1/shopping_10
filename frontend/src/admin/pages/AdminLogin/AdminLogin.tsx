import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { loginAdmin, useAdminAuth } from '../../hooks/useAdminAuth';

import styles from './AdminLogin.module.css';

export function AdminLogin() {
  const { isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('لطفاً ایمیل و رمز عبور را وارد کنید.');
      return;
    }

    setError('');
    loginAdmin();
    navigate('/admin', { replace: true });
  };

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.card}>
        <header className={styles.header}>
          <span className={styles.brand}>LUXORA</span>
          <h1 className={styles.title}>ورود به پنل مدیریت</h1>
          <p className={styles.subtitle}>
            برای دسترسی به داشبورد فروشگاه وارد شوید.
          </p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            <span>ایمیل یا نام کاربری</span>
            <input
              type="text"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@luxora.ir"
            />
          </label>

          <label className={styles.field}>
            <span>رمز عبور</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className={styles.submit}>
            ورود
          </button>
        </form>

        <p className={styles.hint}>
          نسخه دمو — هر ایمیل و رمز عبور غیرخالی برای ورود کافی است.
        </p>
      </div>
    </div>
  );
}
