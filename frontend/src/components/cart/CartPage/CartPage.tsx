import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import { CART_STORAGE_KEY, type CartItem } from '../../../pages/Wishlist/types';
import { CartItem as CartItemComponent } from '../CartItem/CartItem';
import { OrderSummary } from '../OrderSummary/OrderSummary';
import { CustomerForm } from '../CustomerForm/CustomerForm';
import { ShippingMethod } from '../ShippingMethod/ShippingMethod';
import { PaymentMethod } from '../PaymentMethod/PaymentMethod';
import { LuxuryHeader } from '../LuxuryHeader/LuxuryHeader';
import { EmptyCart } from '../EmptyCart/EmptyCart';
import { EMPTY_CUSTOMER, type CustomerData, type PaymentMethodId, type ShippingMethodId } from '../types';
import styles from './CartPage.module.css';

const SHIPPING_PRICES: Record<ShippingMethodId, number> = {
  'post-express': 65000,
  tipax: 85000,
  'post-regular': 45000,
  express: 120000,
};

const easeLuxury = [0.16, 1, 0.3, 1] as const;

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || !('items' in parsed) || !Array.isArray(parsed.items)) return [];
    return parsed.items as CartItem[];
  } catch { return []; }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items })); } catch { /* storage unavailable */ }
}

export function CartPage() {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [customer, setCustomer] = useState<CustomerData>(EMPTY_CUSTOMER);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethodId>('post-express');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('zarinpal');
  const [orderAccordionOpen, setOrderAccordionOpen] = useState(false);

  useEffect(() => saveCart(items), [items]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) setItems(loadCart());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const removeItem = (id: string) => setItems(current => current.filter(item => item.id !== id));
  const handleQuantityChange = (id: string, quantity: number) => {
    const safeQuantity = Math.max(1, Math.floor(quantity));
    setItems(current => current.map(item => item.id === id ? { ...item, quantity: safeQuantity } : item));
  };

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const shipping = SHIPPING_PRICES[shippingMethod] ?? 0;
  const total = subtotal + shipping;

  return (
    <main className={styles.page} dir="rtl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .8, ease: easeLuxury }}>
        <LuxuryHeader />
      </motion.div>

      <AnimatePresence mode="wait">
        {items.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .5, ease: easeLuxury }}>
            <EmptyCart />
          </motion.div>
        ) : (
          <motion.div key="content" className={styles.container} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .6, ease: easeLuxury }}>
            <header className={styles.header}>
              <div className={styles.checkoutSteps} aria-label="مراحل ثبت سفارش">
                <div className={styles.step}><span className={styles.circle}>1</span><span>سبد خرید</span></div>
                <div className={styles.line} aria-hidden="true" />
                <div className={`${styles.step} ${styles.active}`}><span className={styles.circle}>2</span><span>تکمیل سفارش</span></div>
                <div className={styles.line} aria-hidden="true" />
                <div className={styles.step}><span className={styles.circle}>3</span><span>تایید نهایی</span></div>
              </div>
              <h1 className={styles.title}>پرداخت و ثبت سفارش</h1>
              <p className={styles.subtitle}>اطلاعات گیرنده، روش ارسال و پرداخت را تکمیل کنید.</p>
            </header>

            <div className={styles.grid}>
              <motion.section className={styles.leftColumn} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease: easeLuxury, delay: .12 }}>
                <div className={styles.card}><CustomerForm data={customer} onChange={setCustomer} /></div>
                <div className={styles.card}><ShippingMethod value={shippingMethod} onChange={setShippingMethod} /></div>
                <div className={styles.card}><PaymentMethod value={paymentMethod} onChange={setPaymentMethod} /></div>
              </motion.section>

              <motion.aside className={styles.rightColumn} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease: easeLuxury, delay: .2 }}>
                <div className={`${styles.card} ${styles.orderCard}`}>
                  <button type="button" className={styles.orderToggle} onClick={() => setOrderAccordionOpen(value => !value)} aria-expanded={orderAccordionOpen} aria-controls="cart-order-items">
                    <span>سفارش شما ({itemCount})</span>
                    <ChevronDown size={18} strokeWidth={1.5} className={`${styles.chevron} ${orderAccordionOpen ? styles.chevronOpen : ''}`} aria-hidden="true" />
                  </button>
                  <motion.div id="cart-order-items" initial={false} animate={{ height: orderAccordionOpen ? 'auto' : undefined, opacity: 1 }} className={`${styles.orderContent} ${orderAccordionOpen ? styles.orderContentOpen : ''}`}>
                    <div className={styles.itemsList}>
                      <AnimatePresence initial={false} mode="popLayout">
                        {items.map(item => <CartItemComponent key={item.id} item={item} onRemove={removeItem} onQuantityChange={handleQuantityChange} />)}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </div>
                <div className={styles.card}>
                  <OrderSummary subtotal={subtotal} shipping={shipping} total={total} customer={customer} shippingMethod={shippingMethod} paymentMethod={paymentMethod} />
                </div>
              </motion.aside>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
