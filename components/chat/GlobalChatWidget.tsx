


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { ChatMessage as ChatMessageType, View, AppContextType, GlobalChatSession } from '../../types';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInputArea } from './ChatInputArea';
import { AcademicCapIcon, ChevronRightIcon, HistoryIcon, XIcon, TrashIcon, RefreshIcon, PencilIcon, CheckIcon } from '../common/Icons'; 
import { initializeGlobalChat, streamGlobalChatResponse } from '../../services/geminiService';
import type { Chat } from '@google/genai';
import { Button } from '../common/Button'; 
import { AI_SYSTEM_INSTRUCTION_GLOBAL_ASSISTANT_BASE, AI_SYSTEM_INSTRUCTION_GLOBAL_ASSISTANT_COURSE_CONTEXT } from '../../constants';


export const GlobalChatWidget: React.FC = () => {
  const appContext = useAppContext();
  const { 
    isChatWidgetOpen, 
    toggleChatWidget, 
    isApiUnavailable: isGlobalApiUnavailable,
    globalChatSessions,
    activeGlobalChatSessionId,
    createGlobalChatSession,
    appendMessageToActiveGlobalChatSession,
    loadGlobalChatSession,
    deleteGlobalChatSession,
    renameGlobalChatSession, 
    getActiveGlobalChatSession,
  } = appContext;

  const [chatInstance, setChatInstance] = useState<Chat | null>(null);
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiThinkingMessageIdRef = useRef<string | null>(null);
  const activeSystemInstructionRef = useRef<string | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const activeSession = getActiveGlobalChatSession();
  const messagesToDisplay = activeSession?.messages || [];


  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messagesToDisplay]);

  const getCurrentContextSystemInstruction = useCallback(() => {
    if (appContext?.currentView === View.COURSE && appContext.courseData) {
        let activeItemContentPreview: string | undefined = undefined;
        const currentFullTitle = appContext.activeLessonOrExerciseTitle;
        if (currentFullTitle && appContext.courseData.chapters) {
            outerLoop: for (const chapter of appContext.courseData.chapters) {
                if (currentFullTitle === `Introduction: ${chapter.title}`) {
                    activeItemContentPreview = chapter.introduction; break outerLoop;
                }
                for (const lesson of chapter.lessons) {
                    if (lesson.title === currentFullTitle) {
                        activeItemContentPreview = lesson.content; break outerLoop;
                    }
                }
                if (chapter.exercise && currentFullTitle === `Exercise: ${chapter.exercise.title}`) {
                    activeItemContentPreview = chapter.exercise.task; break outerLoop;
                }
            }
        }
        return AI_SYSTEM_INSTRUCTION_GLOBAL_ASSISTANT_COURSE_CONTEXT(
            appContext.courseData.title, appContext.activeLessonOrExerciseTitle, activeItemContentPreview
        );
    }
    return AI_SYSTEM_INSTRUCTION_GLOBAL_ASSISTANT_BASE;
  }, [appContext?.currentView, appContext?.courseData, appContext?.activeLessonOrExerciseTitle]);


  const initOrReinitChatInstance = useCallback((systemInstructionToUse: string) => {
    if (isGlobalApiUnavailable) {
      if (activeSession && (activeSession.messages.length === 0 || (activeSession?.messages.length === 1 && activeSession.messages[0].id.startsWith("ai-global-greeting")))) {
         appendMessageToActiveGlobalChatSession({
            id: 'global-chat-error-reinit-' + Date.now(),
            sender: 'ai',
            text: "AI assistant is unavailable due to connection issues.",
            isError: true,
            timestamp: Date.now()
        }, undefined); 
      }
      setChatInstance(null);
      activeSystemInstructionRef.current = null;
      return;
    }
    
    const newChatInstance = initializeGlobalChat(systemInstructionToUse);

    setChatInstance(newChatInstance);
    activeSystemInstructionRef.current = systemInstructionToUse;

    if (!newChatInstance && activeSession && (activeSession.messages.length === 0 || (activeSession.messages.length === 1 && activeSession.messages[0].id.startsWith("ai-global-greeting")))) {
        appendMessageToActiveGlobalChatSession({
            id: 'global-chat-error-init-' + Date.now(),
            sender: 'ai',
            text: "Sorry, the AI assistant could not be initialized.",
            isError: true,
            timestamp: Date.now()
        }, undefined); 
    }
  }, [isGlobalApiUnavailable, appendMessageToActiveGlobalChatSession, activeSession]);


  useEffect(() => {
    if (isChatWidgetOpen) {
      const currentContextSystemInstruction = getCurrentContextSystemInstruction();
      
      if (!activeGlobalChatSessionId) {
        const newSessionId = createGlobalChatSession(currentContextSystemInstruction);
        const newSession = globalChatSessions.find(s => s.id === newSessionId); 
        if (newSession) {
             initOrReinitChatInstance(newSession.systemInstruction);
        }

      } else {
        const session = getActiveGlobalChatSession();
        if (session) {
          const instructionForChatInstance = session.systemInstruction; 
          
          if (!chatInstance || instructionForChatInstance !== activeSystemInstructionRef.current) {
            initOrReinitChatInstance(instructionForChatInstance);
          }
        } else {
           const newSessionId = createGlobalChatSession(currentContextSystemInstruction);
           const newSession = globalChatSessions.find(s => s.id === newSessionId);
            if (newSession) {
                initOrReinitChatInstance(newSession.systemInstruction);
            }
        }
      }
    }
  }, [
    isChatWidgetOpen, 
    activeGlobalChatSessionId, 
    getCurrentContextSystemInstruction,
    initOrReinitChatInstance, 
    chatInstance,
    getActiveGlobalChatSession, 
    createGlobalChatSession,   
    globalChatSessions 
  ]);


  const addThinkingMessage = (text: string = "Pathly AI is thinking...") => {
    if (!activeGlobalChatSessionId) return null;
    const thinkingMsg: ChatMessageType = {
        id: `ai-global-thinking-${Date.now()}`,
        sender: 'ai',
        text: text,
        isLoading: true,
        timestamp: Date.now()
    };
    appendMessageToActiveGlobalChatSession(thinkingMsg, undefined); 
    aiThinkingMessageIdRef.current = thinkingMsg.id;
    return thinkingMsg.id;
  };

  const updateOrFinalizeThinkingMessage = (id: string, newText: string, isError = false) => {
    if (!activeGlobalChatSessionId) return;
    const finalMsg: ChatMessageType = {
        id: id, 
        sender: 'ai',
        text: newText,
        rawText: newText, 
        isLoading: false,
        isError: isError,
        timestamp: Date.now()
    };
    appendMessageToActiveGlobalChatSession(finalMsg, undefined); 
    aiThinkingMessageIdRef.current = null;
  };


  const handleSendMessage = async (userInput: string) => {
    if (!chatInstance || isWaitingForAI || isGlobalApiUnavailable || !activeGlobalChatSessionId) {
       if(!activeGlobalChatSessionId && isChatWidgetOpen) { 
            const currentCtxInstruction = getCurrentContextSystemInstruction();
            const newSessionId = createGlobalChatSession(currentCtxInstruction);
            const newSession = globalChatSessions.find(s => s.id === newSessionId);
            if (newSession) {
                initOrReinitChatInstance(newSession.systemInstruction); 
            }
            appendMessageToActiveGlobalChatSession({id: 'system-info-' + Date.now(), sender:'ai', text:"Initializing chat session, please send your message again.", timestamp:Date.now()}, undefined);
        }
      return;
    }

    const userMessage: ChatMessageType = {
      id: `user-global-${Date.now()}`,
      sender: 'user',
      text: userInput,
      rawText: userInput,
      timestamp: Date.now()
    };
    
    const currentSession = getActiveGlobalChatSession();
    let newNameForSession: string | undefined = undefined;
    if (currentSession && currentSession.name.startsWith("Chat from") && currentSession.messages.filter(m => m.sender === 'user').length === 0) {
        newNameForSession = userInput.substring(0, 30) + (userInput.length > 30 ? "..." : "");
    }
    appendMessageToActiveGlobalChatSession(userMessage, newNameForSession);
    
    setIsWaitingForAI(true);
    const thinkingMsgId = addThinkingMessage();
    if (!thinkingMsgId) {
        setIsWaitingForAI(false);
        return;
    }

    let accumulatedText = '';
    let streamErrorOccurred = false;

    try {
      const streamResult = await streamGlobalChatResponse(chatInstance, userInput);
      if ('error' in streamResult) {
        updateOrFinalizeThinkingMessage(thinkingMsgId, streamResult.error, true);
        streamErrorOccurred = true;
      } else {
        for await (const chunk of streamResult) {
          const chunkText = chunk.text;
          if (chunkText) {
            accumulatedText += chunkText;
            const currentMessages = getActiveGlobalChatSession()?.messages || [];
            if (currentMessages.find(m => m.id === thinkingMsgId && m.isLoading)) {
                appendMessageToActiveGlobalChatSession({
                    id: thinkingMsgId, 
                    sender: 'ai',
                    text: accumulatedText,
                    rawText: accumulatedText,
                    isLoading: true, 
                    timestamp: Date.now()
                }, undefined);
            }
          }
        }
      }
    } catch (error) {
      accumulatedText = `An error occurred: ${(error as Error).message}`;
      streamErrorOccurred = true;
    } finally {
      setIsWaitingForAI(false);
      updateOrFinalizeThinkingMessage(thinkingMsgId, accumulatedText || "No response received.", streamErrorOccurred);
    }
  };
  
  const handleNewChatFromHistoryPanel = () => {
    const currentSysInstruction = getCurrentContextSystemInstruction();
    createGlobalChatSession(currentSysInstruction); 
    setShowHistoryPanel(false); 
  };


  const handleLoadChat = (sessionId: string) => {
    if (activeGlobalChatSessionId !== sessionId) {
      loadGlobalChatSession(sessionId); 
    }
    setShowHistoryPanel(false); 
  };
  
  const handleDeleteChat = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); 
    if (window.confirm("Are you sure you want to delete this chat?")) {
        deleteGlobalChatSession(sessionId);
    }
  };

  const handleStartEditing = (e: React.MouseEvent, session: GlobalChatSession) => {
    e.stopPropagation();
    if (editingSessionId) return; // Prevent new edit if one is active
    setEditingSessionId(session.id);
    setEditingName(session.name);
  };

  const handleSaveRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingSessionId && editingName.trim()) {
      renameGlobalChatSession(editingSessionId, editingName.trim());
    }
    setEditingSessionId(null);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };
  
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingSessionId && editingName.trim()) {
        renameGlobalChatSession(editingSessionId, editingName.trim());
      }
      setEditingSessionId(null);
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
    }
  };


  return (
    <>
      <button
        onClick={toggleChatWidget}
        className={`global-chat-widget-trigger ${isChatWidgetOpen ? 'shifted' : ''}`}
        aria-label={isChatWidgetOpen ? "Close AI Chat" : "Open AI Chat"}
        aria-expanded={isChatWidgetOpen}
      >
        {isChatWidgetOpen ? <ChevronRightIcon className="w-6 h-6" /> : <AcademicCapIcon className="w-7 h-7" />}
      </button>

      <div className={`global-chat-widget-panel ${isChatWidgetOpen ? 'open' : ''}`}>
        <header className="p-3 border-b border-pathly-border bg-pathly-secondary/80 backdrop-blur-sm flex items-center justify-between sticky top-0 z-20">
          <h3 className="pathly-font-heading text-md font-semibold text-pathly-text ml-1">Pathly AI Assist</h3>
          <div className="flex items-center space-x-1">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setShowHistoryPanel(prev => !prev)} 
              title="Chat History" 
              aria-label="Show/Hide Chat History" 
              className="text-pathly-text hover:bg-pathly-accent/10 px-3 py-1.5 text-xs"
            >
              History
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={toggleChatWidget} 
              title="Close Chat" 
              aria-label="Close AI Chat" 
              className="text-pathly-text hover:bg-pathly-accent/10 px-3 py-1.5 text-xs"
            >
             Close
            </Button>
          </div>
        </header>
        
        {showHistoryPanel && (
            <div className="global-chat-history-panel sticky top-[57px] z-10 bg-pathly-card-bg/90 backdrop-blur-md">
                 <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={handleNewChatFromHistoryPanel} 
                    className="w-[calc(100%-16px)] mx-2 my-2 flex items-center justify-center text-sm" 
                    title="Start New Chat"
                    disabled={!!editingSessionId}
                >
                    <RefreshIcon className="w-4 h-4 mr-2"/> New Chat
                </Button>
                {globalChatSessions.length === 0 ? (
                    <p className="text-xs text-center text-pathly-text/70 py-2">No saved chats.</p>
                ) : (
                    globalChatSessions.sort((a,b) => b.updatedAt - a.updatedAt).map(session => (
                        <div 
                            key={session.id} 
                            onClick={() => !editingSessionId && handleLoadChat(session.id)}
                            onKeyDown={(e) => !editingSessionId && e.key === 'Enter' && handleLoadChat(session.id)}
                            tabIndex={editingSessionId ? -1 : 0}
                            role="button"
                            className={`global-chat-history-item ${session.id === activeGlobalChatSessionId ? 'active' : ''} ${editingSessionId && editingSessionId !== session.id ? 'opacity-50 pointer-events-none' : ''}`}
                            title={editingSessionId === session.id ? `Renaming "${session.name}"` : `"${session.name}" - ${new Date(session.updatedAt).toLocaleDateString('en-US')}`}
                        >
                          {editingSessionId === session.id ? (
                              <>
                                  <input
                                      type="text"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onKeyDown={handleEditKeyDown}
                                      onClick={(e) => e.stopPropagation()}
                                      autoFocus
                                      className="flex-grow bg-transparent border-b-2 border-pathly-accent text-pathly-text text-sm p-1 mx-1 outline-none w-full"
                                  />
                                  <div className="flex items-center flex-shrink-0">
                                      <Button variant='icon' size='sm' className='p-1.5 text-pathly-success hover:bg-pathly-success/10' onClick={handleSaveRename} aria-label="Save new name">
                                          <CheckIcon className="w-4 h-4" />
                                      </Button>
                                      <Button variant='icon' size='sm' className='p-1.5 text-pathly-warning hover:bg-pathly-warning/10' onClick={handleCancelEdit} aria-label="Cancel edit">
                                          <XIcon className="w-4 h-4" />
                                      </Button>
                                  </div>
                              </>
                          ) : (
                              <>
                                  <span className="global-chat-history-item-name">{session.name}</span>
                                  <div className="flex items-center">
                                      <span className="global-chat-history-item-date mr-2">{new Date(session.updatedAt).toLocaleDateString('en-US')}</span>
                                      <Button 
                                          variant='icon' 
                                          size='sm' 
                                          className='p-1 text-pathly-text/60 hover:text-pathly-accent hover:bg-pathly-accent/10 focus-visible:ring-1 focus-visible:ring-pathly-accent'
                                          onClick={(e) => handleStartEditing(e, session)}
                                          aria-label={`Rename chat "${session.name}"`}
                                      >
                                          <PencilIcon className="w-3.5 h-3.5"/>
                                      </Button>
                                      <Button 
                                          variant='icon' 
                                          size='sm' 
                                          className='p-1 text-pathly-text/60 hover:text-red-500 hover:bg-red-500/10 focus-visible:ring-1 focus-visible:ring-red-500'
                                          onClick={(e) => handleDeleteChat(e, session.id)}
                                          aria-label={`Delete chat "${session.name}"`}
                                      >
                                          <TrashIcon className="w-3.5 h-3.5"/>
                                      </Button>
                                  </div>
                              </>
                          )}
                        </div>
                    ))
                )}
            </div>
        )}
        
        <div className="flex-grow p-3 sm:p-4 overflow-y-auto" role="log" aria-live="polite">
          {messagesToDisplay.map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <ChatInputArea
          onSendMessage={handleSendMessage}
          isWaitingForAI={isWaitingForAI || isGlobalApiUnavailable || !chatInstance || !activeGlobalChatSessionId}
          placeholder={isGlobalApiUnavailable || !chatInstance ? "AI assistant unavailable" : !activeGlobalChatSessionId ? "Start a new chat to begin" : isWaitingForAI ? "Pathly AI is thinking..." : "Ask a question about the content..."}
        />
      </div>
    </>
  );
};