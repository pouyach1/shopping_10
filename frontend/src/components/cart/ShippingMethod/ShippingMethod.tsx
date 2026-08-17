import {
  Check,
  ChevronLeft,
  Clock3,
  Package,
  ShieldCheck,
  Truck,
  Zap,
} from 'lucide-react';

import {
  SHIPPING_METHODS,
  type ShippingMethodId,
} from '../types';

import styles from './ShippingMethod.module.css';

interface ShippingMethodProps {
  value: ShippingMethodId;
  onChange: (value: ShippingMethodId) => void;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('fa-IR').format(value);
}

function getMethodIcon(id: ShippingMethodId) {
  switch (id) {
    case 'tipax':
      return <Package size={21} strokeWidth={1.55} />;

    case 'express':
      return <Zap size={21} strokeWidth={1.55} />;

    case 'post-regular':
      return <Truck size={21} strokeWidth={1.55} />;

    case 'post-express':
    default:
      return <Truck size={21} strokeWidth={1.55} />;
  }
}

function getBadge(id: ShippingMethodId) {
  switch (id) {
    case 'express':
      return {
        label: 'سریع‌ترین',
        tone: 'fast',
      };

    case 'post-express':
      return {
        label: 'پیشنهاد ما',
        tone: 'recommended',
      };

    case 'tipax':
      return {
        label: 'محبوب',
        tone: 'popular',
      };

    default:
      return null;
  }
}

function getAccent(id: ShippingMethodId) {
  switch (id) {
    case 'express':
      return styles.accentFast;

    case 'tipax':
      return styles.accentPopular;

    case 'post-regular':
      return styles.accentRegular;

    case 'post-express':
    default:
      return styles.accentRecommended;
  }
}

export function ShippingMethod({
  value,
  onChange,
}: ShippingMethodProps) {
  return (
    <section className={styles.section} dir="rtl">
      <header className={styles.header}>
        <div className={styles.headerVisual}>
          <div className={styles.headerIcon}>
            <Truck size={20} strokeWidth={1.45} />
          </div>

          <span className={styles.headerGlow} />
        </div>

        <div className={styles.headerContent}>
          <div className={styles.eyebrow}>
            DELIVERY OPTIONS
          </div>

          <div className={styles.titleRow}>
            <h2 className={styles.title}>
              روش ارسال
            </h2>

            <span className={styles.headerCount}>
              {SHIPPING_METHODS.length} روش
            </span>
          </div>

          <p className={styles.subtitle}>
            بهترین روش دریافت سفارش خود را انتخاب کنید.
          </p>
        </div>
      </header>

      <div className={styles.options}>
        {SHIPPING_METHODS.map((method, index) => {
          const selected = method.id === value;
          const badge = getBadge(method.id);

          return (
            <button
              key={method.id}
              type="button"
              className={`${styles.option} ${
                selected ? styles.selected : ''
              }`}
              onClick={() => onChange(method.id)}
              aria-pressed={selected}
              style={{
                '--item-index': index,
              } as React.CSSProperties}
            >
              <span
                className={`${styles.optionAccent} ${getAccent(
                  method.id,
                )}`}
              />

              <span className={styles.optionMain}>
                <span className={styles.iconColumn}>
                  <span
                    className={`${styles.methodIcon} ${
                      selected
                        ? styles.methodIconSelected
                        : ''
                    }`}
                  >
                    {getMethodIcon(method.id)}
                  </span>

                  {selected && (
                    <span className={styles.selectedCheck}>
                      <Check
                        size={10}
                        strokeWidth={2.5}
                      />
                    </span>
                  )}
                </span>

                <span className={styles.methodInfo}>
                  <span className={styles.nameRow}>
                    <span className={styles.name}>
                      {method.title}
                    </span>

                    {badge && (
                      <span
                        className={`${styles.badge} ${
                          styles[`badge${badge.tone
                            .charAt(0)
                            .toUpperCase()}${badge.tone.slice(
                            1,
                          )}`]
                        }`}
                      >
                        {badge.label}
                      </span>
                    )}
                  </span>

                  <span className={styles.description}>
                    {method.description}
                  </span>

                  <span className={styles.deliveryInfo}>
                    <span className={styles.deliveryInfoItem}>
                      <Clock3
                        size={12}
                        strokeWidth={1.6}
                      />

                      <span>
                        زمان تقریبی تحویل
                      </span>
                    </span>
                  </span>
                </span>

                <span className={styles.priceColumn}>
                  <span className={styles.priceLabel}>
                    هزینه ارسال
                  </span>

                  <span className={styles.price}>
                    {method.price === 0 ? (
                      <strong className={styles.freePrice}>
                        رایگان
                      </strong>
                    ) : (
                      <>
                        <strong>
                          {formatPrice(method.price)}
                        </strong>

                        <small>
                          تومان
                        </small>
                      </>
                    )}
                  </span>

                  <span
                    className={`${styles.radio} ${
                      selected
                        ? styles.radioSelected
                        : ''
                    }`}
                  >
                    {selected ? (
                      <Check
                        size={12}
                        strokeWidth={2.4}
                      />
                    ) : null}
                  </span>
                </span>
              </span>

              <span className={styles.optionBottom}>
                <span className={styles.bottomText}>
                  انتخاب این روش ارسال
                </span>

                <ChevronLeft
                  size={16}
                  strokeWidth={1.5}
                  className={styles.arrow}
                />
              </span>
            </button>
          );
        })}
      </div>

      <footer className={styles.footer}>
        <span className={styles.footerIcon}>
          <ShieldCheck
            size={14}
            strokeWidth={1.55}
          />
        </span>

        <span className={styles.footerText}>
          هزینه ارسال پس از انتخاب روش، به مبلغ نهایی
          سفارش اضافه می‌شود.
        </span>

        <span className={styles.footerLine} />
      </footer>
    </section>
  );
}