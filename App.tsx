import React, { useState, useMemo, useRef } from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from './convex/_generated/api';
import { Id } from './convex/_generated/dataModel';
import { Task, FilterState, ExtractedTaskData, GeneratedViewData, TaskStatus } from './types';
import { FilterBar } from './components/FilterBar';
import { TaskCard } from './components/TaskCard';
import { SmartInput } from './components/SmartInput';
import { TaskDetailView } from './components/TaskDetailView';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to convert Convex task to frontend Task type
const convexTaskToTask = (convexTask: any): Task => {
  return {
    id: convexTask._id,
    title: convexTask.title,
    isCompleted: convexTask.isCompleted,
    status: convexTask.status,
    createdAt: convexTask.createdAt,
    actionDate: convexTask.actionDate,
    tags: convexTask.tags,
    timeEstimate: convexTask.timeEstimate,
    context: convexTask.context,
    participants: convexTask.participants,
    occurredDate: convexTask.occurredDate,
    source: convexTask.source,
    linkedTasks: convexTask.linkedTasks,
    parentTaskId: convexTask.parentTaskId,
  };
};

const App: React.FC = () => {
  const convexTasks = useQuery(api.tasks.list) ?? [];
  const tasks = useMemo(() => convexTasks.map(convexTaskToTask), [convexTasks]);
  
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const toggleTask = useMutation(api.tasks.toggleComplete);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const createWithSubtasks = useMutation(api.tasks.createWithSubtasks);

  const [filters, setFilters] = useState<FilterState>({
    tags: [],
    status: [],
    dateScope: 'All'
  });
  const [currentViewName, setCurrentViewName] = useState<string | undefined>(undefined);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'master' | 'today'>('master');
  
  // Swipe navigation state
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to check if date is today
  const isToday = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return dateStr === todayStr;
  };

  // Today view filtering - tasks with actionDate = today
  const todayTasks = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const filtered = tasks.filter(task => {
      if (!task.actionDate) return false;
      // Handle both YYYY-MM-DD format and full ISO strings
      const taskDateStr = task.actionDate.includes('T') 
        ? task.actionDate.split('T')[0] 
        : task.actionDate;
      return taskDateStr === todayStr;
    });
    
    console.log('Today tasks:', filtered.length, 'out of', tasks.length, 'tasks');
    console.log('Today date:', todayStr);
    const tasksWithDates = tasks.filter(t => t.actionDate).map(t => {
      const taskDateStr = t.actionDate.includes('T') ? t.actionDate.split('T')[0] : t.actionDate;
      return { id: t.id, actionDate: t.actionDate, parsed: taskDateStr, matches: taskDateStr === todayStr };
    });
    console.log('Tasks with actionDate:', tasksWithDates);
    
    return filtered
      .sort((a, b) => {
        // Primary: Completed tasks at bottom
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        
        // Secondary: By status priority (Active > WaitingOn > SomedayMaybe > Archived)
        const statusPriority: Record<TaskStatus, number> = {
          [TaskStatus.Active]: 0,
          [TaskStatus.WaitingOn]: 1,
          [TaskStatus.SomedayMaybe]: 2,
          [TaskStatus.Archived]: 3,
        };
        const statusDiff = statusPriority[a.status] - statusPriority[b.status];
        if (statusDiff !== 0) return statusDiff;
        
        // Tertiary: By createdAt (newest first)
        return b.createdAt - a.createdAt;
      });
  }, [tasks]);

  // Filter Logic - Tag-based faceted filtering with AND logic
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Status filter
      const matchesStatus = filters.status.length === 0 || filters.status.includes(task.status);
      
      // 2. Tag filter (AND logic - task must have ALL selected tags)
      const matchesTags = filters.tags.length === 0 || 
        filters.tags.every(tag => task.tags.includes(tag));
      
      // 3. Date scope filter (using actionDate)
      let matchesDate = true;
      if (filters.dateScope !== 'All') {
        const targetDate = task.actionDate ? new Date(task.actionDate) : new Date(task.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const isSameDay = (d1: Date, d2: Date) => 
          d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() === d2.getDate();

        if (filters.dateScope === 'Today') {
          matchesDate = isSameDay(targetDate, today);
        } else if (filters.dateScope === 'ThisWeek') {
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          matchesDate = targetDate >= today && targetDate <= nextWeek;
        } else if (filters.dateScope === 'Overdue') {
          matchesDate = targetDate < today && !isSameDay(targetDate, today) && !task.isCompleted;
        }
      }

      return matchesStatus && matchesTags && matchesDate;
    }).sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      // Sort by actionDate if available, otherwise createdAt
      const aDate = a.actionDate ? new Date(a.actionDate).getTime() : a.createdAt;
      const bDate = b.actionDate ? new Date(b.actionDate).getTime() : b.createdAt;
      return bDate - aDate;
    });
  }, [tasks, filters]);

  const handleToggleTask = async (id: string) => {
    await toggleTask({ id: id as Id<"tasks"> });
  };

  const handleAddTask = async (data: ExtractedTaskData) => {
    try {
      console.log("handleAddTask called with:", data);
      
      // Ensure all required fields are present
      const taskData = {
        title: data.title.trim(),
        isCompleted: false,
        status: (data.status || TaskStatus.Active) as TaskStatus,
        tags: Array.isArray(data.tags) ? data.tags : [],
        actionDate: data.actionDate || undefined,
        createdAt: Date.now(),
        timeEstimate: data.timeEstimate || undefined,
        context: data.context || undefined,
        participants: Array.isArray(data.participants) && data.participants.length > 0 ? data.participants : undefined,
        occurredDate: data.occurredDate || undefined,
        source: data.source || { type: 'manual' as const },
      };
      
      console.log("Creating task with data:", taskData);
      const taskId = await createTask(taskData);
      console.log("Task created with ID:", taskId);
    } catch (error) {
      console.error("Error in handleAddTask:", error);
      throw error; // Re-throw so SmartInput can catch it
    }
  };

  const handleAddProjectWithSubtasks = async (parentData: ExtractedTaskData, childrenData: ExtractedTaskData[]) => {
    await createWithSubtasks({
      parent: {
        title: parentData.title,
        status: parentData.status || TaskStatus.Active,
        tags: parentData.tags || [],
        actionDate: parentData.actionDate,
        createdAt: Date.now(),
        timeEstimate: parentData.timeEstimate,
        context: parentData.context,
        participants: parentData.participants,
        occurredDate: parentData.occurredDate,
        source: parentData.source,
      },
      children: childrenData.map(childData => ({
        title: childData.title,
        status: childData.status || TaskStatus.Active,
        tags: childData.tags || [],
        actionDate: childData.actionDate,
        createdAt: Date.now(),
        timeEstimate: childData.timeEstimate,
        context: childData.context,
        participants: childData.participants,
        occurredDate: childData.occurredDate,
        source: childData.source,
      })),
    });
  };


  const handleApplyView = (data: GeneratedViewData) => {
    setFilters({
      tags: data.filters.tags || [],
      status: data.filters.status || [],
      dateScope: data.filters.dateScope || 'All',
      actionDateRange: data.filters.actionDateRange,
    });
    setCurrentViewName(data.viewName);
  };

  const handleClearView = () => {
    setCurrentViewName(undefined);
    setFilters({ tags: [], status: [], dateScope: 'All' });
  };

  const handleTaskClick = (id: string) => {
    setSelectedTaskId(id);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    await updateTask({
      id: updatedTask.id as Id<"tasks">,
      title: updatedTask.title,
      isCompleted: updatedTask.isCompleted,
      status: updatedTask.status,
      actionDate: updatedTask.actionDate,
      tags: updatedTask.tags,
      timeEstimate: updatedTask.timeEstimate,
      context: updatedTask.context,
      participants: updatedTask.participants,
      occurredDate: updatedTask.occurredDate,
      source: updatedTask.source,
      linkedTasks: updatedTask.linkedTasks,
    });
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask({ id: id as Id<"tasks"> });
    setSelectedTaskId(null);
  };

  // Swipe navigation handlers
  const startNavSwipe = (clientX: number, clientY: number) => {
    swipeStartX.current = clientX;
    swipeStartY.current = clientY;
  };

  const updateNavSwipe = (clientX: number, clientY: number) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    
    const deltaX = clientX - swipeStartX.current;
    const deltaY = clientY - swipeStartY.current;
    
    // Only handle horizontal swipes (more horizontal than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
      return true; // Indicates horizontal swipe
    }
    return false;
  };

  const endNavSwipe = (clientX: number, clientY: number) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    
    const deltaX = clientX - swipeStartX.current;
    const deltaY = clientY - swipeStartY.current;
    
    const threshold = 150;
    
    // Swipe right: Master -> Today (Today is to the left)
    if (deltaX > threshold && Math.abs(deltaX) > Math.abs(deltaY) && currentView === 'master') {
      setCurrentView('today');
    }
    // Swipe left: Today -> Master (Master is to the right)
    else if (deltaX < -threshold && Math.abs(deltaX) > Math.abs(deltaY) && currentView === 'today') {
      setCurrentView('master');
    }
    
    swipeStartX.current = null;
    swipeStartY.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startNavSwipe(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (updateNavSwipe(touch.clientX, touch.clientY)) {
      e.preventDefault(); // Prevent scrolling during horizontal swipe
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    endNavSwipe(touch.clientX, touch.clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    // Only handle if clicking on the main container, not on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select')) return;
    
    startNavSwipe(e.clientX, e.clientY);
    
    // Add global mouse listeners for drag
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (updateNavSwipe(e.clientX, e.clientY)) {
        e.preventDefault();
      }
    };
    
    const handleGlobalMouseUp = (e: MouseEvent) => {
      endNavSwipe(e.clientX, e.clientY);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  };

  // Get tasks for current view
  const displayTasks = currentView === 'today' ? todayTasks : filteredTasks;
  
  // Calculate today stats
  const todayStats = useMemo(() => {
    const activeTasks = todayTasks.filter(t => !t.isCompleted);
    const totalTime = activeTasks.reduce((sum, task) => {
      if (task.timeEstimate) {
        const match = task.timeEstimate.match(/(\d+)\s*(?:hour|hr|h|minute|min|m)/i);
        if (match) {
          const num = parseInt(match[1]);
          const unit = match[0].toLowerCase();
          if (unit.includes('hour') || unit.includes('hr') || unit.includes('h')) {
            return sum + num * 60;
          } else {
            return sum + num;
          }
        }
      }
      return sum;
    }, 0);
    return {
      count: activeTasks.length,
      timeEstimate: totalTime > 0 ? `${Math.round(totalTime / 60 * 10) / 10}h` : null,
    };
  }, [todayTasks]);

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      className="min-h-screen flex flex-col max-w-2xl mx-auto bg-[#F3F4F6] overflow-x-hidden relative select-none"
    >
      
      {/* Fixed Header + Filter Container */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-[#F3F4F6]">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <header className="flex items-center justify-between p-6 pb-2 shrink-0">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {currentView === 'today' ? "Today's List" : 'Master List'}
              </h1>
              {currentView === 'today' && todayStats.count > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {todayStats.count} task{todayStats.count !== 1 ? 's' : ''}
                  {todayStats.timeEstimate && ` • ${todayStats.timeEstimate}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4 text-gray-500">
              <button className="hover:text-gray-900 transition-colors">
                <Search className="w-6 h-6" />
              </button>
              <button className="hover:text-gray-900 transition-colors relative">
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-[#F3F4F6] rounded-full"></span>
              </button>
            </div>
          </header>
          
          {/* View indicator dots */}
          <div className="flex items-center justify-center gap-2 px-6 pb-2">
            <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentView === 'today' ? 'bg-gray-900 w-6' : 'bg-gray-300'}`} />
            <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentView === 'master' ? 'bg-gray-900 w-6' : 'bg-gray-300'}`} />
          </div>

          {/* Filter Bar - only show on master view */}
          {currentView === 'master' && (
            <FilterBar 
              activeFilters={filters} 
              setFilters={setFilters} 
              currentViewName={currentViewName}
              onClearView={handleClearView}
            />
          )}
        </div>
      </div>
      
      {/* Spacer for fixed header */}
      <div className={currentView === 'master' ? 'h-[140px]' : 'h-[100px]'}></div>

      {/* Task List */}
      <AnimatePresence mode="wait">
        <motion.main
          key={currentView}
          initial={{ opacity: 0, x: currentView === 'today' ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: currentView === 'today' ? -20 : 20 }}
          transition={{ duration: 0.2 }}
          className="flex-1 px-4 pb-32 overflow-y-auto overflow-x-hidden no-scrollbar"
        >
          <div className="space-y-1 min-w-0">
            {displayTasks.length > 0 ? (
              displayTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onToggle={handleToggleTask} 
                  onClick={handleTaskClick}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center pt-20 text-center opacity-50">
                  <div className="bg-gray-200 p-4 rounded-full mb-4">
                      <Menu className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No tasks found</p>
                  <p className="text-sm text-gray-400">
                    {currentView === 'today' 
                      ? "No tasks scheduled for today. Swipe right on a task card to add it to today's list."
                      : currentViewName 
                        ? `Your "${currentViewName}" view is empty!` 
                        : "Try adjusting your filters or add a new task."}
                  </p>
              </div>
            )}
          </div>
        </motion.main>
      </AnimatePresence>

      {/* Smart Input */}
      <SmartInput 
        onAddTask={handleAddTask} 
        onApplyView={handleApplyView}
        onAddProjectWithSubtasks={handleAddProjectWithSubtasks}
      />

      {/* Detail Modal */}
      {selectedTaskId && (
        <TaskDetailView 
          task={tasks.find(t => t.id === selectedTaskId)!}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
      
    </div>
  );
};

export default App;