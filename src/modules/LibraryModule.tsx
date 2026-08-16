import React, { useState } from 'react';
import { db } from '../services/db';
import { BookOpen, Search, Plus, CheckCircle2, Bookmark } from 'lucide-react';

export const LibraryModule: React.FC = () => {
  const books = [
    { id: 'b-1', code: 'LIB-MTH-01', title: 'Functional Secondary Mathematics Book 1', author: 'MK Publishers', category: 'Mathematics', copies: 45, borrowed: 12 },
    { id: 'b-2', code: 'LIB-ENG-02', title: 'Macmillan Secondary English for Uganda S.1-S.4', author: 'Macmillan', category: 'English', copies: 60, borrowed: 20 },
    { id: 'b-3', code: 'LIB-PHY-03', title: 'Advanced Level Physics', author: 'Nelkon & Parker', category: 'Physics', copies: 25, borrowed: 18 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <BookOpen className="w-5 h-5 text-amber-400" />
            School Library Information System
          </h2>
          <p className="text-xs text-slate-400">
            Masaba Secondary School • Textbooks, reference materials & book circulation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {books.map((b) => (
          <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
            <span className="font-mono text-amber-300 font-bold">{b.code}</span>
            <h3 className="font-bold text-white text-sm">{b.title}</h3>
            <p className="text-slate-400">Author: {b.author}</p>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-slate-300">
              <span>Total Copies: <strong>{b.copies}</strong></span>
              <span className="text-emerald-400">Available: <strong>{b.copies - b.borrowed}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
