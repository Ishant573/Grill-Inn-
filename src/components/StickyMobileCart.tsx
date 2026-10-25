import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const StickyMobileCart: React.FC = () => {
  const { totalItemsCount, subtotal, setIsCartDrawerOpen, isCartDrawerOpen } = useCart();

  if (totalItemsCount === 0 || isCartDrawerOpen) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 sm:hidden p-3 bg-white/95 backdrop-blur-md border-t border-[#e8dfd3] shadow-lg">
      <button
        onClick={() => setIsCartDrawerOpen(true)}
        className="w-full h-12 bg-[#261c14] hover:bg-[#3d2f23] text-white px-4 rounded-xl flex items-center justify-between shadow-md transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-[#f5ede3]" />
            <span className="absolute -top-1.5 -right-2 bg-[#e07a3f] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {totalItemsCount}
            </span>
          </div>
          <span className="text-xs font-semibold">View Order Bag</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-[#faf7f2] tabular-nums">
            ₹{subtotal.toFixed(0)}
          </span>
          <ArrowRight className="w-4 h-4 text-[#e07a3f]" />
        </div>
      </button>
    </div>
  );
};
