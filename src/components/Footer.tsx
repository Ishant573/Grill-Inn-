import React from 'react';
import { Flame, ShieldCheck, Clock, Globe, ExternalLink } from 'lucide-react';
import { CafeteriaSettings } from '../types/cafeteria';

interface FooterProps {
  settings: CafeteriaSettings;
  onAdminClick: () => void;
  onMenuClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onAdminClick,
  onMenuClick,
}) => {
  return (
    <footer className="bg-[#1f1510] text-[#c4b5a5] border-t border-[#3d2f23] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b181b] to-[#c52227] text-white flex items-center justify-center">
                <Flame className="w-4 h-4 fill-current text-amber-300" />
              </div>
              <span className="font-extrabold text-base text-white">{settings.cafeteriaName}</span>
            </div>
            <p className="text-xs text-[#a69280] leading-relaxed">
              Now Open in Chuabagh, Munger. Flame-grilled footlongs, burgers, pasta, fried chicken, pizzas, wraps, and Amul ice cream treats.
            </p>
            <div className="pt-1">
              <a
                href={settings.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-amber-300 hover:text-white transition-colors text-xs font-semibold"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Visit grillinn.in</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="space-y-2">
            <span className="font-bold text-white uppercase tracking-wider block">Kitchen Hours</span>
            <div className="flex items-start gap-2 text-xs">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">{settings.openingHours}</p>
                <p className="text-amber-300 font-semibold mt-1">Listed Closing: {settings.closingTime}</p>
                <p className="text-[#a69280] mt-0.5">Open 7 days a week</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <span className="font-bold text-white uppercase tracking-wider block">Quick Navigation</span>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={onMenuClick}
                  className="hover:text-white transition-colors text-left"
                >
                  8-Category Food Menu
                </button>
              </li>
              <li>
                <button
                  onClick={onAdminClick}
                  className="hover:text-amber-300 transition-colors flex items-center gap-1.5 pt-1 font-semibold text-[#e07a3f]"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Owner Admin Dashboard</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#3d2f23] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#877260]">
          <div>
            © {new Date().getFullYear()} {settings.cafeteriaName}. Chuabagh, Munger, Bihar. Pay at Counter · Cash / UPI.
          </div>
          <div>
            Franchise Partner &amp; Amul Ice Cream Parlour
          </div>
        </div>
      </div>
    </footer>
  );
};
