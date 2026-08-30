import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { CartItem as CartItemComponent } from '../CartItem/CartItem';
import { OrderSummary } from '../OrderSummary/OrderSummary';
import { CustomerForm } from '../CustomerForm/CustomerForm';
import { ShippingMethod } from '../ShippingMethod/ShippingMethod';
import { PaymentMethod } from '../PaymentMethod/PaymentMethod';
import { EmptyCart } from '../EmptyCart/EmptyCart';

import {
  EMPTY_CUSTOMER,
  SHIPPING_METHODS,
  type PaymentMethodId,
  type ShippingMethodId,
} from '../types';
import type { CartItem as CartItemType } from '../../../types/cart';
import type { CustomerData } from '../../../types/user';
import { useCart } from '../../../hooks/useCart';
import { saveOrderSnapshot } from '../../../lib/orderSnapshot';
import { formatPrice } from '../../../lib/formatCurrency';
import { resolveShippingCost } from '../../../config/shipping';
import { ApiError, isAuthenticatedForApi } from '../../../services/api/http';
import { createOrder } from '../../../services/api/ordersApi';
import { createPayment } from '../../../services/api/paymentsApi';

import styles from './CartPage.module.css';

const easeLuxury = [0.16, 1, 0.3, 1] as const;

function getMethodBasePrice(methodId: ShippingMethodId): number {
  return (
    SHIPPING_METHODS.find((method) => method.id === methodId)?.price ?? 0
  );
}

const REQUIRED_CUSTOMER_FIELDS: { key: keyof CustomerData; label: string }[] = [
  { key: 'firstName', label: 'نام' },
  { key: 'lastName', label: 'نام خانوادگی' },
  { key: 'phone', label: 'شماره موبایل' },
  { key: 'province', label: 'استان' },
  { key: 'city', label: 'شهر' },
  { key: 'address', label: 'آدرس' },
];

export function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    subtotal,
    itemCount,
    clearCart,
    addItem,
    error: cartError,
  } = useCart();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<CustomerData>(EMPTY_CUSTOMER);
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethodId>('post-express');
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodId>('zarinpal');
  /** Open by default so mobile shoppers see items immediately. */
  const [orderAccordionOpen, setOrderAccordionOpen] = useState(true);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [undoItem, setUndoItem] = useState<CartItemType | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shipping = resolveShippingCost(
    getMethodBasePrice(shippingMethod),
    subtotal,
  );
  const total = subtotal + shipping;

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  const handleRemoveItem = (id: string) => {
    const removed = items.find((item) => item.id === id);
    removeItem(id);
    if (!removed) return;

    clearUndoTimer();
    setUndoItem(removed);
    undoTimerRef.current = setTimeout(() => {
      setUndoItem(null);
      undoTimerRef.current = null;
    }, 4500);
  };

  const handleUndoRemove = () => {
    if (!undoItem) return;
    addItem(undoItem);
    clearUndoTimer();
    setUndoItem(null);
  };

  const handleCheckout = () => {
    if (isSubmitting) return;

    if (items.length === 0) {
      setCheckoutError('سبد خرید شما خالی است.');
      return;
    }

    const missing = REQUIRED_CUSTOMER_FIELDS.filter(
      (field) => !String(customer[field.key] ?? '').trim(),
    ).map((field) => field.label);

    if (missing.length > 0) {
      setCheckoutError(
        `لطفاً اطلاعات ضروری را تکمیل کنید: ${missing.join('، ')}`,
      );
      const form = document.getElementById('checkout-customer');
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setCheckoutError(null);
    setIsSubmitting(true);

    const finishLocal = () => {
      const orderId = `LX-${Date.now().toString(36).toUpperCase()}`;
      saveOrderSnapshot({
        orderId,
        itemCount,
        subtotal,
        shipping,
        total,
        customerName: `${customer.firstName} ${customer.lastName}`.trim(),
        createdAt: new Date().toISOString(),
      });
      clearCart();
      navigate('/order/confirmation');
    };

    if (!isAuthenticatedForApi()) {
      finishLocal();
      return;
    }

    const idempotencyKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `chk-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    void createOrder({
      shippingMethodId: shippingMethod,
      paymentMethod,
      shippingAddress: {
        recipientName: `${customer.firstName} ${customer.lastName}`.trim(),
        phone: customer.phone.trim(),
        province: customer.province.trim(),
        city: customer.city.trim(),
        addressLine: customer.address.trim(),
        postalCode: customer.postalCode.trim() || undefined,
        landline: customer.landline.trim() || undefined,
        notes: customer.description.trim() || undefined,
      },
      expectedSubtotal: subtotal,
      expectedTotal: total,
      idempotencyKey,
    })
      .then(async (order) => {
        saveOrderSnapshot({
          orderId: order.orderNumber,
          itemCount: order.itemCount,
          subtotal: order.subtotal,
          shipping: order.shippingCost,
          total: order.total,
          customerName: order.shippingAddress.recipientName,
          createdAt: order.createdAt,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          currency: order.currency,
        });
        clearCart();

        if (paymentMethod === 'zarinpal') {
          const payment = await createPayment({
            orderNumber: order.orderNumber,
            idempotencyKey: `pay-${idempotencyKey}`,
          });
          if (payment.redirectUrl) {
            window.location.assign(payment.redirectUrl);
            return;
          }
        }

        navigate('/order/confirmation');
      })
      .catch((error: unknown) => {
        setIsSubmitting(false);
        if (error instanceof ApiError) {
          if (error.code === 'CHECKOUT_CHANGED') {
            setCheckoutError(
              'سبد خرید تغییر کرده است. لطفاً قیمت و موجودی را دوباره بررسی کنید.',
            );
            return;
          }
          setCheckoutError(error.message);
          return;
        }
        setCheckoutError('ثبت سفارش انجام نشد. لطفاً دوباره تلاش کنید.');
      });
  };

  return (
    <div className={styles.page} dir="rtl">
      {cartError ? (
        <p role="alert" style={{ textAlign: 'center', color: '#8a3b2d', padding: '0.75rem 1rem' }}>
          {cartError}
        </p>
      ) : null}
      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <>
          <div
            className={`${styles.container} ${styles.containerWithSticky}`}
          >
            <div>
              <div className={styles.checkoutSteps}>
                <div className={`${styles.step} ${styles.active}`}>
                  <span className={styles.circle}>1</span>
                  <span>سبد خرید</span>
                </div>
                <div className={styles.line} />
                <div className={styles.step}>
                  <span className={styles.circle}>2</span>
                  <span>تکمیل سفارش</span>
                </div>
                <div className={styles.line} />
                <div className={styles.step}>
                  <span className={styles.circle}>3</span>
                  <span>تایید نهایی</span>
                </div>
              </div>

              <h1 className={styles.title}>سبد خرید و ثبت سفارش</h1>
            </div>

            <div className={styles.grid}>
              <section className={styles.leftColumn}>
                <div className={styles.card} id="checkout-customer">
                  <CustomerForm data={customer} onChange={(next) => {
                    setCustomer(next);
                    if (checkoutError) setCheckoutError(null);
                  }} />
                </div>

                <div className={styles.card}>
                  <ShippingMethod
                    value={shippingMethod}
                    onChange={setShippingMethod}
                    subtotal={subtotal}
                  />
                </div>

                <div className={styles.card}>
                  <PaymentMethod
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                  />
                </div>
              </section>

              <aside className={styles.rightColumn}>
                <div className={`${styles.card} ${styles.orderCard}`}>
                  <button
                    type="button"
                    className={styles.orderToggle}
                    onClick={() =>
                      setOrderAccordionOpen((previous) => !previous)
                    }
                    aria-expanded={orderAccordionOpen}
                  >
                    <span>سفارش شما ({itemCount})</span>
                    <ChevronDown
                      size={18}
                      strokeWidth={1.5}
                      className={`${styles.chevron} ${
                        orderAccordionOpen ? styles.chevronOpen : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  <div
                    className={`${styles.orderContent} ${
                      orderAccordionOpen ? styles.orderContentOpen : ''
                    }`}
                  >
                    <div className={styles.itemsList}>
                      <AnimatePresence initial={false}>
                        {items.map((item) => (
                          <CartItemComponent
                            key={item.id}
                            item={item}
                            onRemove={handleRemoveItem}
                            onQuantityChange={updateQuantity}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <OrderSummary
                    subtotal={subtotal}
                    shipping={shipping}
                    total={total}
                    customer={customer}
                    shippingMethod={shippingMethod}
                    paymentMethod={paymentMethod}
                    onCheckout={handleCheckout}
                    hideMobileCheckout
                  />
                </div>

                {checkoutError ? (
                  <p className={styles.inlineError} role="alert">
                    {checkoutError}
                  </p>
                ) : null}
              </aside>
            </div>
          </div>

          <div className={styles.stickyBar} role="region" aria-label="خلاصه پرداخت">
            <div className={styles.stickyMeta}>
              <span className={styles.stickyLabel}>مبلغ نهایی</span>
              <strong className={styles.stickyTotal}>
                {formatPrice(total)}
                <span> تومان</span>
              </strong>
              <span className={styles.stickyCount}>
                {itemCount} کالا
              </span>
            </div>
            <button
              type="button"
              className={styles.stickyCta}
              onClick={handleCheckout}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'در حال ثبت...'
                : `ثبت و پرداخت سفارش — ${formatPrice(total)} تومان`}
            </button>
            {checkoutError ? (
              <p className={styles.stickyError} role="alert">
                {checkoutError}
              </p>
            ) : null}
          </div>
        </>
      )}

      <AnimatePresence>
        {undoItem ? (
          <motion.div
            className={`${styles.undoToast} ${
              items.length === 0 ? styles.undoToastSolo : ''
            }`}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: easeLuxury }}
          >
            <span>کالا از سبد حذف شد</span>
            <button
              type="button"
              className={styles.undoButton}
              onClick={handleUndoRemove}
            >
              بازگردانی
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
