import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BellRing,
  Volume2,
  VolumeX,
  LogOut,
  UtensilsCrossed,
  Clock,
  Printer,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Download,
  Calendar,
  ChefHat,
  AlertTriangle,
  Store,
  RefreshCw,
  ShoppingBag,
  Settings,
  MapPin,
  Phone,
  Globe,
  Flame,
  Database,
} from 'lucide-react';
import {
  Order,
  OrderStatus,
  OrderType,
  Category,
  MenuItem,
  CafeteriaSettings,
  AdminUser,
} from '../../types/cafeteria';
import { cafeteriaService } from '../../services/cafeteriaService';
import { KitchenReceiptModal } from './KitchenReceiptModal';
import { SupabaseDiagnosticModal } from '../SupabaseDiagnosticModal';
import { playOrderNotificationSound } from '../../lib/sound';

interface AdminDashboardProps {
  adminUser: AdminUser;
  onLogout: () => void;
  onViewStorefront: () => void;
  settings: CafeteriaSettings;
  onUpdateSettings: (newSettings: Partial<CafeteriaSettings>) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  onLogout,
  onViewStorefront,
  settings,
  onUpdateSettings,
}) => {
  // Navigation tabs: 'live' | 'menu' | 'reports' | 'settings'
  const [activeTab, setActiveTab] = useState<'live' | 'menu' | 'reports' | 'settings'>('live');

  // Restaurant Settings Form State
  const [restaurantForm, setRestaurantForm] = useState<CafeteriaSettings>(settings);
  const [settingsSavedAlert, setSettingsSavedAlert] = useState<boolean>(false);

  // Sync settings prop if updated externally
  useEffect(() => {
    setRestaurantForm(settings);
  }, [settings]);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Audio Notifications Toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [newOrderToast, setNewOrderToast] = useState<string | null>(null);

  // KOT Modal
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(false);

  // Cancel Order Modal State
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Menu Management State
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isEditingItemModalOpen, setIsEditingItemModalOpen] = useState<boolean>(false);
  const [itemForm, setItemForm] = useState<Partial<MenuItem>>({
    name: '',
    category_id: '',
    price: 50,
    description: '',
    image_url: '',
    is_available: true,
  });
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Load Initial Data
  const loadOrders = useCallback(async () => {
    try {
      setIsLoadingOrders(true);
      const data = await cafeteriaService.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  const loadMenuData = useCallback(async () => {
    try {
      const [cats, items] = await Promise.all([
        cafeteriaService.getCategories(),
        cafeteriaService.getMenuItems(),
      ]);
      setCategories(cats);
      setMenuItems(items);
      if (cats.length > 0 && !itemForm.category_id) {
        setItemForm((prev) => ({ ...prev, category_id: cats[0].id }));
      }
    } catch (err) {
      console.error('Failed to load menu data:', err);
    }
  }, [itemForm.category_id]);

  useEffect(() => {
    loadOrders();
    loadMenuData();
  }, [loadOrders, loadMenuData]);

  // Realtime Order Subscription
  useEffect(() => {
    const unsubscribe = cafeteriaService.subscribeToOrders(({ event, order }) => {
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === order.id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = order;
          return updated;
        } else {
          return [order, ...prev];
        }
      });

      if (event === 'INSERT') {
        if (soundEnabled) {
          playOrderNotificationSound();
        }
        setNewOrderToast(`New Order Incoming: ${order.order_number} (${order.customer_name})`);
        setTimeout(() => setNewOrderToast(null), 6000);
      }
    });

    return () => unsubscribe();
  }, [soundEnabled]);

  // KPIs Calculation (excluding cancelled orders from sales per requirement 8)
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthStr = new Date().toISOString().slice(0, 7);

    let totalToday = 0;
    let pending = 0;
    let preparing = 0;
    let completed = 0;
    let todaySales = 0;
    let monthlySales = 0;

    orders.forEach((o) => {
      const isToday = o.created_at.startsWith(todayStr);
      const isThisMonth = o.created_at.startsWith(thisMonthStr);

      if (isToday) totalToday++;
      if (o.status === 'new' || o.status === 'accepted') pending++;
      if (o.status === 'preparing') preparing++;
      if (o.status === 'completed') completed++;

      // Strict exclusion of cancelled orders
      if (o.status !== 'cancelled') {
        if (isToday) todaySales += o.total_amount;
        if (isThisMonth) monthlySales += o.total_amount;
      }
    });

    return { totalToday, pending, preparing, completed, todaySales, monthlySales };
  }, [orders]);

  // Status transitions
  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const updated = await cafeteriaService.updateOrderStatus(orderId, nextStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err) {
      alert('Failed to update order status: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOrderId) return;
    try {
      const updated = await cafeteriaService.updateOrderStatus(
        cancellingOrderId,
        'cancelled',
        cancelReason.trim() || 'Cancelled by cafeteria counter'
      );
      setOrders((prev) => prev.map((o) => (o.id === cancellingOrderId ? updated : o)));
      setCancellingOrderId(null);
      setCancelReason('');
    } catch (err) {
      alert('Failed to cancel order: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Menu item actions
  const handleToggleItemAvailability = async (itemId: string, current: boolean) => {
    try {
      await cafeteriaService.toggleItemAvailability(itemId, !current);
      setMenuItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, is_available: !current } : i))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from the menu?`)) return;
    try {
      await cafeteriaService.deleteMenuItem(itemId);
      setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name?.trim()) return;
    try {
      const saved = await cafeteriaService.saveMenuItem({
        id: itemForm.id,
        name: itemForm.name.trim(),
        price: Number(itemForm.price),
        category_id: itemForm.category_id || categories[0]?.id || '',
        description: itemForm.description || '',
        image_url: itemForm.image_url || '/src/assets/images/food_gourmet_burger_fries_1792905263729.jpg',
        is_available: itemForm.is_available ?? true,
      });

      setMenuItems((prev) => {
        const idx = prev.findIndex((i) => i.id === saved.id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [saved, ...prev];
      });

      setIsEditingItemModalOpen(false);
      setItemForm({
        name: '',
        category_id: categories[0]?.id || '',
        price: 50,
        description: '',
        image_url: '',
        is_available: true,
      });
    } catch (err) {
      alert('Failed to save menu item: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await cafeteriaService.createCategory(newCategoryName.trim());
      setCategories((prev) => [...prev, newCat]);
      setNewCategoryName('');
      setIsNewCategoryModalOpen(false);
    } catch (err) {
      alert('Failed to create category: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleSaveRestaurantSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(restaurantForm);
    setSettingsSavedAlert(true);
    setTimeout(() => {
      setSettingsSavedAlert(false);
    }, 4000);
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Order Number',
      'Created At',
      'Customer Name',
      'Customer Phone',
      'Order Type',
      'Table Number',
      'Status',
      'Total Amount (INR)',
      'Special Instructions',
      'Cancellation Reason',
    ];

    const rows = orders.map((o) => [
      `"${o.order_number}"`,
      `"${o.created_at}"`,
      `"${o.customer_name.replace(/"/g, '""')}"`,
      `"${o.customer_phone}"`,
      `"${o.order_type}"`,
      `"${o.table_number || ''}"`,
      `"${o.status}"`,
      `"${o.total_amount}"`,
      `"${(o.special_instructions || '').replace(/"/g, '""')}"`,
      `"${(o.cancellation_reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dailyroast_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Orders for Tab
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchType = orderTypeFilter === 'all' || o.order_type === orderTypeFilter;
      const matchDate = !dateFilter || o.created_at.startsWith(dateFilter);
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q) ||
        (o.table_number && o.table_number.toLowerCase().includes(q));
      return matchStatus && matchType && matchDate && matchSearch;
    });
  }, [orders, statusFilter, orderTypeFilter, dateFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#261c14] pb-16">
      {/* Top Notification Toast */}
      {newOrderToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#e07a3f] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
          <BellRing className="w-5 h-5 text-white animate-spin" />
          <span className="text-xs font-bold">{newOrderToast}</span>
        </div>
      )}

      {/* Admin Top Bar */}
      <header className="sticky top-0 z-40 bg-[#261c14] text-[#faf7f2] border-b border-[#3d2f23] shadow-md px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & User info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#e07a3f] text-white flex items-center justify-center font-bold">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base leading-tight flex items-center gap-2">
              <span>{settings.cafeteriaName}</span>
              <span className="text-[11px] font-semibold bg-[#3d2f23] text-[#e07a3f] px-2 py-0.5 rounded-md">
                Owner Ops
              </span>
            </div>
            <div className="text-[11px] text-[#c4b5a5]">
              Logged in as {adminUser.full_name} ({adminUser.email})
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Cafeteria Open/Closed Master Toggle */}
          <button
            onClick={() => onUpdateSettings({ isOpen: !settings.isOpen })}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              settings.isOpen
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
                : 'bg-rose-950 text-rose-300 border border-rose-700 hover:bg-rose-900'
            }`}
            title="Toggle whether customers can place incoming orders"
          >
            <Store className="w-3.5 h-3.5" />
            <span>{settings.isOpen ? 'Kitchen Open' : 'Kitchen Closed'}</span>
          </button>

          {/* Sound Notification Chime Toggle */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playOrderNotificationSound();
            }}
            className={`p-2 rounded-xl text-xs transition-colors border ${
              soundEnabled
                ? 'bg-[#3d2f23] text-[#e07a3f] border-[#5c4a3b]'
                : 'bg-[#1f1710] text-[#786454] border-[#33251a]'
            }`}
            title={soundEnabled ? 'Order sound alert ON (click to mute)' : 'Order sound alert OFF (click to enable)'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Supabase Connection Diagnostics */}
          <button
            onClick={() => setIsDiagnosticOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a2e22] text-emerald-300 border border-emerald-800 hover:bg-[#203a2b] transition-colors flex items-center gap-1.5"
            title="Test Supabase database connection and diagnostics"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">DB Status</span>
          </button>

          {/* View Storefront */}
          <button
            onClick={onViewStorefront}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#3d2f23] hover:bg-[#4d3b2c] text-[#faf7f2] transition-colors"
          >
            View Customer Site
          </button>

          {/* Sign Out */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/60 transition-colors"
            title="Sign out of owner dashboard"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Metrics Overview Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-white border border-[#e8dfd3] shadow-2xs">
            <span className="text-[11px] font-semibold text-[#877260] uppercase tracking-wider block">
              Today&apos;s Orders
            </span>
            <span className="font-mono text-2xl font-black text-[#261c14] mt-1 block tabular-nums">
              {stats.totalToday}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#e8dfd3] shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
              New / Pending
            </span>
            <span className="font-mono text-2xl font-black text-amber-600 mt-1 block tabular-nums">
              {stats.pending}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#e8dfd3] shadow-2xs">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
              In Kitchen
            </span>
            <span className="font-mono text-2xl font-black text-blue-600 mt-1 block tabular-nums">
              {stats.preparing}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#e8dfd3] shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
              Completed
            </span>
            <span className="font-mono text-2xl font-black text-emerald-600 mt-1 block tabular-nums">
              {stats.completed}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#e8dfd3] shadow-2xs">
            <span className="text-[11px] font-semibold text-[#877260] uppercase tracking-wider block">
              Today&apos;s Sales
            </span>
            <span className="font-mono text-xl font-black text-[#e07a3f] mt-1 block tabular-nums">
              ₹{stats.todaySales.toFixed(0)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#e8dfd3] shadow-2xs">
            <span className="text-[11px] font-semibold text-[#877260] uppercase tracking-wider block">
              Monthly Sales
            </span>
            <span className="font-mono text-xl font-black text-[#261c14] mt-1 block tabular-nums">
              ₹{stats.monthlySales.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#e8dfd3] pb-3 mb-6">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'live'
                ? 'bg-[#261c14] text-white shadow-2xs'
                : 'bg-white text-[#5c4a3b] border border-[#d9c7b5] hover:bg-[#f0e6da]'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Live Kitchen Orders ({orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'menu'
                ? 'bg-[#261c14] text-white shadow-2xs'
                : 'bg-white text-[#5c4a3b] border border-[#d9c7b5] hover:bg-[#f0e6da]'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Menu Management ({menuItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-[#261c14] text-white shadow-2xs'
                : 'bg-white text-[#5c4a3b] border border-[#d9c7b5] hover:bg-[#f0e6da]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>History &amp; Sales Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-[#261c14] text-white shadow-2xs'
                : 'bg-white text-[#5c4a3b] border border-[#d9c7b5] hover:bg-[#f0e6da]'
            }`}
          >
            <Settings className="w-4 h-4 text-amber-500" />
            <span>Restaurant Info &amp; Hours</span>
          </button>
        </div>

        {/* TAB 1: LIVE ORDERS */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8dfd3] shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[#877260] flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Status:
                </span>
                {['all', 'new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      statusFilter === st
                        ? 'bg-[#261c14] text-white'
                        : 'bg-[#faf7f2] text-[#5c4a3b] hover:bg-[#f0e6da]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={orderTypeFilter}
                  onChange={(e) => setOrderTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#d9c7b5] text-xs bg-white text-[#261c14] font-medium"
                >
                  <option value="all">All Service Types</option>
                  <option value="dine_in">Dine-In Only</option>
                  <option value="takeaway">Takeaway Only</option>
                </select>

                <div className="relative flex-1 sm:w-60">
                  <Search className="w-3.5 h-3.5 text-[#877260] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search order #, guest..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#d9c7b5] text-xs bg-white text-[#261c14]"
                  />
                </div>
              </div>
            </div>

            {/* Orders Stream Grid */}
            {isLoadingOrders ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-6 h-6 animate-spin text-[#e07a3f] mx-auto mb-2" />
                <span className="text-xs text-[#786454]">Syncing kitchen orders...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-[#e8dfd3] p-8 max-w-md mx-auto">
                <ChefHat className="w-10 h-10 text-[#a69280] mx-auto mb-2" />
                <h3 className="text-sm font-bold text-[#261c14]">No orders match the current filter</h3>
                <p className="text-xs text-[#786454] mt-1">
                  New incoming customer orders will appear here automatically with audio alert.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredOrders.map((order) => {
                  const isNew = order.status === 'new';

                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-2xl border overflow-hidden shadow-2xs flex flex-col justify-between transition-all ${
                        isNew
                          ? 'border-[#e07a3f] ring-2 ring-[#e07a3f]/20 shadow-md'
                          : 'border-[#e8dfd3]'
                      }`}
                    >
                      {/* Order Card Top Ribbon */}
                      <div className="p-4 bg-[#faf7f2] border-b border-[#e8dfd3] flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-[#261c14]">
                              Order #{order.order_number}
                            </span>
                            {isNew && (
                              <span className="bg-[#e07a3f] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md animate-pulse">
                                NEW
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#786454] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-[#877260]" />
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg capitalize ${
                            order.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : order.status === 'ready'
                              ? 'bg-amber-100 text-amber-800'
                              : order.status === 'preparing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-[#f0e6da] text-[#261c14]'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      {/* Guest & Service Info */}
                      <div className="p-4 space-y-3 flex-1">
                        <div className="flex items-center justify-between text-xs pb-2 border-b border-[#f0e6da]">
                          <div>
                            <span className="font-bold text-[#261c14] block">{order.customer_name}</span>
                            <span className="text-[#786454] font-mono">{order.customer_phone}</span>
                          </div>

                          <div className="text-right">
                            {order.order_type === 'dine_in' ? (
                              <span className="font-bold text-[#e07a3f] bg-orange-50 px-2 py-0.5 rounded-md block">
                                Dine-In · {order.table_number || 'Table'}
                              </span>
                            ) : (
                              <span className="font-bold text-[#5c4a3b] bg-[#f0e6da] px-2 py-0.5 rounded-md block">
                                Takeaway
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Special Instructions */}
                        {order.special_instructions && (
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                            <strong>Note:</strong> {order.special_instructions}
                          </div>
                        )}

                        {/* Items Snapshot */}
                        <div className="space-y-1.5 py-1">
                          {order.items?.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="font-semibold text-[#261c14]">
                                {it.quantity} × {it.item_name_snapshot}
                              </span>
                              <span className="font-mono text-[#786454] tabular-nums">
                                ₹{it.line_total.toFixed(0)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-[#f0e6da] flex justify-between items-center text-xs font-bold text-[#261c14]">
                          <span>Total Bill (Counter)</span>
                          <span className="font-mono text-base text-[#e07a3f] tabular-nums">
                            ₹{order.total_amount.toFixed(0)}
                          </span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="p-3 bg-[#faf7f2] border-t border-[#e8dfd3] space-y-2">
                        {/* Status Pipeline Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {order.status === 'new' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'accepted')}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-[#261c14] hover:bg-[#3d2f23] text-white text-xs font-bold transition-colors"
                            >
                              Accept Order
                            </button>
                          )}

                          {order.status === 'accepted' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'preparing')}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                            >
                              Start Cooking
                            </button>
                          )}

                          {order.status === 'preparing' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'ready')}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-[#e07a3f] hover:bg-[#cb672c] text-white text-xs font-bold transition-colors"
                            >
                              Mark Ready
                            </button>
                          )}

                          {order.status === 'ready' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'completed')}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                            >
                              Complete / Fulfilled
                            </button>
                          )}

                          {/* Print KOT Button */}
                          <button
                            onClick={() => setReceiptOrder(order)}
                            className="p-1.5 rounded-lg border border-[#d9c7b5] text-[#5c4a3b] hover:bg-[#f0e6da] transition-colors"
                            title="Print KOT Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Cancel Button */}
                          {order.status !== 'completed' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => setCancellingOrderId(order.id)}
                              className="py-1.5 px-2.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MENU MANAGEMENT */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#e8dfd3]">
              <div>
                <h3 className="font-bold text-base text-[#261c14]">Menu & Inventory Controls</h3>
                <p className="text-xs text-[#786454]">
                  Manage items, prices in INR, availability status, and food categories.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsNewCategoryModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#faf7f2] border border-[#d9c7b5] hover:bg-[#f0e6da] text-[#261c14]"
                >
                  + Add Category
                </button>
                <button
                  onClick={() => {
                    setItemForm({
                      name: '',
                      category_id: categories[0]?.id || '',
                      price: 60,
                      description: '',
                      image_url: '/src/assets/images/food_masala_chai_samosa_1792905262537.jpg',
                      is_available: true,
                    });
                    setIsEditingItemModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#e07a3f] hover:bg-[#cb672c] text-white flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Menu Item</span>
                </button>
              </div>
            </div>

            {/* Menu Items Table */}
            <div className="bg-white rounded-2xl border border-[#e8dfd3] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#faf7f2] border-b border-[#e8dfd3] text-[#877260] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price (INR)</th>
                      <th className="py-3 px-4">Availability</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0e6da]">
                    {menuItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#faf7f2]/60">
                        <td className="py-3 px-4 flex items-center gap-3">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover bg-[#f0e6da] shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div>
                            <span className="font-bold text-[#261c14] block">{item.name}</span>
                            <span className="text-[#786454] line-clamp-1 max-w-xs">{item.description}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-medium text-[#5c4a3b]">
                          {item.category_name}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-[#261c14] tabular-nums">
                          ₹{item.price}
                        </td>

                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleItemAvailability(item.id, item.is_available)}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                              item.is_available
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            }`}
                          >
                            {item.is_available ? 'Available' : 'Sold Out'}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setItemForm({ ...item });
                              setIsEditingItemModalOpen(true);
                            }}
                            className="p-1.5 rounded-md text-[#5c4a3b] hover:text-[#261c14] hover:bg-[#f0e6da]"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ORDER HISTORY & REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-[#e8dfd3] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-[#261c14]">Order History & Sales Audit</h3>
                <p className="text-xs text-[#786454]">
                  Audited receipts with snapshot pricing. Cancelled orders are excluded from revenue totals.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#d9c7b5] text-xs bg-white text-[#261c14]"
                />
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#261c14] hover:bg-[#3d2f23] text-white flex items-center gap-2 shadow-2xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-2xl border border-[#e8dfd3] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#faf7f2] border-b border-[#e8dfd3] text-[#877260] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0e6da]">
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#faf7f2]/50">
                        <td className="py-3 px-4 font-mono font-bold text-[#261c14]">
                          {o.order_number}
                        </td>
                        <td className="py-3 px-4 text-[#786454]">
                          {new Date(o.created_at).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#261c14] block">{o.customer_name}</span>
                          <span className="text-[#786454] font-mono">{o.customer_phone}</span>
                        </td>
                        <td className="py-3 px-4">
                          {o.order_type === 'dine_in' ? `Dine-In (${o.table_number})` : 'Takeaway'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#261c14] tabular-nums">
                          ₹{o.total_amount.toFixed(0)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold capitalize ${
                              o.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-stone-100 text-stone-800'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setReceiptOrder(o)}
                            className="p-1 text-[#5c4a3b] hover:text-[#261c14]"
                            title="View receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RESTAURANT INFO & HOURS SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl">
            {settingsSavedAlert && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Restaurant details and hours successfully saved and updated across the live site!</span>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-[#e8dfd3] p-6 sm:p-8 shadow-xs">
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-[#f0e6da]">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#8b181b]/10 text-[#8b181b] text-xs font-bold uppercase tracking-wider mb-1.5">
                    <Store className="w-3.5 h-3.5" />
                    <span>Business Profile &amp; Location</span>
                  </div>
                  <h3 className="text-xl font-black text-[#261c14]">Restaurant Information &amp; Hours</h3>
                  <p className="text-xs text-[#786454] mt-1">
                    Manage verified business details, contact numbers, closing times, and storefront status for Grill Inn Munger.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-stone-400 block font-medium">Franchise Outlet</span>
                  <span className="text-xs font-bold text-[#8b181b]">Chuabagh, Munger, Bihar</span>
                </div>
              </div>

              <form onSubmit={handleSaveRestaurantSettings} className="mt-6 space-y-6 text-xs">
                {/* 1. Basic Identity */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[#261c14] flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#8b181b]" />
                    <span>Restaurant Identity</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-[#5c4a3b] mb-1">Restaurant Name</label>
                      <input
                        type="text"
                        required
                        value={restaurantForm.cafeteriaName}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, cafeteriaName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14] focus:ring-2 focus:ring-[#8b181b]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#5c4a3b] mb-1">Official Website URL</label>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          required
                          value={restaurantForm.website}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, website: e.target.value })}
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14] focus:ring-2 focus:ring-[#8b181b]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Contact Phone Numbers */}
                <div className="space-y-4 pt-4 border-t border-[#f0e6da]">
                  <h4 className="text-sm font-bold text-[#261c14] flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#8b181b]" />
                    <span>Verified Contact Numbers</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-[#5c4a3b] mb-1">Primary Phone</label>
                      <input
                        type="text"
                        required
                        value={restaurantForm.phone}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
                        placeholder="078750 47478"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14] focus:ring-2 focus:ring-[#8b181b]"
                      />
                      <p className="text-[10px] text-stone-500 mt-1">Direct call button on customer website</p>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#5c4a3b] mb-1">Secondary Contact Phone</label>
                      <input
                        type="text"
                        value={restaurantForm.secondaryPhone || ''}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, secondaryPhone: e.target.value })}
                        placeholder="079922 62230"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14] focus:ring-2 focus:ring-[#8b181b]"
                      />
                      <p className="text-[10px] text-stone-500 mt-1">Alternate contact number</p>
                    </div>
                  </div>
                </div>

                {/* 3. Address & Maps Navigation */}
                <div className="space-y-4 pt-4 border-t border-[#f0e6da]">
                  <h4 className="text-sm font-bold text-[#261c14] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#8b181b]" />
                    <span>Location &amp; Google Maps</span>
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block font-semibold text-[#5c4a3b] mb-1">Full Restaurant Address</label>
                      <input
                        type="text"
                        required
                        value={restaurantForm.address}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                        placeholder="Shop No. 1, Chuabagh, Munger, Bihar 811201"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14] focus:ring-2 focus:ring-[#8b181b]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-[#5c4a3b] mb-1">Google Maps Plus Code</label>
                        <input
                          type="text"
                          required
                          value={restaurantForm.plusCode}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, plusCode: e.target.value })}
                          placeholder="9F69+C9, Munger, Bihar"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#d9c7b5] text-xs font-mono text-[#261c14] focus:ring-2 focus:ring-[#8b181b]"
                        />
                        <p className="text-[10px] text-stone-500 mt-1">Used to generate one-click Google Maps directions</p>
                      </div>

                      <div>
                        <label className="block font-semibold text-[#5c4a3b] mb-1">Pickup Counter Description</label>
                        <input
                          type="text"
                          required
                          value={restaurantForm.counterLocation}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, counterLocation: e.target.value })}
                          placeholder="Shop No. 1, Chuabagh, Munger"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14] focus:ring-2 focus:ring-[#8b181b]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Operating Hours & Listed Closing Time */}
                <div className="space-y-4 pt-4 border-t border-[#f0e6da]">
                  <h4 className="text-sm font-bold text-[#261c14] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#8b181b]" />
                    <span>Operating Hours &amp; Listed Closing Time</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-[#5c4a3b] mb-1">
                        Listed Closing Time <span className="text-amber-800 font-bold">(Displayed as Listed Time)</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={restaurantForm.closingTime}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, closingTime: e.target.value })}
                        placeholder="11:00 PM"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14] font-bold focus:ring-2 focus:ring-[#8b181b]"
                      />
                      <p className="text-[10px] text-stone-500 mt-1">
                        Clearly identified on customer header and info sections as the verified closing time.
                      </p>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#5c4a3b] mb-1">General Hours Summary</label>
                      <input
                        type="text"
                        required
                        value={restaurantForm.openingHours}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, openingHours: e.target.value })}
                        placeholder="11:00 AM - 11:00 PM (Mon - Sun)"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14] focus:ring-2 focus:ring-[#8b181b]"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Kitchen Ordering Switch */}
                <div className="p-4 rounded-xl bg-[#faf7f2] border border-[#ebdcd0] flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-[#261c14] block">Master Kitchen Status</span>
                    <span className="text-[11px] text-[#786454]">
                      Turn OFF to temporarily prevent customers from placing new orders while still allowing menu browsing.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRestaurantForm({ ...restaurantForm, isOpen: !restaurantForm.isOpen })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      restaurantForm.isOpen
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                    }`}
                  >
                    {restaurantForm.isOpen ? 'Kitchen Open (Accepting Orders)' : 'Kitchen Closed (Pause Orders)'}
                  </button>
                </div>

                {/* Form Action */}
                <div className="pt-4 border-t border-[#f0e6da] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setRestaurantForm(settings)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#786454] hover:bg-stone-100 transition-colors"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#8b181b] hover:bg-[#a81c20] text-white shadow-sm hover:shadow transition-all"
                  >
                    Save Restaurant Information
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* KOT Receipt Print Modal */}
      <KitchenReceiptModal
        order={receiptOrder}
        settings={settings}
        isOpen={Boolean(receiptOrder)}
        onClose={() => setReceiptOrder(null)}
      />

      {/* Cancellation Reason Modal */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setCancellingOrderId(null)} />
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200">
              <h3 className="font-bold text-base text-[#261c14]">Cancel Customer Order</h3>
              <p className="text-xs text-[#786454] mt-1">
                State reason for cancellation (e.g. ingredient sold out, guest requested):
              </p>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Item unavailable during rush"
                className="w-full mt-3 p-2.5 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14]"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setCancellingOrderId(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#786454]"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Menu Item Modal */}
      {isEditingItemModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsEditingItemModalOpen(false)} />
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e8dfd3]">
              <h3 className="text-base font-bold text-[#261c14]">
                {itemForm.id ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <form onSubmit={handleSaveItem} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-[#5c4a3b] mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    value={itemForm.name || ''}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="e.g. Double Cheese Paneer Burger"
                    className="w-full px-3 py-2 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#5c4a3b] mb-1">Category</label>
                    <select
                      value={itemForm.category_id || categories[0]?.id}
                      onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#d9c7b5] text-xs bg-white text-[#261c14]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#5c4a3b] mb-1">Price (₹ INR)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={itemForm.price || ''}
                      onChange={(e) => setItemForm({ ...itemForm, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#5c4a3b] mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={itemForm.description || ''}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    placeholder="Brief description of the item"
                    className="w-full px-3 py-2 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#5c4a3b] mb-1">Image URL</label>
                  <input
                    type="url"
                    value={itemForm.image_url || ''}
                    onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                    placeholder="https://... or /src/assets/images/..."
                    className="w-full px-3 py-2 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_available_chk"
                    checked={itemForm.is_available ?? true}
                    onChange={(e) => setItemForm({ ...itemForm, is_available: e.target.checked })}
                    className="rounded text-[#e07a3f]"
                  />
                  <label htmlFor="is_available_chk" className="font-semibold text-[#261c14]">
                    Mark as Available for Customers
                  </label>
                </div>

                <div className="pt-3 border-t border-[#f0e6da] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingItemModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-[#786454]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#e07a3f] hover:bg-[#cb672c] text-white"
                  >
                    Save Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsNewCategoryModalOpen(false)} />
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#e8dfd3]">
              <h3 className="text-base font-bold text-[#261c14]">Add Food Category</h3>
              <form onSubmit={handleCreateCategory} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#5c4a3b] mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. South Indian Specials"
                    className="w-full px-3 py-2 rounded-xl border border-[#d9c7b5] text-xs text-[#261c14]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewCategoryModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-[#786454]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#261c14] text-white hover:bg-[#3d2f23]"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Supabase Diagnostic Modal */}
      <SupabaseDiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
      />
    </div>
  );
};
