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

interface OrderSummaryProps {
  subtotal: number;
  shipping: number;
  total: number;
  customer: CustomerData;
  shippingMethod: ShippingMethodId;
  paymentMethod: PaymentMethodId;
}

export function OrderSummary({
  subtotal,
  shipping,
  total,
  customer,
  shippingMethod,
  paymentMethod,
}: OrderSummaryProps) {
  const giftLimit = 2_000_000;
  const remaining = giftLimit - total;

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

  const destination = hasExactAddress
    ? customer.address.trim()
    : [customer.city, customer.province]
        .filter(Boolean)
        .join('، ');

  const hasRecipient =
    Boolean(fullName) ||
    Boolean(customer.phone) ||
    Boolean(destination);

  return (
    <aside className={styles.summary} dir="rtl">
      {/* Header */}
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            ORDER SUMMARY
          </span>

          <h2 className={styles.title}>
            خلاصه سفارش
          </h2>
        </div>

        <div className={styles.headerIcon}>
          <Package
            size={20}
            strokeWidth={1.35}
          />
        </div>
      </header>

      {/* Recipient */}
      <section className={styles.recipientCard}>
        <div className={styles.recipientHeader}>
          <div className={styles.recipientIcon}>
            <UserRound
              size={19}
              strokeWidth={1.45}
            />
          </div>

          <div>
            <span className={styles.sectionEyebrow}>
              RECIPIENT
            </span>

            <h3>
              اطلاعات گیرنده
            </h3>
          </div>
        </div>

        <div className={styles.recipientGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>
              <UserRound
                size={15}
                strokeWidth={1.45}
              />
            </span>

            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>
                نام گیرنده
              </span>

              <strong>
                {fullName || 'هنوز وارد نشده'}
              </strong>
            </div>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>
              <Phone
                size={15}
                strokeWidth={1.45}
              />
            </span>

            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>
                شماره تماس
              </span>

              <strong dir="ltr">
                {customer.phone || 'هنوز وارد نشده'}
              </strong>
            </div>
          </div>
        </div>

        {/* Exact destination */}
        <div className={styles.destination}>
          <div className={styles.destinationTop}>
            <div className={styles.destinationIcon}>
              <MapPin
                size={17}
                strokeWidth={1.45}
              />
            </div>

            <div className={styles.destinationHeading}>
              <span>
                مقصد تحویل
              </span>

              <small>
                آدرس دقیق ثبت‌شده برای ارسال سفارش
              </small>
            </div>

            {hasExactAddress && (
              <span className={styles.addressStatus}>
                <CheckCircle2
                  size={13}
                  strokeWidth={1.8}
                />
                ثبت شده
              </span>
            )}
          </div>

          <div className={styles.addressText}>
            {destination || 'آدرس دقیق هنوز وارد نشده است.'}
          </div>

          {(customer.city ||
            customer.province ||
            customer.postalCode) && (
            <div className={styles.locationMeta}>
              {(customer.city || customer.province) && (
                <span>
                  <MapPin
                    size={12}
                    strokeWidth={1.5}
                  />

                  {[customer.city, customer.province]
                    .filter(Boolean)
                    .join('، ')}
                </span>
              )}

              {customer.postalCode && (
                <span>
                  کد پستی:
                  <strong>
                    {customer.postalCode}
                  </strong>
                </span>
              )}
            </div>
          )}
        </div>

        {!hasRecipient && (
          <div className={styles.emptyRecipient}>
            <MapPin
              size={16}
              strokeWidth={1.4}
            />

            <span>
              اطلاعات گیرنده و مقصد پس از تکمیل فرم اینجا نمایش داده می‌شود.
            </span>
          </div>
        )}
      </section>

      {/* Selected methods */}
      <section className={styles.methods}>
        <div className={styles.methodCard}>
          <div className={styles.methodIcon}>
            <Truck
              size={17}
              strokeWidth={1.45}
            />
          </div>

          <div className={styles.methodContent}>
            <span>
              روش ارسال
            </span>

            <strong>
              {selectedShipping?.title || 'انتخاب نشده'}
            </strong>
          </div>

          <ArrowLeft
            className={styles.methodArrow}
            size={15}
            strokeWidth={1.4}
          />
        </div>

        <div className={styles.methodCard}>
          <div className={styles.methodIcon}>
            <CreditCard
              size={17}
              strokeWidth={1.45}
            />
          </div>

          <div className={styles.methodContent}>
            <span>
              روش پرداخت
            </span>

            <strong>
              {selectedPayment?.title || 'انتخاب نشده'}
            </strong>
          </div>

          <ArrowLeft
            className={styles.methodArrow}
            size={15}
            strokeWidth={1.4}
          />
        </div>
      </section>

      {/* Price breakdown */}
      <section className={styles.pricing}>
        <div className={styles.priceRow}>
          <span>
            مبلغ کالاها
          </span>

          <strong>
            {formatPrice(subtotal)}
            <small> تومان</small>
          </strong>
        </div>

        <div className={styles.priceRow}>
          <span>
            هزینه ارسال
          </span>

          <strong>
            {shipping === 0
              ? 'رایگان'
              : (
                <>
                  {formatPrice(shipping)}
                  <small> تومان</small>
                </>
              )}
          </strong>
        </div>
      </section>

      <div className={styles.divider} />

      {/* Total */}
      <section className={styles.total}>
        <div>
          <span className={styles.totalLabel}>
            مبلغ نهایی
          </span>

          <small>
            شامل هزینه ارسال
          </small>
        </div>

        <strong>
          {formatPrice(total)}
          <small> تومان</small>
        </strong>
      </section>

      {/* Gift */}
      <div
        className={
          remaining <= 0
            ? `${styles.gift} ${styles.giftActive}`
            : styles.gift
        }
      >
        <div className={styles.giftIcon}>
          <Package
            size={16}
            strokeWidth={1.45}
          />
        </div>

        <div>
          <strong>
            {remaining <= 0
              ? 'هدیه ویژه فعال شد'
              : 'هدیه ویژه سفارش'}
          </strong>

          <span>
            {remaining <= 0
              ? 'این سفارش شامل هدیه ویژه فروشگاه می‌شود.'
              : `فقط ${formatPrice(remaining)} تومان تا فعال شدن هدیه ویژه فاصله دارید.`}
          </span>
        </div>
      </div>

      {/* Security */}
      <div className={styles.security}>
        <ShieldCheck
          size={16}
          strokeWidth={1.45}
        />

        <span>
          پرداخت آنلاین امن از طریق درگاه زرین‌پال
        </span>
      </div>

      {/* Checkout */}
      <button
        type="button"
        className={styles.checkout}
      >
        <span>
          ثبت و پرداخت سفارش
        </span>

        <span className={styles.checkoutIcon}>
          <CheckCircle2
            size={17}
            strokeWidth={1.55}
          />
        </span>
      </button>
    </aside>
  );
}