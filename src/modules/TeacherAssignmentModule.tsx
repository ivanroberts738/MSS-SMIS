import React, { useState, useEffect } from 'react';
import { db as firestoreDb } from '../lib/firebase';
import { db } from '../services/db';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Teacher,
  TeacherAssignment,
  TeacherAssignmentRole,
  ClassStream,
  Subject,
  EducationLevel,
} from '../types';
import {
  UserCheck,
  Search,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Building2,
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Sparkles,
  Award,
  ChevronRight,
  X,
  Clock,
  Briefcase,
  Users,
  GraduationCap,
  FileSpreadsheet,
  BarChart3,
  RefreshCw,
  Phone,
  Mail,
  HelpCircle,
} from 'lucide-react';

export const TeacherAssignmentModule: React.FC = () => {
  const { currentUser, activeRole, hasPermission } = useAuth();
  const { showToast } = useNotification();

  // Firestore Real-Time States
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassStream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // UI View States
  const [activeView, setActiveView] = useState<'by-teacher' | 'by-class' | 'by-subject' | 'workload'>('by-teacher');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterStream, setFilterStream] = useState<string>('All');
  const [filterDepartment, setFilterDepartment] = useState<string>('All');
  const [filterLevel, setFilterLevel] = useState<'All' | 'O-Level' | 'A-Level'>('All');

  // Selected Class/Stream for Matrix View
  const [matrixClass, setMatrixClass] = useState<string>('S.1');
  const [matrixStream, setMatrixStream] = useState<string>('North');

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showClassTeacherModal, setShowClassTeacherModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [editingAssignment, setEditingAssignment] = useState<TeacherAssignment | null>(null);

  // Form State for Single / Multi Stream Assignment
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formClass, setFormClass] = useState('S.1');
  const [formStreams, setFormStreams] = useState<string[]>(['North']);
  const [formPeriods, setFormPeriods] = useState<number>(4);
  const [formRole, setFormRole] = useState<TeacherAssignmentRole>('Primary Subject Teacher');
  const [formAcademicYear, setFormAcademicYear] = useState('2026');
  const [formNotes, setFormNotes] = useState('');
  const [formSelectedPapers, setFormSelectedPapers] = useState<string[]>([]);

  // Class Teacher Form State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassTeacherId, setSelectedClassTeacherId] = useState('');

  // 1. Subscribe to Firestore Collections
  useEffect(() => {
    const unsubAssignments = onSnapshot(
      query(collection(firestoreDb, 'teacherAssignments')),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ ...(d.data() as TeacherAssignment), id: d.id }));
        setAssignments(list);
      },
      (err) => {
        console.warn('Teacher assignments listener notice, using local fallback:', err);
        setAssignments(db.getTeacherAssignments());
      }
    );

    const unsubTeachers = onSnapshot(
      query(collection(firestoreDb, 'teachers')),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ ...(d.data() as Teacher), id: d.id }));
        setTeachers(list);
      },
      (err) => {
        console.warn('Teachers listener notice, using local fallback:', err);
        setTeachers(db.getTeachers());
      }
    );

    const unsubClasses = onSnapshot(
      query(collection(firestoreDb, 'classes')),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ ...(d.data() as ClassStream), id: d.id }));
        setClasses(list);
      },
      (err) => {
        console.warn('Classes listener notice, using local fallback:', err);
        setClasses(db.getClasses());
      }
    );

    const unsubSubjects = onSnapshot(
      query(collection(firestoreDb, 'subjects')),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ ...(d.data() as Subject), id: d.id }));
        setSubjects(list);
      },
      (err) => {
        console.warn('Subjects listener notice, using local fallback:', err);
        setSubjects(db.getSubjects());
      }
    );

    return () => {
      unsubAssignments();
      unsubTeachers();
      unsubClasses();
      unsubSubjects();
    };
  }, []);

  // Update default selected class/stream when classes change
  useEffect(() => {
    if (classes.length > 0) {
      if (!classes.some((c) => c.className === matrixClass && c.streamName === matrixStream)) {
        setMatrixClass(classes[0].className);
        setMatrixStream(classes[0].streamName);
      }
    }
  }, [classes]);

  // Derived Values & Calculations
  const distinctClasses = Array.from(new Set(classes.map((c) => c.className))).sort();
  const distinctStreams = Array.from(new Set(classes.map((c) => c.streamName))).sort();
  const departments = ['Sciences', 'Mathematics', 'Languages', 'Humanities', 'Vocational', 'ICT'];

  // Total teaching periods assigned across all teachers
  const totalPeriods = assignments.reduce((acc, a) => acc + (a.periodsPerWeek || 4), 0);
  const activeTeachersAssignedCount = new Set(assignments.map((a) => a.teacherId)).size;
  const avgWorkload = activeTeachersAssignedCount > 0 ? Math.round(totalPeriods / activeTeachersAssignedCount) : 0;

  // Find streams with missing subjects (unassigned subjects)
  const getSubjectCountForClass = (className: string) => {
    const isALevel = className === 'S.5' || className === 'S.6';
    return subjects.filter((s) => (isALevel ? s.level === 'A-Level' : s.level === 'O-Level') && s.status !== 'Inactive').length;
  };

  // Filtered teachers list
  const filteredTeachers = teachers.filter((t) => {
    const nameMatch = `${t.firstName} ${t.lastName} ${t.teacherId}`.toLowerCase().includes(searchQuery.toLowerCase());
    const deptMatch = filterDepartment === 'All' || t.department === filterDepartment;
    const teacherAssignments = assignments.filter((a) => a.teacherId === t.id);
    const classMatch = filterClass === 'All' || teacherAssignments.some((a) => a.className === filterClass);
    const streamMatch = filterStream === 'All' || teacherAssignments.some((a) => a.stream === filterStream);
    const levelMatch =
      filterLevel === 'All' ||
      teacherAssignments.some((a) => (filterLevel === 'A-Level' ? a.className === 'S.5' || a.className === 'S.6' : a.className !== 'S.5' && a.className !== 'S.6'));

    return nameMatch && deptMatch && classMatch && streamMatch && levelMatch;
  });

  // Handle Opening Single Assign Modal
  const handleOpenAssignModal = (teacherId?: string, targetClass?: string, targetStream?: string, targetSubjectId?: string) => {
    if (teachers.length === 0) {
      showToast('Please add teachers in the Staff Directory first.', 'error');
      return;
    }
    if (subjects.length === 0) {
      showToast('Please load or create curriculum subjects first.', 'error');
      return;
    }

    setEditingAssignment(null);
    setFormTeacherId(teacherId || teachers[0]?.id || '');
    setFormClass(targetClass || distinctClasses[0] || 'S.1');
    setFormStreams(targetStream ? [targetStream] : ['North']);
    setFormSubjectId(targetSubjectId || subjects[0]?.id || '');
    setFormPeriods(4);
    setFormRole('Primary Subject Teacher');
    setFormAcademicYear('2026');
    setFormNotes('');
    setFormSelectedPapers([]);
    setShowAssignModal(true);
  };

  // Handle Editing an existing assignment
  const handleEditAssignment = (assignment: TeacherAssignment) => {
    setEditingAssignment(assignment);
    setFormTeacherId(assignment.teacherId);
    setFormClass(assignment.className);
    setFormStreams([assignment.stream]);
    setFormSubjectId(assignment.subjectId);
    setFormPeriods(assignment.periodsPerWeek || 4);
    setFormRole(assignment.role || 'Primary Subject Teacher');
    setFormAcademicYear(assignment.academicYear || '2026');
    setFormNotes(assignment.notes || '');
    setFormSelectedPapers(assignment.paperCodes || []);
    setShowAssignModal(true);
  };

  // Handle Save Assignment
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t) => t.id === formTeacherId);
    const subject = subjects.find((s) => s.id === formSubjectId);

    if (!teacher || !subject) {
      showToast('Please select a valid teacher and subject.', 'error');
      return;
    }

    if (formStreams.length === 0) {
      showToast('Please select at least one stream.', 'error');
      return;
    }

    const isALevel = formClass === 'S.5' || formClass === 'S.6';
    const level: EducationLevel = isALevel ? 'A-Level' : 'O-Level';

    try {
      if (editingAssignment) {
        // Updating single existing assignment
        const updated: TeacherAssignment = {
          ...editingAssignment,
          teacherId: teacher.id,
          teacherName: `${teacher.firstName} ${teacher.lastName}`,
          teacherCode: teacher.teacherId,
          subjectId: subject.id,
          subjectCode: subject.code,
          subjectName: subject.name,
          className: formClass,
          stream: formStreams[0],
          level,
          paperCodes: formSelectedPapers.length > 0 ? formSelectedPapers : undefined,
          periodsPerWeek: formPeriods,
          role: formRole,
          academicYear: formAcademicYear,
          notes: formNotes,
        };

        db.saveTeacherAssignment(updated, currentUser?.fullName || 'Administrator', activeRole);
        showToast(`Updated assignment for ${teacher.firstName} ${teacher.lastName}`, 'success');
      } else {
        // Creating assignment for 1 or more streams
        const newAssignments: TeacherAssignment[] = formStreams.map((streamName, idx) => ({
          id: `asgn-${Date.now()}-${idx}`,
          teacherId: teacher.id,
          teacherName: `${teacher.firstName} ${teacher.lastName}`,
          teacherCode: teacher.teacherId,
          subjectId: subject.id,
          subjectCode: subject.code,
          subjectName: subject.name,
          className: formClass,
          stream: streamName,
          level,
          paperCodes: formSelectedPapers.length > 0 ? formSelectedPapers : undefined,
          periodsPerWeek: formPeriods,
          role: formRole,
          academicYear: formAcademicYear,
          assignedDate: new Date().toISOString().split('T')[0],
          notes: formNotes,
        }));

        if (newAssignments.length === 1) {
          db.saveTeacherAssignment(newAssignments[0], currentUser?.fullName || 'Administrator', activeRole);
        } else {
          await db.saveTeacherAssignmentsBulk(newAssignments, currentUser?.fullName || 'Administrator', activeRole);
        }
        showToast(
          `Assigned ${teacher.firstName} ${teacher.lastName} to ${subject.code} (${formClass} ${formStreams.join(', ')})`,
          'success'
        );
      }

      setShowAssignModal(false);
    } catch (err: any) {
      console.error('Error saving assignment:', err);
      showToast(`Failed to save assignment: ${err?.message || 'Check database'}`, 'error');
    }
  };

  // Handle Delete Assignment
  const handleDeleteAssignment = (assignment: TeacherAssignment) => {
    if (
      confirm(
        `Remove ${assignment.teacherName} from teaching ${assignment.subjectCode} (${assignment.className} ${assignment.stream})?`
      )
    ) {
      db.deleteTeacherAssignment(assignment.id, currentUser?.fullName || 'Administrator', activeRole);
      showToast('Assignment removed', 'success');
    }
  };

  // Handle Class Teacher Assignment
  const handleSaveClassTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      showToast('Please select a class stream.', 'error');
      return;
    }
    db.assignClassTeacher(selectedClassId, selectedClassTeacherId, currentUser?.fullName || 'Administrator', activeRole);
    showToast('Class Teacher designation updated!', 'success');
    setShowClassTeacherModal(false);
  };

  // Current Selected Matrix Class Stream Object
  const currentMatrixClassObj = classes.find(
    (c) => c.className === matrixClass && c.streamName === matrixStream
  );
  const matrixClassTeacher = teachers.find((t) => t.id === currentMatrixClassObj?.classTeacherId);

  // Relevant subjects for the current matrix class
  const isMatrixALevel = matrixClass === 'S.5' || matrixClass === 'S.6';
  const matrixSubjects = subjects.filter(
    (s) => (isMatrixALevel ? s.level === 'A-Level' : s.level === 'O-Level') && s.status !== 'Inactive'
  );

  return (
    <div className="space-y-6">
      {/* Header & Stats Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white font-serif tracking-tight">
                  Teacher Class & Subject Allocations
                </h1>
                <p className="text-xs text-slate-400">
                  Assign academic teaching staff to specific classes, streams, and curriculum subjects with workload tracking.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-sm"
              title="Print official UNEB Master Teaching Allocation Timetable"
            >
              <Printer className="w-4 h-4 text-emerald-400" /> Print Allocation Sheet
            </button>

            {hasPermission('Teachers', 'edit') && (
              <>
                <button
                  onClick={() => {
                    if (classes.length === 0) {
                      showToast('Please configure Class Streams first.', 'error');
                      return;
                    }
                    setSelectedClassId(classes[0]?.id || '');
                    setSelectedClassTeacherId(classes[0]?.classTeacherId || '');
                    setShowClassTeacherModal(true);
                  }}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-sm"
                >
                  <Award className="w-4 h-4 text-amber-400" /> Assign Form Masters
                </button>

                <button
                  onClick={() => handleOpenAssignModal()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" /> New Teacher Allocation
                </button>
              </>
            )}
          </div>
        </div>

        {/* High-Level Allocation Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-800/80 mt-6">
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total Allocations</span>
              <BookOpen className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{assignments.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active teaching assignments</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Allocated Teachers</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {activeTeachersAssignedCount} <span className="text-xs text-slate-400 font-normal">/ {teachers.length}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {teachers.length > 0 ? Math.round((activeTeachersAssignedCount / teachers.length) * 100) : 0}% of staff engaged
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total Lesson Periods</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400 font-mono">{totalPeriods}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Periods / week across timetable</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Average Workload</span>
              <BarChart3 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 font-mono">
              {avgWorkload} <span className="text-xs text-slate-400 font-normal">periods/wk</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Target: 16–22 periods/teacher</div>
          </div>
        </div>
      </div>

      {/* Navigation View Modes */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveView('by-teacher')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'by-teacher'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" /> By Teacher ({teachers.length})
          </button>
          <button
            onClick={() => setActiveView('by-class')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'by-class'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" /> Class & Stream Matrix
          </button>
          <button
            onClick={() => setActiveView('by-subject')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'by-subject'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" /> By Curriculum Subject
          </button>
          <button
            onClick={() => setActiveView('workload')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'workload'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Workload & Audit
          </button>
        </div>

        {/* Quick Filter Pill Controls for By-Teacher & By-Subject Views */}
        {(activeView === 'by-teacher' || activeView === 'by-subject') && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search teacher, code, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48 sm:w-60"
              />
            </div>

            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Classes</option>
              {distinctClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ===================== VIEW 1: BY TEACHER ALLOCATION CARDS ===================== */}
      {activeView === 'by-teacher' && (
        <div className="space-y-4">
          {teachers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <UserCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Teachers Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Add teachers in the Staff Directory to start allocating them to classes and subjects.
              </p>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
              No teachers match your active filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTeachers.map((teacher) => {
                const teacherAssignments = assignments.filter((a) => a.teacherId === teacher.id);
                const teacherPeriods = teacherAssignments.reduce((acc, a) => acc + (a.periodsPerWeek || 4), 0);

                // Check if teacher is a class teacher
                const classTeacherAssignment = classes.find((c) => c.classTeacherId === teacher.id);

                return (
                  <div
                    key={teacher.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all space-y-4"
                  >
                    {/* Teacher Profile Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-bold text-base uppercase shrink-0 overflow-hidden">
                          {teacher.photoUrl ? (
                            <img
                              src={teacher.photoUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            `${teacher.firstName[0]}${teacher.lastName[0]}`
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white font-serif">
                              {teacher.firstName} {teacher.lastName}
                            </h3>
                            <span className="text-[10px] font-mono bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700">
                              {teacher.teacherId}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {teacher.department} Department •{' '}
                            <span className="text-slate-300 font-medium">{teacher.qualification}</span>
                          </p>
                        </div>
                      </div>

                      {/* Workload Indicator Badge */}
                      <div className="text-right shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                            teacherPeriods > 24
                              ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                              : teacherPeriods >= 12
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              : teacherPeriods > 0
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <Clock className="w-3 h-3" /> {teacherPeriods} Periods/wk
                        </span>
                        {classTeacherAssignment && (
                          <div className="mt-1">
                            <span className="text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full inline-block">
                              ★ Form Master: {classTeacherAssignment.className} {classTeacherAssignment.streamName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assigned Classes & Subjects Grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Assigned Classes & Subjects ({teacherAssignments.length})</span>
                        {hasPermission('Teachers', 'edit') && (
                          <button
                            onClick={() => handleOpenAssignModal(teacher.id)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Assign Subject
                          </button>
                        )}
                      </div>

                      {teacherAssignments.length === 0 ? (
                        <div className="p-3 bg-slate-950/50 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                          No classes or subjects assigned yet. Click "Assign Subject" above.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {teacherAssignments.map((asgn) => (
                            <div
                              key={asgn.id}
                              className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex items-start justify-between gap-2 group"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-blue-400 text-xs">
                                    {asgn.className} {asgn.stream}
                                  </span>
                                  <span className="text-[10px] font-bold bg-amber-950/70 text-amber-300 px-1.5 py-0.2 rounded font-mono border border-amber-900/50">
                                    {asgn.subjectCode}
                                  </span>
                                </div>
                                <div className="text-[11px] font-medium text-slate-300 line-clamp-1">
                                  {asgn.subjectName}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                  <span>{asgn.periodsPerWeek || 4} periods</span>
                                  <span>•</span>
                                  <span className="text-slate-400">{asgn.role}</span>
                                </div>
                              </div>

                              {hasPermission('Teachers', 'edit') && (
                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEditAssignment(asgn)}
                                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                                    title="Edit assignment"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAssignment(asgn)}
                                    className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                                    title="Remove assignment"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Teacher Quick Contact Footer */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {teacher.phone || 'No phone'}
                        </span>
                        <span className="hidden sm:flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {teacher.email || 'No email'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded">
                        {teacher.employmentStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== VIEW 2: CLASS & STREAM MATRIX VIEW ===================== */}
      {activeView === 'by-class' && (
        <div className="space-y-4">
          {/* Class & Stream Selector Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white font-serif">Select Class Stream Matrix</h3>
                <p className="text-xs text-slate-400">
                  Inspect subject teacher coverage for a specific stream. Identify unassigned subjects and appoint teachers.
                </p>
              </div>

              {/* Class Buttons S.1 .. S.6 */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {['S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6'].map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setMatrixClass(cls)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      matrixClass === cls
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Stream Selector Sub-bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Streams for {matrixClass}:</span>
              {classes
                .filter((c) => c.className === matrixClass)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setMatrixStream(c.streamName)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      matrixStream === c.streamName
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {c.streamName} Stream
                  </button>
                ))}

              {classes.filter((c) => c.className === matrixClass).length === 0 && (
                <span className="text-xs text-amber-400">
                  No streams configured for {matrixClass}. Visit "Classes & Streams" to populate standard streams.
                </span>
              )}
            </div>
          </div>

          {/* Form Master & Stream Summary Card */}
          <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg font-serif">
                {matrixClass}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    {matrixClass} {matrixStream} Academic Roster
                  </h2>
                  <span className="text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full">
                    {isMatrixALevel ? 'UACE A-Level' : 'UCE O-Level'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Class Teacher (Form Master):{' '}
                  <strong className="text-amber-300">
                    {matrixClassTeacher
                      ? `${matrixClassTeacher.firstName} ${matrixClassTeacher.lastName} (${matrixClassTeacher.teacherId})`
                      : 'None Assigned'}
                  </strong>
                </p>
              </div>
            </div>

            {hasPermission('Teachers', 'edit') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const currentCls = classes.find(
                      (c) => c.className === matrixClass && c.streamName === matrixStream
                    );
                    if (currentCls) {
                      setSelectedClassId(currentCls.id);
                      setSelectedClassTeacherId(currentCls.classTeacherId || '');
                      setShowClassTeacherModal(true);
                    }
                  }}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" /> Change Form Master
                </button>
                <button
                  onClick={() => handleOpenAssignModal(undefined, matrixClass, matrixStream)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Assign Subject Teacher
                </button>
              </div>
            )}
          </div>

          {/* Subjects Table for Selected Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Curriculum Subjects ({matrixSubjects.length}) & Teaching Staff
              </span>
              <span className="text-xs text-slate-400">
                Showing {isMatrixALevel ? 'A-Level' : 'O-Level'} Subjects
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Subject Code</th>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Department / Cat</th>
                    <th className="py-3 px-4">Assigned Teacher</th>
                    <th className="py-3 px-4">Periods / Wk</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {matrixSubjects.map((sub) => {
                    const streamAssignments = assignments.filter(
                      (a) =>
                        a.className === matrixClass &&
                        a.stream === matrixStream &&
                        (a.subjectId === sub.id || a.subjectCode === sub.code)
                    );
                    const isAssigned = streamAssignments.length > 0;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-300">{sub.code}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-xs">{sub.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {sub.papers?.length || 1} Paper(s)
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <span>{sub.department}</span>
                          <span className="text-[10px] text-slate-400 block">{sub.category}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          {isAssigned ? (
                            <div className="space-y-1">
                              {streamAssignments.map((asgn) => (
                                <div key={asgn.id} className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-blue-900/50 border border-blue-700/50 flex items-center justify-center text-blue-300 text-[10px] font-bold">
                                    {asgn.teacherName?.[0] || 'T'}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-slate-200 block">
                                      {asgn.teacherName}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{asgn.role}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" /> No Teacher Assigned
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {isAssigned
                            ? streamAssignments.reduce((acc, a) => acc + (a.periodsPerWeek || 4), 0)
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          {isAssigned ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Covered
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                              Vacant
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {hasPermission('Teachers', 'edit') && (
                            <div className="flex items-center justify-end gap-1.5">
                              {isAssigned ? (
                                streamAssignments.map((asgn) => (
                                  <div key={asgn.id} className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleEditAssignment(asgn)}
                                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-blue-400"
                                      title="Edit Assignment"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAssignment(asgn)}
                                      className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400"
                                      title="Unassign Teacher"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <button
                                  onClick={() =>
                                    handleOpenAssignModal(undefined, matrixClass, matrixStream, sub.id)
                                  }
                                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                                >
                                  <Plus className="w-3 h-3" /> Assign
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== VIEW 3: BY CURRICULUM SUBJECT ===================== */}
      {activeView === 'by-subject' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects
              .filter((s) => s.status !== 'Inactive')
              .map((sub) => {
                const subAssignments = assignments.filter(
                  (a) => a.subjectId === sub.id || a.subjectCode === sub.code
                );
                const assignedTeachers = Array.from(
                  new Set(subAssignments.map((a) => a.teacherName))
                );

                return (
                  <div
                    key={sub.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-300 text-base">{sub.code}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sub.level === 'A-Level'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}
                        >
                          {sub.level}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                        {subAssignments.length} Stream(s)
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-sm">{sub.name}</h4>
                      <p className="text-xs text-slate-400">
                        {sub.department} Department • {sub.category}
                      </p>
                    </div>

                    {/* Assigned Streams Matrix */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Teaching Staff by Stream:
                      </span>
                      {subAssignments.length === 0 ? (
                        <span className="text-rose-400 text-xs italic">
                          No teachers assigned to any stream for this subject yet.
                        </span>
                      ) : (
                        <div className="space-y-1">
                          {subAssignments.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between text-[11px] text-slate-300"
                            >
                              <span className="font-bold text-blue-400">
                                {a.className} {a.stream}
                              </span>
                              <span className="text-slate-200">{a.teacherName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {hasPermission('Teachers', 'edit') && (
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-end">
                        <button
                          onClick={() => handleOpenAssignModal(undefined, undefined, undefined, sub.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Stream Assignment
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ===================== VIEW 4: WORKLOAD & AUDIT SUMMARY ===================== */}
      {activeView === 'workload' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workload Distribution Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" /> Teaching Load Distribution
              </h3>
              <div className="space-y-3 text-xs">
                {teachers.map((t) => {
                  const tAssignments = assignments.filter((a) => a.teacherId === t.id);
                  const periods = tAssignments.reduce((acc, a) => acc + (a.periodsPerWeek || 4), 0);
                  const percentage = Math.min(100, (periods / 30) * 100);

                  return (
                    <div key={t.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">
                          {t.firstName} {t.lastName} ({t.department})
                        </span>
                        <span
                          className={`font-bold font-mono ${
                            periods > 24
                              ? 'text-rose-400'
                              : periods >= 12
                              ? 'text-emerald-400'
                              : periods > 0
                              ? 'text-amber-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {periods} periods/wk
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            periods > 24
                              ? 'bg-rose-500'
                              : periods >= 12
                              ? 'bg-emerald-500'
                              : periods > 0
                              ? 'bg-amber-500'
                              : 'bg-slate-800'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Master Designation Audit */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" /> Class Teacher (Form Master) Allocation Roster
              </h3>
              <div className="divide-y divide-slate-800/80 text-xs">
                {classes.map((cls) => {
                  const formMaster = teachers.find((t) => t.id === cls.classTeacherId);
                  return (
                    <div key={cls.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-blue-400">
                          {cls.className} {cls.streamName}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{cls.level} Stream</span>
                      </div>
                      <div className="text-right">
                        {formMaster ? (
                          <div>
                            <span className="font-semibold text-emerald-300">
                              {formMaster.firstName} {formMaster.lastName}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {formMaster.teacherId}
                            </span>
                          </div>
                        ) : (
                          <span className="text-rose-400 italic">No Form Master</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: ASSIGN TEACHER TO CLASS & SUBJECT ===================== */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-serif flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                {editingAssignment ? 'Edit Teaching Allocation' : 'New Teacher Class & Subject Allocation'}
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-6 space-y-4 text-xs">
              {/* Teacher Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Select Academic Teacher *</label>
                <select
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} — {t.department} Dept ({t.teacherId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Level Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Class *</label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
                  >
                    {['S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6'].map((cls) => (
                      <option key={cls} value={cls}>
                        {cls} ({cls === 'S.5' || cls === 'S.6' ? 'A-Level' : 'O-Level'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Lesson Periods / Wk</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formPeriods}
                    onChange={(e) => setFormPeriods(parseInt(e.target.value) || 4)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Multi-Stream Checkboxes */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 flex items-center justify-between">
                  <span>Stream(s) for {formClass} *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Select one or multiple</span>
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap gap-2">
                  {classes
                    .filter((c) => c.className === formClass)
                    .map((c) => {
                      const isSelected = formStreams.includes(c.streamName);
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => {
                            if (editingAssignment) {
                              setFormStreams([c.streamName]);
                            } else {
                              if (isSelected) {
                                if (formStreams.length > 1) {
                                  setFormStreams(formStreams.filter((s) => s !== c.streamName));
                                }
                              } else {
                                setFormStreams([...formStreams, c.streamName]);
                              }
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {c.streamName}
                        </button>
                      );
                    })}

                  {classes.filter((c) => c.className === formClass).length === 0 && (
                    <span className="text-xs text-slate-500 italic">
                      No streams registered yet for {formClass}. Using default "North".
                    </span>
                  )}
                </div>
              </div>

              {/* Subject Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Curriculum Subject *</label>
                <select
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  {subjects
                    .filter((s) => {
                      const isALevel = formClass === 'S.5' || formClass === 'S.6';
                      return isALevel ? s.level === 'A-Level' : s.level === 'O-Level';
                    })
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name} ({s.department})
                      </option>
                    ))}
                </select>
              </div>

              {/* Role & Academic Year */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Teaching Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as TeacherAssignmentRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Primary Subject Teacher">Primary Subject Teacher</option>
                    <option value="Assistant Teacher">Assistant Teacher</option>
                    <option value="Relief Teacher">Relief Teacher</option>
                    <option value="Subject Lead">Subject Lead</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Academic Year</label>
                  <input
                    type="text"
                    value={formAcademicYear}
                    onChange={(e) => setFormAcademicYear(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {editingAssignment ? 'Update Allocation' : 'Save Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: ASSIGN FORM MASTER / CLASS TEACHER ===================== */}
      {showClassTeacherModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-serif flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Assign Class Teacher (Form Master)
              </h3>
              <button
                onClick={() => setShowClassTeacherModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClassTeacher} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Select Class Stream *</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    const target = classes.find((c) => c.id === e.target.value);
                    setSelectedClassTeacherId(target?.classTeacherId || '');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
                  required
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.className} {cls.streamName} ({cls.level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Assign Form Master / Class Teacher</label>
                <select
                  value={selectedClassTeacherId}
                  onChange={(e) => setSelectedClassTeacherId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- No Form Master Assigned --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} ({t.department} Dept)
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowClassTeacherModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md"
                >
                  Confirm Designation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: PRINT MASTER ALLOCATION TIMETABLE ===================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl p-8 shadow-2xl space-y-6 my-8">
            {/* School Header */}
            <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
              <h2 className="text-xl font-bold uppercase tracking-wide font-serif">
                MASABA SECONDARY SCHOOL
              </h2>
              <p className="text-xs text-slate-600 uppercase font-semibold tracking-wider">
                P.O. Box 102, Budadiri, Sironko District, Uganda • Tel: +256 772 123 456
              </p>
              <div className="inline-block bg-slate-900 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-widest mt-2">
                ACADEMIC STAFF TEACHING ALLOCATION SHEET • 2026
              </div>
            </div>

            {/* Summary Grid */}
            <div className="text-xs space-y-3">
              <table className="w-full border-collapse border border-slate-300 text-left">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border border-slate-300">#</th>
                    <th className="p-2 border border-slate-300">Teacher Name</th>
                    <th className="p-2 border border-slate-300">Dept</th>
                    <th className="p-2 border border-slate-300">Classes & Subjects Assigned</th>
                    <th className="p-2 border border-slate-300 text-center">Periods/Wk</th>
                    <th className="p-2 border border-slate-300">Form Master Role</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t, idx) => {
                    const tAssignments = assignments.filter((a) => a.teacherId === t.id);
                    const periods = tAssignments.reduce((acc, a) => acc + (a.periodsPerWeek || 4), 0);
                    const formMasterCls = classes.find((c) => c.classTeacherId === t.id);

                    return (
                      <tr key={t.id} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-300 font-mono">{idx + 1}</td>
                        <td className="p-2 border border-slate-300 font-bold">
                          {t.firstName} {t.lastName}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-700">{t.department}</td>
                        <td className="p-2 border border-slate-300">
                          {tAssignments.map((a) => (
                            <span
                              key={a.id}
                              className="inline-block bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-[10px] mr-1 mb-1"
                            >
                              <strong>{a.className} {a.stream}:</strong> {a.subjectCode} ({a.periodsPerWeek || 4}p)
                            </span>
                          ))}
                          {tAssignments.length === 0 && <span className="text-slate-400 italic">None</span>}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-bold font-mono">
                          {periods}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-700">
                          {formMasterCls ? `${formMasterCls.className} ${formMasterCls.streamName}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Signature Block */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-xs">
              <div className="space-y-4">
                <div className="h-10 border-b border-slate-400" />
                <p className="font-bold uppercase text-slate-800">
                  Director of Studies (D.O.S)<br />
                  <span className="text-[10px] font-normal text-slate-600">Date & Stamp</span>
                </p>
              </div>
              <div className="space-y-4">
                <div className="h-10 border-b border-slate-400" />
                <p className="font-bold uppercase text-slate-800">
                  Headteacher, Masaba Secondary School<br />
                  <span className="text-[10px] font-normal text-slate-600">Date & Official Stamp</span>
                </p>
              </div>
            </div>

            {/* Print Controls */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
