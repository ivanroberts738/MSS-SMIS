import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, AlertCircle, Printer, BookOpen, X, Save } from 'lucide-react';
import { TimetableSlot, Subject, Teacher } from '../types';

export const TimetableModule: React.FC = () => {
  const { currentUser } = useAuth();
  const timetable = db.getTimetable();
  const subjects = db.getSubjects();
  const teachers = db.getTeachers();

  const [selectedClass, setSelectedClass] = useState('S.1');
  const [selectedStream, setSelectedStream] = useState('North');
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    '08:00', '08:40', '09:20', '10:30', '11:10', '11:50', '14:00', '14:40', '15:20'
  ];

  const classSchedule = timetable.filter(
    (t) => t.className === selectedClass && t.stream === selectedStream
  );

  const handleSaveSlot = (slot: TimetableSlot) => {
    db.saveTimetableSlot(slot);
    setEditingSlot(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <Calendar className="w-5 h-5 text-blue-400" />
            Class Timetable & Teacher Scheduling
          </h2>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-4 text-xs">
        {/* Selectors remain same... */}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-x-auto shadow-sm">
        <table className="w-full border-collapse border border-slate-800 text-xs text-center">
          {/* ... Table Headers ... */}
          <tbody>
            {timeSlots.map((time) => (
              <tr key={time} className="hover:bg-slate-800/30">
                <td className="border border-slate-800 p-2 text-left font-mono text-[11px] text-slate-400 font-semibold">
                  {time}
                </td>
                {days.map((day) => {
                  const period = classSchedule.find((t) => t.day === day && t.startTime === time);
                  const sub = subjects.find((s) => s.id === period?.subjectId);
                  const tch = teachers.find((t) => t.id === period?.teacherId);

                  return (
                    <td key={day} className="border border-slate-800 p-2.5">
                      <button
                        onClick={() => setEditingSlot(period || { 
                          id: Math.random().toString(36), 
                          className: selectedClass, 
                          stream: selectedStream, 
                          day, 
                          startTime: time, 
                          subjectId: '', 
                          teacherId: '' 
                        })}
                        className="w-full text-left p-2 rounded-xl bg-slate-950 border border-blue-900/60 space-y-1 hover:border-blue-500 transition-all"
                      >
                        {period ? (
                          <>
                            <span className="font-bold text-amber-300 block">{sub?.code || 'SUBJECT'}</span>
                            <span className="text-[10px] text-slate-300 block font-semibold">{sub?.name}</span>
                            <span className="text-[9px] text-slate-400 block italic">Tr. {tch ? `${tch.firstName[0]}. ${tch.lastName}` : 'Teacher'}</span>
                          </>
                        ) : (
                          <span className="text-slate-600 text-[10px] italic">Click to Assign</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingSlot && (
        <TimetableEditModal slot={editingSlot} onClose={() => setEditingSlot(null)} onSave={handleSaveSlot} />
      )}
    </div>
  );
};

const TimetableEditModal: React.FC<{ slot: TimetableSlot, onClose: () => void, onSave: (s: TimetableSlot) => void }> = ({ slot, onClose, onSave }) => {
  const [formData, setFormData] = useState(slot);
  const subjects = db.getSubjects();
  const teachers = db.getTeachers();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm space-y-4">
        <h3 className="text-white font-bold text-sm">Assign Subject/Teacher</h3>
        
        <div>
          <label className="block text-slate-400 text-xs mb-1">Subject</label>
          <select value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})} className="w-full bg-slate-950 p-2 rounded-lg text-white">
            <option value="">Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1">Teacher</label>
          <select value={formData.teacherId} onChange={e => setFormData({...formData, teacherId: e.target.value})} className="w-full bg-slate-950 p-2 rounded-lg text-white">
            <option value="">Select Teacher</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-slate-800 py-2 rounded-lg text-xs text-white">Cancel</button>
          <button onClick={() => onSave(formData)} className="flex-1 bg-blue-600 py-2 rounded-lg text-xs text-white flex items-center justify-center gap-1">
            <Save className="w-3 h-3" /> Save
          </button>
        </div>
      </div>
    </div>
  );
};
