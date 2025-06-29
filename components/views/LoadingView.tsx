
import React, { useEffect, useCallback, useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { View, CourseChapter, GeminiError, CourseBlueprint, CourseData, CourseLesson } from '../../types';
import { GlassCard } from '../common/GlassCard';
import { generateChapterTitles, generateChapterContent, checkBlueprintQuality, checkBlueprintFeasibility, generateCourseBlueprint } from '../../services/geminiService';
import { MIN_API_CALL_DELAY_MS } from '../../constants';

export const LoadingView: React.FC = () => {
  const { 
    isLoading, 
    loadingMessage, 
    loadingProgress, 
    setLoading, 
    setCurrentView, 
    userChoices, 
    courseBlueprint: initialCourseBlueprint, 
    setCourseBlueprint: setGlobalCourseBlueprint, 
    courseData, 
    setCourseData,
    resetApp
  } = useAppContext();

  const [currentBlueprintForGeneration, setCurrentBlueprintForGeneration] = useState<CourseBlueprint | null>(initialCourseBlueprint);

  const determineContentSpec = useCallback((blueprintToUse: CourseBlueprint | null) => {
    const durationMap: { [key: string]: { baseChapters: number; lessonsPerChapter: number; project: string } } = {
      'a short weekend sprint': { baseChapters: 3, lessonsPerChapter: 2, project: 'a small final exercise' },
      'a 2-week course': { baseChapters: 5, lessonsPerChapter: 3, project: 'several practical exercises and a small final project' },
      'a comprehensive 1-month course': { baseChapters: 7, lessonsPerChapter: 4, project: 'multiple projects and a solid final project' }
    };
    const commitmentMap: { [key: string]: number } = {
      '1-3 hours per week': 0.8,
      '4-6 hours per week': 1.0,
      '7+ hours per week': 1.2
    };

    const spec = durationMap[userChoices.duration || 'a 2-week course'] || durationMap['a 2-week course'];
    const multiplier = commitmentMap[userChoices.commitment || '4-6 hours per week'] || 1.0;
    
    const numChapters = blueprintToUse?.objectives?.length 
      ? Math.max(1, blueprintToUse.objectives.length) 
      : Math.max(1, Math.round(spec.baseChapters * multiplier));

    return {
        chapters: numChapters, 
        lessonsPerChapter: Math.max(1, Math.round(spec.lessonsPerChapter * multiplier)), 
        project: spec.project,
        detail: multiplier > 1.1 ? 'very thorough, with many examples and theoretical depth' : (multiplier > 0.9 ? 'detailed with background information' : 'moderately detailed, focused on the essentials')
    };
  }, [userChoices.duration, userChoices.commitment]);


  const generateCourse = useCallback(async () => {
    if (!currentBlueprintForGeneration || !userChoices.finalTitle) {
      const errorMsg = "Error: Course blueprint or final title not found. Please restart the configuration. The application will reset shortly.";
      setLoading(true, errorMsg, 0); 
      setTimeout(resetApp, 7000); 
      return;
    }

    let actualBlueprintToUse = { ...currentBlueprintForGeneration }; 
    let progress = 5;

    setLoading(true, 'Checking feasibility of the final draft...', progress);
    await new Promise(resolve => setTimeout(resolve, MIN_API_CALL_DELAY_MS / 2));
    
    let refinementAttempt = 0;
    const maxRefinementAttempts = 2; 

    while(refinementAttempt < maxRefinementAttempts) {
        const feasibilityResult = await checkBlueprintFeasibility(actualBlueprintToUse, userChoices);
        progress += 5;
        setLoading(true, `Feasibility check (Attempt ${refinementAttempt + 1})...`, progress);

        if (feasibilityResult.data) {
            if (feasibilityResult.data.feasibility === 'feasible') {
                setLoading(true, 'Course draft is feasible.', progress);
                break; 
            } else if (feasibilityResult.data.suggestion) {
                progress += 5;
                setLoading(true, `Feedback: "${feasibilityResult.data.suggestion}". Optimizing course structure (Attempt ${refinementAttempt + 1})...`, progress);
                
                const refinementInstruction = `The feasibility feedback was: "${feasibilityResult.data.suggestion}". ${feasibilityResult.data.refined_chapter_count ? `Adjust the number of learning objectives/chapters (Target: ${feasibilityResult.data.refined_chapter_count}).` : ''}`;
                
                const refinedBlueprintResult = await generateCourseBlueprint(userChoices, refinementInstruction);
                if (refinedBlueprintResult.data) {
                    actualBlueprintToUse = refinedBlueprintResult.data;
                    setGlobalCourseBlueprint(actualBlueprintToUse); 
                    setLoading(true, `Course structure adjusted (Attempt ${refinementAttempt + 1}).`, progress);
                } else {
                    setLoading(true, `Error adjusting course structure (Attempt ${refinementAttempt + 1}): ${refinedBlueprintResult.error}. Continuing with previous draft.`, progress);
                    break; 
                }
            } else {
                 setLoading(true, 'Feasibility check yielded no specific suggestions. Proceeding.', progress);
                 break; 
            }
        } else {
            setLoading(true, `Error during feasibility check (Attempt ${refinementAttempt + 1}): ${feasibilityResult.error}. Continuing with current draft.`, progress);
            break; 
        }
        refinementAttempt++;
        if (refinementAttempt >= maxRefinementAttempts) {
            setLoading(true, 'Maximum adjustment attempts reached. Continuing with current draft.', progress);
        }
        await new Promise(resolve => setTimeout(resolve, MIN_API_CALL_DELAY_MS));
    }
    
    setCurrentBlueprintForGeneration(actualBlueprintToUse); 
    const contentSpec = determineContentSpec(actualBlueprintToUse); 
    let qualityCheckSuggestions: string | undefined = undefined;
    progress = Math.max(progress, 25); 

    setLoading(true, 'Performing quality check for course structure...', progress);
    await new Promise(resolve => setTimeout(resolve, MIN_API_CALL_DELAY_MS / 2));
    const qualityResult = await checkBlueprintQuality(actualBlueprintToUse, userChoices, contentSpec.chapters);
    progress +=5;

    if (qualityResult.data) {
        if (qualityResult.data.quality_check === "needs_revision" && qualityResult.data.suggestions) {
            qualityCheckSuggestions = qualityResult.data.suggestions;
            setLoading(true, `Quality check: "${qualityResult.data.suggestions}". Suggestions will be considered.`, progress);
        } else {
            setLoading(true, 'Quality check passed. Creating chapter titles...', progress);
        }
    } else {
        setLoading(true, `Warning: Quality check failed (${qualityResult.error}). Proceeding with standard generation...`, progress);
    }
    await new Promise(resolve => setTimeout(resolve, MIN_API_CALL_DELAY_MS));

    progress = Math.max(progress, 35);
    setLoading(true, `Creating curriculum with ${contentSpec.chapters} chapters...`, progress);
    const chapterTitlesResult = await generateChapterTitles(
      userChoices.finalTitle!, 
      userChoices.level || 'Beginner',
      userChoices.style || 'Learning by Doing',
      userChoices.testTaken,
      contentSpec.chapters,
      qualityCheckSuggestions
    );

    if (!chapterTitlesResult.data || chapterTitlesResult.data.length === 0) {
      let errorForDisplay: string = (typeof chapterTitlesResult.error === 'string' ? chapterTitlesResult.error : (chapterTitlesResult.error as GeminiError)?.message) || 'No titles generated.';
      let errorMessage = `Error creating chapter titles: ${errorForDisplay}.`;
      if (errorForDisplay.toLowerCase().includes("api key") ) {
        errorMessage += " Please ensure the API key is correctly configured as an environment variable (process.env.API_KEY).";
      }
      errorMessage += " The application will restart shortly.";
      setLoading(true, errorMessage, 0); 
      setTimeout(resetApp, 8000); 
      return;
    }
    
    const chaptersData: CourseChapter[] = [];
    const totalChapters = chapterTitlesResult.data.length;
    const baseProgressForChapters = progress + 5; 
    const progressPerChapter = (90 - baseProgressForChapters) / totalChapters;

    let calculatedTotalCourseXP = 0;
    let calculatedTotalCourseMinutes = 0;

    for (let i = 0; i < totalChapters; i++) {
      const chapterTitle = chapterTitlesResult.data[i].trim();
      progress = baseProgressForChapters + (i * progressPerChapter);
      setLoading(true, `Generating Chapter ${i + 1}/${totalChapters}: "${chapterTitle}"`, Math.round(progress));
      
      if (i > 0) await new Promise(resolve => setTimeout(resolve, MIN_API_CALL_DELAY_MS));

      let chapterContentResult;
      let attempt = 0;
      const maxContentRetries = 2; 
      let chapterErrorForDisplay: string | undefined;

      while(attempt <= maxContentRetries) {
        chapterContentResult = await generateChapterContent(
          userChoices.finalTitle!,
          chapterTitle,
          userChoices.level || 'Beginner',
          userChoices.style || 'Learning by Doing',
          userChoices.testTaken,
          contentSpec.lessonsPerChapter,
          contentSpec.detail,
          qualityCheckSuggestions,
          { attempt, previousError: chapterErrorForDisplay }
        );

        if (chapterContentResult.data) {
          chapterErrorForDisplay = undefined; 
          break; 
        } else {
          attempt++;
          chapterErrorForDisplay = (typeof chapterContentResult.error === 'string' ? chapterContentResult.error : (chapterContentResult.error as GeminiError)?.message) || 'Unknown error during chapter generation';
          setLoading(true, `Error in chapter "${chapterTitle}" (Attempt ${attempt}/${maxContentRetries+1})... ${chapterErrorForDisplay.substring(0,50)}`, Math.round(progress));
          if (attempt <= maxContentRetries) {
            await new Promise(resolve => setTimeout(resolve, MIN_API_CALL_DELAY_MS * 1.5)); 
          }
        }
      }

      if (chapterContentResult && chapterContentResult.data) {
        // Initialize isCompleted for lessons and sum up XP/duration
        const processedLessons = chapterContentResult.data.lessons.map(lesson => {
          const lessonXP = lesson.xpValue || 0;
          const lessonMinutes = lesson.estimatedDurationMinutes || 0;
          calculatedTotalCourseXP += lessonXP;
          calculatedTotalCourseMinutes += lessonMinutes;
          return {
            ...lesson,
            xpValue: lessonXP,
            estimatedDurationMinutes: lessonMinutes,
            isCompleted: false, // Ensure all new lessons start as not completed
          };
        });
        chaptersData.push({ 
            title: chapterTitle, 
            ...chapterContentResult.data,
            lessons: processedLessons 
        });
      } else {
        console.warn(`Could not generate content for chapter "${chapterTitle}" after ${maxContentRetries + 1} attempts: ${chapterErrorForDisplay}`);
        chaptersData.push({ 
          title: chapterTitle, 
          introduction: `<p>Content for this chapter ("${chapterTitle}") could not be generated. Error: ${chapterErrorForDisplay || 'Unknown'}. Please try again later or adjust the course settings.</p>`, 
          lessons: [{ 
            title: "Error", 
            content: "<p>Lesson content could not be loaded.</p>",
            xpValue: 0,
            estimatedDurationMinutes: 0,
            isCompleted: false
          }], 
          exercise: { title: "No exercise available", task:"-", solution: "-" }
        });
      }
    }
    
    const courseId = (userChoices.finalTitle?.replace(/\s+/g, '_') || 'course') + '_' + Date.now();
    const finalCourseData: CourseData = {
      id: courseId,
      title: userChoices.finalTitle!,
      chapters: chaptersData,
      totalCourseXP: calculatedTotalCourseXP,
      totalCourseMinutes: calculatedTotalCourseMinutes,
      currentProgressXP: 0,
      currentProgressMinutes: 0,
      completedLessonCount: 0,
    };

    setCourseData(finalCourseData);
    setLoading(true, 'Course successfully created!', 100);
    setTimeout(() => {
      setCurrentView(View.COURSE);
      setLoading(false); 
    }, 1500);

  }, [currentBlueprintForGeneration, userChoices, setLoading, setCurrentView, setCourseData, determineContentSpec, resetApp, setGlobalCourseBlueprint]);


  useEffect(() => {
    if (initialCourseBlueprint && !currentBlueprintForGeneration) {
        setCurrentBlueprintForGeneration(initialCourseBlueprint);
    }
  }, [initialCourseBlueprint, currentBlueprintForGeneration]);

  useEffect(() => {
    if (isLoading && loadingMessage.startsWith("Generating your full course...") && userChoices.finalTitle && currentBlueprintForGeneration && !courseData) {
      generateCourse();
    } else if (!isLoading && userChoices.finalTitle && currentBlueprintForGeneration && !courseData) { 
      setLoading(true, 'Starting course creation...', 0);
    }
  }, [userChoices.finalTitle, currentBlueprintForGeneration, courseData, isLoading, loadingMessage, generateCourse, setLoading]);


  return (
    <div className="w-full h-full flex items-center justify-center p-5 pt-8">
      <GlassCard className="text-center" maxWidth="max-w-xl">
        <h2 className="pathly-font-heading text-2xl sm:text-3xl text-pathly-accent mb-6">
          {loadingMessage || 'Creating your learning path...'}
        </h2>
        <div className="w-full h-2 bg-pathly-border rounded-sm overflow-hidden mb-4">
          <div 
            className="h-full bg-pathly-accent transition-all duration-500 ease-out rounded-sm progress-bar-shine"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
        <p className="pathly-font-main text-sm opacity-80">
          {isLoading ? 'Please wait a moment...' : 'Almost done!'}
        </p>
        {(loadingMessage.toLowerCase().includes("api key")) && (
             <p className="mt-4 text-xs pathly-font-main text-pathly-warning bg-pathly-secondary p-2 rounded-md">
                Note: The API key must be set as an environment variable `process.env.API_KEY` in the application's execution environment.
             </p>
        )}
      </GlassCard>
    </div>
  );
};