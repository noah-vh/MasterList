import React, { useState, useEffect } from 'react';
import { RoutineTask, TaskStatus, RoutineFrequency, Routine } from '../types';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Delete01Icon, Calendar01Icon, Clock01Icon, Tag01Icon, UserGroupIcon, File01Icon, CheckmarkCircle01Icon, RepeatIcon } from '@hugeicons/core-free-icons';
import { TagInput } from './TagInput';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { DAYS_OF_WEEK } from '../constants';

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

  const existingRoutine = useQuery(
    api.routines.getByTaskId,
    task.isRoutine ? { taskId: task.id as Id<"tasks"> } : "skip"
  );
  const createRoutine = useMutation(api.routines.create);
  const updateRoutine = useMutation(api.routines.update);
  const deleteRoutineMutation = useMutation(api.routines.deleteRoutine);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl w-full max-w-2xl shadow-2xl border border-white/50 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header Actions */}
        <div className="flex items-center justify-end px-6 py-4 border-b border-gray-50 bg-white/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <button 
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Delete Task"
            >
              <HugeiconsIcon icon={Delete01Icon} size={16} />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            
            {/* Title & Status */}
            <div className="flex gap-4">
               <div className="pt-3 shrink-0">
                  <div className={`w-3 h-3 rounded-full ${statusDotColors[editedTask.status]}`} />
               </div>
               <div className="flex-1">
                  <textarea
                    value={editedTask.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    rows={1}
                    className="w-full text-xl font-medium text-gray-900 placeholder-gray-300 border-none p-0 focus:ring-0 resize-none bg-transparent leading-normal"
                    placeholder="Task title..."
                    style={{ minHeight: '40px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                  
                  {/* Status Selection (Inline below title) */}
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1 no-scrollbar">
                    {Object.values(TaskStatus).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleChange('status', status)}
                        className={`
                          px-3 py-1 rounded text-xs font-medium border transition-all whitespace-nowrap
                          ${editedTask.status === status 
                            ? 'bg-gray-900 text-white border-gray-900 shadow-sm' 
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  
                  {/* Is Routine Toggle */}
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="checkbox"
                      id="isRoutine"
                      checked={editedTask.isRoutine || false}
                      onChange={(e) => handleChange('isRoutine', e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="isRoutine" className="text-sm text-gray-700 cursor-pointer">
                      This is a routine task
                    </label>
                  </div>
               </div>
            </div>

            {/* Key Details Grid (Icons) */}
            <div className="grid grid-cols-2 gap-6 pl-7">
              {/* Action Date */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <HugeiconsIcon icon={Calendar01Icon} size={14} />
                  <span>Action Date</span>
                </div>
                <input 
                  type="date"
                  value={editedTask.actionDate ? editedTask.actionDate.split('T')[0] : ''}
                  onChange={(e) => handleChange('actionDate', e.target.value || undefined)}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-gray-100"
                />
              </div>

              {/* Time Estimate */}
              <div className="space-y-2">
                 <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <HugeiconsIcon icon={Clock01Icon} size={14} />
                  <span>Time Estimate</span>
                </div>
                <input 
                  type="text"
                  value={editedTask.timeEstimate || ''}
                  onChange={(e) => handleChange('timeEstimate', e.target.value || undefined)}
                  placeholder="e.g. 30m"
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-gray-100"
                />
              </div>
            </div>

            {/* Tags Section */}
            <div className="space-y-2 pl-7">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <HugeiconsIcon icon={Tag01Icon} size={14} />
                <span>Tags & Categories</span>
              </div>
              <div>
                <TagInput
                  tags={editedTask.tags || []}
                  onChange={(tags) => handleChange('tags', tags)}
                  placeholder="Add tags..."
                  allowCustom={true}
                />
              </div>
            </div>

            {/* Routine Configuration Section */}
            {editedTask.isRoutine && (
              <>
                <div className="h-px bg-gray-100 w-full" />
                <div className="space-y-6 pl-7">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <HugeiconsIcon icon={RepeatIcon} size={14} />
                    <span>Routine Configuration</span>
                  </div>

                  {/* Frequency */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Frequency</label>
                    <div className="flex gap-2 flex-wrap">
                      {Object.values(RoutineFrequency).map((freq) => (
                        <button
                          key={freq}
                          onClick={() => handleRoutineConfigChange('frequency', freq)}
                          className={`px-3 py-1.5 rounded text-sm font-medium border transition-all ${
                            routineConfig.frequency === freq
                              ? 'bg-purple-100 text-purple-700 border-purple-300'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Days of Week (for Weekly) */}
                  {routineConfig.frequency === RoutineFrequency.Weekly && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Days of Week</label>
                      <div className="flex gap-2 flex-wrap">
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
                            className={`px-3 py-1.5 rounded text-sm font-medium border transition-all ${
                              routineConfig.daysOfWeek?.includes(day.value)
                                ? 'bg-purple-100 text-purple-700 border-purple-300'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Interval (days)</label>
                      <input
                        type="number"
                        min="1"
                        value={routineConfig.customInterval || ''}
                        onChange={(e) => handleRoutineConfigChange('customInterval', parseInt(e.target.value) || undefined)}
                        placeholder="e.g. 3"
                        className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border-none focus:ring-2 focus:ring-purple-500/20 transition-all hover:bg-gray-100"
                      />
                    </div>
                  )}

                  {/* Routine Time Estimate */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Time Estimate</label>
                    <input
                      type="text"
                      value={routineConfig.timeEstimate || ''}
                      onChange={(e) => handleRoutineConfigChange('timeEstimate', e.target.value || undefined)}
                      placeholder="e.g. 30m"
                      className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border-none focus:ring-2 focus:ring-purple-500/20 transition-all hover:bg-gray-100"
                    />
                  </div>

                  {/* Goal */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Goal</label>
                    <input
                      type="text"
                      value={routineConfig.goal || ''}
                      onChange={(e) => handleRoutineConfigChange('goal', e.target.value || undefined)}
                      placeholder="e.g. Build a daily habit"
                      className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border-none focus:ring-2 focus:ring-purple-500/20 transition-all hover:bg-gray-100"
                    />
                  </div>

                  {/* Track Streaks */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="trackStreaks"
                      checked={routineConfig.trackStreaks || false}
                      onChange={(e) => handleRoutineConfigChange('trackStreaks', e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="trackStreaks" className="text-sm text-gray-700 cursor-pointer">
                      Track streaks
                    </label>
                  </div>

                  {/* Streak Display (if tracking) */}
                  {routineConfig.trackStreaks && task.routine && (
                    <div className="space-y-2 p-3 bg-purple-50 rounded-lg">
                      <div className="text-sm font-medium text-purple-900">Streak Stats</div>
                      <div className="flex gap-4 text-sm text-purple-700">
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
            <div className="h-px bg-gray-100 w-full" />

            {/* Context & Metadata */}
            <div className="space-y-6 pl-7">
              {/* Context */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <HugeiconsIcon icon={File01Icon} size={14} />
                  <span>Context & Notes</span>
                </div>
                <textarea
                  value={editedTask.context || ''}
                  onChange={(e) => handleChange('context', e.target.value)}
                  placeholder="Add any relevant context, notes, or background info..."
                  rows={4}
                  className="w-full p-3 bg-gray-50 rounded-xl text-sm text-gray-700 border-none focus:ring-2 focus:ring-blue-500/20 resize-none transition-all hover:bg-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Participants */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <HugeiconsIcon icon={UserGroupIcon} size={14} />
                    <span>Participants</span>
                  </div>
                  <input
                    type="text"
                    value={editedTask.participants?.join(', ') || ''}
                    onChange={(e) => handleChange('participants', e.target.value.split(',').map(p => p.trim()).filter(p => p))}
                    placeholder="e.g. John, Sarah"
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-gray-100"
                  />
                </div>

                {/* Occurred Date */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <HugeiconsIcon icon={Calendar01Icon} size={14} />
                    <span>Occurred Date</span>
                  </div>
                  <input
                    type="date"
                    value={editedTask.occurredDate ? editedTask.occurredDate.split('T')[0] : ''}
                    onChange={(e) => handleChange('occurredDate', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-gray-100"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-50 bg-white flex justify-between items-center">
           <div className="text-xs text-gray-400 px-2">
              Created {new Date(task.createdAt).toLocaleDateString()}
           </div>
           <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
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
