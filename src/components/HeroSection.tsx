import React, { useState } from 'react';
import { Search, PlusCircle, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  onReportLost: () => void;
  onReportFound: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearch,
  onReportLost,
  onReportFound,
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800/80 pt-10 pb-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headline, Description, Search, and CTAs */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Smart AI & Rapid Text Matching Engine</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] text-balance">
              Lost Something? <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500 dark:from-blue-400 dark:to-teal-300">
                Let’s Find It.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Report lost belongings or items you’ve found. LostLink instantly computes multi-factor similarity scores across categories, descriptions, dates, and locations to connect items with their rightful owners.
            </p>

            {/* Instant Search Bar */}
            <form onSubmit={handleSubmit} className="pt-2 max-w-xl">
              <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-md border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by item name, keyword, e.g. 'black backpack' or 'keys'..."
                  className="w-full bg-transparent border-0 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all whitespace-nowrap shrink-0"
                >
                  Find Item
                </button>
              </div>
            </form>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={onReportLost}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm hover:shadow transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Report Lost Item</span>
              </button>
              
              <button
                onClick={onReportFound}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm hover:shadow transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Report Found Item</span>
              </button>
            </div>

            {/* Micro Trust Points */}
            <div className="pt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Private details hidden until claimed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>Multi-factor similarity scoring</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-500" />
                <span>Secure in-app handover chat</span>
              </div>
            </div>

          </div>

          {/* Right Column: High-Fidelity Hero Image */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-2xl bg-slate-900 group">
              <img
                src="/src/assets/images/hero_lost_belongings_1794297158099.jpg"
                alt="Personal items and belongings reunited through LostLink"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover aspect-[4/3] group-hover:scale-102 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-6">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-white/20 dark:border-slate-800 shadow-lg max-w-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Real-Time Matching Active</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    "Recovered my laptop bag within 24 hours of reporting it at Central Station!"
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    — Asha S., Verified Member
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
