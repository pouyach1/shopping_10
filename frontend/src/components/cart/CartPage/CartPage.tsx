import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { CartItem as CartItemComponent } from '../CartItem/CartItem';
import { OrderSummary } from '../OrderSummary/OrderSummary';
import { CustomerForm } from '../CustomerForm/CustomerForm';
import { ShippingMethod } from '../ShippingMethod/ShippingMethod';
import { PaymentMethod } from '../PaymentMethod/PaymentMethod';
import { LuxuryHeader } from '../LuxuryHeader/LuxuryHeader';
import { EmptyCart } from '../EmptyCart/EmptyCart';

import {
  EMPTY_CUSTOMER,
  type PaymentMethodId,
  type ShippingMethodId,
} from '../types';
import type { CustomerData } from '../../../types/user';
import { useCart } from '../../../hooks/useCart';
import { saveOrderSnapshot } from '../../../lib/orderSnapshot';

import styles from './CartPage.module.css';


const SHIPPING_PRICES: Record<ShippingMethodId, number> = {
  'post-express': 65000,
  tipax: 85000,
  'post-regular': 45000,
  express: 120000,
};

const easeLuxury = [
  0.16,
  1,
  0.3,
  1,
] as const;

const REQUIRED_CUSTOMER_FIELDS: { key: keyof CustomerData; label: string }[] = [
  { key: 'firstName', label: 'نام' },
  { key: 'lastName', label: 'نام خانوادگی' },
  { key: 'phone', label: 'شماره موبایل' },
  { key: 'province', label: 'استان' },
  { key: 'city', label: 'شهر' },
  { key: 'address', label: 'آدرس' },
];


export function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, itemCount, clearCart } =
    useCart();
  const navigate = useNavigate();

  const [customer, setCustomer] =
    useState<CustomerData>(EMPTY_CUSTOMER);

  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethodId>('post-express');

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodId>('zarinpal');

  const [orderAccordionOpen, setOrderAccordionOpen] =
    useState(false);


  const shipping =
    SHIPPING_PRICES[shippingMethod];


  const total =
    subtotal + shipping;


  const handleCheckout = () => {
    if (items.length === 0) {
      alert('سبد خرید شما خالی است.');
      return;
    }

    const missing = REQUIRED_CUSTOMER_FIELDS.filter(
      (field) => !customer[field.key].trim(),
    ).map((field) => field.label);

    if (missing.length > 0) {
      alert('لطفاً اطلاعات زیر را تکمیل کنید:\n' + missing.join('، '));
      return;
    }

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


  return (
    <main
      className={styles.page}
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.8,
          ease: easeLuxury,
        }}
      >
        <LuxuryHeader />
      </motion.div>


      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className={styles.container}>

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.8,
              ease: easeLuxury,
              delay: 0.1,
            }}
          >

            <div className={styles.checkoutSteps}>

              <div className={styles.step}>
                <span className={styles.circle}>
                  1
                </span>

                <span>
                  سبد خرید
                </span>
              </div>


              <div className={styles.line} />


              <div
                className={`${styles.step} ${styles.active}`}
              >
                <span className={styles.circle}>
                  2
                </span>

                <span>
                  تکمیل سفارش
                </span>
              </div>


              <div className={styles.line} />


              <div className={styles.step}>
                <span className={styles.circle}>
                  3
                </span>

                <span>
                  تایید نهایی
                </span>
              </div>

            </div>


            <h1 className={styles.title}>
              پرداخت و ثبت سفارش
            </h1>

          </motion.div>


          <div className={styles.grid}>

            <motion.section
              className={styles.leftColumn}
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.8,
                ease: easeLuxury,
                delay: 0.25,
              }}
            >

              <div className={styles.card}>
                <CustomerForm
                  data={customer}
                  onChange={setCustomer}
                />
              </div>


              <div className={styles.card}>
                <ShippingMethod
                  value={shippingMethod}
                  onChange={setShippingMethod}
                />
              </div>


              <div className={styles.card}>
                <PaymentMethod
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                />
              </div>

            </motion.section>



            <motion.aside
              className={styles.rightColumn}
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                duration: 0.8,
                ease: easeLuxury,
                delay: 0.4,
              }}
            >

              <div
                className={`${styles.card} ${styles.orderCard}`}
              >

                <button
                  type="button"
                  className={styles.orderToggle}
                  onClick={() =>
                    setOrderAccordionOpen(
                      (previous) => !previous,
                    )
                  }
                  aria-expanded={
                    orderAccordionOpen
                  }
                >

                  <span>
                    سفارش شما ({itemCount})
                  </span>

                  <ChevronDown
                    size={18}
                    strokeWidth={1.5}
                    className={`${styles.chevron} ${
                      orderAccordionOpen
                        ? styles.chevronOpen
                        : ''
                    }`}
                  />

                </button>


                <motion.div
                  initial={false}
                  animate={{
                    height: 'auto',
                    opacity: 1,
                  }}
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
                          onRemove={removeItem}
                          onQuantityChange={updateQuantity}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>

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
                />

              </div>

            </motion.aside>

          </div>

        </div>
      )}

    </main>
  );
}