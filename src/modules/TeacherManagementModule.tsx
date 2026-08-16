import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { db as localDb } from '../services/db';
import { sanitizeForFirestore } from '../lib/firestoreUtils';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Teacher } from '../types';
import { UserCheck, Search, Plus, Edit, Mail, Phone, BookOpen, X, Layers, Users } from 'lucide-react';
import { TeacherAssignmentModule } from './TeacherAssignmentModule';

export const TeacherManagementModule: React.FC = () => {
  const { currentUser, activeRole, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const [activeTab, setActiveTab] = useState<'directory' | 'allocations'>('directory');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'teachers'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const teachersList = snapshot.docs.map((doc) => ({ ...(doc.data() as Teacher), id: doc.id }));
        setTeachers(teachersList);
      },
      (err) => console.warn('Teachers listener error:', err)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSubjects(localDb.getSubjects());
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const [formData, setFormData] = useState<Partial<Teacher>>({
    teacherId: `TCH/2026/${Math.floor(10 + Math.random() * 90)}`,
    firstName: '',
    lastName: '',
    gender: 'Male',
    phone: '',
    email: '',
    department: 'Mathematics',
    qualification: 'B.Sc Education',
    employmentStatus: 'Full-Time',
    dateEmployed: '2026-01-01',
    assignedSubjectIds: [],
    assignedClassStreams: [],
  });

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.teacherId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = selectedDepartment === 'All' || t.department === selectedDepartment;

    return matchesSearch && matchesDept;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      showToast('First Name and Last Name are required', 'error');
      return;
    }

    const teacherToSave: Teacher = {
      id: editingTeacher ? editingTeacher.id : `t-${Date.now()}`,
      teacherId: formData.teacherId || `TCH/2026/${Math.floor(10 + Math.random() * 90)}`,
      firstName: formData.firstName!,
      lastName: formData.lastName!,
      gender: (formData.gender as 'Male' | 'Female') || 'Male',
      phone: formData.phone || '+256 700 000000',
      email: formData.email || `${formData.firstName?.toLowerCase()}@masabasecondary.ac.ug`,
      department: formData.department || 'Sciences',
      qualification: formData.qualification || 'Degree in Education',
      employmentStatus: formData.employmentStatus || 'Full-Time',
      dateEmployed: formData.dateEmployed || '2026-01-01',
      photoUrl: formData.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${formData.firstName}`,
      assignedSubjectIds: formData.assignedSubjectIds || ['sub-112'],
      assignedClassStreams: formData.assignedClassStreams || [{ className: 'S.1', stream: 'North' }],
    };

    try {
        const sanitizedTeacher = sanitizeForFirestore(teacherToSave);
        await setDoc(doc(db, 'teachers', teacherToSave.id), sanitizedTeacher);
        try {
          localDb.saveTeacher(teacherToSave);
        } catch (err) {
          console.warn('Local db save teacher:', err);
        }
        showToast(`Saved teacher ${teacherToSave.firstName} ${teacherToSave.lastName}`, 'success');
        setShowModal(false);
    } catch (e: any) {
        console.error('Error saving teacher:', e);
        showToast(`Failed to save teacher: ${e?.message || 'Check connection'}`, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    try {
        await deleteDoc(doc(db, 'teachers', id));
        try {
          localDb.deleteTeacher(id, currentUser.fullName, activeRole);
        } catch (err) {
          console.warn('Local db delete teacher:', err);
        }
        showToast('Teacher deleted', 'success');
    } catch (e: any) {
        console.error('Error deleting teacher:', e);
        showToast(`Failed to delete teacher: ${e?.message || 'Check connection'}`, 'error');
    }
  };

  if (activeTab === 'allocations') {
    return (
      <div className="space-y-6">
        {/* Module Sub-Header Tab Switcher */}
        <div className="flex items-center justify-between gap-4 bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('directory')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
            >
              <Users className="w-4 h-4" /> Staff Directory ({teachers.length})
            </button>
            <button
              onClick={() => setActiveTab('allocations')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-sm transition-all"
            >
              <Layers className="w-4 h-4" /> Class & Subject Allocations
            </button>
          </div>
        </div>

        <TeacherAssignmentModule />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Module Sub-Header Tab Switcher */}
      <div className="flex items-center justify-between gap-4 bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('directory')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-sm transition-all"
          >
            <Users className="w-4 h-4" /> Staff Directory ({teachers.length})
          </button>
          <button
            onClick={() => setActiveTab('allocations')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
          >
            <Layers className="w-4 h-4" /> Class & Subject Allocations
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            Teacher & Staff Administration
          </h2>
          <p className="text-xs text-slate-400">
            Masaba Secondary School • Total academic staff: <strong className="text-white">{teachers.length}</strong>
          </p>
        </div>

        {hasPermission('Teachers', 'edit') && (
          <button
            onClick={() => {
              setEditingTeacher(null);
              setFormData({
                teacherId: `TCH/2026/${Math.floor(10 + Math.random() * 90)}`,
                firstName: '',
                lastName: '',
                gender: 'Male',
                phone: '',
                email: '',
                department: 'Mathematics',
                qualification: 'B.Sc Education',
                employmentStatus: 'Full-Time',
                dateEmployed: '2026-01-01',
                assignedSubjectIds: [],
                assignedClassStreams: [],
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Teacher
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search teacher by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 cursor-pointer w-full sm:w-48"
        >
          <option value="All">All Departments</option>
          <option value="Mathematics">Mathematics</option>
          <option value="Sciences">Sciences</option>
          <option value="Humanities">Humanities</option>
          <option value="Languages">Languages</option>
          <option value="ICT">ICT</option>
        </select>
      </div>

      {/* Teachers List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher) => {
          const assignedSubjNames = subjects
            .filter((s) => teacher.assignedSubjectIds.includes(s.id))
            .map((s) => s.name);

          return (
            <div
              key={teacher.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={teacher.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${teacher.firstName}`}
                    alt={teacher.firstName}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500/60 bg-slate-800"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      {teacher.firstName} {teacher.lastName}
                    </h3>
                    <p className="text-xs text-amber-300/90 font-mono font-semibold">{teacher.teacherId}</p>
                    <span className="inline-block mt-0.5 text-[10px] bg-slate-800 text-slate-300 px-2 py-0.2 rounded border border-slate-700">
                      {teacher.department} Dept
                    </span>
                  </div>
                </div>

                {hasPermission('Teachers', 'edit') && (
                  <div className="flex gap-2">
                    <button
                        onClick={() => {
                        setEditingTeacher(teacher);
                        setFormData(teacher);
                        setShowModal(true);
                        }}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-blue-400"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(teacher.id)}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-red-400"
                    >
                        <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    Subjects: <strong className="text-white">{assignedSubjNames.join(', ') || 'General'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-300">{teacher.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate text-slate-400">{teacher.email}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>{teacher.qualification}</span>
                <span className="text-emerald-400 font-semibold">{teacher.employmentStatus}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm font-serif">
                {editingTeacher ? 'Edit Teacher Details' : 'Add New Teacher'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName || ''}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName || ''}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assigned Subjects</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto bg-slate-950 p-2 rounded-xl border border-slate-800">
                  {subjects.map((sub) => (
                    <label key={sub.id} className="flex items-center gap-2 text-slate-300">
                      <input
                        type="checkbox"
                        checked={formData.assignedSubjectIds?.includes(sub.id)}
                        onChange={(e) => {
                          const ids = formData.assignedSubjectIds || [];
                          setFormData({
                            ...formData,
                            assignedSubjectIds: e.target.checked
                              ? [...ids, sub.id]
                              : ids.filter((id) => id !== sub.id),
                          });
                        }}
                      />
                      {sub.code} - {sub.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Department</label>
                  <select
                    value={formData.department || 'Mathematics'}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Sciences">Sciences</option>
                    <option value="Humanities">Humanities</option>
                    <option value="Languages">Languages</option>
                    <option value="ICT">ICT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+256 700 000000"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-white"
                  />
                </div>


                <div>
                  <label className="block text-slate-400 mb-1">Qualification</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Sc Education (Math/Physics)"
                    value={formData.qualification || ''}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl"
                >
                  Save Teacher Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
