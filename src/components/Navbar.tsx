import React, { useState } from 'react';
import { User, NotificationItem } from '../types';
import { 
  Search, 
  PlusCircle, 
  CheckCircle2, 
  Bell, 
  Moon, 
  Sun, 
  User as UserIcon, 
  LogOut, 
  ShieldAlert, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (isRegister?: boolean) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkNotificationsRead: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView,
  onNavigate,
  onOpenAuth,
  onLogout,
  theme,
  onToggleTheme,
  notifications,
  unreadCount,
  onMarkNotificationsRead
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleNavClick = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleNavClick('home')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-blue-700 transition-colors">
                <Search className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                  Lost<span className="text-blue-600 dark:text-blue-400">Link</span>
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => handleNavClick('home')}
              className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeView === 'home'
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('browse')}
              className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeView === 'browse'
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              Browse Items
            </button>
            <button
              onClick={() => handleNavClick('report-lost')}
              className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeView === 'report-lost'
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              Report Lost
            </button>
            <button
              onClick={() => handleNavClick('report-found')}
              className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeView === 'report-found'
                  ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              Report Found
            </button>
            {user && (
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  activeView === 'dashboard'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                Dashboard
              </button>
            )}
            {user && Boolean(user.is_admin) && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'admin'
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Actions & Auth */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              aria-label="Toggle theme"
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications Popover (if user logged in) */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications && unreadCount > 0) {
                      onMarkNotificationsRead();
                    }
                  }}
                  aria-label="View notifications"
                  className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white dark:ring-slate-900" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 px-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{unreadCount} new</span>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              setShowNotifications(false);
                              if (n.link.includes('matches')) handleNavClick('dashboard');
                              else if (n.link.includes('incoming')) handleNavClick('dashboard');
                              else handleNavClick('dashboard');
                            }}
                            className={`p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors ${
                              !n.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                              <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>{n.title}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                              {n.created_at ? n.created_at.split(' ')[0] : 'Just now'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auth Buttons / User Avatar Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden sm:inline max-w-[120px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs overflow-hidden">
                    {user.profile_picture || user.avatar_url ? (
                      <img src={user.profile_picture || user.avatar_url} alt={user.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleNavClick('dashboard');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      My Dashboard
                    </button>
                    {Boolean(user.is_admin) && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleNavClick('admin');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-xl transition-colors text-left"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        Admin Panel
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors text-left mt-1 border-t border-slate-100 dark:border-slate-800"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap"
                >
                  Log in
                </button>
                <button
                  onClick={() => onOpenAuth(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all whitespace-nowrap"
                >
                  Sign up
                </button>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-1">
          <button
            onClick={() => handleNavClick('home')}
            className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick('browse')}
            className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Browse Items
          </button>
          <button
            onClick={() => handleNavClick('report-lost')}
            className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            Report Lost Item
          </button>
          <button
            onClick={() => handleNavClick('report-found')}
            className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30"
          >
            Report Found Item
          </button>
          {user && (
            <button
              onClick={() => handleNavClick('dashboard')}
              className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              My Dashboard
            </button>
          )}
          {user && Boolean(user.is_admin) && (
            <button
              onClick={() => handleNavClick('admin')}
              className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
            >
              Admin Dashboard
            </button>
          )}
        </div>
      )}
    </header>
  );
};
