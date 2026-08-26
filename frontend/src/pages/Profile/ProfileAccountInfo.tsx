import { type FormEvent, useState } from 'react';

import { useProfileAuth } from '../../hooks/useProfileAuth';
import type { CustomerProfile } from '../../services/profileAuth';

import { ProfileSection } from './ProfileSection';

import styles from './ProfileAccountHub.module.css';

export function ProfileAccountInfo() {
  const { customer, updateProfile } = useProfileAuth();
  if (!customer) return null;
  return (
    <AccountInfoForm
      key={customer.id}
      customer={customer}
      updateProfile={updateProfile}
    />
  );
}

function AccountInfoForm({
  customer,
  updateProfile,
}: {
  customer: CustomerProfile;
  updateProfile: ReturnType<typeof useProfileAuth>['updateProfile'];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [email, setEmail] = useState(customer.email ?? '');
  const [address, setAddress] = useState(customer.address ?? '');
  const [editErrors, setEditErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
  }>({});
  const [savedFlash, setSavedFlash] = useState(false);

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

  return (
    <ProfileSection lead="مشخصات تماس برای پیگیری سفارش‌ها">
      {savedFlash ? (
        <p className={styles.savedFlash} role="status">
          اطلاعات حساب ذخیره شد.
        </p>
      ) : null}

      {!editing ? (
        <div className={styles.accountToolbar}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setEditing(true)}
          >
            ویرایش
          </button>
        </div>
      ) : null}

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
            تغییرات در این نسخه به‌صورت محلی ذخیره می‌شوند و برای اتصال به سرور
            آماده هستند.
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
    </ProfileSection>
  );
}
