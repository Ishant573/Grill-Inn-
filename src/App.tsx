import React, { useState, useEffect, useCallback } from 'react';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { CartDrawer } from './components/CartDrawer';
import { StickyMobileCart } from './components/StickyMobileCart';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Footer } from './components/Footer';
import { PromotionalBanner } from './components/PromotionalBanner';
import { cafeteriaService } from './services/cafeteriaService';
import { Category, MenuItem, Order, CafeteriaSettings, AdminUser } from './types/cafeteria';

type ViewMode = 'home' | 'menu' | 'admin-login' | 'admin-dashboard';

function CafeteriaApp() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(true);
  const [settings, setSettings] = useState<CafeteriaSettings>(() =>
    cafeteriaService.getCafeteriaSettings()
  );

  // Authentication State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() =>
    cafeteriaService.getCurrentAdmin()
  );

  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [confirmationOrder, setConfirmationOrder] = useState<Order | null>(null);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState<boolean>(false);

  // Fetch Menu Data
  const loadMenuData = useCallback(async () => {
    try {
      setIsLoadingMenu(true);
      const [cats, items] = await Promise.all([
        cafeteriaService.getCategories(),
        cafeteriaService.getMenuItems(),
      ]);
      setCategories(cats);
      setMenuItems(items);
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setIsLoadingMenu(false);
    }
  }, []);

  useEffect(() => {
    loadMenuData();
  }, [loadMenuData]);

  // Handle URL parameters for direct deep-linking (e.g. /admin/login or ?view=admin)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);

      if (path.includes('/admin/login') || searchParams.get('view') === 'admin-login') {
        setCurrentView('admin-login');
      } else if (
        path.includes('/admin/dashboard') ||
        path.includes('/admin') ||
        searchParams.get('view') === 'admin'
      ) {
        if (cafeteriaService.getCurrentAdmin()) {
          setCurrentView('admin-dashboard');
        } else {
          setCurrentView('admin-login');
        }
      }
    }
  }, []);

  const handleOrderSuccess = (order: Order, token: string) => {
    setIsCheckoutOpen(false);
    setConfirmationOrder(order);
    setConfirmationToken(token);
    setIsConfirmationOpen(true);
  };

  const handleUpdateSettings = (newPartial: Partial<CafeteriaSettings>) => {
    const updated = cafeteriaService.updateCafeteriaSettings(newPartial);
    setSettings(updated);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf7f2] selection:bg-[#e07a3f] selection:text-white">
      {/* Navbar (hidden when inside admin dashboard for maximized workspace) */}
      {currentView !== 'admin-dashboard' && (
        <Navbar
          currentView={currentView}
          setCurrentView={setCurrentView}
          settings={settings}
          isAdminLoggedIn={Boolean(adminUser)}
        />
      )}

      {/* Main Content Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <>
            <HeroSection
              onExploreMenu={() => setCurrentView('menu')}
              settings={settings}
            />
            <PromotionalBanner
              onExploreMenu={() => setCurrentView('menu')}
            />
            <MenuSection
              categories={categories}
              menuItems={menuItems}
              isLoading={isLoadingMenu}
              isOpen={settings.isOpen}
            />
          </>
        )}

        {currentView === 'menu' && (
          <>
            <PromotionalBanner
              onExploreMenu={() => {}}
            />
            <MenuSection
              categories={categories}
              menuItems={menuItems}
              isLoading={isLoadingMenu}
              isOpen={settings.isOpen}
            />
          </>
        )}

        {currentView === 'admin-login' && (
          <AdminLogin
            onLoginSuccess={(user) => {
              setAdminUser(user);
              setCurrentView('admin-dashboard');
            }}
            onBackToCustomerSite={() => setCurrentView('home')}
          />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboard
            adminUser={adminUser || { id: 'admin-grillinn-01', email: 'admin@grillinn.in', full_name: 'Grill Inn Munger Manager', role: 'admin' }}
            onLogout={async () => {
              await cafeteriaService.logoutAdmin();
              setAdminUser(null);
              setCurrentView('admin-login');
            }}
            onViewStorefront={() => setCurrentView('home')}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>

      {/* Footer (for customer views) */}
      {currentView !== 'admin-dashboard' && (
        <Footer
          settings={settings}
          onAdminClick={() => setCurrentView(adminUser ? 'admin-dashboard' : 'admin-login')}
          onMenuClick={() => setCurrentView('menu')}
        />
      )}

      {/* Modals & Overlays */}
      <CartDrawer
        isOpenState={settings.isOpen}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      <StickyMobileCart />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
      />

      <OrderConfirmationModal
        isOpen={isConfirmationOpen}
        order={confirmationOrder}
        trackingToken={confirmationToken}
        onClose={() => setIsConfirmationOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <CafeteriaApp />
    </CartProvider>
  );
}
