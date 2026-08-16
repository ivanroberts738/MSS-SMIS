import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { db as localDb } from '../services/db';
import { sanitizeForFirestore } from '../lib/firestoreUtils';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { UserAccount, Role, Teacher, Student } from '../types';
import {
  Shield,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Lock,
  Phone,
  Mail,
  X,
  UserCheck,
} from 'lucide-react';

const AVAILABLE_ROLES: Role[] = [
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
  'Student',
  'Parent/Guardian',
];

export const UserManagementModule: React.FC = () => {
  const { currentUser, switchRole } = useAuth();
  const { showToast } = useNotification();

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    const unsubUsers = onSnapshot(
      query(collection(db, 'users')),
      (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ ...doc.data() as UserAccount, id: doc.id })));
      },
      (err) => console.warn('Users listener:', err)
    );
    const unsubTeachers = onSnapshot(
      query(collection(db, 'teachers')),
      (snapshot) => {
        setTeachers(snapshot.docs.map(doc => ({ ...doc.data() as Teacher, id: doc.id })));
      },
      (err) => console.warn('Teachers listener:', err)
    );
    const unsubStudents = onSnapshot(
      query(collection(db, 'students')),
      (snapshot) => {
        setStudents(snapshot.docs.map(doc => ({ ...doc.data() as Student, id: doc.id })));
      },
      (err) => console.warn('Students listener:', err)
    );
    return () => { unsubUsers(); unsubTeachers(); unsubStudents(); };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [formData, setFormData] = useState<Partial<UserAccount>>({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'Teacher',
    isActive: true,
    password: '',
    linkedEntityId: '',
  });

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      role: 'Teacher',
      isActive: true,
      password: '',
      linkedEntityId: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFormData({
      ...user,
      password: '',
    });
    setShowAddModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username?.trim() || !formData.fullName?.trim() || !formData.email?.trim() || !formData.role) {
      showToast('Please fill in username, full name, email, and role.', 'error');
      return;
    }

    const cleanUsername = formData.username.trim().toLowerCase();

    try {
        if (!editingUser) {
            // Check duplicate username
            const exists = users.some((u) => u.username.toLowerCase() === cleanUsername);
            if (exists) {
                showToast(`A user with username "${cleanUsername}" already exists.`, 'error');
                return;
            }

            const uid = `usr-${cleanUsername}-${Date.now()}`;

            const userToSave: UserAccount = {
                id: uid,
                username: cleanUsername,
                fullName: formData.fullName.trim(),
                email: formData.email.trim(),
                phone: formData.phone?.trim() || '',
                role: formData.role as Role,
                isActive: formData.isActive ?? true,
                password: formData.password?.trim() || 'Masaba@2026',
                createdAt: new Date().toISOString().split('T')[0],
                lastLogin: 'Never',
            };
            if (formData.linkedEntityId?.trim()) {
                userToSave.linkedEntityId = formData.linkedEntityId.trim();
            }
            
            const sanitizedUser = sanitizeForFirestore(userToSave);
            await setDoc(doc(db, 'users', uid), sanitizedUser);

            // Also synchronize with local service
            try {
              localDb.saveUser(userToSave);
            } catch (err) {
              console.warn('Local db sync warn:', err);
            }

            // If teacher, ensure teacher record exists in Firestore as well
            if (userToSave.role === 'Teacher' || userToSave.role === 'Class Teacher') {
              const teacherDoc = sanitizeForFirestore({
                id: uid,
                teacherId: `TCH-${uid.slice(4, 10).toUpperCase()}`,
                firstName: userToSave.fullName.split(' ')[0] || userToSave.fullName,
                lastName: userToSave.fullName.split(' ').slice(1).join(' ') || 'Staff',
                email: userToSave.email,
                phone: userToSave.phone || '+256 700 000000',
                gender: 'Male' as const,
                department: 'Academics',
                qualification: 'Bachelor of Education',
                employmentStatus: 'Full-Time' as const,
                dateEmployed: '2026-01-01',
                assignedSubjectIds: [],
                assignedClassStreams: [],
              });
              await setDoc(doc(db, 'teachers', uid), teacherDoc, { merge: true });
            }

            showToast(`New user "${userToSave.username}" created successfully!`, 'success');
        } else {
            // Update existing user
            const userRef = doc(db, 'users', editingUser.id);
            const updatePayload: any = {
                fullName: formData.fullName.trim(),
                email: formData.email?.trim() || editingUser.email,
                phone: formData.phone?.trim() || '',
                role: formData.role as Role,
                isActive: formData.isActive ?? true,
            };
            if (formData.linkedEntityId?.trim()) {
                updatePayload.linkedEntityId = formData.linkedEntityId.trim();
            }
            if (formData.password?.trim()) {
                updatePayload.password = formData.password.trim();
            }

            const sanitizedUpdate = sanitizeForFirestore(updatePayload);
            await updateDoc(userRef, sanitizedUpdate);

            try {
              localDb.saveUser({ ...editingUser, ...updatePayload });
            } catch (err) {
              console.warn('Local db sync warn:', err);
            }

            showToast(`User account "${editingUser.username}" updated successfully.`, 'success');
        }
        setShowAddModal(false);
    } catch (e: any) {
        console.error('Error saving user:', e);
        showToast(`Failed to save user: ${e?.message || 'Check connection'}`, 'error');
    }
  };

  const handleDeleteUser = async (user: UserAccount) => {
    if (user.id === currentUser?.id) {
      showToast('You cannot delete your own active administrator account while logged into it.', 'error');
      return;
    }

    if (confirm(`Are you sure you want to permanently delete user "${user.fullName}" (@${user.username})?`)) {
        try {
            await deleteDoc(doc(db, 'users', user.id));
            try {
              localDb.deleteUser(user.id);
            } catch (err) {
              console.warn('Local db delete error:', err);
            }
            showToast(`User account "${user.username}" (${user.fullName}) permanently deleted.`, 'success');
        } catch (e: any) {
            console.error('Error deleting user:', e);
            showToast(`Failed to delete user: ${e?.message || 'Check network'}`, 'error');
        }
    }
  };

  const handleToggleStatus = async (user: UserAccount) => {
    if (user.id === currentUser?.id) {
      showToast('You cannot suspend your own account while logged in.', 'warning');
      return;
    }
    try {
        await updateDoc(doc(db, 'users', user.id), {
            isActive: !user.isActive
        });
        showToast(`User ${user.username} is now ${user.isActive ? 'Suspended' : 'Active'}.`, 'info');
    } catch (e) {
        console.error('Error toggling status:', e);
        showToast('Failed to toggle status', 'error');
    }
  };

  const handleSwitchToUser = (user: UserAccount) => {
    switchRole(user.role);
    showToast(`Switched active role to "${user.role}" as ${user.fullName}`, 'success');
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      selectedRoleFilter === 'ALL'
        ? true
        : selectedRoleFilter === 'ADMINS'
        ? ['Super Administrator', 'School Administrator', 'Head Teacher', 'Deputy Head Teacher'].includes(u.role)
        : selectedRoleFilter === 'ACADEMICS'
        ? ['Director of Studies', 'Teacher', 'Class Teacher'].includes(u.role)
        : selectedRoleFilter === 'FINANCE'
        ? u.role === 'Bursar/Finance Officer'
        : selectedRoleFilter === 'STUDENTS'
        ? ['Student', 'Parent/Guardian'].includes(u.role)
        : u.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case 'Super Administrator':
      case 'School Administrator':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Head Teacher':
      case 'Deputy Head Teacher':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Director of Studies':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'Teacher':
      case 'Class Teacher':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Bursar/Finance Officer':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Librarian':
      case 'Storekeeper':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      case 'Student':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'Parent/Guardian':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <Shield className="w-5 h-5 text-amber-400" />
            User Management & Role-Based Access Control
          </h2>
          <p className="text-xs text-slate-400">
            Masaba Secondary School • Provision user credentials, assign functional roles and manage staff/student logins
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'users' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              System Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'matrix' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Permissions Matrix
            </button>
          </div>

          <button
            id="add-new-user-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-md"
          >
            <UserPlus className="w-4 h-4" /> Add New User
          </button>
        </div>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Top Quick Filters & Search */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search username, full name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Role Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {[
                { id: 'ALL', label: 'All Roles' },
                { id: 'ADMINS', label: 'Administrators' },
                { id: 'ACADEMICS', label: 'Academics & Teachers' },
                { id: 'FINANCE', label: 'Bursar / Finance' },
                { id: 'STUDENTS', label: 'Students & Parents' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedRoleFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedRoleFilter === tab.id
                      ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Accounts Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[10px]">
                    <th className="p-4">User / Account</th>
                    <th className="p-4">Assigned Role</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Created Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Shield className="w-8 h-8 text-slate-600" />
                          <p className="text-sm font-semibold text-slate-400">No users found</p>
                          <p className="text-xs text-slate-500">
                            {users.length === 0
                              ? 'The user database is empty. Click "Add New User" to create your first account.'
                              : 'Try adjusting your search criteria.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = u.id === currentUser.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50 flex items-center justify-center font-bold text-xs uppercase">
                                {u.fullName.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  {u.fullName}
                                  {isSelf && (
                                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                                      You
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-slate-400 text-[11px]">@{u.username}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getRoleBadgeStyle(
                                u.role
                              )}`}
                            >
                              {u.role}
                            </span>
                          </td>

                          <td className="p-4 space-y-0.5 text-slate-300">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[180px]">{u.email}</span>
                            </div>
                            {u.phone && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span>{u.phone}</span>
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={isSelf}
                              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                                u.isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                              } ${isSelf ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              {u.isActive ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" /> Active
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3" /> Suspended
                                </>
                              )}
                            </button>
                          </td>

                          <td className="p-4 text-slate-400 font-mono text-[11px]">
                            {u.createdAt || 'System Default'}
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick switch to role */}
                              <button
                                onClick={() => handleSwitchToUser(u)}
                                title={`Simulate login as ${u.role}`}
                                className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => handleOpenEdit(u)}
                                title="Edit user details & role"
                                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={isSelf}
                                title="Delete user"
                                className={`p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ${
                                  isSelf ? 'opacity-30 cursor-not-allowed' : ''
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Role Permissions Matrix */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="font-bold text-white text-base font-serif flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" /> Masaba SMIS Role-Based Permissions Architecture
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Hierarchical access controls configured for Uganda Secondary School administrative workflows.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-800">
              <thead>
                <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-semibold text-[11px]">
                  <th className="p-3 border-r border-slate-800">Role</th>
                  <th className="p-3 border-r border-slate-800">Student & Staff</th>
                  <th className="p-3 border-r border-slate-800">Marks & Academics</th>
                  <th className="p-3 border-r border-slate-800">Report Cards</th>
                  <th className="p-3 border-r border-slate-800">Fees & Finance</th>
                  <th className="p-3 border-r border-slate-800">User Management</th>
                  <th className="p-3">System Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                <tr>
                  <td className="p-3 font-bold text-purple-300 border-r border-slate-800">Super Administrator</td>
                  <td className="p-3 text-emerald-400 border-r border-slate-800">Full Access (CRUD)</td>
                  <td className="p-3 text-emerald-400 border-r border-slate-800">Full Access & Approval</td>
                  <td className="p-3 text-emerald-400 border-r border-slate-800">Generate & Print All</td>
                  <td className="p-3 text-emerald-400 border-r border-slate-800">Full Access</td>
                  <td className="p-3 text-emerald-400 border-r border-slate-800">Full Access</td>
                  <td className="p-3 text-emerald-400">Full Access</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-amber-300 border-r border-slate-800">Head Teacher / Deputy</td>
                  <td className="p-3 text-emerald-400 border-r border-slate-800">View & Edit</td>
                  <td className="p-3 text-emerald-400 border-r border-slate-800">Review & Approve</td>
                  <td className="p-3 text-emerald-400 border-r border-slate-800">Official Sign-off</td>
                  <td className="p-3 text-emerald-400 border-r border-slate-800">Financial Reports</td>
                  <td className="p-3 text-blue-400 border-r border-slate-800">View & Create</td>
                  <td className="p-3 text-amber-400">View & Edit</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-indigo-300 border-r border-slate-800">Director of Studies (DOS)</td>
                  <td className="p-3 text-blue-400 border-r border-slate-800">View & Stream Assign</td>
                  <td className="p-3 text-emerald-400 border-r border-slate-800">Approve & Lock Marks</td>
                  <td className="p-3 text-emerald-400 border-r border-slate-800">Bulk Generation</td>
                  <td className="p-3 text-slate-500 border-r border-slate-800">No Access</td>
                  <td className="p-3 text-slate-500 border-r border-slate-800">No Access</td>
                  <td className="p-3 text-slate-500">No Access</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-blue-300 border-r border-slate-800">Subject / Class Teacher</td>
                  <td className="p-3 text-slate-300 border-r border-slate-800">Assigned Class View</td>
                  <td className="p-3 text-emerald-400 border-r border-slate-800">Enter & Edit Marks</td>
                  <td className="p-3 text-blue-400 border-r border-slate-800">Class Preview</td>
                  <td className="p-3 text-slate-500 border-r border-slate-800">No Access</td>
                  <td className="p-3 text-slate-500 border-r border-slate-800">No Access</td>
                  <td className="p-3 text-slate-500">No Access</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-emerald-300 border-r border-slate-800">Bursar / Finance Officer</td>
                  <td className="p-3 text-slate-300 border-r border-slate-800">Fee Clearance Check</td>
                  <td className="p-3 text-slate-500 border-r border-slate-800">No Access</td>
                  <td className="p-3 text-slate-500 border-r border-slate-800">No Access</td>
                  <td className="p-3 text-emerald-400 border-r border-slate-800">Collect & Issue Receipts</td>
                  <td className="p-3 text-slate-500 border-r border-slate-800">No Access</td>
                  <td className="p-3 text-slate-500">No Access</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-sky-300 border-r border-slate-800">Student & Parent</td>
                  <td className="p-3 text-slate-400 border-r border-slate-800">Personal Profile Only</td>
                  <td className="p-3 text-slate-400 border-r border-slate-800">View Final Term Marks</td>
                  <td className="p-3 text-blue-400 border-r border-slate-800">Download Own Report</td>
                  <td className="p-3 text-slate-400 border-r border-slate-800">View Fee Balance</td>
                  <td className="p-3 text-slate-500 border-r border-slate-800">No Access</td>
                  <td className="p-3 text-slate-500">No Access</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 text-xs text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2 font-serif">
                <UserPlus className="w-4 h-4 text-amber-400" />
                {editingUser ? 'Edit User Account & Role' : 'Create New User Account'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wabwire Patrick"
                    value={formData.fullName || ''}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. patrick.wabwire"
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@masabasecondary.ac.ug"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Telephone Number</label>
                  <input
                    type="tel"
                    placeholder="+256 772 123 456"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Assigned Role *</label>
                  <select
                    value={formData.role || 'Teacher'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                  >
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Account Access Password</label>
                  <input
                    type="text"
                    placeholder="Masaba@2026"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              {/* Link to Staff or Student Profile if any exist */}
              {teachers.length > 0 && ['Teacher', 'Class Teacher', 'Director of Studies'].includes(formData.role || '') && (
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Link to Teacher Profile</label>
                  <select
                    value={formData.linkedEntityId || ''}
                    onChange={(e) => setFormData({ ...formData, linkedEntityId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="">-- Select Teacher Record (Optional) --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName} ({t.teacherId} - {t.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive ?? true}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 w-4 h-4"
                />
                <label htmlFor="isActiveToggle" className="text-slate-300 font-medium">
                  User Account is Active and allowed to sign in
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-xl transition-all shadow-md"
                >
                  {editingUser ? 'Update User' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
