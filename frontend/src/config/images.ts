/**
 * Centralized Image Asset Configuration
 * 
 * To replace category images:
 * 1. Place new image files in src/assets/images/categories/
 * 2. Keep the same filenames as imported below
 * 3. No code changes required
 */

import women from '../assets/images/categories/women.webp';
import men from '../assets/images/categories/men.webp';
import bags from '../assets/images/categories/bag.webp';
import shoes from '../assets/images/categories/Shoes.webp';

export const categoryImages = {
  women,
  men,
  bags,
  shoes,
  accessories: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=600&h=750&q=80',
} as const;
