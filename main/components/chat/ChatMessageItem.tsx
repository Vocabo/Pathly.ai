

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../../types';
import { CopyIcon, ThumbsUpSolidIcon, ThumbsDownSolidIcon, InfoIcon, ExclamationTriangleIcon, CheckIcon } from '../common/Icons'; 
import { Button } from '../common/Button';

// AITypingIndicator component, now local to ChatMessageItem as it's the sole user.
const AITypingIndicator: React.FC = () => (
  <div className="flex items-center self-start space-x-1.5 p-3 my-2 bg-pathly-secondary rounded-xl shadow-sm animate-[fadeInMessage_0.5s_ease_forwards]">
    <div className="typing-dot w-2 h-2 bg-pathly-accent rounded-full"></div>
    <div className="typing-dot w-2 h-2 bg-pathly-accent rounded-full"></div>
    <div className="typing-dot w-2 h-2 bg-pathly-accent rounded-full"></div>
    <span className="ml-1 text-sm text-pathly-text opacity-80 pathly-font-main">Pathly is thinking...</span>
  </div>
);


interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const { id, sender, text, rawText, isError, isLoading, isBetaNote, betaNoteDetails, isInitialConfiguratorWarning } = message;
  const isUser = sender === 'user';
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);

  const contentToRender = rawText || text;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText || text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => console.error('Failed to copy text: ', err));
  };

  const handleFeedback = (feedback: 'positive' | 'negative') => {
    console.log(`Feedback for message ${id}: ${feedback}`);
    // Future: send feedback to backend/analytics
  };
  
  if (isLoading && !isBetaNote && !isInitialConfiguratorWarning) {
    return <AITypingIndicator />;
  }

  if (isInitialConfiguratorWarning) {
    return (
      <div 
        className="my-3 self-stretch opacity-0 translate-y-2.5 animate-[fadeInMessage_0.5s_0.1s_ease_forwards]"
        role="alert"
        aria-live="assertive" 
      >
        <div className="p-4 rounded-xl border border-yellow-500/60 bg-yellow-400/20 text-yellow-800 dark:text-yellow-200 dark:bg-yellow-700/20 dark:border-yellow-600/50 shadow-lg backdrop-blur-sm">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="pathly-font-main text-sm">{text}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isBetaNote && betaNoteDetails) {
    return (
      <div 
        className="my-3 self-stretch opacity-0 translate-y-2.5 animate-[fadeInMessage_0.5s_0.1s_ease_forwards]" 
        role="status"
        aria-live="polite"
      >
        <div className="p-4 rounded-xl border border-pathly-info/60 bg-pathly-info/10 text-pathly-text shadow-lg backdrop-blur-sm">
          <div className="flex items-start">
            <InfoIcon className="w-7 h-7 text-pathly-info mr-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="pathly-font-heading font-semibold text-pathly-info mb-1.5 text-base">Important Note (Pre-Beta)</h4>
              <p className="text-sm mb-1.5 pathly-font-main">
                Pathly is in an early development phase (Pre-Beta).
              </p>
              <p className="text-sm mb-2 pathly-font-main">
                Currently, the maximum course length is limited to approximately <strong>25 hours</strong> of total content
                to ensure quality and performance during this phase.
              </p>
              <p className="text-sm mb-2 pathly-font-main">
                Your configuration (Goal: <em className="italic">"{betaNoteDetails.userGoal}"</em>, 
                Commitment: <em className="italic">{betaNoteDetails.userCommitment}</em>, 
                Duration: <em className="italic">{betaNoteDetails.userDuration}</em>) 
                results in an estimated total duration of about <strong>{betaNoteDetails.calculatedHours.toFixed(1)} hours</strong>.
              </p>
              {betaNoteDetails.limitExceeded ? (
                <p className="text-sm font-semibold text-pathly-warning bg-pathly-warning/10 p-2 rounded-md my-2 pathly-font-main">
                  This exceeds the current Pre-Beta limit. The generated course might be automatically
                  shortened or simplified. For optimal results, we recommend adjusting the duration or weekly commitment, or making the learning topic more specific.
                </p>
              ) : (
                <p className="text-sm font-semibold text-pathly-success bg-pathly-success/10 p-2 rounded-md my-2 pathly-font-main">
                  Your configuration is within the current Pre-Beta limit.
                </p>
              )}
              <p className="text-xs opacity-80 pathly-font-main mt-2">
                We are continuously working on expanding capacity. Thank you for your understanding and valuable feedback!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div
      className={`flex flex-col mb-4 ${isUser ? 'items-end' : 'items-start'}`}
      onMouseEnter={() => !isError && setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      role="listitem"
    >
      {/* Message Bubble Container */}
      <div 
        className={`py-3 px-4 rounded-xl max-w-[85%] sm:max-w-[80%] md:max-w-[75%] break-words shadow-md opacity-0 translate-y-2.5 animate-[fadeInMessage_0.5s_ease_forwards]
          ${isUser ? 'bg-pathly-accent text-white rounded-br-lg self-end' : 'bg-pathly-secondary text-pathly-text rounded-bl-lg self-start'}
          ${isError ? 'bg-red-100 dark:bg-red-900 border border-red-500 text-red-700 dark:text-red-300 self-start' : ''}`}
      >
        <div className={`prose prose-sm dark:prose-invert 
            prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
            prose-headings:my-2 
            prose-code:text-sm prose-code:bg-pathly-bg prose-code:dark:bg-pathly-card-bg prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-pre:text-sm prose-pre:bg-pathly-bg prose-pre:dark:bg-pathly-card-bg prose-pre:p-3 prose-pre:rounded-md prose-pre:border prose-pre:border-pathly-border
            ${isUser ? 'prose-invert dark:prose-invert' : ''} 
            max-w-none`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-pathly-accent dark:text-pathly-accent-dark hover:underline" />,
            }}
          >
            {contentToRender}
          </ReactMarkdown>
        </div>
      </div>
      
      {/* Actions - Rendered but visibility controlled by opacity */}
      {!isError && (
        <div 
          className={`mt-1.5 flex gap-1.5 transition-opacity duration-200 ease-in-out ${isUser ? 'self-end' : 'self-start'} ${showActions ? 'opacity-100' : 'opacity-0'}`}
          style={{ pointerEvents: showActions ? 'auto' : 'none' }} 
        >
          <Button
            variant="icon"
            size="sm"
            className="p-1.5 bg-pathly-card-bg/80 border border-pathly-border text-pathly-text hover:bg-pathly-secondary backdrop-blur-sm"
            onClick={handleCopy}
            aria-label={copied ? "Copied!" : "Copy message"}
            title={copied ? "Copied!" : "Copy message"}
          >
            {copied ? <CheckIcon className="w-3.5 h-3.5 text-pathly-success" /> : <CopyIcon className="w-3.5 h-3.5" />}
          </Button>
          {!isUser && ( 
            <>
              <Button
                variant="icon"
                size="sm"
                className="p-1.5 bg-pathly-card-bg/80 border border-pathly-border text-pathly-text hover:bg-pathly-secondary backdrop-blur-sm"
                onClick={() => handleFeedback('positive')}
                aria-label="Positive feedback"
                title="Positive feedback"
              >
                <ThumbsUpSolidIcon className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="icon"
                size="sm"
                className="p-1.5 bg-pathly-card-bg/80 border border-pathly-border text-pathly-text hover:bg-pathly-secondary backdrop-blur-sm"
                onClick={() => handleFeedback('negative')}
                aria-label="Negative feedback"
                title="Negative feedback"
              >
                <ThumbsDownSolidIcon className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};