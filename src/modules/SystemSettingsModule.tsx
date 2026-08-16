import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { optimizeImageForStorage } from '../utils/imageOptimizer';
import {
  Settings,
  Save,
  Download,
  Upload,
  Shield,
  RefreshCw,
  Trash2,
  BookOpen,
  AlertTriangle,
  Building,
  CheckCircle2,
  Image,
  ImageOff,
  School,
} from 'lucide-react';
import schoolLogo from '../assets/images/masaba_crest_clean_1786779127246.jpg';

export const SystemSettingsModule: React.FC = () => {
  const { currentUser, activeRole } = useAuth();
  const { showToast } = useNotification();
  const [settings, setSettings] = useState(() => db.getSettings());

  useEffect(() => {
    return db.subscribe(() => {
      setSettings(db.getSettings());
    });
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveSettings(settings, currentUser?.fullName || 'System Administrator', activeRole);
    showToast('System & School Profile settings saved successfully to Cloud database!', 'success');
  };

  const handleRemoveLogo = () => {
    const updated = { ...settings, logoUrl: '' };
    setSettings(updated);
    db.saveSettings(updated, currentUser?.fullName || 'System Administrator', activeRole);
    showToast('School logo has been removed from all screens & reports.', 'info');
  };

  const handleRestoreLogo = async () => {
    const updated = { ...settings, logoUrl: schoolLogo };
    setSettings(updated);
    db.saveSettings(updated, currentUser?.fullName || 'System Administrator', activeRole);
    showToast('Official Masaba Secondary School crest restored.', 'success');
  };

  const handleUploadCustomLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP).', 'error');
      return;
    }

    try {
      showToast('Processing and optimizing school logo...', 'info');
      const optimizedDataUrl = await optimizeImageForStorage(file, 400, 0.85);
      const updated = { ...settings, logoUrl: optimizedDataUrl };
      setSettings(updated);
      db.saveSettings(updated, currentUser?.fullName || 'System Administrator', activeRole);
      showToast('New school logo uploaded and saved to Cloud Firestore!', 'success');
    } catch (err) {
      console.error('Error optimizing image:', err);
      showToast('Failed to process image. Please try another image file.', 'error');
    }
  };

  const handleExportBackup = () => {
    const backupJson = db.exportDatabaseJSON();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Masaba_SMIS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Full database backup JSON downloaded.', 'success');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const jsonContent = evt.target?.result as string;
        db.importDatabaseJSON(jsonContent, currentUser.fullName, activeRole);
        showToast('Database restored successfully from backup JSON file!', 'success');
        setSettings(db.getSettings());
      } catch (err) {
        showToast('Failed to import database backup. Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleWipeDatabase = () => {
    if (
      confirm(
        'WARNING: This will clear all entered students, marks, teachers, classes, payments, and timetable records so you can start from a completely clean database. Continue?'
      )
    ) {
      db.clearAllData(currentUser.fullName, activeRole);
      setSettings(db.getSettings());
      showToast('Database wiped to clean empty state. Ready for fresh school data entry.', 'success');
    }
  };

  const [isLoadingPresets, setIsLoadingPresets] = useState(false);

  const handleLoadCurriculumPresets = async () => {
    if (
      confirm(
        'Load standard Ugandan O-Level (S.1-S.4) & A-Level (S.5-S.6) classes and core UNEB subjects?'
      )
    ) {
      setIsLoadingPresets(true);
      try {
        await db.loadCurriculumPresets(currentUser?.fullName || 'System Administrator', activeRole);
        showToast('Standard Ugandan curriculum classes and subjects loaded successfully to database!', 'success');
      } catch (e) {
        console.error('Error loading curriculum presets:', e);
        showToast('Failed to load curriculum presets.', 'error');
      } finally {
        setIsLoadingPresets(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <Settings className="w-5 h-5 text-amber-400" />
            System Administration & School Configuration
          </h2>
          <p className="text-xs text-slate-400">
            MASABA SECONDARY SCHOOL BUDADIRI • School Identity, Academic Terms, Grading Scales & Data Controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-md"
          >
            <Download className="w-3.5 h-3.5" /> Backup Database (JSON)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* School Profile Form */}
        <form
          onSubmit={handleSaveSettings}
          className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 text-xs text-white"
        >
          {/* School Identity Header Box */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-4">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Masaba Crest"
                  className="w-16 h-16 object-contain rounded-lg bg-white p-1 border border-amber-400/40 shadow-sm shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-700 flex flex-col items-center justify-center text-amber-400 font-bold text-xs shrink-0 shadow-inner">
                  <School className="w-6 h-6 text-amber-400 mb-0.5" />
                  <span className="text-[10px]">MSS</span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white font-serif uppercase tracking-wide">
                    Official School Crest & Identity
                  </h3>
                  {settings.logoUrl ? (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      Logo Active
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      No Logo (Text Badge Mode)
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-[11px]">
                  Masaba Secondary School, Budadiri — Sironko District
                </p>
                <p className="text-amber-400 text-[10px] italic font-serif">
                  Motto: "{settings.motto}"
                </p>
              </div>
            </div>

            {/* Logo Actions */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <label className="cursor-pointer flex items-center gap-1.5 bg-blue-600/80 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                <Upload className="w-3.5 h-3.5" /> Upload Custom Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadCustomLogo}
                  className="hidden"
                />
              </label>

              {settings.logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="flex items-center gap-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  <ImageOff className="w-3.5 h-3.5" /> Remove School Logo
                </button>
              )}

              <button
                type="button"
                onClick={handleRestoreLogo}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Restore Official Crest
              </button>
            </div>
          </div>

          <h3 className="font-bold text-white text-sm font-serif border-b border-slate-800 pb-2">
            1. Institutional Profile & Contact Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">School Name *</label>
              <input
                type="text"
                required
                value={settings.schoolName}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">School Motto *</label>
              <input
                type="text"
                required
                value={settings.motto}
                onChange={(e) => setSettings({ ...settings, motto: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white italic font-serif"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">District / Location</label>
              <input
                type="text"
                value={settings.district}
                onChange={(e) => setSettings({ ...settings, district: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Sub-County / Town Council</label>
              <input
                type="text"
                value={settings.subCounty}
                onChange={(e) => setSettings({ ...settings, subCounty: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Postal Address (P.O. Box)</label>
              <input
                type="text"
                value={settings.poBox}
                onChange={(e) => setSettings({ ...settings, poBox: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Headteacher Full Name</label>
              <input
                type="text"
                value={settings.headTeacherName}
                onChange={(e) => setSettings({ ...settings, headTeacherName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Official Telephone Numbers</label>
              <input
                type="text"
                value={settings.telephone}
                onChange={(e) => setSettings({ ...settings, telephone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Official School Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>
          </div>

          <h3 className="font-bold text-white text-sm font-serif border-b border-slate-800 pb-2 pt-2">
            2. Academic Term & Session Controls
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Current Academic Year</label>
              <input
                type="text"
                value={settings.academicYear}
                onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Current Active Term</label>
              <select
                value={settings.currentTerm}
                onChange={(e) => setSettings({ ...settings, currentTerm: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
              >
                <option value="Term I">Term I</option>
                <option value="Term II">Term II</option>
                <option value="Term III">Term III</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md"
            >
              <Save className="w-4 h-4" /> Save Profile & Settings
            </button>
          </div>
        </form>

        {/* Database Management & Tools Sidebar */}
        <div className="space-y-6">
          {/* Quick Setup Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm font-serif flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Curriculum Setup
            </h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Quickly populate Ugandan UNEB classes (S.1–S.6) and standard subject codes if you wish to avoid typing them manually.
            </p>

            <button
              type="button"
              onClick={handleLoadCurriculumPresets}
              disabled={isLoadingPresets}
              className="w-full flex items-center justify-center gap-2 bg-indigo-900/50 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/50 font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
            >
              {isLoadingPresets ? (
                <>
                  <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" /> Populating Curriculum...
                </>
              ) : (
                <>
                  <Building className="w-4 h-4 text-indigo-400" /> Load Ugandan UNEB Classes & Subjects
                </>
              )}
            </button>
          </div>

          {/* Backup & Restore */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm font-serif flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" /> Database Backup & Recovery
            </h3>
            <p className="text-slate-400 text-[11px]">
              Export the full database to a JSON file or restore from a previous backup.
            </p>

            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full flex items-center justify-center gap-2 bg-emerald-900/60 hover:bg-emerald-900/90 text-emerald-200 border border-emerald-700/50 font-semibold py-2.5 rounded-xl transition-all"
            >
              <Download className="w-4 h-4 text-emerald-400" /> Export Complete Backup (JSON)
            </button>

            <div className="pt-2 border-t border-slate-800">
              <label className="block font-semibold text-slate-300 mb-2">Restore from Backup File</label>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="w-full text-slate-400 text-[11px] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>
          </div>

          {/* Danger Zone: Wipe Database */}
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-5 space-y-3 text-xs">
            <h3 className="font-bold text-rose-300 text-sm font-serif flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" /> Clean Slate Database
            </h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Reset all student, teacher, mark, fee, and timetable data to a completely blank database so you can start manual entry from scratch.
            </p>

            <button
              type="button"
              onClick={handleWipeDatabase}
              className="w-full flex items-center justify-center gap-2 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/60 font-semibold py-2.5 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4 text-rose-400" /> Clear Database to Empty State
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
