
import React from 'react';
import { useAppContext } from './hooks/useAppContext';
import { View } from './types';
import { ThemeToggle } from './components/ThemeToggle';
import { Navbar } from './components/common/Navbar'; 
import { LandingView } from './components/views/LandingView';
import { ConfiguratorView } from './components/views/ConfiguratorView';
import { ConfirmationView } from './components/views/ConfirmationView';
import { TestView } from './components/views/TestView';
import { LoadingView } from './components/views/LoadingView';
import { CourseView } from './components/views/CourseView';
import { DashboardView } from './components/views/DashboardView';
import { MyCoursesView } from './components/views/MyCoursesView'; 
import { SettingsView } from './components/views/SettingsView'; // Import SettingsView
import { GlobalChatWidget } from './components/chat/GlobalChatWidget';

const App: React.FC = () => {
  const { currentView, isChatWidgetOpen } = useAppContext();

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <DashboardView />;
      case View.LANDING: 
        return <LandingView />;
      case View.MY_COURSES: 
        return <MyCoursesView />;
      case View.CONFIGURATOR:
        return <ConfiguratorView />;
      case View.CONFIRMATION:
        return <ConfirmationView />;
      case View.TEST:
        return <TestView />;
      case View.LOADING:
        return <LoadingView />;
      case View.COURSE:
        return <CourseView />;
      case View.SETTINGS: // Added case for SettingsView
        return <SettingsView />;
      default:
        return <DashboardView />; 
    }
  };

  return (
    <div className={`w-full h-screen relative text-pathly-text bg-transparent pathly-font-main flex flex-col overflow-hidden ${isChatWidgetOpen ? 'chat-widget-active' : ''}`}>
      <ThemeToggle />
      <Navbar />
      <div 
        id="main-content-area"
        className={`flex-grow overflow-y-auto w-full h-full transition-all duration-300 ease-in-out ${
          isChatWidgetOpen ? 'main-content-shifted' : ''
        }`}
      > 
        {renderView()}
      </div>
      <GlobalChatWidget />
    </div>
  );
};

export default App;