
import React, { ReactNode } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'skip' | 'unknown' | 'icon' | 'checkbox';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  checked?: boolean; // For checkbox variant
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  checked = false, // For checkbox variant
  className = '',
  ...props
}) => {
  const baseStyles = 'pathly-font-heading font-bold rounded-pathly-md transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-pathly-accent focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transform will-change-transform,box-shadow,background-color';

  const textSizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  if (size === 'md' && variant !== 'icon' && variant !== 'checkbox') {
    textSizeStyles.md = 'px-8 py-4 text-lg'; 
  }

  let finalSizeStyles = textSizeStyles[size];

  if (variant === 'icon') {
    switch (size) {
      case 'sm': finalSizeStyles = 'w-9 h-9 p-2'; break; // 36px button, 8px padding for 16-20px icons
      case 'md': finalSizeStyles = 'w-10 h-10 p-2'; break; // 40px button, 8px padding
      case 'lg': finalSizeStyles = 'w-12 h-12 p-2.5'; break; // 48px button, 10px padding
      default: finalSizeStyles = 'w-10 h-10 p-2';
    }
  }


  const variantStyles = {
    primary: 'bg-pathly-accent text-white shadow-pathly-btn-primary hover:enabled:bg-pathly-accent-hover hover:enabled:shadow-pathly-btn-primary-hover hover:enabled:translate-y-[-2px] hover:enabled:scale-[1.03]',
    secondary: 'bg-transparent border-2 border-pathly-border text-pathly-text hover:enabled:bg-pathly-secondary hover:enabled:border-pathly-accent hover:enabled:scale-[1.03] hover:enabled:shadow-[0_0_15px_-3px_var(--border-color)]',
    skip: 'bg-transparent border-2 border-pathly-info text-pathly-info hover:enabled:bg-pathly-info hover:enabled:text-white hover:enabled:scale-[1.03]',
    unknown: 'bg-transparent border-2 border-pathly-warning text-pathly-warning hover:enabled:bg-pathly-warning hover:enabled:text-white hover:enabled:scale-[1.03]',
    icon: 'rounded-full hover:enabled:bg-pathly-secondary flex items-center justify-center hover:enabled:scale-[1.08] hover:enabled:shadow-md', // Removed p-2 as finalSizeStyles handles it
    checkbox: `p-1.5 rounded-md border-2 transition-all duration-200 ease-in-out flex items-center justify-center 
               ${checked 
                 ? 'bg-pathly-accent border-pathly-accent text-white' 
                 : 'bg-transparent border-pathly-border text-pathly-text/70 hover:enabled:border-pathly-accent hover:enabled:bg-pathly-accent/10'
               }`
  };

  return (
    <button
      className={`${baseStyles} ${finalSizeStyles} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
      aria-pressed={variant === 'checkbox' ? checked : undefined}
    >
      {children}
    </button>
  );
};
