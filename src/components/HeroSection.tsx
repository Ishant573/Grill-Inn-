import React from 'react';
import { ArrowRight, UtensilsCrossed, Sparkles, Clock, CheckCircle2, Flame, MapPin } from 'lucide-react';
import { CafeteriaSettings } from '../types/cafeteria';

interface HeroSectionProps {
  onExploreMenu: () => void;
  settings: CafeteriaSettings;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreMenu,
  settings,
}) => {
  return (
    <section className="relative overflow-hidden pt-6 pb-12 sm:pb-16 bg-[#faf7f2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!settings.isOpen && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm">
                <strong>Kitchen is currently closed for incoming orders.</strong> Normal kitchen hours: {settings.openingHours}. Listed closing time: {settings.closingTime}. You can still browse the menu!
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headline and CTAs */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#8b181b]/10 text-[#8b181b] text-xs font-bold uppercase tracking-wider w-fit">
              <Flame className="w-3.5 h-3.5 fill-current text-[#8b181b]" />
              <span>Grill Inn &amp; Amul Ice Cream · Chuabagh, Munger</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#261c14] tracking-tight leading-[1.1] text-balance">
              Flame-grilled footlongs, juicy burgers &amp; rich Amul sundaes.
            </h1>

            <p className="text-base sm:text-lg text-[#614e3e] leading-relaxed max-w-2xl">
              Freshly prepared fast-food specialties right in Munger. Enjoy table-served Dine-In or swift counter Takeaway. Order from your phone and pay with Cash or UPI at the counter.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onExploreMenu}
                className="px-6 py-3.5 rounded-xl bg-[#8b181b] hover:bg-[#a81c20] text-white font-bold text-sm sm:text-base shadow-sm hover:shadow transition-all flex items-center gap-2 group active:scale-[0.98]"
              >
                <UtensilsCrossed className="w-4 h-4 text-amber-300" />
                <span>Explore Full Menu</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Micro Trust Points */}
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[#e8dfd3]">
              <div className="flex flex-col">
                <span className="text-xs text-[#877260] font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8b181b]" />
                  Service
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#261c14] mt-0.5">
                  Dine-In &amp; Takeaway
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[#877260] font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#8b181b]" />
                  Listed Closing
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#261c14] mt-0.5">
                  {settings.closingTime} Daily
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[#877260] font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8b181b]" />
                  Payment
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#261c14] mt-0.5">
                  Cash / UPI at Counter
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Image with Verified Food Platter */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-4/3 sm:aspect-16/10 lg:aspect-4/3 border-4 border-white group">
              <img
                src="/images/grill_inn_platter.jpg"
                alt="Grill Inn food platter with wraps, fries, and burgers"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-6">
                <div className="text-white">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Signature Grill Inn Meal Platter</span>
                  </div>
                  <div className="text-base sm:text-lg font-black leading-tight text-white">
                    Crispy Wraps, Golden Fries &amp; Flame Burgers
                  </div>
                  <div className="text-xs text-stone-300 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-400" />
                    <span>Shop No. 1, Chuabagh, Munger (9F69+C9)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
