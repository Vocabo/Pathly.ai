
import React from 'react';
import { TestQuestion } from '../../../types';

interface QuestionDisplayProps {
  question: TestQuestion;
  selectedOption: number | null;
  onOptionSelect: (index: number) => void;
  isSubmitting: boolean;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ question, selectedOption, onOptionSelect, isSubmitting }) => {
  return (
    <div className="text-left transition-opacity duration-300 ease-in-out min-h-[250px]">
      <h3 className="pathly-font-heading text-xl sm:text-2xl mb-5 text-pathly-text">{question.question}</h3>
      <div className="grid grid-cols-1 gap-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onOptionSelect(index)}
            disabled={isSubmitting}
            className={`block w-full text-left p-4 border rounded-xl transition-all duration-300 ease-in-out pathly-font-main
              ${selectedOption === index 
                ? 'bg-pathly-accent border-pathly-accent text-white font-semibold ring-2 ring-pathly-accent ring-offset-2 ring-offset-pathly-bg' 
                : 'border-pathly-border bg-transparent text-pathly-text hover:border-pathly-accent hover:bg-pathly-secondary'}
              disabled:opacity-70 disabled:cursor-not-allowed
            `}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};
