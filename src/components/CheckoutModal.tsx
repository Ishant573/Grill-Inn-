import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Utensils,
  PackageCheck,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ReceiptIndianRupee,
  Sparkles,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { cafeteriaService } from '../services/cafeteriaService';
import { Order } from '../types/cafeteria';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order, token: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const {
    cart,
    subtotal,
    clearCart,
    orderType,
    setOrderType,
    tableNumber,
    setTableNumber,
    assignNextTableNumber,
    specialInstructions,
    setSpecialInstructions,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    revalidateCart,
  } = useCart();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    let finalTableNumber: string | null = null;
    if (orderType === 'dine_in') {
      finalTableNumber = tableNumber.trim() || assignNextTableNumber();
    }
    if (cart.length === 0) {
      setErrorMessage('Your bag is empty.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Revalidate cart items and availability
      const { hasUnavailable } = await revalidateCart();
      if (hasUnavailable) {
        throw new Error(
          'One or more items in your cart became unavailable or had a price change. Your cart has been updated. Please review before proceeding.'
        );
      }

      // Step 2: Atomic checkout submission
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: cleanPhone,
        order_type: orderType,
        table_number: orderType === 'dine_in' ? finalTableNumber : null,
        special_instructions: specialInstructions.trim() || null,
        items: cart.map((c) => ({
          menu_item_id: c.menuItem.id,
          quantity: c.quantity,
        })),
      };

      const result = await cafeteriaService.createOrder(payload);

      // Clear cart on success
      clearCart();
      onOrderSuccess(result.order, result.trackingToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e8dfd3]">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#e8dfd3]">
            <div>
              <h2 className="text-xl font-bold text-[#261c14] tracking-tight">Checkout & Order Summary</h2>
              <p className="text-xs text-[#786454] mt-0.5">Pay at Counter · Direct Kitchen Dispatch</p>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-[#786454] hover:text-[#261c14] hover:bg-[#f0e6da]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            {/* Customer Details */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#5c4a3b] mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#877260] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#d9c7b5] text-sm text-[#261c14] focus:ring-2 focus:ring-[#e07a3f] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5c4a3b] mb-1">
                  Mobile Number <span className="text-rose-500">*</span> (10 Digits)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#877260] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#d9c7b5] text-sm text-[#261c14] font-mono focus:ring-2 focus:ring-[#e07a3f] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Order Type Toggle */}
            <div className="pt-2 border-t border-[#f0e6da]">
              <label className="block text-xs font-semibold text-[#5c4a3b] mb-2">
                Order Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrderType('dine_in')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                    orderType === 'dine_in'
                      ? 'bg-[#261c14] text-white shadow-2xs'
                      : 'bg-[#faf7f2] text-[#5c4a3b] border border-[#d9c7b5] hover:bg-[#f0e6da]'
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  <span>Dine-In</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderType('takeaway')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                    orderType === 'takeaway'
                      ? 'bg-[#261c14] text-white shadow-2xs'
                      : 'bg-[#faf7f2] text-[#5c4a3b] border border-[#d9c7b5] hover:bg-[#f0e6da]'
                  }`}
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Takeaway</span>
                </button>
              </div>

              {/* Conditional Table Number or Takeaway Notice */}
              {orderType === 'dine_in' ? (
                <div className="mt-3 p-3.5 bg-[#faf7f2] rounded-xl border border-[#d9c7b5]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#5c4a3b] flex items-center gap-1.5">
                      <span>Table Number</span>
                      <span className="text-[10px] bg-[#e07a3f]/15 text-[#cb672c] px-2 py-0.5 rounded-full font-bold">
                        Auto-Generated
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => assignNextTableNumber()}
                      className="text-[11px] text-[#e07a3f] hover:text-[#cb672c] hover:underline font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Next Table</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. Table 001"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#d9c7b5] text-xs text-[#261c14] font-mono font-bold focus:ring-2 focus:ring-[#e07a3f] focus:outline-none"
                  />
                  <p className="text-[11px] text-[#786454] mt-1.5 leading-tight">
                    Automatically assigned sequentially (e.g. Table 001, Table 002). You can change it if seated at another table.
                  </p>
                </div>
              ) : (
                <div className="mt-3 p-3 bg-[#f0e6da]/60 rounded-xl border border-[#d9c7b5] flex items-center gap-2.5">
                  <PackageCheck className="w-4 h-4 text-[#e07a3f] shrink-0" />
                  <p className="text-xs text-[#5c4a3b]">
                    <strong>Takeaway Pickup:</strong> Collect your packaged meal at Counter 1 when status shows &quot;Ready&quot;.
                  </p>
                </div>
              )}
            </div>

            {/* Special Instructions */}
            <div>
              <label className="block text-xs font-semibold text-[#5c4a3b] mb-1">
                Special Kitchen Instructions (Optional)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-[#877260] absolute left-3 top-3" />
                <textarea
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Less spicy, extra ginger in chai, pack sauce separately"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14] focus:ring-2 focus:ring-[#e07a3f] focus:outline-none"
                />
              </div>
            </div>

            {/* Order Items Summary */}
            <div className="p-3.5 bg-[#faf7f2] rounded-xl border border-[#e8dfd3] space-y-2">
              <span className="text-xs font-semibold text-[#5c4a3b] block">Order Summary</span>
              <div className="max-h-36 overflow-y-auto divide-y divide-[#ebdcd0] text-xs pr-1">
                {cart.map((c) => (
                  <div key={c.menuItem.id} className="py-1.5 flex justify-between">
                    <span className="text-[#261c14]">
                      {c.quantity} × {c.menuItem.name}
                    </span>
                    <span className="font-mono text-[#5c4a3b] tabular-nums">
                      ₹{(c.menuItem.price * c.quantity).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#ebdcd0] flex justify-between text-sm font-bold text-[#261c14]">
                <span>Total Amount Payable</span>
                <span className="font-mono text-base text-[#e07a3f] tabular-nums">
                  ₹{subtotal.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Payment Mode Notice */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
              <ReceiptIndianRupee className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-snug">
                <strong>Pay at Counter:</strong> Cash or UPI will be collected at the counter. Your order goes to the kitchen queue immediately!
              </div>
            </div>

            {/* Confirm Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-[#e07a3f] hover:bg-[#cb672c] disabled:bg-[#a69280] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying & Sending to Kitchen...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Order · ₹{subtotal.toFixed(0)}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
