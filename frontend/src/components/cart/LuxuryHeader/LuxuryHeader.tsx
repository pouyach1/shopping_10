import { Menu, ArrowLeft, User, Heart, ShoppingBag } from 'lucide-react';
import styles from './LuxuryHeader.module.css';

export function LuxuryHeader() {

  const goTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <header className={styles.header}>

      <button className={styles.iconButton}>
        <Menu size={20}/>
      </button>

      <div className={styles.brand}>
        LUXORA
      </div>

      <div className={styles.actions}>

        <button
          className={styles.iconButton}
          onClick={() => goTo('/profile')}
        >
          <User size={18}/>
        </button>

        <button
          className={styles.iconButton}
          onClick={() => goTo('/')}
        >
          <ArrowLeft size={18}/>
        </button>

        <button
          className={styles.iconButton}
          onClick={() => goTo('/wishlist')}
        >
          <Heart size={18}/>
        </button>

        <button
          className={styles.iconButton}
          onClick={() => goTo('/cart')}
        >
          <ShoppingBag size={18}/>
        </button>

      </div>

    </header>
  );
}
