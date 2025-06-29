
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { View, Theme, UserChoices, CourseBlueprint, AdaptiveTestState, CourseData, AppContextType, AppState, StoredCourse, CourseLesson, CourseChapter, GlobalChatSession, ChatMessage } from '../types';
import { DEFAULT_ADAPTIVE_TEST_STATE, INITIAL_USER_CHOICES, LOCAL_STORAGE_SAVED_COURSES_KEY, LOCAL_STORAGE_GLOBAL_CHAT_SESSIONS_KEY, AI_SYSTEM_INSTRUCTION_GLOBAL_ASSISTANT_BASE } from '../constants';

const defaultState: AppState = {
  currentView: View.DASHBOARD, 
  theme: Theme.LIGHT,
  userChoices: { ...INITIAL_USER_CHOICES },
  courseBlueprint: null,
  adaptiveTest: { ...DEFAULT_ADAPTIVE_TEST_STATE },
  courseData: null,
  isLoading: false,
  loadingMessage: '',
  loadingProgress: 0,
  isApiUnavailable: false,
  savedCourses: [],
  globalTotalXP: 0,
  globalTotalLearningMinutes: 0,
  isChatWidgetOpen: false, 
  activeLessonOrExerciseTitle: undefined,
  globalChatSessions: [], // Initialize global chat sessions
  activeGlobalChatSessionId: null, // No active session initially
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [currentView, setCurrentView] = useState<View>(defaultState.currentView);
  const [theme, setThemeState] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('pathlyTheme');
    return (storedTheme as Theme) || defaultState.theme;
  });
  const [userChoices, setUserChoicesState] = useState<UserChoices>(defaultState.userChoices);
  const [courseBlueprint, setCourseBlueprintState] = useState<CourseBlueprint | null>(defaultState.courseBlueprint);
  const [adaptiveTest, setAdaptiveTestInternalState] = useState<AdaptiveTestState>(defaultState.adaptiveTest);
  const [courseData, setCourseDataState] = useState<CourseData | null>(defaultState.courseData);
  const [isLoading, setIsLoadingState] = useState<boolean>(defaultState.isLoading);
  const [loadingMessage, setLoadingMessageState] = useState<string>(defaultState.loadingMessage);
  const [loadingProgress, setLoadingProgressState] = useState<number>(defaultState.loadingProgress);
  const [isApiUnavailable, setIsApiUnavailableState] = useState<boolean>(defaultState.isApiUnavailable);
  
  // Saved Courses State
  const [savedCourses, setSavedCoursesState] = useState<StoredCourse[]>(defaultState.savedCourses);
  const [globalTotalXP, setGlobalTotalXPState] = useState<number>(defaultState.globalTotalXP);
  const [globalTotalLearningMinutes, setGlobalTotalLearningMinutesState] = useState<number>(defaultState.globalTotalLearningMinutes);

  // Global Chat Widget State
  const [isChatWidgetOpen, setIsChatWidgetOpenState] = useState<boolean>(defaultState.isChatWidgetOpen);
  const [activeLessonOrExerciseTitle, setActiveLessonOrExerciseTitleState] = useState<string | undefined>(defaultState.activeLessonOrExerciseTitle);
  const [globalChatSessions, setGlobalChatSessionsState] = useState<GlobalChatSession[]>(defaultState.globalChatSessions);
  const [activeGlobalChatSessionId, setActiveGlobalChatSessionIdState] = useState<string | null>(defaultState.activeGlobalChatSessionId);


  useEffect(() => {
    document.documentElement.classList.remove(Theme.LIGHT, Theme.DARK);
    document.documentElement.classList.add(theme);
    localStorage.setItem('pathlyTheme', theme);
  }, [theme]);

  const calculateGlobalStats = useCallback((courses: StoredCourse[]) => {
    let totalXP = 0;
    let totalMinutes = 0;
    courses.forEach(sc => {
      totalXP += sc.course.currentProgressXP || 0;
      totalMinutes += sc.course.currentProgressMinutes || 0;
    });
    setGlobalTotalXPState(totalXP);
    setGlobalTotalLearningMinutesState(totalMinutes);
  }, []);

  useEffect(() => {
    try {
      const storedCoursesJson = localStorage.getItem(LOCAL_STORAGE_SAVED_COURSES_KEY);
      if (storedCoursesJson) {
        const courses = JSON.parse(storedCoursesJson) as StoredCourse[];
        setSavedCoursesState(courses);
        calculateGlobalStats(courses);
      }
      const storedChatSessionsJson = localStorage.getItem(LOCAL_STORAGE_GLOBAL_CHAT_SESSIONS_KEY);
      if (storedChatSessionsJson) {
        const chatSessions = JSON.parse(storedChatSessionsJson) as GlobalChatSession[];
        setGlobalChatSessionsState(chatSessions);
        // Optionally set the most recent as active, or none
        if (chatSessions.length > 0) {
           // setActiveGlobalChatSessionIdState(chatSessions.sort((a,b) => b.updatedAt - a.updatedAt)[0].id);
        }
      }

    } catch (error) {
      console.error("Error loading data from localStorage:", error);
    }
  }, [calculateGlobalStats]);

  const setTheme = (newTheme: Theme) => setThemeState(newTheme);
  const updateUserChoice = useCallback(<K extends keyof UserChoices,>(key: K, value: UserChoices[K]) => setUserChoicesState(prev => ({ ...prev, [key]: value })), []);
  const setUserChoices = useCallback((choices: UserChoices) => setUserChoicesState(choices), []);
  const setCourseBlueprint = useCallback((blueprint: CourseBlueprint | null) => setCourseBlueprintState(blueprint), []);
  const setAdaptiveTestState = useCallback((testStateUpdate: Partial<AdaptiveTestState>) => setAdaptiveTestInternalState(prev => ({ ...prev, ...testStateUpdate })), []);
  const resetAdaptiveTest = useCallback(() => setAdaptiveTestInternalState({ ...DEFAULT_ADAPTIVE_TEST_STATE }), []);
  const setCourseData = useCallback((data: CourseData | null) => {
    setCourseDataState(data);
    if (!data) setActiveLessonOrExerciseTitleState(undefined);
  }, []);
  const setLoading = useCallback((newIsLoading: boolean, message = '', progress = 0) => {
    setIsLoadingState(newIsLoading); setLoadingMessageState(message); setLoadingProgressState(progress);
  }, []);
  const setApiUnavailable = useCallback((isUnavailable: boolean) => setIsApiUnavailableState(isUnavailable), []);

  // --- Saved Courses Persistence & Logic ---
  const persistSavedCourses = useCallback((courses: StoredCourse[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SAVED_COURSES_KEY, JSON.stringify(courses));
      calculateGlobalStats(courses);
    } catch (error) { console.error("Error saving courses to localStorage:", error); alert("Error saving course data."); }
  }, [calculateGlobalStats]);

  const saveCourse = useCallback((courseToSave: CourseData) => {
    setSavedCoursesState(prev => {
      const existingIdx = prev.findIndex(sc => sc.id === courseToSave.id);
      const newStoredCourse: StoredCourse = {
        id: courseToSave.id, title: courseToSave.title, savedAt: Date.now(), chapterCount: courseToSave.chapters.length,
        course: { ...courseToSave, totalCourseXP: courseToSave.totalCourseXP || 0, totalCourseMinutes: courseToSave.totalCourseMinutes || 0, currentProgressXP: courseToSave.currentProgressXP || 0, currentProgressMinutes: courseToSave.currentProgressMinutes || 0, completedLessonCount: courseToSave.completedLessonCount || 0 },
      };
      const updated = existingIdx !== -1 ? [...prev.slice(0, existingIdx), newStoredCourse, ...prev.slice(existingIdx + 1)] : [...prev, newStoredCourse];
      persistSavedCourses(updated); return updated;
    });
  }, [persistSavedCourses]);

  const deleteCourse = useCallback((courseId: string) => {
    setSavedCoursesState(prev => { const updated = prev.filter(sc => sc.id !== courseId); persistSavedCourses(updated); return updated; });
  }, [persistSavedCourses]);

  const loadCourse = useCallback((courseId: string): boolean => {
    const course = savedCourses.find(sc => sc.id === courseId);
    if (course) { setCourseDataState(course.course); setCurrentView(View.COURSE); return true; }
    return false;
  }, [savedCourses]);

  const toggleLessonComplete = useCallback((courseId: string, chapterIndex: number, lessonIndex: number) => {
    setSavedCoursesState(prev => {
      const courseIdx = prev.findIndex(sc => sc.id === courseId);
      if (courseIdx === -1) return prev;
      const updatedCourses = [...prev];
      const targetStored = { ...updatedCourses[courseIdx] };
      const targetCourse = { ...targetStored.course };
      if (!targetCourse.chapters[chapterIndex]?.lessons[lessonIndex]) return prev;
      
      const lesson = { ...targetCourse.chapters[chapterIndex].lessons[lessonIndex] };
      lesson.isCompleted = !lesson.isCompleted;
      const xpChange = lesson.xpValue || 0; const durChange = lesson.estimatedDurationMinutes || 0;
      if (lesson.isCompleted) {
        targetCourse.currentProgressXP = (targetCourse.currentProgressXP || 0) + xpChange;
        targetCourse.currentProgressMinutes = (targetCourse.currentProgressMinutes || 0) + durChange;
        targetCourse.completedLessonCount = (targetCourse.completedLessonCount || 0) + 1;
      } else {
        targetCourse.currentProgressXP = Math.max(0, (targetCourse.currentProgressXP || 0) - xpChange);
        targetCourse.currentProgressMinutes = Math.max(0, (targetCourse.currentProgressMinutes || 0) - durChange);
        targetCourse.completedLessonCount = Math.max(0, (targetCourse.completedLessonCount || 0) - 1);
      }
      targetCourse.chapters = [...targetCourse.chapters];
      targetCourse.chapters[chapterIndex] = { ...targetCourse.chapters[chapterIndex] };
      targetCourse.chapters[chapterIndex].lessons = [...targetCourse.chapters[chapterIndex].lessons];
      targetCourse.chapters[chapterIndex].lessons[lessonIndex] = lesson;
      targetStored.course = targetCourse;
      updatedCourses[courseIdx] = targetStored;
      persistSavedCourses(updatedCourses);
      if (courseData?.id === courseId) setCourseDataState(targetCourse);
      return updatedCourses;
    });
  }, [persistSavedCourses, courseData]);

  const importCourses = useCallback(async (jsonData: string): Promise<{ success: boolean; message: string }> => {
    try {
      const data = JSON.parse(jsonData);
      if (!Array.isArray(data)) return { success: false, message: "Import file is not a valid array." };
      const valid: StoredCourse[] = [];
      data.forEach(item => { /* basic validation */ if (item?.id && item.course?.chapters) valid.push(item as StoredCourse); });
      setSavedCoursesState(prev => {
        const map = new Map(prev.map(sc => [sc.id, sc]));
        valid.forEach(imp => map.set(imp.id, imp));
        const updated = Array.from(map.values()); persistSavedCourses(updated); return updated;
      });
      return { success: true, message: `${valid.length} courses imported/updated.` };
    } catch (e) { return { success: false, message: `Import error: ${(e as Error).message}` }; }
  }, [persistSavedCourses]);

  const exportCourses = useCallback((): string | null => {
    try { return JSON.stringify(savedCourses, null, 2); } 
    catch (e) { alert("Error during export."); return null; }
  }, [savedCourses]);

  // --- Global Chat Widget Logic & Persistence ---
  const persistGlobalChatSessions = useCallback((sessions: GlobalChatSession[]) => {
    try { localStorage.setItem(LOCAL_STORAGE_GLOBAL_CHAT_SESSIONS_KEY, JSON.stringify(sessions)); } 
    catch (error) { console.error("Error saving chat sessions to localStorage:", error); }
  }, []);

  const createGlobalChatSession = useCallback((initialSystemInstruction: string, name?: string): string => {
    const newSessionId = Date.now().toString();
    const newSession: GlobalChatSession = {
      id: newSessionId,
      name: name || `Chat from ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      messages: [{ id: `ai-greeting-${newSessionId}`, sender: 'ai', text: "Hello! I'm Pathly AI. How can I help you with your learning today?", timestamp: Date.now() }],
      systemInstruction: initialSystemInstruction || AI_SYSTEM_INSTRUCTION_GLOBAL_ASSISTANT_BASE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setGlobalChatSessionsState(prev => { const updated = [...prev, newSession]; persistGlobalChatSessions(updated); return updated; });
    setActiveGlobalChatSessionIdState(newSessionId);
    return newSessionId;
  }, [persistGlobalChatSessions]);

  const appendMessageToActiveGlobalChatSession = useCallback((message: ChatMessage, newNameForSession?: string) => {
    setGlobalChatSessionsState(prev => {
      const activeId = activeGlobalChatSessionId;
      if (!activeId) return prev;
      const sessionIndex = prev.findIndex(s => s.id === activeId);
      if (sessionIndex === -1) return prev;
      
      const updatedSessions = [...prev];
      const sessionToUpdate = { ...updatedSessions[sessionIndex] };
      sessionToUpdate.messages = [...sessionToUpdate.messages, message];
      sessionToUpdate.updatedAt = Date.now();

      if (newNameForSession && sessionToUpdate.name.startsWith("Chat from")) { // Only update name if it's default and a new name is provided
        sessionToUpdate.name = newNameForSession;
      } else if (!newNameForSession && sessionToUpdate.name.startsWith("Chat from") && message.sender === 'user' && sessionToUpdate.messages.filter(m => m.sender === 'user').length === 1) {
        // Auto-name based on first user message if current name is default
        sessionToUpdate.name = message.text.substring(0, 30) + (message.text.length > 30 ? "..." : "");
      }

      updatedSessions[sessionIndex] = sessionToUpdate;
      persistGlobalChatSessions(updatedSessions);
      return updatedSessions;
    });
  }, [activeGlobalChatSessionId, persistGlobalChatSessions]);

  const loadGlobalChatSession = useCallback((sessionId: string) => {
    const sessionExists = globalChatSessions.some(s => s.id === sessionId);
    if (sessionExists) setActiveGlobalChatSessionIdState(sessionId);
    else console.warn(`Global chat session with ID ${sessionId} not found.`);
  }, [globalChatSessions]);

  const deleteGlobalChatSession = useCallback((sessionId: string) => {
    setGlobalChatSessionsState(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      persistGlobalChatSessions(updated);
      if (activeGlobalChatSessionId === sessionId) {
        setActiveGlobalChatSessionIdState(updated.length > 0 ? updated.sort((a,b) => b.updatedAt - a.updatedAt)[0].id : null);
      }
      return updated;
    });
  }, [activeGlobalChatSessionId, persistGlobalChatSessions]);
  
  const renameGlobalChatSession = useCallback((sessionId: string, newName: string) => {
    setGlobalChatSessionsState(prev => {
        const sessionIndex = prev.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) return prev;
        const updatedSessions = [...prev];
        updatedSessions[sessionIndex] = { ...updatedSessions[sessionIndex], name: newName, updatedAt: Date.now() };
        persistGlobalChatSessions(updatedSessions);
        return updatedSessions;
    });
  }, [persistGlobalChatSessions]);

  const getActiveGlobalChatSession = useCallback((): GlobalChatSession | undefined => {
    if (!activeGlobalChatSessionId) return undefined;
    return globalChatSessions.find(s => s.id === activeGlobalChatSessionId);
  }, [globalChatSessions, activeGlobalChatSessionId]);

  // --- App Lifecycle & General Actions ---
  const resetApp = useCallback(() => {
    setCurrentView(View.DASHBOARD); setUserChoicesState({ ...INITIAL_USER_CHOICES });
    setCourseBlueprintState(null); resetAdaptiveTest(); setCourseDataState(null);
    setLoading(false, '', 0); setIsApiUnavailableState(false); 
    setIsChatWidgetOpenState(false); setActiveLessonOrExerciseTitleState(undefined);
    // Do not clear globalChatSessions or activeGlobalChatSessionId on app reset,
    // as users might want to keep their chat history across general app resets.
    // If a full chat clear is needed, it would be a separate action.
  }, [resetAdaptiveTest, setLoading]);

  const toggleChatWidget = useCallback(() => setIsChatWidgetOpenState(prev => !prev), []);
  const setActiveLessonOrExerciseTitle = useCallback((title?: string) => setActiveLessonOrExerciseTitleState(title), []);

  return (
    <AppContext.Provider value={{
      currentView, setCurrentView, theme, setTheme, userChoices, updateUserChoice, setUserChoices,
      courseBlueprint, setCourseBlueprint, adaptiveTest, setAdaptiveTestState, resetAdaptiveTest,
      courseData, setCourseData, isLoading, loadingMessage, loadingProgress, setLoading,
      isApiUnavailable, setApiUnavailable, savedCourses, saveCourse, deleteCourse, loadCourse,
      globalTotalXP, globalTotalLearningMinutes, toggleLessonComplete, importCourses, exportCourses, 
      isChatWidgetOpen, toggleChatWidget, activeLessonOrExerciseTitle, setActiveLessonOrExerciseTitle,
      globalChatSessions, activeGlobalChatSessionId, 
      createGlobalChatSession, appendMessageToActiveGlobalChatSession, loadGlobalChatSession, deleteGlobalChatSession, renameGlobalChatSession, getActiveGlobalChatSession,
      resetApp,
    }}>
      {children}
    </AppContext.Provider>
  );
};