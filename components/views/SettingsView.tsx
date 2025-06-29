


import React, { useState } from 'react';
import { GlassCard } from '../common/GlassCard';
import { useAppContext } from '../../hooks/useAppContext';
import { View, Theme } from '../../types';
import { Button } from '../common/Button';
import { SwitchToggle } from '../common/SwitchToggle';
import { MoonIcon, SunIcon, BellIcon, SpeakerWaveIcon, ArchiveBoxIcon, ExclamationTriangleIcon } from '../common/Icons';


export const SettingsView: React.FC = () => {
  const { theme, setTheme, resetApp, setCurrentView } = useAppContext();
  const [uiSoundsEnabled, setUiSoundsEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset the app? This will clear any current course creation progress but will NOT delete your saved courses or chat history.")) {
      resetApp();
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-start p-5 pt-8 pb-12 overflow-y-auto">
       <div 
        className="text-center mb-6"
        style={{ 
          opacity: 0, 
          transform: 'translateY(20px)', 
          animation: 'slideUpFadeIn 0.7s cubic-bezier(0.165, 0.84, 0.44, 1) forwards' 
        }}
      >
        <h1 className="pathly-font-heading text-4xl md:text-5xl font-extrabold tracking-tight">
          Settings
        </h1>
        <p className="pathly-font-main text-lg md:text-xl opacity-80 mt-2">
          Customize your Pathly experience.
        </p>
      </div>

      <GlassCard className="w-full max-w-2xl p-6 sm:p-8 space-y-8" style={{ animationDelay: '0.1s' }}>
        
        {/* Appearance Section */}
        <section>
          <h2 className="pathly-font-heading text-xl font-semibold mb-4 border-b border-pathly-border pb-2">Appearance</h2>
          <div className="space-y-4">
            <SwitchToggle
              label="Dark Mode"
              description="Reduce eye strain in low light."
              enabled={theme === Theme.DARK}
              onChange={(enabled) => setTheme(enabled ? Theme.DARK : Theme.LIGHT)}
              icon={theme === Theme.DARK ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
            />
          </div>
        </section>

        {/* Sound & Notifications Section */}
        <section>
          <h2 className="pathly-font-heading text-xl font-semibold mb-4 border-b border-pathly-border pb-2">Sound & Notifications</h2>
          <div className="space-y-4">
            <SwitchToggle
              label="UI Sounds"
              description="Enable sound effects for interactions."
              enabled={uiSoundsEnabled}
              onChange={setUiSoundsEnabled}
              icon={<SpeakerWaveIcon className="w-6 h-6" />}
            />
            <SwitchToggle
              label="Course Completion Notifications"
              description="Get notified when you complete a course."
              enabled={notificationsEnabled}
              onChange={setNotificationsEnabled}
              icon={<BellIcon className="w-6 h-6" />}
            />
          </div>
        </section>

        {/* Data Management Section */}
        <section>
          <h2 className="pathly-font-heading text-xl font-semibold mb-4 border-b border-pathly-border pb-2">Data Management</h2>
            <Button variant="secondary" fullWidth onClick={() => setCurrentView(View.MY_COURSES)} className="justify-center">
                 <ArchiveBoxIcon className="w-5 h-5 mr-2" />
                 Go to My Courses to Import/Export Data
            </Button>
        </section>
        
        {/* Reset Section */}
        <section>
          <h2 className="pathly-font-heading text-xl font-semibold mb-4 border-b border-red-500/30 pb-2 text-red-500">Danger Zone</h2>
           <div className="bg-red-500/10 p-4 rounded-pathly-md border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                  <h3 className="font-semibold">Reset Application</h3>
                  <p className="text-sm text-pathly-text/80 mt-1">
                      This resets the current view and any in-progress course creation. Your saved courses and chat history will not be deleted.
                  </p>
              </div>
              <Button variant="secondary" onClick={handleReset} className="border-red-500/50 text-red-500 hover:enabled:bg-red-500/10 hover:enabled:border-red-500/80 flex-shrink-0">
                  <ExclamationTriangleIcon className="w-5 h-5 mr-2"/>
                  Reset App
              </Button>
           </div>
        </section>

      </GlassCard>
    </div>
  );
};