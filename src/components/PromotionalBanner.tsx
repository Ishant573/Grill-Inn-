import React from 'react';
import { Flame, Sparkles, ArrowRight, MapPin, Tag } from 'lucide-react';

interface PromotionalBannerProps {
  onExploreMenu: () => void;
}

export const PromotionalBanner: React.FC<PromotionalBannerProps> = ({
  onExploreMenu,
}) => {
  return (
    <div className="bg-gradient-to-r from-[#8b181b] via-[#a81c20] to-[#cb2d32] text-white overflow-hidden relative shadow-md">
      {/* Subtle background motif */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-stone-950 text-xs font-black uppercase tracking-wider shadow-xs">
                <Flame className="w-3.5 h-3.5 fill-current text-red-600" />
                Grand Opening
              </span>
              <span className="text-xs text-amber-200 font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-300" />
                Chuabagh, Munger, Bihar
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Now Open in Munger!
            </h2>

            <p className="text-xs sm:text-sm text-red-100 max-w-2xl leading-relaxed">
              Experience the authentic taste of <strong>Grill Inn</strong> flame-grilled footlongs, juicy burgers, loaded pastas, crispy fried chicken, and rich <strong>Amul Ice Cream</strong> sundaes right in Chuabagh.
            </p>

            {/* Food Category Highlights */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-amber-100">
              <span className="bg-black/25 px-2.5 py-1 rounded-md">Footlongs</span>
              <span className="bg-black/25 px-2.5 py-1 rounded-md">Pastas</span>
              <span className="bg-black/25 px-2.5 py-1 rounded-md">Burgers</span>
              <span className="bg-black/25 px-2.5 py-1 rounded-md">Fried Chicken</span>
              <span className="bg-black/25 px-2.5 py-1 rounded-md">Pizzas</span>
              <span className="bg-black/25 px-2.5 py-1 rounded-md">Wraps</span>
              <span className="bg-black/25 px-2.5 py-1 rounded-md">Amul Ice Cream</span>
            </div>

            {/* Notice regarding poster pricing */}
            <div className="flex items-center gap-2 pt-2 text-[11px] text-amber-200/90">
              <Tag className="w-3.5 h-3.5 shrink-0 text-amber-300" />
              <span>
                Introductory combos & snack specials starting from ₹49* & ₹79* (In-store opening offers).
              </span>
            </div>

            <div className="pt-2">
              <button
                onClick={onExploreMenu}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2 transition-transform active:scale-95"
              >
                <span>Explore Our Menu</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Poster Preview Thumbnail */}
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
            <div
              className="relative rounded-2xl overflow-hidden border-2 border-amber-300/60 shadow-xl max-w-xs"
            >
              <img
                src="/images/grill_inn_poster.jpg"
                alt="Grill Inn Now Open in Munger promotional poster"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Official Munger Opening Banner</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
