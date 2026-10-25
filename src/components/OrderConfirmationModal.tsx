import React from 'react';
import { CheckCircle2, Clock, MapPin, PackageCheck, Utensils, ArrowRight, Printer } from 'lucide-react';
import { Order } from '../types/cafeteria';

interface OrderConfirmationModalProps {
  order: Order | null;
  trackingToken: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  trackingToken: _trackingToken,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const formattedDate = new Date(order.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" />

      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#e8dfd3]">
          {/* Success Banner */}
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#261c14] tracking-tight">
              Order Sent to Kitchen!
            </h2>
            <p className="text-xs text-[#786454] mt-1">
              Your order has been safely placed and is now queued with our chefs.
            </p>
          </div>

          {/* Key Order Badge */}
          <div className="mt-6 p-4 rounded-xl bg-[#faf7f2] border border-[#e8dfd3] text-center space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#877260]">
              Unique Order Identifier
            </span>
            <div className="font-mono text-3xl font-extrabold text-[#e07a3f] tracking-wide">
              Order #{order.order_number}
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-[#786454] pt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#877260]" />
                {formattedDate}
              </span>
              <span>·</span>
              <span className="capitalize font-semibold text-emerald-700">
                Status: {order.status}
              </span>
            </div>
          </div>

          {/* Customer & Dining Details */}
          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#faf7f2] border border-[#ebdcd0]">
              <span className="text-[#877260] block font-medium">Customer</span>
              <span className="font-semibold text-[#261c14] mt-0.5 block truncate">
                {order.customer_name}
              </span>
              <span className="text-[#786454] font-mono">{order.customer_phone}</span>
            </div>

            <div className="p-3 rounded-lg bg-[#faf7f2] border border-[#ebdcd0]">
              <span className="text-[#877260] block font-medium">Service Type</span>
              {order.order_type === 'dine_in' ? (
                <div className="mt-0.5">
                  <span className="font-bold text-[#261c14] flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5 text-[#e07a3f]" />
                    Dine-in
                  </span>
                  <span className="text-xs font-semibold text-[#e07a3f] block">
                    {order.table_number || 'Table Assigned'}
                  </span>
                </div>
              ) : (
                <div className="mt-0.5">
                  <span className="font-bold text-[#261c14] flex items-center gap-1">
                    <PackageCheck className="w-3.5 h-3.5 text-[#e07a3f]" />
                    Takeaway
                  </span>
                  <span className="text-[11px] text-[#786454] block">Pickup Counter 1</span>
                </div>
              )}
            </div>
          </div>

          {/* Special Instructions if present */}
          {order.special_instructions && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900">
              <span className="font-semibold">Note:</span> {order.special_instructions}
            </div>
          )}

          {/* Itemized Snapshot List */}
          <div className="mt-5 border-t border-[#ebdcd0] pt-4">
            <h4 className="text-xs font-bold text-[#5c4a3b] uppercase tracking-wider mb-2">
              Ordered Items
            </h4>
            <div className="max-h-40 overflow-y-auto divide-y divide-[#f0e6da] text-xs">
              {order.items?.map((item, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#261c14]">
                      {item.quantity} × {item.item_name_snapshot}
                    </span>
                  </div>
                  <span className="font-mono text-[#5c4a3b] tabular-nums">
                    ₹{item.line_total.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-[#ebdcd0] flex justify-between items-center text-sm font-bold text-[#261c14]">
              <span>Total Payable at Counter</span>
              <span className="font-mono text-xl text-[#e07a3f] tabular-nums">
                ₹{order.total_amount.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-[#8b181b] hover:bg-[#a81c20] text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>Back to Menu / Done</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
