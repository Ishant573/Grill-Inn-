import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, MenuItem, OrderType } from '../types/cafeteria';
import { cafeteriaService } from '../services/cafeteriaService';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  totalItemsCount: number;
  subtotal: number;
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  tableNumber: string;
  setTableNumber: (val: string) => void;
  assignNextTableNumber: () => string;
  specialInstructions: string;
  setSpecialInstructions: (val: string) => void;
  customerName: string;
  setCustomerName: (val: string) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  revalidateCart: () => Promise<{ hasUnavailable: boolean; removedCount: number }>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'dailyroast_cart_items_v1';
const CART_META_KEY = 'dailyroast_cart_meta_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [tableNumber, setTableNumber] = useState<string>(() => {
    return cafeteriaService.getNextTableNumber();
  });
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);

  // Helper to re-generate next table number (e.g. Table 001, Table 002)
  const assignNextTableNumber = (): string => {
    const next = cafeteriaService.getNextTableNumber();
    setTableNumber(next);
    return next;
  };

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  // Load customer metadata if previously typed
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_META_KEY);
      if (raw) {
        const meta = JSON.parse(raw);
        if (meta.customerName) setCustomerName(meta.customerName);
        if (meta.customerPhone) setCustomerPhone(meta.customerPhone);
        if (meta.tableNumber) setTableNumber(meta.tableNumber);
        if (meta.orderType) setOrderType(meta.orderType);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save metadata changes
  useEffect(() => {
    try {
      localStorage.setItem(
        CART_META_KEY,
        JSON.stringify({ customerName, customerPhone, tableNumber, orderType })
      );
    } catch {
      // ignore
    }
  }, [customerName, customerPhone, tableNumber, orderType]);

  const addToCart = (item: MenuItem, quantity: number = 1) => {
    if (!item.is_available) {
      alert(`Sorry, "${item.name}" is currently unavailable.`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.menuItem.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { menuItem: item, quantity }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.menuItem.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setCart([]);
    setSpecialInstructions('');
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  // Revalidate cart against latest menu records
  const revalidateCart = async (): Promise<{ hasUnavailable: boolean; removedCount: number }> => {
    const freshItems = await cafeteriaService.getMenuItems();
    const freshMap = new Map(freshItems.map((m) => [m.id, m]));

    let removedCount = 0;
    let hasUnavailable = false;

    setCart((prev) => {
      const updated: CartItem[] = [];
      for (const item of prev) {
        const fresh = freshMap.get(item.menuItem.id);
        if (!fresh || !fresh.is_available) {
          removedCount += item.quantity;
          hasUnavailable = true;
        } else {
          updated.push({
            menuItem: fresh,
            quantity: item.quantity,
          });
        }
      }
      return updated;
    });

    return { hasUnavailable, removedCount };
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItemsCount,
        subtotal,
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
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        revalidateCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
