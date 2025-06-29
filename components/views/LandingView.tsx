import React from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { View } from '../../types';
import { Button } from '../common/Button';
import { GlassCard } from '../common/GlassCard';

export const LandingView: React.FC = () => {
  const { setCurrentView } = useAppContext();

  return (
    <div className="w-full h-full flex items-center justify-center p-5">
      <GlassCard className="text-center" maxWidth="max-w-[650px]">
        <h1 className="pathly-font-heading text-5xl md:text-7xl font-extrabold tracking-[-0.04em] mb-6">
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-pathly-accent via-sky-400 to-teal-400 dark:from-pathly-accent dark:via-sky-300 dark:to-teal-300">
            Pathly
          </span>
        </h1>
        <p className="pathly-font-main text-lg md:text-xl mb-12 opacity-80 font-normal leading-relaxed">
          Your personal AI mentor, transforming internet chaos into a clear, motivating, and personalized learning path.
        </p>
        <Button 
          variant="primary" 
          size="lg"
          onClick={() => setCurrentView(View.CONFIGURATOR)}
        >
          Create Your Learning Path
        </Button>
      </GlassCard>
    </div>
  );
};