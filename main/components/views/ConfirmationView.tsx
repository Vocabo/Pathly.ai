import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { View, CourseBlueprint } from '../../types';
import { Button } from '../common/Button';
import { GlassCard } from '../common/GlassCard';

export const ConfirmationView: React.FC = () => {
  const { 
    setCurrentView, 
    courseBlueprint, 
    updateUserChoice, 
    setCourseBlueprint: setGlobalBlueprint, 
    setAdaptiveTestState,
    adaptiveTest,
    setLoading // Added setLoading
  } = useAppContext();
  
  const [editableBlueprint, setEditableBlueprint] = useState<CourseBlueprint | null>(null);

  useEffect(() => {
    if (courseBlueprint) {
      setEditableBlueprint(JSON.parse(JSON.stringify(courseBlueprint))); 
    }
  }, [courseBlueprint]);

  const handleInputChange = (field: keyof CourseBlueprint, value: string | string[], index?: number) => {
    if (!editableBlueprint) return;

    setEditableBlueprint(prev => {
      if (!prev) return null;
      const newBlueprint = { ...prev };
      if (field === 'objectives' && Array.isArray(value) && index !== undefined) {
        const newObjectives = [...newBlueprint.objectives];
        newObjectives[index] = value[0] as string; 
        return { ...newBlueprint, objectives: newObjectives };
      } else if (field !== 'objectives' && typeof value === 'string') {
        return { ...newBlueprint, [field]: value };
      }
      return prev;
    });
  };
  
  const handleObjectiveChange = (index: number, value: string) => {
    if (!editableBlueprint) return;
    const newObjectives = [...editableBlueprint.objectives];
    newObjectives[index] = value;
    setEditableBlueprint(prev => prev ? { ...prev, objectives: newObjectives } : null);
  };


  const handleStartTest = () => {
    if (editableBlueprint) {
        updateUserChoice('finalTitle', editableBlueprint.title);
        updateUserChoice('finalDescription', editableBlueprint.description);
        updateUserChoice('finalObjectives', editableBlueprint.objectives);
        if (setGlobalBlueprint) setGlobalBlueprint(editableBlueprint); 
    }
    setAdaptiveTestState({ isActive: true, currentIndex: 0, history: [], knowledgeMap: { strengths: [], weaknesses: [] } }); 
    setCurrentView(View.TEST);
  };

  const handleConfirmAndGenerate = () => {
    if (editableBlueprint) {
      updateUserChoice('finalTitle', editableBlueprint.title);
      updateUserChoice('finalDescription', editableBlueprint.description);
      updateUserChoice('finalObjectives', editableBlueprint.objectives);
      if (setGlobalBlueprint) setGlobalBlueprint(editableBlueprint); 
      if (!adaptiveTest.isActive && adaptiveTest.history.length === 0) { 
        updateUserChoice('testTaken', 'Test was not taken or was skipped.');
      }
    }
    setLoading(true, 'Generating your full course...', 5); // Set specific message for full course generation
    setCurrentView(View.LOADING); 
  };

  if (!editableBlueprint) {
    return (
      <div className="w-full h-full flex items-center justify-center p-5 pt-8">
        <GlassCard className="text-center" maxWidth="max-w-xl">
          <p>Loading course blueprint...</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-5 pt-8 pb-8"> {/* Added pt-8 and pb-8 for spacing */}
      <GlassCard 
        className="text-center overflow-y-auto" 
        maxWidth="max-w-3xl"
        style={{maxHeight: 'calc(100vh - 8rem)'}} // Ensure card does not exceed viewport with navbar
      >
        <h2 className="pathly-font-heading text-3xl sm:text-4xl text-pathly-accent mb-4">Your Course Blueprint</h2>
        <p className="pathly-font-main opacity-80 mb-6 text-sm sm:text-base">
          The AI has created this draft. You can edit it here directly before the course is generated.
        </p>
        
        <div className="text-left bg-pathly-secondary/70 p-6 rounded-pathly-md mb-8 space-y-5">
          <div className="blueprint-field">
            <label htmlFor="blueprint-title" className="block font-semibold mb-2 opacity-90 text-pathly-text">Course Title</label>
            <input 
              type="text" 
              id="blueprint-title"
              value={editableBlueprint.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full p-3 text-base rounded-pathly-md border border-pathly-border bg-pathly-bg text-pathly-text focus:outline-none focus:border-pathly-accent focus:ring-2 focus:ring-pathly-accent focus:ring-opacity-25"
            />
          </div>
          <div className="blueprint-field">
            <label htmlFor="blueprint-desc" className="block font-semibold mb-2 opacity-90 text-pathly-text">Description</label>
            <textarea 
              id="blueprint-desc"
              value={editableBlueprint.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full p-3 text-base rounded-pathly-md border border-pathly-border bg-pathly-bg text-pathly-text focus:outline-none focus:border-pathly-accent focus:ring-2 focus:ring-pathly-accent focus:ring-opacity-25 resize-y min-h-[80px]"
            />
          </div>
          <div className="blueprint-field">
            <label className="block font-semibold mb-2 opacity-90 text-pathly-text">Learning Objectives</label>
            <div className="space-y-2">
              {editableBlueprint.objectives.map((objective, index) => (
                <input 
                  key={index}
                  type="text" 
                  value={objective}
                  onChange={(e) => handleObjectiveChange(index, e.target.value)}
                  className="w-full p-3 text-base rounded-pathly-md border border-pathly-border bg-pathly-bg text-pathly-text focus:outline-none focus:border-pathly-accent focus:ring-2 focus:ring-pathly-accent focus:ring-opacity-25"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="secondary" onClick={handleStartTest} size="lg">Optional Knowledge Test</Button>
          <Button variant="primary" onClick={handleConfirmAndGenerate} size="lg">Create Course Now!</Button>
        </div>
      </GlassCard>
    </div>
  );
};