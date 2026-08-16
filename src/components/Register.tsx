import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { UserAccount, Role } from '../types';
import { Shield, UserPlus, X, Lock, Mail, User, Phone, CheckCircle2 } from 'lucide-react';

const ROLES: Role[] = [
  'Super Administrator',
  'School Administrator',
  'Head Teacher',
  'Deputy Head Teacher',
  'Director of Studies',
  'Teacher',
  'Class Teacher',
  'Bursar/Finance Officer',
  'Librarian',
  'Storekeeper',
];

export const Register: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { showToast } = useNotification();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    fullName: 'Wetaka Ivan',
    username: 'ivanroberts',
    email: 'wivan.nk.iu@gmail.com',
    password: 'Masaba@2026',
    phone: '+256 772 123 456',
    role: 'Super Administrator' as Role,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const cleanUsername = formData.username.trim().toLowerCase();
    const cleanEmail = formData.email.trim().toLowerCase();

    try {
      // Check if username already exists in Firestore
      const snap = await getDocs(collection(db, 'users'));
      const existingUser = snap.docs.find((d) => {
        const u = d.data() as UserAccount;
        return (
          u.username?.toLowerCase() === cleanUsername ||
          u.email?.toLowerCase() === cleanEmail
        );
      });

      const uid = existingUser ? existingUser.id : `usr-${cleanUsername}-${Date.now()}`;

      const userToSave: UserAccount = {
        id: uid,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        username: cleanUsername,
        phone: formData.phone.trim(),
        role: formData.role,
        password: formData.password.trim() || 'Masaba@2026',
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
        lastLogin: 'Active now',
      };

      await setDoc(doc(db, 'users', uid), userToSave, { merge: true });
      showToast(`User account for "${userToSave.fullName}" saved to Cloud Firestore!`, 'success');

      // Attempt automatic login
      const res = await login(cleanUsername, userToSave.password);
      if (res.success) {
        showToast('Logged in successfully as Super Administrator!', 'success');
      }
      onClose();
    } catch (e: any) {
      console.error('Error creating user in Firestore:', e);
      showToast(`Registration error: ${e.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-serif">Create System Account</h2>
              <p className="text-[11px] text-slate-400">Permanent Cloud Database Account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" /> Full Name
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g. Wetaka Ivan"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" /> Username
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                placeholder="ivanroberts"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                placeholder="+256 772 123 456"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" /> Official Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
              placeholder="wivan.nk.iu@gmail.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Password
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                placeholder="Masaba@2026"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-400" /> Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-2xl flex items-start gap-2.5 text-[11px] text-blue-200">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p>
              Account data is stored directly in <strong className="text-white">Cloud Firestore</strong> and will persist even if you clear your browser cache.
            </p>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Create & Sign In'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
