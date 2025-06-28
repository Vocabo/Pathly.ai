

export enum View {
  LANDING = 'LANDING',
  CONFIGURATOR = 'CONFIGURATOR',
  CONFIRMATION = 'CONFIRMATION',
  TEST = 'TEST',
  LOADING = 'LOADING',
  COURSE = 'COURSE',
  DASHBOARD = 'DASHBOARD',
  MY_COURSES = 'MY_COURSES',
  SETTINGS = 'SETTINGS', // Added SETTINGS view
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export interface UserChoices {
  topic?: string;
  goal?: string;
  level?: string;
  commitment?: string;
  duration?: string;
  style?: string;
  finalTitle?: string;
  finalDescription?: string;
  finalObjectives?: string[];
  testTaken?: string; // Summary of test results or "not taken"
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string; 
  rawText?: string; 
  timestamp?: number;
  isError?: boolean; 
  isLoading?: boolean; 
  isBetaNote?: boolean; 
  betaNoteDetails?: { 
    calculatedHours: number;
    limitExceeded: boolean;
    userGoal: string;
    userDuration: string;
    userCommitment: string;
  };
  isInitialConfiguratorWarning?: boolean; // For the special warning in ConfiguratorView
}

export interface CourseBlueprint {
  title: string;
  description: string;
  objectives: string[];
}

export interface TestQuestion {
  question: string;
  options: string[];
  correct: number; // 0-based index
  topic: string;
}

export interface TestAnswer {
  question: TestQuestion;
  answer?: number; 
  action: 'submit' | 'skip' | 'unknown';
}

export interface AdaptiveTestState {
  isActive: boolean;
  questionCount: number;
  currentIndex: number;
  currentQuestion: TestQuestion | null;
  history: TestAnswer[];
  difficulty: number; // Range 1-10
  knowledgeMap: {
    strengths: string[];
    weaknesses: string[];
  };
}

export interface CourseLesson {
  title: string;
  content: string; // HTML content
  xpValue: number; // XP gained for completing this lesson
  estimatedDurationMinutes: number; // Estimated time in minutes
  isCompleted: boolean; // Tracks completion status
  suggestedSearchTerms?: string[]; // Terms for finding external resources
}

export interface CourseExercise {
  title: string;
  task: string; // HTML content
  solution: string; // HTML content
}

export interface CourseChapter {
  title: string;
  introduction: string; // HTML content
  lessons: CourseLesson[];
  exercise?: CourseExercise | null;
}

export interface CourseData {
  id: string; // Unique ID for the course instance
  title: string;
  chapters: CourseChapter[];
  // Progress tracking for this specific course instance
  totalCourseXP: number; // Sum of all lesson XP in this course
  totalCourseMinutes: number; // Sum of all lesson durations in this course
  currentProgressXP: number; // XP earned from completed lessons in this course
  currentProgressMinutes: number; // Time from completed lessons in this course
  completedLessonCount: number; // Number of completed lessons in this course
}

export interface StoredCourse {
  id: string; // Matches CourseData.id
  title: string;
  savedAt: number; // Timestamp
  chapterCount: number;
  course: CourseData; // The full course data, including progress
}

// For Global AI Chat Widget with History
export interface GlobalChatSession {
  id: string; // Unique ID for the session (e.g., timestamp)
  name: string; // User-defined or auto-generated name (e.g., first user message)
  messages: ChatMessage[];
  systemInstruction: string; // The system instruction active for this chat session
  createdAt: number; // Timestamp of creation
  updatedAt: number; // Timestamp of last message or update
}


// Context state
export interface AppState {
  currentView: View;
  theme: Theme;
  userChoices: UserChoices;
  courseBlueprint: CourseBlueprint | null;
  adaptiveTest: AdaptiveTestState;
  courseData: CourseData | null; // The currently active/viewed course
  isLoading: boolean; 
  loadingMessage: string;
  loadingProgress: number;
  isApiUnavailable: boolean; 
  savedCourses: StoredCourse[]; 
  // Global statistics derived from savedCourses
  globalTotalXP: number;
  globalTotalLearningMinutes: number;
  
  // State for the global chat widget
  isChatWidgetOpen: boolean;
  activeLessonOrExerciseTitle?: string; // For global chat context
  globalChatSessions: GlobalChatSession[]; // All saved chat sessions
  activeGlobalChatSessionId: string | null; // ID of the currently active/viewed global chat
}

// Context actions
export interface AppActions {
  setCurrentView: (view: View) => void;
  setTheme: (theme: Theme) => void;
  updateUserChoice: <K extends keyof UserChoices>(key: K, value: UserChoices[K]) => void;
  setUserChoices: (choices: UserChoices) => void;
  setCourseBlueprint: (blueprint: CourseBlueprint | null) => void;
  setAdaptiveTestState: (testState: Partial<AdaptiveTestState>) => void;
  resetAdaptiveTest: () => void;
  setCourseData: (data: CourseData | null) => void;
  setLoading: (isLoading: boolean, message?: string, progress?: number) => void;
  setApiUnavailable: (isUnavailable: boolean) => void;
  resetApp: () => void;
  
  saveCourse: (courseToSave: CourseData) => void;
  deleteCourse: (courseId: string) => void;
  loadCourse: (courseId: string) => boolean;
  
  toggleLessonComplete: (courseId: string, chapterIndex: number, lessonIndex: number) => void;
  importCourses: (jsonData: string) => Promise<{ success: boolean; message: string }>;
  exportCourses: () => string | null;

  // Actions for the global chat widget
  toggleChatWidget: () => void;
  setActiveLessonOrExerciseTitle: (title?: string) => void;

  // Actions for managing global chat sessions
  createGlobalChatSession: (initialSystemInstruction: string, name?: string) => string; // Returns new session ID
  appendMessageToActiveGlobalChatSession: (message: ChatMessage, newNameForSession?: string) => void;
  loadGlobalChatSession: (sessionId: string) => void;
  deleteGlobalChatSession: (sessionId: string) => void;
  renameGlobalChatSession: (sessionId: string, newName: string) => void;
  getActiveGlobalChatSession: () => GlobalChatSession | undefined;
}

export interface AppContextType extends AppState, AppActions {}

// Specific to Gemini responses
export interface GeminiError {
  code: number;
  message: string;
  status: string;
}
export interface GeminiContentResponse<T> {
  data?: T;
  error?: string | GeminiError; 
}

// For Blueprint Feasibility Check
export interface BlueprintFeasibilityResponse {
  feasibility: "feasible" | "too_ambitious" | "too_little_content";
  suggestion?: string; 
  refined_chapter_count?: number; 
}

// For Blueprint Quality Check
export interface BlueprintQualityResponse {
  quality_check: "looks_good" | "needs_revision";
  suggestions?: string; 
}