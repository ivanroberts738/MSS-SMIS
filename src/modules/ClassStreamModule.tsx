import React, { useState, useEffect } from 'react';
import { db as firestoreDb } from '../lib/firebase';
import { db } from '../services/db';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ClassStream, Student, Teacher } from '../types';
import {
  Building2,
  Plus,
  Users,
  UserCheck,
  Edit,
  Trash2,
  X,
  ArrowRightLeft,
  Layers,
  RefreshCw,
  BookOpen,
} from 'lucide-react';

export const ClassStreamModule: React.FC = () => {
  const { currentUser, activeRole, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const [classesList, setClassesList] = useState<ClassStream[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingPreset, setIsLoadingPreset] = useState(false);

  const handleLoadClassesPreset = async () => {
    if (confirm('Load standard Ugandan O-Level (S.1–S.4 Streams) and A-Level (S.5–S.6 Combinations) classes?')) {
      setIsLoadingPreset(true);
      try {
        await db.loadStandardClassesPreset(currentUser?.fullName || 'System Administrator', activeRole);
        showToast('Standard Ugandan O-Level & A-Level classes loaded successfully!', 'success');
      } catch (err) {
        console.error('Error loading classes preset:', err);
        showToast('Failed to load class presets', 'error');
      } finally {
        setIsLoadingPreset(false);
      }
    }
  };

  useEffect(() => {
    const unsubClasses = onSnapshot(query(collection(firestoreDb, 'classes')), (snapshot) => {
        setClassesList(snapshot.docs.map(doc => ({ ...doc.data() as ClassStream, id: doc.id })));
    });
    const unsubTeachers = onSnapshot(query(collection(firestoreDb, 'teachers')), (snapshot) => {
        setTeachers(snapshot.docs.map(doc => ({ ...doc.data() as Teacher, id: doc.id })));
    });
    const unsubStudents = onSnapshot(query(collection(firestoreDb, 'students')), (snapshot) => {
        setStudents(snapshot.docs.map(doc => ({ ...doc.data() as Student, id: doc.id })));
    });
    return () => { unsubClasses(); unsubTeachers(); unsubStudents(); };
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassStream | null>(null);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceClass, setTransferSourceClass] = useState('S.1');
  const [transferSourceStream, setTransferSourceStream] = useState('North');
  const [transferTargetClass, setTransferTargetClass] = useState('S.1');
  const [transferTargetStream, setTransferTargetStream] = useState('South');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<ClassStream>>({
    className: 'S.1',
    streamName: 'North',
    level: 'O-Level',
    capacity: 60,
    academicYear: '2026',
    classTeacherId: '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.className || !formData.streamName) return;

    const classToSave: ClassStream = {
      id: editingClass ? editingClass.id : `c-${Date.now()}`,
      className: formData.className!,
      streamName: formData.streamName!,
      level:
        formData.className!.startsWith('S.5') || formData.className!.startsWith('S.6')
          ? 'A-Level'
          : 'O-Level',
      capacity: formData.capacity || 60,
      academicYear: '2026',
      classTeacherId: formData.classTeacherId,
      status: (formData as any).status || 'Active',
    } as any;

    try {
        await setDoc(doc(firestoreDb, 'classes', classToSave.id), classToSave);
        showToast(`Saved stream ${classToSave.className} ${classToSave.streamName}`, 'success');
        setShowModal(false);
    } catch (e) {
        console.error('Error saving class:', e);
        showToast('Failed to save class', 'error');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
        await updateDoc(doc(firestoreDb, 'classes', id), {
            status: currentStatus === 'Inactive' ? 'Active' : 'Inactive'
        });
        showToast('Class stream status toggled.', 'info');
    } catch (e) {
        console.error('Error toggling status:', e);
        showToast('Failed to toggle status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this class stream? Historical student assignments will remain intact.')) {
        try {
            await deleteDoc(doc(firestoreDb, 'classes', id));
            showToast('Class stream deleted.', 'info');
        } catch (e) {
            console.error('Error deleting class:', e);
            showToast('Failed to delete class', 'error');
        }
    }
  };

  // Student transfer action
  const handleExecuteTransfer = async () => {
    if (selectedStudentIds.length === 0) {
      showToast('Please select at least one student to transfer.', 'alert');
      return;
    }

    try {
        const batch = writeBatch(firestoreDb);
        const targetLevel = (transferTargetClass.startsWith('S.5') || transferTargetClass.startsWith('S.6') ? 'A-Level' : 'O-Level');
        
        selectedStudentIds.forEach(id => {
            const studentRef = doc(firestoreDb, 'students', id);
            batch.update(studentRef, {
                currentClass: transferTargetClass,
                stream: transferTargetStream,
                level: targetLevel
            });
        });
        
        await batch.commit();
        showToast(
            `Successfully transferred ${selectedStudentIds.length} students to ${transferTargetClass} ${transferTargetStream}!`,
            'success'
        );
        setShowTransferModal(false);
        setSelectedStudentIds([]);
    } catch (e) {
        console.error('Error transferring students:', e);
        showToast('Failed to transfer students', 'error');
    }
  };

  // Filter students in source stream
  const sourceStudents = students.filter(
    (s) => s.currentClass === transferSourceClass && s.stream === transferSourceStream && s.status === 'Active'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <Building2 className="w-5 h-5 text-blue-400" />
            Class & Stream Management Engine
          </h2>
          <p className="text-xs text-slate-400">
            Masaba Secondary School • O-Level (S.1–S.4 Streams) & A-Level (S.5–S.6 Combinations)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('Students', 'edit') && (
            <>
              <button
                onClick={handleLoadClassesPreset}
                disabled={isLoadingPreset}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm shrink-0 disabled:opacity-50"
                title="Populate standard Ugandan O-Level (S.1-S.4) and A-Level (S.5-S.6) streams"
              >
                {isLoadingPreset ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" /> Loading Classes...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 text-indigo-400" /> Load UNEB Classes (S.1–S.6)
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setSelectedStudentIds([]);
                  setShowTransferModal(true);
                }}
                className="flex items-center gap-2 bg-indigo-900/60 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-md shrink-0"
              >
                <ArrowRightLeft className="w-4 h-4" /> Stream Transfer Tool
              </button>

              <button
                onClick={() => {
                  setEditingClass(null);
                  setFormData({
                    className: 'S.1',
                    streamName: 'North',
                    capacity: 60,
                    academicYear: '2026',
                    status: 'Active' as any,
                  });
                  setShowModal(true);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Stream
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Configured Streams</span>
            <h3 className="text-xl font-black text-white font-mono mt-0.5">{classesList.length}</h3>
          </div>
          <Building2 className="w-8 h-8 text-blue-400/50" />
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Total Enrolled Students</span>
            <h3 className="text-xl font-black text-amber-300 font-mono mt-0.5">
              {students.filter((s) => s.status === 'Active').length}
            </h3>
          </div>
          <Users className="w-8 h-8 text-amber-400/50" />
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">O-Level / A-Level Ratio</span>
            <h3 className="text-base font-black text-emerald-400 font-mono mt-0.5">
              {students.filter((s) => s.level === 'O-Level' && s.status === 'Active').length} (O) :{' '}
              {students.filter((s) => s.level === 'A-Level' && s.status === 'Active').length} (A)
            </h3>
          </div>
          <Layers className="w-8 h-8 text-emerald-400/50" />
        </div>
      </div>

      {/* Grid of Classes */}
      {classesList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-900/30 border border-blue-700/50 rounded-2xl flex items-center justify-center mx-auto text-blue-400">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white font-serif">No Class Streams Configured Yet</h3>
            <p className="text-xs text-slate-400">
              Start by populating the standard Ugandan UNEB classes (S.1–S.4 O-Level streams & S.5–S.6 A-Level) or add custom streams manually.
            </p>
          </div>
          {hasPermission('Students', 'edit') && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleLoadClassesPreset}
                disabled={isLoadingPreset}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50"
              >
                {isLoadingPreset ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-white animate-spin" /> Loading Standard Classes...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 text-white" /> Load Standard UNEB Classes (S.1–S.6)
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setEditingClass(null);
                  setFormData({
                    className: 'S.1',
                    streamName: 'North',
                    capacity: 60,
                    academicYear: '2026',
                    status: 'Active' as any,
                  });
                  setShowModal(true);
                }}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
              >
                <Plus className="w-4 h-4 text-blue-400" /> Add Custom Stream
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classesList.map((cs) => {
          const streamStudents = students.filter(
            (s) => s.currentClass === cs.className && s.stream === cs.streamName && s.status === 'Active'
          );
          const classTeacher = teachers.find((t) => t.id === cs.classTeacherId);
          const isFull = streamStudents.length >= (cs.capacity || 60);

          return (
            <div
              key={cs.id}
              className={`border rounded-2xl p-5 shadow-sm space-y-4 transition-all ${
                (cs as any).status === 'Inactive'
                  ? 'bg-slate-950/40 border-slate-800 opacity-60'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black font-serif text-white tracking-wide">
                      {cs.className} {cs.streamName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        cs.level === 'A-Level'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {cs.level}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Academic Year: {cs.academicYear}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      (cs as any).status === 'Inactive'
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {(cs as any).status || 'Active'}
                  </span>
                </div>
              </div>

              {/* Progress & Capacity Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Class Enrollment</span>
                  <span className={isFull ? 'text-rose-400 font-mono' : 'text-slate-200 font-mono'}>
                    {streamStudents.length} / {cs.capacity || 60} Students
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isFull ? 'bg-rose-500' : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (streamStudents.length / (cs.capacity || 60)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Class Teacher Box */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Class Teacher</p>
                    <p className="font-bold text-white">
                      {classTeacher ? `${classTeacher.firstName} ${classTeacher.lastName}` : 'Unassigned'}
                    </p>
                  </div>
                </div>
                {classTeacher && (
                  <span className="text-[10px] text-slate-400 font-mono">{classTeacher.phone}</span>
                )}
              </div>

              {/* Action Buttons */}
              {hasPermission('Students', 'edit') && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingClass(cs);
                        setFormData({
                          className: cs.className,
                          streamName: cs.streamName,
                          level: cs.level,
                          capacity: cs.capacity || 60,
                          academicYear: cs.academicYear,
                          classTeacherId: cs.classTeacherId,
                          status: (cs as any).status || 'Active',
                        } as any);
                        setShowModal(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5 text-blue-400" /> Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(cs.id, (cs as any).status)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                    >
                      {(cs as any).status === 'Inactive' ? 'Activate' : 'Deactivate'}
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(cs.id)}
                    className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40"
                    title="Delete Stream"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}

      {/* Add / Edit Stream Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-auto">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base font-serif flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                {editingClass ? 'Edit Class Stream' : 'Add New Class Stream'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs text-white">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Class Level *</label>
                <select
                  value={formData.className}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                >
                  <option value="S.1">S.1 (Senior One - O-Level)</option>
                  <option value="S.2">S.2 (Senior Two - O-Level)</option>
                  <option value="S.3">S.3 (Senior Three - O-Level)</option>
                  <option value="S.4">S.4 (Senior Four - O-Level Candidate)</option>
                  <option value="S.5">S.5 (Senior Five - A-Level)</option>
                  <option value="S.6">S.6 (Senior Six - A-Level Candidate)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Stream / Arm Identifier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North, South, East, Stream A, Stream X"
                  value={formData.streamName}
                  onChange={(e) => setFormData({ ...formData, streamName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Stream Capacity (Seats)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Status</label>
                  <select
                    value={(formData as any).status || 'Active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Assigned Class Teacher</label>
                <select
                  value={formData.classTeacherId}
                  onChange={(e) => setFormData({ ...formData, classTeacherId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="">-- Select Class Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} ({t.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-xl text-xs shadow-md"
                >
                  Save Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Stream Transfer Tool Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base font-serif flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                  Student Stream Transfer & Promotion Engine
                </h3>
                <p className="text-xs text-slate-400">
                  Relocate individual students or promote full classes between streams safely.
                </p>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-white overflow-y-auto">
              {/* Source and Destination Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
                {/* Source */}
                <div className="space-y-3">
                  <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[10px]">
                    1. Source Stream
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block text-[10px] mb-1">Class</label>
                      <select
                        value={transferSourceClass}
                        onChange={(e) => {
                          setTransferSourceClass(e.target.value);
                          setSelectedStudentIds([]);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
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
                      <label className="text-slate-400 block text-[10px] mb-1">Stream</label>
                      <select
                        value={transferSourceStream}
                        onChange={(e) => {
                          setTransferSourceStream(e.target.value);
                          setSelectedStudentIds([]);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      >
                        <option value="North">North</option>
                        <option value="South">South</option>
                        <option value="East">East</option>
                        <option value="A">Stream A</option>
                        <option value="X">Stream X</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Available Students: <strong className="text-white">{sourceStudents.length}</strong>
                  </p>
                </div>

                {/* Target */}
                <div className="space-y-3">
                  <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">
                    2. Destination Stream
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block text-[10px] mb-1">Target Class</label>
                      <select
                        value={transferTargetClass}
                        onChange={(e) => setTransferTargetClass(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
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
                      <label className="text-slate-400 block text-[10px] mb-1">Target Stream</label>
                      <select
                        value={transferTargetStream}
                        onChange={(e) => setTransferTargetStream(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      >
                        <option value="North">North</option>
                        <option value="South">South</option>
                        <option value="East">East</option>
                        <option value="A">Stream A</option>
                        <option value="X">Stream X</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-emerald-400 text-[11px]">
                    Moving to: <strong>{transferTargetClass} {transferTargetStream}</strong>
                  </p>
                </div>
              </div>

              {/* Student Checklist Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white uppercase text-[10px] tracking-wider">
                    Select Students to Transfer ({selectedStudentIds.length} Selected)
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds(sourceStudents.map((s) => s.id))}
                      className="text-[11px] text-blue-400 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds([])}
                      className="text-[11px] text-slate-400 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/60 bg-slate-950/60">
                  {sourceStudents.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">
                      No active students found in {transferSourceClass} {transferSourceStream}.
                    </div>
                  ) : (
                    sourceStudents.map((std) => {
                      const isSelected = selectedStudentIds.includes(std.id);
                      return (
                        <label
                          key={std.id}
                          className="flex items-center justify-between p-3 hover:bg-slate-900/80 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudentIds([...selectedStudentIds, std.id]);
                                } else {
                                  setSelectedStudentIds(selectedStudentIds.filter((id) => id !== std.id));
                                }
                              }}
                              className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 w-4 h-4"
                            />
                            <div>
                              <strong className="text-white">
                                {std.firstName} {std.lastName}
                              </strong>
                              <span className="text-[10px] text-amber-300/80 font-mono ml-2">
                                {std.admissionNo}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400">{std.gender}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {selectedStudentIds.length} student(s) will be updated.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteTransfer}
                  disabled={selectedStudentIds.length === 0}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-xs shadow-md transition-all"
                >
                  <ArrowRightLeft className="w-4 h-4" /> Transfer Selected Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
