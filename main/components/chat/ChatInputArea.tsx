import React, { useState } from 'react';
import { Button } from '../common/Button';
import { SendIcon } from '../common/Icons';

interface ChatInputAreaProps {
  onSendMessage: (value: string) => void;
  isWaitingForAI: boolean;
  placeholder?: string;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({ onSendMessage, isWaitingForAI, placeholder }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (inputValue.trim() && !isWaitingForAI) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="p-4 border-t border-pathly-border bg-pathly-bg/70 backdrop-blur-sm">
      <div className="flex gap-2.5 items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder={placeholder || "Type a message..."}
          disabled={isWaitingForAI}
          className="flex-grow w-full px-4 py-3 text-base rounded-pathly-md border border-pathly-border bg-pathly-card-bg text-pathly-text transition-all duration-300 ease-in-out focus:outline-none focus:border-pathly-accent focus:ring-2 focus:ring-pathly-accent focus:ring-opacity-30 disabled:opacity-60"
          aria-label="Your message to Pathly"
          aria-disabled={isWaitingForAI}
        />
        <Button
          variant="icon"
          onClick={handleSend}
          disabled={isWaitingForAI || !inputValue.trim()}
          className="w-12 h-12 bg-pathly-accent text-white hover:enabled:bg-pathly-accent-hover hover:enabled:brightness-110 hover:enabled:shadow-pathly-btn-primary-hover disabled:bg-pathly-border"
          aria-label="Send message"
          aria-disabled={isWaitingForAI || !inputValue.trim()}
        >
          <SendIcon className="w-5 h-5"/>
        </Button>
      </div>
    </div>
  );
};