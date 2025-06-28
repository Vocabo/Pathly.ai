

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { View, CourseLesson } from '../../types'; 
import { CourseSidebar } from '../course/CourseSidebar';
import { CourseContentDisplay } from '../course/CourseContentDisplay';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const CourseView: React.FC = () => {
  const { courseData, setActiveLessonOrExerciseTitle } = useAppContext(); 
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState<{ title: string; htmlContent: string; type: 'intro' | 'lesson' | 'exercise'; lessonData?: CourseLesson } | null>(null);

  useEffect(() => {
    if (courseData && courseData.chapters.length > 0) {
      const firstChapter = courseData.chapters[0];
      const firstChapterIdBase = `chap-0`;
      const firstIntroId = `${firstChapterIdBase}-intro`;
      setActiveContentId(firstIntroId);
      const introTitle = `Introduction: ${firstChapter.title}`;
      setCurrentContent({
        title: introTitle, 
        htmlContent: firstChapter.introduction,
        type: 'intro',
      });
      setActiveLessonOrExerciseTitle(introTitle);
    }
    // Clear active title when leaving course view (handled in AppContext.setCourseData)
  }, [courseData, setActiveLessonOrExerciseTitle]);

  const handleSelectContent = (
    contentId: string,
    type: 'intro' | 'lesson' | 'exercise',
    chapterIndex: number,
    itemIndex?: number 
  ) => {
    if (!courseData) return;
    setActiveContentId(contentId);

    const chapter = courseData.chapters[chapterIndex];
    if (!chapter) return;

    let newActiveTitle: string | undefined;

    if (type === 'intro') {
      newActiveTitle = `Introduction: ${chapter.title}`;
      setCurrentContent({ title: newActiveTitle, htmlContent: chapter.introduction, type });
    } else if (type === 'lesson' && itemIndex !== undefined && chapter.lessons[itemIndex]) {
      const lesson = chapter.lessons[itemIndex];
      newActiveTitle = lesson.title;
      setCurrentContent({ title: newActiveTitle, htmlContent: lesson.content, type, lessonData: lesson });
    } else if (type === 'exercise' && chapter.exercise) {
       newActiveTitle = `Exercise: ${chapter.exercise.title}`;
       const exerciseHtml = `
         <h3>Task</h3>
         ${chapter.exercise.task}
         <details class="mt-4 p-3 bg-pathly-secondary dark:bg-opacity-20 rounded-md border border-pathly-border">
           <summary class="cursor-pointer font-semibold text-pathly-accent hover:opacity-80 transition-opacity">Show Solution</summary>
           <div class="mt-3">
             <h3>Solution</h3>
             ${chapter.exercise.solution}
           </div>
         </details>
       `;
       setCurrentContent({ 
        title: newActiveTitle, 
        htmlContent: exerciseHtml,
        type 
      });
    }
    setActiveLessonOrExerciseTitle(newActiveTitle);
  };

  if (!courseData) {
    return (
      <div className="w-full h-full flex items-center justify-center p-5 pt-8">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 pathly-font-main text-pathly-text">Loading course data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 sm:p-6"> 
      <div className="grid grid-cols-1 md:grid-cols-[minmax(300px,_350px)_1fr] gap-4 sm:gap-6 h-full"> 
        <CourseSidebar 
          courseData={courseData}
          activeContentId={activeContentId}
          onSelectContent={handleSelectContent}
        />
        {currentContent ? (
          <CourseContentDisplay 
            title={currentContent.title}
            htmlContent={currentContent.htmlContent}
            type={currentContent.type}
            lessonData={currentContent.lessonData}
          />
        ) : (
          <div className="bg-pathly-card-bg backdrop-blur-2xl border border-pathly-border rounded-pathly-lg p-10 h-full flex items-center justify-center overflow-y-auto">
            <p className="pathly-font-main text-pathly-text">Select content from the menu.</p>
          </div>
        )}
      </div>
    </div>
  );
};