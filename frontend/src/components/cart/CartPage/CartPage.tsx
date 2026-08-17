import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { CART_STORAGE_KEY, type CartItem } from '../../../pages/Wishlist/types';
import { CartItem as CartItemComponent } from '../CartItem/CartItem';
import { OrderSummary } from '../OrderSummary/OrderSummary';
import { CustomerForm } from '../CustomerForm/CustomerForm';
import { ShippingForm } from '../ShippingForm/ShippingForm';
import { PaymentForm } from '../PaymentForm/PaymentForm';
import { LuxuryHeader } from '../LuxuryHeader/LuxuryHeader';
import { EmptyCart } from '../EmptyCart/EmptyCart';
import styles from './CartPage.module.css';
import { EMPTY_CUSTOMER, type CustomerData } from '../types';


function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    const data = JSON.parse(stored);
    return data.items ?? [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]): void {
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify({ items }),
  );
}

const easeLuxury = [0.16, 1, 0.3, 1] as const;

export function CartPage() {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [orderAccordionOpen, setOrderAccordionOpen] = useState(false);

  const [customer, setCustomer] = useState<CustomerData>(
    EMPTY_CUSTOMER
  );
  const removeItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    saveCart(updated);
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, quantity } : item,
    );
    setItems(updated);
    saveCart(updated);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className={styles.page} dir="rtl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: easeLuxury }}
      >
        <LuxuryHeader />
      </motion.div>

      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className={styles.container}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: easeLuxury, delay: 0.1 }}
          >
            <div className={styles.checkoutSteps}>
              <div className={styles.step}>
                <span className={styles.circle}>1</span>
                <span>سبد خرید</span>
              </div>

              <div className={styles.line}></div>

              <div className={`${styles.step} ${styles.active}`}>
                <span className={styles.circle}>2</span>
                <span>تکمیل سفارش</span>
              </div>

            <div className={styles.line}></div>

            <div className={styles.step}>
              <span className={styles.circle}>3</span>
              <span>تایید نهایی</span>
            </div>
          </div>

            <h1 className={styles.title}>پرداخت و ثبت سفارش</h1>
          </motion.div>

          <div className={styles.grid}>
            <motion.section
              className={styles.leftColumn}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: easeLuxury, delay: 0.25 }}
            >
              <div className={styles.card}>
                <CustomerForm
                  data={customer}
                  onChange={setCustomer}
                />
              </div>

              <div className={styles.card}>
                <ShippingForm />
              </div>

              <div className={styles.card}>
                <PaymentForm />
              </div>
            </motion.section>

            <motion.aside
              className={styles.rightColumn}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: easeLuxury, delay: 0.4 }}
            >
              <div className={`${styles.card} ${styles.orderCard}`}>
                <button
                  type="button"
                  className={styles.orderToggle}
                  onClick={() => setOrderAccordionOpen((prev) => !prev)}
                  aria-expanded={orderAccordionOpen}
                >
                  <span>سفارش شما ({itemCount})</span>
                  <ChevronDown
                    size={18}
                    strokeWidth={1.5}
                    className={`${styles.chevron} ${
                      orderAccordionOpen ? styles.chevronOpen : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {orderAccordionOpen && (
                    <motion.div
                      initial={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.4, ease: easeLuxury }}
                      className={styles.orderContent}
                    >
                      <div className={styles.itemsList}>
                        <AnimatePresence initial={false}>
                          {items.map((item) => (
                            <CartItemComponent
                              key={item.id}
                              item={item}
                              onRemove={removeItem}
                              onQuantityChange={handleQuantityChange}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className={styles.card}>
                <OrderSummary
                subtotal={subtotal}
                shipping={0}
                total={subtotal}
                customer={customer}
              />
              </div>
            </motion.aside>
          </div>
        </div>
      )}
    </main>
  );
}
