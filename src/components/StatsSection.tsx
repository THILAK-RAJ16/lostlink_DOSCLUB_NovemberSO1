import React from 'react';
import { SystemStats } from '../types';
import { FileQuestion, CheckCircle2, RotateCcw, Users, Zap } from 'lucide-react';

interface StatsSectionProps {
  stats: SystemStats | null;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
  return (
    <section className="py-12 bg-slate-900 text-white relative overflow-hidden">
      {/* Decorative subtle ambient backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-teal-400 tracking-wider uppercase">Live Community Impact</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Reuniting Owners & Belongings Every Day
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Real statistics updated directly from our verified SQLite database registry.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-2xl p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
              <FileQuestion className="w-5 h-5" />
            </div>
            <strong className="block text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums">
              {stats?.total_lost ?? 0}
            </strong>
            <span className="text-xs text-slate-400 mt-1 block font-medium">Lost Reports</span>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-2xl p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <strong className="block text-3xl sm:text-4xl font-extrabold text-teal-400 font-mono tabular-nums">
              {stats?.total_found ?? 0}
            </strong>
            <span className="text-xs text-slate-400 mt-1 block font-medium">Found Reports</span>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-2xl p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <RotateCcw className="w-5 h-5" />
            </div>
            <strong className="block text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono tabular-nums">
              {stats?.total_returned ?? 0}
            </strong>
            <span className="text-xs text-slate-400 mt-1 block font-medium">Returned Items</span>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-2xl p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5" />
            </div>
            <strong className="block text-3xl sm:text-4xl font-extrabold text-purple-400 font-mono tabular-nums">
              {stats?.total_users ?? 0}
            </strong>
            <span className="text-xs text-slate-400 mt-1 block font-medium">Active Members</span>
          </div>

        </div>
      </div>
    </section>
  );
};
