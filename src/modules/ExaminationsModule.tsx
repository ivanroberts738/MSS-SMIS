import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { FileSpreadsheet, Plus, Trash2, Save, Printer } from 'lucide-react';
import { ExamSchedule } from '../types';

export const ExaminationsModule: React.FC = () => {
  const { currentUser, activeRole } = useAuth();
  const { showToast } = useNotification();
  
  const [examSchedule, setExamSchedule] = useState<ExamSchedule[]>(() => db.getExams());
  const [examType, setExamType] = useState('End of Term II Examination');

  const handleSaveExam = (exam: ExamSchedule) => {
    db.saveExam(exam, currentUser.fullName, activeRole);
    setExamSchedule(db.getExams());
    showToast('Exam schedule updated', 'success');
  };

  const handleDeleteExam = (id: string) => {
    if (confirm('Are you sure you want to delete this exam slot?')) {
      db.deleteExam(id, currentUser.fullName, activeRole);
      setExamSchedule(db.getExams());
      showToast('Exam slot deleted', 'success');
    }
  };

  const handleAddExam = () => {
    const newExam: ExamSchedule = {
      id: `ex-${Date.now()}`,
      title: examType,
      date: '2026-08-20',
      paperName: 'New Paper',
      timeSlot: '08:00 - 10:00',
      venue: 'Main Hall',
      invigilator: 'TBD',
    };
    db.saveExam(newExam, currentUser.fullName, activeRole);
    setExamSchedule(db.getExams());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            Examination Administration & Scheduling
          </h2>
          <p className="text-xs text-slate-400">
            Masaba Secondary School • UNEB & Internal School Examinations Center
          </p>
        </div>
        <div className="flex gap-2">
            <button onClick={handleAddExam} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all">
                <Plus className="w-4 h-4"/> Add Exam
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all"
            >
              <Printer className="w-4 h-4" /> Print Exam Timetable
            </button>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-sm font-serif">Editable {examType} Schedule</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-sans font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Time Slot</th>
                <th className="p-3.5">Subject & Paper</th>
                <th className="p-3.5">Room / Venue</th>
                <th className="p-3.5">Invigilator</th>
                <th className="p-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {examSchedule.map((ex) => (
                <tr key={ex.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-2"><input className="bg-slate-950 border border-slate-800 rounded p-1 text-white" value={ex.date} onChange={e => handleSaveExam({...ex, date: e.target.value})}/></td>
                  <td className="p-2"><input className="bg-slate-950 border border-slate-800 rounded p-1 text-white" value={ex.timeSlot} onChange={e => handleSaveExam({...ex, timeSlot: e.target.value})}/></td>
                  <td className="p-2"><input className="bg-slate-950 border border-slate-800 rounded p-1 text-white" value={ex.paperName} onChange={e => handleSaveExam({...ex, paperName: e.target.value})}/></td>
                  <td className="p-2"><input className="bg-slate-950 border border-slate-800 rounded p-1 text-white" value={ex.venue} onChange={e => handleSaveExam({...ex, venue: e.target.value})}/></td>
                  <td className="p-2"><input className="bg-slate-950 border border-slate-800 rounded p-1 text-white" value={ex.invigilator} onChange={e => handleSaveExam({...ex, invigilator: e.target.value})}/></td>
                  <td className="p-2">
                      <button onClick={() => handleDeleteExam(ex.id)} className="text-red-500 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
