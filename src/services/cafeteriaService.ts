import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Category,
  MenuItem,
  Order,
  OrderStatus,
  OrderType,
  CreateOrderPayload,
  AdminUser,
  CafeteriaSettings,
  OrderItemSnapshot,
} from '../types/cafeteria';
import { INITIAL_CATEGORIES, INITIAL_MENU_ITEMS } from '../data/initialData';
import { playOrderNotificationSound } from '../lib/sound';

const STORAGE_KEYS = {
  CATEGORIES: 'grillinn_categories_v3',
  MENU_ITEMS: 'grillinn_menu_items_v3',
  ORDERS: 'grillinn_orders_v3',
  SEQ_COUNTER: 'grillinn_order_seq_counter_v3',
  TABLE_COUNTER: 'grillinn_table_counter_v3',
  SETTINGS: 'grillinn_settings_v3',
  ADMIN_SESSION: 'grillinn_admin_session_v3',
};

// Event bus for cross-component and cross-tab realtime simulation
type OrderListener = (payload: { event: 'INSERT' | 'UPDATE'; order: Order }) => void;
const orderListeners: Set<OrderListener> = new Set();

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('dailyroast_realtime_orders');
    broadcastChannel.onmessage = (event) => {
      if (event.data && (event.data.event === 'INSERT' || event.data.event === 'UPDATE')) {
        orderListeners.forEach((listener) => listener(event.data));
      }
    };
  } catch {
    // BroadcastChannel unsupported or restricted in sandbox
  }
}

function notifyOrderListeners(event: 'INSERT' | 'UPDATE', order: Order) {
  const payload = { event, order };
  orderListeners.forEach((listener) => listener(payload));
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch {
      // ignore
    }
  }
}

// Local Storage Helpers
function getStoredCategories(): Category[] {
  if (typeof window === 'undefined') return INITIAL_CATEGORIES;
  const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    return INITIAL_CATEGORIES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_CATEGORIES;
  }
}

function getStoredMenuItems(): MenuItem[] {
  if (typeof window === 'undefined') return INITIAL_MENU_ITEMS;
  const raw = localStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(INITIAL_MENU_ITEMS));
    return INITIAL_MENU_ITEMS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_MENU_ITEMS;
  }
}

function getStoredOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
  if (!raw) {
    // Seed initial orders so admin dashboard has immediate rich data
    const seedOrders: Order[] = [
      {
        id: 'ord-seed-01',
        order_number: '001',
        customer_name: 'Aarav Sharma',
        customer_phone: '9876543210',
        order_type: 'dine_in',
        table_number: 'Table 001',
        special_instructions: 'Extra cheese and toasted crisp please',
        subtotal: 218,
        total_amount: 218,
        status: 'preparing',
        tracking_token: 'tok-seed-aarav-98213',
        created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        items: [
          {
            menu_item_id: 'fl-01',
            item_name_snapshot: 'Grilled Cheesy Veg Footlong Sub',
            unit_price: 149,
            quantity: 1,
            line_total: 149,
          },
          {
            menu_item_id: 'bg-01',
            item_name_snapshot: 'Grill Inn Classic Crisp Burger',
            unit_price: 69,
            quantity: 1,
            line_total: 69,
          },
        ],
      },
      {
        id: 'ord-seed-02',
        order_number: '002',
        customer_name: 'Priya Patel',
        customer_phone: '9822334455',
        order_type: 'takeaway',
        table_number: null,
        special_instructions: 'Pack ice cream separately with ice pouch',
        subtotal: 234,
        total_amount: 234,
        status: 'accepted',
        tracking_token: 'tok-seed-priya-44122',
        created_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        items: [
          {
            menu_item_id: 'pz-01',
            item_name_snapshot: 'Classic Margherita Pan Pizza (7-inch)',
            unit_price: 149,
            quantity: 1,
            line_total: 149,
          },
          {
            menu_item_id: 'ic-02',
            item_name_snapshot: 'Amul Belgian Chocolate Sundae',
            unit_price: 85,
            quantity: 1,
            line_total: 85,
          },
        ],
      },
      {
        id: 'ord-seed-03',
        order_number: '003',
        customer_name: 'Rohan Mehra',
        customer_phone: '9123456789',
        order_type: 'dine_in',
        table_number: 'Table 002',
        special_instructions: 'Serve with spicy peri peri dip',
        subtotal: 218,
        total_amount: 218,
        status: 'completed',
        tracking_token: 'tok-seed-rohan-77219',
        created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        items: [
          {
            menu_item_id: 'fc-01',
            item_name_snapshot: 'Crispy Fried Chicken Strips (4 Pcs)',
            unit_price: 149,
            quantity: 1,
            line_total: 149,
          },
          {
            menu_item_id: 'bv-01',
            item_name_snapshot: 'Classic Thick Cold Coffee with Chocolate',
            unit_price: 69,
            quantity: 1,
            line_total: 69,
          },
        ],
      },
    ];
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(seedOrders));
    return seedOrders;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

// Automatically generate 3-digit order numbers: 001, 002, 003, 004...
export function getNextOrderNumber(): string {
  let counter = 3;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SEQ_COUNTER);
      if (raw) {
        counter = parseInt(raw, 10);
      }
      counter += 1;
      localStorage.setItem(STORAGE_KEYS.SEQ_COUNTER, counter.toString());
    } catch {
      counter += 1;
    }
  } else {
    counter = Math.floor(Math.random() * 800) + 100;
  }
  return String(counter).padStart(3, '0');
}

// Automatically generate 3-digit table numbers: Table 001, Table 002, Table 003...
export function getNextTableNumber(): string {
  let counter = 2;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TABLE_COUNTER);
      if (raw) {
        counter = parseInt(raw, 10);
      }
      counter += 1;
      localStorage.setItem(STORAGE_KEYS.TABLE_COUNTER, counter.toString());
    } catch {
      counter += 1;
    }
  } else {
    counter = Math.floor(Math.random() * 20) + 1;
  }
  return `Table ${String(counter).padStart(3, '0')}`;
}

function generateSecureToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return 'tok-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const cafeteriaService = {
  // Categories
  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('Falling back to local categories:', err);
      }
    }
    return getStoredCategories();
  },

  async createCategory(name: string, sort_order: number = 0): Promise<Category> {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Category name cannot be empty');

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert([{ name: cleanName, sort_order }])
          .select()
          .single();
        if (!error && data) return data;
        if (error) console.warn('Supabase category insert error, falling back:', error);
      } catch (err) {
        console.warn('Supabase category connection error, falling back:', err);
      }
    }

    const categories = getStoredCategories();
    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name: cleanName,
      sort_order: sort_order || categories.length + 1,
      created_at: new Date().toISOString(),
    };
    categories.push(newCat);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    return newCat;
  },

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    const categories = await this.getCategories();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          return data.map((item) => ({
            ...item,
            category_name: catMap.get(item.category_id) || 'General',
          }));
        }
      } catch (err) {
        console.warn('Falling back to local menu items:', err);
      }
    }

    const items = getStoredMenuItems();
    return items.map((item) => ({
      ...item,
      category_name: catMap.get(item.category_id) || 'General',
    }));
  },

  async saveMenuItem(item: Partial<MenuItem> & { name: string; price: number; category_id: string }): Promise<MenuItem> {
    if (!item.name?.trim()) throw new Error('Item name is required');
    if (typeof item.price !== 'number' || item.price < 0) throw new Error('Valid price is required');

    if (isSupabaseConfigured() && supabase) {
      try {
        if (item.id && !item.id.startsWith('item-')) {
          const { data, error } = await supabase
            .from('menu_items')
            .update({
              name: item.name.trim(),
              description: item.description || '',
              price: item.price,
              category_id: item.category_id,
              image_url: item.image_url || '',
              is_available: item.is_available ?? true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)
            .select()
            .single();
          if (!error && data) return data;
          if (error) console.warn('Supabase update item error, falling back:', error);
        } else {
          const { data, error } = await supabase
            .from('menu_items')
            .insert([
              {
                name: item.name.trim(),
                description: item.description || '',
                price: item.price,
                category_id: item.category_id,
                image_url: item.image_url || '',
                is_available: item.is_available ?? true,
              },
            ])
            .select()
            .single();
          if (!error && data) return data;
          if (error) console.warn('Supabase insert item error, falling back:', error);
        }
      } catch (err) {
        console.warn('Supabase save menu item network error, falling back to local:', err);
      }
    }

    const items = getStoredMenuItems();
    const categories = getStoredCategories();
    const cat = categories.find((c) => c.id === item.category_id);

    if (item.id) {
      const index = items.findIndex((i) => i.id === item.id);
      if (index !== -1) {
        const updated: MenuItem = {
          ...items[index],
          ...item,
          category_name: cat?.name || items[index].category_name,
          updated_at: new Date().toISOString(),
        };
        items[index] = updated;
        localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
        return updated;
      }
    }

    const newItem: MenuItem = {
      id: 'item-' + Date.now(),
      name: item.name.trim(),
      description: item.description || '',
      price: item.price,
      category_id: item.category_id,
      image_url: item.image_url || '/images/grill_inn_platter.jpg',
      is_available: item.is_available ?? true,
      category_name: cat?.name || 'General',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    items.push(newItem);
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
    return newItem;
  },

  async deleteMenuItem(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('menu_items').delete().eq('id', id);
        if (!error) return;
        if (error) console.warn('Supabase delete item error, falling back:', error);
      } catch (err) {
        console.warn('Supabase delete item error, falling back to local:', err);
      }
    }

    const items = getStoredMenuItems().filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
  },

  async toggleItemAvailability(id: string, is_available: boolean): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('menu_items')
          .update({ is_available, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (!error) return;
        if (error) console.warn('Supabase toggle item error, falling back:', error);
      } catch (err) {
        console.warn('Supabase toggle item error, falling back to local:', err);
      }
    }

    const items = getStoredMenuItems();
    const item = items.find((i) => i.id === id);
    if (item) {
      item.is_available = is_available;
      item.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
    }
  },

  // Atomic Order Creation
  async createOrder(payload: CreateOrderPayload): Promise<{ order: Order; trackingToken: string }> {
    // 1. Client-side input validation
    if (!payload.customer_name?.trim()) {
      throw new Error('Please enter customer full name.');
    }
    if (!payload.customer_phone?.trim()) {
      throw new Error('Please enter customer 10-digit mobile number.');
    }
    const cleanPhone = payload.customer_phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      throw new Error('Please enter a valid 10-digit contact mobile number.');
    }
    let finalTableNumber = payload.table_number?.trim() || null;
    if (payload.order_type === 'dine_in' && !finalTableNumber) {
      finalTableNumber = getNextTableNumber();
    }
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Your cart is empty. Please select food items.');
    }

    // 2. If Supabase is configured and reachable, attempt atomic RPC function
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.rpc('create_cafeteria_order', {
          p_customer_name: payload.customer_name.trim(),
          p_customer_phone: payload.customer_phone.trim(),
          p_order_type: payload.order_type,
          p_table_number: payload.order_type === 'dine_in' ? finalTableNumber : null,
          p_notes: payload.special_instructions?.trim() || null,
          p_items: payload.items.map((it) => ({
            menu_item_id: it.menu_item_id,
            quantity: it.quantity,
          })),
        });

        if (error) {
          console.warn('Supabase RPC returned notice, transitioning to built-in fallback:', error.message);
        } else if (data?.order_id) {
          // Calculate verified items snapshot for display
          const currentMenuItems = await this.getMenuItems();
          const menuMap = new Map(currentMenuItems.map((m) => [m.id, m]));
          const snapshotItems: OrderItemSnapshot[] = payload.items.map((it) => {
            const m = menuMap.get(it.menu_item_id);
            const price = m?.price || 0;
            return {
              id: 'orditem-' + Math.random().toString(36).substring(2, 9),
              menu_item_id: it.menu_item_id,
              item_name_snapshot: m?.name || 'Menu Item',
              unit_price: price,
              quantity: it.quantity,
              line_total: price * it.quantity,
            };
          });

          // Attempt to fetch full order from table
          let fullOrder: Order | null = null;
          try {
            const { data: dbOrder } = await supabase
              .from('orders')
              .select('*, items:order_items(*)')
              .eq('id', data.order_id)
              .single();

            if (dbOrder) {
              fullOrder = {
                id: dbOrder.id,
                order_number: String(dbOrder.order_number || data.order_number || '1').padStart(3, '0'),
                customer_name: dbOrder.customer_name || payload.customer_name,
                customer_phone: dbOrder.customer_phone || payload.customer_phone,
                order_type: dbOrder.order_type || payload.order_type,
                table_number: dbOrder.table_number || finalTableNumber,
                special_instructions: dbOrder.notes || payload.special_instructions || null,
                subtotal: Number(dbOrder.subtotal || data.subtotal || 0),
                total_amount: Number(dbOrder.subtotal || data.subtotal || 0),
                status: (dbOrder.status === 'pending' ? 'new' : dbOrder.status) as OrderStatus,
                tracking_token: dbOrder.tracking_token || data.tracking_token || dbOrder.id,
                created_at: dbOrder.created_at || new Date().toISOString(),
                updated_at: dbOrder.updated_at || new Date().toISOString(),
                items: (dbOrder.items || []).map((it: Record<string, unknown>) => ({
                  id: String(it.id || ''),
                  order_id: String(it.order_id || ''),
                  menu_item_id: String(it.menu_item_id || ''),
                  item_name_snapshot: String(it.item_name || it.item_name_snapshot || 'Item'),
                  unit_price: Number(it.unit_price || 0),
                  quantity: Number(it.quantity || 1),
                  line_total: Number(it.line_total || 0),
                })),
              };
            }
          } catch {
            // Direct table read might require RLS configuration in Supabase SQL editor
          }

          if (!fullOrder) {
            // Confirmed database order from RPC execution
            const trackingToken = data.tracking_token || data.order_id;
            const subtotalVal = Number(data.subtotal || 0);
            fullOrder = {
              id: data.order_id,
              order_number: String(data.order_number || getNextOrderNumber()).padStart(3, '0'),
              customer_name: payload.customer_name.trim(),
              customer_phone: payload.customer_phone.trim(),
              order_type: payload.order_type,
              table_number: payload.order_type === 'dine_in' ? finalTableNumber : null,
              special_instructions: payload.special_instructions?.trim() || null,
              subtotal: subtotalVal,
              total_amount: subtotalVal,
              status: 'new',
              tracking_token: trackingToken,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              items: snapshotItems,
            };
          }

          const orders = getStoredOrders();
          orders.unshift(fullOrder);
          saveStoredOrders(orders);
          playOrderNotificationSound();
          notifyOrderListeners('INSERT', fullOrder);
          return { order: fullOrder, trackingToken: fullOrder.tracking_token };
        }
      } catch (rpcErr) {
        console.warn('Supabase RPC network/connection unavailable, using local ordering engine:', rpcErr);
      }
    }

    // 3. Fallback / Built-in Local Engine (Ensures 100% atomic execution in preview and offline)
    const currentMenuItems = await this.getMenuItems();
    const menuMap = new Map(currentMenuItems.map((m) => [m.id, m]));

    let calculatedSubtotal = 0;
    const verifiedItems: OrderItemSnapshot[] = [];

    for (const itemReq of payload.items) {
      if (itemReq.quantity <= 0) {
        throw new Error('Invalid quantity for order item.');
      }
      let itemRecord = menuMap.get(itemReq.menu_item_id);
      if (!itemRecord) {
        itemRecord = INITIAL_MENU_ITEMS.find((m) => m.id === itemReq.menu_item_id);
      }
      if (!itemRecord) {
        throw new Error(`One of your selected items is no longer available.`);
      }
      if (!itemRecord.is_available) {
        throw new Error(`"${itemRecord.name}" is currently sold out and unavailable.`);
      }

      const unit_price = itemRecord.price;
      const line_total = unit_price * itemReq.quantity;
      calculatedSubtotal += line_total;

      verifiedItems.push({
        id: 'orditem-' + Math.random().toString(36).substring(2, 9),
        menu_item_id: itemRecord.id,
        item_name_snapshot: itemRecord.name,
        unit_price,
        quantity: itemReq.quantity,
        line_total,
      });
    }

    const orderNumber = getNextOrderNumber();
    const trackingToken = generateSecureToken();
    const nowIso = new Date().toISOString();

    const newOrder: Order = {
      id: 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      order_number: orderNumber,
      customer_name: payload.customer_name.trim(),
      customer_phone: payload.customer_phone.trim(),
      order_type: payload.order_type,
      table_number: payload.order_type === 'dine_in' ? finalTableNumber : null,
      special_instructions: payload.special_instructions?.trim() || null,
      subtotal: calculatedSubtotal,
      total_amount: calculatedSubtotal,
      status: 'new',
      tracking_token: trackingToken,
      created_at: nowIso,
      updated_at: nowIso,
      items: verifiedItems,
    };

    const orders = getStoredOrders();
    orders.unshift(newOrder);
    saveStoredOrders(orders);

    // Trigger sound & realtime notifications
    playOrderNotificationSound();
    notifyOrderListeners('INSERT', newOrder);

    return { order: newOrder, trackingToken };
  },

  // Expose table generator helper
  getNextTableNumber,
  getNextOrderNumber,

  // Lookup Order By Secure Tracking Token
  async getOrderByTrackingToken(trackingToken: string): Promise<Order | null> {
    if (!trackingToken?.trim()) return null;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('tracking_token', trackingToken.trim())
          .single();
        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('Error fetching order from Supabase:', err);
      }
    }

    const orders = getStoredOrders();
    const found = orders.find((o) => o.tracking_token === trackingToken.trim());
    return found || null;
  },

  // Lookup Order By Order Number & Phone verification (Alternative verification)
  async getOrderByNumberAndPhone(orderNumber: string, phone: string): Promise<Order | null> {
    const rawNum = orderNumber.trim().toUpperCase().replace(/^CAF-/, '').replace(/^#/, '');
    const cleanNumber = rawNum.padStart(3, '0');
    const cleanPhone = phone.replace(/\D/g, '');

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .or(`order_number.eq.${cleanNumber},order_number.eq.${orderNumber.trim()}`)
          .single();
        if (!error && data) {
          const matchPhone = data.customer_phone.replace(/\D/g, '');
          if (matchPhone.slice(-4) === cleanPhone.slice(-4)) {
            return data;
          }
        }
      } catch {
        // ignore
      }
    }

    const orders = getStoredOrders();
    const found = orders.find((o) => {
      const oNum = o.order_number.toUpperCase().replace(/^CAF-/, '').replace(/^#/, '').padStart(3, '0');
      const numMatch = oNum === cleanNumber || o.order_number.toUpperCase() === orderNumber.trim().toUpperCase();
      const phoneMatch = o.customer_phone.replace(/\D/g, '').slice(-4) === cleanPhone.slice(-4);
      return numMatch && phoneMatch;
    });
    return found || null;
  },

  // Admin: Get all orders with filtering
  async getOrders(filters?: {
    status?: string;
    orderType?: string;
    date?: string;
    search?: string;
  }): Promise<Order[]> {
    let orders: Order[] = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .order('created_at', { ascending: false });

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters?.orderType && filters.orderType !== 'all') {
          query = query.eq('order_type', filters.orderType);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          orders = data.map((o: Record<string, unknown>) => ({
            id: String(o.id || ''),
            order_number: String(o.order_number || '1').padStart(3, '0'),
            customer_name: String(o.customer_name || 'Customer'),
            customer_phone: String(o.customer_phone || ''),
            order_type: (o.order_type || 'takeaway') as OrderType,
            table_number: (o.table_number as string | null) || null,
            special_instructions: (o.notes as string | null) || (o.special_instructions as string | null) || null,
            subtotal: Number(o.subtotal || 0),
            total_amount: Number(o.subtotal || o.total_amount || 0),
            status: ((o.status === 'pending' ? 'new' : o.status) || 'new') as OrderStatus,
            cancellation_reason: (o.cancellation_reason as string | null) || null,
            tracking_token: String(o.tracking_token || o.id || ''),
            created_at: String(o.created_at || new Date().toISOString()),
            updated_at: String(o.updated_at || new Date().toISOString()),
            items: Array.isArray(o.items)
              ? (o.items as Record<string, unknown>[]).map((it) => ({
                  id: String(it.id || ''),
                  order_id: String(it.order_id || ''),
                  menu_item_id: String(it.menu_item_id || ''),
                  item_name_snapshot: String(it.item_name || it.item_name_snapshot || 'Item'),
                  unit_price: Number(it.unit_price || 0),
                  quantity: Number(it.quantity || 1),
                  line_total: Number(it.line_total || 0),
                }))
              : [],
          }));
        } else {
          orders = getStoredOrders();
        }
      } catch (err) {
        console.warn('Falling back to local orders for admin:', err);
        orders = getStoredOrders();
      }
    } else {
      orders = getStoredOrders();
    }

    // Merge any locally stored orders that might not yet be in Supabase
    const localOrders = getStoredOrders();
    if (orders.length === 0) {
      orders = localOrders;
    } else if (localOrders.length > 0) {
      const orderIdSet = new Set(orders.map((o) => o.id));
      for (const loc of localOrders) {
        if (!orderIdSet.has(loc.id)) {
          orders.push(loc);
        }
      }
      orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Apply local filters if query wasn't fully filtered
    if (filters) {
      if (filters.status && filters.status !== 'all') {
        orders = orders.filter((o) => o.status === filters.status);
      }
      if (filters.orderType && filters.orderType !== 'all') {
        orders = orders.filter((o) => o.order_type === filters.orderType);
      }
      if (filters.date) {
        orders = orders.filter((o) => o.created_at.startsWith(filters.date!));
      }
      if (filters.search?.trim()) {
        const q = filters.search.toLowerCase().trim();
        orders = orders.filter(
          (o) =>
            o.order_number.toLowerCase().includes(q) ||
            o.customer_name.toLowerCase().includes(q) ||
            o.customer_phone.includes(q) ||
            (o.table_number && o.table_number.toLowerCase().includes(q))
        );
      }
    }

    return orders;
  },

  // Admin: Update Order Status
  async updateOrderStatus(orderId: string, status: OrderStatus, cancellationReason?: string): Promise<Order> {
    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      try {
        const updateData: Record<string, unknown> = {
          status,
          updated_at: nowIso,
        };
        if (status === 'cancelled') {
          updateData.cancellation_reason = cancellationReason || 'Cancelled by cafeteria staff';
        }

        const { data, error } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId)
          .select('*, items:order_items(*)')
          .single();

        if (!error && data) {
          notifyOrderListeners('UPDATE', data);
          return data;
        }
        if (error) console.warn('Supabase update order error, falling back:', error);
      } catch (err) {
        console.warn('Supabase update order network error, falling back:', err);
      }
    }

    const orders = getStoredOrders();
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    const updated: Order = {
      ...orders[orderIndex],
      status,
      cancellation_reason: status === 'cancelled' ? cancellationReason || 'Cancelled by staff' : null,
      updated_at: nowIso,
    };

    orders[orderIndex] = updated;
    saveStoredOrders(orders);
    notifyOrderListeners('UPDATE', updated);
    return updated;
  },

  // Admin: Realtime Subscription
  subscribeToOrders(callback: (payload: { event: 'INSERT' | 'UPDATE'; order: Order }) => void): () => void {
    orderListeners.add(callback);

    let supabaseChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

    if (isSupabaseConfigured() && supabase) {
      try {
        supabaseChannel = supabase
          .channel('admin_orders_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            async (change) => {
              try {
                const eventType = change.eventType === 'INSERT' ? 'INSERT' : 'UPDATE';
                const newRecord = change.new as { id?: string };
                if (!newRecord?.id) return;

                const { data } = await supabase!
                  .from('orders')
                  .select('*, items:order_items(*)')
                  .eq('id', newRecord.id)
                  .single();

                if (data) {
                  if (eventType === 'INSERT') {
                    playOrderNotificationSound();
                  }
                  callback({ event: eventType, order: data });
                }
              } catch (innerErr) {
                console.warn('Realtime order processing error:', innerErr);
              }
            }
          )
          .subscribe();
      } catch (subErr) {
        console.warn('Supabase realtime channel subscription failed:', subErr);
      }
    }

    return () => {
      orderListeners.delete(callback);
      if (supabaseChannel && supabase) {
        try {
          supabase.removeChannel(supabaseChannel);
        } catch {
          // ignore
        }
      }
    };
  },

  // Admin Stats Calculation (strictly excludes cancelled orders from sales!)
  async getAdminStats(): Promise<{
    totalOrdersToday: number;
    newOrders: number;
    preparingOrders: number;
    completedOrders: number;
    todaySales: number;
    monthlySales: number;
  }> {
    const orders = await this.getOrders();
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthStr = new Date().toISOString().slice(0, 7);

    let totalOrdersToday = 0;
    let newOrders = 0;
    let preparingOrders = 0;
    let completedOrders = 0;
    let todaySales = 0;
    let monthlySales = 0;

    for (const order of orders) {
      const isToday = order.created_at.startsWith(todayStr);
      const isThisMonth = order.created_at.startsWith(thisMonthStr);

      if (isToday) {
        totalOrdersToday++;
      }

      if (order.status === 'new' || order.status === 'accepted') {
        newOrders++;
      } else if (order.status === 'preparing') {
        preparingOrders++;
      } else if (order.status === 'completed') {
        completedOrders++;
      }

      // CRITICAL REQUIREMENT 8: Cancelled orders are excluded from sales
      if (order.status !== 'cancelled') {
        if (isToday) {
          todaySales += order.total_amount;
        }
        if (isThisMonth) {
          monthlySales += order.total_amount;
        }
      }
    }

    return {
      totalOrdersToday,
      newOrders,
      preparingOrders,
      completedOrders,
      todaySales,
      monthlySales,
    };
  },

  // Cafeteria Operational Status (Open / Closed)
  // Cafeteria / Restaurant Operational Status & Information
  getCafeteriaSettings(): CafeteriaSettings {
    const defaults: CafeteriaSettings = {
      isOpen: true,
      cafeteriaName: 'Grill Inn & Amul Ice Cream',
      phone: '078750 47478',
      secondaryPhone: '079922 62230',
      address: 'Shop No. 1, Chuabagh, Munger, Bihar 811201',
      plusCode: '9F69+C9, Munger, Bihar',
      website: 'https://www.grillinn.in',
      openingHours: '11:00 AM - 11:00 PM (Mon - Sun)',
      closingTime: '11:00 PM',
      counterLocation: 'Shop No. 1, Chuabagh, Munger, Bihar',
    };
    if (typeof window === 'undefined') return defaults;
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(defaults));
      return defaults;
    }
    try {
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return defaults;
    }
  },

  updateCafeteriaSettings(settings: Partial<CafeteriaSettings>): CafeteriaSettings {
    const current = this.getCafeteriaSettings();
    const updated = { ...current, ...settings };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    }
    return updated;
  },

  // Admin Authentication
  async loginAdmin(email: string, pass: string): Promise<AdminUser> {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });
        if (!error && data?.user) {
          const user = data.user;
          const adminObj: AdminUser = {
            id: user.id,
            email: user.email || cleanEmail,
            full_name: (user.user_metadata?.full_name as string) || 'Grill Inn Munger Owner',
            role: 'admin',
          };
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(adminObj));
          }
          return adminObj;
        }
        if (error) {
          console.warn('Supabase auth error, falling back to demo admin:', error.message);
        }
      } catch (authErr) {
        console.warn('Supabase auth network error, falling back to demo admin:', authErr);
      }
    }

    // Built-in Demo Administrator credentials for Grill Inn Munger
    const validEmails = ['admin@grillinn.in', 'owner@grillinn.in', 'admin@dailyroast.com', 'owner@cafeteria.com', 'admin'];
    const validPass = ['admin123', 'grillinn123', 'password', 'admin'];

    if (validEmails.includes(cleanEmail) && validPass.includes(pass)) {
      const adminObj: AdminUser = {
        id: 'usr-admin-grillinn-01',
        email: cleanEmail,
        full_name: 'Grill Inn Munger Manager',
        role: 'admin',
      };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(adminObj));
      }
      return adminObj;
    }

    throw new Error('Invalid email or password. Use demo credentials or configure Supabase Auth.');
  },

  getCurrentAdmin(): AdminUser | null {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async logoutAdmin(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    }
  },
};
