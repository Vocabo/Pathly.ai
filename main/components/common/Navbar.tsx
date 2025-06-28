import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { View, Theme } from '../../types';
import { HomeIcon, LibraryIcon, PlusCircleIcon, RefreshIcon } from './Icons'; 
import { Button } from './Button'; 

interface NavItemProps {
  label: string;
  view: View;
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
  currentView: View;
  setCurrentView: (view: View) => void;
  onClick?: () => void; 
}

const NavItem: React.FC<NavItemProps> = ({ label, view, icon, currentView, setCurrentView, onClick }) => {
  const isActive = currentView === view;
  return (
    <button
      onClick={() => {
        setCurrentView(view);
        if (onClick) onClick();
      }}
      className={`flex items-center space-x-2 px-4 py-3 rounded-pathly-md transition-all duration-200 ease-in-out group hover:bg-pathly-accent/10 focus:outline-none focus:bg-pathly-accent/20
                  ${isActive ? 'bg-pathly-accent/20 text-pathly-accent scale-[1.03]' : 'text-pathly-text/80 hover:text-pathly-accent'}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={`transition-colors duration-200 ${isActive ? 'text-pathly-accent' : 'text-pathly-text/70 group-hover:text-pathly-accent'}`}>
        {React.cloneElement(icon, { className: "w-5 h-5" })}
      </span>
      <span className="pathly-font-heading font-semibold text-sm">{label}</span>
    </button>
  );
};

export const Navbar: React.FC = () => {
  const { currentView, setCurrentView, resetApp, theme } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null); 

  const navItems = [
    { label: 'Home', view: View.DASHBOARD, icon: <HomeIcon /> },
    { label: 'My Courses', view: View.MY_COURSES, icon: <LibraryIcon /> },
    { label: 'Create Course', view: View.CONFIGURATOR, icon: <PlusCircleIcon /> },
  ];

  const handleResetApp = () => {
    if (window.confirm("Are you sure you want to reset the app? This will clear any current course creation progress but will NOT delete your saved courses or chat history.")) {
      resetApp();
      setMenuOpen(false); 
    }
  };

  const goToSettings = () => {
    setCurrentView(View.SETTINGS);
    setMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuOpen &&
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        hamburgerRef.current && 
        !hamburgerRef.current.contains(event.target as Node) 
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);


  return (
    <nav className="sticky top-0 z-40 w-full bg-pathly-card-bg/80 backdrop-blur-lg shadow-sm border-b border-pathly-border/50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo/Brand */}
          <div 
            className="flex items-center cursor-pointer group" 
            onClick={() => setCurrentView(View.DASHBOARD)}
            aria-label="Go to Home"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setCurrentView(View.DASHBOARD)}
          >
            <img src={theme === Theme.LIGHT ? '/components/common/pathlyLogoSmall.png' : '/components/common/pathlyLogoSmallWhite.png'} alt="Pathly Logo" className="h-8 w-auto" />
            <span className="ml-2 pathly-font-heading font-semibold text-xl text-pathly-text group-hover:text-pathly-accent transition-colors hidden md:inline">
              Pathly
            </span>
            <div className="ml-2 px-2 py-0.5 bg-pathly-accent text-white rounded-full text-[10px] font-bold tracking-wider leading-none">
                BETA
            </div>
          </div>

          {/* Navigation Links & Hamburger Menu Area */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Desktop Nav Items */}
            <div className="hidden md:flex items-center space-x-1 sm:space-x-2">
              {navItems.map(item => (
                <NavItem 
                  key={item.view}
                  label={item.label}
                  view={item.view}
                  icon={item.icon}
                  currentView={currentView}
                  setCurrentView={setCurrentView}
                />
              ))}
            </div>
            
            {/* Hamburger Menu Trigger */}
            <div className="relative">
              <button
                ref={hamburgerRef} 
                onClick={() => setMenuOpen(!menuOpen)}
                className="hamburger-menu-button z-[60] flex flex-col justify-around w-8 h-8 bg-transparent border-none cursor-pointer p-1 rounded-md hover:bg-pathly-secondary focus:outline-none focus:ring-2 focus:ring-pathly-accent focus:ring-opacity-50"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
              >
                <div className={`bar ${menuOpen ? 'bar-open-1' : ''}`}></div>
                <div className={`bar ${menuOpen ? 'bar-open-2' : ''}`}></div>
                <div className={`bar ${menuOpen ? 'bar-open-3' : ''}`}></div>
              </button>

              {/* Dropdown Menu Panel */}
              {menuOpen && (
                <div
                  ref={menuRef}
                  className="dropdown-menu absolute right-0 mt-3 w-64 bg-[rgba(255,255,255,0.92)] dark:bg-[rgba(10,25,45,0.92)] backdrop-blur-lg border border-pathly-border rounded-pathly-md shadow-pathly-card p-3 space-y-2 z-50"
                >
                  {/* Mobile Nav Items */}
                  <div className="md:hidden space-y-1 pb-2 mb-2 border-b border-pathly-border">
                     {navItems.map(item => (
                        <Button
                            key={`mobile-${item.view}`}
                            variant="secondary"
                            onClick={() => { setCurrentView(item.view); setMenuOpen(false); }}
                            fullWidth
                            className={`justify-start text-sm ${currentView === item.view ? 'bg-pathly-accent/10 text-pathly-accent' : 'text-pathly-text'}`}
                        >
                            {React.cloneElement(item.icon, { className: "w-4 h-4 mr-2.5" })}
                            {item.label}
                        </Button>
                     ))}
                  </div>

                  <Button 
                    variant="secondary" 
                    onClick={goToSettings} 
                    fullWidth
                    className="justify-start text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.646.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 1.903c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.333.183-.583.495-.646.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.759 6.759 0 010-1.903c.007-.378-.137-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Settings
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={handleResetApp} 
                    fullWidth
                    className="justify-start text-sm text-yellow-600 dark:text-yellow-400 hover:enabled:bg-yellow-500/10 hover:enabled:border-yellow-500/30"
                  >
                     <RefreshIcon className="w-4 h-4 mr-2.5" />
                    Reset App
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
