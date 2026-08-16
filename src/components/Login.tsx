import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { db } from '../services/db';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  School,
  KeyRound,
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login, resetPassword } = useAuth();
  const { showToast } = useNotification();
  const [settings, setSettings] = useState(() => db.getSettings());

  useEffect(() => {
    return db.subscribe(() => {
      setSettings(db.getSettings());
    });
  }, []);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('');
  const [forgotErrorMessage, setForgotErrorMessage] = useState('');

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Thank you for installing Masaba SMIS!', 'success');
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else {
      showToast('To install: click Add to Home Screen in your browser settings.', 'info');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const result = await login(identifier, password);
      if (result.success) {
        showToast('Logged in successfully. Welcome to Masaba SMIS!', 'success');
      } else {
        setErrorMessage(result.message || 'Invalid username or password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMessage('');
    setForgotSuccessMessage('');

    if (!forgotIdentifier.trim()) {
      setForgotErrorMessage('Please enter your username or registered email address.');
      return;
    }

    try {
      const res = await resetPassword(forgotIdentifier);
      if (res.success) {
        setForgotSuccessMessage(res.message);
      } else {
        setForgotErrorMessage(res.message);
      }
    } catch (err: any) {
      setForgotErrorMessage(err.message || 'Error resetting password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Background Subtle Gradient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* School Crest & Header */}
        <div className="text-center space-y-3">
          <div className="inline-block relative">
            {settings.logoUrl ? (
              <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto bg-white rounded-2xl p-1.5 shadow-xl border-2 border-amber-400/80 flex items-center justify-center overflow-hidden">
                <img
                  src={settings.logoUrl}
                  alt="Masaba Secondary School Crest"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 rounded-2xl p-3 shadow-xl border-2 border-amber-400/60 flex flex-col items-center justify-center overflow-hidden text-amber-400">
                <School className="w-8 h-8 text-amber-400 mb-1" />
                <span className="text-[11px] font-extrabold tracking-widest text-white">MSS</span>
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-900 shadow">
              SMIS
            </div>
          </div>

          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white font-serif tracking-tight uppercase">
              {settings.schoolName || 'Masaba Secondary School'}
            </h1>
            <p className="text-xs font-semibold text-blue-400 tracking-wider uppercase mt-0.5">
              Budadiri • Sironko District
            </p>
            <p className="text-[11px] text-amber-300/90 italic font-serif mt-1">
              "{settings.motto || 'For Knowledge Wisdom and Character'}"
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-950/70 border border-rose-800/80 text-rose-200 p-3 rounded-2xl text-xs flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Username / Email Field */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
              <span>Username or School Email</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoFocus
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter username or email address"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 text-xs transition-colors"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Password</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotIdentifier(identifier);
                  setForgotSuccessMessage('');
                  setForgotErrorMessage('');
                  setShowForgotModal(true);
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-3.5 pr-10 py-2.5 text-white placeholder-slate-500 text-xs transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me option */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Remember this session</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl transition-all duration-150 shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Shield className="w-4 h-4" /> Sign In to Portal
              </>
            )}
          </button>

          {/* Install Button (Always visible for better discovery) */}
          <button
            type="button"
            onClick={handleInstallPWA}
            className="w-full bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold py-2.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 text-xs uppercase tracking-wider border border-slate-700"
          >
            <Smartphone className="w-4 h-4" /> Install App to Device
          </button>
        </form>

        {/* School Footer Note */}
        <div className="text-center pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
          <span>P.O. Box Budadiri • Uganda</span>
          <span className="font-mono text-slate-400">SMIS v2.5 PWA</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white font-serif flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Account Recovery & Password Reset
              </h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Enter your username or registered email address. The system will guide you through password reset or recovery.
            </p>

            {forgotErrorMessage && (
              <div className="bg-rose-950/70 border border-rose-800 text-rose-200 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{forgotErrorMessage}</span>
              </div>
            )}

            {forgotSuccessMessage && (
              <div className="bg-emerald-950/70 border border-emerald-800 text-emerald-200 p-3 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Password Reset Successful</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-100">{forgotSuccessMessage}</p>
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Username or Email</label>
                <input
                  type="text"
                  required
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="e.g. username or email address"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl shadow"
                >
                  Reset Password
                </button>
              </div>
            </form>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1 text-[11px] text-slate-400">
              <span className="font-bold text-slate-300 block">Need further assistance?</span>
              <p>Contact the Masaba ICT Support Office:</p>
              <p className="text-slate-300">📞 +256 772 123 456 / +256 701 987 654</p>
              <p className="text-slate-300">✉️ support@masabasecondary.ac.ug</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
