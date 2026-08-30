import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { ApiError, isAuthenticatedForApi } from '../../services/api/http';
import {
  confirmPaymentCallback,
  createPayment,
} from '../../services/api/paymentsApi';
import { saveOrderSnapshot, readOrderSnapshot } from '../../lib/orderSnapshot';

import styles from './PaymentReturn.module.css';

type ViewState = 'pending' | 'success' | 'failure';

/**
 * Gateway return page — never treats the browser hit as proof of payment.
 * Always asks the backend to verify with the provider.
 */
export function PaymentReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const authority = useMemo(
    () => params.get('Authority') ?? params.get('authority') ?? '',
    [params],
  );
  const gatewayStatus = useMemo(
    () => params.get('Status') ?? params.get('status') ?? undefined,
    [params],
  );

  const [view, setView] = useState<ViewState>('pending');
  const [message, setMessage] = useState('در حال بررسی وضعیت پرداخت...');
  const [orderNumber, setOrderNumber] = useState<string | undefined>();
  const [retryBusy, setRetryBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticatedForApi()) {
      setView('failure');
      setMessage('برای تایید پرداخت باید وارد حساب کاربری شوید.');
      return;
    }
    if (!authority) {
      setView('failure');
      setMessage('شناسه پرداخت نامعتبر است.');
      return;
    }

    let cancelled = false;
    void confirmPaymentCallback({
      authority,
      status: gatewayStatus ?? undefined,
    })
      .then((result) => {
        if (cancelled) return;
        setOrderNumber(result.payment.orderNumber);
        const snapshot = readOrderSnapshot();
        if (snapshot) {
          saveOrderSnapshot({
            ...snapshot,
            orderId: result.payment.orderNumber,
            paymentStatus: result.payment.status,
            orderStatus: result.orderStatus,
          });
        }
        if (result.payment.status === 'paid') {
          setView('success');
          setMessage('پرداخت با موفقیت انجام شد');
        } else if (
          result.payment.status === 'refunded' &&
          result.orderStatus === 'cancelled'
        ) {
          setView('failure');
          setMessage(
            'پرداخت پس از لغو سفارش تایید شد و به‌صورت خودکار بازپرداخت گردید.',
          );
        } else {
          setView('failure');
          setMessage('پرداخت انجام نشد');
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setView('failure');
        if (error instanceof ApiError) {
          if (error.code === 'PAYMENT_ALREADY_PAID' || error.code === undefined) {
            // fall through
          }
          setMessage(error.message || 'پرداخت انجام نشد');
          return;
        }
        setMessage('پرداخت انجام نشد');
      });

    return () => {
      cancelled = true;
    };
  }, [authority, gatewayStatus]);

  const handleRetry = () => {
    if (!orderNumber || retryBusy) return;
    setRetryBusy(true);
    const key =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `retry-${Date.now()}`;
    void createPayment({ orderNumber, idempotencyKey: key })
      .then((payment) => {
        if (payment.redirectUrl) {
          window.location.assign(payment.redirectUrl);
          return;
        }
        setRetryBusy(false);
        setMessage('امکان شروع مجدد پرداخت وجود ندارد.');
      })
      .catch((error: unknown) => {
        setRetryBusy(false);
        setMessage(
          error instanceof ApiError
            ? error.message
            : 'شروع مجدد پرداخت ممکن نشد.',
        );
      });
  };

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.card}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>LUXORA</span>
          <h1 className={styles.title}>
            {view === 'pending'
              ? 'بررسی پرداخت'
              : view === 'success'
                ? 'پرداخت موفق'
                : 'پرداخت ناموفق'}
          </h1>
        </header>
        <span className={styles.divider} aria-hidden="true" />
        <p
          className={styles.message}
          role="status"
          aria-live="polite"
          data-state={view}
        >
          {message}
        </p>
        {orderNumber ? (
          <p className={styles.meta}>شماره سفارش: {orderNumber}</p>
        ) : null}
        <div className={styles.actions}>
          {view === 'success' ? (
            <button
              type="button"
              className={styles.primary}
              onClick={() => navigate('/order/confirmation')}
            >
              مشاهده تایید سفارش
            </button>
          ) : null}
          {view === 'failure' && orderNumber ? (
            <button
              type="button"
              className={styles.primary}
              onClick={handleRetry}
              disabled={retryBusy}
            >
              {retryBusy ? 'در حال انتقال…' : 'تلاش مجدد پرداخت'}
            </button>
          ) : null}
          <Link to="/shop" className={styles.secondary}>
            بازگشت به فروشگاه
          </Link>
        </div>
      </div>
    </div>
  );
}
