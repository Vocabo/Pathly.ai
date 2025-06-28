

import React from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { View, StoredCourse } from '../../types';
import { Button } from '../common/Button';
import { GlassCard } from '../common/GlassCard';
import { AcademicCapIcon, CheckCircleIcon, ClockIcon, PlusCircleIcon, StarOutlineIcon } from '../common/Icons'; // Updated to StarOutlineIcon

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode | null; // Allow null for icon
  animationDelay?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, animationDelay = '0s', className = '' }) => (
  <GlassCard 
    className={`text-center p-5 sm:p-6 flex flex-col items-center justify-center h-full ${className}`}
    style={{ animationDelay }} 
  >
    {icon && <div className="text-pathly-accent mb-2 sm:mb-3">{icon}</div>}
    <h3 className="pathly-font-heading text-base sm:text-lg font-semibold mb-1">{title}</h3>
    <p className="pathly-font-main text-2xl sm:text-3xl font-bold text-pathly-accent">{value}</p>
  </GlassCard>
);

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full h-1.5 bg-pathly-border rounded-full overflow-hidden mt-1">
    <div 
      className="h-full bg-pathly-accent transition-all duration-500 ease-out progress-bar-shine"
      style={{ width: `${progress}%` }}
    ></div>
  </div>
);


export const DashboardView: React.FC = () => {
  const { setCurrentView, savedCourses, globalTotalXP, globalTotalLearningMinutes, loadCourse } = useAppContext();

  const formatTotalLearningTime = (totalMinutes: number): string => {
    if (totalMinutes === 0) return "0h";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let timeString = "";
    if (hours > 0) {
      timeString += `${hours}h`;
    }
    if (minutes > 0) {
      if (hours > 0) timeString += " ";
      timeString += `${minutes}min`;
    }
    return timeString || "0min";
  };
  
  const completedCoursesCount = savedCourses.filter(sc => {
    const totalLessons = sc.course.chapters.reduce((total, chap) => total + chap.lessons.length, 0);
    return totalLessons > 0 && sc.course.completedLessonCount === totalLessons;
  }).length;

  const stats: StatCardProps[] = [ 
    { title: "Active Courses", value: savedCourses.length.toString(), icon: <AcademicCapIcon className="w-7 h-7 sm:w-8 sm:h-8 mx-auto" /> },
    { title: "Completed", value: completedCoursesCount.toString(), icon: <CheckCircleIcon className="w-7 h-7 sm:w-8 sm:h-8 mx-auto" /> },
    { title: "Study Time", value: formatTotalLearningTime(globalTotalLearningMinutes), icon: <ClockIcon className="w-7 h-7 sm:w-8 sm:h-8 mx-auto" /> },
    { title: "Total XP", value: `${globalTotalXP} XP`, icon: <StarOutlineIcon className="w-7 h-7 sm:w-8 sm:h-8 mx-auto" /> }, 
  ];

  const mostRecentCourse = savedCourses.length > 0 
    ? [...savedCourses].sort((a, b) => b.savedAt - a.savedAt)[0] 
    : null;
  
  let continueLearningProgress = 0;
  if (mostRecentCourse) {
    const totalLessons = mostRecentCourse.course.chapters.reduce((sum, chap) => sum + chap.lessons.length, 0);
    if (totalLessons > 0) {
      continueLearningProgress = Math.round(( (mostRecentCourse.course.completedLessonCount || 0) / totalLessons) * 100);
    }
  }

  const learningTips = [
    "Tip: Repetition is key! Schedule regular, short review sessions to solidify what you've learned.",
    "Tip: Explain newly learned concepts to someone else, or even out loud to yourself. It greatly deepens understanding.",
    "Tip: Take regular breaks. Your brain needs time to process and store information.",
    "Tip: Set clear, achievable goals for each study session. This motivates and provides a clear structure.",
    "Tip: Actively connect new knowledge with what you already know. This creates stronger neural connections.",
    "Tip: Use different learning methods. Variety can help maintain interest and illuminate different aspects of a topic.",
    "Tip: Reward yourself for reaching milestones. This boosts motivation and makes learning more enjoyable.",
    "Tip: Create a distraction-free learning environment. A quiet place helps you concentrate better.",
    "Tip: Test your knowledge regularly. Self-testing helps identify gaps and check your learning progress.",
    "Tip: Be patient with yourself. Learning is a process, and setbacks are sometimes part of it. Keep going!"
  ];
  const [currentTip, setCurrentTip] = React.useState('');

  React.useEffect(() => {
    setCurrentTip(learningTips[Math.floor(Math.random() * learningTips.length)]);
  }, []); 


  return (
    <div className="w-full h-full flex flex-col items-center justify-start pt-8 pb-12 px-4 sm:px-6 space-y-6 sm:space-y-8 overflow-y-auto">
      {/* Header */}
      <div 
        className="text-center w-full max-w-3xl" 
        style={{ 
          opacity: 0, 
          transform: 'translateY(20px)', 
          animation: 'slideUpFadeIn 0.6s cubic-bezier(0.165, 0.84, 0.44, 1) forwards' 
        }}
      >
        <h1 className="pathly-font-heading text-4xl md:text-5xl font-extrabold mb-2 tracking-tight">
          Your Learning Dashboard
        </h1>
        <p className="pathly-font-main text-lg md:text-xl opacity-80">
          Welcome back! Ready to discover something new?
        </p>
      </div>

      {/* Main Content Area: CTA and Continue Learning */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
        {/* Call to Action Card */}
        <GlassCard className="w-full text-center p-6 sm:p-8 flex flex-col justify-between min-h-[320px] sm:min-h-[350px]" key="cta-card" style={{animationDelay: '0.15s'}}>
          <div>
            <div className="mb-3 sm:mb-4 text-pathly-accent">
              <PlusCircleIcon className="w-12 h-12 sm:w-14 sm:h-14 mx-auto"/>
            </div>
            <h2 className="pathly-font-heading text-2xl md:text-3xl font-semibold text-pathly-accent mb-3 sm:mb-4">
              Start a New Learning Path
            </h2>
            <p className="pathly-font-main text-base md:text-lg mb-5 sm:mb-6 opacity-90">
              Pathly works with you to create a course perfectly tailored to your goals and prior knowledge.
            </p>
          </div>
          <Button 
            size="lg" 
            variant="primary" 
            onClick={() => setCurrentView(View.CONFIGURATOR)}
            className="px-10 py-3 text-lg sm:text-xl mt-auto w-full sm:w-auto"
          >
            Create New Path
          </Button>
        </GlassCard>

        {/* Continue Learning Card */}
        {mostRecentCourse ? (
          <GlassCard className="w-full p-6 sm:p-8 flex flex-col justify-between min-h-[320px] sm:min-h-[350px]" key="continue-card" style={{animationDelay: '0.25s'}}>
            <div>
              <h2 className="pathly-font-heading text-xl md:text-2xl font-semibold text-pathly-accent mb-3">
                Continue Learning:
              </h2>
              <h3 className="pathly-font-main text-lg md:text-xl font-medium mb-1 truncate" title={mostRecentCourse.title}>
                {mostRecentCourse.title}
              </h3>
              <p className="text-sm text-pathly-text opacity-70 mb-1">
                {mostRecentCourse.course.completedLessonCount || 0} / {mostRecentCourse.course.chapters.reduce((sum, chap) => sum + chap.lessons.length, 0)} Lessons
              </p>
              <ProgressBar progress={continueLearningProgress} />
              <p className="text-xs text-pathly-text opacity-60 mt-2 mb-4">
                XP: {mostRecentCourse.course.currentProgressXP || 0} / {mostRecentCourse.course.totalCourseXP || 0}
              </p>
            </div>
            <Button 
              size="md" 
              variant="secondary" 
              onClick={() => loadCourse(mostRecentCourse.id)}
              className="w-full px-8 py-3 text-base sm:text-lg mt-auto"
            >
              Continue Course
            </Button>
          </GlassCard>
        ) : (
           <GlassCard className="w-full text-center p-6 sm:p-8 flex flex-col items-center justify-center min-h-[320px] sm:min-h-[350px]" key="no-courses-card" style={{animationDelay: '0.25s'}}>
             <AcademicCapIcon className="w-12 h-12 text-pathly-accent opacity-60 mb-3"/>
             <h3 className="pathly-font-heading text-lg font-semibold mb-2">No Active Courses</h3>
             <p className="text-sm text-pathly-text opacity-70">
                Start your first learning path to see your progress here.
             </p>
           </GlassCard>
        )}
      </div>
      
      {/* Statistics Section */}
      <div className="w-full max-w-5xl pt-5">
         <h2 className="pathly-font-heading text-2xl md:text-3xl font-bold mb-4 sm:mb-5 text-center opacity-0" style={{animation: 'slideUpFadeIn 0.5s 0.35s forwards'}}>Your Achievements</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          {stats.map((stat, index) => (
            <StatCard 
              key={stat.title} 
              title={stat.title} 
              value={stat.value} 
              icon={stat.icon}
              animationDelay={`${index * 0.07 + 0.4}s`} 
              className="min-h-[160px] sm:min-h-[180px]" 
            />
          ))}
        </div>
      </div>

      {/* Learning Tip Section */}
      <div className="w-full max-w-3xl pt-5">
        <GlassCard className="w-full p-5 sm:p-6" style={{animationDelay: '0.65s'}}>
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <StarOutlineIcon className="w-6 h-6 mr-2 text-yellow-400" />
              <h3 className="pathly-font-heading text-lg font-semibold">Tip of the Day</h3>
            </div>
            <p className="pathly-font-main text-sm opacity-90">{currentTip}</p>
          </div>
        </GlassCard>
      </div>

    </div>
  );
};