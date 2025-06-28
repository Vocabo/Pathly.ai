import React from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Theme } from '../types';
import { MoonIcon, SunIcon } from './common/Icons';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useAppContext();

  const toggleTheme = () => {
    setTheme(theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-24 right-6 z-50 w-10 h-10 bg-pathly-card-bg border border-pathly-border rounded-full flex items-center justify-center text-pathly-text transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] hover:scale-110 hover:rotate-12 hover:shadow-lg backdrop-blur-sm"
      aria-label={theme === Theme.LIGHT ? "Switch to dark theme" : "Switch to light theme"}
    >
      {theme === Theme.LIGHT ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
    </button>
  );
};