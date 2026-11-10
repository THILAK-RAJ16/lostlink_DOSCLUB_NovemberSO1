import React from 'react';
import { Search, Mail, Phone, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
  onSelectCategory?: (category: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onSelectCategory }) => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          
          {/* Brand & Mission */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <Search className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-lg font-extrabold text-white">
                Lost<span className="text-blue-400">Link</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-sm">
              The intelligent lost and found community network. Powered by algorithmic text similarity, verification proof checks, and secure peer recovery.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold pt-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero-knowledge public listings on sensitive features</span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-2.5">
            <h4 className="text-white font-bold text-sm">Explore</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('browse')} className="hover:text-white transition-colors">
                  Browse All Items
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('report-lost')} className="hover:text-white transition-colors">
                  Report a Lost Item
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('report-found')} className="hover:text-white transition-colors">
                  Report a Found Item
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('dashboard')} className="hover:text-white transition-colors">
                  Member Dashboard
                </button>
              </li>
            </ul>
          </div>

          {/* Popular Categories */}
          <div className="space-y-2.5">
            <h4 className="text-white font-bold text-sm">Categories</h4>
            <ul className="space-y-2">
              {['Electronics', 'Documents', 'Bags', 'Keys', 'Accessories'].map((cat) => (
                <li key={cat}>
                  <button 
                    onClick={() => {
                      if (onSelectCategory) onSelectCategory(cat);
                      onNavigate('browse');
                    }}
                    className="hover:text-white transition-colors"
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-2.5">
            <h4 className="text-white font-bold text-sm">Support & Safety</h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="select-all">support@lostlink.org</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>+1 (800) 555-LOST</span>
              </li>
              <li className="text-[11px] text-slate-500 pt-1 leading-normal">
                Always meet in well-lit public places (transit kiosks, police station lobbies) for recovery handovers.
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© 2026 LostLink Systems Inc. Built for community safety and fast recovery.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Privacy Policy</span>
            <span aria-hidden="true">·</span>
            <span>Terms of Service</span>
            <span aria-hidden="true">·</span>
            <span>Handover Safety Guide</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
