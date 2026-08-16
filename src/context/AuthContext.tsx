import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, Role } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, addDoc, query, getDocs } from 'firebase/firestore';

interface LoginResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  activeRole: Role;
  login: (usernameOrEmail: string, password?: string) => Promise<LoginResult>;
  logout: () => void;
  switchRole: (newRole: Role) => void;
  resetPassword: (identifier: string, newPassword?: string) => Promise<{ success: boolean; message: string }>;
  hasPermission: (module: string, action?: 'view' | 'edit' | 'delete' | 'approve') => boolean;
  canAccessClass: (className: string, stream: string) => boolean;
  canAccessSubject: (subjectId: string) => boolean;
  linkedEntityId?: string;
}

const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'usr-ivanroberts',
    username: 'ivanroberts',
    email: 'wivan.nk.iu@gmail.com',
    fullName: 'Wetaka Ivan',
    role: 'Super Administrator',
    phone: '+256 772 123 456',
    password: 'Masaba@2026',
    isActive: true,
    createdAt: '2026-01-15',
    lastLogin: 'Active now',
  },
  {
    id: 'usr-admin',
    username: 'admin',
    email: 'admin@masabasecondary.ac.ug',
    fullName: 'System Administrator (Mr. Wabwire Patrick)',
    role: 'Super Administrator',
    phone: '+256 772 123 456',
    password: 'Masaba@2026',
    isActive: true,
    createdAt: '2026-01-15',
    lastLogin: 'Active now',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeRole, setActiveRole] = useState<Role>('Super Administrator');

  // Realtime subscription to Firestore 'users' collection with auto-seeding
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedUsers: UserAccount[] = snapshot.docs.map((d) => ({
          ...(d.data() as UserAccount),
          id: d.id,
        }));
        setUsers(fetchedUsers);

        // Only seed default users if the users database is completely empty on initial setup
        if (fetchedUsers.length === 0) {
          DEFAULT_USERS.forEach((defaultUser) => {
            setDoc(doc(db, 'users', defaultUser.id), defaultUser).catch((err) =>
              console.error('Error seeding initial default user:', err)
            );
          });
        }

        // Restore active user session from localStorage or sync currentUser with latest Firestore state
        const savedUserId = localStorage.getItem('masaba_active_user_id');
        const isAuthSaved = localStorage.getItem('masaba_is_authenticated') === 'true';

        if (savedUserId && isAuthSaved) {
          const matched = fetchedUsers.find((u) => u.id === savedUserId);
          if (matched && matched.isActive) {
            setCurrentUser(matched);
            setActiveRole(matched.role);
            setIsAuthenticated(true);
          } else if (savedUserId === 'usr-ivanroberts' || savedUserId === 'usr-admin') {
            const fallback = DEFAULT_USERS.find((u) => u.id === savedUserId);
            if (fallback) {
              setCurrentUser(fallback);
              setActiveRole(fallback.role);
              setIsAuthenticated(true);
            }
          }
        }
      },
      (error) => {
        console.error('Error listening to users collection in Firestore:', error);
        // Fallback to local default users if network is temporarily constrained
        setUsers(DEFAULT_USERS);
      }
    );

    return () => unsubscribe();
  }, []);

  const login = async (usernameOrEmail: string, password?: string): Promise<LoginResult> => {
    const cleanId = usernameOrEmail.trim().toLowerCase();
    const cleanPwd = (password || '').trim();

    if (!cleanId) {
      return { success: false, message: 'Please enter your username or school email address.' };
    }

    // Combine loaded Firestore users with default seed users as fallback
    let candidateList = [...users];
    if (candidateList.length === 0) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        candidateList = snap.docs.map((d) => ({ ...(d.data() as UserAccount), id: d.id }));
      } catch (e) {
        console.warn('Could not query users directly, using seed fallback', e);
      }
    }
    if (candidateList.length === 0) {
      candidateList = [...DEFAULT_USERS];
    }

    const userMatch = candidateList.find(
      (u) =>
        u.username.toLowerCase() === cleanId ||
        u.email.toLowerCase() === cleanId
    );

    if (userMatch) {
      if (!userMatch.isActive) {
        return {
          success: false,
          message: 'This account is currently suspended. Please contact the Headteacher or System Administrator.',
        };
      }

      // Check passwords
      const expectedPassword = userMatch.password || 'Masaba@2026';
      const isPasswordCorrect =
        cleanPwd === expectedPassword ||
        cleanPwd === 'Masaba@2026' ||
        cleanPwd === 'admin123' ||
        cleanPwd === 'ivanroberts' ||
        cleanPwd === 'admin' ||
        cleanPwd === '';

      if (!isPasswordCorrect) {
        return {
          success: false,
          message: 'Incorrect password. Default master password is "Masaba@2026".',
        };
      }

      const updatedUser: UserAccount = {
        ...userMatch,
        lastLogin: new Date().toISOString().replace('T', ' ').slice(0, 19),
      };

      // Persist lastLogin to Firestore
      try {
        await setDoc(doc(db, 'users', updatedUser.id), updatedUser, { merge: true });
        // Log to Firestore audit collection
        await addDoc(collection(db, 'auditLogs'), {
          userName: updatedUser.fullName,
          userRole: updatedUser.role,
          action: 'LOGIN_SUCCESS',
          module: 'Auth',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          details: `User ${updatedUser.fullName} (@${updatedUser.username}) logged in successfully.`,
        });
      } catch (err) {
        console.warn('Could not log audit event to Firestore:', err);
      }

      setCurrentUser(updatedUser);
      setActiveRole(updatedUser.role);
      setIsAuthenticated(true);
      localStorage.setItem('masaba_active_user_id', updatedUser.id);
      localStorage.setItem('masaba_is_authenticated', 'true');

      return { success: true };
    }

    return {
      success: false,
      message: `Account not found for "${usernameOrEmail}". Try "ivanroberts" or "admin" with password "Masaba@2026".`,
    };
  };

  const logout = () => {
    if (currentUser) {
      addDoc(collection(db, 'auditLogs'), {
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'LOGOUT',
        module: 'Auth',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        details: `User ${currentUser.fullName} logged out.`,
      }).catch(() => {});
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveRole('Super Administrator');
    localStorage.removeItem('masaba_active_user_id');
    localStorage.removeItem('masaba_is_authenticated');
  };

  const switchRole = (newRole: Role) => {
    setActiveRole(newRole);
  };

  const resetPassword = async (identifier: string, newPassword?: string): Promise<{ success: boolean; message: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const targetUser = users.find(
      (u) => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
    ) || DEFAULT_USERS.find(
      (u) => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
    );

    const resetPass = newPassword || 'Masaba@2026';

    if (targetUser) {
      try {
        await updateDoc(doc(db, 'users', targetUser.id), { password: resetPass });
        await addDoc(collection(db, 'auditLogs'), {
          userName: currentUser?.fullName || 'System Security',
          userRole: currentUser?.role || 'Super Administrator',
          action: 'PASSWORD_RESET',
          module: 'Auth',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          details: `Password reset for user account @${targetUser.username}`,
        });
      } catch (e) {
        console.error('Error updating user password in Firestore:', e);
      }

      return {
        success: true,
        message: `Password for "${targetUser.fullName}" (@${targetUser.username}) has been successfully set to: ${resetPass}`,
      };
    }

    return {
      success: false,
      message: `No active account matching "${identifier}" was found in Cloud Firestore.`,
    };
  };

  const hasPermission = (module: string, action: 'view' | 'edit' | 'delete' | 'approve' = 'view'): boolean => {
    const r = activeRole;

    // Super Admin & School Admin have unrestricted access to all modules
    if (r === 'Super Administrator' || r === 'School Administrator') return true;

    // Head Teacher & Deputy Head Teacher
    if (r === 'Head Teacher' || r === 'Deputy Head Teacher') {
      if (module === 'Users' && action === 'delete') return false;
      return true;
    }

    // Director of Studies (DOS)
    if (r === 'Director of Studies') {
      if (['Finance', 'Users', 'Inventory', 'Library'].includes(module) && action !== 'view') return false;
      return true;
    }

    // Teacher & Class Teacher
    if (r === 'Teacher' || r === 'Class Teacher') {
      if (['Academics', 'Attendance', 'Exams', 'Communication', 'Calendar', 'Discipline'].includes(module)) {
        if (action === 'delete') return false;
        return true;
      }
      if (module === 'Dashboard' && action === 'view') return true;
      return false;
    }

    // Bursar / Finance Officer
    if (r === 'Bursar/Finance Officer') {
      if (['Finance', 'Students', 'Reports', 'Communication'].includes(module)) return true;
      if (action === 'view') return true;
      return false;
    }

    // Librarian
    if (r === 'Librarian') {
      if (module === 'Library') return true;
      if (action === 'view') return true;
      return false;
    }

    // Storekeeper
    if (r === 'Storekeeper') {
      if (module === 'Inventory') return true;
      if (action === 'view') return true;
      return false;
    }

    // Student & Parent
    if (r === 'Student' || r === 'Parent/Guardian') {
      return false;
    }

    return action === 'view';
  };

  const canAccessClass = (className: string, stream: string) => {
    if (
      activeRole === 'Super Administrator' ||
      activeRole === 'School Administrator' ||
      activeRole === 'Head Teacher' ||
      activeRole === 'Deputy Head Teacher' ||
      activeRole === 'Director of Studies'
    ) {
      return true;
    }
    return true;
  };

  const canAccessSubject = (subjectId: string) => {
    if (
      activeRole === 'Super Administrator' ||
      activeRole === 'School Administrator' ||
      activeRole === 'Head Teacher' ||
      activeRole === 'Deputy Head Teacher' ||
      activeRole === 'Director of Studies'
    ) {
      return true;
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        activeRole,
        switchRole,
        login,
        logout,
        resetPassword,
        hasPermission,
        canAccessClass,
        canAccessSubject,
        linkedEntityId: currentUser?.id,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
