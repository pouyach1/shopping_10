import { lazy, Suspense } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';

import { SiteLayout } from './components/layout/SiteLayout';
import { Home } from './pages/Home/Home';
import { AdminThemeProvider } from './admin/theme';

import './styles/global.css';

const Product = lazy(() =>
  import('./pages/Product/Product').then((module) => ({ default: module.Product })),
);
const Search = lazy(() =>
  import('./pages/Search/Search').then((module) => ({ default: module.Search })),
);
const ShopPage = lazy(() =>
  import('./pages/Shop/ShopPage').then((module) => ({ default: module.ShopPage })),
);
const CategoryPage = lazy(() =>
  import('./pages/Category/CategoryPage').then((module) => ({
    default: module.CategoryPage,
  })),
);
const OrderConfirmation = lazy(() =>
  import('./pages/OrderConfirmation/OrderConfirmation').then((module) => ({
    default: module.OrderConfirmation,
  })),
);
const PaymentReturn = lazy(() =>
  import('./pages/PaymentReturn/PaymentReturn').then((module) => ({
    default: module.PaymentReturn,
  })),
);
const CartPage = lazy(() =>
  import('./components/cart/CartPage/CartPage').then((module) => ({
    default: module.CartPage,
  })),
);
const WishlistPage = lazy(() =>
  import('./components/wishlist/WishlistPage/WishlistPage').then((module) => ({
    default: module.WishlistPage,
  })),
);
const ProfilePage = lazy(() =>
  import('./pages/Profile/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
);
const NotFound = lazy(() =>
  import('./pages/NotFound/NotFound').then((module) => ({ default: module.NotFound })),
);
const AboutPage = lazy(() =>
  import('./pages/About/AboutPage').then((module) => ({ default: module.AboutPage })),
);
const ContactPage = lazy(() =>
  import('./pages/Contact/ContactPage').then((module) => ({
    default: module.ContactPage,
  })),
);
const FaqPage = lazy(() =>
  import('./pages/Faq/FaqPage').then((module) => ({ default: module.FaqPage })),
);
const ShippingPage = lazy(() =>
  import('./pages/Shipping/ShippingPage').then((module) => ({
    default: module.ShippingPage,
  })),
);
const ReturnsPage = lazy(() =>
  import('./pages/Returns/ReturnsPage').then((module) => ({
    default: module.ReturnsPage,
  })),
);
const PrivacyPage = lazy(() =>
  import('./pages/Privacy/PrivacyPage').then((module) => ({
    default: module.PrivacyPage,
  })),
);
const TermsPage = lazy(() =>
  import('./pages/Terms/TermsPage').then((module) => ({ default: module.TermsPage })),
);

const AdminLayout = lazy(() =>
  import('./admin/layouts/AdminLayout').then((module) => ({
    default: module.AdminLayout,
  })),
);
const AdminLogin = lazy(() =>
  import('./admin/pages/AdminLogin').then((module) => ({ default: module.AdminLogin })),
);
const Dashboard = lazy(() =>
  import('./admin/pages/Dashboard').then((module) => ({ default: module.Dashboard })),
);
const ComingSoon = lazy(() =>
  import('./admin/pages/ComingSoon').then((module) => ({ default: module.ComingSoon })),
);
const ProductsPage = lazy(() =>
  import('./admin/pages/Products').then((module) => ({ default: module.ProductsPage })),
);
const ProductFormPage = lazy(() =>
  import('./admin/pages/Products').then((module) => ({
    default: module.ProductFormPage,
  })),
);
const OrdersPage = lazy(() =>
  import('./admin/pages/Orders').then((module) => ({ default: module.OrdersPage })),
);
const OrderDetailPage = lazy(() =>
  import('./admin/pages/Orders').then((module) => ({
    default: module.OrderDetailPage,
  })),
);

function ProductRoute() {
  const { slug } = useParams();
  return <Product slug={slug} />;
}

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '40vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f5f0e8',
        color: '#6b6b6b',
        fontFamily: 'Vazirmatn, Tahoma, sans-serif',
        fontSize: '0.875rem',
      }}
      role="status"
      aria-live="polite"
    >
      در حال بارگذاری…
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AdminThemeProvider />}>
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id" element={<ProductFormPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route
              path="customers"
              element={<ComingSoon title="مشتریان" />}
            />
            <Route
              path="categories"
              element={<ComingSoon title="دسته‌بندی‌ها" />}
            />
            <Route
              path="discounts"
              element={<ComingSoon title="تخفیف‌ها" />}
            />
            <Route
              path="settings"
              element={<ComingSoon title="تنظیمات" />}
            />
          </Route>
        </Route>

        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/product/:slug" element={<ProductRoute />} />
          <Route path="/search" element={<Search />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/order/confirmation" element={<OrderConfirmation />} />
          <Route path="/payment/callback" element={<PaymentReturn />} />
          <Route path="/profile/*" element={<ProfilePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/shipping" element={<ShippingPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
