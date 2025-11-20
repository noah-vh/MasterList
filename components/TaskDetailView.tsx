import React, { useState, useEffect } from 'react';
import { Task, TaskStatus } from '../types';
import { X, Trash2, Calendar, Clock, Tag as TagIcon, Users, FileText, CheckCircle2, Hash } from 'lucide-react';
import { TagInput } from './TagInput';

interface TaskDetailViewProps {
  task: Task;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ task, onClose, onUpdate, onDelete }) => {
  const [editedTask, setEditedTask] = useState<Task>(task);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  const handleChange = (field: keyof Task, value: any) => {
    setEditedTask((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onUpdate(editedTask);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
    }
  };

  const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.Active]: 'text-blue-600 bg-blue-50 border-blue-100',
    [TaskStatus.WaitingOn]: 'text-yellow-600 bg-yellow-50 border-yellow-100',
    [TaskStatus.SomedayMaybe]: 'text-gray-500 bg-gray-50 border-gray-100',
    [TaskStatus.Archived]: 'text-slate-500 bg-slate-50 border-slate-100',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-white/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[editedTask.status]}`}>
              {editedTask.status}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
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
            
            {/* Title Input */}
            <div>
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
            </div>

            {/* Status Selection */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
               {Object.values(TaskStatus).map((status) => (
                 <button
                   key={status}
                   onClick={() => handleChange('status', status)}
                   className={`
                     px-4 py-2 rounded-lg text-sm font-medium border transition-all whitespace-nowrap
                     ${editedTask.status === status 
                       ? 'bg-gray-900 text-white border-gray-900 shadow-sm' 
                       : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                     }
                   `}
                 >
                   {status}
                 </button>
               ))}
            </div>

            {/* Tags Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Hash className="w-4 h-4 text-gray-400" />
                <span>Tags</span>
              </div>
              <div className="pl-6">
                <TagInput
                  tags={editedTask.tags || []}
                  onChange={(tags) => handleChange('tags', tags)}
                  placeholder="Add tags..."
                  allowCustom={true}
                />
              </div>
            </div>

            {/* Key Details Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Action Date */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <Calendar className="w-4 h-4 text-gray-400" />
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
                 <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <Clock className="w-4 h-4 text-gray-400" />
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

            {/* Divider */}
            <div className="h-px bg-gray-100 w-full" />

            {/* Context & Metadata */}
            <div className="space-y-6">
              {/* Context */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <FileText className="w-4 h-4 text-gray-400" />
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
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <Users className="w-4 h-4 text-gray-400" />
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
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <Calendar className="w-4 h-4 text-gray-400" />
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
