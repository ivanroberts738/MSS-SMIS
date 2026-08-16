import React, { useState, useRef, useMemo } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Student, MarkRecord, Subject } from '../types';
import {
  FileCheck,
  Printer,
  Download,
  Eye,
  X,
  Users,
  Search,
  CheckCircle2,
  Award,
  School,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';

export const ReportCardModule: React.FC = () => {
  const { currentUser, activeRole } = useAuth();
  const { showToast } = useNotification();
  const settings = db.getSettings();
  const students = db.getStudents();
  const subjects = db.getSubjects();
  const marks = db.getMarks();

  const [selectedClassFilter, setSelectedClassFilter] = useState('S.1');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState('North');
  const [selectedTerm, setSelectedTerm] = useState('Term II');

  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [showMultiPaperDetails, setShowMultiPaperDetails] = useState(false);

  const reportCardRef = useRef<HTMLDivElement>(null);

  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.currentClass === selectedClassFilter &&
        s.stream === selectedStreamFilter &&
        s.status === 'Active'
    );
  }, [students, selectedClassFilter, selectedStreamFilter]);

  const getStudentMarks = (studentId: string): MarkRecord[] => {
    return marks.filter(
      (m) =>
        m.studentId === studentId &&
        m.term === selectedTerm &&
        m.academicYear === settings.academicYear
    );
  };

  const isALevel = selectedClassFilter.startsWith('S.5') || selectedClassFilter.startsWith('S.6');

  // Compute student summary performance
  const getStudentPerformanceSummary = (studentMarks: MarkRecord[], studentId?: string) => {
    if (studentMarks.length === 0) {
      return { totalPoints: 0, principalPoints: 0, subsidiaryPoints: 0, division: 'N/A', averageScore: 0, passedSubjects: 0 };
    }

    const averageScore = Math.round(
      studentMarks.reduce((sum, m) => sum + (m.totalMark || 0), 0) / studentMarks.length
    );

    let division = 'Competent';
    let passedSubjects = 0;
    let principalPoints = 0;
    let subsidiaryPoints = 0;
    let totalPoints = 0;

    if (!isALevel) {
      // O-Level 2026 Lower Secondary Evaluation: Grades Only (A-E), Strictly NO Points!
      passedSubjects = studentMarks.filter((m) => m.grade !== 'E' && m.grade !== 'F9').length;
      const countA = studentMarks.filter((m) => m.grade === 'A').length;
      const countB = studentMarks.filter((m) => m.grade === 'B').length;
      const countC = studentMarks.filter((m) => m.grade === 'C').length;

      if (countA >= 5 && passedSubjects >= 7) {
        division = 'Level 1: Exceptional (Distinction)';
      } else if (countA + countB >= 5 && passedSubjects >= 6) {
        division = 'Level 2: Outstanding (High Credit)';
      } else if (passedSubjects >= 5) {
        division = 'Level 3: Satisfactory (Credit)';
      } else if (passedSubjects >= 3) {
        division = 'Level 4: Basic (Pass)';
      } else {
        division = 'Level 5: Elementary (Remedial)';
      }
    } else {
      // A-Level UACE Points (Principal 5-1 pts, Subsidiary fixed 1 pt, Total max 20)
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
          subsidiaryPoints += 1;
        } else {
          principalPoints += m.points || 0;
        }
      });

      totalPoints = principalPoints + subsidiaryPoints;
      const principalPassCount = studentMarks.filter((m) => {
        const sub = subjects.find((s) => s.id === m.subjectId);
        const isSub = sub?.isSubsidiary || sub?.category === 'Subsidiary';
        return !isSub && m.points >= 1;
      }).length;

      if (principalPassCount >= 3 && totalPoints >= 17) {
        division = `3 Principal Passes (${totalPoints} Pts - High Distinction)`;
      } else if (principalPassCount >= 3) {
        division = `3 Principal Passes (${totalPoints} Pts - Merit)`;
      } else if (principalPassCount === 2) {
        division = `2 Principal Passes (${totalPoints} Pts - Satisfactory)`;
      } else if (principalPassCount === 1) {
        division = `1 Principal Pass (${totalPoints} Pts - Subsidiary)`;
      } else {
        division = `0 Principal Passes (${totalPoints} Pts - Fail/U)`;
      }
      passedSubjects = studentMarks.filter((m) => m.points >= 1).length;
    }

    return { totalPoints, principalPoints, subsidiaryPoints, division, averageScore, passedSubjects };
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <FileCheck className="w-5 h-5 text-amber-400" />
            Official UNEB Report Card Generator
          </h2>
          <p className="text-xs text-slate-400">
            MASABA SECONDARY SCHOOL BUDADIRI • Single-Page Printable Academic Performance & Competency Reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-md"
          >
            <Printer className="w-4 h-4" /> Print Current View
          </button>
        </div>
      </div>

      {/* Class & Term Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Academic Class</label>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
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

        <div>
          <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Stream</label>
          <select
            value={selectedStreamFilter}
            onChange={(e) => setSelectedStreamFilter(e.target.value)}
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
          <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Academic Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
          >
            <option value="Term I">Term I</option>
            <option value="Term II">Term II</option>
            <option value="Term III">Term III</option>
          </select>
        </div>
      </div>

      {/* Students List for Report Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Class Students — {selectedClassFilter} {selectedStreamFilter} ({filteredStudents.length})
          </h3>
          {filteredStudents.length > 0 && (
            <button
              onClick={() => setPreviewStudent(filteredStudents[0])}
              className="text-xs text-amber-300 hover:text-amber-200 font-semibold bg-amber-950/60 border border-amber-800/60 px-3 py-1.5 rounded-xl transition-all"
            >
              Generate First Report Card
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStudents.map((std) => {
            const stdMarks = getStudentMarks(std.id);
            const perf = getStudentPerformanceSummary(stdMarks);

            return (
              <div
                key={std.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-blue-500/50 transition-colors text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={std.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${std.firstName}`}
                    alt={std.firstName}
                    className="w-10 h-10 rounded-xl object-cover bg-slate-800 border border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-bold text-white">
                      {std.firstName} {std.lastName}
                    </h4>
                    <p className="text-[10px] text-amber-300 font-mono">{std.admissionNo}</p>
                    <p className="text-[10px] text-slate-400">
                      {stdMarks.length} subjects •{' '}
                      {isALevel ? (
                        <strong className="text-emerald-400">
                          {perf.totalPoints} Pts ({perf.principalPoints} Prin + {perf.subsidiaryPoints} Sub)
                        </strong>
                      ) : (
                        <strong className="text-blue-400">Avg {perf.averageScore}% • {perf.passedSubjects} Passed</strong>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPreviewStudent(std)}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-all shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Printable Report Card Modal View */}
      {previewStudent && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden text-slate-900 my-auto flex flex-col max-h-[95vh]">
            {/* Modal Control Header (Hidden during actual print) */}
            <div className="print:hidden p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm font-serif">
                  Report Card: {previewStudent.firstName} {previewStudent.lastName} ({previewStudent.admissionNo})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-xs">
                  <input
                    type="checkbox"
                    checked={showMultiPaperDetails}
                    onChange={(e) => setShowMultiPaperDetails(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Show Paper Breakdown</span>
                </label>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-xl text-xs font-semibold shadow-md"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setPreviewStudent(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Report Card Content (Strict 1-Page Official Ugandan Document Design) */}
            <div
              ref={reportCardRef}
              className="p-6 bg-white text-slate-900 overflow-y-auto print:p-0 print:overflow-visible font-sans text-xs"
              style={{ minHeight: '800px' }}
            >
              {/* Official School Letterhead */}
              <div className="border-b-2 border-slate-900 pb-3 mb-3 text-center">
                <div className="flex items-center justify-center gap-4 mb-1.5">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Masaba Crest"
                      className="w-16 h-16 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-300 flex flex-col items-center justify-center text-slate-800 font-bold shrink-0">
                      <School className="w-7 h-7 text-slate-800" />
                      <span className="text-[8px] font-mono">MSS</span>
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-black font-serif tracking-tight text-slate-900 uppercase">
                      {settings.schoolName || 'MASABA SECONDARY SCHOOL'}
                    </h1>
                    <p className="text-xs font-bold text-slate-700 tracking-widest uppercase">
                      {settings.district || 'BUDADIRI — SIRONKO DISTRICT'}
                    </p>
                    <p className="text-[10px] italic text-slate-600 font-serif font-medium">
                      Motto: "{settings.motto || 'Strive for Excellence'}"
                    </p>
                    <p className="text-[9px] text-slate-500">
                      P.O. Box {settings.poBox || '102'} Budadiri • Tel: {settings.telephone}
                    </p>
                  </div>
                </div>

                <div className="mt-1 inline-block bg-slate-900 text-white font-bold font-serif text-[11px] px-5 py-0.5 rounded-full uppercase tracking-wider">
                  OFFICIAL ACADEMIC PERFORMANCE REPORT — {settings.academicYear} {selectedTerm}
                </div>
              </div>

              {/* Student Identification Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-300 mb-3 text-[11px]">
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[9px]">Student Name</span>
                  <strong className="text-slate-900 font-bold uppercase">
                    {previewStudent.lastName}, {previewStudent.firstName} {previewStudent.middleName || ''}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[9px]">Admission Number</span>
                  <strong className="text-blue-900 font-mono font-bold">{previewStudent.admissionNo}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[9px]">Class & Stream</span>
                  <strong className="text-slate-900 font-bold">
                    {previewStudent.currentClass} {previewStudent.stream}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[9px]">Curriculum Level</span>
                  <strong className="text-slate-900 font-bold">
                    {previewStudent.level} {previewStudent.combination ? `(${previewStudent.combination})` : ''}
                  </strong>
                </div>
              </div>

              {/* Subject Marks Table */}
              <div className="mb-3">
                <table className="w-full border-collapse border border-slate-400 text-center text-[10px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold uppercase border-b border-slate-400">
                      <th className="border border-slate-400 p-1.5 text-left">Subject Code & Name</th>
                      <th className="border border-slate-400 p-1.5 w-14">CA ({settings.caWeight ?? 20})</th>
                      <th className="border border-slate-400 p-1.5 w-14">Exam ({settings.examWeight ?? 80})</th>
                      <th className="border border-slate-400 p-1.5 w-16 bg-slate-300 font-black">Total (100)</th>
                      <th className="border border-slate-400 p-1.5 w-12">Grade</th>
                      {isALevel && <th className="border border-slate-400 p-1.5 w-12">Points</th>}
                      <th className="border border-slate-400 p-1.5 w-24">{isALevel ? 'Classification' : 'Competency Level'}</th>
                      <th className="border border-slate-400 p-1.5 text-left">Subject Teacher Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getStudentMarks(previewStudent.id).map((m) => {
                      const sub = subjects.find((s) => s.id === m.subjectId);
                      const isSub =
                        sub?.isSubsidiary ||
                        sub?.category === 'Subsidiary' ||
                        (sub?.code &&
                          (sub.code.startsWith('S101') ||
                            sub.code.startsWith('S850') ||
                            sub.code.startsWith('S840')));

                      return (
                        <React.Fragment key={m.id}>
                          <tr className="border-b border-slate-300 hover:bg-slate-50">
                            <td className="border border-slate-300 p-1.5 text-left font-semibold text-slate-900">
                              <span className="font-mono font-bold text-slate-800 mr-1">{sub?.code}</span>{' '}
                              {sub?.name || 'Subject'}
                            </td>
                            <td className="border border-slate-300 p-1.5 font-mono">{m.caScore}</td>
                            <td className="border border-slate-300 p-1.5 font-mono">{m.examScore}</td>
                            <td className="border border-slate-300 p-1.5 font-mono font-black bg-slate-100 text-slate-900">
                              {m.totalMark}%
                            </td>
                            <td className="border border-slate-300 p-1.5 font-black font-mono text-blue-900">
                              {m.grade}
                            </td>
                            {isALevel && (
                              <td className="border border-slate-300 p-1.5 font-bold font-mono text-emerald-800">
                                {isSub ? 1 : m.points}
                              </td>
                            )}
                            <td className="border border-slate-300 p-1.5 text-slate-800 font-semibold">
                              {m.achievementLevel || (isALevel ? (m.points >= 4 ? 'Distinction' : m.points >= 2 ? 'Credit' : 'Pass') : 'Competent')}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-left text-slate-700 italic">
                              {m.comment || 'Consistent understanding.'}
                            </td>
                          </tr>

                          {/* Optional Multi-Paper Breakdown */}
                          {showMultiPaperDetails && m.paperScores && m.paperScores.length > 0 && (
                            <tr className="bg-slate-50/70 border-b border-slate-200 text-[9px] text-slate-600">
                              <td colSpan={isALevel ? 9 : 7} className="p-1 pl-4 text-left">
                                <span className="font-bold text-slate-700">Papers Breakdown: </span>
                                {m.paperScores.map((ps) => (
                                  <span key={ps.paperCode} className="mr-3">
                                    <strong>{ps.paperCode}:</strong> {ps.score}/{ps.maxMarks || 100}
                                  </span>
                                ))}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Stats & Division Box */}
              {(() => {
                const stdMarks = getStudentMarks(previewStudent.id);
                const perf = getStudentPerformanceSummary(stdMarks);

                return (
                  <div className="grid grid-cols-3 gap-2 mb-3 text-[10px]">
                    <div className="p-2 bg-slate-50 border border-slate-300 rounded text-center">
                      <span className="text-slate-500 uppercase block font-bold text-[8px]">
                        {isALevel ? 'Total A-Level Points' : 'Curriculum Assessment'}
                      </span>
                      {isALevel ? (
                        <div>
                          <strong className="text-base font-black font-mono text-slate-900">
                            {perf.totalPoints} / 17 Points
                          </strong>
                          <span className="block text-[8px] text-slate-600 font-semibold">
                            {perf.principalPoints} Principal + {perf.subsidiaryPoints} Sub
                          </span>
                        </div>
                      ) : (
                        <div>
                          <strong className="text-base font-black font-mono text-slate-900">
                            {perf.passedSubjects} / {stdMarks.length} Passed
                          </strong>
                          <span className="block text-[8px] text-emerald-700 font-semibold">
                            Grades: {stdMarks.map((m) => m.grade).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-300 rounded text-center">
                      <span className="text-slate-500 uppercase block font-bold text-[8px]">
                        Average Mark
                      </span>
                      <strong className="text-base font-black font-mono text-blue-900">
                        {perf.averageScore}%
                      </strong>
                      <span className="block text-[8px] text-slate-600">Across All Subjects</span>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-300 rounded text-center">
                      <span className="text-slate-500 uppercase block font-bold text-[8px]">
                        {isALevel ? 'UACE Qualification Award' : 'Overall Competency Level'}
                      </span>
                      <strong className="text-base font-black text-amber-800 uppercase block leading-tight">
                        {perf.division}
                      </strong>
                    </div>
                  </div>
                );
              })()}

              {/* Official Comments */}
              <div className="space-y-1.5 border-t border-slate-300 pt-2 text-[10px]">
                <div className="p-2 border border-slate-200 rounded">
                  <span className="font-bold text-slate-900 uppercase">Class Teacher's Remark:</span>
                  <p className="italic text-slate-700 mt-0.5">
                    Demonstrates sound competency across core subject areas with commendable class discipline and regular attendance.
                  </p>
                </div>

                <div className="p-2 border border-slate-200 rounded">
                  <span className="font-bold text-slate-900 uppercase">Headteacher's Remark:</span>
                  <p className="italic text-slate-700 mt-0.5">
                    A very promising academic trajectory. Encouraged to sustain diligent effort and leadership.
                  </p>
                </div>
              </div>

              {/* Official Stamp & Signature Block */}
              <div className="mt-4 pt-3 border-t-2 border-slate-900 flex items-center justify-between text-[10px]">
                <div className="text-left">
                  <p className="font-bold text-slate-900">{settings.headTeacherName || 'Mr. Wamoto Stephen'}</p>
                  <p className="text-slate-600 font-medium">Headteacher & Secretary to B.O.G</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">
                    Date of Issue: {new Date().toISOString().split('T')[0]}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 font-medium">Next Term Begins On:</p>
                  <p className="font-bold text-slate-900">{settings.nextTermBeginsOn || 'TBA'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
