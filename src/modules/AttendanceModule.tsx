import React, { useState, useEffect } from 'react';
import { db as firestoreDb } from '../lib/firebase';
import { collection, onSnapshot, query, where, writeBatch, doc, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { AttendanceRecord, Student } from '../types';
import { CalendarCheck, Save, Users, AlertTriangle } from 'lucide-react';

export const AttendanceModule: React.FC = () => {
  const { currentUser, activeRole } = useAuth();
  const { showToast } = useNotification();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const unsubStudents = onSnapshot(query(collection(firestoreDb, 'students')), (snapshot) => {
        setStudents(snapshot.docs.map(doc => ({ ...doc.data() as Student, id: doc.id })));
    });
    const unsubAttendance = onSnapshot(query(collection(firestoreDb, 'attendance')), (snapshot) => {
        setAttendance(snapshot.docs.map(doc => ({ ...doc.data() as AttendanceRecord, id: doc.id })));
    });
    return () => { unsubStudents(); unsubAttendance(); };
  }, []);

  const [selectedClass, setSelectedClass] = useState('S.1');
  const [selectedStream, setSelectedStream] = useState('North');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  const classStudents = students.filter(
    (s) => s.currentClass === selectedClass && s.stream === selectedStream
  );

  const [statusMap, setStatusMap] = useState<Record<string, 'Present' | 'Absent' | 'Late' | 'Sick' | 'Authorized'>>({});

  // Sync statusMap when students, attendance or date change
  useEffect(() => {
      const map: Record<string, 'Present' | 'Absent' | 'Late' | 'Sick' | 'Authorized'> = {};
      classStudents.forEach((std) => {
        const existing = attendance.find((a) => a.studentId === std.id && a.date === attendanceDate);
        map[std.id] = existing ? existing.status : 'Present';
      });
      setStatusMap(map);
  }, [classStudents, attendance, attendanceDate]);

  const handleStatusChange = (studentId: string, status: 'Present' | 'Absent' | 'Late' | 'Sick' | 'Authorized') => {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    try {
        const batch = writeBatch(firestoreDb);
        classStudents.forEach((std) => {
            const docRef = doc(firestoreDb, 'attendance', `att-${std.id}-${attendanceDate}`);
            batch.set(docRef, {
                studentId: std.id,
                date: attendanceDate,
                className: selectedClass,
                stream: selectedStream,
                status: statusMap[std.id] || 'Present',
                recordedBy: currentUser.fullName,
            });
        });
        await batch.commit();
        showToast(`Recorded daily attendance for ${classStudents.length} students.`, 'success');
    } catch (e) {
        console.error('Error saving attendance:', e);
        showToast('Failed to save attendance', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <CalendarCheck className="w-5 h-5 text-emerald-400" />
            Daily Attendance Management
          </h2>
          <p className="text-xs text-slate-400">
            Masaba Secondary School • Roll call logging and absenteeism tracking
          </p>
        </div>

        <button
          onClick={handleSaveAttendance}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-md shrink-0"
        >
          <Save className="w-4 h-4" /> Save Roll Call
        </button>
      </div>

      {/* Class & Date Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
          >
            <option value="S.1">S.1</option>
            <option value="S.2">S.2</option>
            <option value="S.3">S.3</option>
            <option value="S.4">S.4</option>
            <option value="S.5">S.5</option>
            <option value="S.6">S.6</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Stream</label>
          <select
            value={selectedStream}
            onChange={(e) => setSelectedStream(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
          >
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="A">Stream A</option>
            <option value="X">Stream X</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Date</label>
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
          />
        </div>
      </div>

      {/* Attendance Sheet Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-sans font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Admission No</th>
                <th className="p-3.5">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-slate-500">
                    No students found in {selectedClass} {selectedStream}.
                  </td>
                </tr>
              ) : (
                classStudents.map((std) => {
                  const currentStatus = statusMap[std.id] || 'Present';
                  return (
                    <tr key={std.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white">
                        {std.firstName} {std.lastName}
                      </td>
                      <td className="p-3.5 font-mono text-amber-300/90">{std.admissionNo}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {(['Present', 'Absent', 'Late', 'Sick', 'Authorized'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStatusChange(std.id, st)}
                              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all ${
                                currentStatus === st
                                  ? st === 'Present'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : st === 'Absent'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : st === 'Late'
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
