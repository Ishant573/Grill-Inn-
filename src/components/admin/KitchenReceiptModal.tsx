import React from 'react';
import { X, Printer, Coffee } from 'lucide-react';
import { Order, CafeteriaSettings } from '../../types/cafeteria';

interface KitchenReceiptModalProps {
  order: Order | null;
  settings: CafeteriaSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const KitchenReceiptModal: React.FC<KitchenReceiptModalProps> = ({
  order,
  settings,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.created_at).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-300">
          {/* Action Bar (hidden when printing) */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4 print:hidden">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Kitchen KOT / Thermal Receipt
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-[#261c14] hover:bg-[#3d2f23] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Ticket Area */}
          <div id="kitchen-receipt" className="font-mono text-xs text-black leading-tight space-y-3">
            {/* Header */}
            <div className="text-center border-b border-dashed border-stone-400 pb-2">
              <div className="font-bold text-sm uppercase tracking-wide">
                {settings.cafeteriaName}
              </div>
              <div className="text-[10px] text-stone-600">{settings.counterLocation}</div>
              <div className="text-[10px] text-stone-600">Ph: {settings.phone}</div>
              <div className="mt-1 font-bold text-sm bg-stone-100 py-0.5 rounded">
                KITCHEN ORDER TICKET (KOT)
              </div>
            </div>

            {/* Order Identifiers */}
            <div className="border-b border-dashed border-stone-400 pb-2 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>ORDER NO:</span>
                <span className="font-bold text-sm">#{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE/TIME:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>TYPE:</span>
                <span className="font-bold uppercase">
                  {order.order_type === 'dine_in' ? `DINE-IN (${order.table_number})` : 'TAKEAWAY (COUNTER)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GUEST:</span>
                <span>{order.customer_name} ({order.customer_phone})</span>
              </div>
            </div>

            {/* Special Instructions Prominently Highlighted */}
            {order.special_instructions && (
              <div className="bg-stone-100 p-2 border border-black rounded text-[11px]">
                <div className="font-bold underline">CHEF INSTRUCTIONS:</div>
                <div className="font-semibold">{order.special_instructions}</div>
              </div>
            )}

            {/* Items Table */}
            <div className="border-b border-dashed border-stone-400 pb-2">
              <div className="flex justify-between font-bold border-b border-stone-300 pb-1 mb-1 text-[11px]">
                <span>QTY & ITEM</span>
                <span>AMOUNT</span>
              </div>
              <div className="space-y-1 text-[11px]">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="font-bold">
                      {item.quantity} × {item.item_name_snapshot}
                    </span>
                    <span>₹{item.line_total.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="pt-1 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>₹{order.subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t border-black pt-1">
                <span>TOTAL PAYABLE:</span>
                <span>₹{order.total_amount.toFixed(0)}</span>
              </div>
              <div className="text-[10px] text-center text-stone-500 pt-2 border-t border-dashed border-stone-400">
                Payment: Cash / UPI at Counter · Keep this copy for records
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
