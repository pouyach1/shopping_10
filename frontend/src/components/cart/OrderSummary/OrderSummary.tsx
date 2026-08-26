import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Truck,
  UserRound,
} from 'lucide-react';

import styles from './OrderSummary.module.css';

import {
  SHIPPING_METHODS,
  PAYMENT_METHODS,
  type PaymentMethodId,
  type ShippingMethodId,
} from '../types';
import type { CustomerData } from '../../../types/user';
import { formatPrice } from '../../../lib/formatCurrency';
import { formatCityProvince } from '../../../lib/iranLocations';
import {
  FREE_SHIPPING_THRESHOLD,
  qualifiesForFreeShipping,
} from '../../../config/shipping';

interface OrderSummaryProps {
  subtotal: number;
  shipping: number;
  total: number;
  customer: CustomerData;
  shippingMethod: ShippingMethodId;
  paymentMethod: PaymentMethodId;
  onCheckout?: () => void;
  /** Hide in-flow CTA on small screens when a sticky bar is present. */
  hideMobileCheckout?: boolean;
}

export function OrderSummary({
  subtotal,
  shipping,
  total,
  customer,
  shippingMethod,
  paymentMethod,
  onCheckout,
  hideMobileCheckout = false,
}: OrderSummaryProps) {
  const freeShipping = qualifiesForFreeShipping(subtotal);
  const remainingToFree = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  const selectedShipping = SHIPPING_METHODS.find(
    (method) => method.id === shippingMethod,
  );

  const selectedPayment = PAYMENT_METHODS.find(
    (method) => method.id === paymentMethod,
  );

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(' ');

  /*
   * آدرس دقیق کاربر اولویت دارد.
   * استان و شهر فقط زمانی نمایش داده می‌شوند
   * که آدرس دقیق هنوز وارد نشده باشد.
   */
  const hasExactAddress = Boolean(customer.address?.trim());
  const cityProvince = formatCityProvince(customer.city, customer.province);

  const destination = hasExactAddress
    ? customer.address.trim()
    : cityProvince;

  const hasRecipient =
    Boolean(fullName) ||
    Boolean(customer.phone) ||
    Boolean(destination) ||
    Boolean(cityProvince);

  return (
    <aside className={styles.summary} dir="rtl">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>ORDER SUMMARY</span>
          <h2 className={styles.title}>خلاصه سفارش</h2>
        </div>

        <div className={styles.headerIcon}>
          <Package size={20} strokeWidth={1.35} aria-hidden="true" />
        </div>
      </header>

      {/* Recipient / methods are dense on phone — keep for desktop review. */}
      <section className={`${styles.recipientCard} ${styles.desktopOnlyBlock}`}>
        <div className={styles.recipientHeader}>
          <div className={styles.recipientIcon}>
            <UserRound size={19} strokeWidth={1.45} aria-hidden="true" />
          </div>

          <div>
            <span className={styles.sectionEyebrow}>RECIPIENT</span>
            <h3>اطلاعات گیرنده</h3>
          </div>
        </div>

        <div className={styles.recipientGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>
              <UserRound size={15} strokeWidth={1.45} aria-hidden="true" />
            </span>
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>نام گیرنده</span>
              <strong>{fullName || 'هنوز وارد نشده'}</strong>
            </div>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>
              <Phone size={15} strokeWidth={1.45} aria-hidden="true" />
            </span>
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>شماره تماس</span>
              <strong dir="ltr">{customer.phone || 'هنوز وارد نشده'}</strong>
            </div>
          </div>
        </div>

        <div className={styles.destination}>
          <div className={styles.destinationTop}>
            <div className={styles.destinationIcon}>
              <MapPin size={17} strokeWidth={1.45} aria-hidden="true" />
            </div>
            <div className={styles.destinationHeading}>
              <span>مقصد تحویل</span>
              <small>آدرس دقیق ثبت‌شده برای ارسال سفارش</small>
            </div>
            {hasExactAddress ? (
              <span className={styles.addressStatus}>
                <CheckCircle2 size={13} strokeWidth={1.8} aria-hidden="true" />
                ثبت شده
              </span>
            ) : null}
          </div>

          <div className={styles.addressText}>
            {destination || 'آدرس دقیق هنوز وارد نشده است.'}
          </div>

          {(customer.city || customer.province || customer.postalCode) && (
            <div className={styles.locationMeta}>
              {cityProvince ? (
                <span>
                  <MapPin size={12} strokeWidth={1.5} aria-hidden="true" />
                  {cityProvince}
                </span>
              ) : null}
              {customer.postalCode ? (
                <span>
                  کد پستی:
                  <strong>{customer.postalCode}</strong>
                </span>
              ) : null}
            </div>
          )}
        </div>

        {!hasRecipient ? (
          <div className={styles.emptyRecipient}>
            <MapPin size={16} strokeWidth={1.4} aria-hidden="true" />
            <span>
              اطلاعات گیرنده و مقصد پس از تکمیل فرم اینجا نمایش داده می‌شود.
            </span>
          </div>
        ) : null}
      </section>

      <section className={`${styles.methods} ${styles.desktopOnlyBlock}`}>
        <div className={styles.methodCard}>
          <div className={styles.methodIcon}>
            <Truck size={17} strokeWidth={1.45} aria-hidden="true" />
          </div>
          <div className={styles.methodContent}>
            <span>روش ارسال</span>
            <strong>{selectedShipping?.title || 'انتخاب نشده'}</strong>
          </div>
          <ArrowLeft
            className={styles.methodArrow}
            size={15}
            strokeWidth={1.4}
            aria-hidden="true"
          />
        </div>

        <div className={styles.methodCard}>
          <div className={styles.methodIcon}>
            <CreditCard size={17} strokeWidth={1.45} aria-hidden="true" />
          </div>
          <div className={styles.methodContent}>
            <span>روش پرداخت</span>
            <strong>{selectedPayment?.title || 'انتخاب نشده'}</strong>
          </div>
          <ArrowLeft
            className={styles.methodArrow}
            size={15}
            strokeWidth={1.4}
            aria-hidden="true"
          />
        </div>
      </section>

      <section className={styles.pricing} aria-label="جزئیات مبلغ">
        <div className={styles.priceRow}>
          <span>قیمت محصولات</span>
          <strong>
            {formatPrice(subtotal)}
            <small> تومان</small>
          </strong>
        </div>

        <div className={styles.priceRow}>
          <span>هزینه ارسال</span>
          <strong className={shipping === 0 ? styles.freeShipping : undefined}>
            {shipping === 0 ? (
              'ارسال رایگان'
            ) : (
              <>
                {formatPrice(shipping)}
                <small> تومان</small>
              </>
            )}
          </strong>
        </div>

        <div className={styles.priceRow}>
          <span>تخفیف</span>
          <strong>—</strong>
        </div>
      </section>

      <div className={styles.divider} />

      <section className={styles.total}>
        <div>
          <span className={styles.totalLabel}>مبلغ نهایی</span>
          <small>شامل هزینه ارسال</small>
        </div>
        <strong>
          {formatPrice(total)}
          <small> تومان</small>
        </strong>
      </section>

      <div
        className={
          freeShipping
            ? `${styles.gift} ${styles.giftActive}`
            : styles.gift
        }
        role="status"
      >
        <div className={styles.giftIcon}>
          <Truck size={16} strokeWidth={1.45} aria-hidden="true" />
        </div>
        <div>
          <strong>
            {freeShipping ? 'ارسال رایگان فعال است' : 'ارسال رایگان'}
          </strong>
          <span>
            {freeShipping
              ? 'این سفارش شامل ارسال رایگان می‌شود.'
              : `${formatPrice(remainingToFree)} تومان تا ارسال رایگان`}
          </span>
        </div>
      </div>

      <div className={styles.security}>
        <ShieldCheck size={16} strokeWidth={1.45} aria-hidden="true" />
        <span>پرداخت آنلاین امن از طریق درگاه زرین‌پال</span>
      </div>

      <button
        type="button"
        className={`${styles.checkout} ${
          hideMobileCheckout ? styles.checkoutDesktopOnly : ''
        }`}
        onClick={onCheckout}
      >
        <span>ثبت و پرداخت سفارش</span>
        <span className={styles.checkoutIcon}>
          <CheckCircle2 size={17} strokeWidth={1.55} aria-hidden="true" />
        </span>
      </button>
    </aside>
  );
}
