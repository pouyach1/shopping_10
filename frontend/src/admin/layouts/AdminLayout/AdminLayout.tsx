import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { AdminHeader } from '../../components/AdminHeader';
import { AdminSidebar } from '../../components/AdminSidebar';
import { getAdminPageTitle } from '../../data/navItems';
import { logoutAdmin, useAdminAuth } from '../../hooks/useAdminAuth';

import styles from './AdminLayout.module.css';

export function AdminLayout() {
  const { isAuthenticated } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login', { replace: true });
  };

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  const title = getAdminPageTitle(location.pathname);

  return (
    <div className={styles.shell} dir="rtl">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className={styles.main}>
        <AdminHeader
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
