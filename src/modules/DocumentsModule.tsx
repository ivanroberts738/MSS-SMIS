import React, { useState } from 'react';
import { db } from '../services/db';
import { FileText, Printer, Award, UserCheck, Eye, X, School } from 'lucide-react';

export const DocumentsModule: React.FC = () => {
  const students = db.getStudents();
  const settings = db.getSettings();

  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [documentType, setDocumentType] = useState<'leaving' | 'recommendation' | 'idcard'>('leaving');
  const [showPreview, setShowPreview] = useState(false);

  const student = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <FileText className="w-5 h-5 text-amber-400" />
            Official Documents & Certificate Generator
          </h2>
          <p className="text-xs text-slate-400">
            School Leaving Certificates, Recommendation Letters & Student Identity Cards
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Select Student</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName} ({s.admissionNo} - {s.currentClass})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Document Type</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
          >
            <option value="leaving">School Leaving Certificate</option>
            <option value="recommendation">Character Recommendation Letter</option>
            <option value="idcard">Student Identity Card</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => setShowPreview(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition-all"
          >
            <Eye className="w-4 h-4" /> Generate Document
          </button>
        </div>
      </div>

      {showPreview && student && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl p-6 text-slate-900 my-auto space-y-4">
            <div className="flex justify-between items-center text-white border-b border-slate-800 pb-2">
              <span className="font-bold text-sm font-serif">Official Document Preview</span>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold">
                  Print Document
                </button>
                <button onClick={() => setShowPreview(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Layout */}
            <div className="p-8 bg-white border border-slate-300 rounded-xl space-y-6 text-xs text-slate-900 font-serif">
              <div className="text-center border-b-2 border-slate-900 pb-4">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 mx-auto mb-2 object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-300 flex flex-col items-center justify-center text-slate-800 font-bold mx-auto mb-2">
                    <School className="w-7 h-7 text-slate-800" />
                    <span className="text-[8px] font-mono">MSS</span>
                  </div>
                )}
                <h1 className="text-xl font-black uppercase tracking-tight">MASABA SECONDARY SCHOOL BUDADIRI</h1>
                <p className="text-xs font-bold text-slate-700">P.O. Box 102 Budadiri • Motto: "{settings.motto}"</p>
                <h2 className="text-sm font-bold uppercase mt-3 bg-slate-100 inline-block px-4 py-1 border border-slate-400">
                  {documentType === 'leaving'
                    ? 'OFFICIAL SCHOOL LEAVING CERTIFICATE'
                    : documentType === 'recommendation'
                    ? 'LETTER OF RECOMMENDATION'
                    : 'STUDENT IDENTITY CERTIFICATE'}
                </h2>
              </div>

              <div className="space-y-4 text-xs font-sans leading-relaxed">
                <p>
                  This is to certify that <strong>{student.firstName} {student.lastName}</strong> (Admission No: <strong>{student.admissionNo}</strong>) was a duly registered student at Masaba Secondary School from 2023 to 2026.
                </p>
                <p>
                  During their period of study in <strong>{student.currentClass}</strong> ({student.level}), they demonstrated exemplary discipline, high academic aptitude, and active participation in co-curricular activities.
                </p>
                <p>
                  We recommend them without reservation for further studies or any position of responsibility.
                </p>
              </div>

              <div className="pt-8 border-t border-slate-400 flex justify-between items-end font-sans text-xs">
                <div>
                  <p className="font-bold">{settings.headTeacherName}</p>
                  <p className="text-slate-600">{settings.headTeacherSignatureTitle}</p>
                </div>
                <div className="w-20 h-20 rounded-full border border-dashed border-slate-400 flex items-center justify-center text-[8px] text-slate-400 uppercase font-bold text-center">
                  Official Seal
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
