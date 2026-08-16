import React, { useState } from 'react';
import { db } from '../services/db';
import { useNotification } from '../context/NotificationContext';
import { SubjectCombination } from '../types';
import { Plus, Trash2, BookOpen } from 'lucide-react';

export const CombinationManagementModule: React.FC = () => {
  const [combinations, setCombinations] = useState<SubjectCombination[]>(() => db.getCombinations());
  const { showToast } = useNotification();
  const subjects = db.getSubjects();

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<SubjectCombination>>({
    name: '',
    level: 'A-Level',
    principalSubjectIds: [],
    subsidiarySubjectIds: []
  });

  const handleSave = () => {
    if (!formData.name || formData.principalSubjectIds?.length === 0) {
      showToast('Name and Principal Subjects are required', 'error');
      return;
    }
    db.saveCombination({
      id: formData.id || `comb-${Date.now()}`,
      name: formData.name!,
      level: 'A-Level',
      principalSubjectIds: formData.principalSubjectIds || [],
      subsidiarySubjectIds: formData.subsidiarySubjectIds || []
    } as SubjectCombination);
    
    setCombinations(db.getCombinations());
    setShowModal(false);
    showToast('Combination saved', 'success');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this combination?')) {
      db.deleteCombination(id);
      setCombinations(db.getCombinations());
      showToast('Combination deleted', 'success');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-white text-sm">A-Level Subject Combinations</h3>
        <button onClick={() => { setFormData({name: '', principalSubjectIds: [], subsidiarySubjectIds: []}); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 px-3 py-1.5 rounded-lg text-xs text-white">
          <Plus className="w-4 h-4" /> Add Combination
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {combinations.map(c => (
          <div key={c.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-white">{c.name}</h4>
              <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">Principals: {c.principalSubjectIds.length}</p>
            <p className="text-xs text-slate-400">Subsidiaries: {c.subsidiarySubjectIds.length}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg space-y-4">
             <h3 className="text-white font-bold text-sm">Add New Combination</h3>
             <input placeholder="Name (e.g. PCM/ICT)" className="w-full bg-slate-950 p-2 text-white rounded-lg border border-slate-800" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
             
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-slate-400 text-xs mb-1">Principal Subjects</label>
                  <div className="max-h-32 overflow-y-auto bg-slate-950 p-2 rounded-xl border border-slate-800 space-y-1">
                    {subjects.filter(s => s.category === 'Principal').map((sub) => (
                      <label key={sub.id} className="flex items-center gap-2 text-slate-300 text-xs">
                        <input
                          type="checkbox"
                          checked={formData.principalSubjectIds?.includes(sub.id)}
                          onChange={(e) => {
                            const ids = formData.principalSubjectIds || [];
                            setFormData({
                              ...formData,
                              principalSubjectIds: e.target.checked
                                ? [...ids, sub.id]
                                : ids.filter((id) => id !== sub.id),
                            });
                          }}
                        />
                        {sub.code}
                      </label>
                    ))}
                  </div>
               </div>
               <div>
                  <label className="block text-slate-400 text-xs mb-1">Subsidiary Subjects</label>
                  <div className="max-h-32 overflow-y-auto bg-slate-950 p-2 rounded-xl border border-slate-800 space-y-1">
                    {subjects.filter(s => s.category === 'Subsidiary').map((sub) => (
                      <label key={sub.id} className="flex items-center gap-2 text-slate-300 text-xs">
                        <input
                          type="checkbox"
                          checked={formData.subsidiarySubjectIds?.includes(sub.id)}
                          onChange={(e) => {
                            const ids = formData.subsidiarySubjectIds || [];
                            setFormData({
                              ...formData,
                              subsidiarySubjectIds: e.target.checked
                                ? [...ids, sub.id]
                                : ids.filter((id) => id !== sub.id),
                            });
                          }}
                        />
                        {sub.code}
                      </label>
                    ))}
                  </div>
               </div>
             </div>

             <button onClick={handleSave} className="bg-blue-600 w-full p-2 text-white rounded-lg">Save</button>
             <button onClick={() => setShowModal(false)} className="bg-slate-800 w-full p-2 text-white rounded-lg">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};
