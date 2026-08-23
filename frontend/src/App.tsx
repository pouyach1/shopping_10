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

import './styles/global.css';


function ProductRoute() {
  const { slug } = useParams();

  return <Product slug={slug} />;
}


export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>

        {/* Main */}
        <Route path="/" element={<Home />} />

        {/* Shopping */}
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/product/:slug" element={<ProductRoute />} />

        {/* Search */}
        <Route path="/search" element={<Search />} />

        {/* Cart / Wishlist */}
        <Route path="/cart" element={<CartPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />

        {/* Checkout */}
        <Route
          path="/order/confirmation"
          element={<OrderConfirmation />}
        />

        {/* Account */}
        <Route path="/profile" element={<ProfilePage />} />

        {/* Brand */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Support */}
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/shipping" element={<ShippingPage />} />
        <Route path="/returns" element={<ReturnsPage />} />

        {/* Legal */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />

      </Route>
    </Routes>
  );
}