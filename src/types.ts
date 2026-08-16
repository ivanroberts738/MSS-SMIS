/**
 * Masaba Secondary School SMIS - Core TypeScript Definitions
 */

export type Role =
  | 'Super Administrator'
  | 'School Administrator'
  | 'Head Teacher'
  | 'Deputy Head Teacher'
  | 'Director of Studies'
  | 'Teacher'
  | 'Class Teacher'
  | 'Bursar/Finance Officer'
  | 'Librarian'
  | 'Storekeeper'
  | 'Student'
  | 'Parent/Guardian';

export type EducationLevel = 'O-Level' | 'A-Level';

export type StudentStatus =
  | 'Active'
  | 'Transferred'
  | 'Graduated'
  | 'Suspended'
  | 'Expelled'
  | 'Deceased'
  | 'Archived';

export interface Guardian {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
  isEmergencyContact: boolean;
}

export interface SubjectCombination {
  id: string;
  name: string; // e.g. 'PCM/ICT'
  level: EducationLevel;
  principalSubjectIds: string[]; // 3 subjects
  subsidiarySubjectIds: string[]; // 2 subjects (GP + ICT or Math)
}

export interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  nationality: string;
  religion?: string;
  photoUrl?: string;
  address: string;
  phone?: string;
  
  // Academic info
  level: EducationLevel;
  currentClass: string; // e.g. 'S.1', 'S.5'
  stream: string;       // e.g. 'North', 'South', 'East', 'A', 'X'
  academicYear: string; // e.g. '2026'
  admissionDate: string;
  previousSchool?: string;
  status: StudentStatus;
  
  // A-Level Specific
  combinationId?: string; // Link to SubjectCombination
  combination?: string;
  offeredSubjectIds: string[];

  // Guardians
  guardians: Guardian[];
}

export interface Teacher {
  id: string;
  teacherId: string;
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female';
  phone: string;
  email: string;
  department: string;
  qualification: string;
  employmentStatus: 'Full-Time' | 'Part-Time' | 'Contract';
  dateEmployed: string;
  photoUrl?: string;
  subjects?: string[];
  
  // Refined Assignment
  assignedSubjectIds: string[];
  assignedClassStreams: { className: string; stream: string }[];
  isClassTeacherFor?: { className: string; stream: string };
}

export type TeacherAssignmentRole =
  | 'Primary Subject Teacher'
  | 'Assistant Teacher'
  | 'Relief Teacher'
  | 'Subject Lead';

export interface TeacherAssignment {
  id: string;
  teacherId: string; // Links to Teacher.id
  teacherName: string; // e.g. "Mr. Patrick Mukasa"
  teacherCode?: string; // e.g. "TCH/2026/01"
  subjectId: string; // Links to Subject.id
  subjectCode: string; // e.g. "112", "535", "P510"
  subjectName: string; // e.g. "Mathematics", "Physics"
  className: string; // "S.1", "S.2", "S.3", "S.4", "S.5", "S.6"
  stream: string; // "North", "South", "East", "West", "Sciences", "Arts"
  level: EducationLevel; // "O-Level" | "A-Level"
  paperCodes?: string[]; // Specific papers e.g. ['545/1', '545/2']
  periodsPerWeek?: number; // Lesson periods per week (e.g. 4, 6)
  academicYear: string; // "2026"
  term?: string; // "Term I", "Term II", "Term III", "All Terms"
  role: TeacherAssignmentRole;
  assignedDate?: string;
  notes?: string;
}

export interface ClassStream {
  id: string;
  className: string; // 'S.1'..'S.6'
  streamName: string; // 'North', 'South', 'East', 'A', 'X'
  level: EducationLevel;
  classTeacherId?: string;
  assistantClassTeacherId?: string;
  capacity: number;
  academicYear: string;
}

export interface SubjectPaper {
  id: string;
  paperCode: string; // e.g. '545/1', '545/2', 'P510/1', 'S850/1'
  paperNumber: number; // 1, 2, 3
  paperName: string; // 'Theory', 'Practical', 'Paper 1', etc.
  paperType: 'Theory' | 'Practical' | 'Project' | 'Coursework' | 'Oral / Aural';
  maxMarks: number; // default 100, 80, 50, etc.
  duration?: string; // e.g. '2h 30m'
  weightPercentage?: number;
  status: 'Active' | 'Inactive';
}

export type SubjectCategory =
  | 'Compulsory'
  | 'Elective'
  | 'Principal'
  | 'Subsidiary'
  | 'Vocational'
  | 'General';

export interface Subject {
  id: string;
  code: string; // e.g., '112', '456', '535', 'P510', 'S101', 'S850'
  name: string;
  level: EducationLevel;
  category: SubjectCategory;
  department: string;
  paperCount: number;
  papers: SubjectPaper[];
  isSubsidiary?: boolean;
  status: 'Active' | 'Inactive';
  customGradingRuleId?: string;
}

export interface PaperScore {
  paperCode: string;
  paperName?: string;
  paperNumber?: number;
  rawScore?: number;
  score?: number;
  maxMarks?: number;
}

export interface MarkRecord {
  id: string;
  studentId: string;
  studentName?: string;
  studentAdmissionNo?: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  className: string;
  stream: string;
  level: EducationLevel;
  academicYear: string;
  term: string; // 'Term I', 'Term II', 'Term III'
  paperScores?: PaperScore[]; // Marks broken down by paper (Paper 1, Paper 2, etc.)
  caScore?: number; // Continuous assessment score (out of configured CA weight, e.g. 20)
  examScore?: number; // Exam/papers aggregate (out of configured Exam weight, e.g. 80)
  projectScore?: number; // Optional project work score
  totalMark: number; // 0 - 100 aggregated percentage mark
  grade: string; // e.g. 'A', 'B', 'C', 'D', 'E' or 'A', 'B', 'C', 'D', 'E', 'O', 'F'
  points: number; // e.g. 5, 4, 3, 2, 1, 0
  achievementLevel?: string; // 'Exceptional', 'Outstanding', 'Satisfactory', 'Basic', 'Elementary'
  comment?: string;
  enteredByTeacherId: string;
  isApproved: boolean;
  isLocked: boolean;
  updatedAt: string;
}

export interface GradingRuleRange {
  grade: string; // 'A', 'B', 'C', 'D', 'E' or 'O', 'F'
  minScore: number;
  maxScore: number;
  points: number; // Points value
  achievementLevel?: string; // 'Exceptional', 'Outstanding', 'Satisfactory', 'Basic', 'Elementary'
  description: string;
  isPass: boolean;
}

export interface AcademicGradingPolicy {
  id: string;
  level: EducationLevel;
  academicYear: string;
  term?: string;
  subjectId?: string; // 'All' or specific subject ID
  caWeight: number; // Default 20
  examWeight: number; // Default 80
  projectWeight?: number;
  minPassScore?: number;
  ranges: GradingRuleRange[];
  status: 'Active' | 'Inactive';
  updatedAt: string;
}

export interface AcademicYearConfig {
  id: string;
  year: string; // '2026', '2027'
  status: 'Open' | 'Closed' | 'Archived';
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface TermConfig {
  id: string;
  name: string; // 'Term I', 'Term II', 'Term III'
  academicYear: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface OLevelGradeRule {
  grade: string; // 'A', 'B', 'C', 'D', 'E'
  minScore: number;
  maxScore: number;
  points?: number; // O-Level does not use points
  achievementLevel?: string; // e.g. 'Exceptional', 'Outstanding', 'Satisfactory', 'Basic', 'Elementary'
  description: string;
  isPass?: boolean; // true for Pass, false for Fail
}

export interface ALevelGradeRule {
  grade: string; // 'A', 'B', 'C', 'D', 'E'
  minScore: number;
  maxScore: number;
  points: number; // Configurable: 5, 4, 3, 2, 1
  classification?: string; // 'Distinction', 'Credit', 'Pass', 'Elementary'
  achievementLevel?: string;
  description: string;
  isPass?: boolean;
}

export interface ALevelSubsidiaryGradeRule {
  grade: string; // 'A', 'B', 'C', 'D', 'E' (No O or F allowed)
  minScore: number;
  maxScore: number;
  points: number; // Fixed: Exactly 1 point for any valid grade A-E
  classification?: string; // 'Subsidiary Pass', 'Subsidiary Distinction', etc.
  achievementLevel?: string;
  description: string;
  isPass?: boolean;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  className: string;
  stream: string;
  status: 'Present' | 'Absent' | 'Late' | 'Sick' | 'Authorized';
  reason?: string;
  recordedBy: string;
}

export interface FeeStructure {
  id: string;
  className: string;
  term: string;
  academicYear: string;
  tuitionFee: number;
  developmentFee: number;
  boardingFee: number;
  libraryFee: number;
  ictFee: number;
  totalFee: number;
}

export interface FeePayment {
  id: string;
  receiptNo: string;
  studentId: string;
  className: string;
  term: string;
  academicYear: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: 'Cash' | 'Bank' | 'Mobile Money' | 'Other';
  referenceNo?: string;
  receivedBy: string;
  notes?: string;
}

export interface TimetableSlot {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  periodNumber: number;
  startTime: string;
  endTime: string;
  className: string;
  stream: string;
  subjectId: string;
  teacherId: string;
  roomName: string;
}

export interface ExamSchedule {
  id: string;
  title: string;
  academicYear?: string;
  term?: string;
  className?: string;
  subjectId?: string;
  paperName: string;
  examDate?: string;
  date?: string;
  timeSlot?: string;
  startTime?: string;
  endTime?: string;
  venue: string;
  invigilatorTeacherId?: string;
  invigilator?: string;
}

export interface IncidentRecord {
  id: string;
  studentId: string;
  incidentDate: string;
  category: 'Attendance' | 'Academic Misconduct' | 'Fighting' | 'Late Coming' | 'Property Damage' | 'Bullying' | 'Other';
  description: string;
  actionTaken: string;
  reportedByTeacherId: string;
  parentNotified: boolean;
  status: 'Pending' | 'In Progress' | 'Resolved';
}

export interface LibraryBook {
  id: string;
  bookId: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string;
}

export interface BookTransaction {
  id: string;
  bookId: string;
  borrowerType: 'Student' | 'Teacher';
  borrowerId: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'Issued' | 'Returned' | 'Overdue';
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  quantity: number;
  unitCost: number;
  supplier: string;
  purchaseDate: string;
  location: string;
  condition: 'New' | 'Good' | 'Needs Repair' | 'Damaged';
  minStockAlert: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetRoles: Role[];
  targetClasses?: string[];
  publishDate: string;
  authorName: string;
  isImportant: boolean;
}

export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  category: 'Academic' | 'Exam' | 'Sports' | 'PTA' | 'Holiday' | 'Staff';
  location?: string;
}

export interface SchoolDocument {
  id: string;
  title: string;
  category: 'Policies' | 'Circulars' | 'Minutes' | 'Academic' | 'Staff' | 'Student' | 'Exams';
  fileUrl: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  uploadedBy: string;
  allowedRoles: Role[];
}

export interface AuditLog {
  id: string;
  userName: string;
  userRole: Role;
  action: string;
  module: string;
  timestamp: string;
  ipAddress?: string;
  details: string;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  phone?: string;
  password?: string;
  avatarUrl?: string;
  linkedEntityId?: string; // Student ID or Teacher ID
  createdAt?: string;
  lastLogin?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'info' | 'warning' | 'success' | 'alert';
}

export interface SchoolSettings {
  schoolName: string;
  district: string;
  subCounty: string;
  poBox: string;
  telephone: string;
  email: string;
  website: string;
  motto: string;
  logoUrl: string;
  academicYear: string;
  currentTerm: string;
  headTeacherName: string;
  headTeacherSignatureTitle: string;
  caWeight: number; // Default 20%
  examWeight: number; // Default 80%
  projectWeight?: number; // e.g. 0% or 10%
  oLevelGrading: OLevelGradeRule[];
  aLevelGrading: ALevelGradeRule[];
  aLevelSubsidiaryGrading?: ALevelSubsidiaryGradeRule[];
  gradingPolicies?: AcademicGradingPolicy[];
  academicYears?: AcademicYearConfig[];
  terms?: TermConfig[];
  nextTermBeginsOn: string;
  combinations?: SubjectCombination[];
}
