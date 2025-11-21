import React, { useState, useEffect, useRef } from 'react';
import { RoutineTask, TaskStatus, RoutineFrequency, Routine, Priority } from '../types';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Delete01Icon, Calendar01Icon, Clock01Icon, Tag01Icon, UserGroupIcon, File01Icon, RepeatIcon } from '@hugeicons/core-free-icons';
import { TagInput } from './TagInput';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { DAYS_OF_WEEK, PRIORITY_COLORS } from '../constants';

interface TaskDetailViewProps {
  task: RoutineTask;
  onClose: () => void;
  onUpdate: (task: RoutineTask) => void;
  onDelete: (id: string) => void;
}

const statusDotColors: Record<TaskStatus, string> = {
  [TaskStatus.Active]: 'bg-blue-500 shadow-sm shadow-blue-200',
  [TaskStatus.WaitingOn]: 'bg-yellow-500 shadow-sm shadow-yellow-200',
  [TaskStatus.SomedayMaybe]: 'bg-gray-400',
  [TaskStatus.Archived]: 'bg-slate-400',
};

const statusCheckboxBgColors: Record<TaskStatus, string> = {
  [TaskStatus.Active]: 'bg-blue-500/20',
  [TaskStatus.WaitingOn]: 'bg-yellow-500/20',
  [TaskStatus.SomedayMaybe]: 'bg-gray-400/20',
  [TaskStatus.Archived]: 'bg-slate-400/20',
};

const priorityBgColors: Record<string, string> = {
  Urgent: 'bg-red-500/20',
  High: 'bg-orange-500/20',
  Medium: 'bg-yellow-500/20',
  Low: 'bg-blue-500/20',
};

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ task, onClose, onUpdate, onDelete }) => {
  const [editedTask, setEditedTask] = useState<RoutineTask>(task);
  const [routineConfig, setRoutineConfig] = useState<Partial<Routine>>(task.routine || {
    frequency: RoutineFrequency.Daily,
    trackStreaks: false,
    daysOfWeek: [],
    customInterval: undefined,
    timeEstimate: undefined,
    goal: undefined,
  });
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = React.useRef(false);
  const shouldPreventClickRef = React.useRef(false);

  const existingRoutine = useQuery(
    api.routines.getByTaskId,
    task.isRoutine ? { taskId: task.id as Id<"tasks"> } : "skip"
  );
  const createRoutine = useMutation(api.routines.create);
  const updateRoutine = useMutation(api.routines.update);
  const deleteRoutineMutation = useMutation(api.routines.deleteRoutine);
  const toggleComplete = useMutation(api.tasks.toggleComplete);

  useEffect(() => {
    setEditedTask(task);
    if (task.routine) {
      setRoutineConfig(task.routine);
    } else if (existingRoutine) {
      setRoutineConfig({
        id: existingRoutine._id,
        taskId: task.id,
        frequency: existingRoutine.frequency as RoutineFrequency,
        daysOfWeek: existingRoutine.daysOfWeek,
        customInterval: existingRoutine.customInterval,
        timeEstimate: existingRoutine.timeEstimate,
        goal: existingRoutine.goal,
        trackStreaks: existingRoutine.trackStreaks,
        currentStreak: existingRoutine.currentStreak,
        longestStreak: existingRoutine.longestStreak,
        completionHistory: existingRoutine.completionHistory,
      });
    }
  }, [task, existingRoutine]);

  const handleChange = (field: keyof RoutineTask, value: any) => {
    setEditedTask((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoutineConfigChange = (field: keyof Routine, value: any) => {
    setRoutineConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Update task first
    const updatedTask = { ...editedTask };
    onUpdate(updatedTask);

    // Handle routine creation/update/deletion
    if (updatedTask.isRoutine) {
      if (existingRoutine) {
        // Update existing routine
        await updateRoutine({
          id: existingRoutine._id as Id<"routines">,
          frequency: routineConfig.frequency,
          daysOfWeek: routineConfig.daysOfWeek,
          customInterval: routineConfig.customInterval,
          timeEstimate: routineConfig.timeEstimate,
          goal: routineConfig.goal,
          trackStreaks: routineConfig.trackStreaks ?? false,
        });
      } else {
        // Create new routine
        await createRoutine({
          taskId: updatedTask.id as Id<"tasks">,
          frequency: routineConfig.frequency ?? RoutineFrequency.Daily,
          daysOfWeek: routineConfig.daysOfWeek,
          customInterval: routineConfig.customInterval,
          timeEstimate: routineConfig.timeEstimate,
          goal: routineConfig.goal,
          trackStreaks: routineConfig.trackStreaks ?? false,
        });
      }
    } else if (existingRoutine) {
      // Delete routine if task is no longer a routine
      await deleteRoutineMutation({ id: existingRoutine._id as Id<"routines"> });
    }

    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
    }
  };

  const handleCheckboxClick = async (e: React.MouseEvent) => {
    // Don't toggle if we should prevent click (menu is open or was just opened)
    if (shouldPreventClickRef.current || showPriorityMenu) {
      e.preventDefault();
      e.stopPropagation();
      shouldPreventClickRef.current = false;
      return;
    }
    
    // Normal click - toggle completion
    await toggleComplete({ id: task.id as Id<"tasks"> });
    handleChange('isCompleted', !editedTask.isCompleted);
  };

  const handleCheckboxMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset flags
    isLongPressRef.current = false;
    shouldPreventClickRef.current = false;
    
    // Clear any existing timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    // Start timer for long press (1 second)
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      shouldPreventClickRef.current = true;
      setShowPriorityMenu(true);
      longPressTimerRef.current = null;
    }, 1000); // 1 second for long press
  };

  const handleCheckboxMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    // If menu is already open, prevent click
    if (showPriorityMenu) {
      shouldPreventClickRef.current = true;
      return;
    }
    
    // If we haven't triggered long press yet, clear the timer and allow normal click
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      shouldPreventClickRef.current = false;
    }
  };

  const handleCheckboxMouseLeave = (e: React.MouseEvent) => {
    // If menu is already open, don't clear
    if (showPriorityMenu) {
      return;
    }
    
    // Clear the timer if mouse leaves before long press completes
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePrioritySelect = (priority: Priority) => {
    handleChange('priority', priority);
    setShowPriorityMenu(false);
    // Reset flags after menu closes
    setTimeout(() => {
      isLongPressRef.current = false;
      shouldPreventClickRef.current = false;
    }, 200);
  };

  React.useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Close priority menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPriorityMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.priority-menu-container')) {
          setShowPriorityMenu(false);
          // Reset flags after menu closes
          setTimeout(() => {
            isLongPressRef.current = false;
            shouldPreventClickRef.current = false;
          }, 200);
        }
      }
    };

    if (showPriorityMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPriorityMenu]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.12)',
        }}
      >
        {/* Subtle noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{ backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAACISURBVHgB7dAxAQAwEAOh+id81P2A/g0i8MLMvLl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXk/5QCddAUTsXIsPwAAAABJRU5ErkJggg==")' }}
        />
        
        {/* Gradient overlay for depth */}
        <div 
          className="absolute inset-0 opacity-80 pointer-events-none bg-gradient-to-br from-white/20 to-transparent"
        />
        
        {/* Header with Title */}
        <div className="relative flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100/50 bg-white/30 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="relative pt-1.5 shrink-0 priority-menu-container">
              <button
                onClick={handleCheckboxClick}
                onMouseDown={handleCheckboxMouseDown}
                onMouseUp={handleCheckboxMouseUp}
                onMouseLeave={handleCheckboxMouseLeave}
                onTouchStart={handleCheckboxMouseDown}
                onTouchEnd={handleCheckboxMouseUp}
                type="button"
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer
                  border-2 ${editedTask.isCompleted ? 'border-gray-400' : 'border-gray-300'}
                  ${editedTask.priority && !editedTask.isCompleted 
                    ? `${priorityBgColors[editedTask.priority] || 'bg-gray-400/20'} backdrop-blur-sm` 
                    : 'bg-gray-100/40 backdrop-blur-sm'
                  }
                  hover:scale-110 active:scale-95
                `}
              >
                {editedTask.isCompleted && (
                  <div className="w-3 h-3 rounded-full bg-gray-700" />
                )}
              </button>
              
              {/* Priority Menu */}
              {showPriorityMenu && (
                <div className="absolute left-0 top-8 bg-white/90 backdrop-blur-xl rounded-xl border border-gray-200 shadow-lg p-2 z-50 min-w-[120px]">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Priority</div>
                  {Object.values(Priority).map((priority) => (
                    <button
                      key={priority}
                      onClick={() => handlePrioritySelect(priority)}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all mb-1
                        ${editedTask.priority === priority
                          ? `${PRIORITY_COLORS[priority] || 'bg-gray-400'} text-white`
                          : 'bg-white/60 text-gray-700 hover:bg-white/80'
                        }
                      `}
                    >
                      {priority}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      handleChange('priority', undefined);
                      setShowPriorityMenu(false);
                      // Reset flags after menu closes
                      setTimeout(() => {
                        isLongPressRef.current = false;
                        shouldPreventClickRef.current = false;
                      }, 200);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white/60 text-gray-500 hover:bg-white/80"
                  >
                    None
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <textarea
                value={editedTask.title}
                onChange={(e) => handleChange('title', e.target.value)}
                rows={1}
                className="flex-1 text-xl font-semibold text-gray-800 placeholder-gray-300 border-none p-0 focus:ring-0 resize-none bg-transparent leading-tight min-w-0"
                placeholder="Task title..."
                style={{ minHeight: '28px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50/60 rounded-lg transition-all backdrop-blur-sm"
              title="Delete Task"
            >
              <HugeiconsIcon icon={Delete01Icon} size={16} />
            </button>
            <div className="w-px h-4 bg-gray-200/60 mx-1" />
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50/60 rounded-lg transition-all backdrop-blur-sm"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="relative flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            
            {/* Status & Priority Selection */}
            <div className="grid grid-cols-2 gap-4">
              {/* Status Selection */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Status</label>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.values(TaskStatus).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleChange('status', status)}
                      className={`
                        px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap backdrop-blur-sm
                        ${editedTask.status === status 
                          ? 'bg-gray-900 text-white border-gray-900 shadow-sm' 
                          : 'bg-white/60 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-white/80'
                        }
                      `}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Selection */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Priority</label>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.values(Priority).map((priority) => (
                    <button
                      key={priority}
                      onClick={() => handleChange('priority', priority)}
                      className={`
                        px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap backdrop-blur-sm
                        ${editedTask.priority === priority 
                          ? 'bg-gray-900 text-white border-gray-900 shadow-sm' 
                          : 'bg-white/60 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-white/80'
                        }
                      `}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Is Routine Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isRoutine"
                checked={editedTask.isRoutine || false}
                onChange={(e) => handleChange('isRoutine', e.target.checked)}
                className="w-4 h-4 text-gray-900 rounded focus:ring-gray-500 border-gray-300"
              />
              <label htmlFor="isRoutine" className="text-sm text-gray-700 cursor-pointer">
                This is a routine task
              </label>
            </div>

            {/* Key Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Action Date */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  <HugeiconsIcon icon={Calendar01Icon} size={12} />
                  <span>Action Date</span>
                </div>
                <input 
                  type="date"
                  value={editedTask.actionDate ? editedTask.actionDate.split('T')[0] : ''}
                  onChange={(e) => handleChange('actionDate', e.target.value || undefined)}
                  className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg text-sm text-gray-700 border border-gray-200/60 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300/40 transition-all hover:bg-white/80"
                />
              </div>

              {/* Time Estimate */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  <HugeiconsIcon icon={Clock01Icon} size={12} />
                  <span>Time Estimate</span>
                </div>
                <input 
                  type="text"
                  value={editedTask.timeEstimate || ''}
                  onChange={(e) => handleChange('timeEstimate', e.target.value || undefined)}
                  placeholder="e.g. 30m"
                  className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg text-sm text-gray-700 border border-gray-200/60 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300/40 transition-all hover:bg-white/80"
                />
              </div>
            </div>

            {/* Tags Section */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <HugeiconsIcon icon={Tag01Icon} size={12} />
                <span>Tags & Categories</span>
              </div>
              <TagInput
                tags={editedTask.tags || []}
                onChange={(tags) => handleChange('tags', tags)}
                placeholder="Add tags..."
                allowCustom={true}
              />
            </div>

            {/* Routine Configuration Section */}
            {editedTask.isRoutine && (
              <>
                <div className="h-px bg-gray-200/60 w-full" />
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <HugeiconsIcon icon={RepeatIcon} size={12} />
                    <span>Routine Configuration</span>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">Frequency</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.values(RoutineFrequency).map((freq) => (
                        <button
                          key={freq}
                          onClick={() => handleRoutineConfigChange('frequency', freq)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all backdrop-blur-sm ${
                            routineConfig.frequency === freq
                              ? 'bg-purple-100 text-purple-700 border-purple-300 shadow-sm'
                              : 'bg-white/60 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-white/80'
                          }`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Days of Week (for Weekly) */}
                  {routineConfig.frequency === RoutineFrequency.Weekly && (
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-2 block">Days of Week</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {DAYS_OF_WEEK.map((day) => (
                          <button
                            key={day.value}
                            onClick={() => {
                              const currentDays = routineConfig.daysOfWeek || [];
                              const newDays = currentDays.includes(day.value)
                                ? currentDays.filter(d => d !== day.value)
                                : [...currentDays, day.value];
                              handleRoutineConfigChange('daysOfWeek', newDays);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all backdrop-blur-sm ${
                              routineConfig.daysOfWeek?.includes(day.value)
                                ? 'bg-purple-100 text-purple-700 border-purple-300 shadow-sm'
                                : 'bg-white/60 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-white/80'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Interval (for Custom) */}
                  {routineConfig.frequency === RoutineFrequency.Custom && (
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-2 block">Interval (days)</label>
                      <input
                        type="number"
                        min="1"
                        value={routineConfig.customInterval || ''}
                        onChange={(e) => handleRoutineConfigChange('customInterval', parseInt(e.target.value) || undefined)}
                        placeholder="e.g. 3"
                        className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg text-sm text-gray-700 border border-gray-200/60 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300/40 transition-all hover:bg-white/80"
                      />
                    </div>
                  )}

                  {/* Routine Time Estimate */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">Time Estimate</label>
                    <input
                      type="text"
                      value={routineConfig.timeEstimate || ''}
                      onChange={(e) => handleRoutineConfigChange('timeEstimate', e.target.value || undefined)}
                      placeholder="e.g. 30m"
                      className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg text-sm text-gray-700 border border-gray-200/60 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300/40 transition-all hover:bg-white/80"
                    />
                  </div>

                  {/* Goal */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">Goal</label>
                    <input
                      type="text"
                      value={routineConfig.goal || ''}
                      onChange={(e) => handleRoutineConfigChange('goal', e.target.value || undefined)}
                      placeholder="e.g. Build a daily habit"
                      className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg text-sm text-gray-700 border border-gray-200/60 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300/40 transition-all hover:bg-white/80"
                    />
                  </div>

                  {/* Track Streaks */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="trackStreaks"
                      checked={routineConfig.trackStreaks || false}
                      onChange={(e) => handleRoutineConfigChange('trackStreaks', e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                    />
                    <label htmlFor="trackStreaks" className="text-sm text-gray-700 cursor-pointer">
                      Track streaks
                    </label>
                  </div>

                  {/* Streak Display (if tracking) */}
                  {routineConfig.trackStreaks && task.routine && (
                    <div className="p-3 bg-purple-50/60 backdrop-blur-sm rounded-xl border border-purple-200/40">
                      <div className="text-xs font-semibold text-purple-900 mb-1.5">Streak Stats</div>
                      <div className="flex gap-4 text-xs text-purple-700">
                        {task.routine.currentStreak !== undefined && (
                          <div>
                            <span className="font-medium">Current:</span> {task.routine.currentStreak} days
                          </div>
                        )}
                        {task.routine.longestStreak !== undefined && (
                          <div>
                            <span className="font-medium">Best:</span> {task.routine.longestStreak} days
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Divider */}
            <div className="h-px bg-gray-200/60 w-full" />

            {/* Context & Metadata */}
            <div className="space-y-4">
              {/* Context */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  <HugeiconsIcon icon={File01Icon} size={12} />
                  <span>Context & Notes</span>
                </div>
                <textarea
                  value={editedTask.context || ''}
                  onChange={(e) => handleChange('context', e.target.value)}
                  placeholder="Add any relevant context, notes, or background info..."
                  rows={3}
                  className="w-full p-3 bg-white/60 backdrop-blur-sm rounded-xl text-sm text-gray-700 border border-gray-200/60 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300/40 resize-none transition-all hover:bg-white/80"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Participants */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    <HugeiconsIcon icon={UserGroupIcon} size={12} />
                    <span>Participants</span>
                  </div>
                  <input
                    type="text"
                    value={editedTask.participants?.join(', ') || ''}
                    onChange={(e) => handleChange('participants', e.target.value.split(',').map(p => p.trim()).filter(p => p))}
                    placeholder="e.g. John, Sarah"
                    className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg text-sm text-gray-700 border border-gray-200/60 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300/40 transition-all hover:bg-white/80"
                  />
                </div>

                {/* Occurred Date */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    <HugeiconsIcon icon={Calendar01Icon} size={12} />
                    <span>Occurred Date</span>
                  </div>
                  <input
                    type="date"
                    value={editedTask.occurredDate ? editedTask.occurredDate.split('T')[0] : ''}
                    onChange={(e) => handleChange('occurredDate', e.target.value)}
                    className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg text-sm text-gray-700 border border-gray-200/60 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300/40 transition-all hover:bg-white/80"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="relative p-4 border-t border-gray-100/50 bg-white/30 backdrop-blur-xl flex justify-between items-center">
           <div className="text-xs text-gray-500 px-2">
              Created {new Date(task.createdAt).toLocaleDateString()}
           </div>
           <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-white/60 backdrop-blur-sm transition-all border border-gray-200/60"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
};
