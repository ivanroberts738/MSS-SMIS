import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { ActiveTab } from './Sidebar';
import { Search, X, Users, UserCheck, DollarSign, FolderOpen, BookOpen } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectStudent?: (studentId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // toggle handled in parent
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const students = db.getStudents().filter(
    (s) =>
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.admissionNo.toLowerCase().includes(q) ||
      s.currentClass.toLowerCase().includes(q)
  );

  const teachers = db.getTeachers().filter(
    (t) =>
      t.firstName.toLowerCase().includes(q) ||
      t.lastName.toLowerCase().includes(q) ||
      t.department.toLowerCase().includes(q) ||
      t.teacherId.toLowerCase().includes(q)
  );

  const payments = db.getPayments().filter(
    (p) => p.receiptNo.toLowerCase().includes(q) || p.amountPaid.toString().includes(q)
  );

  const books = db.getBooks().filter(
    (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
  );

  const documents = db.getDocuments().filter((d) => d.title.toLowerCase().includes(q));

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Search Input Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/40">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students (e.g., Sarah, MSS/2024), teachers, receipts, books..."
            className="w-full bg-transparent text-sm font-medium text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-6">
          {!q ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <p className="font-semibold text-slate-400 mb-1">Global System Search</p>
              <p>Type student admission number, name, teacher department, or receipt ID.</p>
            </div>
          ) : (
            <>
              {/* Students */}
              {students.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    Students ({students.length})
                  </h4>
                  <div className="space-y-1">
                    {students.slice(0, 5).map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          onNavigateTab('students');
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">
                            {s.firstName} {s.middleName || ''} {s.lastName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {s.admissionNo} • {s.currentClass} {s.stream} ({s.level})
                          </p>
                        </div>
                        <span className="text-[10px] bg-blue-900/60 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded-full">
                          {s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teachers */}
              {teachers.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Teachers & Staff ({teachers.length})
                  </h4>
                  <div className="space-y-1">
                    {teachers.slice(0, 4).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          onNavigateTab('teachers');
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">
                            {t.firstName} {t.lastName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {t.teacherId} • {t.department} Department
                          </p>
                        </div>
                        <span className="text-[10px] text-emerald-300">{t.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payments */}
              {payments.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    Payments & Receipts ({payments.length})
                  </h4>
                  <div className="space-y-1">
                    {payments.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onNavigateTab('finance');
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-amber-300">{p.receiptNo}</p>
                          <p className="text-[11px] text-slate-400">
                            {p.className} • {p.paymentMethod} • {p.paymentDate}
                          </p>
                        </div>
                        <span className="font-bold text-white">
                          UGX {p.amountPaid.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Books */}
              {books.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    Library Catalog ({books.length})
                  </h4>
                  <div className="space-y-1">
                    {books.slice(0, 3).map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          onNavigateTab('library');
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">{b.title}</p>
                          <p className="text-[11px] text-slate-400">
                            Author: {b.author} • Location: {b.shelfLocation}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {b.availableCopies}/{b.totalCopies} copies
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {documents.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-purple-400" />
                    Repository Documents ({documents.length})
                  </h4>
                  <div className="space-y-1">
                    {documents.slice(0, 3).map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          onNavigateTab('documents');
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">{d.title}</p>
                          <p className="text-[11px] text-slate-400">{d.category} • {d.fileSize}</p>
                        </div>
                        <span className="text-[10px] text-purple-300">View Document</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {students.length === 0 &&
                teachers.length === 0 &&
                payments.length === 0 &&
                books.length === 0 &&
                documents.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No matching records found for "{query}".
                  </div>
                )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Tip: Press ESC to close</span>
          <span>Masaba Secondary School SMIS</span>
        </div>
      </div>
    </div>
  );
};
