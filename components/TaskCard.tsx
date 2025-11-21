import React, { useMemo, useState, useRef } from 'react';
import { RoutineTask, TaskStatus, RoutineFrequency, Priority } from '../types';
import { getTagMetadata, TAG_CATEGORIES, ROUTINE_BADGE_COLOR, DAYS_OF_WEEK, PRIORITY_COLORS } from '../constants';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, CircleIcon, Clock01Icon, Calendar01Icon, UserIcon, CheckmarkCircle01Icon as CheckmarkIcon, Cancel01Icon, FireIcon } from '@hugeicons/core-free-icons';
import { Badge } from './Badge';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskCardProps {
  task: RoutineTask;
  onToggle: (id: string) => void;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
}

// Helper to format routine frequency display
const formatFrequency = (routine: RoutineTask['routine']): string => {
  if (!routine) return '';
  
  if (routine.frequency === RoutineFrequency.Daily) {
    return 'Daily';
  } else if (routine.frequency === RoutineFrequency.Weekly) {
    if (routine.daysOfWeek && routine.daysOfWeek.length > 0) {
      const dayLabels = routine.daysOfWeek
        .sort((a, b) => a - b)
        .map(day => DAYS_OF_WEEK.find(d => d.value === day)?.label || '')
        .filter(Boolean);
      return dayLabels.join('/');
    }
    return 'Weekly';
  } else if (routine.frequency === RoutineFrequency.Monthly) {
    return 'Monthly';
  } else if (routine.frequency === RoutineFrequency.Custom) {
    return `Every ${routine.customInterval} day${routine.customInterval !== 1 ? 's' : ''}`;
  }
  return '';
};

// Helper to check if routine is completed today
const isCompletedToday = (routine: RoutineTask['routine']): boolean => {
  if (!routine || !routine.completionHistory) return false;
  const today = new Date().toISOString().split('T')[0];
  return routine.completionHistory.includes(today);
};

// Helper to group tags
const useGroupedTags = (task: RoutineTask) => {
  return useMemo(() => {
    const grouped: Record<string, string[]> = {
      headspace: [],
      energy: [],
      duration: [],
      domains: [],
    };
    
    task.tags.forEach(tag => {
      const metadata = getTagMetadata(tag);
      if (grouped[metadata.category]) {
        grouped[metadata.category].push(tag);
      } else {
        grouped.domains.push(tag);
      }
    });
    
    return grouped;
  }, [task.tags]);
};

const statusDotColors: Record<TaskStatus, string> = {
  [TaskStatus.Active]: 'bg-blue-500 shadow-sm shadow-blue-200/50',
  [TaskStatus.WaitingOn]: 'bg-yellow-500 shadow-sm shadow-yellow-200/50',
  [TaskStatus.SomedayMaybe]: 'bg-gray-400 shadow-sm shadow-gray-200/50',
  [TaskStatus.Archived]: 'bg-slate-400 shadow-sm shadow-slate-200/50',
};

// Get card accent color based on status and category
const getCardColor = (status: TaskStatus, categoryMeta: ReturnType<typeof getTagMetadata> | null): string => {
  // Map status to base colors
  const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.Active]: '#3B82F6', // blue-500
    [TaskStatus.WaitingOn]: '#EAB308', // yellow-500
    [TaskStatus.SomedayMaybe]: '#9CA3AF', // gray-400
    [TaskStatus.Archived]: '#94A3B8', // slate-400
  };
  
  // If we have a category, blend it with status color (subtle)
  if (categoryMeta && categoryMeta.color) {
    // Extract color from category (e.g., 'bg-blue-100' -> blue)
    const colorMatch = categoryMeta.color.match(/bg-(\w+)-(\d+)/);
    if (colorMatch) {
      const [, colorName] = colorMatch;
      // Use a subtle version of the category color
      const categoryColorMap: Record<string, string> = {
        'indigo': '#818CF8',
        'pink': '#F9A8D4',
        'purple': '#C084FC',
        'emerald': '#6EE7B7',
        'rose': '#FCA5A5',
        'amber': '#FCD34D',
        'blue': '#93C5FD',
        'green': '#86EFAC',
        'red': '#F87171',
        'cyan': '#67E8F9',
        'yellow': '#FDE047',
        'teal': '#5EEAD4',
        'orange': '#FB923C',
        'gray': '#94A3B8',
      };
      return categoryColorMap[colorName] || statusColors[status];
    }
  }
  
  return statusColors[status];
};

// Helper to convert hex to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
  let c: any;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${opacity})`;
  }
  // Fallback for safety, though it shouldn't be hit with the color map
  return `rgba(161, 161, 170, ${opacity})`;
};

const priorityBgColors: Record<string, string> = {
  Urgent: 'bg-red-500/20',
  High: 'bg-orange-500/20',
  Medium: 'bg-yellow-500/20',
  Low: 'bg-blue-500/20',
};

const priorityBorderColors: Record<string, string> = {
  Urgent: 'border-red-400',
  High: 'border-orange-400',
  Medium: 'border-yellow-400',
  Low: 'border-blue-400',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onClick, onDelete }) => {
  const groupedTags = useGroupedTags(task);
  const mainCategory = groupedTags.domains[0]; // Primary domain
  const categoryMeta = mainCategory ? getTagMetadata(mainCategory) : null;
  
  const cardAccentColor = useMemo(() => {
    if (categoryMeta && categoryMeta.color) {
      const colorMatch = categoryMeta.color.match(/(?:bg|text)-(\w+)-(\d+)/);
      if (colorMatch) {
        const [, colorName] = colorMatch;
        const categoryColorMap: Record<string, string> = {
          'indigo': '#818CF8', 'pink': '#F9A8D4', 'purple': '#C084FC',
          'emerald': '#6EE7B7', 'rose': '#FCA5A5', 'amber': '#FCD34D',
          'blue': '#93C5FD', 'green': '#86EFAC', 'red': '#F87171',
          'cyan': '#67E8F9', 'yellow': '#FDE047', 'teal': '#5EEAD4',
          'orange': '#FB923C', 'gray': '#A1A1AA', 'slate': '#94A3B8',
        };
        return categoryColorMap[colorName] || '#A1A1AA'; // default gray
      }
    }
    return '#A1A1AA'; // default gray if no category
  }, [categoryMeta]);

  const completeRoutine = useMutation(api.routines.complete);
  const uncompleteRoutine = useMutation(api.routines.uncomplete);
  
  // Filter out duration if timeEstimate exists, and flatten other tags for the "subtags" line
  const subTags = [
    ...groupedTags.headspace,
    ...groupedTags.energy,
    // Only show duration tag if no specific time estimate
    ...(!task.timeEstimate ? groupedTags.duration : [])
  ];

  const routineCompletedToday = task.isRoutine && task.routine ? isCompletedToday(task.routine) : false;
  
  const handleRoutineToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.routine) return;
    
    if (routineCompletedToday) {
      await uncompleteRoutine({ routineId: task.routine.id as Id<"routines"> });
    } else {
      await completeRoutine({ routineId: task.routine.id as Id<"routines"> });
    }
  };

  // Swipe gesture state - using refs to avoid stale closures
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const swipeOffsetRef = useRef(0);
  const isSwipingRef = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const justSwiped = useRef(false);
  const currentSwipeOffset = useRef(0); // Track actual swipe distance
  const isCurrentlySwiping = useRef(false); // Track swiping state
  
  const toggleTodayStatus = useMutation(api.tasks.toggleTodayStatus);
  
  // Check if task is in today's list
  const isInTodayList = useMemo(() => {
    if (!task.actionDate) return false;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    // Handle both YYYY-MM-DD format and full ISO strings
    const taskDateStr = task.actionDate.includes('T') 
      ? task.actionDate.split('T')[0] 
      : task.actionDate;
    
    const isToday = taskDateStr === todayStr;
    return isToday;
  }, [task.actionDate]);

  const startSwipe = (clientX: number, clientY: number) => {
    touchStartX.current = clientX;
    touchStartY.current = clientY;
    currentSwipeOffset.current = 0;
    isCurrentlySwiping.current = false;
    setIsSwiping(false);
    setSwipeOffset(0);
    setSwipeDirection(null);
  };

  const updateSwipe = (clientX: number, clientY: number) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const deltaX = clientX - touchStartX.current;
    const deltaY = clientY - touchStartY.current;
    
    // Only handle horizontal swipes (more horizontal than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isCurrentlySwiping.current = true;
      setIsSwiping(true);
      
      // Determine swipe direction
      if (deltaX > 0) {
        // Swipe right - add to today
        setSwipeDirection('right');
        const offset = Math.min(deltaX, 120);
        currentSwipeOffset.current = offset;
        setSwipeOffset(offset);
      } else if (deltaX < 0 && onDelete) {
        // Swipe left - delete
        setSwipeDirection('left');
        const offset = Math.max(deltaX, -200);
        currentSwipeOffset.current = offset;
        setSwipeOffset(offset);
      }
    }
  };

  const endSwipe = async () => {
    if (touchStartX.current === null) return;
    
    const threshold = 100;
    const finalOffset = Math.abs(currentSwipeOffset.current);
    const wasSwiping = isCurrentlySwiping.current;
    const hadSwipe = finalOffset >= threshold && wasSwiping;
    const direction = swipeDirection;
    
    if (hadSwipe && direction === 'right') {
      // Mark that we just swiped to prevent click
      justSwiped.current = true;
      
      // Trigger toggle today status
      try {
        const result = await toggleTodayStatus({ id: task.id as Id<"tasks"> });
        // Haptic feedback (if available)
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      } catch (error) {
        console.error('❌ Error toggling today status:', error);
      }
    } else if (hadSwipe && direction === 'left' && onDelete) {
      // Mark that we just swiped to prevent click
      justSwiped.current = true;
      
      // Trigger delete
      if (window.confirm('Delete this task?')) {
        onDelete(task.id);
      }
      
      // Haptic feedback (if available)
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
    
    // Reset swipe state
    setSwipeOffset(0);
    setIsSwiping(false);
    setSwipeDirection(null);
    currentSwipeOffset.current = 0;
    isCurrentlySwiping.current = false;
    touchStartX.current = null;
    touchStartY.current = null;
    
    // Reset justSwiped after a delay to prevent accidental clicks
    if (hadSwipe) {
      setTimeout(() => {
        justSwiped.current = false;
      }, 300);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startSwipe(touch.clientX, touch.clientY);
    e.stopPropagation(); // Prevent navigation swipe from starting
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    updateSwipe(touch.clientX, touch.clientY);
    if (isSwiping) {
      e.preventDefault(); // Prevent scrolling during swipe
      e.stopPropagation(); // Prevent navigation swipe
    } else if (touchStartX.current !== null && touchStartY.current !== null) {
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);
      // If we detect a horizontal swipe starting, stop propagation
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        e.stopPropagation(); // Prevent navigation swipe
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation(); // Prevent navigation swipe
    endSwipe();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    startSwipe(e.clientX, e.clientY);
    e.preventDefault();
    e.stopPropagation(); // Prevent navigation swipe from starting
    
    let hadSignificantMovement = false;
    
    // Add global mouse listeners for drag
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (touchStartX.current !== null) {
        const deltaX = Math.abs(e.clientX - touchStartX.current);
        if (deltaX > 10) {
          hadSignificantMovement = true;
        }
      }
      updateSwipe(e.clientX, e.clientY);
    };
    
    const handleGlobalMouseUp = (e: MouseEvent) => {
      const hadSwipe = swipeOffset >= 100 && isSwiping;
      endSwipe();
      
      // If we swiped or had significant movement, prevent the click event
      if (hadSwipe || hadSignificantMovement) {
        e.preventDefault();
        e.stopPropagation();
        // Mark that we just swiped to prevent any subsequent click
        justSwiped.current = true;
        setTimeout(() => {
          justSwiped.current = false;
        }, 300);
      }
      
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger click if we just swiped, are currently swiping, or have any swipe offset
    if (justSwiped.current || isSwiping || swipeOffset > 5) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick(task.id);
  };

  return (
    <div className="relative mb-3 overflow-visible">
      {/* Background action indicator - revealed in the left space when swiping right */}
      {swipeDirection === 'right' && (
        <div 
          className={`
            absolute left-0 top-0 bottom-0 rounded-2xl flex items-center pl-6 pointer-events-none z-0
            transition-opacity duration-300 ease-out
            ${swipeOffset > 15 ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            width: `${Math.min(swipeOffset, 200)}px`,
          }}
        >
          <div className={`
            flex flex-col items-center gap-1.5
            ${isInTodayList ? 'text-red-500' : 'text-green-500'}
            transition-all duration-300 ease-out
          `}
          style={{
            transform: `scale(${Math.min(1, 0.7 + (swipeOffset / 150))})`,
          }}
          >
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center shadow-sm
              ${isInTodayList ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}
              transition-all duration-300 ease-out
            `}
            style={{
              transform: `scale(${Math.min(1, 0.6 + (swipeOffset / 120))}) rotate(${swipeOffset > 80 ? '0deg' : `${(swipeOffset / 80) * 360}deg`})`,
            }}
            >
              {isInTodayList ? (
                <HugeiconsIcon icon={Cancel01Icon} size={24} className="text-red-600" />
              ) : (
                <HugeiconsIcon icon={CheckmarkIcon} size={24} className="text-green-600" />
              )}
            </div>
            <div className="w-[80px] flex items-center justify-center">
              <span className={`
                text-[10px] font-semibold text-center whitespace-nowrap
                transition-all duration-300 ease-out
              `}
              style={{
                opacity: Math.min(1, (swipeOffset - 30) / 40),
              }}
              >
                {isInTodayList ? 'Remove' : 'Add to Today'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Background delete indicator - revealed in the right space when swiping left */}
      {swipeDirection === 'left' && onDelete && (
        <div 
          className={`
            absolute right-0 top-0 bottom-0 flex items-center justify-end pr-4 pointer-events-none z-0
            transition-opacity duration-300 ease-out
            ${Math.abs(swipeOffset) > 15 ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <HugeiconsIcon 
            icon={Cancel01Icon} 
            size={24} 
            className="text-red-600/85 transition-all duration-200 ease-out"
            style={{
              transform: `scale(${Math.min(1, 0.85 + (Math.abs(swipeOffset) / 400))})`,
            }}
          />
        </div>
      )}

      {/* Task Card */}
      <div 
        ref={cardRef}
        data-swipeable="true"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        className={cn(
          "relative rounded-2xl p-5 overflow-hidden group transition-all duration-300 cursor-pointer z-10",
          task.isCompleted && "opacity-60 grayscale-[0.5]",
          isSwiping ? "transition-transform duration-100 ease-out scale-[1.02]" : "hover:scale-[1.01]",
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          zIndex: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          boxShadow: isSwiping
            ? `0 20px 60px -12px rgba(0, 0, 0, 0.12)`
            : `0 8px 32px -8px rgba(0, 0, 0, 0.08)`,
        }}
      >
        {/* Subtle noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{ backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAACISURBVHgB7dAxAQAwEAOh+id81P2A/g0i8MLMvLl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXk/5QCddAUTsXIsPwAAAABJRU5ErkJggg==")' }}
        />
        
        {/* Gradient overlay for depth - more subtle */}
        <div 
          className="absolute inset-0 opacity-80 pointer-events-none bg-gradient-to-br from-white/20 to-transparent"
        />

        {/* Content */}
        <div className="relative flex items-center gap-4 min-w-0 z-10">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id);
          }}
          className={`
            w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0
            border ${task.isCompleted 
              ? 'border-gray-400' 
              : task.priority 
                ? `${priorityBorderColors[task.priority] || 'border-gray-300'}` 
                : 'border-gray-300'
            }
            ${task.priority && !task.isCompleted 
              ? `${priorityBgColors[task.priority] || 'bg-gray-400/20'} backdrop-blur-sm` 
              : 'bg-gray-100/40 backdrop-blur-sm'
            }
            hover:scale-110 active:scale-95
          `}
        >
          <AnimatePresence>
            {task.isCompleted ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-3 h-3 rounded-full bg-gray-700"
              />
            ) : null}
          </AnimatePresence>
        </button>

        <div className="flex-1 min-w-0">
          {/* Top Row: Title + Routine Badge */}
          <div className="flex items-center gap-2.5 mb-3">
            <h3 className={`text-base font-semibold text-gray-800 truncate leading-snug ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>
              {task.title}
            </h3>
            {task.isRoutine && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shrink-0 bg-gray-100 text-gray-600 border border-gray-200">
                Routine
              </span>
            )}
          </div>
          
          {/* Routine Info Row */}
          {task.isRoutine && task.routine && (
            <div className="flex items-center gap-1 mb-1.5 text-[10px] text-gray-500/70">
              <span className="font-normal">{formatFrequency(task.routine)}</span>
              {task.routine.goal && (
                <span className="text-gray-400/70">• {task.routine.goal}</span>
              )}
              {task.routine.trackStreaks && task.routine.currentStreak !== undefined && (
                <div className="flex items-center gap-0.5 text-purple-500/70">
                  <HugeiconsIcon icon={FireIcon} size={9} />
                  <span className="font-normal">{task.routine.currentStreak} day streak</span>
                  {task.routine.longestStreak !== undefined && task.routine.longestStreak > task.routine.currentStreak && (
                    <span className="text-gray-400/60">(best: {task.routine.longestStreak})</span>
                  )}
                </div>
              )}
              {routineCompletedToday && (
                <span className="text-green-500/70 font-normal">✓ Done today</span>
              )}
            </div>
          )}

          {/* Bottom: Category Pill + Subtags + Metadata */}
          <div className="flex items-start gap-3 text-xs text-gray-500 mt-2 min-w-0">
            {/* Left: Category + Subtags */}
            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
              {mainCategory && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide shrink-0 bg-gray-100 text-gray-600 border border-gray-200">
                  {mainCategory}
                </span>
              )}
              
              {subTags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide shrink-0 bg-gray-100 text-gray-600 border border-gray-200">
                  {tag}
                </span>
              ))}
            </div>

            {/* Right: Metadata Icons + Status */}
            <div className="flex items-center gap-4 shrink-0">
              {task.timeEstimate && (
                <div className="flex items-center gap-1.5" title="Time Estimate">
                  <HugeiconsIcon icon={Clock01Icon} size={12} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">{task.timeEstimate}</span>
                </div>
              )}
              {task.actionDate && (
                <div 
                  className="flex items-center gap-1.5" 
                  title="Action Date"
                >
                  <HugeiconsIcon icon={Calendar01Icon} size={12} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">{new Date(task.actionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              )}
              <span className="text-xs font-medium text-gray-500">{task.status}</span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
