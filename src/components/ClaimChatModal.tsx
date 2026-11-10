import React, { useState, useEffect, useRef } from 'react';
import { Claim, ClaimMessage, User } from '../types';
import { X, Send, ShieldCheck, User as UserIcon } from 'lucide-react';

interface ClaimChatModalProps {
  claim: Claim;
  currentUser: User;
  onClose: () => void;
  api: any;
  onToast: (msg: string, isError?: boolean) => void;
}

export const ClaimChatModal: React.FC<ClaimChatModalProps> = ({
  claim,
  currentUser,
  onClose,
  api,
  onToast,
}) => {
  const [messages, setMessages] = useState<ClaimMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await api.getClaimMessages(claim.id);
      if (res.messages) {
        setMessages(res.messages);
      }
    } catch (err: any) {
      console.error('Failed to load claim messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [claim.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const msgToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await api.sendClaimMessage(claim.id, msgToSend);
      if (res.error) {
        onToast(res.error, true);
      } else {
        fetchMessages();
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to send message', true);
    } finally {
      setSending(false);
    }
  };

  const isClaimant = currentUser.id === claim.claimant_id;
  const counterpartName = isClaimant ? (claim.finder_name || 'Item Finder') : (claim.claimant_name || 'Claimant');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[600px] max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              {counterpartName.charAt(0)}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {counterpartName}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span>Item: {claim.item_name}</span>
                <span aria-hidden="true">·</span>
                <span className="text-teal-600 dark:text-teal-400 font-semibold">{claim.status}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Banner */}
        <div className="bg-blue-50/80 dark:bg-blue-950/30 px-4 py-2 border-b border-blue-100/60 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>Keep all verification messages in LostLink. Meet in public places for item return.</span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
              Loading conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No messages yet. Send a greeting to initiate safe recovery.
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === currentUser.id;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-slate-400 px-1 mb-1">
                    {isMe ? 'You' : m.sender_name || counterpartName}
                  </span>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                    }`}
                  >
                    {m.message}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-mono">
                    {m.created_at ? m.created_at.split(' ')[1]?.slice(0, 5) || '' : ''}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
