import { Menu, ArrowLeft, User, Heart, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './LuxuryHeader.module.css';

export function LuxuryHeader() {

  const navigate = useNavigate();

  const goTo = (path: string) => {
    navigate(path);
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
