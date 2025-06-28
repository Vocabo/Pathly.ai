import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { View, TestQuestion, TestAnswer } from '../../types';
import { Button } from '../common/Button';
import { GlassCard } from '../common/GlassCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { QuestionDisplay } from './test/QuestionDisplay';
import { generateTestQuestion } from '../../services/geminiService';

export const TestView: React.FC = () => {
  const { 
    setCurrentView, 
    adaptiveTest, 
    setAdaptiveTestState,
    updateUserChoice,
    userChoices,
    // resetAdaptiveTest, // Not fully resetting, but re-init parts on start
   } = useAppContext();
  
  const [currentQuestionData, setCurrentQuestionData] = useState<TestQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchErrorCount, setFetchErrorCount] = useState(0);

  const fetchNextQuestion = useCallback(async () => {
    setIsLoadingQuestion(true);
    setSelectedOption(null);

    const paramsForAI = {
      topic: userChoices.topic || "General Knowledge",
      level: userChoices.level || "Beginner",
      difficulty: adaptiveTest.difficulty,
      strengths: adaptiveTest.knowledgeMap.strengths,
      weaknesses: adaptiveTest.knowledgeMap.weaknesses,
      previousQuestions: adaptiveTest.history.map(h => ({ question: h.question.question, topic: h.question.topic }))
    };
    console.log("TestView: Fetching question with params:", JSON.stringify(paramsForAI, null, 2));


    const result = await generateTestQuestion(
      paramsForAI.topic,
      paramsForAI.level,
      paramsForAI.difficulty,
      paramsForAI.strengths,
      paramsForAI.weaknesses,
      paramsForAI.previousQuestions
    );
    
    console.log("TestView: Received question data from AI:", JSON.stringify(result, null, 2));


    if (result.data) {
      setCurrentQuestionData(result.data);
      setAdaptiveTestState({ currentQuestion: result.data });
      setFetchErrorCount(0); // Reset error count on success
    } else {
      console.error("TestView: Failed to fetch question, API error:", result.error);
      const newErrorCount = fetchErrorCount + 1;
      setFetchErrorCount(newErrorCount);
      setCurrentQuestionData(null); 
      
      let errorDetails = "Unknown error";
      if (result.error) {
        if (typeof result.error === 'string') {
          errorDetails = result.error.substring(0, 100);
        } else { // It's a GeminiError
          errorDetails = result.error.message.substring(0, 100);
        }
      }
      // Avoid excessively long testTaken strings if many errors occur
      const newErrorLog = `\nError on question #${adaptiveTest.currentIndex + 1}: ${errorDetails}...`;
      if ((userChoices.testTaken?.length || 0) + newErrorLog.length < 1000) { // Limit total length
         updateUserChoice('testTaken', (userChoices.testTaken || "") + newErrorLog);
      }
      
      if (newErrorCount >=3) {
        let finalTestTaken = userChoices.testTaken || "";
        if (!finalTestTaken.includes("Test ended prematurely")) {
            finalTestTaken += "\nTest ended prematurely due to repeated errors loading questions.";
        }
        updateUserChoice('testTaken', finalTestTaken);
        handleSubmitTest(true); // Force submit/end
      }
    }
    setIsLoadingQuestion(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userChoices.topic, userChoices.level, adaptiveTest.difficulty, adaptiveTest.knowledgeMap.strengths, adaptiveTest.knowledgeMap.weaknesses, adaptiveTest.history, setAdaptiveTestState, adaptiveTest.currentIndex, fetchErrorCount, updateUserChoice]); // Added updateUserChoice

  useEffect(() => {
    // This effect runs when adaptiveTest.currentIndex changes or component mounts with isActive.
    if (adaptiveTest.isActive && adaptiveTest.currentIndex < adaptiveTest.questionCount) {
      fetchNextQuestion();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adaptiveTest.isActive, adaptiveTest.currentIndex]); 

  const handleAnswer = async (action: 'submit' | 'skip' | 'unknown') => {
    if (!currentQuestionData || isSubmitting) return; 
    if (action === 'submit' && selectedOption === null) return;

    setIsSubmitting(true);

    const answerRecord: TestAnswer = {
      question: currentQuestionData, 
      answer: action === 'submit' ? selectedOption! : undefined,
      action,
    };

    let newDifficulty = adaptiveTest.difficulty;
    const newStrengths = [...adaptiveTest.knowledgeMap.strengths];
    const newWeaknesses = [...adaptiveTest.knowledgeMap.weaknesses];
    const questionTopic = currentQuestionData.topic || 'general'; // Use the specific topic of the question

    switch (action) {
      case 'skip':
        newDifficulty = Math.min(10, adaptiveTest.difficulty + 1); 
        if (!newStrengths.includes(questionTopic) && !newWeaknesses.includes(questionTopic)) newStrengths.push(questionTopic); 
        break;
      case 'unknown':
        newDifficulty = Math.max(1, adaptiveTest.difficulty - 2);
        if (!newWeaknesses.includes(questionTopic)) newWeaknesses.push(questionTopic);
        if (newStrengths.includes(questionTopic)) newStrengths.splice(newStrengths.indexOf(questionTopic),1);
        break;
      case 'submit':
        if (selectedOption === currentQuestionData.correct) {
          newDifficulty = Math.min(10, adaptiveTest.difficulty + 1);
          if (!newStrengths.includes(questionTopic)) newStrengths.push(questionTopic);
           if (newWeaknesses.includes(questionTopic)) newWeaknesses.splice(newWeaknesses.indexOf(questionTopic),1);
        } else {
          newDifficulty = Math.max(1, adaptiveTest.difficulty - 1);
          if (!newWeaknesses.includes(questionTopic)) newWeaknesses.push(questionTopic);
          if (newStrengths.includes(questionTopic)) newStrengths.splice(newStrengths.indexOf(questionTopic),1);
        }
        break;
    }
    
    const newCurrentIndex = adaptiveTest.currentIndex + 1;
    setAdaptiveTestState({
      history: [...adaptiveTest.history, answerRecord],
      difficulty: newDifficulty,
      knowledgeMap: { strengths: newStrengths, weaknesses: newWeaknesses },
      currentIndex: newCurrentIndex,
    });
    
    console.log("TestView: Updated adaptive state:", {
        difficulty: newDifficulty,
        strengths: newStrengths,
        weaknesses: newWeaknesses,
        currentIndex: newCurrentIndex
    });


    // Check if test should end AFTER state update for currentIndex
    if (newCurrentIndex >= adaptiveTest.questionCount) {
      handleSubmitTest();
    } else {
       // fetchNextQuestion will be called by useEffect due to currentIndex change
    }
    setIsSubmitting(false); // Do this after state updates, before potential fetch
  };

  const handleSubmitTest = (forceEnd: boolean = false) => {
    const correctAnswers = adaptiveTest.history.filter(h => h.action === 'submit' && h.answer === h.question.correct).length;
    const submittedAnswers = adaptiveTest.history.filter(h => h.action === 'submit').length;
    const answeredQuestionsCount = adaptiveTest.history.length; // Total questions attempted (submit, skip, unknown)

    const scorePercentage = submittedAnswers > 0 ? (correctAnswers / submittedAnswers) : 0;

    let newLevelBasedOnTest = userChoices.level || 'Beginner';
    if (scorePercentage < 0.3) newLevelBasedOnTest = 'Absolute Beginner (Test-based)';
    else if (scorePercentage < 0.7) newLevelBasedOnTest = 'Solid Foundational Level (Test-based)';
    else newLevelBasedOnTest = 'Advanced Level (Test-based)';
    
    let testSummary = userChoices.testTaken || "Adaptive Test Summary:";
    if (!testSummary.includes("completed") && !testSummary.includes("ended prematurely")) { // Append if not already finalized
        testSummary += `\nThe adaptive test was ${forceEnd && answeredQuestionsCount < adaptiveTest.questionCount ? 'prematurely ended': 'completed'} after ${answeredQuestionsCount} of ${adaptiveTest.questionCount} questions.
        Result: ${correctAnswers} of ${submittedAnswers} questions answered correctly (${Math.round(scorePercentage * 100)}%).
        New estimated level: ${newLevelBasedOnTest}.
        Identified strengths: ${adaptiveTest.knowledgeMap.strengths.join(', ') || 'None'}
        Identified weaknesses: ${adaptiveTest.knowledgeMap.weaknesses.join(', ') || 'None'}
        These results will be used to fine-tune the course.`;
    }
    
    updateUserChoice('level', newLevelBasedOnTest); 
    updateUserChoice('testTaken', testSummary.substring(0, 1500)); // Truncate to avoid overly long strings
    
    console.log("TestView: Test submitted. Final summary:", testSummary);
    console.log("TestView: Final knowledge map:", adaptiveTest.knowledgeMap);


    setAdaptiveTestState({ isActive: false }); 
    setCurrentView(View.LOADING); 
  };

  if (!adaptiveTest.isActive && !isLoadingQuestion) { 
      setCurrentView(View.CONFIRMATION);
      return null;
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-5 pt-8 pb-8"> {/* Added pt-8 and pb-8 for spacing */}
      <GlassCard 
        className="text-center overflow-y-auto" 
        maxWidth="max-w-3xl"
        style={{maxHeight: 'calc(100vh - 8rem)'}} // Ensure card does not exceed viewport with navbar
      >
        <h2 className="pathly-font-heading text-3xl sm:text-4xl text-pathly-accent mb-2">Adaptive Knowledge Test</h2>
        <p id="test-progress" className="pathly-font-main font-semibold text-pathly-accent mb-6">
          Question {Math.min(adaptiveTest.currentIndex + 1, adaptiveTest.questionCount)} of {adaptiveTest.questionCount}
        </p>

        {isLoadingQuestion && <div className="min-h-[250px] flex items-center justify-center"><LoadingSpinner size="lg" /></div>}
        
        {!isLoadingQuestion && currentQuestionData && (
          <QuestionDisplay 
            question={currentQuestionData}
            selectedOption={selectedOption}
            onOptionSelect={setSelectedOption}
            isSubmitting={isSubmitting}
          />
        )}
        {!isLoadingQuestion && !currentQuestionData && ( // Error state
            <div className="min-h-[250px] flex flex-col items-center justify-center text-pathly-warning">
                <p className="text-lg mb-2">Could not load question.</p>
                {fetchErrorCount < 3 ? (
                  <Button variant="secondary" onClick={() => fetchNextQuestion()} className="mt-4">Try Again</Button>
                ) : (
                  <p className="text-sm">The test is ending due to repeated errors.</p>
                )}
            </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-4">
            <Button variant="skip" onClick={() => handleAnswer('skip')} disabled={isLoadingQuestion || isSubmitting || !currentQuestionData}>Skip</Button>
            <Button variant="unknown" onClick={() => handleAnswer('unknown')} disabled={isLoadingQuestion || isSubmitting || !currentQuestionData}>I don't know</Button>
          </div>
          <Button 
            variant="primary" 
            onClick={() => handleAnswer('submit')} 
            disabled={selectedOption === null || isLoadingQuestion || isSubmitting || !currentQuestionData}
          >
            {adaptiveTest.currentIndex +1 >= adaptiveTest.questionCount ? 'Finish Test' : 'Next'}
          </Button>
        </div>
         {adaptiveTest.currentIndex +1 >= adaptiveTest.questionCount && !isLoadingQuestion && (
            <div className="mt-4">
                <Button variant="secondary" size="sm" onClick={() => handleSubmitTest()}>Go to Results & Course</Button>
            </div>
        )}
      </GlassCard>
    </div>
  );
};