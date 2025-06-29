import React from 'react';

interface SwitchToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  icon?: React.ReactNode;
}

export const SwitchToggle: React.FC<SwitchToggleProps> = ({ label, description, enabled, onChange, icon }) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-pathly-md bg-pathly-secondary/50 hover:bg-pathly-secondary/80 transition-colors">
      <div className="flex items-center">
        {icon && <div className="mr-4 text-pathly-accent">{icon}</div>}
        <div>
          <label htmlFor={`toggle-${label.replace(/\s+/g, '-')}`} className="font-semibold text-pathly-text cursor-pointer">
            {label}
          </label>
          {description && <p className="text-sm text-pathly-text/70">{description}</p>}
        </div>
      </div>
      <button
        id={`toggle-${label.replace(/\s+/g, '-')}`}
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-pathly-card-bg focus:ring-pathly-accent ${enabled ? 'bg-pathly-accent' : 'bg-pathly-border'}`}
      >
        <span
          className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ease-in-out ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
};
