import { useEffect, useState } from 'react';

import { Home } from './pages/Home/Home';
import { Product } from './pages/Product/Product';
import { Search } from './pages/Search/Search';
import { WishlistPage } from './components/wishlist/WishlistPage/WishlistPage';
import { CartPage } from './components/cart/CartPage/CartPage';
import './styles/global.css';

function getProductSlug(pathname: string) {
  const match =
    pathname.match(/^\/product\/([^/]+)\/?$/);

  return match?.[1];
}

function getSearchQuery(pathname: string) {
  if (!pathname.match(/^\/search\/?$/)) {
    return null;
  }

  const params = new URLSearchParams(
    window.location.search,
  );

  return params.get('q') ?? '';
}

function isWishlistPath(pathname: string) {
  return pathname.match(/^\/wishlist\/?$/);
}

export default function App() {
  const [pathname, setPathname] =
    useState(window.location.pathname);

  useEffect(() => {
    const handleNavigation = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener(
      'popstate',
      handleNavigation,
    );

    return () =>
      window.removeEventListener(
        'popstate',
        handleNavigation,
      );
  }, []);

  const productSlug =
    getProductSlug(pathname);

  const searchQuery =
    getSearchQuery(pathname);

  if (productSlug) {
    return <Product slug={productSlug} />;
  }

  if (searchQuery !== null) {
    return <Search key={searchQuery} />;
  }

  if (isWishlistPath(pathname)) {
    return <WishlistPage />;
  }
  if (pathname === '/cart' || pathname === '/cart/') {
    return <CartPage />;
  }
  return <Home />;
}
