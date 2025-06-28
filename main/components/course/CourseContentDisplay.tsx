

import React from 'react';
import { MagnifyingGlassIcon } from '../common/Icons'; // Added MagnifyingGlassIcon
import { CourseLesson } from '../../types'; // To check for suggestedSearchTerms

interface CourseContentDisplayProps {
  title: string;
  htmlContent: string;
  type: 'intro' | 'lesson' | 'exercise';
  lessonData?: CourseLesson; // Pass full lesson data for lessons
}

const contentFadeInAnimation = {
  animation: 'contentFadeIn 0.5s ease forwards',
};

export const CourseContentDisplay: React.FC<CourseContentDisplayProps> = ({ title, htmlContent, type, lessonData }) => {
  return (
    <main 
      className="bg-pathly-card-bg backdrop-blur-2xl border border-pathly-border rounded-pathly-lg p-7 sm:p-10 h-full overflow-y-auto" // Added h-full and overflow-y-auto
      style={contentFadeInAnimation}
    >
      <article className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none 
                        dark:prose-invert 
                        prose-headings:pathly-font-heading prose-headings:text-pathly-text prose-headings:dark:text-pathly-text
                        prose-h1:text-3xl sm:prose-h1:text-4xl prose-h1:mb-6 prose-h1:pb-4 prose-h1:border-b-2 prose-h1:border-pathly-border
                        prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-5 prose-h2:pb-3 prose-h2:border-b prose-h2:border-pathly-border
                        prose-h3:text-xl sm:prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-pathly-accent prose-h3:font-semibold
                        prose-h4:text-lg sm:prose-h4:text-xl prose-h4:mt-6 prose-h4:mb-3 prose-h4:text-pathly-text prose-h4:font-semibold
                        prose-p:pathly-font-main prose-p:leading-relaxed prose-p:mb-4 prose-p:text-pathly-text prose-p:dark:text-pathly-text 
                        prose-li:pathly-font-main prose-li:leading-relaxed prose-li:mb-2 prose-li:text-pathly-text prose-li:dark:text-pathly-text
                        prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-5 prose-ol:pl-5 prose-ul:mb-4 prose-ol:mb-4
                        prose-pre:bg-pathly-secondary prose-pre:dark:bg-opacity-20 prose-pre:p-5 prose-pre:rounded-pathly-md prose-pre:my-6 prose-pre:border prose-pre:border-pathly-border prose-pre:text-sm prose-pre:text-pathly-text prose-pre:dark:text-pathly-text 
                        prose-code:pathly-font-main prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-code:px-1 prose-code:py-0.5 prose-code:bg-pathly-secondary prose-code:dark:bg-opacity-20 prose-code:rounded-md prose-code:text-pathly-text prose-code:dark:text-pathly-text
                        prose-a:text-pathly-accent prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                        prose-strong:font-semibold prose-strong:text-pathly-text prose-strong:dark:text-pathly-text
                        ">
        <h1>{type === 'exercise' ? `Exercise: ${title}` : title}</h1>
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />

        {type === 'lesson' && lessonData && lessonData.suggestedSearchTerms && lessonData.suggestedSearchTerms.length > 0 && (
          <div className="mt-8 pt-6 border-t border-pathly-border">
            <h3 className="text-lg font-semibold mb-3 pathly-font-heading flex items-center">
              <MagnifyingGlassIcon className="w-5 h-5 mr-2 text-pathly-accent" />
              Find More Resources:
            </h3>
            <div className="flex flex-wrap gap-2">
              {lessonData.suggestedSearchTerms.map((term, index) => (
                <a
                  key={index}
                  href={`https://www.google.com/search?q=${encodeURIComponent(term)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-pathly-secondary text-pathly-accent px-3 py-1.5 rounded-md text-sm hover:bg-pathly-accent hover:text-white transition-colors duration-200 shadow-sm border border-pathly-border hover:border-pathly-accent"
                >
                  {term}
                </a>
              ))}
            </div>
            <p className="text-xs text-pathly-text opacity-70 mt-3 pathly-font-main">
              These search terms can help you find additional articles, videos, or tutorials on this lesson's topic.
            </p>
          </div>
        )}
      </article>
    </main>
  );
};