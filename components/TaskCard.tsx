import React, { useMemo, useState, useRef } from 'react';
import { Task, TaskStatus } from '../types';
import { getTagMetadata, TAG_CATEGORIES } from '../constants';
import { CheckCircle2, Circle, Clock, Calendar, User, Check, X } from 'lucide-react';
import { Badge } from './Badge';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onClick: (id: string) => void;
}

// Helper to group tags
const useGroupedTags = (task: Task) => {
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
  [TaskStatus.Active]: 'bg-blue-500 shadow-sm shadow-blue-200',
  [TaskStatus.WaitingOn]: 'bg-yellow-500 shadow-sm shadow-yellow-200',
  [TaskStatus.SomedayMaybe]: 'bg-gray-400',
  [TaskStatus.Archived]: 'bg-slate-400',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onClick }) => {
  const groupedTags = useGroupedTags(task);
  const mainCategory = groupedTags.domains[0]; // Primary domain
  const categoryMeta = mainCategory ? getTagMetadata(mainCategory) : null;
  
  // Filter out duration if timeEstimate exists, and flatten other tags for the "subtags" line
  const subTags = [
    ...groupedTags.headspace,
    ...groupedTags.energy,
    // Only show duration tag if no specific time estimate
    ...(!task.timeEstimate ? groupedTags.duration : [])
  ];

  // Swipe gesture state - using refs to avoid stale closures
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
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
  };

  const updateSwipe = (clientX: number, clientY: number) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const deltaX = clientX - touchStartX.current;
    const deltaY = clientY - touchStartY.current;
    
    // Only handle horizontal swipes (more horizontal than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isCurrentlySwiping.current = true;
      setIsSwiping(true);
      // Only allow swiping right
      if (deltaX > 0) {
        const offset = Math.min(deltaX, 120);
        currentSwipeOffset.current = offset;
        setSwipeOffset(offset);
      }
    }
  };

  const endSwipe = async () => {
    if (touchStartX.current === null) return;
    
    const threshold = 100;
    const finalOffset = currentSwipeOffset.current;
    const wasSwiping = isCurrentlySwiping.current;
    const hadSwipe = finalOffset >= threshold && wasSwiping;
    
    console.log('🔍 endSwipe called:', { finalOffset, wasSwiping, hadSwipe, threshold });
    
    if (hadSwipe) {
      // Mark that we just swiped to prevent click
      justSwiped.current = true;
      
      // Trigger toggle today status
      try {
        console.log('🔄 Toggling today status for task:', task.id, 'Current actionDate:', task.actionDate);
        const result = await toggleTodayStatus({ id: task.id as Id<"tasks"> });
        console.log('✅ Toggle result:', result);
        // Haptic feedback (if available)
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      } catch (error) {
        console.error('❌ Error toggling today status:', error);
      }
    }
    
    // Reset swipe state
    setSwipeOffset(0);
    setIsSwiping(false);
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
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    updateSwipe(touch.clientX, touch.clientY);
    if (isSwiping) {
      e.preventDefault(); // Prevent scrolling during swipe
    }
  };

  const handleTouchEnd = () => {
    endSwipe();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    startSwipe(e.clientX, e.clientY);
    e.preventDefault();
    e.stopPropagation();
    
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
      {/* Background action indicator - revealed in the left space when swiping */}
      <div 
        className={`
          absolute left-0 top-0 bottom-0 rounded-2xl flex items-center pl-6 pointer-events-none
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
              <X className="w-6 h-6 text-red-600" strokeWidth={2.5} />
            ) : (
              <Check className="w-6 h-6 text-green-600" strokeWidth={2.5} />
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

      {/* Task Card */}
      <div 
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        className={`
          relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 
          transition-all duration-200 hover:shadow-md hover:border-gray-200 cursor-pointer
          ${task.isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}
          ${isSwiping ? 'transition-transform duration-100 ease-out' : 'transition-all duration-200'}
        `}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          zIndex: 10,
        }}
      >
      <div className="flex items-start gap-3 min-w-0">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id);
          }}
          className="mt-0.5 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
        >
          {task.isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-gray-400" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Top Row: Status Dot + Title */}
          <div className="flex items-center gap-3 mb-2">
            {!task.isCompleted && (
              <div className={`w-2 h-2 rounded-full ${statusDotColors[task.status]}`} />
            )}
            <h3 className={`text-base font-medium text-gray-900 truncate ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>
              {task.title}
            </h3>
          </div>

          {/* Bottom: Category Pill + Subtags + Metadata */}
          <div className="flex items-start gap-3 text-xs text-gray-500 mt-1 min-w-0">
            {/* Left: Category + Subtags */}
            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
              {mainCategory && categoryMeta && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${categoryMeta.color} shrink-0`}>
                  {mainCategory}
                </span>
              )}
              
              {subTags.map((tag, i) => {
                const meta = getTagMetadata(tag);
                return (
                  <span key={tag} className={`px-2 py-0.5 rounded text-[10px] font-medium ${meta.color} shrink-0`}>
                    {tag}
                  </span>
                );
              })}
            </div>

            {/* Right: Metadata Icons */}
            <div className="flex items-center gap-3 shrink-0">
              {task.timeEstimate && (
                <div className="flex items-center gap-1" title="Time Estimate">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span>{task.timeEstimate}</span>
                </div>
              )}
              {task.actionDate && (
                <div 
                  className="flex items-center gap-1" 
                  title="Action Date"
                  key={task.actionDate}
                  style={{
                    animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <span>{new Date(task.actionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              )}
              {task.participants && task.participants.length > 0 && (
                 <div className="flex items-center gap-1" title="Participants">
                   <User className="w-3 h-3 text-gray-400" />
                   <span className="truncate max-w-[100px]">{task.participants.join(', ')}</span>
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
