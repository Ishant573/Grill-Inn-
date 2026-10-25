import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Utensils, PackageCheck, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
  isOpenState: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onProceedToCheckout,
  isOpenState,
}) => {
  const {
    cart,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    removeFromCart,
    updateQuantity,
    subtotal,
    totalItemsCount,
    orderType,
    setOrderType,
    tableNumber,
    setTableNumber,
    assignNextTableNumber,
  } = useCart();

  if (!isCartDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-[#e8dfd3]">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#e8dfd3] flex items-center justify-between bg-[#faf7f2]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#e07a3f] text-white flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#261c14]">Your Order Bag</h2>
                <p className="text-xs text-[#786454]">
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} selected
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 rounded-lg text-[#786454] hover:text-[#261c14] hover:bg-[#ebdcd0] transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-14 h-14 rounded-2xl bg-[#f0e6da] text-[#786454] flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#261c14]">Your bag is empty</h3>
                <p className="text-xs text-[#786454] mt-1 max-w-xs mx-auto">
                  Explore our fresh cutting chai, crispy burgers, and sizzling snacks to get started!
                </p>
                <button
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="mt-5 px-4 py-2 rounded-xl bg-[#e07a3f] text-white text-xs font-semibold hover:bg-[#cb672c] transition-colors"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <>
                {/* Order Type Toggle in Cart */}
                <div className="p-3 bg-[#faf7f2] rounded-xl border border-[#e8dfd3]">
                  <span className="text-xs font-semibold text-[#5c4a3b] block mb-2">
                    Dining Preference
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType('dine_in')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                        orderType === 'dine_in'
                          ? 'bg-[#261c14] text-white shadow-2xs'
                          : 'bg-white text-[#5c4a3b] border border-[#d9c7b5] hover:bg-[#f0e6da]'
                      }`}
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Dine-in</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('takeaway')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                        orderType === 'takeaway'
                          ? 'bg-[#261c14] text-white shadow-2xs'
                          : 'bg-white text-[#5c4a3b] border border-[#d9c7b5] hover:bg-[#f0e6da]'
                      }`}
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Takeaway</span>
                    </button>
                  </div>

                  {orderType === 'dine_in' && (
                    <div className="mt-3 pt-2 border-t border-[#ebdcd0]">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-[#5c4a3b] flex items-center gap-1.5">
                          <span>Table Number</span>
                          <span className="text-[10px] bg-[#e07a3f]/15 text-[#cb672c] px-1.5 py-0.5 rounded-md font-bold">
                            Auto-Generated
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => assignNextTableNumber()}
                          className="text-[11px] text-[#e07a3f] hover:underline font-semibold flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          Next Table
                        </button>
                      </div>
                      <input
                        type="text"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="e.g. Table 001"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#d9c7b5] text-xs text-[#261c14] font-mono font-bold focus:ring-2 focus:ring-[#e07a3f] focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="divide-y divide-[#f0e6da]">
                  {cart.map((item) => (
                    <div key={item.menuItem.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.menuItem.image_url}
                          alt={item.menuItem.name}
                          className="w-14 h-14 rounded-xl object-cover bg-[#f0e6da] shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div>
                          <h4 className="text-sm font-bold text-[#261c14] line-clamp-1">
                            {item.menuItem.name}
                          </h4>
                          <span className="text-xs text-[#786454] font-mono tabular-nums">
                            ₹{item.menuItem.price} × {item.quantity} = ₹
                            {(item.menuItem.price * item.quantity).toFixed(0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Stepper */}
                        <div className="flex items-center bg-[#faf7f2] border border-[#d9c7b5] rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.menuItem.id, -1)}
                            className="p-1 hover:bg-[#ebdcd0] text-[#5c4a3b] rounded-l-lg"
                            aria-label="Decrease"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-mono text-xs font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.menuItem.id, 1)}
                            className="p-1 hover:bg-[#ebdcd0] text-[#5c4a3b] rounded-r-lg"
                            aria-label="Increase"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeFromCart(item.menuItem.id)}
                          className="p-1 text-[#a69280] hover:text-rose-600 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer & Checkout CTA */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-[#e8dfd3] bg-[#faf7f2] space-y-3">
              <div className="space-y-1.5 text-xs text-[#5c4a3b]">
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-mono font-medium tabular-nums">₹{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Packaging & Service</span>
                  <span className="font-medium text-emerald-700">₹0 (Free)</span>
                </div>
                <div className="pt-2 border-t border-[#ebdcd0] flex justify-between text-sm font-bold text-[#261c14]">
                  <span>Total Payable</span>
                  <span className="font-mono text-base text-[#e07a3f] tabular-nums">
                    ₹{subtotal.toFixed(0)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (orderType === 'dine_in' && !tableNumber.trim()) {
                    assignNextTableNumber();
                  }
                  setIsCartDrawerOpen(false);
                  onProceedToCheckout();
                }}
                disabled={!isOpenState}
                className="w-full py-3.5 px-4 rounded-xl bg-[#e07a3f] hover:bg-[#cb672c] disabled:bg-[#a69280] text-white font-semibold text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="text-center">
                <span className="text-[11px] text-[#786454]">
                  Pay at Counter with Cash or UPI upon pickup
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
