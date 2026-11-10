import React, { useState, useEffect } from 'react';
import { User, Item, Claim, Category, NotificationItem, SystemStats } from './types';
import { api, getStoredUser, getStoredToken, setStoredSession, clearStoredSession } from './api';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { StatsSection } from './components/StatsSection';
import { ItemCard } from './components/ItemCard';
import { BrowseView } from './components/BrowseView';
import { ReportView } from './components/ReportView';
import { DashboardView } from './components/DashboardView';
import { AdminView } from './components/AdminView';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ClaimChatModal } from './components/ClaimChatModal';
import { AuthModal } from './components/AuthModal';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  isError: boolean;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [activeView, setActiveView] = useState<string>('home');
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentLost, setRecentLost] = useState<Item[]>([]);
  const [recentFound, setRecentFound] = useState<Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authIsRegister, setAuthIsRegister] = useState(false);
  const [activeChatClaim, setActiveChatClaim] = useState<Claim | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('lostlink_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Toasts state
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, isError = false) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  // Sync theme with html class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('lostlink_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      setActiveView(hash);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view: string) => {
    window.location.hash = view;
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initial data loading
  const loadInitialData = async () => {
    try {
      // 1. Fetch categories
      const catRes = await api.getCategories();
      if (catRes.categories) setCategories(catRes.categories);

      // 2. Fetch stats
      const statsRes = await api.getStats();
      setStats(statsRes);

      // 3. Fetch recent lost items
      const lostRes = await api.getItems({ type: 'LOST', limit: 4, sort: 'new' });
      setRecentLost(lostRes.items || []);

      // 4. Fetch recent found items
      const foundRes = await api.getItems({ type: 'FOUND', limit: 4, sort: 'new' });
      setRecentFound(foundRes.items || []);

      // 5. Verify current user profile if token present
      if (getStoredToken()) {
        try {
          const profileRes = await api.getCurrentUser();
          if (profileRes.user) setCurrentUser(profileRes.user);
        } catch {
          clearStoredSession();
          setCurrentUser(null);
        }
      }
    } catch (err) {
      console.error('Failed to load initial application data:', err);
    }
  };

  // Poll notifications
  const loadNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser?.id]);

  const handleMarkNotificationsRead = async () => {
    try {
      await api.markNotificationsRead();
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  const handleAuthSuccess = (user: User, token: string) => {
    setStoredSession(token, user);
    setCurrentUser(user);
    loadNotifications();
  };

  const handleLogout = () => {
    clearStoredSession();
    setCurrentUser(null);
    showToast('Signed out of LostLink.');
    navigateTo('home');
  };

  const handleHeroSearch = (query: string) => {
    setSearchQuery(query);
    navigateTo('browse');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      
      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        activeView={activeView}
        onNavigate={navigateTo}
        onOpenAuth={(isReg) => {
          setAuthIsRegister(Boolean(isReg));
          setAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkNotificationsRead={handleMarkNotificationsRead}
      />

      {/* Main Viewport */}
      <main className="flex-1">
        
        {/* VIEW 1: HOME LANDING PAGE */}
        {activeView === 'home' && (
          <div>
            {/* Hero Section */}
            <HeroSection
              onSearch={handleHeroSearch}
              onReportLost={() => navigateTo('report-lost')}
              onReportFound={() => navigateTo('report-found')}
            />

            {/* Recently Reported Lost Belongings */}
            <section className="py-14 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Recently Reported
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      Lost Items Awaiting Discovery
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      navigateTo('browse');
                    }}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 group"
                  >
                    <span>View all lost items</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recentLost.map((item) => (
                    <ItemCard key={item.id} item={item} onClick={setSelectedItem} />
                  ))}
                </div>
              </div>
            </section>

            {/* Recently Reported Found Items */}
            <section className="py-14 bg-slate-50/70 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                      Safe Recovery
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      Found Belongings Looking for Owners
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      navigateTo('browse');
                    }}
                    className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 flex items-center gap-1 group"
                  >
                    <span>View all found items</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recentFound.map((item) => (
                    <ItemCard key={item.id} item={item} onClick={setSelectedItem} />
                  ))}
                </div>
              </div>
            </section>

            {/* How It Works Section */}
            <HowItWorksSection />

            {/* Live Stats Section */}
            <StatsSection stats={stats} />
          </div>
        )}

        {/* VIEW 2: BROWSE ITEMS */}
        {activeView === 'browse' && (
          <BrowseView
            categories={categories}
            initialSearch={searchQuery}
            initialCategory={selectedCategory}
            onSelectItem={setSelectedItem}
            onReportLost={() => navigateTo('report-lost')}
            onReportFound={() => navigateTo('report-found')}
            api={api}
          />
        )}

        {/* VIEW 3: REPORT LOST */}
        {activeView === 'report-lost' && (
          <ReportView
            type="LOST"
            user={currentUser}
            categories={categories}
            onBack={() => navigateTo('home')}
            onSuccess={() => {
              loadInitialData();
              navigateTo('dashboard');
            }}
            onOpenAuth={() => setAuthModalOpen(true)}
            api={api}
            onToast={showToast}
          />
        )}

        {/* VIEW 4: REPORT FOUND */}
        {activeView === 'report-found' && (
          <ReportView
            type="FOUND"
            user={currentUser}
            categories={categories}
            onBack={() => navigateTo('home')}
            onSuccess={() => {
              loadInitialData();
              navigateTo('dashboard');
            }}
            onOpenAuth={() => setAuthModalOpen(true)}
            api={api}
            onToast={showToast}
          />
        )}

        {/* VIEW 5: USER DASHBOARD */}
        {activeView === 'dashboard' && currentUser && (
          <DashboardView
            user={currentUser}
            onSelectItem={setSelectedItem}
            onOpenChat={setActiveChatClaim}
            onReportLost={() => navigateTo('report-lost')}
            onReportFound={() => navigateTo('report-found')}
            api={api}
            onToast={showToast}
            onProfileUpdated={(updated) => setCurrentUser(updated)}
          />
        )}

        {/* VIEW 6: ADMIN DASHBOARD */}
        {activeView === 'admin' && currentUser && Boolean(currentUser.is_admin) && (
          <AdminView
            currentUser={currentUser}
            onSelectItem={setSelectedItem}
            api={api}
            onToast={showToast}
          />
        )}

      </main>

      {/* Global Footer */}
      <Footer
        onNavigate={navigateTo}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          navigateTo('browse');
        }}
      />

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          user={currentUser}
          onClose={() => setSelectedItem(null)}
          onClaimSubmitted={() => {
            loadInitialData();
            if (currentUser) navigateTo('dashboard');
          }}
          onItemUpdated={() => {
            loadInitialData();
          }}
          onOpenAuth={() => setAuthModalOpen(true)}
          api={api}
          onToast={showToast}
        />
      )}

      {/* Auth Modal */}
      {authModalOpen && (
        <AuthModal
          initialIsRegister={authIsRegister}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          api={api}
          onToast={showToast}
        />
      )}

      {/* Peer Claim Verification Chat Modal */}
      {activeChatClaim && currentUser && (
        <ClaimChatModal
          claim={activeChatClaim}
          currentUser={currentUser}
          onClose={() => setActiveChatClaim(null)}
          api={api}
          onToast={showToast}
        />
      )}

      {/* Floating Toast Alerts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 px-4 rounded-2xl text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in slide-in-from-bottom-2 fade-in duration-200 ${
              t.isError
                ? 'bg-rose-600 text-white border border-rose-500'
                : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border border-slate-800 dark:border-slate-200'
            }`}
          >
            {t.isError ? (
              <span className="w-2 h-2 rounded-full bg-white shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
