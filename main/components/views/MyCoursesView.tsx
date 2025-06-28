

import React, { useState, useRef } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { View, StoredCourse } from '../../types';
import { Button } from '../common/Button';
import { GlassCard } from '../common/GlassCard';
import { LibraryIcon, PlusCircleIcon, TrashIcon, CalendarIcon, AcademicCapIcon, DownloadIcon, UploadIcon } from '../common/Icons';

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const MyCoursesView: React.FC = () => {
  const { setCurrentView, savedCourses, loadCourse, deleteCourse, importCourses, exportCourses } = useAppContext();
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteCourse = (courseId: string, courseTitle: string) => {
    if (window.confirm(`Are you sure you want to delete the course "${courseTitle}"? This action cannot be undone.`)) {
      deleteCourse(courseId);
    }
  };

  const handleExportCourses = () => {
    const jsonData = exportCourses();
    if (jsonData) {
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pathly_courses_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportMessage(null);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonContent = e.target?.result as string;
          const result = await importCourses(jsonContent);
          setImportMessage({ type: result.success ? 'success' : 'error', text: result.message });
        } catch (err) {
          setImportMessage({ type: 'error', text: `Error reading the file: ${(err as Error).message}` });
        }
      };
      reader.readAsText(file);
    }
     // Reset file input to allow re-uploading the same file name if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-start p-5 pt-8 pb-12 space-y-8 overflow-y-auto">
      <div 
        className="text-center mb-0" // Reduced mb
        style={{ 
          opacity: 0, 
          transform: 'translateY(20px)', 
          animation: 'slideUpFadeIn 0.7s cubic-bezier(0.165, 0.84, 0.44, 1) forwards' 
        }}
      >
        <h1 className="pathly-font-heading text-4xl md:text-5xl font-extrabold tracking-tight">
          My Learning Paths
        </h1>
        <p className="pathly-font-main text-lg md:text-xl opacity-80 mt-2">
          Manage, export, and import your saved courses.
        </p>
      </div>

      {/* Import/Export Section */}
      <GlassCard 
        className="w-full max-w-xl p-6"
        style={{ animationDelay: '0.1s' }}
      >
        <h2 className="pathly-font-heading text-xl font-semibold mb-4 text-center">Course Data Management</h2>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleExportCourses} variant="secondary" className="flex-1 flex items-center justify-center">
            <DownloadIcon className="w-5 h-5 mr-2" /> Export All Courses
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="flex-1 flex items-center justify-center">
            <UploadIcon className="w-5 h-5 mr-2" /> Import Courses
          </Button>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleImportFileChange}
            className="hidden"
            aria-label="Select course file for import"
          />
        </div>
        {importMessage && (
          <p className={`mt-4 text-sm text-center p-2 rounded-md ${importMessage.type === 'success' ? 'bg-pathly-success/20 text-pathly-success' : 'bg-red-500/20 text-red-500'}`}>
            {importMessage.text}
          </p>
        )}
      </GlassCard>


      {savedCourses.length === 0 && !importMessage ? ( // Hide if there's an import message
        <GlassCard 
          className="text-center w-full max-w-xl mt-8" // Added mt-8 for spacing
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex justify-center mb-6">
            <LibraryIcon className="w-16 h-16 text-pathly-accent opacity-70" />
          </div>
          <h2 className="pathly-font-heading text-2xl md:text-3xl font-bold mb-4">
            No Courses Saved Yet
          </h2>
          <p className="pathly-font-main text-base md:text-lg opacity-80 mb-8">
            Start by creating your first personalized learning path!
          </p>
          <Button 
            variant="primary" 
            size="lg"
            onClick={() => setCurrentView(View.CONFIGURATOR)}
            className="px-8 py-4 text-lg"
          >
            <PlusCircleIcon className="w-5 h-5 mr-2 inline-block" />
            Create New Learning Path
          </Button>
        </GlassCard>
      ) : savedCourses.length > 0 ? (
        <div className="w-full max-w-4xl space-y-6 mt-2"> {/* Reduced mt if courses exist */}
          {savedCourses.sort((a,b) => b.savedAt - a.savedAt).map((course, index) => (
            <GlassCard 
              key={course.id} 
              className="w-full p-6 !max-w-none"
              style={{ animationDelay: `${index * 0.05 + 0.2}s` }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div className="mb-4 sm:mb-0 flex-grow">
                  <h3 className="pathly-font-heading text-xl md:text-2xl font-semibold text-pathly-accent mb-1">
                    {course.title}
                  </h3>
                  <div className="flex items-center text-xs text-pathly-text opacity-70 pathly-font-main space-x-3">
                    <span className="flex items-center"><CalendarIcon className="w-3.5 h-3.5 mr-1.5"/> Saved: {formatDate(course.savedAt)}</span>
                    <span className="flex items-center"><AcademicCapIcon className="w-3.5 h-3.5 mr-1.5"/> {course.chapterCount} Chapters</span>
                  </div>
                   <div className="text-xs text-pathly-text opacity-70 pathly-font-main mt-1">
                    Progress: {course.course.completedLessonCount || 0}/{course.course.chapters.reduce((sum, chap) => sum + chap.lessons.length, 0)} Lessons
                    | {course.course.currentProgressXP || 0}/{course.course.totalCourseXP || 0} XP
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center w-full sm:w-auto flex-shrink-0">
                  <Button 
                    variant="primary" 
                    onClick={() => loadCourse(course.id)}
                    className="w-full sm:w-auto px-5 py-2.5 text-sm"
                  >
                    Open Course
                  </Button>
                  <Button 
                    variant="icon"
                    onClick={() => handleDeleteCourse(course.id, course.title)}
                    className="text-red-500 hover:enabled:bg-red-500/10 p-2.5"
                    aria-label={`Delete course "${course.title}"`}
                    title={`Delete course "${course.title}"`}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
           <div className="mt-8 text-center">
             <Button 
                variant="secondary" 
                size="lg"
                onClick={() => setCurrentView(View.CONFIGURATOR)}
                className="px-8 py-4 text-lg"
              >
                <PlusCircleIcon className="w-5 h-5 mr-2 inline-block" />
                Create Another Learning Path
              </Button>
           </div>
        </div>
      ) : null}
    </div>
  );
};