import React, { useState, useEffect } from 'react';
import { User, Item, Claim, Match } from '../types';
import { 
  FileQuestion, 
  CheckCircle2, 
  Sparkles, 
  Inbox, 
  Send, 
  RotateCcw, 
  User as UserIcon, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Eye, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  MapPin, 
  Calendar,
  Percent,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

interface DashboardViewProps {
  user: User;
  onSelectItem: (item: Item) => void;
  onOpenChat: (claim: Claim) => void;
  onReportLost: () => void;
  onReportFound: () => void;
  api: any;
  onToast: (msg: string, isError?: boolean) => void;
  onProfileUpdated: (updatedUser: User) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onSelectItem,
  onOpenChat,
  onReportLost,
  onReportFound,
  api,
  onToast,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'lost' | 'found' | 'matches' | 'incoming' | 'outgoing' | 'recovered' | 'profile'>('lost');
  
  const [lostItems, setLostItems] = useState<Item[]>([]);
  const [foundItems, setFoundItems] = useState<Item[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [incomingClaims, setIncomingClaims] = useState<Claim[]>([]);
  const [outgoingClaims, setOutgoingClaims] = useState<Claim[]>([]);
  const [recoveredItems, setRecoveredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Form State
  const [profileName, setProfileName] = useState(user.name);
  const [profilePhone, setProfilePhone] = useState(user.phone || '');
  const [profileAvatar, setProfileAvatar] = useState(user.avatar_url || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Match details expanded state
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);

  // Fetch all user specific data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user items
      const itemsRes = await api.getItems({ limit: 100 });
      const allItems: Item[] = itemsRes.items || [];
      const myItems = allItems.filter((i) => i.user_id === user.id);
      
      setLostItems(myItems.filter((i) => i.type === 'LOST' && i.status !== 'RETURNED'));
      setFoundItems(myItems.filter((i) => i.type === 'FOUND' && i.status !== 'RETURNED'));
      setRecoveredItems(myItems.filter((i) => i.status === 'RETURNED'));

      // 2. Fetch matches
      const matchRes = await api.getMatches();
      setMatches(matchRes.matches || []);

      // 3. Fetch claims
      const claimsRes = await api.getClaims();
      setIncomingClaims(claimsRes.incoming || []);
      setOutgoingClaims(claimsRes.outgoing || []);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      onToast('Error loading dashboard data', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user.id]);

  // Handle Approve / Reject Claim
  const handleDecideClaim = async (claimId: number, action: 'APPROVE' | 'REJECT') => {
    const note = action === 'APPROVE' 
      ? 'Ownership details verified by the finder. Safe handover initiated.'
      : 'Details provided did not match the recovered item.';

    try {
      const res = await api.decideClaim(claimId, action, note);
      if (res.error) {
        onToast(res.error, true);
      } else {
        onToast(action === 'APPROVE' ? 'Claim approved! Item marked as RETURNED.' : 'Claim declined.');
        loadDashboardData();
      }
    } catch (err: any) {
      onToast(err.message || 'Operation failed', true);
    }
  };

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.updateProfile({
        name: profileName,
        phone: profilePhone,
        avatar_url: profileAvatar,
      });
      if (res.user) {
        onToast('Profile updated successfully.');
        onProfileUpdated(res.user);
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to update profile', true);
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Delete Item
  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      const res = await api.deleteItem(itemId);
      if (res.error) {
        onToast(res.error, true);
      } else {
        onToast('Item report deleted.');
        loadDashboardData();
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to delete report', true);
    }
  };

  return (
    <div className="py-8 bg-slate-50/60 dark:bg-slate-950/60 min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* User Welcome Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-xl overflow-hidden shadow-sm">
              {user.profile_picture || user.avatar_url ? (
                <img
                  src={user.profile_picture || user.avatar_url}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Hi, {user.name}
                </h1>
                {Boolean(user.is_admin) && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                    Admin
                  </span>
                )}
                {user.auth_provider === 'google' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Google Account
                  </span>
                )}
                {user.auth_provider === 'google_linked' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    Google Linked
                  </span>
                )}
                {Boolean(user.email_verified) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {user.email} {user.phone ? `· ${user.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReportLost}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Report Lost</span>
            </button>
            <button
              onClick={onReportFound}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Report Found</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-6 border-b border-slate-200 dark:border-slate-800 no-scrollbar">
          {[
            { id: 'lost', label: `My Lost (${lostItems.length})`, icon: <FileQuestion className="w-4 h-4" /> },
            { id: 'found', label: `My Found (${foundItems.length})`, icon: <CheckCircle2 className="w-4 h-4" /> },
            { id: 'matches', label: `Potential Matches (${matches.length})`, icon: <Sparkles className="w-4 h-4 text-purple-500" /> },
            { id: 'incoming', label: `Incoming Claims (${incomingClaims.length})`, icon: <Inbox className="w-4 h-4 text-amber-500" /> },
            { id: 'outgoing', label: `My Claims (${outgoingClaims.length})`, icon: <Send className="w-4 h-4 text-blue-500" /> },
            { id: 'recovered', label: `Recovered (${recoveredItems.length})`, icon: <RotateCcw className="w-4 h-4 text-emerald-500" /> },
            { id: 'profile', label: 'Profile Settings', icon: <UserIcon className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm min-h-[400px]">
          
          {/* TAB 1: MY LOST ITEMS */}
          {activeTab === 'lost' && (
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Lost Reports</h3>
                <span className="text-xs text-slate-400 font-mono tabular-nums">{lostItems.length} items</span>
              </div>

              {lostItems.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto mb-3 text-xl">
                    🎒
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No active lost reports</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    Have you misplaced something? Publish a report so others can help you locate it.
                  </p>
                  <button
                    onClick={onReportLost}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                  >
                    Report a lost item
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lostItems.map((item) => (
                    <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center text-xl shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            '📦'
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {item.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span>{item.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.location}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[11px] tabular-nums">{item.item_date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => onSelectItem(item)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Delete report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY FOUND ITEMS */}
          {activeTab === 'found' && (
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Found Reports</h3>
                <span className="text-xs text-slate-400 font-mono tabular-nums">{foundItems.length} items</span>
              </div>

              {foundItems.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center mx-auto mb-3 text-xl">
                    🔍
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No items reported found</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    Found a phone, wallet, or keys? Report it securely to help the rightful owner find it.
                  </p>
                  <button
                    onClick={onReportFound}
                    className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl"
                  >
                    Report a found item
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {foundItems.map((item) => (
                    <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center text-xl shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            '🔑'
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400">
                              {item.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span>{item.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.location}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[11px] tabular-nums">{item.item_date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => onSelectItem(item)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Delete report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: POTENTIAL SMART MATCHES */}
          {activeTab === 'matches' && (
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Algorithmic Matches</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Computed via category match, RapidFuzz sequence similarity, date proximity, and location analysis.
                  </p>
                </div>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-bold font-mono tabular-nums">
                  {matches.length} candidates
                </span>
              </div>

              {matches.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center mx-auto mb-3 text-xl">
                    ✨
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No candidate matches yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    When newly reported found items match your lost belongings above the 45% threshold, they will appear here with a full confidence breakdown.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matches.map((m) => {
                    const isExpanded = expandedMatchId === m.id;
                    const b = m.breakdown || ({} as any);

                    return (
                      <div
                        key={m.id}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/60 hover:border-purple-300 dark:hover:border-purple-800 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Item Pair */}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                LOST
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{m.lost_name}</span>
                              <span className="text-slate-400 text-xs">↔</span>
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300">
                                FOUND
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{m.found_name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                              <span>📍 {m.found_loc}</span>
                              <span aria-hidden="true">·</span>
                              <span>🗓 Found {m.found_date}</span>
                              <span aria-hidden="true">·</span>
                              <span>Finder: {m.finder_name}</span>
                            </div>
                          </div>

                          {/* Confidence Score Bar & Button */}
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <div className="flex items-center gap-1 justify-end font-extrabold text-sm text-purple-600 dark:text-purple-400 font-mono tabular-nums">
                                <span>{m.score}%</span>
                                <span className="text-[10px] font-medium text-slate-400">Match</span>
                              </div>
                              <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                                  style={{ width: `${m.score}%` }}
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => setExpandedMatchId(isExpanded ? null : m.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                              title="Toggle similarity breakdown"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={async () => {
                                const res = await api.getItem(m.found_id);
                                if (res.item) onSelectItem(res.item);
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-all"
                            >
                              Review & Claim
                            </button>
                          </div>
                        </div>

                        {/* Expandable Breakdown Drawer */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-slate-200 dark:border-slate-750 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] text-slate-600 dark:text-slate-300 animate-in fade-in duration-150">
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                              <span className="text-slate-400 block text-[10px]">Category (max 25)</span>
                              <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{b.category ?? 0} pts</strong>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                              <span className="text-slate-400 block text-[10px]">Name (max 30)</span>
                              <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{b.name ?? 0} pts</strong>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                              <span className="text-slate-400 block text-[10px]">Description (max 20)</span>
                              <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{b.description ?? 0} pts</strong>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                              <span className="text-slate-400 block text-[10px]">Location (max 15)</span>
                              <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{b.location ?? 0} pts</strong>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                              <span className="text-slate-400 block text-[10px]">Date (max 10)</span>
                              <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{b.date ?? 0} pts</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INCOMING CLAIMS */}
          {activeTab === 'incoming' && (
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Incoming Ownership Claims</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Users claiming ownership of items you reported finding. Review their proof before approving.
                  </p>
                </div>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold font-mono tabular-nums">
                  {incomingClaims.length} requests
                </span>
              </div>

              {incomingClaims.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400">
                  No incoming claims yet. When someone requests an item you found, you can review their proof here.
                </div>
              ) : (
                <div className="space-y-4">
                  {incomingClaims.map((claim) => (
                    <div
                      key={claim.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-slate-400">Claim for found item:</span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{claim.item_name}</h4>
                        </div>
                        <span
                          className={`self-start sm:self-auto px-2.5 py-1 text-[11px] font-bold rounded-lg ${
                            claim.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : claim.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {claim.status}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                          Claimant Proof & Notes ({claim.claimant_name}):
                        </span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                          "{claim.proof_description}"
                        </p>
                        <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-3">
                          <span>Email: {claim.claimant_email}</span>
                          {claim.claimant_phone && <span>· Phone: {claim.claimant_phone}</span>}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <button
                          onClick={() => onOpenChat(claim)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Message Claimant</span>
                        </button>

                        {claim.status === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDecideClaim(claim.id, 'APPROVE')}
                              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-1"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>Approve Claim</span>
                            </button>
                            <button
                              onClick={() => handleDecideClaim(claim.id, 'REJECT')}
                              className="px-3.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl flex items-center gap-1"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MY OUTGOING CLAIMS */}
          {activeTab === 'outgoing' && (
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">My Ownership Claims</h3>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold font-mono tabular-nums">
                  {outgoingClaims.length} submitted
                </span>
              </div>

              {outgoingClaims.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400">
                  You haven't filed any claims yet. When browsing found items, select "Claim Ownership" to request recovery.
                </div>
              ) : (
                <div className="space-y-4">
                  {outgoingClaims.map((claim) => (
                    <div
                      key={claim.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{claim.item_name}</h4>
                        <span
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${
                            claim.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : claim.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {claim.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400">Your proof:</span> "{claim.proof_description}"
                      </p>

                      {claim.reviewer_notes && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                          <strong>Finder Note:</strong> {claim.reviewer_notes}
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Finder: {claim.finder_name}</span>
                        <button
                          onClick={() => onOpenChat(claim)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Open Chat</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SUCCESSFULLY RECOVERED */}
          {activeTab === 'recovered' && (
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Recovered & Returned Items</h3>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold font-mono tabular-nums">
                  {recoveredItems.length} recovered
                </span>
              </div>

              {recoveredItems.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400">
                  No recovered items recorded yet. Approved claims will appear here once handovers complete.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recoveredItems.map((item) => (
                    <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</h4>
                          <span className="text-xs text-slate-400">{item.category} · {item.location}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-lg">
                        RETURNED
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <div className="max-w-lg mx-auto py-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Edit Profile Information</h3>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email (Registered)</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+1 555-0100"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Avatar Image URL</label>
                  <input
                    type="text"
                    value={profileAvatar}
                    onChange={(e) => setProfileAvatar(e.target.value)}
                    placeholder="/src/assets/images/..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>

              {/* Google Account Security Card */}
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Authentication & Security
                </h4>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-sm">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                            Google Sign-In Integration
                          </h5>
                          {user.google_id || user.auth_provider === 'google' || user.auth_provider === 'google_linked' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              Connected
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              Not Linked
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {user.google_id || user.auth_provider === 'google' || user.auth_provider === 'google_linked'
                            ? `Securely linked with Google ID: ${user.google_id ? user.google_id.slice(0, 8) + '...' : 'Verified'}`
                            : 'Sign in faster without entering a password by connecting your Google Account.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {user.profile_picture && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
                      <img
                        src={user.profile_picture}
                        alt="Google Avatar"
                        className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                      />
                      <div className="text-[11px]">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Google Profile Picture active</span>
                        <p className="text-slate-400">Synced automatically from your Google account</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
