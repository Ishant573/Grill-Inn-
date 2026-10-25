export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type OrderType = 'dine_in' | 'takeaway';

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  created_at?: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number; // in INR
  image_url: string;
  is_available: boolean;
  category_name?: string;
  is_unconfirmed_price?: boolean; // Marked if unconfirmed until owner verifies in dashboard
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface OrderItemSnapshot {
  id?: string;
  order_id?: string;
  menu_item_id: string;
  item_name_snapshot: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string; // 001, 002...
  customer_name: string;
  customer_phone: string;
  order_type: OrderType;
  table_number?: string | null;
  special_instructions?: string | null;
  subtotal: number;
  total_amount: number;
  status: OrderStatus;
  cancellation_reason?: string | null;
  tracking_token: string;
  created_at: string;
  updated_at: string;
  items?: OrderItemSnapshot[];
}

export interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  order_type: OrderType;
  table_number?: string | null;
  special_instructions?: string | null;
  items: {
    menu_item_id: string;
    quantity: number;
  }[];
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'staff';
}

export interface CafeteriaSettings {
  isOpen: boolean;
  cafeteriaName: string;
  phone: string;
  secondaryPhone: string;
  address: string;
  plusCode: string;
  website: string;
  openingHours: string;
  closingTime: string; // Listed closing time (e.g. 11:00 PM)
  counterLocation: string;
}
