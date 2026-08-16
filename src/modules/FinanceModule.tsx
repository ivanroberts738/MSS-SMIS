import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { FeePayment, FeeStructure } from '../types';
import {
  DollarSign,
  Plus,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Building2,
  X,
} from 'lucide-react';

export const FinanceModule: React.FC = () => {
  const { currentUser, activeRole } = useAuth();
  const { showToast } = useNotification();

  const settings = db.getSettings();
  const students = db.getStudents();
  const payments = db.getPayments();
  const feeStructures = db.getFeeStructures();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');

  // Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [printingReceipt, setPrintingReceipt] = useState<FeePayment | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    studentId: students[0]?.id || '',
    amountPaid: 200000,
    paymentMethod: 'Bank Deposit',
    referenceNo: `BANK-${Math.floor(100000 + Math.random() * 900000)}`,
    receivedBy: currentUser.fullName,
    narration: 'Term II Tuition Fees Payment',
  });

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === paymentForm.studentId);
    if (!student) {
      showToast('Please select a valid student.', 'error');
      return;
    }

    const classFee = feeStructures.find((f) => f.className === student.currentClass)?.totalFee || 450000;

    const newPayment: FeePayment = {
      id: `pay-${Date.now()}`,
      receiptNo: `REC/2026/${Math.floor(1000 + Math.random() * 9000)}`,
      studentId: student.id,
      className: student.currentClass,
      term: 'Term II',
      academicYear: settings.academicYear,
      amountPaid: Number(paymentForm.amountPaid),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: (paymentForm.paymentMethod === 'Bank Deposit' ? 'Bank' : paymentForm.paymentMethod) as any,
      referenceNo: paymentForm.referenceNo,
      receivedBy: currentUser.fullName,
      notes: paymentForm.narration,
    };

    db.recordPayment(newPayment, currentUser.fullName, activeRole);
    showToast(`Payment recorded! Receipt: ${newPayment.receiptNo}`, 'success');
    setShowPaymentModal(false);
    setPrintingReceipt(newPayment);
  };

  const enrichedPayments = payments.map((p) => {
    const student = students.find((s) => s.id === p.studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'Student Name';
    const admissionNo = student ? student.admissionNo : p.studentId;
    const classFee = feeStructures.find((f) => f.className === p.className)?.totalFee || 450000;
    const totalStudentPaid = payments
      .filter((pay) => pay.studentId === p.studentId && pay.term === p.term)
      .reduce((sum, pay) => sum + pay.amountPaid, 0);
    const balanceRemaining = Math.max(0, classFee - totalStudentPaid);

    return {
      ...p,
      studentName,
      admissionNo,
      classFee,
      balanceRemaining,
    };
  });

  const filteredPayments = enrichedPayments.filter((p) => {
    const matchesSearch =
      p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.receiptNo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = selectedClass === 'All' || p.className === selectedClass;

    return matchesSearch && matchesClass;
  });

  // Calculate totals
  const totalCollections = payments.reduce((sum, p) => sum + p.amountPaid, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Bursary & Fee Management
          </h2>
          <p className="text-xs text-slate-400">
            Masaba Secondary School • Total Fees Collected: <strong className="text-emerald-400 font-mono">UGX {totalCollections.toLocaleString()}</strong>
          </p>
        </div>

        <button
          onClick={() => setShowPaymentModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" /> Record Fee Payment
        </button>
      </div>

      {/* Fee Structures Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {feeStructures.map((fs) => (
          <div key={fs.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm font-serif">{fs.className} Fee Structure</span>
              <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-mono font-bold">
                {fs.term}
              </span>
            </div>
            <p className="text-xl font-black font-mono text-emerald-400">UGX {fs.totalFee.toLocaleString()}</p>
            <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800">
              <p>Tuition: UGX {fs.tuitionFee.toLocaleString()}</p>
              <p>Development Fund: UGX {fs.developmentFee.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, admission no, or receipt no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 cursor-pointer w-full sm:w-40"
          >
            <option value="All">All Classes</option>
            <option value="S.1">S.1</option>
            <option value="S.2">S.2</option>
            <option value="S.3">S.3</option>
            <option value="S.4">S.4</option>
            <option value="S.5">S.5</option>
            <option value="S.6">S.6</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-sans font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Receipt No</th>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Class</th>
                <th className="p-3.5">Amount Paid</th>
                <th className="p-3.5">Balance</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-mono text-amber-300 font-bold">{p.receiptNo}</td>
                  <td className="p-3.5">
                    <p className="font-bold text-white">{p.studentName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{p.admissionNo}</p>
                  </td>
                  <td className="p-3.5 font-bold text-slate-200">{p.className}</td>
                  <td className="p-3.5 font-mono text-emerald-400 font-bold">UGX {p.amountPaid.toLocaleString()}</td>
                  <td className="p-3.5 font-mono text-rose-300 font-bold">UGX {p.balanceRemaining.toLocaleString()}</td>
                  <td className="p-3.5 text-slate-300">{p.paymentMethod}</td>
                  <td className="p-3.5 text-slate-400">{p.paymentDate}</td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setPrintingReceipt(p)}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-amber-400 hover:text-amber-300"
                      title="Print Official Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Entry Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm font-serif">Record Student Fee Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Select Student</label>
                <select
                  value={paymentForm.studentId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, studentId: e.target.value })}
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
                <label className="block text-slate-400 mb-1">Amount Paid (UGX)</label>
                <input
                  type="number"
                  required
                  step={10000}
                  value={paymentForm.amountPaid}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-emerald-400 text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="Bank Deposit">Bank Deposit</option>
                  <option value="Cash">Cash</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Reference / Slip Number</label>
                <input
                  type="text"
                  required
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-amber-300"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {printingReceipt && (() => {
        const receiptStudent = students.find((s) => s.id === printingReceipt.studentId);
        const receiptStudentName = receiptStudent ? `${receiptStudent.firstName} ${receiptStudent.lastName}` : 'Student';
        const receiptAdmissionNo = receiptStudent ? receiptStudent.admissionNo : printingReceipt.studentId;
        const classFee = feeStructures.find((f) => f.className === printingReceipt.className)?.totalFee || 450000;
        const totalStudentPaid = payments
          .filter((pay) => pay.studentId === printingReceipt.studentId && pay.term === printingReceipt.term)
          .reduce((sum, pay) => sum + pay.amountPaid, 0);
        const receiptBalance = Math.max(0, classFee - totalStudentPaid);

        return (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-white print:hidden">
                <span className="font-bold text-xs">Receipt Preview</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-semibold"
                  >
                    Print Receipt
                  </button>
                  <button onClick={() => setPrintingReceipt(null)} className="p-1 text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Official Receipt Content */}
              <div className="p-6 bg-white rounded-xl border border-slate-300 text-xs font-sans space-y-4">
                <div className="text-center border-b pb-3">
                  <h2 className="font-black text-base font-serif uppercase">MASABA SECONDARY SCHOOL</h2>
                  <p className="text-[10px] text-slate-600">P.O. Box 102 Budadiri • Tel: {settings.telephone}</p>
                  <p className="text-xs font-bold text-blue-900 font-mono mt-1">OFFICIAL FEE RECEIPT</p>
                </div>

                <div className="flex justify-between font-mono text-[11px] border-b pb-2">
                  <span>Receipt No: <strong>{printingReceipt.receiptNo}</strong></span>
                  <span>Date: {printingReceipt.paymentDate}</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <p>Received From: <strong className="uppercase">{receiptStudentName}</strong></p>
                  <p>Admission No: <strong className="font-mono">{receiptAdmissionNo}</strong></p>
                  <p>Class: <strong>{printingReceipt.className}</strong></p>
                  <p>Payment Method: <strong>{printingReceipt.paymentMethod}</strong> (Ref: {printingReceipt.referenceNo})</p>
                </div>

                <div className="p-3 bg-slate-100 rounded border border-slate-300 text-center font-mono space-y-1">
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">Amount Paid</span>
                  <span className="text-xl font-black text-emerald-700">UGX {printingReceipt.amountPaid.toLocaleString()}</span>
                  <p className="text-[10px] text-rose-700">Balance Remaining: UGX {receiptBalance.toLocaleString()}</p>
                </div>

                <div className="pt-4 border-t flex justify-between items-end text-[9px] text-slate-500">
                  <div>
                    <p>Bursar: {printingReceipt.receivedBy}</p>
                    <p>Signature: __________________</p>
                  </div>
                  <div className="text-center font-bold text-slate-400 uppercase">
                    Official School Stamp
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
