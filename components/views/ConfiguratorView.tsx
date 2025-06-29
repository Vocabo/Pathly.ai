
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { View, ChatMessage as ChatMessageType, UserChoices, CourseBlueprint } from '../../types';
import { ChatMessageItem } from '../chat/ChatMessageItem';
import { ChatInputArea } from '../chat/ChatInputArea';
import { GlassCard } from '../common/GlassCard';
import { generateCourseBlueprint, initializeChat, streamChatResponse } from '../../services/geminiService';
import type { Chat, GenerateContentResponse } from '@google/genai'; 
import { CHAT_COMPLETION_SIGNAL } from '../../constants';
import { parseCommitmentToAvgHours, parseDurationToTotalDays } from '../../utils/parsingUtils'; 

const PRE_BETA_HOUR_LIMIT = 25; 

export const ConfiguratorView: React.FC = () => {
  const { 
    setCurrentView, 
    userChoices, // Get current userChoices to check progress
    updateUserChoice, // To store partial choices
    setUserChoices, 
    setCourseBlueprint, 
    setLoading, 
    isApiUnavailable, 
    setApiUnavailable,
    resetApp,
  } = useAppContext();
  
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isWaitingForAIResponse, setIsWaitingForAIResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiThinkingMessageIdRef = useRef<string | null>(null);
  const [finalChoicesFromAI, setFinalChoicesFromAI] = useState<UserChoices | null>(null);
  const [isAIExpectedToAskForDuration, setIsAIExpectedToAskForDuration] = useState(false);
  const [intermediateUserChoices, setIntermediateUserChoices] = useState<Partial<UserChoices>>({});


  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages]); 

  useEffect(() => {
    const init = async () => {
      const session = initializeChat();
      if (session) {
        setChatSession(session);
        setApiUnavailable(false);
        const initialMessages: ChatMessageType[] = [
          {
            id: 'ai-greeting-' + Date.now(),
            sender: 'ai',
            text: "Hello! I'm Pathly, your AI mentor. I'm excited to create a custom-tailored learning path with you! What exciting topic or skill would you like to master?",
            rawText: "Hello! I'm Pathly, your AI mentor. I'm excited to create a custom-tailored learning path with you! What exciting topic or skill would you like to master?",
            timestamp: Date.now(),
          },
          {
            id: 'configurator-initial-warning-' + Date.now(),
            sender: 'ai',
            text: "Important Note (Pre-Beta): Pathly is in an early development phase. For the best experience, courses are currently optimal when they are not significantly longer than about 25 hours in total. Please consider this when specifying the total duration of your course.",
            isInitialConfiguratorWarning: true,
            timestamp: Date.now(),
          }
        ];
        setMessages(initialMessages);
      } else {
        setApiUnavailable(true);
        setMessages([{
          id: 'error-init-' + Date.now(),
          sender: 'ai',
          text: "Sorry, I can't connect to the AI service right now. Please check your API key configuration or try again later.",
          rawText: "Sorry, I can't connect to the AI service right now. Please check your API key configuration or try again later.",
          isError: true,
          timestamp: Date.now()
        }]);
      }
    };
    init();
    setIntermediateUserChoices({}); // Reset intermediate choices on mount
  }, [setApiUnavailable]);

  const addOrUpdateMessage = (
    messageData: ChatMessageType | string,
    sender: 'ai' | 'user' = 'ai',
    options: { isError?: boolean; isLoading?: boolean; idToUpdate?: string; isBetaNote?: boolean; betaNoteDetails?: ChatMessageType['betaNoteDetails']; isInitialConfiguratorWarning?: boolean } = {}
  ) => {
    const { isError = false, isLoading = false, idToUpdate, isBetaNote = false, betaNoteDetails, isInitialConfiguratorWarning = false } = options;
    let newMessage: ChatMessageType;
    let messageId: string;

    if (typeof messageData === 'string') {
      messageId = idToUpdate || `${sender}-${Date.now()}`;
      newMessage = {
        id: messageId,
        sender,
        text: messageData,
        rawText: messageData,
        isError,
        isLoading,
        isBetaNote,
        betaNoteDetails,
        isInitialConfiguratorWarning,
        timestamp: Date.now(),
      };
    } else {
      messageId = messageData.id;
      newMessage = { ...messageData, isError, isLoading, isBetaNote, betaNoteDetails, isInitialConfiguratorWarning };
       if (isLoading !== undefined) newMessage.isLoading = isLoading;
       if (isError !== undefined) newMessage.isError = isError;
       if (isBetaNote !== undefined) newMessage.isBetaNote = isBetaNote;
       if (betaNoteDetails !== undefined) newMessage.betaNoteDetails = betaNoteDetails;
       if (isInitialConfiguratorWarning !== undefined) newMessage.isInitialConfiguratorWarning = isInitialConfiguratorWarning;
    }
    
    if (newMessage.isLoading && newMessage.sender === 'ai' && !newMessage.isBetaNote && !newMessage.isInitialConfiguratorWarning) {
      aiThinkingMessageIdRef.current = messageId;
    } else if (aiThinkingMessageIdRef.current === messageId && !newMessage.isLoading) {
      aiThinkingMessageIdRef.current = null;
    }

    setMessages(prevMessages => {
      let filteredMessages = prevMessages;
      if (aiThinkingMessageIdRef.current && aiThinkingMessageIdRef.current !== messageId) {
        // Remove previous thinking indicator if a new message (not an update to thinking) is coming
        filteredMessages = prevMessages.filter(m => m.id !== aiThinkingMessageIdRef.current || !m.isLoading);
      }
      
      const existingMsgIndex = filteredMessages.findIndex(m => m.id === messageId);
      if (existingMsgIndex !== -1) {
        const updatedMessages = [...filteredMessages];
        updatedMessages[existingMsgIndex] = newMessage;
        return updatedMessages;
      } else {
        return [...filteredMessages, newMessage];
      }
    });
    return messageId;
  };

  // Helper to determine if the AI is asking for a specific piece of information
  const isAIAskingFor = (text: string, field: keyof UserChoices): boolean => {
    const lowerText = text.toLowerCase();
    switch (field) {
        case 'goal': return lowerText.includes("goal") || lowerText.includes("achieve") || lowerText.includes("be able to do");
        case 'level': return lowerText.includes("knowledge") || lowerText.includes("level") || lowerText.includes("rate yourself") || lowerText.includes("prior experience");
        case 'commitment': return lowerText.includes("time per week") || lowerText.includes("hours per week") || lowerText.includes("commitment");
        case 'duration': return lowerText.includes("total duration") || lowerText.includes("how long") || lowerText.includes("sprint") || lowerText.includes("deep-dive");
        case 'style': return lowerText.includes("learn best") || lowerText.includes("projects") || lowerText.includes("theoretical") || lowerText.includes("visual");
        default: return false;
    }
  };


  const handleUserInput = async (userInput: string) => {
    if (isApiUnavailable) return;
    
    const lastAiMessage = messages.filter(m => m.sender === 'ai' && !m.isBetaNote && !m.isLoading && !m.isError && !m.isInitialConfiguratorWarning).pop();
    if (lastAiMessage) {
        if (isAIAskingFor(lastAiMessage.text, 'topic') || messages.filter(m => m.sender === 'user').length === 0) setIntermediateUserChoices(prev => ({ ...prev, topic: userInput }));
        else if (isAIAskingFor(lastAiMessage.text, 'goal')) setIntermediateUserChoices(prev => ({ ...prev, goal: userInput }));
        else if (isAIAskingFor(lastAiMessage.text, 'level')) setIntermediateUserChoices(prev => ({ ...prev, level: userInput }));
        else if (isAIAskingFor(lastAiMessage.text, 'commitment')) {
             setIntermediateUserChoices(prev => ({ ...prev, commitment: userInput }));
             setIsAIExpectedToAskForDuration(true);
        } else if (isAIAskingFor(lastAiMessage.text, 'duration')) setIntermediateUserChoices(prev => ({ ...prev, duration: userInput }));
        else if (isAIAskingFor(lastAiMessage.text, 'style')) setIntermediateUserChoices(prev => ({ ...prev, style: userInput }));
    }


    if (finalChoicesFromAI) {
      const affirmativeResponses = ["ja", "yes", "ok", "yep", "sure", "sounds good", "right", "correct", "looks good", "exactly"];
      if (affirmativeResponses.includes(userInput.toLowerCase().trim().replace(/[.,!?;]/g, ''))) {
        addOrUpdateMessage(userInput, 'user');
        setUserChoices(finalChoicesFromAI);
        const tempChoices = finalChoicesFromAI;
        setFinalChoicesFromAI(null); 
        setIsWaitingForAIResponse(false);
        createInitialBlueprint(tempChoices);
        return; 
      } else {
        addOrUpdateMessage(userInput, 'user');
        setFinalChoicesFromAI(null); 
      }
    } else {
        addOrUpdateMessage(userInput, 'user');
    }
    
    if (!chatSession || isWaitingForAIResponse ) return;

    setIsWaitingForAIResponse(true);
    const thinkingMsgId = addOrUpdateMessage("Pathly is thinking...", 'ai', { isLoading: true });

    let accumulatedText = '';
    let streamErrorOccurred = false;

    try {
      const streamResult = await streamChatResponse(chatSession, userInput, messages);

      if ('error' in streamResult) {
        addOrUpdateMessage(streamResult.error, 'ai', { isError: true, isLoading: false, idToUpdate: thinkingMsgId });
        streamErrorOccurred = true;
        setIsWaitingForAIResponse(false);
        return;
      }
      
      for await (const chunk of streamResult) { 
        const chunkText = chunk.text;
        if (chunkText) {
          accumulatedText += chunkText;
           addOrUpdateMessage(accumulatedText, 'ai', { isLoading: true, idToUpdate: thinkingMsgId});
        }
      }
    } catch (error) {
       console.error("Streaming error:", error);
       addOrUpdateMessage(`An error occurred during streaming: ${(error as Error).message}`, 'ai', {isError: true, isLoading: false, idToUpdate: thinkingMsgId});
       streamErrorOccurred = true;
    } 
    
    setIsWaitingForAIResponse(false); 
    aiThinkingMessageIdRef.current = null; 
    
    if (streamErrorOccurred) {
        addOrUpdateMessage(accumulatedText || "Error processing the response.", 'ai', { isError: true, isLoading: false, idToUpdate: thinkingMsgId });
        return;
    }
    
    if (isAIExpectedToAskForDuration && isAIAskingFor(accumulatedText, 'duration')) {
        // The specific initial warning is already shown. No need to repeat it here.
        // We could add a different, shorter reminder if needed, but the user requested the main warning at the very start.
        setIsAIExpectedToAskForDuration(false); // Reset flag
    }


    const isCompletionSignalPresent = accumulatedText.includes(CHAT_COMPLETION_SIGNAL);

    if (isCompletionSignalPresent) {
        let conversationalPart = accumulatedText;
        const signalIndex = accumulatedText.indexOf(CHAT_COMPLETION_SIGNAL);
        if (signalIndex !== -1) {
            conversationalPart = accumulatedText.substring(0, signalIndex).trim();
        }
        
        const jsonMarkdownRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/s;
        let displaySummary = conversationalPart;
        const match = conversationalPart.match(jsonMarkdownRegex);
        if (match && match[0]) {
            displaySummary = conversationalPart.substring(0, conversationalPart.lastIndexOf(match[0])).trim();
        }
        
        addOrUpdateMessage(displaySummary, 'ai', { isLoading: false, idToUpdate: thinkingMsgId });
        
        const textBeforeSignal = accumulatedText.split(CHAT_COMPLETION_SIGNAL)[0];
        let jsonToParse = "";
        const markdownJsonParseRegex = /```(?:json)?\s*([\s\S]*?)\s*```/s;
        const markdownJsonMatch = textBeforeSignal.match(markdownJsonParseRegex);

        if (markdownJsonMatch && markdownJsonMatch[1]) {
            const potentialJson = markdownJsonMatch[1].trim();
            if (potentialJson.startsWith('{') && potentialJson.endsWith('}')) {
                jsonToParse = potentialJson;
            }
        }
        
        if (jsonToParse) {
          try {
            const parsedChoices = JSON.parse(jsonToParse) as UserChoices;
            if (parsedChoices.topic && parsedChoices.goal && parsedChoices.level && parsedChoices.commitment && parsedChoices.duration && parsedChoices.style) {
              setFinalChoicesFromAI(parsedChoices); 

              const avgWeeklyHours = parseCommitmentToAvgHours(parsedChoices.commitment);
              const totalCourseDays = parseDurationToTotalDays(parsedChoices.duration);
              const calculatedTotalHours = (avgWeeklyHours / 7) * totalCourseDays;
              const limitExceeded = calculatedTotalHours > PRE_BETA_HOUR_LIMIT;

              addOrUpdateMessage('', 'ai', { 
                isBetaNote: true, 
                isLoading: false, 
                betaNoteDetails: {
                  calculatedHours: calculatedTotalHours,
                  limitExceeded,
                  userGoal: parsedChoices.goal || 'unknown',
                  userDuration: parsedChoices.duration || 'unknown',
                  userCommitment: parsedChoices.commitment || 'unknown',
                }
              });
              setIntermediateUserChoices({}); 
              return; 
            } else { throw new Error("Incomplete configuration data received from AI."); }
          } catch (e) {
            addOrUpdateMessage(`Data format error from AI: ${(e as Error).message}. Please try again.`, 'ai', {isError: true, isLoading: false});
          }
        } else {
          addOrUpdateMessage("Data format error: The AI did not format the configuration data correctly. Please try again.", 'ai', {isError: true, isLoading: false});
        }
    } else {
      addOrUpdateMessage(accumulatedText || "No response received.", 'ai', { isError: streamErrorOccurred, isLoading: false, idToUpdate: thinkingMsgId });
    }
  };

  const createInitialBlueprint = async (choices: UserChoices) => {
    setLoading(true, 'Creating initial course draft...', 10); 

    const result = await generateCourseBlueprint(choices);

    if (result.data) {
      setCourseBlueprint(result.data);
      setCurrentView(View.CONFIRMATION);
      setLoading(false); 
    } else {
      setLoading(false); 
      addOrUpdateMessage(`Error creating the course draft: ${result.error || 'Unknown error'}. Please try again or restart the configuration.`, 'ai', {isError: true, isLoading: false});
    }
  };


  if (isApiUnavailable && messages.length === 1 && messages[0].isError && messages[0].id.startsWith('error-init')) {
     return (
        <div className="w-full h-full flex items-center justify-center p-2 sm:p-5 pt-6">
            <GlassCard className="w-full max-w-2xl h-auto flex flex-col items-center justify-center p-8" maxWidth="max-w-2xl">
                <h2 className="pathly-font-heading text-2xl text-pathly-warning mb-4">Connection Error</h2>
                <p className="text-center mb-6 pathly-font-main">
                    {messages[0].text}
                </p>
                <button
                    onClick={resetApp}
                    className="px-6 py-2 bg-pathly-accent text-white rounded-md hover:bg-pathly-accent-hover transition-colors"
                >
                    Back to Home
                </button>
            </GlassCard>
        </div>
     );
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-2 sm:p-5 pt-6 pb-6">
      <GlassCard 
        className="w-full max-w-2xl flex flex-col overflow-hidden" 
        maxWidth="max-w-2xl"
        style={{height: 'calc(100% - 1rem)'}} 
      >
        <div className="flex-grow p-4 sm:p-5 overflow-y-auto" role="log" aria-live="polite">
          {messages.map((msg) => (
            <ChatMessageItem 
              key={msg.id} 
              message={msg} 
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
        <ChatInputArea
          onSendMessage={handleUserInput}
          isWaitingForAI={isWaitingForAIResponse || isApiUnavailable}
          placeholder={isApiUnavailable ? "Chat not available" : (isWaitingForAIResponse ? "Pathly is working..." : (messages.length <=1 ? "Start the conversation with Pathly..." : "Your answer..."))}
        />
      </GlassCard>
    </div>
  );
};