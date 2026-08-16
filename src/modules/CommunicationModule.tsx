import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { MessageSquare, Send, Bell, Users } from 'lucide-react';

export const CommunicationModule: React.FC = () => {
  const { showToast } = useNotification();
  const [recipientGroup, setRecipientGroup] = useState('All Guardians');
  const [message, setMessage] = useState('');

  const handleSendSMS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    showToast(`Bulk SMS dispatched to ${recipientGroup}!`, 'success');
    setMessage('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Communication & Bulk Parent SMS Portal
          </h2>
          <p className="text-xs text-slate-400">
            Send official circulars, fee reminders, and event notices to guardians
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={handleSendSMS} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
          <h3 className="font-bold text-white text-sm font-serif">Compose Bulk SMS Broadcast</h3>

          <div>
            <label className="block text-slate-400 mb-1">Target Recipient Group</label>
            <select
              value={recipientGroup}
              onChange={(e) => setRecipientGroup(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            >
              <option value="All Guardians">All Parents & Guardians (S.1 - S.6)</option>
              <option value="S.1 Guardians">S.1 Parents Only</option>
              <option value="S.4 Guardians">S.4 UNEB Candidates Parents</option>
              <option value="S.6 Guardians">S.6 A-Level Candidates Parents</option>
              <option value="Teaching Staff">All Academic Staff</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">SMS Message Text</label>
            <textarea
              rows={4}
              required
              placeholder="Dear Parent/Guardian, please be informed that Masaba Sec. School Term II Visitation Day is scheduled for..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">Characters: {message.length} (Est. SMS credits: {Math.ceil(message.length / 160)})</p>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md"
          >
            <Send className="w-4 h-4" /> Dispatch Bulk SMS
          </button>
        </form>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
          <h3 className="font-bold text-white text-sm font-serif flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" /> Recent Broadcast Logs
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between text-amber-300 font-semibold text-[11px]">
                <span>S.4 & S.6 UNEB Registration Circular</span>
                <span>2026-08-01</span>
              </div>
              <p className="text-slate-300 text-[11px]">Reminder regarding clearance for national examinations center registration.</p>
              <span className="text-[10px] text-emerald-400">Delivered to 142 Parents</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
