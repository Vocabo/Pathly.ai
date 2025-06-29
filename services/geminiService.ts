

import { GoogleGenAI, GenerateContentResponse, Part, Chat } from "@google/genai";
import { CourseBlueprint, TestQuestion, CourseChapter, UserChoices, GeminiContentResponse, ChatMessage, BlueprintFeasibilityResponse, BlueprintQualityResponse, CourseLesson, View, AppContextType } from '../types';
import { 
    GEMINI_TEXT_MODEL, 
    AI_SYSTEM_INSTRUCTION_COURSE_DESIGN, 
    AI_SYSTEM_INSTRUCTION_QUIZ_MASTER, 
    AI_SYSTEM_INSTRUCTION_CONTENT_GENERATOR, 
    MIN_API_CALL_DELAY_MS, 
    AI_SYSTEM_INSTRUCTION_CONFIGURATOR_CHAT, 
    AI_SYSTEM_INSTRUCTION_BLUEPRINT_FEASIBILITY_CHECK, 
    AI_SYSTEM_INSTRUCTION_BLUEPRINT_QUALITY_CHECK,
    AI_SYSTEM_INSTRUCTION_GLOBAL_ASSISTANT_BASE,
    AI_SYSTEM_INSTRUCTION_GLOBAL_ASSISTANT_COURSE_CONTEXT
} from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "DISABLED_FALLBACK" }); 

function parseJsonFromText<T>(text: string): GeminiContentResponse<T> {
  let jsonStr = text.trim();
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[1]) {
    jsonStr = match[1].trim();
  }

  // eslint-disable-next-line no-control-regex
  jsonStr = jsonStr.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  try {
    const parsedData = JSON.parse(jsonStr) as T;
    if (typeof parsedData === 'object' && parsedData !== null && 'lessons' in parsedData && Array.isArray((parsedData as any).lessons)) {
      (parsedData as any).lessons = (parsedData as any).lessons.map((lesson: any) => ({
        ...lesson,
        xpValue: typeof lesson.xpValue === 'number' ? lesson.xpValue : 0,
        estimatedDurationMinutes: typeof lesson.estimatedDurationMinutes === 'number' ? lesson.estimatedDurationMinutes : 0,
        isCompleted: typeof lesson.isCompleted === 'boolean' ? lesson.isCompleted : false,
        suggestedSearchTerms: Array.isArray(lesson.suggestedSearchTerms) ? lesson.suggestedSearchTerms.filter((term:any) => typeof term === 'string') : [],
      }));
    }
    return { data: parsedData };
  } catch (error) {
    console.error("Failed to parse JSON response:", (error as Error).message, "Original text (sanitized preview):", jsonStr.substring(0,1000));
    return { error: `JSON parsing error: ${(error as Error).message}. Original text (preview): ${jsonStr.substring(0,500)}...` };
  }
}

async function generateWithRetry<T>(
  generateFn: () => Promise<GenerateContentResponse>,
  isJsonResponse: boolean,
  maxRetries = 2, 
  baseDelay = MIN_API_CALL_DELAY_MS 
): Promise<GeminiContentResponse<T>> {
  if (!API_KEY) {
     return { error: "API key not configured. AI functions are disabled." };
  }

  let attempts = 0;
  while (attempts <= maxRetries) { 
    try {
      const response = await generateFn();
      const responseText = response.text;

      if (!responseText && isJsonResponse) { 
        throw new Error("No text in Gemini response for expected JSON.");
      }
      
      if (isJsonResponse) {
        if (!responseText) throw new Error("No text in Gemini response for JSON request.");
        return parseJsonFromText<T>(responseText);
      }
      return { data: responseText as unknown as T };

    } catch (error) {
      attempts++;
      const err = error as Error & { response?: { status?: number, data?: any } }; 
      console.error(`Gemini API call attempt ${attempts} of ${maxRetries + 1} failed:`, err.message, err.response?.data);
      
      if (err.message.includes("SAFETY")) { 
         return { error: "The response was blocked due to safety policies. Please rephrase your request."};
      }
      if (err.message.includes("429") || (err.response && err.response.status === 429) ) {
        console.warn("Rate limit hit, retrying with longer delay...");
        const delay = baseDelay * Math.pow(2, attempts) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        if (attempts > maxRetries) { 
            return { error: `API rate limit reached after ${attempts} attempts. Please try again later. (${err.message})` };
        }
        continue; 
      }

      if (attempts > maxRetries) {
        let finalErrorMessage = `API call failed after ${attempts} attempts: ${err.message}`;
        if (err.message.toLowerCase().includes("xhr error") || 
            err.message.toLowerCase().includes("network_error") || 
            err.message.toLowerCase().includes("unknown") || 
            (err.response?.status && err.response.status >= 500) ) {
           finalErrorMessage = `Error connecting to the AI service (Status: ${err.response?.status || 'Unknown'}, Message: ${err.message}).
Possible causes:
1. Network issues (firewall, proxy, internet connection).
2. Invalid or misconfigured API key. This must be correctly set as an environment variable \`API_KEY\` (from \`process.env.API_KEY\`) in the application's execution environment.
3. Problem with the Google Cloud project (Gemini API not enabled, billing issues).
4. Temporary issue with the AI service.
Please check these points and try again later.`;
        }
        return { error: finalErrorMessage };
      }
      const delay = baseDelay * Math.pow(2, attempts -1); 
      await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 500));
    }
  }
  return { error: `API call failed permanently after ${attempts} attempts. Check the console for details.` };
}


export const initializeChat = (): Chat | null => {
  if (!API_KEY) {
    console.error("Cannot initialize chat: API_KEY not set.");
    return null;
  }
  try {
    return ai.chats.create({
      model: GEMINI_TEXT_MODEL,
      config: {
        systemInstruction: AI_SYSTEM_INSTRUCTION_CONFIGURATOR_CHAT,
        temperature: 0.7, 
      },
    });
  } catch (error) {
    console.error("Error initializing Gemini chat:", error);
    return null;
  }
};

export const streamChatResponse = async (
  chat: Chat,
  userMessage: string,
  history: ChatMessage[] 
): Promise<AsyncIterable<GenerateContentResponse> | { error: string }> => {
  if (!API_KEY) {
    return { error: "API key not configured." };
  }
  try {
    const stream = await chat.sendMessageStream({ message: userMessage });
    return stream;
  } catch (error) {
    console.error("Error sending message stream to Gemini:", error);
    const err = error as Error & { response?: { data?: any } };
    if (err.message.includes("SAFETY")) {
      return { error: "The response was blocked due to safety policies. Please rephrase your request."};
    }
    let errorMessage = `Error sending message: ${err.message}`;
    if (err.message.toLowerCase().includes("xhr error") || err.message.toLowerCase().includes("network_error")) {
        errorMessage += " Possibly a network issue. Please check your connection."
    }
    return { error: errorMessage };
  }
};

export const initializeGlobalChat = (systemInstruction: string): Chat | null => {
    if (!API_KEY) {
      console.error("Cannot initialize global chat: API_KEY not set.");
      return null;
    }

    try {
        return ai.chats.create({
            model: GEMINI_TEXT_MODEL,
            config: {
                systemInstruction: systemInstruction || AI_SYSTEM_INSTRUCTION_GLOBAL_ASSISTANT_BASE,
                temperature: 0.6, 
            },
        });
    } catch (error) {
        console.error("Error initializing global Gemini chat:", error);
        return null;
    }
};

export const streamGlobalChatResponse = async (
    chat: Chat,
    userMessage: string
): Promise<AsyncIterable<GenerateContentResponse> | { error: string }> => {
    if (!API_KEY) {
        return { error: "API key not configured." };
    }
    try {
        const stream = await chat.sendMessageStream({ message: userMessage });
        return stream;
    } catch (error) {
        console.error("Error sending message stream to Global Gemini Chat:", error);
        const err = error as Error & { response?: { data?: any } };
        if (err.message.includes("SAFETY")) {
            return { error: "The response was blocked due to safety policies." };
        }
        let errorMessage = `Error sending message: ${err.message}`;
        if (err.message.toLowerCase().includes("xhr error") || err.message.toLowerCase().includes("network_error")) {
            errorMessage += " Possibly a network issue.";
        }
        return { error: errorMessage };
    }
};


export const generateCourseBlueprint = async (choices: UserChoices, existingBlueprintSuggestion?: string): Promise<GeminiContentResponse<CourseBlueprint>> => {
  let prompt = `Based on these user preferences: Topic "${choices.topic}", Goal "${choices.goal}", Level "${choices.level}", Time commitment "${choices.commitment}", Duration "${choices.duration}" and Learning style "${choices.style}", create a JSON object. The object should have the following keys: "title" (a catchy, motivating course title), "description" (a 2-3 sentence engaging description of the course), and "objectives" (an array of 3-5 concrete learning objectives as strings).`;

  if (existingBlueprintSuggestion) {
    prompt = `A previous attempt to create a course blueprint needed adjustment. User preferences: Topic "${choices.topic}", Goal "${choices.goal}", Level "${choices.level}", Time commitment "${choices.commitment}", Duration "${choices.duration}" and Learning style "${choices.style}". ${existingBlueprintSuggestion} Please create a new, adjusted course blueprint as a JSON object with "title", "description", and "objectives" (array of strings).`;
  }
  
  return generateWithRetry<CourseBlueprint>(
    () => ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: AI_SYSTEM_INSTRUCTION_COURSE_DESIGN,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    }),
    true
  );
};

export const checkBlueprintFeasibility = async (
  blueprint: CourseBlueprint, 
  userChoices: UserChoices
): Promise<GeminiContentResponse<BlueprintFeasibilityResponse>> => {
  const numObjectives = blueprint.objectives.length;
  const prompt = `Assess the feasibility of this course blueprint:
    Topic: "${userChoices.topic}"
    Goal: "${userChoices.goal}"
    Planned weekly time commitment: "${userChoices.commitment}"
    Planned course duration: "${userChoices.duration}"
    Number of main learning objectives/chapters in the blueprint: ${numObjectives}.
    Return your assessment as a JSON object containing "feasibility" ("feasible", "too_ambitious", "too_little_content"), optionally "suggestion", and optionally "refined_chapter_count".`;

  return generateWithRetry<BlueprintFeasibilityResponse>(
    () => ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: AI_SYSTEM_INSTRUCTION_BLUEPRINT_FEASIBILITY_CHECK,
        responseMimeType: "application/json",
        temperature: 0.3, 
      },
    }),
    true
  );
};


export const generateTestQuestion = async (
  topic: string,
  level: string,
  difficulty: number,
  strengths: string[],
  weaknesses: string[],
  previousQuestions: { question: string; topic: string }[]
): Promise<GeminiContentResponse<TestQuestion>> => {
  const previousQuestionsText = previousQuestions.map(h => `- "${h.question}" (Topic: ${h.topic})`).join('\\n');
  const prompt = `Create ONE multiple-choice question. Follow the ADAPTIVE LOGIC and TOPIC SELECTION rules EXACTLY.
    Overall Topic: ${topic}
    User's Target Level: ${level}
    Current Difficulty (1-10, 1=easy, 10=hard): ${difficulty}
    
    ADAPTIVE LOGIC & TOPIC SELECTION (VERY IMPORTANT):
    - WEAKNESSES (User answered "I don't know"): [${weaknesses.join(', ') || 'None'}]. AVOID these topics or ask a VERY EASY question about them.
    - STRENGTHS (User knew or skipped): [${strengths.join(', ') || 'None'}]. AVOID these topics or ask a SIGNIFICANTLY HARDER/MORE NUANCED question.
    - PREVIOUSLY ASKED QUESTIONS (do not repeat!):\n${previousQuestionsText || 'None'}

    OUTPUT FORMAT (JSON ONLY, EXTREMELY IMPORTANT):
    Return ONLY a SINGLE, VALID JSON object. THERE MUST BE NO TEXT OUTSIDE THE JSON OBJECT.
    The object must have exactly these keys:
    - "question": (string) The question.
    - "options": (array of EXACTLY 4 strings) The answer choices. PAY ATTENTION TO CORRECT JSON ARRAY FORMATTING (commas, no trailing commas).
    - "correct": (integer) The 0-based index of the correct answer.
    - "topic": (string) A VERY SPECIFIC keyword for THIS question's topic (e.g., "Java Scanner Class", "CSS Flexbox Alignment", NOT "Java" or "CSS"). This is CRITICAL for the adaptive logic.`;

  return generateWithRetry<TestQuestion>(
    () => ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: AI_SYSTEM_INSTRUCTION_QUIZ_MASTER,
        responseMimeType: "application/json",
        temperature: 0.5, 
      },
    }),
    true
  );
};

export const checkBlueprintQuality = async (
  blueprint: CourseBlueprint,
  userChoices: UserChoices,
  numPlannedChapters: number
): Promise<GeminiContentResponse<BlueprintQualityResponse>> => {
  const prompt = `Assess the quality of this final course blueprint:
    Course Title: "${blueprint.title}"
    Description: "${blueprint.description}"
    Learning Objectives: ${JSON.stringify(blueprint.objectives)}
    Planned number of chapters: ${numPlannedChapters}
    User preferences: Time commitment "${userChoices.commitment}", Duration "${userChoices.duration}", Level "${userChoices.level}".
    Return your assessment as a JSON object containing "quality_check" ("looks_good", "needs_revision") and optionally "suggestions".`;

  return generateWithRetry<BlueprintQualityResponse>(
    () => ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: AI_SYSTEM_INSTRUCTION_BLUEPRINT_QUALITY_CHECK,
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    }),
    true
  );
};

export const generateChapterTitles = async (
  courseTitle: string,
  userLevel: string,
  userStyle: string,
  testTakenSummary: string | undefined,
  numChapters: number,
  qualitySuggestions?: string
): Promise<GeminiContentResponse<string[]>> => {
  let prompt = `Create an outline with exactly ${numChapters} chapter titles for an online course.
    Title: "${courseTitle}"
    User profile: Level: ${userLevel}, Learning style: ${userStyle}.
    ${testTakenSummary ? `Adaptive Test Results: ${testTakenSummary}\nStrongly consider these results when selecting and weighting topics!` : ''}
    ${qualitySuggestions ? `IMPORTANT NOTE FROM QUALITY ASSURANCE: "${qualitySuggestions}" Please consider this note when creating the chapter titles.` : ''}
    The chapters must build on each other logically.
    Return ONLY a JSON array of strings, where each string is a chapter title. Example: ["Introduction to XYZ", "Fundamentals", "Advanced Techniques"]`;
  
  const result = await generateWithRetry<string[] | string>( 
    () => ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: AI_SYSTEM_INSTRUCTION_COURSE_DESIGN,
        responseMimeType: "application/json",
        temperature: 0.6,
      },
    }),
    true
  );

  if (result.data && typeof result.data === 'string') {
     try {
        const parsed = JSON.parse(result.data);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
            return { data: parsed };
        }
     } catch (e) {
        console.warn("generateChapterTitles: JSON.parse failed for string data, using original error.", e);
     }
  } else if (result.data && Array.isArray(result.data) && result.data.every(item => typeof item === 'string')) {
    return { data: result.data as string[] };
  }
  
  if (result.error) return { error: result.error };
  return { error: "Generated chapter titles are not in the expected array format or could not be parsed." };
};


export const generateChapterContent = async (
  courseTitle: string,
  chapterTitle: string,
  userLevel: string,
  userStyle: string,
  testTakenSummary: string | undefined,
  numLessons: number,
  detailLevel: string,
  qualitySuggestions?: string,
  retryContext?: { attempt: number; previousError?: string; }
): Promise<GeminiContentResponse<Omit<CourseChapter, 'title' | 'lessons'> & { lessons: Omit<CourseLesson, 'isCompleted'>[] }>> => { 
  let prompt = `Create the content for the chapter "${chapterTitle}" of the course "${courseTitle}".
    User profile & Context: Level "${userLevel}", Learning style "${userStyle}".
    ${testTakenSummary ? `Adaptive Test Results: ${testTakenSummary}\nAdapt the content accordingly. Explain concepts from the "weaknesses" particularly thoroughly. Be more concise on the "strengths".` : ''}
    ${qualitySuggestions ? `IMPORTANT NOTE FROM QUALITY ASSURANCE: "${qualitySuggestions}" Please consider this note when creating the chapter content.` : ''}
    ${retryContext && retryContext.attempt > 0 ? `This is attempt ${retryContext.attempt + 1}. The previous attempt failed${retryContext.previousError ? ` with error: '${retryContext.previousError.substring(0,150)}...'` : ''}. Please pay EXTREME attention to correct JSON format and HTML escaping (e.g., newlines as \\\\n, quotes as \\\\").` : ''}

    MOST IMPORTANT INSTRUCTIONS:
    The content of this chapter should be ${detailLevel}.
    Create exactly ${numLessons} lessons for this chapter.

    ABSOLUTE RULES FOR HTML & TITLES:
    - Start the HTML content for "introduction", "lessons[].content", "exercise.task", "exercise.solution" DIRECTLY with the relevant content (e.g., <p>This is the introduction...</p> or <h3>An important aspect</h3>...).
    - **DO NOT USE <h1> or <h2> tags for the title of the chapter, lesson, or exercise itself in the generated HTML. The app adds these titles externally. Use <h3> and <h4> for sub-sections within the content.**
    
    FORMAT: Respond as a valid JSON object with the keys:
    "introduction": (HTML text) An introduction to the chapter.
    "lessons": (Array of objects, each with "title" [string], "content" [HTML text], "xpValue" [integer, e.g., 10], "estimatedDurationMinutes" [integer, e.g., 15, realistic for your generated text], and "suggestedSearchTerms" [Array of 2-3 concise strings for Google searches on this lesson's topic]). The ${numLessons} lessons.
    "exercise": (Object with "title" [string], "task" [HTML text task], and "solution" [HTML text solution]) A suitable exercise for the chapter. If no exercise is appropriate, this key can be null or the entire "exercise" object can be null.`;

  return generateWithRetry<Omit<CourseChapter, 'title' | 'lessons'> & { lessons: Omit<CourseLesson, 'isCompleted'>[] }>(
    () => ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: AI_SYSTEM_INSTRUCTION_CONTENT_GENERATOR,
        responseMimeType: "application/json",
        temperature: 0.75, 
      },
    }),
    true
  );
};