import React, { useState, useEffect } from 'react';
import { User, Item, Category, AdminLog, SystemStats } from '../types';
import { 
  Users, 
  FileText, 
  Tag, 
  ShieldAlert, 
  Trash2, 
  UserX, 
  UserCheck, 
  Plus, 
  Activity, 
  CheckCircle2,
  Clock,
  RotateCcw
} from 'lucide-react';

interface AdminViewProps {
  currentUser: User;
  onSelectItem: (item: Item) => void;
  api: any;
  onToast: (msg: string, isError?: boolean) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  onSelectItem,
  api,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'items' | 'categories' | 'logs'>('users');
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [adminItems, setAdminItems] = useState<Item[]>([]);
  const [adminCategories, setAdminCategories] = useState<Category[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  // New category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminData();
      if (res.error) {
        onToast(res.error, true);
      } else {
        setAdminUsers(res.users || []);
        setAdminItems(res.items || []);
        setAdminCategories(res.categories || []);
        setAdminLogs(res.logs || []);
        setStats(res.stats || null);
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to fetch admin console data', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleSuspend = async (targetUserId: number, userName: string) => {
    try {
      const res = await api.toggleSuspendUser(targetUserId);
      if (res.error) {
        onToast(res.error, true);
      } else {
        onToast(`User ${userName} ${res.is_suspended ? 'suspended' : 'reactivated'}.`);
        fetchAdminData();
      }
    } catch (err: any) {
      onToast(err.message || 'Operation failed', true);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to remove this item report for policy violation?')) return;
    try {
      const res = await api.deleteItem(itemId);
      if (res.error) {
        onToast(res.error, true);
      } else {
        onToast('Report removed by moderator.');
        fetchAdminData();
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to delete report', true);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await api.addCategory(newCatName.trim(), newCatIcon.trim() || '📦');
      if (res.error) {
        onToast(res.error, true);
      } else {
        onToast(`Category '${newCatName}' created.`);
        setNewCatName('');
        fetchAdminData();
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to add category', true);
    }
  };

  const handleDeleteCategory = async (catId: number, catName: string) => {
    if (!confirm(`Delete category '${catName}'?`)) return;
    try {
      const res = await api.deleteCategory(catId);
      if (res.error) {
        onToast(res.error, true);
      } else {
        onToast(`Category '${catName}' removed.`);
        fetchAdminData();
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to remove category', true);
    }
  };

  if (!currentUser.is_admin) {
    return (
      <div className="py-20 text-center text-slate-500">
        Administrator privilege required.
      </div>
    );
  }

  return (
    <div className="py-8 bg-slate-50/60 dark:bg-slate-950/60 min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Administration Console
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Platform moderation, user suspension, category taxonomy, and audit log inspection.
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Stats KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Members</span>
            <strong className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums mt-1 block">
              {stats?.total_users ?? 0}
            </strong>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Lost Reports</span>
            <strong className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-1 block">
              {stats?.total_lost ?? 0}
            </strong>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Found Reports</span>
            <strong className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 font-mono tabular-nums mt-1 block">
              {stats?.total_found ?? 0}
            </strong>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Returned & Reunited</span>
            <strong className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1 block">
              {stats?.total_returned ?? 0}
            </strong>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-6 border-b border-slate-200 dark:border-slate-800">
          {[
            { id: 'users', label: `Users (${adminUsers.length})`, icon: <Users className="w-4 h-4" /> },
            { id: 'items', label: `All Reports (${adminItems.length})`, icon: <FileText className="w-4 h-4" /> },
            { id: 'categories', label: `Categories (${adminCategories.length})`, icon: <Tag className="w-4 h-4" /> },
            { id: 'logs', label: `Audit Logs (${adminLogs.length})`, icon: <Activity className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Panes */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-hidden">
          
          {/* TAB 1: USERS TABLE */}
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="pb-3 px-3">User Name</th>
                    <th className="pb-3 px-3">Email</th>
                    <th className="pb-3 px-3">Phone</th>
                    <th className="pb-3 px-3">Role</th>
                    <th className="pb-3 px-3">Reports</th>
                    <th className="pb-3 px-3 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adminUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {u.name}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {u.email}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {u.phone || '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.is_admin ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {u.is_admin ? 'Admin' : 'Member'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums whitespace-nowrap">
                        {u.report_count ?? 0}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => handleToggleSuspend(u.id, u.name)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 ml-auto ${
                              u.is_suspended
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 hover:bg-rose-100'
                            }`}
                          >
                            {u.is_suspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            <span>{u.is_suspended ? 'Reactivate' : 'Suspend'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: ALL REPORTS */}
          {activeTab === 'items' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="pb-3 px-3">Item Name</th>
                    <th className="pb-3 px-3">Type</th>
                    <th className="pb-3 px-3">Category</th>
                    <th className="pb-3 px-3">Location</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Owner</th>
                    <th className="pb-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adminItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {item.name}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.type === 'LOST' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.category}
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap truncate max-w-[150px]">
                        {item.location}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-slate-500">{item.status}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.owner_name}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectItem(item)}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Inspect"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            title="Remove report"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <form onSubmit={handleAddCategory} className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <input
                  type="text"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  placeholder="Icon emoji"
                  className="w-16 px-3 py-2 text-center text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category name (e.g. Sports Gear)"
                  className="flex-1 min-w-[200px] px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {adminCategories.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{c.icon}</span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{c.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono tabular-nums">{c.item_count ?? 0} items</span>
                      </div>
                    </div>
                    {adminCategories.length > 4 && (
                      <button
                        onClick={() => handleDeleteCategory(c.id, c.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="pb-3 px-3">Timestamp</th>
                    <th className="pb-3 px-3">Action</th>
                    <th className="pb-3 px-3">Administrator</th>
                    <th className="pb-3 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {adminLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {log.created_at}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {log.admin_name || 'System Admin'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
