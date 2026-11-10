import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, Lock, Mail, User as UserIcon, Phone, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  initialIsRegister?: boolean;
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
  api: any;
  onToast: (msg: string, isError?: boolean) => void;
}

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({
  initialIsRegister = false,
  onClose,
  onSuccess,
  api,
  onToast,
}) => {
  const [isRegister, setIsRegister] = useState(initialIsRegister);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Listen for OAuth postMessage callback from popup
  useEffect(() => {
    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_CALLBACK') {
        const { code, error } = event.data;
        if (error) {
          onToast(`Google authentication was cancelled or declined: ${error}`, true);
          setGoogleLoading(false);
          return;
        }
        if (code) {
          setGoogleLoading(true);
          try {
            // Verify and complete Google auth on backend
            const res = await api.verifyGoogleAuth({ idToken: code });
            if (res.user && res.token) {
              onToast(res.linked ? 'Your Google account was successfully linked!' : `Welcome to LostLink, ${res.user.name}!`);
              onSuccess(res.user, res.token);
              onClose();
            }
          } catch (err: any) {
            onToast(err.message || 'Google verification failed.', true);
          } finally {
            setGoogleLoading(false);
          }
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  // Handle Google Sign-In button click
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      // 1. Fetch authorization URL from server
      const authInfo = await api.getGoogleAuthUrl();
      
      if (!authInfo.clientId) {
        onToast('Google Sign-In is not configured yet. Please use email and password.', true);
        return;
      }

      // 2. Open official Google authorization URL in popup
      const popup = window.open(
        authInfo.url,
        'google_oauth_popup',
        'width=550,height=650,left=200,top=100'
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        onToast('Popup blocked by browser. Please allow popups for this site.', true);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      onToast(err.message || 'Failed to initialize Google Sign-In', true);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          onToast('Please enter your full name.', true);
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          onToast('Password must be at least 8 characters long.', true);
          setLoading(false);
          return;
        }
        const res = await api.register({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        });
        if (res.error) {
          onToast(res.error, true);
        } else {
          onToast(`Welcome to LostLink, ${res.user.name}!`);
          onSuccess(res.user, res.token);
          onClose();
        }
      } else {
        const res = await api.login({
          email: email.trim(),
          password,
        });
        if (res.error) {
          onToast(res.error, true);
        } else {
          onToast(`Welcome back, ${res.user.name}!`);
          onSuccess(res.user, res.token);
          onClose();
        }
      }
    } catch (err: any) {
      onToast(err.message || 'Authentication failed. Please check credentials.', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {isRegister ? 'Create Your Account' : 'Welcome to LostLink'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <button
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${
              !isRegister
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${
              isRegister
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            New Registration
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          
          {/* Official Google Sign-In Button */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-100 font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all group disabled:opacity-60"
            >
              <GoogleIcon />
              <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

          </div>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">
                Or continue with password
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +1 555-0199"
                      required
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password {isRegister && <span className="text-[10px] text-slate-400 font-normal">(min 8 characters)</span>}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 pt-2"
            >
              <span>{loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
