


import React, { useState, useEffect } from 'react';
import { CourseData, StoredCourse, CourseLesson } from '../../types';
import { ChevronDownIcon, SaveIcon, CheckCircleIcon, SquareIcon, CheckSquareIcon, ClockIcon, SparklesIcon } from '../common/Icons'; // Added SquareIcon, CheckSquareIcon
import { Button } from '../common/Button';
import { useAppContext } from '../../hooks/useAppContext';

interface LessonItemProps {
  lesson: CourseLesson;
  courseId: string;
  chapterIndex: number;
  lessonIndex: number;
  activeContentId: string | null;
  contentId: string;
  onSelectContent: (contentId: string, type: 'lesson', chapterIndex: number, lessonIndex: number) => void;
  toggleLessonComplete: (courseId: string, chapterIndex: number, lessonIndex: number) => void;
}

const LessonItem: React.FC<LessonItemProps> = ({ 
  lesson, courseId, chapterIndex, lessonIndex, activeContentId, contentId, onSelectContent, toggleLessonComplete 
}) => {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent onSelectContent from firing
    toggleLessonComplete(courseId, chapterIndex, lessonIndex);
  };

  return (
    <li className="sub-item group">
      <div 
        className={`flex items-center justify-between rounded-lg transition-all duration-300 ease-in-out pathly-font-main 
                    ${activeContentId === contentId ? 'bg-pathly-accent text-white shadow-md' : 'text-pathly-text hover:bg-pathly-secondary'}`}
      >
        <a 
          href={`#${contentId}`}
          onClick={(e) => {
            e.preventDefault();
            onSelectContent(contentId, 'lesson', chapterIndex, lessonIndex);
          }}
          className={`flex-grow block px-3 py-2.5 text-sm font-medium
            ${activeContentId === contentId ? '' : 'opacity-80 group-hover:opacity-100 group-hover:translate-x-1'}`}
          title={`${lesson.title} (${lesson.estimatedDurationMinutes} min | ${lesson.xpValue} XP)`}
        >
          {lesson.title}
          <div className="text-xs opacity-70 mt-0.5">
            {lesson.estimatedDurationMinutes} min | {lesson.xpValue} XP
          </div>
        </a>
        <Button
          variant="checkbox"
          checked={lesson.isCompleted}
          onClick={handleToggle}
          className="mr-2 focus:ring-pathly-accent focus:ring-offset-1 focus:ring-offset-transparent" // Adjusted focus ring
          aria-label={lesson.isCompleted ? `Mark lesson "${lesson.title}" as unread` : `Mark lesson "${lesson.title}" as read`}
        >
          {/* Icon is now part of the Button's checkbox variant styling if needed, or can be added explicitly if variant doesn't handle icon internally */}
          {lesson.isCompleted 
            ? <CheckSquareIcon className="w-5 h-5 text-white" /> // Ensure icon color contrasts with button bg
            : <SquareIcon className="w-5 h-5 text-pathly-text/70 group-hover:text-pathly-accent" />
          }
        </Button>
      </div>
    </li>
  );
};


interface CourseSidebarProps {
  courseData: CourseData;
  activeContentId: string | null;
  onSelectContent: (contentId: string, type: 'intro' | 'lesson' | 'exercise', chapterIndex: number, itemIndex?: number) => void;
}

export const CourseSidebar: React.FC<CourseSidebarProps> = ({ courseData, activeContentId, onSelectContent }) => {
  const [openChapters, setOpenChapters] = useState<number[]>([0]); 
  const { resetApp, saveCourse, toggleLessonComplete } = useAppContext();
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);

  const toggleChapter = (index: number) => {
    setOpenChapters(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSaveCourse = () => {
    if (courseData) {
      saveCourse(courseData);
      setShowSaveFeedback(true);
      setTimeout(() => setShowSaveFeedback(false), 2500); 
    }
  };
  
  const formatMinutes = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}min`;
  };
  
  const handleStartNewPath = () => {
      if(window.confirm("Are you sure? This will reset your current course creation progress. Your saved courses will not be affected.")){
          resetApp();
      }
  }

  return (
    <nav className="bg-pathly-card-bg backdrop-blur-2xl border border-pathly-border rounded-pathly-lg p-5 sm:p-6 flex flex-col h-full overflow-y-auto">
      <div className="mb-3 pb-3 border-b border-pathly-border">
        <h2 className="pathly-font-heading text-xl sm:text-2xl text-pathly-accent">
          {courseData.title}
        </h2>
        {/* Course Progress Display */}
        <div className="text-xs pathly-font-main text-pathly-text opacity-80 mt-2 space-y-0.5">
            <div className="flex items-center">
                <CheckCircleIcon className="w-3.5 h-3.5 mr-1.5 text-pathly-success" />
                Lessons: {courseData.completedLessonCount || 0} / {courseData.chapters.reduce((sum, chap) => sum + chap.lessons.length, 0)}
            </div>
            <div className="flex items-center">
                <SparklesIcon className="w-3.5 h-3.5 mr-1.5 text-yellow-500" />
                XP: {courseData.currentProgressXP || 0} / {courseData.totalCourseXP || 0}
            </div>
            <div className="flex items-center">
                <ClockIcon className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                Time: {formatMinutes(courseData.currentProgressMinutes || 0)} / {formatMinutes(courseData.totalCourseMinutes || 0)}
            </div>
        </div>
      </div>

      <ul className="flex-grow space-y-1">
        {courseData.chapters.map((chapter, chapIdx) => {
          const isChapterOpen = openChapters.includes(chapIdx);
          const chapterIdBase = `chap-${chapIdx}`;
          
          const chapterItems = [
            { id: `${chapterIdBase}-intro`, label: "Introduction", type: 'intro' as const, itemIdx: -1 }, 
            ...chapter.lessons.map((lesson, lessonIdx) => ({ lesson, id: `${chapterIdBase}-lesson-${lessonIdx}`, type: 'lesson' as const, itemIdx: lessonIdx })),
            ...(chapter.exercise ? [{ id: `${chapterIdBase}-exercise`, label: `Exercise: ${chapter.exercise.title}`, type: 'exercise' as const, itemIdx: chapter.lessons.length }] : [])
          ];

          return (
            <li key={chapterIdBase} className="chapter-item">
              <button 
                onClick={() => toggleChapter(chapIdx)}
                className="w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 ease-in-out pathly-font-heading font-semibold text-pathly-text hover:bg-pathly-secondary focus:outline-none focus:bg-pathly-secondary"
              >
                <span>{chapIdx + 1}. {chapter.title}</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isChapterOpen ? 'rotate-180' : ''}`} />
              </button>
              {isChapterOpen && (
                <ul className="pl-3 pt-1 pb-1 space-y-0.5 max-h-[1000px] overflow-hidden transition-all duration-400 ease-in-out">
                  {chapterItems.map(item => {
                    if (item.type === 'lesson') {
                      return (
                        <LessonItem
                          key={item.id}
                          lesson={item.lesson}
                          courseId={courseData.id}
                          chapterIndex={chapIdx}
                          lessonIndex={item.itemIdx}
                          activeContentId={activeContentId}
                          contentId={item.id}
                          onSelectContent={onSelectContent as any}
                          toggleLessonComplete={toggleLessonComplete}
                        />
                      );
                    } else { // 'intro' or 'exercise'
                      return (
                        <li key={item.id} className="sub-item">
                          <a 
                            href={`#${item.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              onSelectContent(item.id, item.type, chapIdx, item.itemIdx);
                            }}
                            className={`block px-3 py-2.5 text-sm rounded-lg transition-all duration-300 ease-in-out pathly-font-main font-medium
                              ${activeContentId === item.id 
                                ? 'bg-pathly-accent text-white opacity-100 translate-x-1 shadow-md' 
                                : 'text-pathly-text opacity-80 hover:opacity-100 hover:bg-pathly-secondary hover:translate-x-1'}`}
                          >
                            {item.label}
                          </a>
                        </li>
                      );
                    }
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-auto pt-4 border-t border-pathly-border space-y-2.5">
        <Button 
          variant={showSaveFeedback ? "secondary" : "primary"}
          onClick={handleSaveCourse} 
          fullWidth
          className="flex items-center justify-center"
        >
           {showSaveFeedback ? (
            <>
              <CheckCircleIcon className="w-5 h-5 mr-2 text-pathly-success" /> Progress Saved!
            </>
          ) : (
            <>
              <SaveIcon className="w-5 h-5 mr-2" /> Save Progress
            </>
          )}
        </Button>
        <Button variant="secondary" onClick={handleStartNewPath} fullWidth>
          Start New Path
        </Button>
      </div>
    </nav>
  );
};