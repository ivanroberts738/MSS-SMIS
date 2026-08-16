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
} from '../types';

import schoolLogo from '../assets/images/masaba_crest_clean_1786779127246.jpg';

export const INITIAL_SETTINGS: SchoolSettings = {
  schoolName: 'MASABA SECONDARY SCHOOL',
  district: 'Sironko / Budadiri',
  subCounty: 'Budadiri Town Council',
  poBox: 'P.O. Box 102, Budadiri, Uganda',
  telephone: '+256 772 123 456 / +256 701 987 654',
  email: 'info@masabasecondary.ac.ug',
  website: 'https://masabasecondary.ac.ug',
  motto: 'FOR KNOWLEDGE WISDOM AND CHARACTER',
  logoUrl: schoolLogo,
  academicYear: '2026',
  currentTerm: 'Term II',
  headTeacherName: 'Mr. Wabwire Patrick',
  headTeacherSignatureTitle: 'Headteacher, Masaba Secondary School',
  caWeight: 20, // 20% Continuous Assessment
  examWeight: 80, // 80% End-of-Cycle Examination
  projectWeight: 0,
  // 2026 UCE Competency-Based Grading Structure (Grades Only, No Points)
  oLevelGrading: [
    { grade: 'A', minScore: 80, maxScore: 100, achievementLevel: 'Exceptional', description: 'Extraordinary level of competency and independent concept mastery', isPass: true },
    { grade: 'B', minScore: 70, maxScore: 79, achievementLevel: 'Outstanding', description: 'High level of competency with thorough concept application', isPass: true },
    { grade: 'C', minScore: 60, maxScore: 69, achievementLevel: 'Satisfactory', description: 'Adequate level of competency meeting core syllabus goals', isPass: true },
    { grade: 'D', minScore: 50, maxScore: 59, achievementLevel: 'Basic', description: 'Minimum acceptable level of competency requiring guidance', isPass: true },
    { grade: 'E', minScore: 0, maxScore: 49, achievementLevel: 'Elementary', description: 'Below basic level of competency requiring remediation', isPass: false },
  ],
  // UACE A-Level Principal Subjects Grading Structure (Grades & Configurable Points)
  aLevelGrading: [
    { grade: 'A', minScore: 80, maxScore: 100, points: 5, classification: 'Distinction', description: 'Principal Distinction (5 Pts)', isPass: true },
    { grade: 'B', minScore: 70, maxScore: 79, points: 4, classification: 'Credit', description: 'Principal Upper Credit (4 Pts)', isPass: true },
    { grade: 'C', minScore: 60, maxScore: 69, points: 3, classification: 'Credit', description: 'Principal Lower Credit (3 Pts)', isPass: true },
    { grade: 'D', minScore: 50, maxScore: 59, points: 2, classification: 'Pass', description: 'Principal Pass (2 Pts)', isPass: true },
    { grade: 'E', minScore: 0, maxScore: 49, points: 1, classification: 'Elementary', description: 'Principal Elementary (1 Pt)', isPass: true },
  ],
  // UACE A-Level Subsidiary Subjects Grading Structure (Fixed 1-Point Rule for A-E, No O / No F)
  aLevelSubsidiaryGrading: [
    { grade: 'A', minScore: 80, maxScore: 100, points: 1, classification: 'Subsidiary Distinction', description: 'Subsidiary Distinction (1 Pt)', isPass: true },
    { grade: 'B', minScore: 70, maxScore: 79, points: 1, classification: 'Subsidiary Credit', description: 'Subsidiary Credit (1 Pt)', isPass: true },
    { grade: 'C', minScore: 60, maxScore: 69, points: 1, classification: 'Subsidiary Credit', description: 'Subsidiary Credit (1 Pt)', isPass: true },
    { grade: 'D', minScore: 50, maxScore: 59, points: 1, classification: 'Subsidiary Pass', description: 'Subsidiary Pass (1 Pt)', isPass: true },
    { grade: 'E', minScore: 0, maxScore: 49, points: 1, classification: 'Subsidiary Elementary', description: 'Subsidiary Elementary (1 Pt)', isPass: true },
  ],
  academicYears: [
    { id: 'ay-2026', year: '2026', status: 'Open', startDate: '2026-02-02', endDate: '2026-11-28', isCurrent: true },
    { id: 'ay-2027', year: '2027', status: 'Open', startDate: '2027-02-01', endDate: '2027-11-27', isCurrent: false },
  ],
  terms: [
    { id: 't-1', name: 'Term I', academicYear: '2026', startDate: '2026-02-02', endDate: '2026-05-02', isCurrent: false },
    { id: 't-2', name: 'Term II', academicYear: '2026', startDate: '2026-05-25', endDate: '2026-08-22', isCurrent: true },
    { id: 't-3', name: 'Term III', academicYear: '2026', startDate: '2026-09-14', endDate: '2026-11-28', isCurrent: false },
  ],
  nextTermBeginsOn: '2026-09-14',
  combinations: [],
};

// Clean, empty initial data arrays for administrator to populate
export const INITIAL_CLASSES: ClassStream[] = [];
export const INITIAL_SUBJECTS: Subject[] = [];
export const INITIAL_TEACHERS: Teacher[] = [];
export const INITIAL_STUDENTS: Student[] = [];
export const INITIAL_MARKS: MarkRecord[] = [];
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
export const INITIAL_FEE_STRUCTURES: FeeStructure[] = [];
export const INITIAL_PAYMENTS: FeePayment[] = [];
export const INITIAL_TIMETABLE: TimetableSlot[] = [];
export const INITIAL_EXAMS: ExamSchedule[] = [];
export const INITIAL_INCIDENTS: IncidentRecord[] = [];
export const INITIAL_BOOKS: LibraryBook[] = [];
export const INITIAL_INVENTORY: InventoryItem[] = [];
export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];
export const INITIAL_EVENTS: SchoolEvent[] = [];
export const INITIAL_DOCUMENTS: SchoolDocument[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-init',
    userName: 'System Administrator',
    userRole: 'Super Administrator',
    action: 'INIT_SYSTEM',
    module: 'System',
    timestamp: '2026-08-15 08:00:00',
    details: 'Masaba SMIS initialized with UNEB curriculum framework ready for school data entry.',
  },
];

// Initial default Administrator user so admin can sign in and start adding users and school records
export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    email: 'admin@masabasecondary.ac.ug',
    fullName: 'System Administrator (Mr. Wabwire Patrick)',
    role: 'Super Administrator',
    phone: '+256 772 123 456',
    password: 'Masaba@2026',
    isActive: true,
    createdAt: '2026-01-15',
    lastLogin: 'Active now',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'ntf-welcome',
    title: 'Welcome to Masaba SMIS',
    message: 'System is configured with 2026 UNEB O-Level & A-Level curriculum. As Administrator, you can customize subjects, papers, streams, and grading ranges anytime.',
    timestamp: 'Just now',
    isRead: false,
    type: 'info',
  },
];

// Complete 2026 UNEB Standard Classes & Streams Presets
export const STANDARD_UGANDAN_CLASSES_PRESET: ClassStream[] = [
  // O-Level S.1
  { id: 'c-s1-n', className: 'S.1', streamName: 'North', level: 'O-Level', capacity: 60, academicYear: '2026' },
  { id: 'c-s1-s', className: 'S.1', streamName: 'South', level: 'O-Level', capacity: 60, academicYear: '2026' },
  { id: 'c-s1-e', className: 'S.1', streamName: 'East', level: 'O-Level', capacity: 60, academicYear: '2026' },

  // O-Level S.2
  { id: 'c-s2-n', className: 'S.2', streamName: 'North', level: 'O-Level', capacity: 60, academicYear: '2026' },
  { id: 'c-s2-s', className: 'S.2', streamName: 'South', level: 'O-Level', capacity: 60, academicYear: '2026' },
  { id: 'c-s2-e', className: 'S.2', streamName: 'East', level: 'O-Level', capacity: 60, academicYear: '2026' },

  // O-Level S.3
  { id: 'c-s3-n', className: 'S.3', streamName: 'North', level: 'O-Level', capacity: 55, academicYear: '2026' },
  { id: 'c-s3-s', className: 'S.3', streamName: 'South', level: 'O-Level', capacity: 55, academicYear: '2026' },
  { id: 'c-s3-e', className: 'S.3', streamName: 'East', level: 'O-Level', capacity: 55, academicYear: '2026' },

  // O-Level S.4
  { id: 'c-s4-n', className: 'S.4', streamName: 'North', level: 'O-Level', capacity: 55, academicYear: '2026' },
  { id: 'c-s4-s', className: 'S.4', streamName: 'South', level: 'O-Level', capacity: 55, academicYear: '2026' },
  { id: 'c-s4-e', className: 'S.4', streamName: 'East', level: 'O-Level', capacity: 55, academicYear: '2026' },

  // A-Level S.5
  { id: 'c-s5-a', className: 'S.5', streamName: 'A', level: 'A-Level', capacity: 45, academicYear: '2026' },
  { id: 'c-s5-x', className: 'S.5', streamName: 'X', level: 'A-Level', capacity: 45, academicYear: '2026' },
  { id: 'c-s5-arts', className: 'S.5', streamName: 'Arts', level: 'A-Level', capacity: 45, academicYear: '2026' },
  { id: 'c-s5-sci', className: 'S.5', streamName: 'Sciences', level: 'A-Level', capacity: 45, academicYear: '2026' },

  // A-Level S.6
  { id: 'c-s6-a', className: 'S.6', streamName: 'A', level: 'A-Level', capacity: 45, academicYear: '2026' },
  { id: 'c-s6-x', className: 'S.6', streamName: 'X', level: 'A-Level', capacity: 45, academicYear: '2026' },
  { id: 'c-s6-arts', className: 'S.6', streamName: 'Arts', level: 'A-Level', capacity: 45, academicYear: '2026' },
  { id: 'c-s6-sci', className: 'S.6', streamName: 'Sciences', level: 'A-Level', capacity: 45, academicYear: '2026' },
];

// Complete 2026 UNEB UCE & UACE Subject Master Presets with full Papers Structure
export const STANDARD_UGANDAN_SUBJECTS_PRESET: Subject[] = [
  // ==================== O-LEVEL (2026 UCE STRUCTURE) ====================
  {
    id: 'sub-112',
    code: '112',
    name: 'English Language',
    level: 'O-Level',
    category: 'Compulsory',
    department: 'Languages',
    paperCount: 1,
    status: 'Active',
    papers: [
      { id: 'p-112-1', paperCode: '112/1', paperNumber: 1, paperName: 'English Language Paper 1', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
    ],
  },
  {
    id: 'sub-456',
    code: '456',
    name: 'Mathematics',
    level: 'O-Level',
    category: 'Compulsory',
    department: 'Mathematics',
    paperCount: 1,
    status: 'Active',
    papers: [
      { id: 'p-456-1', paperCode: '456/1', paperNumber: 1, paperName: 'Mathematics Paper 1', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
    ],
  },
  {
    id: 'sub-241',
    code: '241',
    name: 'History & Political Education',
    level: 'O-Level',
    category: 'Compulsory',
    department: 'Humanities',
    paperCount: 1,
    status: 'Active',
    papers: [
      { id: 'p-241-1', paperCode: '241/1', paperNumber: 1, paperName: 'History & Political Education Paper 1', paperType: 'Theory', maxMarks: 100, duration: '2h 15m', status: 'Active' },
    ],
  },
  {
    id: 'sub-273',
    code: '273',
    name: 'Geography',
    level: 'O-Level',
    category: 'Compulsory',
    department: 'Humanities',
    paperCount: 1,
    status: 'Active',
    papers: [
      { id: 'p-273-1', paperCode: '273/1', paperNumber: 1, paperName: 'Geography Paper 1', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
    ],
  },
  {
    id: 'sub-553',
    code: '553',
    name: 'Biology',
    level: 'O-Level',
    category: 'Compulsory',
    department: 'Sciences',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-553-1', paperCode: '553/1', paperNumber: 1, paperName: 'Biology Theory', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
      { id: 'p-553-2', paperCode: '553/2', paperNumber: 2, paperName: 'Biology Practical', paperType: 'Practical', maxMarks: 100, duration: '2h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-545',
    code: '545',
    name: 'Chemistry',
    level: 'O-Level',
    category: 'Compulsory',
    department: 'Sciences',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-545-1', paperCode: '545/1', paperNumber: 1, paperName: 'Chemistry Theory', paperType: 'Theory', maxMarks: 100, duration: '2h 00m', status: 'Active' },
      { id: 'p-545-2', paperCode: '545/2', paperNumber: 2, paperName: 'Chemistry Practical', paperType: 'Practical', maxMarks: 100, duration: '2h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-535',
    code: '535',
    name: 'Physics',
    level: 'O-Level',
    category: 'Compulsory',
    department: 'Sciences',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-535-1', paperCode: '535/1', paperNumber: 1, paperName: 'Physics Theory', paperType: 'Theory', maxMarks: 100, duration: '2h 15m', status: 'Active' },
      { id: 'p-535-2', paperCode: '535/2', paperNumber: 2, paperName: 'Physics Practical', paperType: 'Practical', maxMarks: 100, duration: '2h 15m', status: 'Active' },
    ],
  },
  {
    id: 'sub-840',
    code: '840',
    name: 'Information & Communications Technology',
    level: 'O-Level',
    category: 'Elective',
    department: 'ICT',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-840-1', paperCode: '840/1', paperNumber: 1, paperName: 'ICT Theory', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
      { id: 'p-840-2', paperCode: '840/2', paperNumber: 2, paperName: 'ICT Practical', paperType: 'Practical', maxMarks: 100, duration: '2h 30m', status: 'Active' },
    ],
  },
  {
    id: 'sub-527',
    code: '527',
    name: 'Agriculture',
    level: 'O-Level',
    category: 'Elective',
    department: 'Vocational',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-527-1', paperCode: '527/1', paperNumber: 1, paperName: 'Agriculture Theory', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
      { id: 'p-527-2', paperCode: '527/2', paperNumber: 2, paperName: 'Agriculture Practical', paperType: 'Practical', maxMarks: 100, duration: '2h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-845',
    code: '845',
    name: 'Entrepreneurship',
    level: 'O-Level',
    category: 'Elective',
    department: 'Vocational',
    paperCount: 1,
    status: 'Active',
    papers: [
      { id: 'p-845-1', paperCode: '845/1', paperNumber: 1, paperName: 'Entrepreneurship Paper 1', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
    ],
  },
  {
    id: 'sub-223',
    code: '223',
    name: 'Christian Religious Education',
    level: 'O-Level',
    category: 'Elective',
    department: 'Humanities',
    paperCount: 1,
    status: 'Active',
    papers: [
      { id: 'p-223-1', paperCode: '223/1', paperNumber: 1, paperName: 'Christian Religious Education Paper 1', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
    ],
  },
  {
    id: 'sub-225',
    code: '225',
    name: 'Islamic Religious Education',
    level: 'O-Level',
    category: 'Elective',
    department: 'Humanities',
    paperCount: 1,
    status: 'Active',
    papers: [
      { id: 'p-225-1', paperCode: '225/1', paperNumber: 1, paperName: 'Islamic Religious Education Paper 1', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
    ],
  },
  {
    id: 'sub-208',
    code: '208',
    name: 'Literature in English',
    level: 'O-Level',
    category: 'Elective',
    department: 'Languages',
    paperCount: 1,
    status: 'Active',
    papers: [
      { id: 'p-208-1', paperCode: '208/1', paperNumber: 1, paperName: 'Literature in English Paper 1', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
    ],
  },
  {
    id: 'sub-336',
    code: '336',
    name: 'Lugha na Fasihi ya Kiswahili',
    level: 'O-Level',
    category: 'Elective',
    department: 'Languages',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-336-1', paperCode: '336/1', paperNumber: 1, paperName: 'Kiswahili Karatasi ya Kwanza', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
      { id: 'p-336-2', paperCode: '336/2', paperNumber: 2, paperName: 'Kiswahili Karatasi ya Pili', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
    ],
  },
  {
    id: 'sub-621',
    code: '621',
    name: 'Performing Arts',
    level: 'O-Level',
    category: 'Elective',
    department: 'Vocational',
    paperCount: 1,
    status: 'Active',
    papers: [
      { id: 'p-621-1', paperCode: '621/1', paperNumber: 1, paperName: 'Performing Arts Paper 1', paperType: 'Practical', maxMarks: 100, duration: '2h 30m', status: 'Active' },
    ],
  },
  {
    id: 'sub-612',
    code: '612',
    name: 'Art & Design',
    level: 'O-Level',
    category: 'Elective',
    department: 'Vocational',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-612-1', paperCode: '612/1', paperNumber: 1, paperName: 'Art & Design Studio Work', paperType: 'Practical', maxMarks: 100, duration: '3h 00m', status: 'Active' },
      { id: 'p-612-2', paperCode: '612/2', paperNumber: 2, paperName: 'Art & Design Theory/Drawing', paperType: 'Practical', maxMarks: 100, duration: '3h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-745',
    code: '745',
    name: 'Technology & Design',
    level: 'O-Level',
    category: 'Elective',
    department: 'Vocational',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-745-1', paperCode: '745/1', paperNumber: 1, paperName: 'Technology & Design Paper 1', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
      { id: 'p-745-2', paperCode: '745/2', paperNumber: 2, paperName: 'Technology & Design Practical', paperType: 'Practical', maxMarks: 100, duration: '3h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-662',
    code: '662',
    name: 'Nutrition & Food Technology',
    level: 'O-Level',
    category: 'Elective',
    department: 'Vocational',
    paperCount: 1,
    status: 'Active',
    papers: [
      { id: 'p-662-1', paperCode: '662/1', paperNumber: 1, paperName: 'Nutrition & Food Tech Paper 1', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
    ],
  },
  {
    id: 'sub-555',
    code: '555',
    name: 'Physical Education',
    level: 'O-Level',
    category: 'Elective',
    department: 'Vocational',
    paperCount: 1,
    status: 'Active',
    papers: [
      { id: 'p-555-1', paperCode: '555/1', paperNumber: 1, paperName: 'Physical Education Paper 1', paperType: 'Practical', maxMarks: 100, duration: '2h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-335',
    code: '335',
    name: 'Kiswahili',
    level: 'O-Level',
    category: 'Elective',
    department: 'Languages',
    paperCount: 1,
    status: 'Active',
    papers: [
      { id: 'p-335-1', paperCode: '335/1', paperNumber: 1, paperName: 'Kiswahili Paper 1', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
    ],
  },

  // ==================== A-LEVEL (UACE PRINCIPAL SUBJECTS) ====================
  {
    id: 'sub-p210',
    code: 'P210',
    name: 'History (A-Level)',
    level: 'A-Level',
    category: 'Principal',
    department: 'Humanities',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-p210-1', paperCode: 'P210/1', paperNumber: 1, paperName: 'African National Movements', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
      { id: 'p-p210-2', paperCode: 'P210/2', paperNumber: 2, paperName: 'Economic & Social History of East Africa', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-p220',
    code: 'P220',
    name: 'Economics (A-Level)',
    level: 'A-Level',
    category: 'Principal',
    department: 'Humanities',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-p220-1', paperCode: 'P220/1', paperNumber: 1, paperName: 'Economics Paper 1', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
      { id: 'p-p220-2', paperCode: 'P220/2', paperNumber: 2, paperName: 'Economics Paper 2', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-p235',
    code: 'P235',
    name: 'Islamic Religious Education (A-Level)',
    level: 'A-Level',
    category: 'Principal',
    department: 'Humanities',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-p235-1', paperCode: 'P235/1', paperNumber: 1, paperName: 'IRE Paper 1', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
      { id: 'p-p235-2', paperCode: 'P235/2', paperNumber: 2, paperName: 'IRE Paper 2', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-p245',
    code: 'P245',
    name: 'Christian Religious Education (A-Level)',
    level: 'A-Level',
    category: 'Principal',
    department: 'Humanities',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-p245-1', paperCode: 'P245/1', paperNumber: 1, paperName: 'Old & New Testament', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
      { id: 'p-p245-2', paperCode: 'P245/2', paperNumber: 2, paperName: 'Christianity in the Living World', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-p250',
    code: 'P250',
    name: 'Geography (A-Level)',
    level: 'A-Level',
    category: 'Principal',
    department: 'Humanities',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-p250-1', paperCode: 'P250/1', paperNumber: 1, paperName: 'Physical Geography', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
      { id: 'p-p250-2', paperCode: 'P250/2', paperNumber: 2, paperName: 'World Problems & Development', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-p310',
    code: 'P310',
    name: 'Literature in English (A-Level)',
    level: 'A-Level',
    category: 'Principal',
    department: 'Languages',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-p310-1', paperCode: 'P310/1', paperNumber: 1, paperName: 'Prose & Poetry', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
      { id: 'p-p310-2', paperCode: 'P310/2', paperNumber: 2, paperName: 'Plays & Novels', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-p320',
    code: 'P320',
    name: 'Fasihi ya Kiswahili (A-Level)',
    level: 'A-Level',
    category: 'Principal',
    department: 'Languages',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-p320-1', paperCode: 'P320/1', paperNumber: 1, paperName: 'Lugha Karatasi ya Kwanza', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
      { id: 'p-p320-2', paperCode: 'P320/2', paperNumber: 2, paperName: 'Fasihi Karatasi ya Pili', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-p425',
    code: 'P425',
    name: 'Principal Mathematics (A-Level)',
    level: 'A-Level',
    category: 'Principal',
    department: 'Mathematics',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-p425-1', paperCode: 'P425/1', paperNumber: 1, paperName: 'Pure Mathematics', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
      { id: 'p-p425-2', paperCode: 'P425/2', paperNumber: 2, paperName: 'Applied Mathematics (Mechanics & Statistics)', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-p510',
    code: 'P510',
    name: 'Physics (A-Level)',
    level: 'A-Level',
    category: 'Principal',
    department: 'Sciences',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-p510-1', paperCode: 'P510/1', paperNumber: 1, paperName: 'Physics Theory', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
      { id: 'p-p510-2', paperCode: 'P510/2', paperNumber: 2, paperName: 'Physics Practical & Applications', paperType: 'Practical', maxMarks: 100, duration: '3h 15m', status: 'Active' },
    ],
  },
  {
    id: 'sub-p515',
    code: 'P515',
    name: 'Agriculture (A-Level)',
    level: 'A-Level',
    category: 'Principal',
    department: 'Vocational',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-p515-1', paperCode: 'P515/1', paperNumber: 1, paperName: 'Agriculture Principles & Practices', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
      { id: 'p-p515-2', paperCode: 'P515/2', paperNumber: 2, paperName: 'Agriculture Practical', paperType: 'Practical', maxMarks: 100, duration: '3h 00m', status: 'Active' },
    ],
  },
  {
    id: 'sub-p530',
    code: 'P530',
    name: 'Biology (A-Level)',
    level: 'A-Level',
    category: 'Principal',
    department: 'Sciences',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-p530-1', paperCode: 'P530/1', paperNumber: 1, paperName: 'Biology Theory', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
      { id: 'p-p530-2', paperCode: 'P530/2', paperNumber: 2, paperName: 'Biology Practical', paperType: 'Practical', maxMarks: 100, duration: '3h 15m', status: 'Active' },
    ],
  },
  {
    id: 'sub-p525',
    code: 'P525',
    name: 'Chemistry (A-Level)',
    level: 'A-Level',
    category: 'Principal',
    department: 'Sciences',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-p525-1', paperCode: 'P525/1', paperNumber: 1, paperName: 'Inorganic & Physical Chemistry', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
      { id: 'p-p525-2', paperCode: 'P525/2', paperNumber: 2, paperName: 'Organic & Practical Chemistry', paperType: 'Practical', maxMarks: 100, duration: '3h 15m', status: 'Active' },
    ],
  },
  {
    id: 'sub-p230',
    code: 'P230',
    name: 'Entrepreneurship Education (A-Level)',
    level: 'A-Level',
    category: 'Principal',
    department: 'Vocational',
    paperCount: 2,
    status: 'Active',
    papers: [
      { id: 'p-p230-1', paperCode: 'P230/1', paperNumber: 1, paperName: 'Entrepreneurship Paper 1', paperType: 'Theory', maxMarks: 100, duration: '3h 00m', status: 'Active' },
      { id: 'p-p230-2', paperCode: 'P230/2', paperNumber: 2, paperName: 'Entrepreneurship Project & Case Study', paperType: 'Project', maxMarks: 100, duration: '3h 00m', status: 'Active' },
    ],
  },

  // ==================== A-LEVEL (SUBSIDIARY SUBJECTS) ====================
  {
    id: 'sub-s101',
    code: 'S101',
    name: 'General Paper (A-Level)',
    level: 'A-Level',
    category: 'Subsidiary',
    department: 'Languages',
    paperCount: 1,
    isSubsidiary: true,
    status: 'Active',
    papers: [
      { id: 'p-s101-1', paperCode: 'S101/1', paperNumber: 1, paperName: 'General Paper', paperType: 'Theory', maxMarks: 100, duration: '2h 40m', status: 'Active' },
    ],
  },
  {
    id: 'sub-s475',
    code: 'S475',
    name: 'Subsidiary Mathematics',
    level: 'A-Level',
    category: 'Subsidiary',
    department: 'Mathematics',
    paperCount: 1,
    isSubsidiary: true,
    status: 'Active',
    papers: [
      { id: 'p-s475-1', paperCode: 'S475/1', paperNumber: 1, paperName: 'Subsidiary Mathematics Paper 1', paperType: 'Theory', maxMarks: 100, duration: '2h 40m', status: 'Active' },
    ],
  },
  {
    id: 'sub-s850',
    code: 'S850',
    name: 'Subsidiary ICT',
    level: 'A-Level',
    category: 'Subsidiary',
    department: 'ICT',
    paperCount: 2,
    isSubsidiary: true,
    status: 'Active',
    papers: [
      { id: 'p-s850-1', paperCode: 'S850/1', paperNumber: 1, paperName: 'Subsidiary ICT Theory', paperType: 'Theory', maxMarks: 100, duration: '2h 30m', status: 'Active' },
      { id: 'p-s850-2', paperCode: 'S850/2', paperNumber: 2, paperName: 'Subsidiary ICT Practical', paperType: 'Practical', maxMarks: 100, duration: '2h 30m', status: 'Active' },
    ],
  },
];
