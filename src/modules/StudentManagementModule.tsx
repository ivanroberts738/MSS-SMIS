import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { db as localDb } from '../services/db';
import { sanitizeForFirestore } from '../lib/firestoreUtils';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Student, EducationLevel, StudentStatus } from '../types';
import * as XLSX from 'xlsx';
import {
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Filter,
  Edit,
  Trash2,
  Eye,
  ArrowRightLeft,
  X,
  Upload,
  Printer,
  CheckCircle2,
  AlertCircle,
  UserCheck,
} from 'lucide-react';

export const StudentManagementModule: React.FC = () => {
  const { currentUser, activeRole, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const [students, setStudents] = useState<Student[]>([]);
  const classesList = localDb.getClasses();

  useEffect(() => {
    const q = query(collection(db, 'students'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const studentsList = snapshot.docs.map((doc) => ({ ...(doc.data() as Student), id: doc.id }));
        setStudents(studentsList);
      },
      (err) => console.warn('Students listener error:', err)
    );
    return () => unsubscribe();
  }, []);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState<string>('All');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Active');

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferringStudent, setTransferringStudent] = useState<Student | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({
    firstName: '',
    lastName: '',
    middleName: '',
    admissionNo: '',
    gender: 'Male',
    dateOfBirth: '2010-01-01',
    nationality: 'Ugandan',
    religion: 'Anglican',
    address: 'Budadiri',
    phone: '',
    level: 'O-Level',
    currentClass: 'S.1',
    stream: 'North',
    academicYear: '2026',
    admissionDate: '2026-02-01',
    status: 'Active',
    combination: '',
    guardians: [
      {
        id: 'g-1',
        name: '',
        relationship: 'Parent',
        phone: '',
        email: '',
        address: '',
        isEmergencyContact: true,
      },
    ],
    offeredSubjectIds: [],
  });

  // Excel Import state
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Transfer state
  const [newClass, setNewClass] = useState('S.1');
  const [newStream, setNewStream] = useState('South');

  // Filter logic
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = selectedClassFilter === 'All' || s.currentClass === selectedClassFilter;
    const matchesStream = selectedStreamFilter === 'All' || s.stream === selectedStreamFilter;
    const matchesLevel = selectedLevelFilter === 'All' || s.level === selectedLevelFilter;
    const matchesStatus = selectedStatusFilter === 'All' || s.status === selectedStatusFilter;

    return matchesSearch && matchesClass && matchesStream && matchesLevel && matchesStatus;
  });

  // Form submit handler
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.admissionNo) {
      showToast('First Name, Last Name and Admission Number are required.', 'error');
      return;
    }

    // Note: Combinations should also be in Firestore. 
    // Simplified for now.
    const studentToSave: Student = {
      id: editingStudent ? editingStudent.id : `std-${Date.now()}`,
      admissionNo: formData.admissionNo!,
      firstName: formData.firstName!,
      middleName: formData.middleName,
      lastName: formData.lastName!,
      gender: (formData.gender as 'Male' | 'Female') || 'Male',
      dateOfBirth: formData.dateOfBirth || '2010-01-01',
      nationality: formData.nationality || 'Ugandan',
      religion: formData.religion,
      address: formData.address || 'Budadiri',
      phone: formData.phone,
      level: (formData.level as EducationLevel) || 'O-Level',
      currentClass: formData.currentClass || 'S.1',
      stream: formData.stream || 'North',
      academicYear: formData.academicYear || '2026',
      admissionDate: formData.admissionDate || '2026-02-01',
      status: (formData.status as StudentStatus) || 'Active',
      combination: formData.combination,
      photoUrl: formData.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${formData.firstName}`,
      offeredSubjectIds: formData.offeredSubjectIds || [],
      guardians: formData.guardians && formData.guardians.length > 0 ? formData.guardians : [
        {
          id: `g-${Date.now()}`,
          name: 'Parent Name',
          relationship: 'Parent',
          phone: '+256 700 000000',
          isEmergencyContact: true,
        },
      ],
    };

    try {
        const sanitizedStudent = sanitizeForFirestore(studentToSave);
        await setDoc(doc(db, 'students', studentToSave.id), sanitizedStudent);
        try {
          localDb.saveStudent(studentToSave, currentUser.fullName, activeRole);
        } catch (err) {
          console.warn('Local db save student:', err);
        }
        showToast(`Student ${studentToSave.firstName} ${studentToSave.lastName} saved successfully.`, 'success');
        setShowAddEditModal(false);
        setEditingStudent(null);
    } catch (e: any) {
        console.error('Error saving student:', e);
        showToast(`Failed to save student: ${e?.message || 'Check connection'}`, 'error');
    }
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setFormData(student);
    setShowAddEditModal(true);
  };

  const handleDeleteClick = async (studentId: string) => {
    if (confirm('Are you sure you want to archive/remove this student record?')) {
        try {
            await deleteDoc(doc(db, 'students', studentId));
            try {
              localDb.deleteStudent(studentId, currentUser.fullName, activeRole);
            } catch (err) {
              console.warn('Local db delete student:', err);
            }
            showToast('Student record archived.', 'info');
        } catch (e: any) {
            console.error('Error deleting student:', e);
            showToast(`Failed to delete student: ${e?.message || 'Check connection'}`, 'error');
        }
    }
  };

  // Transfer student handler
  const handleConfirmTransfer = async () => {
    if (!transferringStudent) return;
    const updated = {
      ...transferringStudent,
      currentClass: newClass,
      stream: newStream,
      level: (newClass.startsWith('S.5') || newClass.startsWith('S.6') ? 'A-Level' : 'O-Level') as EducationLevel,
    };
    try {
        const sanitizedTransfer = sanitizeForFirestore(updated);
        await setDoc(doc(db, 'students', updated.id), sanitizedTransfer);
        try {
          localDb.saveStudent(updated, currentUser.fullName, activeRole);
        } catch (err) {
          console.warn('Local db transfer student:', err);
        }
        showToast(`Transferred ${transferringStudent.firstName} to ${newClass} ${newStream}.`, 'success');
        setShowTransferModal(false);
        setTransferringStudent(null);
    } catch (e: any) {
        console.error('Error transferring student:', e);
        showToast(`Failed to transfer student: ${e?.message || 'Check connection'}`, 'error');
    }
  };

  // ... (keeping other methods and render as is, they should still work with the updated state/handlers)

  // Excel Template download
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Admission Number': 'MSS/2026/501',
        'First Name': 'Moses',
        'Middle Name': 'Joseph',
        'Last Name': 'Mugeni',
        Gender: 'Male',
        'Date of Birth': '2010-05-12',
        Class: 'S.1',
        Stream: 'North',
        Level: 'O-Level',
        Combination: '',
        'Guardian Name': 'David Mugeni',
        'Guardian Phone': '+256772123456',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'Masaba_Student_Import_Template.xlsx');
  };

  // Excel File Upload Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const parsed: Student[] = [];
        const errs: string[] = [];

        data.forEach((row: any, idx: number) => {
          const adm = row['Admission Number'] || row['AdmissionNo'];
          const fn = row['First Name'] || row['FirstName'];
          const ln = row['Last Name'] || row['LastName'];

          if (!adm || !fn || !ln) {
            errs.push(`Row ${idx + 2}: Missing required fields (Admission Number, First Name, or Last Name)`);
          } else {
              const combName = row['Combination'] || '';
              const comb = localDb.getCombinations().find(c => c.name === combName);
              const subjects = comb ? [...comb.principalSubjectIds, ...comb.subsidiarySubjectIds] : ['sub-112', 'sub-456'];

              parsed.push({
                id: `std-imp-${Date.now()}-${idx}`,
                admissionNo: String(adm),
                firstName: String(fn),
                middleName: row['Middle Name'] ? String(row['Middle Name']) : '',
                lastName: String(ln),
                gender: (row['Gender'] === 'Female' ? 'Female' : 'Male'),
                dateOfBirth: row['Date of Birth'] ? String(row['Date of Birth']) : '2010-01-01',
                nationality: 'Ugandan',
                address: 'Budadiri',
                level: (row['Level'] || (String(row['Class']).startsWith('S.5') ? 'A-Level' : 'O-Level')) as EducationLevel,
                currentClass: row['Class'] ? String(row['Class']) : 'S.1',
                stream: row['Stream'] ? String(row['Stream']) : 'North',
                academicYear: '2026',
                admissionDate: '2026-02-01',
                status: 'Active',
                combination: combName,
                combinationId: comb?.id,
                photoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${fn}`,
                offeredSubjectIds: subjects,
                guardians: [
                  {
                    id: `g-imp-${idx}`,
                    name: row['Guardian Name'] ? String(row['Guardian Name']) : 'Guardian',
                    relationship: 'Parent',
                    phone: row['Guardian Phone'] ? String(row['Guardian Phone']) : '+256700000000',
                    isEmergencyContact: true,
                  },
                ],
              });
          }
        });

        setImportedRows(parsed);
        setImportErrors(errs);
      } catch (err) {
        showToast('Failed to parse Excel file.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (importedRows.length === 0) return;
    try {
      const batch = writeBatch(db);
      importedRows.forEach((row) => {
        const studentRef = doc(db, 'students', row.id);
        batch.set(studentRef, row);
      });
      await batch.commit();
      showToast(`Successfully imported ${importedRows.length} student records to Cloud Firestore!`, 'success');
      setShowExcelImportModal(false);
      setImportedRows([]);
      setImportErrors([]);
    } catch (e: any) {
      showToast(`Error importing students: ${e.message}`, 'error');
    }
  };

  // Export Table to CSV
  const handleExportCSV = () => {
    const exportData = filteredStudents.map((s) => ({
      'Admission No': s.admissionNo,
      'First Name': s.firstName,
      'Last Name': s.lastName,
      Gender: s.gender,
      Class: s.currentClass,
      Stream: s.stream,
      Level: s.level,
      Combination: s.combination || 'N/A',
      Status: s.status,
      Guardian: s.guardians[0]?.name || '',
      'Guardian Phone': s.guardians[0]?.phone || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Directory');
    XLSX.writeFile(workbook, `Masaba_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <Users className="w-5 h-5 text-blue-400" />
            Student Management & Admissions
          </h2>
          <p className="text-xs text-slate-400">
            Masaba Secondary School • Total active records: <strong className="text-white">{students.length}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setEditingStudent(null);
              setFormData({
                firstName: '',
                lastName: '',
                middleName: '',
                admissionNo: `MSS/2026/${Math.floor(100 + Math.random() * 900)}`,
                gender: 'Male',
                dateOfBirth: '2010-01-01',
                nationality: 'Ugandan',
                religion: 'Anglican',
                address: 'Budadiri',
                level: 'O-Level',
                currentClass: 'S.1',
                stream: 'North',
                academicYear: '2026',
                admissionDate: '2026-02-01',
                status: 'Active',
                combination: '',
                guardians: [{ id: 'g-1', name: '', relationship: 'Parent', phone: '', isEmergencyContact: true }],
                offeredSubjectIds: [],
              });
              setShowAddEditModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add New Student
          </button>

          <button
            onClick={() => setShowExcelImportModal(true)}
            className="flex items-center gap-2 bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-700/60 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Excel Import
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Export
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* Search Bar */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search student name or admission no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filter Class */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="w-full bg-transparent text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-slate-900">All Classes</option>
            <option value="S.1" className="bg-slate-900">S.1</option>
            <option value="S.2" className="bg-slate-900">S.2</option>
            <option value="S.3" className="bg-slate-900">S.3</option>
            <option value="S.4" className="bg-slate-900">S.4</option>
            <option value="S.5" className="bg-slate-900">S.5 (A-Level)</option>
            <option value="S.6" className="bg-slate-900">S.6 (A-Level)</option>
          </select>
        </div>

        {/* Filter Stream */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
          <span className="text-slate-400 text-[10px] uppercase font-bold">Stream:</span>
          <select
            value={selectedStreamFilter}
            onChange={(e) => setSelectedStreamFilter(e.target.value)}
            className="w-full bg-transparent text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-slate-900">All Streams</option>
            <option value="North" className="bg-slate-900">North</option>
            <option value="South" className="bg-slate-900">South</option>
            <option value="East" className="bg-slate-900">East</option>
            <option value="A" className="bg-slate-900">Stream A</option>
            <option value="X" className="bg-slate-900">Stream X</option>
          </select>
        </div>

        {/* Filter Status */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
          <span className="text-slate-400 text-[10px] uppercase font-bold">Status:</span>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full bg-transparent text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-slate-900">All Statuses</option>
            <option value="Active" className="bg-slate-900">Active</option>
            <option value="Transferred" className="bg-slate-900">Transferred</option>
            <option value="Graduated" className="bg-slate-900">Graduated</option>
            <option value="Suspended" className="bg-slate-900">Suspended</option>
          </select>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-sans font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Admission No</th>
                <th className="p-3.5">Class / Stream</th>
                <th className="p-3.5">Level & Combination</th>
                <th className="p-3.5">Guardian Contact</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No matching student records found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${student.firstName}`}
                          alt={student.firstName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-700 bg-slate-800"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-bold text-white">
                            {student.firstName} {student.middleName || ''} {student.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400">{student.gender} • DOB: {student.dateOfBirth}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-amber-300/90 font-semibold">{student.admissionNo}</td>
                    <td className="p-3.5">
                      <span className="font-semibold text-white">{student.currentClass}</span>{' '}
                      <span className="text-slate-400">({student.stream})</span>
                    </td>
                    <td className="p-3.5">
                      <p className="text-slate-200">{student.level}</p>
                      {student.combination && (
                        <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800/50 px-1.5 py-0.2 rounded font-mono">
                          {student.combination}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <p className="text-slate-200">{student.guardians[0]?.name || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{student.guardians[0]?.phone || 'N/A'}</p>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          student.status === 'Active'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : student.status === 'Transferred'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                            : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingStudent(student)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                          title="View Detailed Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {hasPermission('Students', 'edit') && (
                          <>
                            <button
                              onClick={() => {
                                setTransferringStudent(student);
                                setNewClass(student.currentClass);
                                setNewStream(student.stream);
                                setShowTransferModal(true);
                              }}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-amber-400 hover:text-amber-300"
                              title="Transfer Class / Stream"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditClick(student)}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-blue-400 hover:text-blue-300"
                              title="Edit Profile"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(student.id)}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-rose-400 hover:text-rose-300"
                              title="Archive Student"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col text-slate-100">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm font-serif">
                {editingStudent ? 'Edit Student Profile' : 'Register New Student — Masaba Secondary School'}
              </h3>
              <button onClick={() => setShowAddEditModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Personal Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">1. Personal Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={formData.middleName || ''}
                      onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Admission Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.admissionNo || ''}
                      onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-amber-300 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Gender</label>
                    <select
                      value={formData.gender || 'Male'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth || '2010-01-01'}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Academic Details */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">2. Academic Assignment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Level</label>
                    <select
                      value={formData.level || 'O-Level'}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value as EducationLevel })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
                    >
                      <option value="O-Level">O-Level (S.1–S.4)</option>
                      <option value="A-Level">A-Level (S.5–S.6)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Class</label>
                    <select
                      value={formData.currentClass || 'S.1'}
                      onChange={(e) => setFormData({ ...formData, currentClass: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
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
                    <label className="block text-slate-400 mb-1">Stream</label>
                    <select
                      value={formData.stream || 'North'}
                      onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
                    >
                      <option value="North">North</option>
                      <option value="South">South</option>
                      <option value="East">East</option>
                      <option value="A">Stream A (A-Level)</option>
                      <option value="X">Stream X (A-Level)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">A-Level Combination</label>
                    <select
                      value={formData.combination || ''}
                      onChange={(e) => setFormData({ ...formData, combination: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none font-mono"
                    >
                      <option value="">Select Combination</option>
                      {localDb.getCombinations().map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Guardian Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">3. Guardian / Parent Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Guardian Name</label>
                    <input
                      type="text"
                      value={formData.guardians?.[0]?.name || ''}
                      onChange={(e) => {
                        const updatedG = [...(formData.guardians || [])];
                        updatedG[0] = { ...updatedG[0], name: e.target.value };
                        setFormData({ ...formData, guardians: updatedG });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Guardian Phone</label>
                    <input
                      type="text"
                      placeholder="+256 700 000000"
                      value={formData.guardians?.[0]?.phone || ''}
                      onChange={(e) => {
                        const updatedG = [...(formData.guardians || [])];
                        updatedG[0] = { ...updatedG[0], phone: e.target.value };
                        setFormData({ ...formData, guardians: updatedG });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Relationship</label>
                    <input
                      type="text"
                      placeholder="Father, Mother, Guardian"
                      value={formData.guardians?.[0]?.relationship || 'Parent'}
                      onChange={(e) => {
                        const updatedG = [...(formData.guardians || [])];
                        updatedG[0] = { ...updatedG[0], relationship: e.target.value };
                        setFormData({ ...formData, guardians: updatedG });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl"
                >
                  Save Student Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed View Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 text-slate-100 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-4">
                <img
                  src={viewingStudent.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${viewingStudent.firstName}`}
                  alt={viewingStudent.firstName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 bg-slate-800 shadow-md"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="text-lg font-bold text-white font-serif">
                    {viewingStudent.firstName} {viewingStudent.middleName || ''} {viewingStudent.lastName}
                  </h3>
                  <p className="text-xs text-amber-300 font-mono font-semibold">
                    {viewingStudent.admissionNo} • {viewingStudent.currentClass} {viewingStudent.stream}
                  </p>
                  <p className="text-xs text-slate-400">Masaba Secondary School Budadiri</p>
                </div>
              </div>
              <button onClick={() => setViewingStudent(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Gender & DOB</span>
                <p className="font-semibold text-slate-200">{viewingStudent.gender} • {viewingStudent.dateOfBirth}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Level & Combination</span>
                <p className="font-semibold text-slate-200">{viewingStudent.level} {viewingStudent.combination ? `(${viewingStudent.combination})` : ''}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Guardian Contact</span>
                <p className="font-semibold text-slate-200">{viewingStudent.guardians[0]?.name}</p>
                <p className="text-slate-400 font-mono">{viewingStudent.guardians[0]?.phone}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Address</span>
                <p className="font-semibold text-slate-200">{viewingStudent.address}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs"
              >
                <Printer className="w-4 h-4 text-amber-400" /> Print Profile Card
              </button>
              <button
                onClick={() => setViewingStudent(null)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showExcelImportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 text-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm font-serif flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Import Students via Excel / CSV
              </h3>
              <button onClick={() => setShowExcelImportModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">Download Standard Excel Template</p>
                  <p className="text-slate-400 text-[11px]">Includes columns for Admission No, Names, Class, Stream, Guardians.</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-3 py-1.5 rounded-xl font-medium"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>

              {/* Upload Drop Zone */}
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-950/40">
                <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-200">Click or drag Excel (.xlsx, .xls) file here</p>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="mt-2 text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-950 file:text-emerald-300 hover:file:bg-emerald-900 cursor-pointer"
                />
              </div>

              {/* Validation Summary */}
              {importedRows.length > 0 && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Validated {importedRows.length} student records ready for database import.</span>
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Errors detected in file:</span>
                  </div>
                  {importErrors.map((err, i) => (
                    <p key={i} className="text-[11px] text-rose-300/80">• {err}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowExcelImportModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                disabled={importedRows.length === 0}
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs"
              >
                Confirm & Import Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer / Stream Change Modal */}
      {showTransferModal && transferringStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <h3 className="font-bold text-white text-sm font-serif">
              Transfer Student — {transferringStudent.firstName} {transferringStudent.lastName}
            </h3>
            <p className="text-xs text-slate-400">Current Placement: {transferringStudent.currentClass} {transferringStudent.stream}</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">New Class</label>
                <select
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  {classesList.map((c) => (
                    <option key={c.id} value={c.className}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">New Stream</label>
                <select
                  value={newStream}
                  onChange={(e) => setNewStream(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="A">Stream A</option>
                  <option value="X">Stream X</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransfer}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-xs"
              >
                Confirm Placement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
