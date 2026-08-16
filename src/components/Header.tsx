import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/db';
import { Role } from '../types';
import {
  Search,
  Bell,
  ShieldCheck,
  RotateCcw,
  UserCheck,
  ChevronDown,
  LogOut,
  Calendar,
  Sparkles,
  Menu,
  School,
  Camera,
  Image,
} from 'lucide-react';
import { LogoManagerModal } from './LogoManagerModal';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch, onOpenMobileMenu }) => {
  const { logout, currentUser } = useAuth();
  const [settings, setSettings] = useState(() => db.getSettings());
  const [notifications, setNotifications] = useState(() => db.getNotifications());
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);

  useEffect(() => {
    return db.subscribe(() => {
      setSettings(db.getSettings());
      setNotifications(db.getNotifications());
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const rolesList: Role[] = [
    'Super Administrator',
    'School Administrator',
    'Head Teacher',
    'Deputy Head Teacher',
    'Director of Studies',
    'Teacher',
    'Class Teacher',
    'Bursar/Finance Officer',
    'Librarian',
    'Storekeeper',
    'Student',
    'Parent/Guardian',
  ];

  return (
    <header id="main-header" className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setShowLogoModal(true)}
            title="Click to Upload, Change or Remove School Logo"
            className="flex items-center gap-3 text-left group focus:outline-none rounded-xl p-1 -m-1 hover:bg-slate-800/60 transition-all"
          >
            {settings.logoUrl ? (
              <div className="relative">
                <img
                  src={settings.logoUrl}
                  alt="Masaba Secondary School Crest"
                  className="w-11 h-11 object-contain rounded-lg bg-white p-0.5 border border-amber-400/40 shadow-sm shrink-0 transition-transform group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-amber-300">
                  <Camera className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-700 flex flex-col items-center justify-center text-amber-400 font-bold shrink-0 shadow-inner group-hover:border-amber-400/60 transition-colors">
                <School className="w-5 h-5 text-amber-400" />
                <span className="text-[8px] tracking-tighter text-slate-300 font-mono">MSS</span>
              </div>
            )}
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-wide text-white uppercase font-serif group-hover:text-amber-300 transition-colors">
                  MASABA SECONDARY SCHOOL
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                  BUDADIRI
                </span>
              </div>
              <p className="text-[11px] text-slate-300 tracking-wider font-medium italic">
                "{settings.motto}"
              </p>
            </div>
          </button>
        </div>

        {/* Center Search trigger */}
        <button
          id="global-search-btn"
          onClick={onOpenSearch}
          className="hidden md:flex items-center gap-3 bg-slate-800/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-xl px-4 py-2 text-xs transition-colors w-64 lg:w-80 shadow-inner"
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="flex-1 text-left truncate text-slate-400">Search students, teachers, marks...</span>
          <kbd className="bg-slate-900 text-slate-400 text-[10px] px-1.5 py-0.5 rounded border border-slate-700 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Mobile search button */}
          <button
            onClick={onOpenSearch}
            className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Academic Term Pill */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-slate-300">{settings.academicYear}</span>
            <span className="text-slate-500">•</span>
            <span className="font-semibold text-amber-300">{settings.currentTerm}</span>
          </div>

          {/* Notifications button */}
          <div className="relative">
            <button
              id="notifications-bell-btn"
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              className="relative p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotificationDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-slate-200">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    System Notifications
                  </h4>
                  <span className="text-[10px] text-slate-400">{notifications.length} total</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => db.markNotificationAsRead(n.id)}
                      className={`p-3 hover:bg-slate-800/60 transition-colors cursor-pointer text-xs ${
                        !n.isRead ? 'bg-slate-800/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white">{n.title}</span>
                        <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Logo Management Action */}
          <button
            onClick={() => setShowLogoModal(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
            title="Upload, Change, or Remove School Logo"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">School Logo</span>
          </button>

          {/* User Profile and Log Out Button */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-white truncate max-w-[120px] lg:max-w-[160px]">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] text-amber-400 font-medium truncate max-w-[120px] lg:max-w-[160px]">
                  {currentUser.role}
                </span>
              </div>
              <button
                id="header-logout-btn"
                onClick={logout}
                className="flex items-center gap-1.5 bg-rose-950/60 hover:bg-rose-900/90 text-rose-300 hover:text-white border border-rose-800/60 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm group"
                title="Log out of system"
              >
                <LogOut className="w-4 h-4 text-rose-400 group-hover:text-white transition-colors" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* School Logo & Crest Manager Modal */}
      <LogoManagerModal
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
      />
    </header>
  );
};
