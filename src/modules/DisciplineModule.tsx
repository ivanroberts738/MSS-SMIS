import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Plus, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

export const DisciplineModule: React.FC = () => {
  const { currentUser } = useAuth();
  const students = db.getStudents();

  const [incidents, setIncidents] = useState([
    {
      id: 'disc-1',
      studentName: 'Moses Mugeni',
      admissionNo: 'MSS/2026/001',
      class: 'S.1 North',
      date: '2026-08-10',
      category: 'Late Coming',
      description: 'Reported to morning assembly 30 minutes late without authorized pass.',
      actionTaken: 'Warning letter issued to guardian.',
      status: 'Resolved',
    },
    {
      id: 'disc-2',
      studentName: 'Grace Nabulo',
      admissionNo: 'MSS/2026/002',
      class: 'S.4 East',
      date: '2026-08-12',
      category: 'Uniform Defiance',
      description: 'Non-regulation sweater worn inside main quadrangle.',
      actionTaken: 'Item confiscated and logged.',
      status: 'Pending Review',
    },
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Student Discipline & Character Registry
          </h2>
          <p className="text-xs text-slate-400">
            Masaba Secondary School • Incident logging, parental summons & disciplinary board records
          </p>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-sans font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Class</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Incident Description</th>
                <th className="p-3.5">Action Taken</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {incidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    <p className="font-bold text-white">{inc.studentName}</p>
                    <p className="text-[10px] font-mono text-amber-300">{inc.admissionNo}</p>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-200">{inc.class}</td>
                  <td className="p-3.5 text-amber-400 font-semibold">{inc.category}</td>
                  <td className="p-3.5 text-slate-300">{inc.description}</td>
                  <td className="p-3.5 text-slate-300">{inc.actionTaken}</td>
                  <td className="p-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        inc.status === 'Resolved' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
