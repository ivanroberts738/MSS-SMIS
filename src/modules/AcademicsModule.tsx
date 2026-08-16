import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../services/db';
import { db as firestoreDb } from '../lib/firebase';
import { sanitizeForFirestore } from '../lib/firestoreUtils';
import { collection, onSnapshot, query, doc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Subject,
  SubjectPaper,
  MarkRecord,
  PaperScore,
  OLevelGradeRule,
  ALevelGradeRule,
  ALevelSubsidiaryGradeRule,
  Student,
} from '../types';
import {
  GraduationCap,
  BookOpen,
  FileCheck,
  CheckCircle2,
  Lock,
  Unlock,
  Save,
  ShieldCheck,
  Settings2,
  AlertCircle,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  Check,
  X,
  Sliders,
  Award,
  RefreshCw,
  HelpCircle,
  Info,
  Scale,
  XCircle,
  Undo2,
  Play,
  Calculator,
} from 'lucide-react';

import { CombinationManagementModule } from './CombinationManagementModule';

interface AcademicsModuleProps {
  initialTab?: 'marks' | 'subjects' | 'olevel-grading' | 'alevel-grading' | 'weights' | 'combinations';
}

export const AcademicsModule: React.FC<AcademicsModuleProps> = ({ initialTab = 'marks' }) => {
  const { currentUser, activeRole, hasPermission, canAccessClass, canAccessSubject } = useAuth();
  const { showToast } = useNotification();

  const [activeSubTab, setActiveSubTab] = useState(initialTab);

  // Database Data
  const [settings, setSettings] = useState(() => db.getSettings());
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const classesList = db.getClasses().filter(c => canAccessClass(c.className, c.streamName || (c as any).stream || ''));

  useEffect(() => {
    const unsubMarks = onSnapshot(
      query(collection(firestoreDb, 'marks')),
      (snapshot) => {
        setMarks(snapshot.docs.map(doc => ({ ...doc.data() as MarkRecord, id: doc.id })));
      },
      (err) => console.warn('Marks listener:', err)
    );
    const unsubSubjects = onSnapshot(
      query(collection(firestoreDb, 'subjects')),
      (snapshot) => {
        setSubjects(snapshot.docs.map(doc => ({ ...doc.data() as Subject, id: doc.id })));
      },
      (err) => console.warn('Subjects listener:', err)
    );
    const unsubStudents = onSnapshot(
      query(collection(firestoreDb, 'students')),
      (snapshot) => {
        setStudents(snapshot.docs.map(doc => ({ ...doc.data() as Student, id: doc.id })));
      },
      (err) => console.warn('Students listener:', err)
    );
    return () => { unsubMarks(); unsubSubjects(); unsubStudents(); };
  }, []);

  const refreshData = () => {
    setSettings(db.getSettings());
    setSubjects(db.getSubjects());
    setStudents(db.getStudents());
    setMarks(db.getMarks());
  };

  const [isLoadingSubjectsPreset, setIsLoadingSubjectsPreset] = useState(false);

  const handleLoadSubjectsPreset = async () => {
    if (confirm('Load standard Ugandan UNEB curriculum subjects (UCE O-Level & UACE A-Level)?')) {
      setIsLoadingSubjectsPreset(true);
      try {
        await db.loadStandardSubjectsPreset(currentUser?.fullName || 'System Administrator', activeRole);
        showToast('Standard UNEB curriculum subjects loaded successfully!', 'success');
      } catch (err) {
        console.error('Error loading subjects preset:', err);
        showToast('Failed to load subject presets', 'error');
      } finally {
        setIsLoadingSubjectsPreset(false);
      }
    }
  };

  // Selection state for marks entry
  const [selectedClass, setSelectedClass] = useState('S.1');
  const [selectedStream, setSelectedStream] = useState('North');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    const defaultSub = subjects.find((s) => s.level === 'O-Level');
    return defaultSub ? defaultSub.id : subjects[0]?.id || '';
  });
  const [selectedTerm, setSelectedTerm] = useState('Term II');

  // Multi-paper entry mode or standard CA+Exam mode
  const [entryMode, setEntryMode] = useState<'standard' | 'papers'>('standard');

  // Filter students for selected class & stream
  const classStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.currentClass === selectedClass &&
        s.stream === selectedStream &&
        s.status === 'Active' &&
        s.offeredSubjectIds.includes(selectedSubjectId)
    );
  }, [students, selectedClass, selectedStream, selectedSubjectId]);

  const activeSubject = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId);
  }, [subjects, selectedSubjectId]);

  const isALevel = selectedClass.startsWith('S.5') || selectedClass.startsWith('S.6');

  // Filter subjects by selected level
  const levelSubjects = useMemo(() => {
    return subjects.filter((s) =>
      isALevel ? s.level === 'A-Level' : s.level === 'O-Level'
    );
  }, [subjects, isALevel]);

  // Subject Modal State
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState<Partial<Subject>>({
    code: '',
    name: '',
    level: 'O-Level',
    category: 'Compulsory',
    department: 'Sciences',
    isSubsidiary: false,
    status: 'Active',
    papers: [
      {
        id: 'p-1',
        paperCode: '1',
        paperNumber: 1,
        paperName: 'Paper 1 (Theory)',
        paperType: 'Theory',
        maxMarks: 100,
        duration: '2h 30m',
        status: 'Active',
      },
    ],
  });

  // Local draft marks state
  interface StudentDraftMark {
    ca: number;
    exam: number;
    paperScores: Record<string, number>; // paperCode -> score
    comment: string;
  }

  const [localMarksMap, setLocalMarksMap] = useState<Record<string, StudentDraftMark>>(() => {
    const map: Record<string, StudentDraftMark> = {};
    classStudents.forEach((std) => {
      const existing = marks.find(
        (m) =>
          m.studentId === std.id &&
          m.subjectId === selectedSubjectId &&
          m.term === selectedTerm &&
          m.academicYear === settings.academicYear
      );
      const paperScoresMap: Record<string, number> = {};
      if (existing?.paperScores) {
        existing.paperScores.forEach((ps) => {
          paperScoresMap[ps.paperCode] = ps.score;
        });
      }
      map[std.id] = {
        ca: existing?.caScore ?? 0,
        exam: existing?.examScore ?? 0,
        paperScores: paperScoresMap,
        comment: existing?.comment || '',
      };
    });
    return map;
  });

  // Keep local marks map in sync when class/subject changes
  const handleSelectChange = (
    newClass = selectedClass,
    newStream = selectedStream,
    newSubjectId = selectedSubjectId,
    newTerm = selectedTerm
  ) => {
    const nextStudents = students.filter(
      (s) => s.currentClass === newClass && s.stream === newStream && s.status === 'Active'
    );
    const sub = subjects.find((s) => s.id === newSubjectId);
    const nextMap: Record<string, StudentDraftMark> = {};

    nextStudents.forEach((std) => {
      const existing = marks.find(
        (m) =>
          m.studentId === std.id &&
          m.subjectId === newSubjectId &&
          m.term === newTerm &&
          m.academicYear === settings.academicYear
      );
      const paperScoresMap: Record<string, number> = {};
      if (existing?.paperScores) {
        existing.paperScores.forEach((ps) => {
          paperScoresMap[ps.paperCode] = ps.score;
        });
      } else if (sub?.papers) {
        sub.papers.forEach((p) => {
          paperScoresMap[p.paperCode] = 60;
        });
      }

      nextMap[std.id] = {
        ca: existing?.caScore ?? 0,
        exam: existing?.examScore ?? 0,
        paperScores: paperScoresMap,
        comment: existing?.comment || '',
      };
    });

    setLocalMarksMap(nextMap);
  };

  const calculateStudentTotalAndGrade = (stdId: string) => {
    const draft = localMarksMap[stdId] || { ca: 0, exam: 0, paperScores: {}, comment: '' };
    let totalScore = 0;

    if (entryMode === 'papers' && activeSubject?.papers && activeSubject.papers.length > 0) {
      // Average or weighted sum of papers
      const paperScores = activeSubject.papers.map((p) => {
        const score = draft.paperScores[p.paperCode] ?? 60;
        const max = p.maxMarks || 100;
        return (score / max) * 100;
      });
      totalScore = Math.round(
        paperScores.reduce((a, b) => a + b, 0) / (paperScores.length || 1)
      );
    } else {
      // CA (20%) + Exam (80%)
      const ca = Number(draft.ca) || 0;
      const exam = Number(draft.exam) || 0;
      totalScore = Math.round(ca + exam);
    }

    totalScore = Math.max(0, Math.min(100, totalScore));
    const gradeResult = db.calculateGrade(
      isALevel ? 'A-Level' : 'O-Level',
      totalScore,
      activeSubject
    );

    return {
      totalScore,
      ...gradeResult,
    };
  };

  const handleScoreChange = (
    studentId: string,
    field: 'ca' | 'exam' | 'comment',
    value: any
  ) => {
    setLocalMarksMap((prev) => {
      const current = prev[studentId] || { ca: 0, exam: 0, paperScores: {}, comment: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handlePaperScoreChange = (studentId: string, paperCode: string, score: number) => {
    setLocalMarksMap((prev) => {
      const current = prev[studentId] || { ca: 0, exam: 0, paperScores: {}, comment: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          paperScores: {
            ...current.paperScores,
            [paperCode]: score,
          },
        },
      };
    });
  };

  const handleSaveMarksBatch = () => {
    if (!activeSubject) return;

    const recordsToSave: MarkRecord[] = classStudents.map((std) => {
      const draft = localMarksMap[std.id] || { ca: 0, exam: 0, paperScores: {}, comment: '' };
      const computed = calculateStudentTotalAndGrade(std.id);

      const paperScoresList: PaperScore[] = (activeSubject.papers || []).map((p) => {
        const scoreVal = draft.paperScores[p.paperCode] ?? (entryMode === 'papers' ? 60 : Math.round(computed.totalScore));
        return {
          paperCode: p.paperCode,
          paperName: p.paperName,
          score: scoreVal,
          maxMarks: p.maxMarks || 100,
        };
      });

      return {
        id: `mrk-${std.id}-${selectedSubjectId}-${selectedTerm}`,
        studentId: std.id,
        subjectId: selectedSubjectId,
        className: selectedClass,
        stream: selectedStream,
        academicYear: settings.academicYear,
        term: selectedTerm,
        caScore: Number(draft.ca) || 0,
        examScore: Number(draft.exam) || 0,
        paperScores: paperScoresList,
        totalMark: computed.totalScore,
        grade: computed.grade,
        points: computed.points,
        achievementLevel: computed.achievementLevel,
        comment: draft.comment,
        enteredByTeacherId: currentUser.linkedEntityId || 't-001',
        isApproved: false,
        isLocked: false,
        updatedAt: new Date().toISOString().split('T')[0],
      };
    });

    db.saveMarksBatch(recordsToSave, currentUser.fullName, activeRole);
    try {
      const batch = writeBatch(firestoreDb);
      recordsToSave.forEach((r) => {
        const docRef = doc(firestoreDb, 'marks', r.id);
        batch.set(docRef, sanitizeForFirestore(r));
      });
      batch.commit().catch((e) => console.warn('Firestore marks sync:', e));
    } catch (e) {
      console.warn('Firestore marks batch sync error:', e);
    }
    refreshData();
    showToast(
      `Saved assessment marks for ${classStudents.length} students in ${selectedClass} ${selectedStream} (${activeSubject.name}).`,
      'success'
    );
  };

  const handleApproveBatch = () => {
    db.approveMarksBatch(
      selectedClass,
      selectedStream,
      selectedSubjectId,
      selectedTerm,
      currentUser.fullName,
      activeRole
    );
    refreshData();
    showToast(
      `Approved & locked ${selectedClass} ${selectedStream} ${activeSubject?.name} marks!`,
      'success'
    );
  };

  const handleExportStudentList = () => {
    const ws = XLSX.utils.json_to_sheet(classStudents.map(s => ({
      'Admission No': s.admissionNo,
      'First Name': s.firstName,
      'Last Name': s.lastName,
      'Class': s.currentClass,
      'Stream': s.stream
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `StudentList_${selectedClass}_${selectedStream}.xlsx`);
  };

  const handleExportMarks = () => {
    const data = classStudents.map(std => {
      const draft = localMarksMap[std.id] || { ca: 0, exam: 0, comment: '' };
      return {
        'Admission No': std.admissionNo,
        'Name': `${std.firstName} ${std.lastName}`,
        'CA Score': draft.ca,
        'Exam Score': draft.exam,
        'Comment': draft.comment
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks");
    XLSX.writeFile(wb, `Marks_${activeSubject?.name}_${selectedClass}_${selectedTerm}.xlsx`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportMarks = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any>(ws);
      
      const newMarks: MarkRecord[] = [];
      data.forEach(row => {
        const student = classStudents.find(s => s.admissionNo === String(row['Admission No']));
        if (student) {
          const draft: StudentDraftMark = {
            ca: Number(row['CA Score'] || 0),
            exam: Number(row['Exam Score'] || 0),
            paperScores: {},
            comment: row['Comment'] || ''
          };
          
          const computed = calculateStudentTotalAndGrade(student.id);
          newMarks.push({
            id: `mrk-${student.id}-${selectedSubjectId}-${selectedTerm}`,
            studentId: student.id,
            subjectId: selectedSubjectId,
            subjectCode: activeSubject?.code || 'SUB',
            subjectName: activeSubject?.name || 'Subject',
            className: selectedClass,
            stream: selectedStream,
            level: (['S.5', 'S.6'].includes(selectedClass) ? 'A-Level' : 'O-Level'),
            academicYear: settings.academicYear,
            term: selectedTerm,
            caScore: draft.ca,
            examScore: draft.exam,
            paperScores: [], // Simple mode for import
            totalMark: computed.totalScore,
            grade: computed.grade,
            points: computed.points,
            achievementLevel: computed.achievementLevel,
            comment: draft.comment,
            enteredByTeacherId: currentUser?.linkedEntityId || 't-001',
            isApproved: false,
            isLocked: false,
            updatedAt: new Date().toISOString().split('T')[0],
          });
        }
      });
      db.saveMarksBatch(newMarks, currentUser.fullName, activeRole);
      refreshData();
      handleSelectChange();
      showToast(`Imported ${newMarks.length} marks from Excel.`, 'success');
    };
    reader.readAsBinaryString(file);
  };

  // --- Subject Management Handlers ---
  const handleOpenNewSubjectModal = () => {
    setEditingSubject(null);
    setSubjectForm({
      code: '',
      name: '',
      level: isALevel ? 'A-Level' : 'O-Level',
      category: 'Compulsory',
      department: 'Sciences',
      isSubsidiary: false,
      status: 'Active',
      papers: [
        {
          id: `p-${Date.now()}-1`,
          paperCode: '1',
          paperNumber: 1,
          paperName: 'Paper 1 (Theory)',
          paperType: 'Theory',
          maxMarks: 100,
          duration: '2h 30m',
          status: 'Active',
        },
      ],
    });
    setShowSubjectModal(true);
  };

  const handleEditSubject = (sub: Subject) => {
    setEditingSubject(sub);
    setSubjectForm({
      ...sub,
      papers: sub.papers && sub.papers.length > 0 ? [...sub.papers] : [
        {
          id: `p-${sub.id}-1`,
          paperCode: `${sub.code}/1`,
          paperNumber: 1,
          paperName: `${sub.name} Paper 1`,
          paperType: 'Theory',
          maxMarks: 100,
          duration: '2h 30m',
          status: 'Active',
        },
      ],
    });
    setShowSubjectModal(true);
  };

  const handleAddPaperToForm = () => {
    const currentPapers = subjectForm.papers || [];
    const nextNum = currentPapers.length + 1;
    const newPaper: SubjectPaper = {
      id: `p-${Date.now()}-${nextNum}`,
      paperCode: subjectForm.code ? `${subjectForm.code}/${nextNum}` : `${nextNum}`,
      paperNumber: nextNum,
      paperName: nextNum === 2 ? 'Paper 2 (Practical)' : nextNum === 3 ? 'Paper 3 (Project)' : `Paper ${nextNum}`,
      paperType: nextNum === 2 ? 'Practical' : 'Theory',
      maxMarks: 100,
      duration: '2h 30m',
      status: 'Active',
    };
    setSubjectForm({
      ...subjectForm,
      papers: [...currentPapers, newPaper],
    });
  };

  const handleRemovePaperFromForm = (idx: number) => {
    const currentPapers = [...(subjectForm.papers || [])];
    currentPapers.splice(idx, 1);
    setSubjectForm({
      ...subjectForm,
      papers: currentPapers,
    });
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.code || !subjectForm.name) {
      showToast('Please provide subject code and name.', 'alert');
      return;
    }

    const papers = subjectForm.papers || [];
    const newSubject: Subject = {
      id: editingSubject ? editingSubject.id : `sub-${Date.now()}`,
      code: subjectForm.code.trim().toUpperCase(),
      name: subjectForm.name.trim(),
      level: subjectForm.level || 'O-Level',
      category: subjectForm.category || 'Compulsory',
      department: subjectForm.department || 'General',
      isSubsidiary: !!subjectForm.isSubsidiary,
      paperCount: papers.length,
      papers,
      status: subjectForm.status || 'Active',
    };

    db.saveSubject(newSubject, currentUser.fullName, activeRole);
    setShowSubjectModal(false);
    refreshData();
    showToast(`Saved subject ${newSubject.code} - ${newSubject.name}`, 'success');
  };

  const handleToggleSubjectStatus = (subId: string) => {
    db.toggleSubjectStatus(subId, currentUser.fullName, activeRole);
    refreshData();
    showToast('Subject status toggled.', 'info');
  };

  const handleDuplicateSubject = (subId: string) => {
    db.duplicateSubject(subId, currentUser.fullName, activeRole);
    refreshData();
    showToast('Subject duplicated successfully.', 'success');
  };

  const handleDeleteSubject = (subId: string) => {
    if (confirm('Are you sure you want to delete this subject? Historical records may be affected.')) {
      db.deleteSubject(subId, currentUser.fullName, activeRole);
      refreshData();
      showToast('Subject removed.', 'info');
    }
  };

  // --- Grading Scale Configuration Handlers ---
  const [editingGrading, setEditingGrading] = useState<{
    caWeight: number;
    examWeight: number;
    oLevelGrading: OLevelGradeRule[];
    aLevelGrading: ALevelGradeRule[];
    aLevelSubsidiaryGrading: ALevelSubsidiaryGradeRule[];
  }>({
    caWeight: settings.caWeight ?? 20,
    examWeight: settings.examWeight ?? 80,
    oLevelGrading: (settings.oLevelGrading && settings.oLevelGrading.length > 0)
      ? settings.oLevelGrading.map((r) => ({
          grade: r.grade,
          minScore: r.minScore,
          maxScore: r.maxScore,
          points: r.points,
          achievementLevel: r.achievementLevel || (r.grade === 'A' ? 'Exceptional' : r.grade === 'B' ? 'Outstanding' : r.grade === 'C' ? 'Satisfactory' : r.grade === 'D' ? 'Basic' : 'Elementary'),
          description: r.description,
          isPass: r.isPass !== undefined ? r.isPass : r.grade !== 'E',
        }))
      : [
          { grade: 'A', minScore: 80, maxScore: 100, points: 5, achievementLevel: 'Exceptional', description: 'Extraordinary level of competency and independent mastery', isPass: true },
          { grade: 'B', minScore: 70, maxScore: 79, points: 4, achievementLevel: 'Outstanding', description: 'High level of competency with thorough concept application', isPass: true },
          { grade: 'C', minScore: 60, maxScore: 69, points: 3, achievementLevel: 'Satisfactory', description: 'Adequate level of competency meeting core syllabus goals', isPass: true },
          { grade: 'D', minScore: 50, maxScore: 59, points: 2, achievementLevel: 'Basic', description: 'Minimum acceptable level of competency requiring guidance', isPass: true },
          { grade: 'E', minScore: 0, maxScore: 49, points: 1, achievementLevel: 'Elementary', description: 'Below basic level of competency requiring remediation', isPass: false },
        ],
    aLevelGrading: settings.aLevelGrading && settings.aLevelGrading.length > 0
      ? settings.aLevelGrading.map((r) => ({
          grade: r.grade,
          minScore: r.minScore,
          maxScore: r.maxScore,
          points: r.points !== undefined ? r.points : (r.grade === 'A' ? 5 : r.grade === 'B' ? 4 : r.grade === 'C' ? 3 : r.grade === 'D' ? 2 : 1),
          description: r.description,
          achievementLevel: r.achievementLevel || (r.points >= 4 ? 'Distinction' : r.points >= 2 ? 'Credit' : 'Pass'),
          isPass: r.isPass !== undefined ? r.isPass : true,
        }))
      : [
          { grade: 'A', minScore: 80, maxScore: 100, points: 5, description: 'Principal Distinction with advanced theoretical and practical mastery', achievementLevel: 'Distinction', isPass: true },
          { grade: 'B', minScore: 70, maxScore: 79, points: 4, description: 'Principal High Credit with strong conceptual application', achievementLevel: 'Credit', isPass: true },
          { grade: 'C', minScore: 60, maxScore: 69, points: 3, description: 'Principal Solid Credit meeting syllabus objectives', achievementLevel: 'Credit', isPass: true },
          { grade: 'D', minScore: 50, maxScore: 59, points: 2, description: 'Principal Moderate Pass demonstrating core competency', achievementLevel: 'Pass', isPass: true },
          { grade: 'E', minScore: 0, maxScore: 49, points: 1, description: 'Principal Elementary Pass with foundational threshold', achievementLevel: 'Elementary', isPass: true },
        ],
    aLevelSubsidiaryGrading: settings.aLevelSubsidiaryGrading && settings.aLevelSubsidiaryGrading.length > 0
      ? settings.aLevelSubsidiaryGrading.map((r) => ({
          grade: r.grade,
          minScore: r.minScore,
          maxScore: r.maxScore,
          points: 1,
          description: r.description,
          achievementLevel: r.achievementLevel || `Subsidiary ${r.grade === 'A' ? 'Distinction' : r.grade === 'B' || r.grade === 'C' ? 'Credit' : 'Pass'}`,
          isPass: true,
        }))
      : [
          { grade: 'A', minScore: 80, maxScore: 100, points: 1, description: 'Exceptional subsidiary understanding and practical application', achievementLevel: 'Subsidiary Distinction', isPass: true },
          { grade: 'B', minScore: 70, maxScore: 79, points: 1, description: 'Strong subsidiary competency with consistent execution', achievementLevel: 'Subsidiary Credit', isPass: true },
          { grade: 'C', minScore: 60, maxScore: 69, points: 1, description: 'Good subsidiary understanding meeting syllabus standards', achievementLevel: 'Subsidiary Credit', isPass: true },
          { grade: 'D', minScore: 50, maxScore: 59, points: 1, description: 'Fair subsidiary understanding meeting basic requirements', achievementLevel: 'Subsidiary Pass', isPass: true },
          { grade: 'E', minScore: 0, maxScore: 49, points: 1, description: 'Basic subsidiary performance', achievementLevel: 'Subsidiary Elementary', isPass: true },
        ],
  });

  // Simulator Test Score State & Recalculate State
  const [simulatorScore, setSimulatorScore] = useState<number>(75);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // A-Level Sub-View inside A-Level tab ('principal' | 'subsidiary')
  const [aLevelAdminTab, setALevelAdminTab] = useState<'principal' | 'subsidiary' | 'simulator'>('principal');
  const [aLevelSimScore, setALevelSimScore] = useState<number>(76);
  const [aLevelSimSubjectType, setALevelSimSubjectType] = useState<'principal' | 'subsidiary'>('principal');

  // A-Level Combination Points Sandbox state
  const [aLevelSandboxScores, setALevelSandboxScores] = useState({
    sub1Score: 82,
    sub2Score: 74,
    sub3Score: 65,
    sub4Score: 72,
    sub5Score: 68,
  });

  // O-Level Range Validation and Health Checks
  const oLevelValidation = useMemo(() => {
    const rules = editingGrading.oLevelGrading;
    const errors: string[] = [];
    
    // Check min <= max for each
    rules.forEach((r) => {
      if (r.minScore > r.maxScore) {
        errors.push(`Grade ${r.grade}: Minimum score (${r.minScore}%) cannot exceed maximum score (${r.maxScore}%).`);
      }
      if (r.minScore < 0 || r.maxScore > 100) {
        errors.push(`Grade ${r.grade}: Scores must remain within 0%–100%.`);
      }
    });

    // Check overlaps & gaps between adjacent grades sorted descending
    const sorted = [...rules].sort((a, b) => b.minScore - a.minScore);
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (current.minScore <= next.maxScore) {
        errors.push(`Overlap: Grade ${current.grade} (min ${current.minScore}%) conflicts with Grade ${next.grade} (max ${next.maxScore}%).`);
      } else if (current.minScore - next.maxScore > 1) {
        errors.push(`Gap: Between Grade ${next.grade} (max ${next.maxScore}%) and Grade ${current.grade} (min ${current.minScore}%), scores ${next.maxScore + 1}%–${current.minScore - 1}% are unassigned.`);
      }
    }

    // Check full coverage 0-100
    const highestMax = Math.max(...rules.map((r) => r.maxScore), 0);
    const lowestMin = Math.min(...rules.map((r) => r.minScore), 100);
    if (highestMax < 100) {
      errors.push(`Scale max is ${highestMax}%. Top scores up to 100% will not be graded.`);
    }
    if (lowestMin > 0) {
      errors.push(`Scale min is ${lowestMin}%. Scores below ${lowestMin}% will not be graded.`);
    }

    const passingRules = rules.filter((r) => r.isPass);
    const minPassRule = passingRules.reduce(
      (lowest, r) => (r.minScore < lowest.minScore ? r : lowest),
      passingRules[0] || rules[0]
    );

    return {
      isValid: errors.length === 0,
      errors,
      minPassScore: minPassRule ? minPassRule.minScore : 50,
      minPassGrade: minPassRule ? minPassRule.grade : 'D',
    };
  }, [editingGrading.oLevelGrading]);

  // A-Level Principal & Subsidiary Validation Engine
  const aLevelValidation = useMemo(() => {
    const prinRules = editingGrading.aLevelGrading;
    const subRules = editingGrading.aLevelSubsidiaryGrading;
    const errors: string[] = [];

    // 1. Validate Principal Rules
    prinRules.forEach((r) => {
      if (r.minScore > r.maxScore) {
        errors.push(`Principal Grade ${r.grade}: Minimum score (${r.minScore}%) cannot exceed maximum score (${r.maxScore}%).`);
      }
      if (r.minScore < 0 || r.maxScore > 100) {
        errors.push(`Principal Grade ${r.grade}: Scores must remain within 0%–100%.`);
      }
    });

    const sortedPrin = [...prinRules].sort((a, b) => b.minScore - a.minScore);
    for (let i = 0; i < sortedPrin.length - 1; i++) {
      const current = sortedPrin[i];
      const next = sortedPrin[i + 1];
      if (current.minScore <= next.maxScore) {
        errors.push(`Principal Overlap: Grade ${current.grade} (min ${current.minScore}%) conflicts with Grade ${next.grade} (max ${next.maxScore}%).`);
      } else if (current.minScore - next.maxScore > 1) {
        errors.push(`Principal Gap: Between Grade ${next.grade} (max ${next.maxScore}%) and Grade ${current.grade} (min ${current.minScore}%), scores ${next.maxScore + 1}%–${current.minScore - 1}% are unassigned.`);
      }
    }

    // 2. Validate Subsidiary Rules
    subRules.forEach((r) => {
      if (r.minScore > r.maxScore) {
        errors.push(`Subsidiary Grade ${r.grade}: Minimum score (${r.minScore}%) cannot exceed maximum score (${r.maxScore}%).`);
      }
      if (r.minScore < 0 || r.maxScore > 100) {
        errors.push(`Subsidiary Grade ${r.grade}: Scores must remain within 0%–100%.`);
      }
      if (r.grade === 'O' || r.grade === 'F') {
        errors.push(`Subsidiary Rule: Invalid grade '${r.grade}'. UNEB Subsidiary structure only supports grades A through E.`);
      }
    });

    const sortedSub = [...subRules].sort((a, b) => b.minScore - a.minScore);
    for (let i = 0; i < sortedSub.length - 1; i++) {
      const current = sortedSub[i];
      const next = sortedSub[i + 1];
      if (current.minScore <= next.maxScore) {
        errors.push(`Subsidiary Overlap: Grade ${current.grade} (min ${current.minScore}%) conflicts with Grade ${next.grade} (max ${next.maxScore}%).`);
      } else if (current.minScore - next.maxScore > 1) {
        errors.push(`Subsidiary Gap: Between Grade ${next.grade} (max ${next.maxScore}%) and Grade ${current.grade} (min ${current.minScore}%), scores ${next.maxScore + 1}%–${current.minScore - 1}% are unassigned.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [editingGrading.aLevelGrading, editingGrading.aLevelSubsidiaryGrading]);

  // Live O-Level Simulator Outcome
  const simulatedResult = useMemo(() => {
    const score = Math.max(0, Math.min(100, Math.round(simulatorScore)));
    const matched = editingGrading.oLevelGrading.find((r) => score >= r.minScore && score <= r.maxScore);
    if (matched) {
      return {
        grade: matched.grade,
        points: matched.points,
        achievementLevel: matched.achievementLevel || 'Competent',
        description: matched.description,
        isPass: matched.isPass !== undefined ? matched.isPass : matched.grade !== 'E',
      };
    }
    return {
      grade: 'E',
      points: 1,
      achievementLevel: 'Elementary',
      description: 'Below basic level of competency',
      isPass: false,
    };
  }, [simulatorScore, editingGrading.oLevelGrading]);

  // Live A-Level Simulator Outcome (Dual-Engine: Principal vs Subsidiary)
  const aLevelSimulatedResult = useMemo(() => {
    const score = Math.max(0, Math.min(100, Math.round(aLevelSimScore)));
    if (aLevelSimSubjectType === 'subsidiary') {
      const matched = editingGrading.aLevelSubsidiaryGrading.find(
        (r) => score >= r.minScore && score <= r.maxScore
      );
      if (matched) {
        return {
          grade: matched.grade,
          points: 1,
          achievementLevel: matched.achievementLevel || `Subsidiary ${matched.grade}`,
          description: matched.description,
          isSubsidiary: true,
        };
      }
      return {
        grade: 'E',
        points: 1,
        achievementLevel: 'Subsidiary Elementary',
        description: 'Basic subsidiary performance',
        isSubsidiary: true,
      };
    } else {
      const matched = editingGrading.aLevelGrading.find(
        (r) => score >= r.minScore && score <= r.maxScore
      );
      if (matched) {
        return {
          grade: matched.grade,
          points: matched.points,
          achievementLevel: matched.achievementLevel || (matched.points >= 4 ? 'Distinction' : matched.points >= 2 ? 'Credit' : 'Pass'),
          description: matched.description,
          isSubsidiary: false,
        };
      }
      return {
        grade: 'E',
        points: 1,
        achievementLevel: 'Elementary',
        description: 'Principal elementary pass',
        isSubsidiary: false,
      };
    }
  }, [aLevelSimScore, aLevelSimSubjectType, editingGrading.aLevelGrading, editingGrading.aLevelSubsidiaryGrading]);

  // A-Level Live Combination Sandbox Points Calculator
  const aLevelSandboxTotal = useMemo(() => {
    const evaluateMark = (score: number, isSub: boolean) => {
      if (isSub) {
        const matched = editingGrading.aLevelSubsidiaryGrading.find(
          (r) => score >= r.minScore && score <= r.maxScore
        );
        return {
          grade: matched?.grade || 'E',
          points: 1,
        };
      } else {
        const matched = editingGrading.aLevelGrading.find(
          (r) => score >= r.minScore && score <= r.maxScore
        );
        return {
          grade: matched?.grade || 'E',
          points: matched ? matched.points : (score >= 80 ? 5 : score >= 70 ? 4 : score >= 60 ? 3 : score >= 50 ? 2 : 1),
        };
      }
    };

    const s1 = evaluateMark(aLevelSandboxScores.sub1Score, false);
    const s2 = evaluateMark(aLevelSandboxScores.sub2Score, false);
    const s3 = evaluateMark(aLevelSandboxScores.sub3Score, false);
    const s4 = evaluateMark(aLevelSandboxScores.sub4Score, true);
    const s5 = evaluateMark(aLevelSandboxScores.sub5Score, true);

    const principalPoints = s1.points + s2.points + s3.points;
    const subsidiaryPoints = s4.points + s5.points;
    const totalPoints = principalPoints + subsidiaryPoints;

    return {
      s1,
      s2,
      s3,
      s4,
      s5,
      principalPoints,
      subsidiaryPoints,
      totalPoints,
    };
  }, [aLevelSandboxScores, editingGrading.aLevelGrading, editingGrading.aLevelSubsidiaryGrading]);

  // O-Level Preset Handlers
  const handleApplyOLevelPreset = (presetType: 'uneb_2026' | 'strict_honors' | 'pass_40') => {
    let preset: OLevelGradeRule[] = [];
    if (presetType === 'uneb_2026') {
      preset = [
        { grade: 'A', minScore: 80, maxScore: 100, points: 5, achievementLevel: 'Exceptional', description: 'Extraordinary level of competency and independent mastery', isPass: true },
        { grade: 'B', minScore: 70, maxScore: 79, points: 4, achievementLevel: 'Outstanding', description: 'High level of competency with thorough concept application', isPass: true },
        { grade: 'C', minScore: 60, maxScore: 69, points: 3, achievementLevel: 'Satisfactory', description: 'Adequate level of competency meeting core syllabus goals', isPass: true },
        { grade: 'D', minScore: 50, maxScore: 59, points: 2, achievementLevel: 'Basic', description: 'Minimum acceptable level of competency requiring guidance', isPass: true },
        { grade: 'E', minScore: 0, maxScore: 49, points: 1, achievementLevel: 'Elementary', description: 'Below basic level of competency requiring remediation', isPass: false },
      ];
      showToast('Loaded 2026 UNEB Lower Secondary Standard Preset.', 'info');
    } else if (presetType === 'strict_honors') {
      preset = [
        { grade: 'A', minScore: 85, maxScore: 100, points: 5, achievementLevel: 'Exceptional', description: 'Distinction level of mastery with creative and innovative output', isPass: true },
        { grade: 'B', minScore: 75, maxScore: 84, points: 4, achievementLevel: 'Outstanding', description: 'Strong mastery and consistent application of competencies', isPass: true },
        { grade: 'C', minScore: 65, maxScore: 74, points: 3, achievementLevel: 'Satisfactory', description: 'Sound understanding with standard competency achievement', isPass: true },
        { grade: 'D', minScore: 50, maxScore: 64, points: 2, achievementLevel: 'Basic', description: 'Foundational understanding with partial competency demonstrated', isPass: true },
        { grade: 'E', minScore: 0, maxScore: 49, points: 1, achievementLevel: 'Elementary', description: 'Insufficient competency demonstrated; requires intervention', isPass: false },
      ];
      showToast('Loaded Strict Honors & Distinction Scale Preset.', 'info');
    } else if (presetType === 'pass_40') {
      preset = [
        { grade: 'A', minScore: 80, maxScore: 100, points: 5, achievementLevel: 'Exceptional', description: 'Extraordinary level of competency and independent mastery', isPass: true },
        { grade: 'B', minScore: 65, maxScore: 79, points: 4, achievementLevel: 'Outstanding', description: 'High level of competency with thorough concept application', isPass: true },
        { grade: 'C', minScore: 50, maxScore: 64, points: 3, achievementLevel: 'Satisfactory', description: 'Adequate level of competency meeting core syllabus goals', isPass: true },
        { grade: 'D', minScore: 40, maxScore: 49, points: 2, achievementLevel: 'Basic', description: 'Basic threshold passing level of competency', isPass: true },
        { grade: 'E', minScore: 0, maxScore: 39, points: 1, achievementLevel: 'Elementary', description: 'Below basic level of competency requiring remediation', isPass: false },
      ];
      showToast('Loaded 40% Pass Threshold Scale Preset.', 'info');
    }

    setEditingGrading({
      ...editingGrading,
      oLevelGrading: preset,
    });
  };

  const handleAutoHarmonizeBoundaries = () => {
    const updated = editingGrading.oLevelGrading.map((r) => ({ ...r }));
    const ruleA = updated.find((r) => r.grade === 'A');
    const ruleB = updated.find((r) => r.grade === 'B');
    const ruleC = updated.find((r) => r.grade === 'C');
    const ruleD = updated.find((r) => r.grade === 'D');
    const ruleE = updated.find((r) => r.grade === 'E');

    if (ruleA && ruleB && ruleC && ruleD && ruleE) {
      ruleA.maxScore = 100;
      ruleB.maxScore = Math.max(0, ruleA.minScore - 1);
      ruleC.maxScore = Math.max(0, ruleB.minScore - 1);
      ruleD.maxScore = Math.max(0, ruleC.minScore - 1);
      ruleE.maxScore = Math.max(0, ruleD.minScore - 1);
      ruleE.minScore = 0;
      setEditingGrading({
        ...editingGrading,
        oLevelGrading: updated,
      });
      showToast('Boundaries harmonized into seamless contiguous ranges.', 'success');
    }
  };

  // A-Level Preset Handlers
  const handleApplyALevelPreset = (presetType: 'uneb_standard' | 'strict_distinction' | 'lenient_credit') => {
    let prinPreset: ALevelGradeRule[] = [];
    let subPreset: ALevelSubsidiaryGradeRule[] = [];

    if (presetType === 'uneb_standard') {
      prinPreset = [
        { grade: 'A', minScore: 80, maxScore: 100, points: 5, description: 'Principal Distinction with advanced theoretical and practical mastery', achievementLevel: 'Distinction', isPass: true },
        { grade: 'B', minScore: 70, maxScore: 79, points: 4, description: 'Principal High Credit with strong conceptual application', achievementLevel: 'Credit', isPass: true },
        { grade: 'C', minScore: 60, maxScore: 69, points: 3, description: 'Principal Solid Credit meeting syllabus objectives', achievementLevel: 'Credit', isPass: true },
        { grade: 'D', minScore: 50, maxScore: 59, points: 2, description: 'Principal Moderate Pass demonstrating core competency', achievementLevel: 'Pass', isPass: true },
        { grade: 'E', minScore: 0, maxScore: 49, points: 1, description: 'Principal Elementary Pass with foundational threshold', achievementLevel: 'Elementary', isPass: true },
      ];
      subPreset = [
        { grade: 'A', minScore: 80, maxScore: 100, points: 1, description: 'Exceptional subsidiary understanding and practical application', achievementLevel: 'Subsidiary Distinction', isPass: true },
        { grade: 'B', minScore: 70, maxScore: 79, points: 1, description: 'Strong subsidiary competency with consistent execution', achievementLevel: 'Subsidiary Credit', isPass: true },
        { grade: 'C', minScore: 60, maxScore: 69, points: 1, description: 'Good subsidiary understanding meeting syllabus standards', achievementLevel: 'Subsidiary Credit', isPass: true },
        { grade: 'D', minScore: 50, maxScore: 59, points: 1, description: 'Fair subsidiary understanding meeting basic requirements', achievementLevel: 'Subsidiary Pass', isPass: true },
        { grade: 'E', minScore: 0, maxScore: 49, points: 1, description: 'Basic subsidiary performance', achievementLevel: 'Subsidiary Elementary', isPass: true },
      ];
      showToast('Loaded UNEB UACE Standard Scale (A=5, B=4, C=3, D=2, E=1 / Sub=1 Pt).', 'info');
    } else if (presetType === 'strict_distinction') {
      prinPreset = [
        { grade: 'A', minScore: 85, maxScore: 100, points: 5, description: 'Outstanding distinction with comprehensive theoretical and research depth', achievementLevel: 'Distinction', isPass: true },
        { grade: 'B', minScore: 75, maxScore: 84, points: 4, description: 'Very high credit demonstrating rigorous conceptual command', achievementLevel: 'Credit', isPass: true },
        { grade: 'C', minScore: 65, maxScore: 74, points: 3, description: 'Good credit showing steady and coherent understanding', achievementLevel: 'Credit', isPass: true },
        { grade: 'D', minScore: 50, maxScore: 64, points: 2, description: 'Satisfactory principal pass', achievementLevel: 'Pass', isPass: true },
        { grade: 'E', minScore: 0, maxScore: 49, points: 1, description: 'Principal elementary pass', achievementLevel: 'Elementary', isPass: true },
      ];
      subPreset = [
        { grade: 'A', minScore: 85, maxScore: 100, points: 1, description: 'High-distinction subsidiary pass', achievementLevel: 'Subsidiary Distinction', isPass: true },
        { grade: 'B', minScore: 75, maxScore: 84, points: 1, description: 'Credit subsidiary pass', achievementLevel: 'Subsidiary Credit', isPass: true },
        { grade: 'C', minScore: 65, maxScore: 74, points: 1, description: 'Standard subsidiary pass', achievementLevel: 'Subsidiary Credit', isPass: true },
        { grade: 'D', minScore: 50, maxScore: 64, points: 1, description: 'Threshold subsidiary pass', achievementLevel: 'Subsidiary Pass', isPass: true },
        { grade: 'E', minScore: 0, maxScore: 49, points: 1, description: 'Basic subsidiary pass', achievementLevel: 'Subsidiary Elementary', isPass: true },
      ];
      showToast('Loaded Strict Honors & High Distinction UACE Scale.', 'info');
    } else if (presetType === 'lenient_credit') {
      prinPreset = [
        { grade: 'A', minScore: 80, maxScore: 100, points: 5, description: 'Principal Distinction', achievementLevel: 'Distinction', isPass: true },
        { grade: 'B', minScore: 65, maxScore: 79, points: 4, description: 'Principal Credit', achievementLevel: 'Credit', isPass: true },
        { grade: 'C', minScore: 50, maxScore: 64, points: 3, description: 'Principal Credit', achievementLevel: 'Credit', isPass: true },
        { grade: 'D', minScore: 40, maxScore: 49, points: 2, description: 'Principal Pass', achievementLevel: 'Pass', isPass: true },
        { grade: 'E', minScore: 0, maxScore: 39, points: 1, description: 'Principal Elementary Pass', achievementLevel: 'Elementary', isPass: true },
      ];
      subPreset = [
        { grade: 'A', minScore: 80, maxScore: 100, points: 1, description: 'Subsidiary Distinction', achievementLevel: 'Subsidiary Distinction', isPass: true },
        { grade: 'B', minScore: 65, maxScore: 79, points: 1, description: 'Subsidiary Credit', achievementLevel: 'Subsidiary Credit', isPass: true },
        { grade: 'C', minScore: 50, maxScore: 64, points: 1, description: 'Subsidiary Credit', achievementLevel: 'Subsidiary Credit', isPass: true },
        { grade: 'D', minScore: 40, maxScore: 49, points: 1, description: 'Subsidiary Pass', achievementLevel: 'Subsidiary Pass', isPass: true },
        { grade: 'E', minScore: 0, maxScore: 39, points: 1, description: 'Subsidiary Elementary Pass', achievementLevel: 'Subsidiary Elementary', isPass: true },
      ];
      showToast('Loaded Flexible Credit Benchmark Scale.', 'info');
    }

    setEditingGrading({
      ...editingGrading,
      aLevelGrading: prinPreset,
      aLevelSubsidiaryGrading: subPreset,
    });
  };

  const handleHarmonizeALevelBoundaries = (target: 'principal' | 'subsidiary') => {
    if (target === 'principal') {
      const updated = editingGrading.aLevelGrading.map((r) => ({ ...r }));
      const ruleA = updated.find((r) => r.grade === 'A');
      const ruleB = updated.find((r) => r.grade === 'B');
      const ruleC = updated.find((r) => r.grade === 'C');
      const ruleD = updated.find((r) => r.grade === 'D');
      const ruleE = updated.find((r) => r.grade === 'E');

      if (ruleA && ruleB && ruleC && ruleD && ruleE) {
        ruleA.maxScore = 100;
        ruleB.maxScore = Math.max(0, ruleA.minScore - 1);
        ruleC.maxScore = Math.max(0, ruleB.minScore - 1);
        ruleD.maxScore = Math.max(0, ruleC.minScore - 1);
        ruleE.maxScore = Math.max(0, ruleD.minScore - 1);
        ruleE.minScore = 0;
        setEditingGrading({
          ...editingGrading,
          aLevelGrading: updated,
        });
        showToast('Principal boundaries harmonized into contiguous ranges.', 'success');
      }
    } else {
      const updated = editingGrading.aLevelSubsidiaryGrading.map((r) => ({ ...r }));
      const ruleA = updated.find((r) => r.grade === 'A');
      const ruleB = updated.find((r) => r.grade === 'B');
      const ruleC = updated.find((r) => r.grade === 'C');
      const ruleD = updated.find((r) => r.grade === 'D');
      const ruleE = updated.find((r) => r.grade === 'E');

      if (ruleA && ruleB && ruleC && ruleD && ruleE) {
        ruleA.maxScore = 100;
        ruleB.maxScore = Math.max(0, ruleA.minScore - 1);
        ruleC.maxScore = Math.max(0, ruleB.minScore - 1);
        ruleD.maxScore = Math.max(0, ruleC.minScore - 1);
        ruleE.maxScore = Math.max(0, ruleD.minScore - 1);
        ruleE.minScore = 0;
        setEditingGrading({
          ...editingGrading,
          aLevelSubsidiaryGrading: updated,
        });
        showToast('Subsidiary boundaries harmonized into contiguous ranges.', 'success');
      }
    }
  };

  const handleSaveGradingConfig = () => {
    if (!hasPermission('Academics', 'edit')) {
      showToast('You do not have permission to modify grading policies.', 'alert');
      return;
    }

    const updatedSettings = {
      ...settings,
      caWeight: editingGrading.caWeight,
      examWeight: editingGrading.examWeight,
      oLevelGrading: editingGrading.oLevelGrading,
      aLevelGrading: editingGrading.aLevelGrading,
      aLevelSubsidiaryGrading: editingGrading.aLevelSubsidiaryGrading,
    };
    db.updateSettings(updatedSettings, currentUser.fullName, activeRole);
    refreshData();
    showToast('O-Level & A-Level grading policies saved successfully!', 'success');
  };

  const handleRecalculateStudentMarks = () => {
    if (!hasPermission('Academics', 'edit')) {
      showToast('You do not have permission to recalculate student marks.', 'alert');
      return;
    }

    setIsRecalculating(true);
    setTimeout(() => {
      // First save active rules to database
      const updatedSettings = {
        ...settings,
        caWeight: editingGrading.caWeight,
        examWeight: editingGrading.examWeight,
        oLevelGrading: editingGrading.oLevelGrading,
        aLevelGrading: editingGrading.aLevelGrading,
        aLevelSubsidiaryGrading: editingGrading.aLevelSubsidiaryGrading,
      };
      db.updateSettings(updatedSettings, currentUser.fullName, activeRole);

      // Trigger mass recalculation
      const count = db.recalculateAllMarks(currentUser.fullName, activeRole);
      refreshData();
      setIsRecalculating(false);
      showToast(`Recalculated grading & UACE points across ${count} student mark records!`, 'success');
    }, 450);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-tab Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
              <GraduationCap className="w-5 h-5 text-amber-400" />
              Academic Assessment & UNEB Curriculum Engine
            </h2>
            <p className="text-xs text-slate-400">
              Ugandan Lower Secondary (2026 UCE Competency Scale A–E) & Upper Secondary (UACE Points 0–20)
            </p>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('marks')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'marks'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              Teacher Mark Entry
            </button>
            <button
              onClick={() => setActiveSubTab('subjects')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'subjects'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Subject Master ({subjects.length})
            </button>
            <button
              onClick={() => setActiveSubTab('olevel-grading')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'olevel-grading'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-emerald-300" />
              O-Level (A–E) Grading
            </button>
            <button
              onClick={() => setActiveSubTab('alevel-grading')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'alevel-grading'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
              A-Level Grading & Points
            </button>
            <button
              onClick={() => setActiveSubTab('weights')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'weights'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              CA & Exam Weights
            </button>
            <button
              onClick={() => setActiveSubTab('combinations')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'combinations'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              A-Level Combinations
            </button>
            {['Super Administrator', 'School Administrator'].includes(activeRole) && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to PERMANENTLY delete ALL student mark records in the system? This action cannot be undone.')) {
                    db.clearAllMarks(currentUser.fullName, activeRole);
                    refreshData();
                    handleSelectChange();
                    showToast('All marks have been cleared from the system.', 'success');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg transition-all text-xs font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Marks
              </button>
            )}
            <button onClick={handleExportStudentList} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-lg transition-all text-xs font-bold">
              <Download className="w-3.5 h-3.5" /> Download Student List
            </button>
            <button onClick={handleExportMarks} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-lg transition-all text-xs font-bold">
              <Download className="w-3.5 h-3.5" /> Export Marks
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 rounded-lg transition-all text-xs font-bold">
              <FileCheck className="w-3.5 h-3.5" /> Import Marks
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImportMarks} className="hidden" accept=".xlsx, .xls" />
          </div>
        </div>
      </div>

      {/* Sub-tab 1: Teacher Mark Entry Sheet */}
      {activeSubTab === 'marks' && (
        <div className="space-y-4">
          {/* Filter & Selector Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Select Class */}
            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                Academic Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedClass(val);
                  const isNewA = val.startsWith('S.5') || val.startsWith('S.6');
                  const relevantSubs = subjects.filter((s) =>
                    isNewA ? s.level === 'A-Level' : s.level === 'O-Level'
                  );
                  const nextSubId = relevantSubs[0]?.id || selectedSubjectId;
                  setSelectedSubjectId(nextSubId);
                  handleSelectChange(val, selectedStream, nextSubId, selectedTerm);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
              >
                <option value="S.1">S.1 (O-Level Lower)</option>
                <option value="S.2">S.2 (O-Level Lower)</option>
                <option value="S.3">S.3 (O-Level Upper)</option>
                <option value="S.4">S.4 (O-Level Candidate)</option>
                <option value="S.5">S.5 (A-Level Junior)</option>
                <option value="S.6">S.6 (A-Level Candidate)</option>
              </select>
            </div>

            {/* Select Stream */}
            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                Stream / Arm
              </label>
              <select
                value={selectedStream}
                onChange={(e) => {
                  setSelectedStream(e.target.value);
                  handleSelectChange(selectedClass, e.target.value, selectedSubjectId, selectedTerm);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
              >
                <option value="North">North Stream</option>
                <option value="South">South Stream</option>
                <option value="East">East Stream</option>
                <option value="A">Stream A</option>
                <option value="X">Stream X</option>
              </select>
            </div>

            {/* Select Subject */}
            <div className="lg:col-span-2">
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                Subject ({isALevel ? 'A-Level' : 'O-Level'})
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  handleSelectChange(selectedClass, selectedStream, e.target.value, selectedTerm);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
              >
                {levelSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name} ({s.papers?.length || 1} Paper{s.papers?.length !== 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Term */}
            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                Academic Term
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => {
                  setSelectedTerm(e.target.value);
                  handleSelectChange(selectedClass, selectedStream, selectedSubjectId, e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
              >
                <option value="Term I">Term I</option>
                <option value="Term II">Term II</option>
                <option value="Term III">Term III</option>
              </select>
            </div>
          </div>

          {/* Action & Entry Mode Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">Entry Mode:</span>
                <button
                  onClick={() => setEntryMode('standard')}
                  className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                    entryMode === 'standard'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CA (20%) + Exam (80%)
                </button>
                {activeSubject?.papers && activeSubject.papers.length > 1 && (
                  <button
                    onClick={() => setEntryMode('papers')}
                    className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                      entryMode === 'papers'
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Multi-Paper Mode ({activeSubject.papers.length} Papers)
                  </button>
                )}
              </div>

              <span className="text-slate-400">
                Enrolled Students: <strong className="text-white">{classStudents.length}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveMarksBatch}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl transition-all shadow-md"
              >
                <Save className="w-4 h-4" /> Save Marksheet
              </button>

              {hasPermission('Academics', 'approve') && (
                <button
                  onClick={handleApproveBatch}
                  className="flex items-center gap-2 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 font-semibold px-4 py-2 rounded-xl transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verify & Lock
                </button>
              )}
            </div>
          </div>

          {/* Marks Entry Sheet Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-sans font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Admission No</th>

                    {entryMode === 'papers' && activeSubject?.papers && activeSubject.papers.length > 0 ? (
                      activeSubject.papers.map((p) => (
                        <th key={p.id} className="p-3.5 w-28 text-center bg-slate-900/60">
                          {p.paperCode} ({p.paperType.slice(0, 4)}) Max {p.maxMarks || 100}
                        </th>
                      ))
                    ) : (
                      <>
                        <th className="p-3.5 w-28 text-center">CA (Max {settings.caWeight ?? 20})</th>
                        <th className="p-3.5 w-28 text-center">Exam (Max {settings.examWeight ?? 80})</th>
                      </>
                    )}

                    <th className="p-3.5 w-24 text-center bg-slate-950">Total (%)</th>
                    <th className="p-3.5 w-20 text-center">Grade</th>
                    <th className="p-3.5 w-24 text-center">
                      {isALevel ? 'UACE Pts' : 'Points'}
                    </th>
                    <th className="p-3.5 w-32">Competency Level</th>
                    <th className="p-3.5">Teacher Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-500">
                        No active students found in {selectedClass} {selectedStream}. Register students or select another class stream.
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((std) => {
                      const entry = localMarksMap[std.id] || { ca: 15, exam: 58, paperScores: {}, comment: '' };
                      const computed = calculateStudentTotalAndGrade(std.id);

                      return (
                        <tr key={std.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-bold text-white whitespace-nowrap">
                            {std.firstName} {std.lastName}
                          </td>
                          <td className="p-3.5 font-mono text-amber-300/90 whitespace-nowrap">
                            {std.admissionNo}
                          </td>

                          {entryMode === 'papers' && activeSubject?.papers && activeSubject.papers.length > 0 ? (
                            activeSubject.papers.map((p) => (
                              <td key={p.id} className="p-3.5 text-center bg-slate-950/40">
                                <input
                                  type="number"
                                  min={0}
                                  max={p.maxMarks || 100}
                                  value={entry.paperScores[p.paperCode] ?? 60}
                                  onChange={(e) =>
                                    handlePaperScoreChange(
                                      std.id,
                                      p.paperCode,
                                      Math.min(p.maxMarks || 100, Math.max(0, Number(e.target.value) || 0))
                                    )
                                  }
                                  className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                                />
                              </td>
                            ))
                          ) : (
                            <>
                              <td className="p-3.5 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={settings.caWeight ?? 20}
                                  value={entry.ca}
                                  onChange={(e) =>
                                    handleScoreChange(
                                      std.id,
                                      'ca',
                                      Math.min(settings.caWeight ?? 20, Math.max(0, Number(e.target.value) || 0))
                                    )
                                  }
                                  className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                                />
                              </td>
                              <td className="p-3.5 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={settings.examWeight ?? 80}
                                  value={entry.exam}
                                  onChange={(e) =>
                                    handleScoreChange(
                                      std.id,
                                      'exam',
                                      Math.min(settings.examWeight ?? 80, Math.max(0, Number(e.target.value) || 0))
                                    )
                                  }
                                  className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                                />
                              </td>
                            </>
                          )}

                          <td className="p-3.5 text-center font-black text-sm text-white font-mono bg-slate-950">
                            {computed.totalScore}%
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-black font-mono text-xs ${
                                computed.grade === 'A' || computed.grade === 'D1'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                                  : computed.grade === 'E' || computed.grade === 'F' || computed.grade === 'F9'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                                  : 'bg-blue-950 text-blue-300 border border-blue-700/60'
                              }`}
                            >
                              {computed.grade}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-bold font-mono">
                            {isALevel ? (
                              <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 text-xs">
                                {computed.points} {computed.points === 1 ? 'pt' : 'pts'}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px] font-sans italic" title="O-Level 2026 uses grades only, no points">
                                — (Grade only)
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="text-[11px] font-semibold text-slate-300">
                              {computed.achievementLevel}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <input
                              type="text"
                              value={entry.comment}
                              onChange={(e) => handleScoreChange(std.id, 'comment', e.target.value)}
                              className="w-full min-w-[160px] bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                            />
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
      )}

      {/* Sub-tab 2: Subject Master Management */}
      {activeSubTab === 'subjects' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                Masaba Secondary School UNEB Subject Database ({subjects.length} Subjects)
              </h3>
              <p className="text-xs text-slate-400">
                Configure subject codes, names, paper compositions (Theory/Practical/Project), and academic levels.
              </p>
            </div>

            {hasPermission('Academics', 'edit') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadSubjectsPreset}
                  disabled={isLoadingSubjectsPreset}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm shrink-0 disabled:opacity-50"
                  title="Populate standard Ugandan UNEB O-Level & A-Level curriculum subjects"
                >
                  {isLoadingSubjectsPreset ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" /> Loading Subjects...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4 text-indigo-400" /> Load UNEB Subjects (O/A-Level)
                    </>
                  )}
                </button>

                <button
                  onClick={handleOpenNewSubjectModal}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add UNEB Subject
                </button>
              </div>
            )}
          </div>

          {/* Subjects Grid */}
          {subjects.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-900/30 border border-blue-700/50 rounded-2xl flex items-center justify-center mx-auto text-blue-400">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-white font-serif">No Curriculum Subjects Found</h3>
                <p className="text-xs text-slate-400">
                  Load the standard Ugandan UNEB curriculum subjects (UCE O-Level core & electives and UACE A-Level principals & subsidiaries) or create subjects manually.
                </p>
              </div>
              {hasPermission('Academics', 'edit') && (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleLoadSubjectsPreset}
                    disabled={isLoadingSubjectsPreset}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50"
                  >
                    {isLoadingSubjectsPreset ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-white animate-spin" /> Loading Standard Subjects...
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4 text-white" /> Load Standard UNEB Subjects (UCE & UACE)
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleOpenNewSubjectModal}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
                  >
                    <Plus className="w-4 h-4 text-blue-400" /> Add Custom Subject
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((sub) => (
                <div
                  key={sub.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 text-xs ${
                    sub.status === 'Inactive'
                      ? 'bg-slate-950/40 border-slate-800 opacity-60'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-300 font-mono text-base">{sub.code}</span>
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

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        sub.status === 'Active'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {sub.status || 'Active'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-sm">{sub.name}</h4>
                    <p className="text-slate-400 text-[11px]">
                      Category: <strong className="text-slate-300">{sub.category}</strong> • Dept:{' '}
                      <strong className="text-slate-300">{sub.department}</strong>
                    </p>
                  </div>

                  {/* Papers Breakdown */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Papers ({sub.papers?.length || 1}):
                    </span>
                    <div className="space-y-1">
                      {(sub.papers || []).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-[11px] text-slate-300"
                        >
                          <span>
                            <strong className="font-mono text-amber-300">{p.paperCode}</strong> — {p.paperName}
                          </span>
                          <span className="text-slate-400 text-[10px]">{p.paperType}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  {hasPermission('Academics', 'edit') && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditSubject(sub)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                          title="Edit Subject"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-400" /> Edit
                        </button>
                        <button
                          onClick={() => handleDuplicateSubject(sub.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                          title="Duplicate Subject"
                        >
                          <Copy className="w-3.5 h-3.5 text-indigo-400" /> Copy
                        </button>
                        <button
                          onClick={() => handleToggleSubjectStatus(sub.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                        >
                          {sub.status === 'Inactive' ? 'Activate' : 'Deactivate'}
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteSubject(sub.id)}
                        className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40"
                        title="Delete Subject"
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
      )}

      {/* Sub-tab 3: O-Level Grading Administration Interface */}
      {activeSubTab === 'olevel-grading' && (
        <div className="space-y-6">
          {/* Header & Policy Presets */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> 2026 UCE Competency Framework
                  </span>
                  <span className="text-xs text-slate-400">• Lower Secondary (S.1–S.4)</span>
                </div>
                <h3 className="text-lg font-bold text-white font-serif">
                  O-Level Competency Grading Administration
                </h3>
                <p className="text-xs text-slate-400 max-w-3xl">
                  Configure and customize percentage score ranges, achievement competency levels, aggregate points, and pass/fail statuses for grades A through E.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSaveGradingConfig}
                  disabled={!hasPermission('Academics', 'edit')}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                >
                  <Save className="w-4 h-4" /> Save O-Level Grading Policy
                </button>
                <button
                  onClick={handleRecalculateStudentMarks}
                  disabled={isRecalculating || !hasPermission('Academics', 'edit')}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                  title="Apply current grading rules and recalculate all stored student mark records"
                >
                  <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                  {isRecalculating ? 'Recalculating...' : 'Apply & Recalculate Marks'}
                </button>
              </div>
            </div>

            {/* Quick Presets & Alignment Tools */}
            <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold text-slate-300">Quick Curriculum Presets:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleApplyOLevelPreset('uneb_2026')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 hover:border-blue-500"
                >
                  2026 UNEB Standard (A:80, B:70, C:60, D:50, E:0)
                </button>
                <button
                  onClick={() => handleApplyOLevelPreset('strict_honors')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 hover:border-purple-500"
                >
                  Strict Honors Scale (A:85, B:75, C:65, D:50, E:0)
                </button>
                <button
                  onClick={() => handleApplyOLevelPreset('pass_40')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 hover:border-amber-500"
                >
                  40% Pass Scale (A:80, B:65, C:50, D:40, E:0)
                </button>
                <button
                  onClick={handleAutoHarmonizeBoundaries}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-800/60 text-xs font-semibold transition-all flex items-center gap-1.5"
                  title="Snap and connect adjacent percentage boundaries without overlaps or gaps"
                >
                  <Scale className="w-3.5 h-3.5" /> Auto-Harmonize Boundaries
                </button>
              </div>
            </div>

            {/* Range Continuity Health Indicator & Spectrum Visualization */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    0% – 100% Score Spectrum Partition
                  </span>
                  {oLevelValidation.isValid ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Continuous & Valid
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Boundary Gaps/Overlaps
                    </span>
                  )}
                </div>
                <div className="text-slate-400 text-xs">
                  Minimum Pass Threshold: <strong className="text-emerald-400 font-mono font-bold">{oLevelValidation.minPassScore}% ({oLevelValidation.minPassGrade})</strong>
                </div>
              </div>

              {/* Multi-segment Spectrum Bar */}
              <div className="h-8 w-full bg-slate-950 rounded-xl border border-slate-800 p-1 flex items-center gap-1 overflow-hidden">
                {editingGrading.oLevelGrading
                  .slice()
                  .sort((a, b) => a.minScore - b.minScore)
                  .map((rule) => {
                    const span = Math.max(1, rule.maxScore - rule.minScore + 1);
                    const widthPercent = span;
                    const gradeBg =
                      rule.grade === 'A'
                        ? 'bg-emerald-600/90 text-emerald-100 border-emerald-500'
                        : rule.grade === 'B'
                        ? 'bg-blue-600/90 text-blue-100 border-blue-500'
                        : rule.grade === 'C'
                        ? 'bg-indigo-600/90 text-indigo-100 border-indigo-500'
                        : rule.grade === 'D'
                        ? 'bg-amber-600/90 text-amber-100 border-amber-500'
                        : 'bg-rose-600/90 text-rose-100 border-rose-500';

                    return (
                      <div
                        key={rule.grade}
                        style={{ width: `${widthPercent}%` }}
                        className={`h-full rounded-lg ${gradeBg} border flex items-center justify-center text-[11px] font-bold transition-all px-1 truncate shadow-xs`}
                        title={`Grade ${rule.grade}: ${rule.minScore}%–${rule.maxScore}% (${rule.achievementLevel || 'Competent'}) • ${rule.isPass ? 'PASS' : 'FAIL'}`}
                      >
                        <span className="font-mono">{rule.grade}</span>
                        <span className="hidden sm:inline text-[9px] opacity-85 ml-1">
                          ({rule.minScore}–{rule.maxScore}%)
                        </span>
                      </div>
                    );
                  })}
              </div>

              {/* Validation Warning Alert if invalid */}
              {!oLevelValidation.isValid && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs space-y-1.5">
                  <div className="font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Boundary Calibration Warnings:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-300/90">
                    {oLevelValidation.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <div className="pt-1">
                    <button
                      onClick={handleAutoHarmonizeBoundaries}
                      className="px-2.5 py-1 rounded bg-amber-900 hover:bg-amber-800 text-white text-[11px] font-bold transition-all"
                    >
                      Click here to auto-fix and harmonize boundaries
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grade Rules Editor Table / Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                  <Award className="w-4 h-4 text-amber-400" />
                  Defined O-Level Grade Scales (A, B, C, D, E)
                </h4>
                <p className="text-xs text-slate-400">
                  Edit minimum and maximum percentage thresholds, achievement descriptors, aggregate points, and pass/fail statuses.
                </p>
              </div>
            </div>

            {/* Individual Grade Cards */}
            <div className="space-y-3">
              {editingGrading.oLevelGrading.map((rule, idx) => {
                const isPass = rule.isPass !== undefined ? rule.isPass : rule.grade !== 'E';
                const gradeColor =
                  rule.grade === 'A'
                    ? { bg: 'bg-emerald-950', text: 'text-emerald-300', border: 'border-emerald-700', badge: 'bg-emerald-900/60 text-emerald-200' }
                    : rule.grade === 'B'
                    ? { bg: 'bg-blue-950', text: 'text-blue-300', border: 'border-blue-700', badge: 'bg-blue-900/60 text-blue-200' }
                    : rule.grade === 'C'
                    ? { bg: 'bg-indigo-950', text: 'text-indigo-300', border: 'border-indigo-700', badge: 'bg-indigo-900/60 text-indigo-200' }
                    : rule.grade === 'D'
                    ? { bg: 'bg-amber-950', text: 'text-amber-300', border: 'border-amber-700', badge: 'bg-amber-900/60 text-amber-200' }
                    : { bg: 'bg-rose-950', text: 'text-rose-300', border: 'border-rose-700', badge: 'bg-rose-900/60 text-rose-200' };

                return (
                  <div
                    key={rule.grade}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Grade Badge & Percentage Range */}
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl ${gradeColor.bg} ${gradeColor.text} ${gradeColor.border} border-2 flex flex-col items-center justify-center font-bold font-mono shadow-sm`}
                        >
                          <span className="text-lg leading-none">{rule.grade}</span>
                          <span className="text-[9px] uppercase tracking-wider opacity-80">Grade</span>
                        </div>

                        {/* Percentage Range Inputs */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Percentage Range (%)
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                              <span className="text-[11px] text-slate-400 mr-1.5 font-sans">Min:</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={rule.minScore}
                                onChange={(e) => {
                                  const updated = [...editingGrading.oLevelGrading];
                                  updated[idx].minScore = Number(e.target.value);
                                  setEditingGrading({ ...editingGrading, oLevelGrading: updated });
                                }}
                                className="w-12 bg-transparent text-center font-mono font-bold text-white text-xs focus:outline-none"
                              />
                              <span className="text-[11px] text-slate-400">%</span>
                            </div>

                            <span className="text-slate-500 font-bold">—</span>

                            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                              <span className="text-[11px] text-slate-400 mr-1.5 font-sans">Max:</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={rule.maxScore}
                                onChange={(e) => {
                                  const updated = [...editingGrading.oLevelGrading];
                                  updated[idx].maxScore = Number(e.target.value);
                                  setEditingGrading({ ...editingGrading, oLevelGrading: updated });
                                }}
                                className="w-12 bg-transparent text-center font-mono font-bold text-white text-xs focus:outline-none"
                              />
                              <span className="text-[11px] text-slate-400">%</span>
                            </div>

                            <span className="text-[10px] text-slate-500 ml-1 hidden sm:inline">
                              (Span: {rule.maxScore - rule.minScore + 1}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Achievement Level Descriptor */}
                      <div className="space-y-1 flex-1 lg:max-w-xs">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Achievement Competency Level
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={rule.achievementLevel || ''}
                            placeholder="e.g. Exceptional, Outstanding"
                            onChange={(e) => {
                              const updated = [...editingGrading.oLevelGrading];
                              updated[idx].achievementLevel = e.target.value;
                              setEditingGrading({ ...editingGrading, oLevelGrading: updated });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-bold focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Right: Pass/Fail Toggle & Points */}
                      <div className="flex items-center gap-4">
                        {/* Pass / Fail Switch */}
                        <div className="space-y-1 text-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Academic Status
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...editingGrading.oLevelGrading];
                              updated[idx].isPass = !isPass;
                              setEditingGrading({ ...editingGrading, oLevelGrading: updated });
                            }}
                            className={`px-3 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                              isPass
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                                : 'bg-rose-950/80 text-rose-300 border-rose-700 hover:bg-rose-900'
                            }`}
                            title="Click to toggle Pass / Fail status for this grade"
                          >
                            {isPass ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>PASS</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                <span>FAIL</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Points */}
                        <div className="space-y-1 text-right">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Points
                          </label>
                          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={rule.points}
                              onChange={(e) => {
                                const updated = [...editingGrading.oLevelGrading];
                                updated[idx].points = Number(e.target.value);
                                setEditingGrading({ ...editingGrading, oLevelGrading: updated });
                              }}
                              className="w-8 bg-transparent text-center font-mono font-bold text-amber-400 text-xs focus:outline-none"
                            />
                            <span className="text-[11px] text-slate-400 font-mono">Pts</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom row: Qualitative Competency Description */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        Official Transcript Remark:
                      </span>
                      <input
                        type="text"
                        value={rule.description}
                        onChange={(e) => {
                          const updated = [...editingGrading.oLevelGrading];
                          updated[idx].description = e.target.value;
                          setEditingGrading({ ...editingGrading, oLevelGrading: updated });
                        }}
                        className="w-full bg-slate-900/60 border border-slate-800 rounded px-2.5 py-1 text-slate-300 text-xs focus:outline-none focus:border-blue-500 focus:bg-slate-900"
                        placeholder="Pedagogical remark printed on official UNEB report cards..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Live Grade Simulator & Sandbox */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                    <Play className="w-4 h-4 text-emerald-400" />
                    Live Grade Calculation Simulator
                  </h4>
                  <p className="text-xs text-slate-400">
                    Test any percentage mark in real-time to preview how the grading engine categorizes learner performance.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  Interactive Test Bench
                </span>
              </div>

              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-white">Input Percentage Score:</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={simulatorScore}
                      onChange={(e) => setSimulatorScore(Number(e.target.value) || 0)}
                      className="w-16 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center font-mono font-bold text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <span className="font-mono font-bold text-emerald-400 text-sm">%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={simulatorScore}
                  onChange={(e) => setSimulatorScore(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0% (Elementary)</span>
                  <span>50% (Basic)</span>
                  <span>70% (Outstanding)</span>
                  <span>100% (Exceptional)</span>
                </div>
              </div>

              {/* Simulation Result Card */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-mono font-bold text-2xl border-2 shadow-md ${
                      simulatedResult.grade === 'A'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                        : simulatedResult.grade === 'B'
                        ? 'bg-blue-950 text-blue-300 border-blue-500'
                        : simulatedResult.grade === 'C'
                        ? 'bg-indigo-950 text-indigo-300 border-indigo-500'
                        : simulatedResult.grade === 'D'
                        ? 'bg-amber-950 text-amber-300 border-amber-500'
                        : 'bg-rose-950 text-rose-300 border-rose-500'
                    }`}
                  >
                    {simulatedResult.grade}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        Grade {simulatedResult.grade} ({simulatedResult.achievementLevel})
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          simulatedResult.isPass
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {simulatedResult.isPass ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 italic">
                      "{simulatedResult.description}"
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                    Aggregate Contribution
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-lg">
                    {simulatedResult.points} {simulatedResult.points === 1 ? 'Point' : 'Points'}
                  </span>
                </div>
              </div>
            </div>

            {/* Curriculum Policy Info & Division Benchmarks */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Uganda UCE Benchmarks
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Passing Grade Floor:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      Grade {oLevelValidation.minPassGrade} (≥ {oLevelValidation.minPassScore}%)
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Top Mastery Grade:</span>
                    <span className="font-mono font-bold text-emerald-300">
                      Grade A (80%–100%)
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Remedial Tier:</span>
                    <span className="font-mono font-bold text-rose-400">
                      Grade E (0%–49%)
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Curriculum Scope:</span>
                    <span className="font-bold text-slate-200">
                      Senior 1 – Senior 4
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/60 text-blue-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400" /> Official UNEB Compliance
                </div>
                <p className="text-[11px] text-blue-300/80 leading-relaxed">
                  The 2026 Lower Secondary curriculum replaces legacy Division 1–4 aggregates with Competency Level Profiles (A–E) computed across Continuous Assessment (20%) and End-of-Cycle (80%).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 4: Dedicated A-Level Grading Administration Interface */}
      {activeSubTab === 'alevel-grading' && (
        <div className="space-y-6">
          {/* Header & Main Control Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-serif flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-amber-400" />
                  A-Level (UACE) Grading Scale & Points Administration
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Define percentage score ranges, letter grades (A–E), principal point weights (1–5), and subsidiary point rules (1 pt) for Senior 5 & Senior 6.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleSaveGradingConfig}
                  disabled={!hasPermission('Academics', 'edit')}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
                >
                  <Save className="w-4 h-4" /> Save A-Level Policy
                </button>
                <button
                  onClick={handleRecalculateStudentMarks}
                  disabled={isRecalculating || !hasPermission('Academics', 'edit')}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 border border-amber-800/60 font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                  title="Apply current A-Level grading rules and recalculate all student marks & UACE points"
                >
                  <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                  {isRecalculating ? 'Recalculating...' : 'Apply & Recalculate Points'}
                </button>
              </div>
            </div>

            {/* Sub-view Switcher: Principal vs Subsidiary vs Sandbox */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setALevelAdminTab('principal')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                  aLevelAdminTab === 'principal'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Award className="w-4 h-4 text-amber-300" />
                Principal Subjects Scale (A=5, B=4, C=3, D=2, E=1)
              </button>
              <button
                onClick={() => setALevelAdminTab('subsidiary')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                  aLevelAdminTab === 'subsidiary'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4 text-amber-300" />
                Subsidiary Subjects Scale (A–E Fixed 1 Point)
              </button>
              <button
                onClick={() => setALevelAdminTab('simulator')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                  aLevelAdminTab === 'simulator'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Play className="w-4 h-4 text-purple-300" />
                Live Simulator & 20-Point Sandbox
              </button>
            </div>

            {/* Quick Curriculum Presets & Alignment Tools */}
            <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold text-slate-300">Curriculum Presets:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleApplyALevelPreset('uneb_standard')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all hover:border-amber-500"
                >
                  UNEB Standard (A:80, B:70, C:60, D:50, E:0 | Sub=1 Pt)
                </button>
                <button
                  onClick={() => handleApplyALevelPreset('strict_distinction')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all hover:border-purple-500"
                >
                  Strict Honors Scale (A:85, B:75, C:65, D:50, E:0)
                </button>
                <button
                  onClick={() => handleApplyALevelPreset('lenient_credit')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all hover:border-blue-500"
                >
                  Flexible Credit Scale (A:80, B:65, C:50, D:40, E:0)
                </button>
                <button
                  onClick={() => handleHarmonizeALevelBoundaries(aLevelAdminTab === 'subsidiary' ? 'subsidiary' : 'principal')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-800/60 text-xs font-semibold transition-all flex items-center gap-1.5"
                  title="Snap and connect adjacent percentage boundaries without overlaps or gaps"
                >
                  <Scale className="w-3.5 h-3.5" /> Auto-Harmonize {aLevelAdminTab === 'subsidiary' ? 'Subsidiary' : 'Principal'}
                </button>
              </div>
            </div>

            {/* Spectrum Partition & Range Continuity Indicator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    0% – 100% {aLevelAdminTab === 'subsidiary' ? 'Subsidiary' : 'Principal'} Score Spectrum
                  </span>
                  {aLevelValidation.isValid ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Continuous & Valid
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Calibration Warning
                    </span>
                  )}
                </div>
                <div className="text-slate-400 text-xs">
                  {aLevelAdminTab === 'subsidiary' ? (
                    <span>Subsidiary Rule: <strong className="text-amber-400 font-bold">1 Pt fixed for A–E passes</strong></span>
                  ) : (
                    <span>Principal Rule: <strong className="text-emerald-400 font-bold">A=5, B=4, C=3, D=2, E=1</strong></span>
                  )}
                </div>
              </div>

              {/* Spectrum Visualization Bar */}
              <div className="h-8 w-full bg-slate-950 rounded-xl border border-slate-800 p-1 flex items-center gap-1 overflow-hidden">
                {(aLevelAdminTab === 'subsidiary' ? editingGrading.aLevelSubsidiaryGrading : editingGrading.aLevelGrading)
                  .slice()
                  .sort((a, b) => a.minScore - b.minScore)
                  .map((rule) => {
                    const span = Math.max(1, rule.maxScore - rule.minScore + 1);
                    const gradeBg =
                      rule.grade === 'A'
                        ? 'bg-emerald-600/90 text-emerald-100 border-emerald-500'
                        : rule.grade === 'B'
                        ? 'bg-blue-600/90 text-blue-100 border-blue-500'
                        : rule.grade === 'C'
                        ? 'bg-indigo-600/90 text-indigo-100 border-indigo-500'
                        : rule.grade === 'D'
                        ? 'bg-amber-600/90 text-amber-100 border-amber-500'
                        : 'bg-rose-600/90 text-rose-100 border-rose-500';

                    return (
                      <div
                        key={rule.grade}
                        style={{ width: `${span}%` }}
                        className={`h-full rounded-lg ${gradeBg} border flex items-center justify-center text-[11px] font-bold transition-all px-1 truncate shadow-xs`}
                        title={`Grade ${rule.grade}: ${rule.minScore}%–${rule.maxScore}% • ${rule.points} Pt(s) • ${rule.achievementLevel || ''}`}
                      >
                        <span className="font-mono">{rule.grade}</span>
                        <span className="hidden sm:inline text-[9px] opacity-85 ml-1">
                          ({rule.minScore}–{rule.maxScore}%)
                        </span>
                      </div>
                    );
                  })}
              </div>

              {/* Validation Warning Alert */}
              {!aLevelValidation.isValid && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs space-y-1.5">
                  <div className="font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    A-Level Grading Validation Warnings:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-300/90">
                    {aLevelValidation.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <div className="pt-1">
                    <button
                      onClick={() => handleHarmonizeALevelBoundaries(aLevelAdminTab === 'subsidiary' ? 'subsidiary' : 'principal')}
                      className="px-2.5 py-1 rounded bg-amber-900 hover:bg-amber-800 text-white text-[11px] font-bold transition-all"
                    >
                      Click here to auto-harmonize {aLevelAdminTab === 'subsidiary' ? 'Subsidiary' : 'Principal'} boundaries
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Principal Subjects Scale Configuration */}
          {aLevelAdminTab === 'principal' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                    <Award className="w-4 h-4 text-amber-400" />
                    Principal Subject Grading Scale (A, B, C, D, E)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Principal subjects earn full points (A=5, B=4, C=3, D=2, E=1) contributing up to 15 aggregate points across 3 principal subjects.
                  </p>
                </div>
              </div>

              {/* Individual Principal Grade Cards */}
              <div className="space-y-3">
                {editingGrading.aLevelGrading.map((rule, idx) => {
                  const isPass = rule.isPass !== undefined ? rule.isPass : true;
                  const gradeColor =
                    rule.grade === 'A'
                      ? { bg: 'bg-emerald-950', text: 'text-emerald-300', border: 'border-emerald-700' }
                      : rule.grade === 'B'
                      ? { bg: 'bg-blue-950', text: 'text-blue-300', border: 'border-blue-700' }
                      : rule.grade === 'C'
                      ? { bg: 'bg-indigo-950', text: 'text-indigo-300', border: 'border-indigo-700' }
                      : rule.grade === 'D'
                      ? { bg: 'bg-amber-950', text: 'text-amber-300', border: 'border-amber-700' }
                      : { bg: 'bg-rose-950', text: 'text-rose-300', border: 'border-rose-700' };

                  return (
                    <div
                      key={rule.grade}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Grade Badge & Percentage Range */}
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl ${gradeColor.bg} ${gradeColor.text} ${gradeColor.border} border-2 flex flex-col items-center justify-center font-bold font-mono shadow-sm`}
                          >
                            <span className="text-lg leading-none">{rule.grade}</span>
                            <span className="text-[9px] uppercase tracking-wider opacity-80">Principal</span>
                          </div>

                          {/* Percentage Range Inputs */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Percentage Range (%)
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                                <span className="text-[11px] text-slate-400 mr-1.5 font-sans">Min:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={rule.minScore}
                                  onChange={(e) => {
                                    const updated = [...editingGrading.aLevelGrading];
                                    updated[idx].minScore = Number(e.target.value);
                                    setEditingGrading({ ...editingGrading, aLevelGrading: updated });
                                  }}
                                  className="w-12 bg-transparent text-center font-mono font-bold text-white text-xs focus:outline-none"
                                />
                                <span className="text-[11px] text-slate-400">%</span>
                              </div>

                              <span className="text-slate-500 font-bold">—</span>

                              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                                <span className="text-[11px] text-slate-400 mr-1.5 font-sans">Max:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={rule.maxScore}
                                  onChange={(e) => {
                                    const updated = [...editingGrading.aLevelGrading];
                                    updated[idx].maxScore = Number(e.target.value);
                                    setEditingGrading({ ...editingGrading, aLevelGrading: updated });
                                  }}
                                  className="w-12 bg-transparent text-center font-mono font-bold text-white text-xs focus:outline-none"
                                />
                                <span className="text-[11px] text-slate-400">%</span>
                              </div>

                              <span className="text-[10px] text-slate-500 ml-1 hidden sm:inline">
                                (Span: {rule.maxScore - rule.minScore + 1}%)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Achievement Level Descriptor */}
                        <div className="space-y-1 flex-1 lg:max-w-xs">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Achievement Level
                          </label>
                          <input
                            type="text"
                            value={rule.achievementLevel || ''}
                            placeholder="e.g. Distinction, Credit, Pass"
                            onChange={(e) => {
                              const updated = [...editingGrading.aLevelGrading];
                              updated[idx].achievementLevel = e.target.value;
                              setEditingGrading({ ...editingGrading, aLevelGrading: updated });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-bold focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Right: Points Assignment & Pass/Fail */}
                        <div className="flex items-center gap-4">
                          {/* Points Config */}
                          <div className="space-y-1 text-right">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Assigned Points
                            </label>
                            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                              <input
                                type="number"
                                min={0}
                                max={10}
                                value={rule.points}
                                onChange={(e) => {
                                  const updated = [...editingGrading.aLevelGrading];
                                  updated[idx].points = Number(e.target.value);
                                  setEditingGrading({ ...editingGrading, aLevelGrading: updated });
                                }}
                                className="w-8 bg-transparent text-center font-mono font-bold text-amber-400 text-xs focus:outline-none"
                              />
                              <span className="text-[11px] text-slate-400 font-mono">Pts</span>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="space-y-1 text-center">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Pass Status
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...editingGrading.aLevelGrading];
                                updated[idx].isPass = !isPass;
                                setEditingGrading({ ...editingGrading, aLevelGrading: updated });
                              }}
                              className={`px-3 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                                isPass
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                                  : 'bg-rose-950/80 text-rose-300 border-rose-700'
                              }`}
                            >
                              {isPass ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                              <span>{isPass ? 'PASS' : 'FAIL'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Description Remark */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                          Official Transcript Remark:
                        </span>
                        <input
                          type="text"
                          value={rule.description}
                          onChange={(e) => {
                            const updated = [...editingGrading.aLevelGrading];
                            updated[idx].description = e.target.value;
                            setEditingGrading({ ...editingGrading, aLevelGrading: updated });
                          }}
                          className="w-full bg-slate-900/60 border border-slate-800 rounded px-2.5 py-1 text-slate-300 text-xs focus:outline-none focus:border-amber-500 focus:bg-slate-900"
                          placeholder="Remark printed on official UACE transcripts..."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Subsidiary Subjects Scale Configuration */}
          {aLevelAdminTab === 'subsidiary' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    Subsidiary Subject Grading Scale (A, B, C, D, E)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Subsidiary subjects (Sub-Mathematics, Subsidiary ICT, General Paper) earn a fixed <strong className="text-amber-300">1 point</strong> for each passing grade (A–E) in accordance with UNEB UACE guidelines.
                  </p>
                </div>
              </div>

              {/* Individual Subsidiary Grade Cards */}
              <div className="space-y-3">
                {editingGrading.aLevelSubsidiaryGrading.map((rule, idx) => {
                  const gradeColor =
                    rule.grade === 'A'
                      ? { bg: 'bg-emerald-950', text: 'text-emerald-300', border: 'border-emerald-700' }
                      : rule.grade === 'B'
                      ? { bg: 'bg-blue-950', text: 'text-blue-300', border: 'border-blue-700' }
                      : rule.grade === 'C'
                      ? { bg: 'bg-indigo-950', text: 'text-indigo-300', border: 'border-indigo-700' }
                      : rule.grade === 'D'
                      ? { bg: 'bg-amber-950', text: 'text-amber-300', border: 'border-amber-700' }
                      : { bg: 'bg-rose-950', text: 'text-rose-300', border: 'border-rose-700' };

                  return (
                    <div
                      key={rule.grade}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Grade Badge & Percentage Range */}
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl ${gradeColor.bg} ${gradeColor.text} ${gradeColor.border} border-2 flex flex-col items-center justify-center font-bold font-mono shadow-sm`}
                          >
                            <span className="text-lg leading-none">{rule.grade}</span>
                            <span className="text-[9px] uppercase tracking-wider opacity-80">Subsidiary</span>
                          </div>

                          {/* Percentage Range Inputs */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Percentage Range (%)
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                                <span className="text-[11px] text-slate-400 mr-1.5 font-sans">Min:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={rule.minScore}
                                  onChange={(e) => {
                                    const updated = [...editingGrading.aLevelSubsidiaryGrading];
                                    updated[idx].minScore = Number(e.target.value);
                                    setEditingGrading({ ...editingGrading, aLevelSubsidiaryGrading: updated });
                                  }}
                                  className="w-12 bg-transparent text-center font-mono font-bold text-white text-xs focus:outline-none"
                                />
                                <span className="text-[11px] text-slate-400">%</span>
                              </div>

                              <span className="text-slate-500 font-bold">—</span>

                              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                                <span className="text-[11px] text-slate-400 mr-1.5 font-sans">Max:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={rule.maxScore}
                                  onChange={(e) => {
                                    const updated = [...editingGrading.aLevelSubsidiaryGrading];
                                    updated[idx].maxScore = Number(e.target.value);
                                    setEditingGrading({ ...editingGrading, aLevelSubsidiaryGrading: updated });
                                  }}
                                  className="w-12 bg-transparent text-center font-mono font-bold text-white text-xs focus:outline-none"
                                />
                                <span className="text-[11px] text-slate-400">%</span>
                              </div>

                              <span className="text-[10px] text-slate-500 ml-1 hidden sm:inline">
                                (Span: {rule.maxScore - rule.minScore + 1}%)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Achievement Level Descriptor */}
                        <div className="space-y-1 flex-1 lg:max-w-xs">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Achievement Level
                          </label>
                          <input
                            type="text"
                            value={rule.achievementLevel || ''}
                            placeholder="e.g. Subsidiary Distinction, Credit"
                            onChange={(e) => {
                              const updated = [...editingGrading.aLevelSubsidiaryGrading];
                              updated[idx].achievementLevel = e.target.value;
                              setEditingGrading({ ...editingGrading, aLevelSubsidiaryGrading: updated });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-bold focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Right: Locked Fixed 1 Point Badge */}
                        <div className="flex items-center gap-3">
                          <div className="space-y-1 text-right">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Subsidiary Points
                            </label>
                            <div className="px-3 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-700/60 font-mono font-bold text-xs flex items-center gap-1.5" title="Fixed at 1 point per UNEB UACE subsidiary regulation">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                              <span>1 Point (Fixed)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Description Remark */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                          Official Transcript Remark:
                        </span>
                        <input
                          type="text"
                          value={rule.description}
                          onChange={(e) => {
                            const updated = [...editingGrading.aLevelSubsidiaryGrading];
                            updated[idx].description = e.target.value;
                            setEditingGrading({ ...editingGrading, aLevelSubsidiaryGrading: updated });
                          }}
                          className="w-full bg-slate-900/60 border border-slate-800 rounded px-2.5 py-1 text-slate-300 text-xs focus:outline-none focus:border-amber-500 focus:bg-slate-900"
                          placeholder="Remark printed on official UACE transcripts..."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Live Dual-Engine Simulator & 20-Point Combination Sandbox */}
          {aLevelAdminTab === 'simulator' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Single Subject Live Simulator */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                        <Play className="w-4 h-4 text-purple-400" />
                        Single Subject Simulator
                      </h4>
                      <p className="text-xs text-slate-400">
                        Test any percentage mark in real-time for Principal vs. Subsidiary rules.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                      Real-Time Test
                    </span>
                  </div>

                  <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-white">Subject Classification:</label>
                      <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-700">
                        <button
                          onClick={() => setALevelSimSubjectType('principal')}
                          className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                            aLevelSimSubjectType === 'principal'
                              ? 'bg-amber-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Principal (1–5 pts)
                        </button>
                        <button
                          onClick={() => setALevelSimSubjectType('subsidiary')}
                          className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                            aLevelSimSubjectType === 'subsidiary'
                              ? 'bg-amber-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Subsidiary (1 pt)
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-white">Input Percentage Score:</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={aLevelSimScore}
                          onChange={(e) => setALevelSimScore(Number(e.target.value) || 0)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center font-mono font-bold text-white text-sm focus:outline-none focus:border-purple-500"
                        />
                        <span className="font-mono font-bold text-purple-400 text-sm">%</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={aLevelSimScore}
                      onChange={(e) => setALevelSimScore(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  {/* Simulator Outcome Display */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-purple-900/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-950 text-purple-300 font-bold font-mono text-xl flex items-center justify-center border border-purple-700 shadow-sm">
                        {aLevelSimulatedResult.grade}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            Grade {aLevelSimulatedResult.grade} ({aLevelSimulatedResult.achievementLevel})
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            PASS
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 italic">
                          "{aLevelSimulatedResult.description}"
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                        UACE Contribution
                      </span>
                      <span className="font-mono font-bold text-amber-400 text-lg">
                        {aLevelSimulatedResult.points} {aLevelSimulatedResult.points === 1 ? 'Point' : 'Points'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 20-Point Combination Sandbox */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                        <Calculator className="w-4 h-4 text-emerald-400" />
                        Full Combination Sandbox (20 Points)
                      </h4>
                      <p className="text-xs text-slate-400">
                        Simulate 3 Principal Subjects (15 pts max) + 2 Subsidiary Subjects (2 pts max).
                      </p>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-sm bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800">
                      Total: {aLevelSandboxTotal.totalPoints} / 17 Pts
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {/* Principal 1 */}
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-300">Principal 1 (e.g. Physics):</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={aLevelSandboxScores.sub1Score}
                          onChange={(e) => setALevelSandboxScores({ ...aLevelSandboxScores, sub1Score: Number(e.target.value) || 0 })}
                          className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center font-mono text-white text-xs"
                        />
                        <span className="font-mono font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                          {aLevelSandboxTotal.s1.grade} ({aLevelSandboxTotal.s1.points} pts)
                        </span>
                      </div>
                    </div>

                    {/* Principal 2 */}
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-300">Principal 2 (e.g. Chemistry):</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={aLevelSandboxScores.sub2Score}
                          onChange={(e) => setALevelSandboxScores({ ...aLevelSandboxScores, sub2Score: Number(e.target.value) || 0 })}
                          className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center font-mono text-white text-xs"
                        />
                        <span className="font-mono font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                          {aLevelSandboxTotal.s2.grade} ({aLevelSandboxTotal.s2.points} pts)
                        </span>
                      </div>
                    </div>

                    {/* Principal 3 */}
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-300">Principal 3 (e.g. Mathematics):</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={aLevelSandboxScores.sub3Score}
                          onChange={(e) => setALevelSandboxScores({ ...aLevelSandboxScores, sub3Score: Number(e.target.value) || 0 })}
                          className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center font-mono text-white text-xs"
                        />
                        <span className="font-mono font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                          {aLevelSandboxTotal.s3.grade} ({aLevelSandboxTotal.s3.points} pts)
                        </span>
                      </div>
                    </div>

                    {/* Subsidiary 1 */}
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-300">Subsidiary 1 (e.g. Sub-Maths/ICT):</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={aLevelSandboxScores.sub4Score}
                          onChange={(e) => setALevelSandboxScores({ ...aLevelSandboxScores, sub4Score: Number(e.target.value) || 0 })}
                          className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center font-mono text-white text-xs"
                        />
                        <span className="font-mono font-bold text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                          {aLevelSandboxTotal.s4.grade} ({aLevelSandboxTotal.s4.points} pt)
                        </span>
                      </div>
                    </div>

                    {/* Subsidiary 2 */}
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-300">Subsidiary 2 (e.g. General Paper):</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={aLevelSandboxScores.sub5Score}
                          onChange={(e) => setALevelSandboxScores({ ...aLevelSandboxScores, sub5Score: Number(e.target.value) || 0 })}
                          className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center font-mono text-white text-xs"
                        />
                        <span className="font-mono font-bold text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                          {aLevelSandboxTotal.s5.grade} ({aLevelSandboxTotal.s5.points} pt)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Verdict */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-900/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Principal Points Subtotal:</span>
                      <strong className="text-amber-400 font-mono text-sm">{aLevelSandboxTotal.principalPoints} / 15 Pts</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Subsidiary Subtotal:</span>
                      <strong className="text-blue-400 font-mono text-sm">{aLevelSandboxTotal.subsidiaryPoints} / 2 Pts</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">University Direct Entry:</span>
                      <strong className="text-emerald-400 text-xs">
                        {aLevelSandboxTotal.principalPoints >= 2 ? 'Eligible (≥ 2 Principal Passes)' : 'Ineligible (< 2 Principal Passes)'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reference Benchmarks Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Official UNEB UACE Assessment & Weighting Reference
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-bold text-amber-300 block">Principal Subjects Scale</span>
                    <p className="text-slate-400 text-[11px]">
                      A = 5 pts, B = 4 pts, C = 3 pts, D = 2 pts, E = 1 pt. O and F do not yield points.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-bold text-blue-300 block">Subsidiary Subjects Scale</span>
                    <p className="text-slate-400 text-[11px]">
                      Any pass in Sub-Maths, Sub-ICT, or General Paper yields exactly 1 point.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-bold text-emerald-300 block">Maximum UACE Points</span>
                    <p className="text-slate-400 text-[11px]">
                      Maximum attainable score is 20 Points (3 Principal Distinctions @ 5 pts + 2 Subsidiary Passes @ 1 pt, or up to 20 pts under specialized 4-principal legacy schemes).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 5: CA & Exam Component Weights Config */}
      {activeSubTab === 'weights' && (
        <div className="space-y-6">
          {/* Assessment Weight Sliders */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" /> Continuous Assessment (CA) & Exam Component Weights
                </h3>
                <p className="text-xs text-slate-400">
                  Configure the Continuous Assessment (CA) vs. End-of-Cycle Examination percentage weight.
                </p>
              </div>
              <button
                onClick={handleSaveGradingConfig}
                disabled={!hasPermission('Academics', 'edit')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-md"
              >
                <Save className="w-4 h-4" /> Save Assessment Weights
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="font-bold text-white block">Continuous Assessment (CA) Weight (%)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={editingGrading.caWeight}
                  onChange={(e) => {
                    const ca = Number(e.target.value) || 0;
                    setEditingGrading({
                      ...editingGrading,
                      caWeight: ca,
                      examWeight: 100 - ca,
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-sm"
                />
                <p className="text-[11px] text-slate-400">Standard Ugandan 2026 Lower Secondary default is 20%.</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="font-bold text-white block">End-of-Cycle Examination Weight (%)</label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={editingGrading.examWeight}
                  onChange={(e) => {
                    const exam = Number(e.target.value) || 80;
                    setEditingGrading({
                      ...editingGrading,
                      examWeight: exam,
                      caWeight: 100 - exam,
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-sm"
                />
                <p className="text-[11px] text-slate-400">Standard Ugandan 2026 Lower Secondary default is 80%.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'combinations' && (
        <CombinationManagementModule />
      )}

      {/* Add / Edit Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base font-serif flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                {editingSubject ? `Edit Subject: ${editingSubject.code}` : 'Add New UNEB Subject'}
              </h3>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="p-6 space-y-4 text-xs text-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 545, 553, P210"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Subject Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chemistry, Mathematics"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Academic Level</label>
                  <select
                    value={subjectForm.level}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, level: e.target.value as 'O-Level' | 'A-Level' })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="O-Level">O-Level (S.1–S.4)</option>
                    <option value="A-Level">A-Level (S.5–S.6)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Category</label>
                  <select
                    value={subjectForm.category}
                    onChange={(e) => setSubjectForm({ ...subjectForm, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Compulsory">Compulsory</option>
                    <option value="Elective">Elective</option>
                    <option value="Principal">Principal (A-Level)</option>
                    <option value="Subsidiary">Subsidiary (A-Level)</option>
                    <option value="Vocational">Vocational / Skill</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Department</label>
                  <select
                    value={subjectForm.department}
                    onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Sciences">Sciences</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Humanities">Humanities</option>
                    <option value="Languages">Languages</option>
                    <option value="Vocational & Skills">Vocational & Skills</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Subject Status</label>
                  <select
                    value={subjectForm.status}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, status: e.target.value as 'Active' | 'Inactive' })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive (Archived)</option>
                  </select>
                </div>
              </div>

              {/* Papers Breakdown Editor */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs font-serif uppercase tracking-wider">
                    Papers Composition ({subjectForm.papers?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddPaperToForm}
                    className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-blue-300 font-semibold px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Paper
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(subjectForm.papers || []).map((paper, idx) => (
                    <div
                      key={paper.id || idx}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center text-xs"
                    >
                      <input
                        type="text"
                        placeholder="Paper Code (e.g. 545/1)"
                        value={paper.paperCode}
                        onChange={(e) => {
                          const updated = [...(subjectForm.papers || [])];
                          updated[idx].paperCode = e.target.value;
                          setSubjectForm({ ...subjectForm, papers: updated });
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-white text-xs"
                      />

                      <input
                        type="text"
                        placeholder="Paper Name"
                        value={paper.paperName}
                        onChange={(e) => {
                          const updated = [...(subjectForm.papers || [])];
                          updated[idx].paperName = e.target.value;
                          setSubjectForm({ ...subjectForm, papers: updated });
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-xs"
                      />

                      <select
                        value={paper.paperType}
                        onChange={(e) => {
                          const updated = [...(subjectForm.papers || [])];
                          updated[idx].paperType = e.target.value as any;
                          setSubjectForm({ ...subjectForm, papers: updated });
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-xs"
                      >
                        <option value="Theory">Theory</option>
                        <option value="Practical">Practical</option>
                        <option value="Project">Project</option>
                        <option value="Coursework">Coursework</option>
                      </select>

                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleRemovePaperFromForm(idx)}
                          className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs"
                          title="Remove Paper"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-xl text-xs shadow-md"
                >
                  <Save className="w-4 h-4" /> Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
