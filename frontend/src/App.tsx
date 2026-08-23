import { Routes, Route, useParams } from 'react-router-dom';

import { Home } from './pages/Home/Home';
import { Product } from './pages/Product/Product';
import { Search } from './pages/Search/Search';
import { WishlistPage } from './components/wishlist/WishlistPage/WishlistPage';
import { CartPage } from './components/cart/CartPage/CartPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { NotFound } from './pages/NotFound/NotFound';
import './styles/global.css';

function ProductRoute() {
  const { slug } = useParams();
  return <Product slug={slug} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/product/:slug" element={<ProductRoute />} />
      <Route path="/search" element={<Search />} />
      <Route path="/wishlist" element={<WishlistPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
