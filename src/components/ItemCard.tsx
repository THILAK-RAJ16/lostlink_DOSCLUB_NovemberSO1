import React from 'react';
import { Item } from '../types';
import { MapPin, Calendar, Lock, User, ArrowUpRight } from 'lucide-react';

interface ItemCardProps {
  item: Item;
  onClick: (item: Item) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: '📱',
  Documents: '📄',
  Bags: '🎒',
  Clothing: '🧥',
  Accessories: '⌚',
  Books: '📚',
  Keys: '🔑',
  Other: '📦',
};

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClick }) => {
  const isLost = item.type === 'LOST';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800';
      case 'CLAIM_PENDING':
        return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40';
      case 'MATCHED':
        return 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40';
      case 'RETURNED':
        return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800';
    }
  };

  return (
    <article
      onClick={() => onClick(item)}
      className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg dark:hover:shadow-slate-950/40 transition-all duration-200 cursor-pointer flex flex-col"
    >
      {/* Image / Icon container */}
      <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800/80 overflow-hidden flex items-center justify-center">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Graceful fallback to styled icon container
              (e.currentTarget as HTMLElement).style.display = 'none';
              const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
              if (fallback) (fallback as HTMLElement).style.display = 'flex';
            }}
          />
        ) : null}

        {/* Resilient styled fallback container */}
        <div
          className={`fallback-icon w-full h-full ${
            item.image_url ? 'hidden' : 'flex'
          } flex-col items-center justify-center ${
            isLost
              ? 'bg-gradient-to-br from-blue-50 to-indigo-100/60 dark:from-blue-950/30 dark:to-indigo-950/20'
              : 'bg-gradient-to-br from-teal-50 to-emerald-100/60 dark:from-teal-950/30 dark:to-emerald-950/20'
          }`}
        >
          <span className="text-4xl filter drop-shadow-sm mb-1">
            {CATEGORY_ICONS[item.category] || '📦'}
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {item.category}
          </span>
        </div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-sm ${
              isLost
                ? 'bg-blue-600 text-white'
                : 'bg-teal-600 text-white'
            }`}
          >
            {item.type}
          </span>
          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-sm ${getStatusColor(item.status)}`}>
            {item.status.replace('_', ' ')}
          </span>
        </div>

        {item.type === 'FOUND' && (
          <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
            <Lock className="w-3 h-3 text-teal-300" />
            <span>Verification Required</span>
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata line without pills */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span>{item.category}</span>
            <span aria-hidden="true">·</span>
            <span>Reported by {item.owner_name?.split(' ')[0] || 'Member'}</span>
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {item.name}
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1.5 leading-relaxed">
            {item.type === 'FOUND' && item.identifying_features_hidden
              ? item.description
              : item.description}
          </p>
        </div>

        {/* Footer meta */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1 truncate max-w-[150px]">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 font-mono text-[11px] tabular-nums">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{item.item_date}</span>
          </div>
        </div>
      </div>
    </article>
  );
};
