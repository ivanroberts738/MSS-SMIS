import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from '../components/Sidebar';
import {
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  DollarSign,
  AlertTriangle,
  CalendarCheck,
  TrendingUp,
  UserPlus,
  FileCheck,
  CreditCard,
  Bell,
  Clock,
  ArrowUpRight,
  School,
  Camera,
} from 'lucide-react';
import { LogoManagerModal } from '../components/LogoManagerModal';

interface DashboardModuleProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ onNavigateTab }) => {
  const { activeRole } = useAuth();
  const settings = db.getSettings();
  const [showLogoModal, setShowLogoModal] = useState(false);
  const students = db.getStudents();
  const teachers = db.getTeachers();
  const classes = db.getClasses();
  const subjects = db.getSubjects();
  const payments = db.getPayments();
  const feeStructures = db.getFeeStructures();
  const auditLogs = db.getAuditLogs().slice(0, 6);
  const events = db.getEvents();

  // Metrics calculation
  const totalStudents = students.length;
  const maleCount = students.filter((s) => s.gender === 'Male').length;
  const femaleCount = students.filter((s) => s.gender === 'Female').length;
  const activeTeachers = teachers.length;
  const totalClassesCount = classes.length;
  const totalSubjectsCount = subjects.length;

  // Financial Metrics
  const totalCollectedFees = payments.reduce((acc, p) => acc + p.amountPaid, 0);

  // Approximate total expected fee (avg fee * students)
  const totalExpectedFees = students.reduce((acc, s) => {
    const fs = feeStructures.find((f) => f.className === s.currentClass) || feeStructures[0];
    return acc + (fs ? fs.totalFee : 650000);
  }, 0);

  const totalOutstandingFees = Math.max(0, totalExpectedFees - totalCollectedFees);
  const collectionPercentage = totalExpectedFees > 0 ? Math.round((totalCollectedFees / totalExpectedFees) * 100) : 0;

  // Class breakdown distribution
  const classCounts = ['S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6'].map((clsName) => {
    const count = students.filter((s) => s.currentClass === clsName).length;
    return { className: clsName, count };
  });

  const maxClassCount = Math.max(...classCounts.map((c) => c.count), 1);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/50 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowLogoModal(true)}
              title="Click to Upload or Remove School Logo"
              className="relative cursor-pointer transition-transform hover:scale-105 focus:outline-none group shrink-0"
            >
              {settings.logoUrl ? (
                <div className="relative">
                  <img
                    src={settings.logoUrl}
                    alt="Masaba Crest"
                    className="w-16 h-16 object-contain rounded-2xl bg-white p-1 border-2 border-amber-400 shadow-md shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-amber-300 text-[9px] font-bold">
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span>Change</span>
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-amber-400/60 flex flex-col items-center justify-center text-amber-400 font-bold shrink-0 shadow-md group-hover:border-amber-400">
                  <School className="w-8 h-8 text-amber-400 mb-0.5" />
                  <span className="text-[10px] tracking-widest text-slate-300 font-mono">MSS</span>
                </div>
              )}
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold font-serif tracking-wide text-white">
                  {settings.schoolName}
                </h1>
                <span className="text-xs bg-amber-500 text-slate-950 font-bold px-2.5 py-0.5 rounded-full">
                  SMIS
                </span>
                <button
                  onClick={() => setShowLogoModal(true)}
                  className="text-[10px] bg-slate-800/80 hover:bg-slate-800 text-amber-300 hover:text-white border border-slate-700 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                  title="Upload, change, or remove logo"
                >
                  <Camera className="w-3 h-3 text-amber-400" />
                  <span>Customize Logo</span>
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-medium italic">
                "{settings.motto}" • {settings.district}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-amber-200/90 font-medium">
                <span>Active Term: <strong className="text-white">{settings.currentTerm} ({settings.academicYear})</strong></span>
                <span>•</span>
                <span>Persona: <strong className="text-amber-300">{activeRole}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => onNavigateTab('students')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              Register Student
            </button>
            <button
              onClick={() => onNavigateTab('academics')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
            >
              <FileCheck className="w-4 h-4 text-emerald-400" />
              Enter Marks
            </button>
            <button
              onClick={() => onNavigateTab('finance')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
            >
              <CreditCard className="w-4 h-4 text-amber-400" />
              Fee Payment
            </button>
          </div>
        </div>
      </div>

      {/* Top Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <div
          onClick={() => onNavigateTab('students')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 cursor-pointer hover:border-blue-500/50 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Enrollment</span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/40 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{totalStudents}</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> +12% YoY
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Male: <strong className="text-slate-200">{maleCount}</strong></span>
            <span>Female: <strong className="text-slate-200">{femaleCount}</strong></span>
          </div>
        </div>

        {/* Card 2: Academic Staff */}
        <div
          onClick={() => onNavigateTab('teachers')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 cursor-pointer hover:border-emerald-500/50 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Teaching Staff</span>
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/40 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{activeTeachers}</span>
            <span className="text-xs text-slate-400">across 6 departments</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Classes: <strong className="text-slate-200">{totalClassesCount} Streams</strong></span>
            <span>Subjects: <strong className="text-slate-200">{totalSubjectsCount}</strong></span>
          </div>
        </div>

        {/* Card 3: Fees Collected */}
        <div
          onClick={() => onNavigateTab('finance')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 cursor-pointer hover:border-amber-500/50 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Term II Fees Collected</span>
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800/40 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-amber-300">
              UGX {(totalCollectedFees / 1000000).toFixed(1)}M
            </span>
            <span className="text-xs font-bold text-emerald-400">{collectionPercentage}%</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, collectionPercentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Attendance & Health */}
        <div
          onClick={() => onNavigateTab('attendance')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 cursor-pointer hover:border-purple-500/50 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Attendance Rate</span>
            <div className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-800/40 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">96.4%</span>
            <span className="text-xs text-emerald-400 font-semibold">High Attendance</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>At Risk: <strong className="text-rose-400">1 Student</strong></span>
            <span>Recorded Today</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Visual Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Population Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
                Student Enrollment by Class Level
              </h3>
              <p className="text-xs text-slate-400">Distribution across O-Level (S.1–S.4) and A-Level (S.5–S.6)</p>
            </div>
            <button
              onClick={() => onNavigateTab('classes')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              View Streams <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 pt-2">
            {classCounts.map((cls) => {
              const percentage = Math.round((cls.count / maxClassCount) * 100);
              return (
                <div key={cls.className} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{cls.className}</span>
                    <span className="text-slate-400 font-mono">{cls.count} Students ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-xl h-3 overflow-hidden p-0.5 border border-slate-700/50">
                    <div
                      className={`h-full rounded-lg transition-all duration-500 ${
                        cls.className.startsWith('S.5') || cls.className.startsWith('S.6')
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                      }`}
                      style={{ width: `${Math.max(12, percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gender Distribution & Fee Status Ring */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans mb-1">
              Gender & Financial Health
            </h3>
            <p className="text-xs text-slate-400 mb-6">Masaba Secondary School Summary</p>

            {/* Gender visual representation */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 mb-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Gender Ratio</span>
                <span className="text-slate-400 font-mono">
                  {Math.round((maleCount / totalStudents) * 100)}% M / {Math.round((femaleCount / totalStudents) * 100)}% F
                </span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${(maleCount / totalStudents) * 100}%` }}
                  title={`Male: ${maleCount}`}
                />
                <div
                  className="bg-pink-500 h-full"
                  style={{ width: `${(femaleCount / totalStudents) * 100}%` }}
                  title={`Female: ${femaleCount}`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Male ({maleCount})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Female ({femaleCount})
                </span>
              </div>
            </div>

            {/* Outstanding balance highlight */}
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider">Unpaid Balances</span>
              </div>
              <p className="text-lg font-bold text-white">
                UGX {totalOutstandingFees.toLocaleString()}
              </p>
              <p className="text-[11px] text-amber-300/80 mt-1">
                Automated reminder SMS notice ready to send to guardians.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('reports')}
            className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-semibold transition-colors border border-slate-700"
          >
            Generate Detailed Financial Report
          </button>
        </div>
      </div>

      {/* Bottom Section: Audit Activity & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit Activities */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Recent System Activity Audit
            </h3>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Full Log
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{log.userName}</span>
                    <span className="text-[10px] bg-slate-800 text-amber-300 px-1.5 py-0.2 rounded border border-slate-700">
                      {log.userRole}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">{log.details}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 font-mono">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming School Events */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Upcoming Calendar Events
            </h3>
            <button
              onClick={() => onNavigateTab('calendar')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Calendar
            </button>
          </div>

          <div className="space-y-3">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3 text-xs"
              >
                <div className="bg-amber-500/20 text-amber-300 border border-amber-500/30 p-2 rounded-xl text-center shrink-0 w-12">
                  <span className="block text-[10px] font-bold uppercase">{evt.startDate.split('-')[1]}</span>
                  <span className="block text-base font-bold text-white">{evt.startDate.split('-')[2]}</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{evt.title}</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">{evt.description}</p>
                  <span className="inline-block mt-1 text-[10px] text-amber-400/90 font-medium">
                    📍 {evt.location || 'Masaba Grounds'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* School Logo & Crest Manager Modal */}
      <LogoManagerModal
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
      />
    </div>
  );
};
