import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  FileCheck,
  Clock,
  DollarSign,
  UserCheck,
  AlertTriangle,
  BookOpen,
  Boxes,
  Megaphone,
  FileSpreadsheet,
  FolderOpen,
  CalendarDays,
  Shield,
  Settings,
  History,
  X,
  Building2,
  TrendingUp,
  LogOut,
  Layers,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'students'
  | 'classes'
  | 'teachers'
  | 'teacher_assignments'
  | 'academics'
  | 'report_cards'
  | 'attendance'
  | 'exams'
  | 'timetable'
  | 'discipline'
  | 'library'
  | 'communication'
  | 'reports'
  | 'documents'
  | 'calendar'
  | 'analytics'
  | 'users'
  | 'settings'
  | 'audit';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { hasPermission, currentUser, logout } = useAuth();

  const navGroups = [
    {
      group: 'Core Administration',
      items: [
        { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard, module: 'Dashboard' },
        { id: 'students' as ActiveTab, label: 'Student Directory', icon: Users, module: 'Students' },
        { id: 'classes' as ActiveTab, label: 'Classes & Streams', icon: Building2, module: 'Students' },
        { id: 'teachers' as ActiveTab, label: 'Teachers & Staff', icon: UserCheck, module: 'Teachers' },
        { id: 'teacher_assignments' as ActiveTab, label: 'Teacher Allocations', icon: Layers, module: 'Teachers' },
      ],
    },
    {
      group: 'Academic Administration',
      items: [
        { id: 'academics' as ActiveTab, label: 'Academics & Marks', icon: GraduationCap, module: 'Academics' },
        { id: 'report_cards' as ActiveTab, label: 'Report Cards Generator', icon: FileCheck, module: 'Academics' },
        { id: 'analytics' as ActiveTab, label: 'Academic Analytics', icon: TrendingUp, module: 'Academics' },
        { id: 'attendance' as ActiveTab, label: 'Daily Attendance', icon: CalendarCheck, module: 'Attendance' },
        { id: 'exams' as ActiveTab, label: 'Examinations', icon: FileSpreadsheet, module: 'Exams' },
        { id: 'timetable' as ActiveTab, label: 'Timetable Scheduling', icon: Clock, module: 'Timetable' },
      ],
    },
    {
      group: 'School Finance & Operations',
      items: [
        { id: 'discipline' as ActiveTab, label: 'Discipline Tracking', icon: AlertTriangle, module: 'Discipline' },
        { id: 'library' as ActiveTab, label: 'Library Management', icon: BookOpen, module: 'Library' },
      ],
    },
    {
      group: 'Communication & Resources',
      items: [
        { id: 'communication' as ActiveTab, label: 'Communication Center', icon: Megaphone, module: 'Communication' },
        { id: 'reports' as ActiveTab, label: 'Reports & Exports', icon: FileSpreadsheet, module: 'Reports' },
        { id: 'documents' as ActiveTab, label: 'Document Repository', icon: FolderOpen, module: 'Documents' },
        { id: 'calendar' as ActiveTab, label: 'School Calendar', icon: CalendarDays, module: 'Calendar' },
      ],
    },
    {
      group: 'System & Security',
      items: [
        { id: 'users' as ActiveTab, label: 'Users & Roles', icon: Shield, module: 'Users' },
        { id: 'settings' as ActiveTab, label: 'School Settings', icon: Settings, module: 'Settings' },
        { id: 'audit' as ActiveTab, label: 'Audit Trail Logs', icon: History, module: 'Audit' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col transition-transform duration-300 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header Close */}
        <div className="lg:hidden p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="font-bold text-sm text-white uppercase font-serif">SMIS Navigation</span>
          <button onClick={onCloseMobile} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => hasPermission(item.module));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group} className="space-y-1">
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                  {group.group}
                </h3>
                <div className="mt-1 space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`nav-item-${item.id}`}
                        onClick={() => {
                          onSelectTab(item.id);
                          onCloseMobile();
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-semibold'
                            : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* User Card & Logout */}
        {currentUser && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser.fullName}</p>
              <p className="text-[10px] text-amber-400 font-medium truncate">{currentUser.role}</p>
            </div>
            <button
              id="sidebar-logout-btn"
              onClick={logout}
              className="p-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/90 text-rose-300 hover:text-white border border-rose-800/50 transition-colors shrink-0"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="p-2.5 border-t border-slate-800/60 bg-slate-950/80 text-[10px] text-slate-500 text-center">
          <p className="font-semibold text-slate-400">Masaba Secondary School</p>
          <p className="text-[9px]">SMIS • Budadiri Edition</p>
        </div>
      </aside>
    </>
  );
};
