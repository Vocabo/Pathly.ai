import React, { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  maxWidth?: string; // e.g., 'max-w-xl', 'max-w-2xl'
  style?: React.CSSProperties; // Added style prop
}

// Keyframes need to be defined in index.html or global CSS if not using a CSS-in-JS solution or custom Tailwind JIT
const slideUpFadeInAnimation = {
  animation: 'slideUpFadeIn 0.8s cubic-bezier(0.165, 0.84, 0.44, 1) forwards',
};

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', maxWidth = 'max-w-2xl', style }) => {
  return (
    <div 
      className={`w-full ${maxWidth} bg-pathly-card-bg backdrop-blur-xl border border-pathly-border rounded-pathly-lg shadow-pathly-card p-6 sm:p-10 ${className}`}
      style={{ 
        transform: 'translateY(20px)', 
        opacity: 0, 
        ...slideUpFadeInAnimation, 
        ...style // Spread the passed style to allow overriding/extending, e.g., animationDelay
      }}
    >
      {children}
    </div>
  );
};