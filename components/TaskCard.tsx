import React, { useMemo } from 'react';
import { Task, TaskStatus } from '../types';
import { getTagMetadata, TAG_CATEGORIES } from '../constants';
import { CheckCircle2, Circle, Clock, Calendar, User } from 'lucide-react';
import { Badge } from './Badge';

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

  return (
    <div 
      onClick={() => onClick(task.id)}
      className={`
      group relative bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 
      transition-all duration-200 hover:shadow-md hover:border-gray-200 cursor-pointer
      ${task.isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}
    `}>
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
                <div className="flex items-center gap-1" title="Action Date">
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
  );
};
