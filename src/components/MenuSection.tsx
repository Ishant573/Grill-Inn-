import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Check, AlertCircle } from 'lucide-react';
import { Category, MenuItem } from '../types/cafeteria';
import { useCart } from '../context/CartContext';

interface MenuSectionProps {
  categories: Category[];
  menuItems: MenuItem[];
  isLoading: boolean;
  isOpen: boolean;
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  categories,
  menuItems,
  isLoading,
  isOpen,
}) => {
  const { cart, addToCart, updateQuantity } = useCart();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart quantity lookup map for instant feedback
  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach((c) => {
      map.set(c.menuItem.id, c.quantity);
    });
    return map;
  }, [cart]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat =
        selectedCategoryId === 'all' || item.category_id === selectedCategoryId;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.category_name && item.category_name.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  return (
    <section id="menu-section" className="py-10 bg-[#faf7f2] border-t border-[#e8dfd3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#8b181b]/10 text-[#8b181b] text-xs font-bold uppercase tracking-wider mb-1.5">
              <span>Chuabagh Kitchen</span>
            </div>
            <h2 className="text-3xl font-extrabold text-[#261c14] tracking-tight">
              Grill Inn &amp; Amul Ice Cream Menu
            </h2>
            <p className="text-sm text-[#786454] mt-1">
              8 signature categories prepared to order. Items and base prices are owner-configurable.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#877260] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chai, burgers, pizza..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#d9c7b5] text-sm text-[#261c14] placeholder-[#a69280] focus:outline-none focus:ring-2 focus:ring-[#e07a3f] focus:border-transparent transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#877260] hover:text-[#261c14]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Category Filters (Horizontal Scrollable Segmented Buttons) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
              selectedCategoryId === 'all'
                ? 'bg-[#261c14] text-white shadow-xs'
                : 'bg-white text-[#5c4a3b] border border-[#d9c7b5] hover:bg-[#f0e6da]'
            }`}
          >
            All Items ({menuItems.length})
          </button>
          {categories.map((cat) => {
            const count = menuItems.filter((i) => i.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                  selectedCategoryId === cat.id
                    ? 'bg-[#261c14] text-white shadow-xs'
                    : 'bg-white text-[#5c4a3b] border border-[#d9c7b5] hover:bg-[#f0e6da]'
                }`}
              >
                {cat.name} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#e07a3f] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-sm text-[#786454]">Loading fresh menu...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredItems.length === 0 && (
          <div className="py-16 text-center bg-white rounded-2xl border border-[#e8dfd3] p-8 max-w-md mx-auto">
            <AlertCircle className="w-10 h-10 text-[#a69280] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#261c14]">No items found</h3>
            <p className="text-xs text-[#786454] mt-1">
              Try adjusting your search query or selecting a different category.
            </p>
            <button
              onClick={() => {
                setSelectedCategoryId('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-[#f0e6da] text-[#261c14] rounded-lg text-xs font-semibold hover:bg-[#e6d8c8]"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Menu Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const qtyInCart = cartQtyMap.get(item.id) || 0;

            return (
              <div
                key={item.id}
                className={`group bg-white rounded-2xl border border-[#e8dfd3] overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                  !item.is_available ? 'opacity-70 bg-stone-50' : ''
                }`}
              >
                {/* Image Container with Fallback */}
                <div className="relative aspect-4/3 w-full overflow-hidden bg-[#f0e6da]">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
                    }}
                  />
                  {/* Category and Availability Overlay */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="bg-black/70 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-md">
                      {item.category_name}
                    </span>
                    {!item.is_available ? (
                      <span className="bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                        Sold Out
                      </span>
                    ) : item.is_unconfirmed_price ? (
                      <span className="bg-amber-500/90 backdrop-blur-xs text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                        Base Price*
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-bold text-base text-[#261c14] tracking-tight group-hover:text-[#8b181b] transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#786454] mt-1 line-clamp-2 leading-relaxed">
                      {item.description || 'Prepared fresh with quality ingredients.'}
                    </p>
                    {item.is_unconfirmed_price && (
                      <span className="inline-block mt-1.5 text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded font-medium">
                        *Editable in Owner Admin
                      </span>
                    )}
                  </div>

                  {/* Price & Action Row */}
                  <div className="mt-4 pt-3 border-t border-[#f0e6da] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[#877260] block font-medium">Price</span>
                      <span className="font-mono font-black text-lg text-[#261c14] tabular-nums">
                        ₹{item.price}
                      </span>
                    </div>

                    {/* Action: Add to Cart or Stepper */}
                    <div>
                      {!item.is_available ? (
                        <span className="text-xs font-semibold text-[#877260] bg-[#f0e6da] px-3 py-1.5 rounded-lg">
                          Unavailable
                        </span>
                      ) : !isOpen ? (
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                          Kitchen Closed
                        </span>
                      ) : qtyInCart > 0 ? (
                        <div className="flex items-center bg-[#261c14] text-white rounded-xl px-1.5 py-1 shadow-2xs">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-[#3d2f23] rounded-lg transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-mono font-bold text-xs tabular-nums">
                            {qtyInCart}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-[#3d2f23] rounded-lg transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item, 1)}
                          className="flex items-center gap-1.5 bg-[#8b181b] hover:bg-[#a81c20] active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-2xs transition-all"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-300" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
