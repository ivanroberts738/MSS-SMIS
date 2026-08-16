import {
  SchoolSettings,
  ClassStream,
  Subject,
  Teacher,
  Student,
  MarkRecord,
  AttendanceRecord,
  FeeStructure,
  FeePayment,
  TimetableSlot,
  ExamSchedule,
  IncidentRecord,
  LibraryBook,
  InventoryItem,
  Announcement,
  SchoolEvent,
  SchoolDocument,
  AuditLog,
  UserAccount,
  NotificationItem,
  SubjectCombination,
  TeacherAssignment,
  Role,
} from '../types';

import {
  INITIAL_SETTINGS,
  INITIAL_CLASSES,
  INITIAL_SUBJECTS,
  INITIAL_TEACHERS,
  INITIAL_STUDENTS,
  INITIAL_MARKS,
  INITIAL_ATTENDANCE,
  INITIAL_FEE_STRUCTURES,
  INITIAL_PAYMENTS,
  INITIAL_TIMETABLE,
  INITIAL_EXAMS,
  INITIAL_INCIDENTS,
  INITIAL_BOOKS,
  INITIAL_INVENTORY,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_EVENTS,
  INITIAL_DOCUMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_USERS,
  INITIAL_NOTIFICATIONS,
  STANDARD_UGANDAN_CLASSES_PRESET,
  STANDARD_UGANDAN_SUBJECTS_PRESET,
} from '../data/initialData';
import { db as firestoreDb } from '../lib/firebase';
import { doc, setDoc, deleteDoc, addDoc, collection, writeBatch, onSnapshot } from 'firebase/firestore';
import { sanitizeForFirestore } from '../lib/firestoreUtils';

const STORAGE_KEY_PREFIX = 'masaba_smis_clean_v1_';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.error(`Error loading key ${key} from localStorage`, err);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving key ${key} to localStorage`, err);
  }
}

class SMISDatabaseService {
  private listeners: Array<() => void> = [];

  constructor() {
    this.initFirestoreSettingsListener();
  }

  private initFirestoreSettingsListener() {
    try {
      onSnapshot(
        doc(firestoreDb, 'settings', 'general'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as SchoolSettings;
            if (data && typeof data === 'object') {
              saveToStorage('settings', data);
              this.notify();
            }
          } else {
            // First time seeding if not present in Firestore
            const initial = loadFromStorage('settings', INITIAL_SETTINGS);
            setDoc(doc(firestoreDb, 'settings', 'general'), sanitizeForFirestore(initial), { merge: true }).catch((err) =>
              console.warn('Could not seed initial settings to Firestore:', err)
            );
          }
        },
        (err) => {
          console.warn('Firestore settings listener:', err);
        }
      );
    } catch (e) {
      console.warn('Error setting up settings listener:', e);
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // --- Reset All Data to Clean Initial State ---
  public clearAllData(actorName: string, actorRole: Role) {
    saveToStorage('settings', INITIAL_SETTINGS);
    saveToStorage('classes', []);
    saveToStorage('subjects', []);
    saveToStorage('teachers', []);
    saveToStorage('students', []);
    saveToStorage('marks', []);
    saveToStorage('attendance', []);
    saveToStorage('fee_structures', []);
    saveToStorage('payments', []);
    saveToStorage('timetable', []);
    saveToStorage('exams', []);
    saveToStorage('incidents', []);
    saveToStorage('books', []);
    saveToStorage('inventory', []);
    saveToStorage('announcements', []);
    saveToStorage('events', []);
    saveToStorage('documents', []);
    saveToStorage('users', INITIAL_USERS);
    saveToStorage('notifications', INITIAL_NOTIFICATIONS);

    this.addAuditLog(actorName, actorRole, 'WIPE_DATABASE', 'System', 'Database cleared to pristine empty state.');
    this.notify();
  }

  public resetToDemoData() {
    this.clearAllData('System Administrator', 'Super Administrator');
  }

  // Helper if admin wants standard UNEB Ugandan curriculum classes & subjects
  public async loadCurriculumPresets(actorName: string, actorRole: Role): Promise<void> {
    saveToStorage('classes', STANDARD_UGANDAN_CLASSES_PRESET);
    saveToStorage('subjects', STANDARD_UGANDAN_SUBJECTS_PRESET);
    
    // Sync classes and subjects to Cloud Firestore in batches
    try {
      const batch = writeBatch(firestoreDb);
      STANDARD_UGANDAN_CLASSES_PRESET.forEach((cls) => {
        const ref = doc(firestoreDb, 'classes', cls.id);
        batch.set(ref, sanitizeForFirestore(cls));
      });
      STANDARD_UGANDAN_SUBJECTS_PRESET.forEach((sub) => {
        const ref = doc(firestoreDb, 'subjects', sub.id);
        batch.set(ref, sanitizeForFirestore(sub));
      });
      await batch.commit();
    } catch (err) {
      console.warn('Could not sync curriculum presets batch to Firestore:', err);
    }

    this.addAuditLog(actorName, actorRole, 'IMPORT_PRESET', 'Academics', 'Imported standard Ugandan O/A-Level classes and curriculum subjects.');
    this.notify();
  }

  public async loadStandardClassesPreset(actorName: string, actorRole: Role): Promise<void> {
    saveToStorage('classes', STANDARD_UGANDAN_CLASSES_PRESET);
    try {
      const batch = writeBatch(firestoreDb);
      STANDARD_UGANDAN_CLASSES_PRESET.forEach((cls) => {
        const ref = doc(firestoreDb, 'classes', cls.id);
        batch.set(ref, sanitizeForFirestore(cls));
      });
      await batch.commit();
    } catch (err) {
      console.warn('Could not sync classes preset to Firestore:', err);
    }
    this.addAuditLog(actorName, actorRole, 'IMPORT_CLASSES_PRESET', 'Classes', 'Imported standard Ugandan O/A-Level classes.');
    this.notify();
  }

  public async loadStandardSubjectsPreset(actorName: string, actorRole: Role): Promise<void> {
    saveToStorage('subjects', STANDARD_UGANDAN_SUBJECTS_PRESET);
    try {
      const batch = writeBatch(firestoreDb);
      STANDARD_UGANDAN_SUBJECTS_PRESET.forEach((sub) => {
        const ref = doc(firestoreDb, 'subjects', sub.id);
        batch.set(ref, sanitizeForFirestore(sub));
      });
      await batch.commit();
    } catch (err) {
      console.warn('Could not sync subjects preset to Firestore:', err);
    }
    this.addAuditLog(actorName, actorRole, 'IMPORT_SUBJECTS_PRESET', 'Subjects', 'Imported standard UNEB curriculum subjects.');
    this.notify();
  }

  // --- Settings ---
  public getSettings(): SchoolSettings {
    const current = loadFromStorage('settings', INITIAL_SETTINGS);
    // Auto-migrate if stored settings point to legacy missing file name
    if (
      current.logoUrl &&
      (current.logoUrl.includes('masaba_school_logo_1786635546830') ||
        current.logoUrl.includes('undefined'))
    ) {
      current.logoUrl = INITIAL_SETTINGS.logoUrl;
      saveToStorage('settings', current);
    }
    // Ensure caWeight & examWeight exist
    if (current.caWeight === undefined) {
      current.caWeight = 20;
      current.examWeight = 80;
      current.projectWeight = 0;
      saveToStorage('settings', current);
    }
    if (!current.academicYears || current.academicYears.length === 0) {
      current.academicYears = INITIAL_SETTINGS.academicYears;
      saveToStorage('settings', current);
    }
    if (!current.terms || current.terms.length === 0) {
      current.terms = INITIAL_SETTINGS.terms;
      saveToStorage('settings', current);
    }
    if (!current.aLevelSubsidiaryGrading || current.aLevelSubsidiaryGrading.length === 0) {
      current.aLevelSubsidiaryGrading = INITIAL_SETTINGS.aLevelSubsidiaryGrading;
      saveToStorage('settings', current);
    }
    return current;
  }

  public updateSettings(settings: SchoolSettings, actorName: string, actorRole: Role) {
    saveToStorage('settings', settings);
    // Background sync to Firestore
    setDoc(doc(firestoreDb, 'settings', 'general'), sanitizeForFirestore(settings), { merge: true }).catch((err) =>
      console.warn('Could not sync settings to Firestore:', err)
    );
    this.addAuditLog(actorName, actorRole, 'UPDATE_SETTINGS', 'Settings', 'Updated global school settings and grading parameters.');
    this.notify();
  }

  public saveSettings(settings: SchoolSettings, actorName: string, actorRole: Role) {
    this.updateSettings(settings, actorName, actorRole);
  }

  // --- Dynamic UNEB Grading Calculation ---
  public calculateGrade(
    level: 'O-Level' | 'A-Level',
    totalMark: number,
    subject?: Subject
  ): {
    grade: string;
    points: number;
    achievementLevel: string;
    description: string;
    isPass: boolean;
  } {
    const settings = this.getSettings();
    const clampedScore = Math.max(0, Math.min(100, Math.round(totalMark)));

    if (level === 'O-Level') {
      // O-Level 2026 Lower Secondary Competency Rules (Grades Only, No Points)
      const oRules = settings.oLevelGrading || INITIAL_SETTINGS.oLevelGrading;
      const matched = oRules.find((r) => clampedScore >= r.minScore && clampedScore <= r.maxScore);
      if (matched) {
        let achievement = matched.achievementLevel;
        if (!achievement) {
          if (matched.grade === 'A') achievement = 'Exceptional';
          else if (matched.grade === 'B') achievement = 'Outstanding';
          else if (matched.grade === 'C') achievement = 'Satisfactory';
          else if (matched.grade === 'D') achievement = 'Basic';
          else if (matched.grade === 'E') achievement = 'Elementary';
          else achievement = 'Competent';
        }
        const isPass = matched.isPass !== undefined ? matched.isPass : matched.grade !== 'E' && matched.grade !== 'F9';
        return {
          grade: matched.grade,
          points: 0, // O-Level does NOT assign or calculate points
          achievementLevel: achievement,
          description: matched.description,
          isPass,
        };
      }
      return { grade: 'E', points: 0, achievementLevel: 'Elementary', description: 'Below basic level', isPass: false };
    } else {
      // A-Level UACE Rules
      const isSubsidiary =
        subject?.isSubsidiary ||
        subject?.category === 'Subsidiary' ||
        (subject?.code &&
          (subject.code.startsWith('S101') ||
            subject.code.startsWith('S850') ||
            subject.code.startsWith('S840') ||
            subject.code.toLowerCase().includes('sub')));

      if (isSubsidiary) {
        // Subsidiary Subjects Rule: Grades A-E all award exactly 1 Point. No O / F grades.
        const subRules = settings.aLevelSubsidiaryGrading || INITIAL_SETTINGS.aLevelSubsidiaryGrading || [];
        const matched = subRules.find((r) => clampedScore >= r.minScore && clampedScore <= r.maxScore);
        if (matched) {
          return {
            grade: matched.grade,
            points: 1, // Fixed 1 point for any valid subsidiary grade A-E
            achievementLevel: matched.classification || 'Subsidiary Pass',
            description: matched.description || `Subsidiary Grade ${matched.grade} (1 Pt)`,
            isPass: true,
          };
        }
        // Fallback lowest subsidiary tier (Grade E, exactly 1 point)
        return {
          grade: 'E',
          points: 1,
          achievementLevel: 'Subsidiary Elementary',
          description: 'Subsidiary Grade E (1 Pt)',
          isPass: true,
        };
      } else {
        // Principal Subjects Rule: Configurable point values (Default: A=5, B=4, C=3, D=2, E=1)
        const aRules = settings.aLevelGrading || INITIAL_SETTINGS.aLevelGrading;
        const matched = aRules.find((r) => clampedScore >= r.minScore && clampedScore <= r.maxScore);
        if (matched) {
          return {
            grade: matched.grade,
            points: matched.points ?? (matched.grade === 'A' ? 5 : matched.grade === 'B' ? 4 : matched.grade === 'C' ? 3 : matched.grade === 'D' ? 2 : 1),
            achievementLevel:
              matched.classification ||
              (matched.points >= 5 ? 'Distinction' : matched.points >= 3 ? 'Credit' : matched.points >= 2 ? 'Pass' : 'Elementary'),
            description: matched.description || `Principal Grade ${matched.grade} (${matched.points} Pts)`,
            isPass: matched.isPass !== undefined ? matched.isPass : true,
          };
        }
        return { grade: 'E', points: 1, achievementLevel: 'Elementary', description: 'Principal Elementary (1 Pt)', isPass: true };
      }
    }
  }

  // Calculate distinct Principal, Subsidiary, and Total Points for an A-Level Student
  public calculateStudentALevelPoints(
    studentId: string,
    term: string,
    academicYear: string
  ): {
    principalPoints: number;
    subsidiaryPoints: number;
    totalPoints: number;
    principalSubjectsCount: number;
    subsidiarySubjectsCount: number;
    summary: string;
  } {
    const studentMarks = this.getMarks().filter(
      (m) => m.studentId === studentId && m.term === term && m.academicYear === academicYear
    );
    const subjects = this.getSubjects();

    let principalPoints = 0;
    let subsidiaryPoints = 0;
    let principalSubjectsCount = 0;
    let subsidiarySubjectsCount = 0;

    studentMarks.forEach((m) => {
      const sub = subjects.find((s) => s.id === m.subjectId);
      const isSub =
        sub?.isSubsidiary ||
        sub?.category === 'Subsidiary' ||
        (sub?.code &&
          (sub.code.startsWith('S101') ||
            sub.code.startsWith('S850') ||
            sub.code.startsWith('S840') ||
            sub.code.toLowerCase().includes('sub')));

      if (isSub) {
        // Any valid grade A-E awards 1 point
        subsidiaryPoints += 1;
        subsidiarySubjectsCount++;
      } else {
        principalPoints += m.points || 0;
        principalSubjectsCount++;
      }
    });

    const totalPoints = principalPoints + subsidiaryPoints;
    const summary = `${totalPoints} Pts (${principalPoints} Principal + ${subsidiaryPoints} Subsidiary)`;

    return {
      principalPoints,
      subsidiaryPoints,
      totalPoints,
      principalSubjectsCount,
      subsidiarySubjectsCount,
      summary,
    };
  }

  // Recalculate stored marks against active grading policies
  public recalculateAllMarks(actorName: string, actorRole: Role): number {
    const marks = this.getMarks();
    const subjects = this.getSubjects();
    let updatedCount = 0;
    marks.forEach((m) => {
      const sub = subjects.find((s) => s.id === m.subjectId);
      const computed = this.calculateGrade(m.level, m.totalMark, sub);
      if (m.grade !== computed.grade || m.points !== computed.points || m.achievementLevel !== computed.achievementLevel) {
        m.grade = computed.grade;
        m.points = computed.points;
        m.achievementLevel = computed.achievementLevel;
        m.updatedAt = new Date().toISOString();
        updatedCount++;
      }
    });
    saveToStorage('marks', marks);
    this.addAuditLog(
      actorName,
      actorRole,
      'RECALCULATE_MARKS',
      'Academics',
      `Recalculated grading, points, and achievement levels across ${updatedCount} student mark records.`
    );
    this.notify();
    return updatedCount;
  }

  // --- Backup & Restore ---
  public exportDatabaseJSON(): string {
    const backupData = {
      settings: this.getSettings(),
      classes: this.getClasses(),
      subjects: this.getSubjects(),
      teachers: this.getTeachers(),
      teacher_assignments: this.getTeacherAssignments(),
      students: this.getStudents(),
      marks: this.getMarks(),
      attendance: this.getAttendance(),
      fee_structures: this.getFeeStructures(),
      payments: this.getPayments(),
      timetable: this.getTimetable(),
      exams: this.getExams(),
      incidents: this.getIncidents(),
      books: this.getBooks(),
      inventory: this.getInventory(),
      announcements: this.getAnnouncements(),
      events: this.getEvents(),
      documents: this.getDocuments(),
      audit_logs: this.getAuditLogs(),
      users: this.getUsers(),
      notifications: this.getNotifications(),
    };
    return JSON.stringify(backupData, null, 2);
  }

  public importDatabaseJSON(jsonContent: string, actorName: string, actorRole: Role) {
    const data = JSON.parse(jsonContent);
    if (data.settings) saveToStorage('settings', data.settings);
    if (data.classes) saveToStorage('classes', data.classes);
    if (data.subjects) saveToStorage('subjects', data.subjects);
    if (data.teachers) saveToStorage('teachers', data.teachers);
    if (data.teacher_assignments) saveToStorage('teacher_assignments', data.teacher_assignments);
    if (data.students) saveToStorage('students', data.students);
    if (data.marks) saveToStorage('marks', data.marks);
    if (data.attendance) saveToStorage('attendance', data.attendance);
    if (data.fee_structures) saveToStorage('fee_structures', data.fee_structures);
    if (data.payments) saveToStorage('payments', data.payments);
    if (data.timetable) saveToStorage('timetable', data.timetable);
    if (data.exams) saveToStorage('exams', data.exams);
    if (data.incidents) saveToStorage('incidents', data.incidents);
    if (data.books) saveToStorage('books', data.books);
    if (data.inventory) saveToStorage('inventory', data.inventory);
    if (data.announcements) saveToStorage('announcements', data.announcements);
    if (data.events) saveToStorage('events', data.events);
    if (data.documents) saveToStorage('documents', data.documents);
    if (data.audit_logs) saveToStorage('audit_logs', data.audit_logs);
    if (data.users) saveToStorage('users', data.users);
    if (data.notifications) saveToStorage('notifications', data.notifications);

    this.addAuditLog(actorName, actorRole, 'IMPORT_DATABASE', 'System', 'Restored complete database state from uploaded JSON file.');
    this.notify();
  }

  // --- Classes & Streams ---
  public getClasses(): ClassStream[] {
    const list = loadFromStorage('classes', INITIAL_CLASSES);
    return list.map((c) => ({
      ...c,
      status: (c as any).status || 'Active',
      capacity: c.capacity || 60,
    }));
  }

  public saveClass(cls: ClassStream, actorName: string, actorRole: Role) {
    const classes = this.getClasses();
    const existingIndex = classes.findIndex((c) => c.id === cls.id);
    if (existingIndex >= 0) {
      classes[existingIndex] = cls;
    } else {
      classes.push(cls);
    }
    saveToStorage('classes', classes);
    setDoc(doc(firestoreDb, 'classes', cls.id), sanitizeForFirestore(cls)).catch((err) =>
      console.warn('Could not sync class to Firestore:', err)
    );
    this.addAuditLog(actorName, actorRole, 'SAVE_CLASS', 'Classes', `Saved class stream ${cls.className} ${cls.streamName}`);
    this.notify();
  }

  public deleteClass(classId: string, actorName: string, actorRole: Role) {
    let classes = this.getClasses();
    const target = classes.find((c) => c.id === classId);
    classes = classes.filter((c) => c.id !== classId);
    saveToStorage('classes', classes);
    deleteDoc(doc(firestoreDb, 'classes', classId)).catch((err) =>
      console.warn('Could not delete class from Firestore:', err)
    );
    this.addAuditLog(actorName, actorRole, 'DELETE_CLASS', 'Classes', `Deleted class stream ${target?.className} ${target?.streamName}`);
    this.notify();
  }

  public toggleClassStatus(classId: string, actorName: string, actorRole: Role) {
    const classes = this.getClasses();
    const target = classes.find((c) => c.id === classId);
    if (target) {
      (target as any).status = (target as any).status === 'Inactive' ? 'Active' : 'Inactive';
      saveToStorage('classes', classes);
      setDoc(doc(firestoreDb, 'classes', target.id), sanitizeForFirestore(target), { merge: true }).catch((err) =>
        console.warn('Could not update class status in Firestore:', err)
      );
      this.addAuditLog(actorName, actorRole, 'TOGGLE_CLASS_STATUS', 'Classes', `Toggled status of ${target.className} ${target.streamName} to ${(target as any).status}`);
      this.notify();
    }
  }

  // --- Subjects & Papers ---
  public getSubjects(): Subject[] {
    const raw = loadFromStorage('subjects', INITIAL_SUBJECTS);
    return raw.map((s) => {
      // Normalize papers if missing or empty
      let papers = s.papers;
      if (!papers || papers.length === 0) {
        const count = s.paperCount || 1;
        papers = Array.from({ length: count }, (_, i) => ({
          id: `p-${s.id}-${i + 1}`,
          paperCode: `${s.code}/${i + 1}`,
          paperNumber: i + 1,
          paperName: count === 1 ? `${s.name} Paper 1` : i === 0 ? `${s.name} Paper 1 (Theory)` : `${s.name} Paper 2 (Practical)`,
          paperType: i === 1 && s.level === 'O-Level' ? 'Practical' : 'Theory',
          maxMarks: 100,
          duration: '2h 30m',
          status: 'Active',
        }));
      }
      return {
        ...s,
        category: s.category || (s.level === 'A-Level' ? (s.isSubsidiary ? 'Subsidiary' : 'Principal') : 'Compulsory'),
        paperCount: papers.length,
        papers,
        status: s.status || 'Active',
      };
    });
  }

  public saveSubject(subject: Subject, actorName: string, actorRole: Role) {
    const subjects = this.getSubjects();
    const existingIndex = subjects.findIndex((s) => s.id === subject.id);
    if (existingIndex >= 0) {
      subjects[existingIndex] = subject;
    } else {
      subjects.push(subject);
    }
    saveToStorage('subjects', subjects);
    setDoc(doc(firestoreDb, 'subjects', subject.id), sanitizeForFirestore(subject)).catch((err) =>
      console.warn('Could not sync subject to Firestore:', err)
    );
    this.addAuditLog(actorName, actorRole, 'SAVE_SUBJECT', 'Subjects', `Saved subject ${subject.code} - ${subject.name} (${subject.papers?.length || 1} papers)`);
    this.notify();
  }

  public toggleSubjectStatus(subjectId: string, actorName: string, actorRole: Role) {
    const subjects = this.getSubjects();
    const target = subjects.find((s) => s.id === subjectId);
    if (target) {
      target.status = target.status === 'Active' ? 'Inactive' : 'Active';
      saveToStorage('subjects', subjects);
      setDoc(doc(firestoreDb, 'subjects', target.id), sanitizeForFirestore(target), { merge: true }).catch((err) =>
        console.warn('Could not update subject status in Firestore:', err)
      );
      this.addAuditLog(actorName, actorRole, 'TOGGLE_SUBJECT_STATUS', 'Subjects', `Set subject ${target.code} (${target.name}) to ${target.status}`);
      this.notify();
    }
  }

  public duplicateSubject(subjectId: string, actorName: string, actorRole: Role) {
    const subjects = this.getSubjects();
    const target = subjects.find((s) => s.id === subjectId);
    if (target) {
      const newSubject: Subject = {
        ...target,
        id: `sub-${Date.now()}`,
        code: `${target.code}_COPY`,
        name: `${target.name} (Copy)`,
        papers: target.papers.map((p, idx) => ({
          ...p,
          id: `p-${Date.now()}-${idx + 1}`,
          paperCode: `${target.code}_COPY/${idx + 1}`,
        })),
      };
      subjects.push(newSubject);
      saveToStorage('subjects', subjects);
      setDoc(doc(firestoreDb, 'subjects', newSubject.id), sanitizeForFirestore(newSubject)).catch((err) =>
        console.warn('Could not duplicate subject to Firestore:', err)
      );
      this.addAuditLog(actorName, actorRole, 'DUPLICATE_SUBJECT', 'Subjects', `Duplicated subject ${target.code} to ${newSubject.code}`);
      this.notify();
    }
  }

  public deleteSubject(subjectId: string, actorName: string, actorRole: Role) {
    let subjects = this.getSubjects();
    const target = subjects.find((s) => s.id === subjectId);
    subjects = subjects.filter((s) => s.id !== subjectId);
    saveToStorage('subjects', subjects);
    deleteDoc(doc(firestoreDb, 'subjects', subjectId)).catch((err) =>
      console.warn('Could not delete subject from Firestore:', err)
    );
    this.addAuditLog(actorName, actorRole, 'DELETE_SUBJECT', 'Subjects', `Deleted subject ${target?.code} - ${target?.name}`);
    this.notify();
  }

  // --- Teachers ---
  public getTeachers(): Teacher[] {
    return loadFromStorage('teachers', INITIAL_TEACHERS);
  }

  public saveTeacher(teacher: Teacher) {
    const teachers = this.getTeachers();
    const existingIndex = teachers.findIndex((t) => t.id === teacher.id);
    if (existingIndex >= 0) {
      teachers[existingIndex] = teacher;
    } else {
      teachers.push(teacher);
    }
    saveToStorage('teachers', teachers);
    setDoc(doc(firestoreDb, 'teachers', teacher.id), sanitizeForFirestore(teacher)).catch((err) =>
      console.warn('Could not sync teacher to Firestore:', err)
    );
    this.notify();
  }

  public deleteTeacher(teacherId: string, actorName: string, actorRole: Role) {
    let teachers = this.getTeachers();
    const target = teachers.find((t) => t.id === teacherId);
    teachers = teachers.filter((t) => t.id !== teacherId);
    saveToStorage('teachers', teachers);
    deleteDoc(doc(firestoreDb, 'teachers', teacherId)).catch((err) =>
      console.warn('Could not delete teacher from Firestore:', err)
    );

    // Also clean up any assignments for this teacher
    let assignments = this.getTeacherAssignments();
    const teacherAssignments = assignments.filter((a) => a.teacherId === teacherId);
    if (teacherAssignments.length > 0) {
      assignments = assignments.filter((a) => a.teacherId !== teacherId);
      saveToStorage('teacher_assignments', assignments);
      teacherAssignments.forEach((a) => {
        deleteDoc(doc(firestoreDb, 'teacherAssignments', a.id)).catch((err) =>
          console.warn('Could not delete teacher assignment from Firestore:', err)
        );
      });
    }

    this.addAuditLog(actorName, actorRole, 'DELETE_TEACHER', 'Teachers', `Deleted teacher ${target?.firstName} ${target?.lastName}`);
    this.notify();
  }

  // --- Teacher Assignments ---
  public getTeacherAssignments(): TeacherAssignment[] {
    return loadFromStorage('teacher_assignments', []);
  }

  public saveTeacherAssignment(assignment: TeacherAssignment, actorName: string = 'Administrator', actorRole: Role = 'School Administrator') {
    const assignments = this.getTeacherAssignments();
    const existingIndex = assignments.findIndex((a) => a.id === assignment.id);
    if (existingIndex >= 0) {
      assignments[existingIndex] = assignment;
    } else {
      assignments.push(assignment);
    }
    saveToStorage('teacher_assignments', assignments);
    
    // Sync to Firestore
    setDoc(doc(firestoreDb, 'teacherAssignments', assignment.id), sanitizeForFirestore(assignment)).catch((err) =>
      console.warn('Could not sync teacher assignment to Firestore:', err)
    );

    // Synchronize teacher's assignedSubjectIds and assignedClassStreams
    try {
      const teachers = this.getTeachers();
      const teacher = teachers.find((t) => t.id === assignment.teacherId);
      if (teacher) {
        if (!teacher.assignedSubjectIds) teacher.assignedSubjectIds = [];
        if (!teacher.assignedSubjectIds.includes(assignment.subjectId)) {
          teacher.assignedSubjectIds.push(assignment.subjectId);
        }
        if (!teacher.assignedClassStreams) teacher.assignedClassStreams = [];
        const hasStream = teacher.assignedClassStreams.some(
          (cs) => cs.className === assignment.className && cs.stream === assignment.stream
        );
        if (!hasStream) {
          teacher.assignedClassStreams.push({ className: assignment.className, stream: assignment.stream });
        }
        saveToStorage('teachers', teachers);
        setDoc(doc(firestoreDb, 'teachers', teacher.id), sanitizeForFirestore(teacher), { merge: true }).catch((err) =>
          console.warn('Could not sync updated teacher assignments summary:', err)
        );
      }
    } catch (e) {
      console.warn('Syncing teacher record with assignment error:', e);
    }

    this.addAuditLog(
      actorName,
      actorRole,
      'ASSIGN_TEACHER',
      'Academics',
      `Assigned ${assignment.teacherName} to teach ${assignment.subjectCode} (${assignment.subjectName}) for ${assignment.className} ${assignment.stream}`
    );
    this.notify();
  }

  public async saveTeacherAssignmentsBulk(assignmentsToSave: TeacherAssignment[], actorName: string = 'Administrator', actorRole: Role = 'School Administrator'): Promise<void> {
    const assignments = this.getTeacherAssignments();
    
    try {
      const batch = writeBatch(firestoreDb);
      assignmentsToSave.forEach((asgn) => {
        const existingIdx = assignments.findIndex((a) => a.id === asgn.id);
        if (existingIdx >= 0) {
          assignments[existingIdx] = asgn;
        } else {
          assignments.push(asgn);
        }
        const ref = doc(firestoreDb, 'teacherAssignments', asgn.id);
        batch.set(ref, sanitizeForFirestore(asgn));
      });
      await batch.commit();
    } catch (err) {
      console.warn('Could not batch save teacher assignments to Firestore:', err);
    }

    saveToStorage('teacher_assignments', assignments);
    this.addAuditLog(
      actorName,
      actorRole,
      'BULK_ASSIGN_TEACHERS',
      'Academics',
      `Bulk assigned ${assignmentsToSave.length} class stream teaching allocations.`
    );
    this.notify();
  }

  public deleteTeacherAssignment(assignmentId: string, actorName: string = 'Administrator', actorRole: Role = 'School Administrator') {
    let assignments = this.getTeacherAssignments();
    const target = assignments.find((a) => a.id === assignmentId);
    assignments = assignments.filter((a) => a.id !== assignmentId);
    saveToStorage('teacher_assignments', assignments);

    deleteDoc(doc(firestoreDb, 'teacherAssignments', assignmentId)).catch((err) =>
      console.warn('Could not delete teacher assignment from Firestore:', err)
    );

    this.addAuditLog(
      actorName,
      actorRole,
      'UNASSIGN_TEACHER',
      'Academics',
      `Removed teaching assignment of ${target?.teacherName} from ${target?.subjectCode} (${target?.className} ${target?.stream})`
    );
    this.notify();
  }

  public assignClassTeacher(classId: string, teacherId: string, actorName: string = 'Administrator', actorRole: Role = 'School Administrator') {
    const classes = this.getClasses();
    const targetClass = classes.find((c) => c.id === classId);
    const teachers = this.getTeachers();
    const targetTeacher = teachers.find((t) => t.id === teacherId);

    if (targetClass) {
      targetClass.classTeacherId = teacherId || undefined;
      saveToStorage('classes', classes);
      setDoc(doc(firestoreDb, 'classes', targetClass.id), sanitizeForFirestore(targetClass), { merge: true }).catch((err) =>
        console.warn('Could not update class teacher in Firestore:', err)
      );

      if (targetTeacher) {
        targetTeacher.isClassTeacherFor = { className: targetClass.className, stream: targetClass.streamName };
        saveToStorage('teachers', teachers);
        setDoc(doc(firestoreDb, 'teachers', targetTeacher.id), sanitizeForFirestore(targetTeacher), { merge: true }).catch((err) =>
          console.warn('Could not update teacher class teacher role in Firestore:', err)
        );
      }

      this.addAuditLog(
        actorName,
        actorRole,
        'ASSIGN_CLASS_TEACHER',
        'Classes',
        `Assigned ${targetTeacher?.firstName || 'None'} ${targetTeacher?.lastName || ''} as Class Teacher for ${targetClass.className} ${targetClass.streamName}`
      );
      this.notify();
    }
  }

  // --- Combinations ---
  public getCombinations(): SubjectCombination[] {
    return loadFromStorage('combinations', []);
  }

  public saveCombination(combination: SubjectCombination) {
    const combinations = this.getCombinations();
    const existingIndex = combinations.findIndex((c) => c.id === combination.id);
    if (existingIndex >= 0) {
      combinations[existingIndex] = combination;
    } else {
      combinations.push(combination);
    }
    saveToStorage('combinations', combinations);
    setDoc(doc(firestoreDb, 'combinations', combination.id), sanitizeForFirestore(combination)).catch((err) =>
      console.warn('Could not sync combination to Firestore:', err)
    );
    this.notify();
  }

  public deleteCombination(combinationId: string) {
    let combinations = this.getCombinations();
    combinations = combinations.filter((c) => c.id !== combinationId);
    saveToStorage('combinations', combinations);
    deleteDoc(doc(firestoreDb, 'combinations', combinationId)).catch((err) =>
      console.warn('Could not delete combination from Firestore:', err)
    );
    this.notify();
  }

  // --- Students ---
  public getStudents(): Student[] {
    return loadFromStorage('students', INITIAL_STUDENTS);
  }

  public getStudentById(id: string): Student | undefined {
    return this.getStudents().find((s) => s.id === id || s.admissionNo === id);
  }

  public saveStudent(student: Student, actorName: string, actorRole: Role) {
    const students = this.getStudents();
    const existingIndex = students.findIndex((s) => s.id === student.id);
    if (existingIndex >= 0) {
      students[existingIndex] = student;
    } else {
      students.push(student);
    }
    saveToStorage('students', students);
    this.addAuditLog(actorName, actorRole, 'SAVE_STUDENT', 'Students', `Saved student record ${student.firstName} ${student.lastName} (${student.admissionNo})`);
    this.notify();
  }

  public bulkImportStudents(newStudents: Student[], actorName: string, actorRole: Role) {
    const students = this.getStudents();
    const updated = [...students, ...newStudents];
    saveToStorage('students', updated);
    this.addAuditLog(actorName, actorRole, 'BULK_IMPORT_STUDENTS', 'Students', `Successfully imported ${newStudents.length} student records.`);
    this.notify();
  }

  public deleteStudent(studentId: string, actorName: string, actorRole: Role) {
    let students = this.getStudents();
    const target = students.find((s) => s.id === studentId);
    students = students.filter((s) => s.id !== studentId);
    saveToStorage('students', students);
    this.addAuditLog(actorName, actorRole, 'DELETE_STUDENT', 'Students', `Deleted student ${target?.firstName} ${target?.lastName}`);
    this.notify();
  }

  public transferStudentStream(
    studentId: string,
    targetClassName: string,
    targetStreamName: string,
    actorName: string,
    actorRole: Role
  ) {
    const students = this.getStudents();
    const student = students.find((s) => s.id === studentId);
    if (student) {
      const prevClass = student.currentClass;
      const prevStream = student.stream;
      student.currentClass = targetClassName;
      student.stream = targetStreamName;
      student.level = ['S.1', 'S.2', 'S.3', 'S.4'].includes(targetClassName) ? 'O-Level' : 'A-Level';
      saveToStorage('students', students);
      this.addAuditLog(
        actorName,
        actorRole,
        'TRANSFER_STUDENT_STREAM',
        'Students',
        `Transferred ${student.firstName} ${student.lastName} from ${prevClass} ${prevStream} to ${targetClassName} ${targetStreamName}`
      );
      this.notify();
    }
  }

  public bulkTransferStudents(
    studentIds: string[],
    targetClassName: string,
    targetStreamName: string,
    actorName: string,
    actorRole: Role
  ) {
    const students = this.getStudents();
    let count = 0;
    const targetLevel = ['S.1', 'S.2', 'S.3', 'S.4'].includes(targetClassName) ? 'O-Level' : 'A-Level';
    students.forEach((s) => {
      if (studentIds.includes(s.id)) {
        s.currentClass = targetClassName;
        s.stream = targetStreamName;
        s.level = targetLevel;
        count++;
      }
    });
    saveToStorage('students', students);
    this.addAuditLog(
      actorName,
      actorRole,
      'BULK_TRANSFER_STUDENTS',
      'Students',
      `Transferred ${count} students to ${targetClassName} ${targetStreamName}`
    );
    this.notify();
  }

  // --- Marks & Assessment ---
  public getMarks(): MarkRecord[] {
    return loadFromStorage('marks', INITIAL_MARKS);
  }

  public saveMarksBatch(records: MarkRecord[], actorName: string, actorRole: Role) {
    const marks = this.getMarks();
    records.forEach((rec) => {
      const idx = marks.findIndex((m) => m.id === rec.id || (m.studentId === rec.studentId && m.subjectId === rec.subjectId && m.term === rec.term && m.academicYear === rec.academicYear));
      if (idx >= 0) {
        marks[idx] = rec;
      } else {
        marks.push(rec);
      }
    });
    saveToStorage('marks', marks);
    this.addAuditLog(actorName, actorRole, 'SAVE_MARKS', 'Academics', `Saved/Updated ${records.length} assessment mark records.`);
    this.notify();
  }

  public approveMarksBatch(className: string, stream: string, subjectId: string, term: string, actorName: string, actorRole: Role) {
    const marks = this.getMarks();
    let count = 0;
    marks.forEach((m) => {
      if (m.className === className && m.stream === stream && m.subjectId === subjectId && m.term === term) {
        m.isApproved = true;
        m.isLocked = true;
        count++;
      }
    });
    saveToStorage('marks', marks);
    this.addAuditLog(actorName, actorRole, 'APPROVE_MARKS', 'Academics', `Approved & locked ${count} marks for ${className} ${stream}.`);
    this.notify();
  }

  public deleteMark(markId: string, actorName: string, actorRole: Role) {
    let marks = this.getMarks();
    marks = marks.filter((m) => m.id !== markId);
    saveToStorage('marks', marks);
    this.addAuditLog(actorName, actorRole, 'DELETE_MARK', 'Academics', `Deleted mark entry ID ${markId}`);
    this.notify();
  }

  public clearAllMarks(actorName: string, actorRole: Role) {
    saveToStorage('marks', []);
    this.addAuditLog(actorName, actorRole, 'CLEAR_MARKS', 'Academics', 'All mark records have been cleared.');
    this.notify();
  }

  // --- Attendance ---
  public getAttendance(): AttendanceRecord[] {
    return loadFromStorage('attendance', INITIAL_ATTENDANCE);
  }

  public recordAttendanceBatch(records: AttendanceRecord[], actorName: string, actorRole: Role) {
    const attendance = this.getAttendance();
    records.forEach((rec) => {
      const idx = attendance.findIndex((a) => a.studentId === rec.studentId && a.date === rec.date);
      if (idx >= 0) {
        attendance[idx] = rec;
      } else {
        attendance.push(rec);
      }
    });
    saveToStorage('attendance', attendance);
    this.addAuditLog(actorName, actorRole, 'RECORD_ATTENDANCE', 'Attendance', `Recorded daily attendance for ${records.length} students on ${records[0]?.date}`);
    this.notify();
  }

  // --- Fees & Payments ---
  public getFeeStructures(): FeeStructure[] {
    return loadFromStorage('fee_structures', INITIAL_FEE_STRUCTURES);
  }

  public saveFeeStructure(fs: FeeStructure, actorName: string, actorRole: Role) {
    const structures = this.getFeeStructures();
    const idx = structures.findIndex((s) => s.id === fs.id || (s.className === fs.className && s.term === fs.term && s.academicYear === fs.academicYear));
    if (idx >= 0) {
      structures[idx] = fs;
    } else {
      structures.push(fs);
    }
    saveToStorage('fee_structures', structures);
    this.addAuditLog(actorName, actorRole, 'SAVE_FEE_STRUCTURE', 'Finance', `Updated fee structure for ${fs.className} (${fs.term} ${fs.academicYear})`);
    this.notify();
  }

  public deleteFeeStructure(id: string, actorName: string, actorRole: Role) {
    let structures = this.getFeeStructures();
    structures = structures.filter((s) => s.id !== id);
    saveToStorage('fee_structures', structures);
    this.addAuditLog(actorName, actorRole, 'DELETE_FEE_STRUCTURE', 'Finance', `Deleted fee structure ID ${id}`);
    this.notify();
  }

  public getPayments(): FeePayment[] {
    return loadFromStorage('payments', INITIAL_PAYMENTS);
  }

  public recordPayment(payment: FeePayment, actorName: string, actorRole: Role) {
    const payments = this.getPayments();
    payments.push(payment);
    saveToStorage('payments', payments);
    this.addAuditLog(actorName, actorRole, 'RECORD_PAYMENT', 'Finance', `Recorded payment receipt ${payment.receiptNo} of UGX ${payment.amountPaid.toLocaleString()}`);
    this.notify();
  }

  public deletePayment(id: string, actorName: string, actorRole: Role) {
    let payments = this.getPayments();
    payments = payments.filter((p) => p.id !== id);
    saveToStorage('payments', payments);
    this.addAuditLog(actorName, actorRole, 'DELETE_PAYMENT', 'Finance', `Deleted payment record ID ${id}`);
    this.notify();
  }

  // --- Timetable ---
  public getTimetable(): TimetableSlot[] {
    return loadFromStorage('timetable', INITIAL_TIMETABLE);
  }

  public saveTimetableSlot(slot: TimetableSlot) {
    const tt = this.getTimetable();
    const idx = tt.findIndex((s) => s.id === slot.id);
    if (idx >= 0) {
      tt[idx] = slot;
    } else {
      tt.push(slot);
    }
    saveToStorage('timetable', tt);
    this.notify();
  }

  public deleteTimetableSlot(slotId: string) {
    let tt = this.getTimetable();
    tt = tt.filter((s) => s.id !== slotId);
    saveToStorage('timetable', tt);
    this.notify();
  }

  // --- Exams ---
  public getExams(): ExamSchedule[] {
    return loadFromStorage('exams', INITIAL_EXAMS);
  }

  public saveExam(exam: ExamSchedule, actorName: string, actorRole: Role) {
    const exams = this.getExams();
    const idx = exams.findIndex((e) => e.id === exam.id);
    if (idx >= 0) {
      exams[idx] = exam;
    } else {
      exams.push(exam);
    }
    saveToStorage('exams', exams);
    this.addAuditLog(actorName, actorRole, 'SAVE_EXAM', 'Examinations', `Saved examination schedule ${exam.title} - ${exam.paperName}`);
    this.notify();
  }

  public deleteExam(examId: string, actorName: string, actorRole: Role) {
    let exams = this.getExams();
    exams = exams.filter((e) => e.id !== examId);
    saveToStorage('exams', exams);
    this.addAuditLog(actorName, actorRole, 'DELETE_EXAM', 'Examinations', `Deleted examination schedule ID ${examId}`);
    this.notify();
  }

  // --- Discipline ---
  public getIncidents(): IncidentRecord[] {
    return loadFromStorage('incidents', INITIAL_INCIDENTS);
  }

  public saveIncident(inc: IncidentRecord, actorName: string, actorRole: Role) {
    const list = this.getIncidents();
    const idx = list.findIndex((i) => i.id === inc.id);
    if (idx >= 0) {
      list[idx] = inc;
    } else {
      list.push(inc);
    }
    saveToStorage('incidents', list);
    this.addAuditLog(actorName, actorRole, 'SAVE_INCIDENT', 'Discipline', `Recorded disciplinary incident for student ID ${inc.studentId}`);
    this.notify();
  }

  public deleteIncident(incidentId: string, actorName: string, actorRole: Role) {
    let list = this.getIncidents();
    list = list.filter((i) => i.id !== incidentId);
    saveToStorage('incidents', list);
    this.addAuditLog(actorName, actorRole, 'DELETE_INCIDENT', 'Discipline', `Deleted disciplinary incident ID ${incidentId}`);
    this.notify();
  }

  // --- Library ---
  public getBooks(): LibraryBook[] {
    return loadFromStorage('books', INITIAL_BOOKS);
  }

  public saveBook(book: LibraryBook, actorName: string, actorRole: Role) {
    const list = this.getBooks();
    const idx = list.findIndex((b) => b.id === book.id);
    if (idx >= 0) {
      list[idx] = book;
    } else {
      list.push(book);
    }
    saveToStorage('books', list);
    this.addAuditLog(actorName, actorRole, 'SAVE_BOOK', 'Library', `Saved library book ${book.title}`);
    this.notify();
  }

  public deleteBook(bookId: string, actorName: string, actorRole: Role) {
    let list = this.getBooks();
    list = list.filter((b) => b.id !== bookId);
    saveToStorage('books', list);
    this.addAuditLog(actorName, actorRole, 'DELETE_BOOK', 'Library', `Deleted library book ID ${bookId}`);
    this.notify();
  }

  // --- Inventory ---
  public getInventory(): InventoryItem[] {
    return loadFromStorage('inventory', INITIAL_INVENTORY);
  }

  public saveInventoryItem(item: InventoryItem, actorName: string, actorRole: Role) {
    const list = this.getInventory();
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    saveToStorage('inventory', list);
    this.addAuditLog(actorName, actorRole, 'SAVE_INVENTORY', 'Inventory', `Saved store item ${item.itemName} (${item.quantity} in stock)`);
    this.notify();
  }

  public deleteInventoryItem(itemId: string, actorName: string, actorRole: Role) {
    let list = this.getInventory();
    list = list.filter((i) => i.id !== itemId);
    saveToStorage('inventory', list);
    this.addAuditLog(actorName, actorRole, 'DELETE_INVENTORY', 'Inventory', `Deleted inventory item ID ${itemId}`);
    this.notify();
  }

  // --- Announcements ---
  public getAnnouncements(): Announcement[] {
    return loadFromStorage('announcements', INITIAL_ANNOUNCEMENTS);
  }

  public saveAnnouncement(ann: Announcement, actorName: string, actorRole: Role) {
    const list = this.getAnnouncements();
    const idx = list.findIndex((a) => a.id === ann.id);
    if (idx >= 0) {
      list[idx] = ann;
    } else {
      list.unshift(ann);
    }
    saveToStorage('announcements', list);
    this.addAuditLog(actorName, actorRole, 'SAVE_ANNOUNCEMENT', 'Communication', `Published announcement ${ann.title}`);
    this.notify();
  }

  public deleteAnnouncement(annId: string, actorName: string, actorRole: Role) {
    let list = this.getAnnouncements();
    list = list.filter((a) => a.id !== annId);
    saveToStorage('announcements', list);
    this.addAuditLog(actorName, actorRole, 'DELETE_ANNOUNCEMENT', 'Communication', `Deleted announcement ID ${annId}`);
    this.notify();
  }

  // --- Events ---
  public getEvents(): SchoolEvent[] {
    return loadFromStorage('events', INITIAL_EVENTS);
  }

  public saveEvent(event: SchoolEvent, actorName: string, actorRole: Role) {
    const list = this.getEvents();
    const idx = list.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      list[idx] = event;
    } else {
      list.push(event);
    }
    saveToStorage('events', list);
    this.addAuditLog(actorName, actorRole, 'SAVE_EVENT', 'Calendar', `Saved calendar event ${event.title}`);
    this.notify();
  }

  public deleteEvent(eventId: string, actorName: string, actorRole: Role) {
    let list = this.getEvents();
    list = list.filter((e) => e.id !== eventId);
    saveToStorage('events', list);
    this.addAuditLog(actorName, actorRole, 'DELETE_EVENT', 'Calendar', `Deleted calendar event ID ${eventId}`);
    this.notify();
  }

  // --- Documents ---
  public getDocuments(): SchoolDocument[] {
    return loadFromStorage('documents', INITIAL_DOCUMENTS);
  }

  public saveDocument(doc: SchoolDocument, actorName: string, actorRole: Role) {
    const list = this.getDocuments();
    const idx = list.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      list[idx] = doc;
    } else {
      list.unshift(doc);
    }
    saveToStorage('documents', list);
    this.addAuditLog(actorName, actorRole, 'SAVE_DOCUMENT', 'Documents', `Uploaded repository document ${doc.title}`);
    this.notify();
  }

  public deleteDocument(docId: string, actorName: string, actorRole: Role) {
    let list = this.getDocuments();
    list = list.filter((d) => d.id !== docId);
    saveToStorage('documents', list);
    this.addAuditLog(actorName, actorRole, 'DELETE_DOCUMENT', 'Documents', `Deleted document ID ${docId}`);
    this.notify();
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return loadFromStorage('audit_logs', INITIAL_AUDIT_LOGS);
  }

  public addAuditLog(actorName: string, actorRole: Role, action: string, module: string, details: string) {
    const logs = this.getAuditLogs();
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userName: actorName,
      userRole: actorRole,
      action,
      module,
      timestamp,
      details,
    };
    logs.unshift(newLog);
    saveToStorage('audit_logs', logs.slice(0, 200));

    addDoc(collection(firestoreDb, 'auditLogs'), sanitizeForFirestore(newLog)).catch((err) =>
      console.warn('Could not sync audit log to Firestore:', err)
    );
  }

  // --- Users & Roles ---
  public getUsers(): UserAccount[] {
    return loadFromStorage('users', INITIAL_USERS);
  }

  public saveUser(user: UserAccount) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    saveToStorage('users', users);
    
    // Automatically sync teachers
    if (user.role === 'Teacher') {
      const teachers = this.getTeachers();
      const existingTeacher = teachers.find(t => t.id === user.id);
      if (!existingTeacher) {
        this.saveTeacher({
          id: user.id,
          teacherId: `TCH-${user.id.slice(0, 6)}`,
          firstName: user.fullName.split(' ')[0] || '',
          lastName: user.fullName.split(' ').slice(1).join(' ') || '',
          email: user.email,
          phone: user.phone || '',
          gender: 'Male',
          department: 'General',
          qualification: 'Degree in Education',
          employmentStatus: 'Full-Time',
          dateEmployed: '2026-01-01',
          assignedSubjectIds: [],
          assignedClassStreams: [],
          subjects: [],
        });
      }
    }
    
    this.notify();
  }

  public deleteUser(userId: string) {
    let users = this.getUsers();
    users = users.filter((u) => u.id !== userId);
    saveToStorage('users', users);
    this.notify();
  }

  public toggleUserStatus(userId: string) {
    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (target) {
      target.isActive = !target.isActive;
      saveToStorage('users', users);
      this.notify();
    }
  }

  // --- Notifications ---
  public getNotifications(): NotificationItem[] {
    return loadFromStorage('notifications', INITIAL_NOTIFICATIONS);
  }

  public markNotificationAsRead(id: string) {
    const list = this.getNotifications();
    const target = list.find((n) => n.id === id);
    if (target) {
      target.isRead = true;
      saveToStorage('notifications', list);
      this.notify();
    }
  }

  public addNotification(title: string, message: string, type: 'info' | 'warning' | 'success' | 'alert' = 'info') {
    const list = this.getNotifications();
    list.unshift({
      id: `ntf-${Date.now()}`,
      title,
      message,
      timestamp: 'Just now',
      isRead: false,
      type,
    });
    saveToStorage('notifications', list);
    this.notify();
  }
}

export const db = new SMISDatabaseService();
