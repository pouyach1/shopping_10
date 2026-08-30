import { DEFAULT_STORE_SLUG } from '../../src/config/constants';
import { Store } from '../../src/models/Store';
import { User } from '../../src/models/User';
import { promoteStoreAdmin } from '../../src/services/storeBootstrap.service';

/**
 * Grant default-store staff admin for legacy commerce tests.
 * Admin routes require StoreMembership — User.role alone is insufficient.
 */
export async function grantDefaultStoreAdmin(userId: string): Promise<void> {
  const store = await Store.findOne({ slug: DEFAULT_STORE_SLUG });
  if (!store) {
    throw new Error('Default store missing — ensureDefaultStore() must run in test setup');
  }
  await promoteStoreAdmin(String(store._id), userId, 'admin');
  await User.findByIdAndUpdate(userId, { role: 'admin' });
}
