import {
  Check,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import {
  PAYMENT_METHODS,
  type PaymentMethodId,
} from '../types';
import styles from './PaymentMethod.module.css';

interface PaymentMethodProps {
  value: PaymentMethodId;
  onChange: (value: PaymentMethodId) => void;
}

export function PaymentMethod({
  value,
  onChange,
}: PaymentMethodProps) {
  return (
    <section className={styles.section} dir="rtl">
      <div className={styles.header}>
        <div className={styles.icon}>
          <CreditCard size={19} strokeWidth={1.5} />
        </div>

        <div>
          <h2 className={styles.title}>روش پرداخت</h2>
          <p className={styles.subtitle}>
            روش پرداخت سفارش خود را انتخاب کنید.
          </p>
        </div>
      </div>

      <div className={styles.options}>
        {PAYMENT_METHODS.map((method) => {
          const selected = method.id === value;

          return (
            <button
              key={method.id}
              type="button"
              className={`${styles.option} ${
                selected ? styles.selected : ''
              }`}
              onClick={() => onChange(method.id)}
              aria-pressed={selected}
            >
              <span className={styles.radio}>
                {selected && (
                  <Check size={13} strokeWidth={2} />
                )}
              </span>

              <span className={styles.methodIcon}>
                {method.id === 'zarinpal' ? (
                  <ShieldCheck size={20} strokeWidth={1.4} />
                ) : (
                  <CreditCard size={20} strokeWidth={1.4} />
                )}
              </span>

              <span className={styles.content}>
                <span className={styles.name}>
                  {method.title}
                </span>

                <span className={styles.description}>
                  {method.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.security}>
        <ShieldCheck size={15} strokeWidth={1.5} />
        <span>
          اطلاعات کارت بانکی در این سایت ذخیره نمی‌شود.
        </span>
      </div>
    </section>
  );
}
