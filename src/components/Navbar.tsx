import React from 'react';
import { ShoppingBag, Flame, Clock, ShieldCheck, MapPin, Phone } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CafeteriaSettings } from '../types/cafeteria';

interface NavbarProps {
  currentView: 'home' | 'menu' | 'admin-login' | 'admin-dashboard';
  setCurrentView: (view: 'home' | 'menu' | 'admin-login' | 'admin-dashboard') => void;
  settings: CafeteriaSettings;
  isAdminLoggedIn: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  settings,
  isAdminLoggedIn,
}) => {
  const { totalItemsCount, subtotal, setIsCartDrawerOpen } = useCart();

  const handleNavClick = (view: 'home' | 'menu' | 'admin-login' | 'admin-dashboard') => {
    setCurrentView(view);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#faf7f2]/95 backdrop-blur-md border-b border-[#e8dfd3] shadow-xs">
      {/* Slim Info Strip */}
      <div className="bg-[#1f1510] text-[#e8dfd3] text-xs py-1.5 px-4 sm:px-8 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium text-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Today till {settings.closingTime}</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-[#d6c7b8]">
            <MapPin className="w-3.5 h-3.5 text-red-400" />
            <span>{settings.plusCode}</span>
          </span>
          <a
            href={`tel:${settings.phone.replace(/\s+/g, '')}`}
            className="hidden md:flex items-center gap-1.5 text-amber-200 hover:text-white transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>{settings.phone}</span>
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#c4b5a5]">Pay at Counter · Cash / UPI</span>
          <span className="text-[#6d5b4b]">|</span>
          <span
            className={`font-semibold ${
              settings.isOpen ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {settings.isOpen ? '● Kitchen Open' : '● Kitchen Closed'}
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-6">
        {/* Brand Zone */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b181b] to-[#c52227] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <Flame className="w-5 h-5 fill-current text-amber-300" />
          </div>
          <div>
            <div className="font-extrabold text-base sm:text-lg text-[#261c14] tracking-tight leading-tight flex items-center gap-1.5">
              <span>{settings.cafeteriaName}</span>
            </div>
            <div className="text-[11px] text-[#786454] uppercase tracking-wider font-semibold flex items-center gap-1">
              <span>Chuabagh, Munger</span>
              <span className="text-stone-300">•</span>
              <span className="text-[#8b181b] font-bold">Fast Food & Ice Cream</span>
            </div>
          </div>
        </button>

        {/* Nav Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#5c4a3b]">
          <button
            onClick={() => handleNavClick('home')}
            className={`hover:text-[#261c14] transition-colors whitespace-nowrap py-1 ${
              currentView === 'home'
                ? 'text-[#8b181b] font-bold border-b-2 border-[#8b181b]'
                : ''
            }`}
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick('menu')}
            className={`hover:text-[#261c14] transition-colors whitespace-nowrap py-1 ${
              currentView === 'menu'
                ? 'text-[#8b181b] font-bold border-b-2 border-[#8b181b]'
                : ''
            }`}
          >
            Food Menu
          </button>
          <button
            onClick={() => handleNavClick(isAdminLoggedIn ? 'admin-dashboard' : 'admin-login')}
            className={`hover:text-[#261c14] transition-colors whitespace-nowrap py-1 flex items-center gap-1.5 ${
              currentView === 'admin-dashboard' || currentView === 'admin-login'
                ? 'text-[#8b181b] font-bold border-b-2 border-[#8b181b]'
                : 'text-[#877260]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isAdminLoggedIn ? 'Admin Dashboard' : 'Owner Login'}</span>
          </button>
        </nav>

        {/* Primary Action: Shopping Cart Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            className="relative flex items-center gap-2.5 sm:gap-3 bg-[#8b181b] hover:bg-[#a81c20] text-white px-3.5 sm:px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#8b181b]"
            aria-label="View shopping cart"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-amber-200" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-400 text-stone-950 text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] sm:text-[11px] text-amber-200 uppercase tracking-wider font-semibold">
                Cart {totalItemsCount > 0 ? `(${totalItemsCount})` : ''}
              </span>
              <span className="text-xs font-mono font-bold text-white tabular-nums">
                ₹{subtotal.toFixed(0)}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
