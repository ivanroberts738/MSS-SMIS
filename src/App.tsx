import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { Login } from './components/Login';

// Modules
import { DashboardModule } from './modules/DashboardModule';
import { StudentManagementModule } from './modules/StudentManagementModule';
import { ClassStreamModule } from './modules/ClassStreamModule';
import { TeacherManagementModule } from './modules/TeacherManagementModule';
import { TeacherAssignmentModule } from './modules/TeacherAssignmentModule';
import { AcademicsModule } from './modules/AcademicsModule';
import { ReportCardModule } from './modules/ReportCardModule';
import { AttendanceModule } from './modules/AttendanceModule';
import { FinanceModule } from './modules/FinanceModule';
import { TimetableModule } from './modules/TimetableModule';
import { ExaminationsModule } from './modules/ExaminationsModule';
import { DisciplineModule } from './modules/DisciplineModule';
import { LibraryModule } from './modules/LibraryModule';
import { InventoryModule } from './modules/InventoryModule';
import { CommunicationModule } from './modules/CommunicationModule';
import { DocumentsModule } from './modules/DocumentsModule';
import { SystemSettingsModule } from './modules/SystemSettingsModule';
import { UserManagementModule } from './modules/UserManagementModule';
import { AuditLogsModule } from './modules/AuditLogsModule';

const MainLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // If user is not logged in, render the secure Login component
  if (!isAuthenticated) {
    return <Login />;
  }

  const handleNavigate = (module: string) => {
    setActiveTab(module as ActiveTab);
  };

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardModule onNavigate={handleNavigate} />;
      case 'students':
        return <StudentManagementModule />;
      case 'classes':
        return <ClassStreamModule />;
      case 'teachers':
        return <TeacherManagementModule />;
      case 'teacher_assignments':
        return <TeacherAssignmentModule />;
      case 'academics':
        return <AcademicsModule initialTab="marks" />;
      case 'analytics':
        return <AcademicsModule initialTab="marks" />;
      case 'report_cards':
        return <ReportCardModule />;
      case 'attendance':
        return <AttendanceModule />;
      case 'exams':
        return <ExaminationsModule />;
      case 'timetable':
        return <TimetableModule />;
      case 'finance':
        return <FinanceModule />;
      case 'discipline':
        return <DisciplineModule />;
      case 'library':
        return <LibraryModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'communication':
        return <CommunicationModule />;
      case 'calendar':
        return <div className="p-8 text-center text-slate-400">Calendar Module Coming Soon</div>; // Or import CalendarModule if it exists
      case 'documents':
      case 'reports':
        return <DocumentsModule />;
      case 'users':
        return <UserManagementModule />;
      case 'settings':
        return <SystemSettingsModule />;
      case 'audit':
        return <AuditLogsModule />;
      default:
        return <DashboardModule onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header Navigation */}
      <Header
        onOpenSearch={() => setShowSearchModal(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {renderActiveModule()}
        </main>
      </div>

      {/* Global Search Modal */}
      {showSearchModal && (
        <GlobalSearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onNavigateTab={(module) => {
            handleNavigate(module);
            setShowSearchModal(false);
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </NotificationProvider>
  );
}
