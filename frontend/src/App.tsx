import { Routes, Route, useParams } from 'react-router-dom';

import { SiteLayout } from './components/layout/SiteLayout';

import { Home } from './pages/Home/Home';
import { Product } from './pages/Product/Product';
import { Search } from './pages/Search/Search';
import { ShopPage } from './pages/Shop/ShopPage';
import { CategoryPage } from './pages/Category/CategoryPage';
import { OrderConfirmation } from './pages/OrderConfirmation/OrderConfirmation';

import { CartPage } from './components/cart/CartPage/CartPage';
import { WishlistPage } from './components/wishlist/WishlistPage/WishlistPage';

import { ProfilePage } from './pages/Profile/ProfilePage';
import { NotFound } from './pages/NotFound/NotFound';

import { AboutPage } from './pages/About/AboutPage';
import { ContactPage } from './pages/Contact/ContactPage';
import { FaqPage } from './pages/Faq/FaqPage';
import { ShippingPage } from './pages/Shipping/ShippingPage';
import { ReturnsPage } from './pages/Returns/ReturnsPage';
import { PrivacyPage } from './pages/Privacy/PrivacyPage';
import { TermsPage } from './pages/Terms/TermsPage';

import { AdminLayout } from './admin/layouts/AdminLayout';
import { AdminLogin } from './admin/pages/AdminLogin';
import { Dashboard } from './admin/pages/Dashboard';
import { ComingSoon } from './admin/pages/ComingSoon';
import { ProductsPage, ProductFormPage } from './admin/pages/Products';
import { AdminThemeProvider } from './admin/theme';

import './styles/global.css';


function ProductRoute() {
  const { slug } = useParams();

  return <Product slug={slug} />;
}


export default function App() {
  return (
    <Routes>

      {/* Admin — theme provider scopes tokens to admin routes only */}
      <Route element={<AdminThemeProvider />}>
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id" element={<ProductFormPage />} />
          <Route
            path="orders"
            element={<ComingSoon title="سفارش‌ها" />}
          />
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

        <Route
          path="/order/confirmation"
          element={<OrderConfirmation />}
        />

        <Route path="/profile" element={<ProfilePage />} />

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
  );
}
