import React, { useState, useRef, useEffect } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { optimizeImageForStorage } from '../utils/imageOptimizer';
import {
  Upload,
  ImageOff,
  RefreshCw,
  School,
  X,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Trash2,
  Sparkles,
} from 'lucide-react';
import defaultSchoolLogo from '../assets/images/masaba_crest_clean_1786779127246.jpg';

interface LogoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoManagerModal: React.FC<LogoManagerModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, activeRole } = useAuth();
  const { showToast } = useNotification();
  const [settings, setSettings] = useState(() => db.getSettings());
  const [urlInput, setUrlInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return db.subscribe(() => {
      setSettings(db.getSettings());
    });
  }, []);

  if (!isOpen) return null;

  const currentLogo = settings.logoUrl;

  const handleApplyLogo = (newUrl: string, description: string) => {
    const updated = { ...settings, logoUrl: newUrl };
    setSettings(updated);
    db.saveSettings(
      updated,
      currentUser?.fullName || 'System Administrator',
      activeRole || 'Super Administrator'
    );
    showToast(description, 'success');
  };

  const handleRemoveLogo = () => {
    handleApplyLogo('', 'School logo removed. System is now using institutional badge.');
  };

  const handleRestoreDefault = () => {
    handleApplyLogo(defaultSchoolLogo, 'Official Masaba Secondary School crest restored!');
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP).', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      showToast('Optimizing and persisting logo to cloud...', 'info');
      const optimized = await optimizeImageForStorage(file, 400, 0.85);
      handleApplyLogo(optimized, 'New school logo uploaded and saved to Cloud Firestore!');
    } catch (err) {
      console.error('Error optimizing logo:', err);
      showToast('Failed to process image file.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    handleApplyLogo(urlInput.trim(), 'Logo URL updated successfully!');
    setUrlInput('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl text-xs text-white relative animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white font-serif uppercase tracking-wide">
                School Logo & Crest Manager
              </h2>
              <p className="text-slate-400 text-[11px]">
                Upload, change, or remove the emblem displayed across the portal & report cards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Logo Preview */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {currentLogo ? (
              <div className="w-20 h-20 bg-white rounded-2xl p-2 border-2 border-amber-400/80 shadow-md flex items-center justify-center shrink-0">
                <img
                  src={currentLogo}
                  alt="Current Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-20 h-20 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 shrink-0">
                <ImageOff className="w-6 h-6 mb-1 text-slate-500" />
                <span className="text-[9px] font-bold">NO LOGO</span>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">
                  {currentLogo ? 'Custom Logo Active' : 'No Logo (Badge Mode)'}
                </span>
                {currentLogo ? (
                  <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                ) : (
                  <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Text Badge
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {currentLogo
                  ? 'This image appears on login, header, dashboard, official report cards, and certificates.'
                  : 'System uses clean institutional text abbreviation (MSS) without images.'}
              </p>
            </div>
          </div>

          {/* Quick Remove Button if active */}
          {currentLogo && (
            <button
              onClick={handleRemoveLogo}
              className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
              title="Remove logo completely"
            >
              <Trash2 className="w-4 h-4" /> Remove Logo
            </button>
          )}
        </div>

        {/* Upload Options */}
        <div className="space-y-4">
          {/* Drag & Drop Upload Zone */}
          <div>
            <span className="block text-slate-300 font-semibold mb-2 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Option 1: Upload Image from Computer / Phone</span>
            </span>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-blue-500 bg-blue-950/30'
                  : 'border-slate-700 bg-slate-950/60 hover:border-slate-500 hover:bg-slate-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-200 text-xs">
                Click to browse or drag & drop your school logo here
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports PNG, JPG, JPEG, SVG, WebP (Transparent PNG recommended)
              </p>
            </div>
          </div>

          {/* Option 2: Image URL */}
          <div>
            <span className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-amber-400" />
              <span>Option 2: Paste Web Image URL</span>
            </span>
            <form onSubmit={handleUrlSubmit} className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/masaba-logo.png"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 text-xs focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!urlInput.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                Apply URL
              </button>
            </form>
          </div>
        </div>

        {/* Quick Action Presets */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRestoreDefault}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>Restore Official Masaba Crest</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
