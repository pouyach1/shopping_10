import { Routes, Route, useParams } from 'react-router-dom';

import { SiteLayout } from './components/layout/SiteLayout';
import { Home } from './pages/Home/Home';
import { Product } from './pages/Product/Product';
import { Search } from './pages/Search/Search';
import { ShopPage } from './pages/Shop/ShopPage';
import { CategoryPage } from './pages/Category/CategoryPage';
import { OrderConfirmation } from './pages/OrderConfirmation/OrderConfirmation';
import { WishlistPage } from './components/wishlist/WishlistPage/WishlistPage';
import { CartPage } from './components/cart/CartPage/CartPage';
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
      <Route path="/" element={<Home />} />
      <Route path="/cart" element={<CartPage />} />

      <Route element={<SiteLayout />}>
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/search" element={<Search />} />
        <Route path="/product/:slug" element={<ProductRoute />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/order/confirmation" element={<OrderConfirmation />} />
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
