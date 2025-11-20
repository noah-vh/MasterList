import React, { useState } from 'react';
import { ExtractedTaskData, TaskStatus } from '../types';
import { X, Calendar, Clock, Hash, Users, FileText } from 'lucide-react';
import { TagInput } from './TagInput';

interface TaskCreateModalProps {
  initialTitle: string;
  onSave: (data: ExtractedTaskData) => void;
  onClose: () => void;
}

const statusDotColors: Record<TaskStatus, string> = {
  [TaskStatus.Active]: 'bg-blue-500 shadow-sm shadow-blue-200',
  [TaskStatus.WaitingOn]: 'bg-yellow-500 shadow-sm shadow-yellow-200',
  [TaskStatus.SomedayMaybe]: 'bg-gray-400',
  [TaskStatus.Archived]: 'bg-slate-400',
};

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({ initialTitle, onSave, onClose }) => {
  const [taskData, setTaskData] = useState<ExtractedTaskData>({
    title: initialTitle,
    status: TaskStatus.Active,
    tags: [],
  });

  const handleChange = (field: keyof ExtractedTaskData, value: any) => {
    setTaskData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!taskData.title || taskData.title.trim() === '') {
      alert('Please enter a task title');
      return;
    }
    onSave(taskData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header Actions */}
        <div className="flex items-center justify-end px-6 py-4 border-b border-gray-50 bg-white/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            
            {/* Title & Status */}
            <div className="flex gap-4">
               <div className="pt-3 shrink-0">
                  <div className={`w-3 h-3 rounded-full ${statusDotColors[taskData.status || TaskStatus.Active]}`} />
               </div>
               <div className="flex-1">
                  <textarea
                    value={taskData.title}
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
                          ${(taskData.status || TaskStatus.Active) === status 
                            ? 'bg-gray-900 text-white border-gray-900 shadow-sm' 
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            {/* Key Details Grid (Icons) */}
            <div className="grid grid-cols-2 gap-6 pl-7">
              {/* Action Date */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Action Date</span>
                </div>
                <input 
                  type="date"
                  value={taskData.actionDate || ''}
                  onChange={(e) => handleChange('actionDate', e.target.value || undefined)}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-gray-100"
                />
              </div>

              {/* Time Estimate */}
              <div className="space-y-2">
                 <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Time Estimate</span>
                </div>
                <input 
                  type="text"
                  value={taskData.timeEstimate || ''}
                  onChange={(e) => handleChange('timeEstimate', e.target.value || undefined)}
                  placeholder="e.g. 30m"
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-gray-100"
                />
              </div>
            </div>

            {/* Tags Section */}
            <div className="space-y-2 pl-7">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <Hash className="w-3.5 h-3.5" />
                <span>Tags & Categories</span>
              </div>
              <div>
                <TagInput
                  tags={taskData.tags || []}
                  onChange={(tags) => handleChange('tags', tags)}
                  placeholder="Add tags..."
                  allowCustom={true}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 w-full" />

            {/* Context & Metadata */}
            <div className="space-y-6 pl-7">
              {/* Context */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Context & Notes</span>
                </div>
                <textarea
                  value={taskData.context || ''}
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
                    <Users className="w-3.5 h-3.5" />
                    <span>Participants</span>
                  </div>
                  <input
                    type="text"
                    value={taskData.participants?.join(', ') || ''}
                    onChange={(e) => handleChange('participants', e.target.value.split(',').map(p => p.trim()).filter(p => p))}
                    placeholder="e.g. John, Sarah"
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-gray-100"
                  />
                </div>

                {/* Occurred Date */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Occurred Date</span>
                  </div>
                  <input
                    type="date"
                    value={taskData.occurredDate || ''}
                    onChange={(e) => handleChange('occurredDate', e.target.value || undefined)}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-gray-100"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-50 bg-white flex justify-end items-center">
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
              Create Task
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
};

