import { useMemo } from 'react';
import iranCity from 'iran-city';
import type { CustomerData } from '../../../types/user';
import styles from './CustomerForm.module.css';

interface CustomerFormProps {
  data: CustomerData;
  onChange: (data: CustomerData) => void;
}

export function CustomerForm({ data, onChange }: CustomerFormProps) {
  const provinces = useMemo(() => iranCity.allProvinces(), []);

  const cities = useMemo(() => {
    if (!data.province) return [];
    return iranCity.citiesOfProvince(Number(data.province));
  }, [data.province]);

  const updateField = (field: keyof CustomerData, value: string) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  return (
    <section className={styles.section} dir="rtl">
      <h2 className={styles.title}>اطلاعات خریدار</h2>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>اطلاعات گیرنده</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="checkout-first-name">نام</label>
            <input
              id="checkout-first-name"
              name="given-name"
              autoComplete="given-name"
              value={data.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="checkout-last-name">نام خانوادگی</label>
            <input
              id="checkout-last-name"
              name="family-name"
              autoComplete="family-name"
              value={data.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="checkout-phone">شماره موبایل</label>
            <input
              id="checkout-phone"
              name="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              value={data.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="checkout-email">ایمیل (اختیاری)</label>
            <input
              id="checkout-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              value={data.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>آدرس ارسال</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="checkout-province">استان</label>
            <select
              id="checkout-province"
              name="address-level1"
              autoComplete="address-level1"
              value={data.province}
              onChange={(e) => {
                onChange({
                  ...data,
                  province: e.target.value,
                  city: '',
                });
              }}
            >
              <option value="">انتخاب استان</option>
              {provinces.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="checkout-city">شهر</label>
            <select
              id="checkout-city"
              name="address-level2"
              autoComplete="address-level2"
              value={data.city}
              disabled={!data.province}
              onChange={(e) => updateField('city', e.target.value)}
            >
              <option value="">انتخاب شهر</option>
              {cities.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className={`${styles.field} ${styles.full}`}>
            <label htmlFor="checkout-address">آدرس</label>
            <textarea
              id="checkout-address"
              name="street-address"
              autoComplete="street-address"
              value={data.address}
              onChange={(e) => updateField('address', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="checkout-postal">کد پستی</label>
            <input
              id="checkout-postal"
              name="postal-code"
              inputMode="numeric"
              autoComplete="postal-code"
              dir="ltr"
              value={data.postalCode}
              onChange={(e) => updateField('postalCode', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="checkout-landline">تلفن ثابت (اختیاری)</label>
            <input
              id="checkout-landline"
              name="tel-national"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              dir="ltr"
              value={data.landline}
              onChange={(e) => updateField('landline', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>توضیحات</h3>
        <div className={styles.grid}>
          <div className={`${styles.field} ${styles.full}`}>
            <label htmlFor="checkout-notes">توضیحات سفارش (اختیاری)</label>
            <textarea
              id="checkout-notes"
              name="order-notes"
              value={data.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
