import React, { useState } from 'react';
import { Item, User } from '../types';
import { 
  X, 
  MapPin, 
  Calendar, 
  User as UserIcon, 
  ShieldCheck, 
  Lock, 
  Edit3, 
  Trash2, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Eye
} from 'lucide-react';

interface ItemDetailModalProps {
  item: Item | null;
  user: User | null;
  onClose: () => void;
  onClaimSubmitted: () => void;
  onItemUpdated: () => void;
  onOpenAuth: () => void;
  api: any;
  onToast: (msg: string, isError?: boolean) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  user,
  onClose,
  onClaimSubmitted,
  onItemUpdated,
  onOpenAuth,
  api,
  onToast,
}) => {
  if (!item) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [claimProof, setClaimProof] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(item.name);
  const [editLocation, setEditLocation] = useState(item.location);
  const [editDescription, setEditDescription] = useState(item.description);
  const [editContact, setEditContact] = useState(item.contact_info || '');
  const [editStatus, setEditStatus] = useState(item.status);
  const [savingEdit, setSavingEdit] = useState(false);

  const isOwner = user && user.id === item.user_id;
  const isAdmin = user && Boolean(user.is_admin);
  const canManage = isOwner || isAdmin;
  const isFound = item.type === 'FOUND';

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onToast('Please log in to claim this item.', true);
      onOpenAuth();
      return;
    }
    if (!claimProof.trim() || claimProof.trim().length < 8) {
      onToast('Please describe specific distinguishing features or proof (at least 8 characters).', true);
      return;
    }

    setClaimSubmitting(true);
    try {
      const res = await api.createClaim({
        item_id: item.id,
        proof_description: claimProof.trim(),
      });
      if (res.error) {
        onToast(res.error, true);
      } else {
        onToast('Ownership claim submitted! The finder has been notified.');
        onClaimSubmitted();
        onClose();
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to submit claim.', true);
    } finally {
      setClaimSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await api.updateItem(item.id, {
        name: editName,
        location: editLocation,
        description: editDescription,
        contact_info: editContact,
        status: editStatus,
      });
      if (res.error) {
        onToast(res.error, true);
      } else {
        onToast('Item report updated successfully.');
        setIsEditing(false);
        onItemUpdated();
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to update report.', true);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteItem = async () => {
    try {
      const res = await api.deleteItem(item.id);
      if (res.error) {
        onToast(res.error, true);
      } else {
        onToast('Item report deleted successfully.');
        onItemUpdated();
        onClose();
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to delete item.', true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 text-xs font-bold rounded-lg ${
                item.type === 'LOST'
                  ? 'bg-blue-600 text-white'
                  : 'bg-teal-600 text-white'
              }`}
            >
              {item.type}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {item.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canManage && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Edit report"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Delete report"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Overlay */}
        {deleteConfirm && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 flex items-center justify-between gap-4">
            <div className="text-xs text-rose-800 dark:text-rose-300">
              <strong>Are you sure you want to delete this report?</strong> This action cannot be undone.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteItem}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          
          {/* Edit Form Mode */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Report Details</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Item Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="CLAIM_PENDING">CLAIM_PENDING</option>
                    <option value="MATCHED">MATCHED</option>
                    <option value="RETURNED">RETURNED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Info</label>
                <input
                  type="text"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Image Preview Banner */}
              {item.image_url && (
                <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 max-h-72">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover max-h-72"
                  />
                </div>
              )}

              {/* Title & Metadata */}
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>{item.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1 font-mono text-[11px] tabular-nums">
                    <Calendar className="w-3.5 h-3.5" />
                    {item.item_date}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {item.view_count || 1} views
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {item.name}
                </h2>

                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 mt-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{item.location}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Description
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {item.description}
                </p>
              </div>

              {/* Identifying Features Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  {item.identifying_features_hidden ? (
                    <>
                      <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>Identifying Details Protected</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Identifying Features</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.identifying_features_hidden
                    ? 'To safeguard the rightful owner against fraudulent claims, distinctive internal serial numbers and unique marks are kept confidential by the finder. You will describe them in the ownership claim form below.'
                    : item.identifying_features || 'No special marks reported.'}
                </p>
              </div>

              {/* Reporter Information */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Reported by {item.owner_name?.split(' ')[0] || 'Member'}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {isFound ? 'Safe Finder' : 'Verified Owner'}
                    </span>
                  </div>
                </div>

                {item.contact_info && !isFound && (
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Contact Info</span>
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold select-all">
                      {item.contact_info}
                    </span>
                  </div>
                )}
              </div>

              {/* Claim Action for FOUND Items */}
              {isFound && item.status !== 'RETURNED' && !isOwner && (
                <div className="p-5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/80 space-y-3">
                  <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <h4 className="text-sm font-bold">Is this your item? Claim Ownership</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Provide distinguishing details to prove ownership (e.g. lock-screen photo, brand name on charger, engraved initials, card numbers, or contents). The finder will evaluate your proof.
                  </p>

                  <form onSubmit={handleClaim} className="space-y-3 pt-1">
                    <textarea
                      rows={3}
                      value={claimProof}
                      onChange={(e) => setClaimProof(e.target.value)}
                      placeholder="Describe marks, contents, lock screen photo, or unique serial information..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {user ? `Filing as ${user.name}` : 'Log in required to submit'}
                      </span>
                      <button
                        type="submit"
                        disabled={claimSubmitting}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{claimSubmitting ? 'Submitting...' : 'Submit Claim'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {item.status === 'RETURNED' && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-center">
                  <span className="text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    This item has been successfully verified and returned to its owner!
                  </span>
                </div>
              )}
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
