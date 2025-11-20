import React, { useMemo } from 'react';
import { Task, TaskStatus } from '../types';
import { getTagMetadata, TAG_CATEGORIES } from '../constants';
import { CheckCircle2, Circle, Clock, Calendar } from 'lucide-react';
import { Badge } from './Badge';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onClick: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onClick }) => {
  // Group tags by category
  const groupedTags = useMemo(() => {
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
        grouped.domains.push(tag); // Custom tags go to domains
      }
    });
    
    return grouped;
  }, [task.tags]);

  const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.Active]: 'bg-blue-100 text-blue-700',
    [TaskStatus.WaitingOn]: 'bg-yellow-100 text-yellow-700',
    [TaskStatus.SomedayMaybe]: 'bg-gray-100 text-gray-700',
    [TaskStatus.Archived]: 'bg-slate-100 text-slate-700',
  };

  return (
    <div 
      onClick={() => onClick(task.id)}
      className={`
      group relative bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 
      transition-all duration-200 hover:shadow-md hover:border-gray-200 cursor-pointer
      ${task.isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}
    `}>
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id);
          }}
          className="mt-1 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
        >
          {task.isCompleted ? (
            <CheckCircle2 className="w-6 h-6 text-gray-400" />
          ) : (
            <Circle className="w-6 h-6" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className={`text-base font-medium text-gray-900 mb-2 truncate ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>
            {task.title}
          </h3>

          <div className="space-y-2">
            {/* Status and Tags Row */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Status Badge */}
              {!task.isCompleted && (
                <Badge 
                  label={task.status} 
                  className={statusColors[task.status]} 
                />
              )}

              {/* Tags grouped by category */}
              {Object.entries(groupedTags).map(([category, categoryTags]) => 
                categoryTags.length > 0 && (
                  <React.Fragment key={category}>
                    {categoryTags.map(tag => {
                      const metadata = getTagMetadata(tag);
                      return (
                        <Badge
                          key={tag}
                          label={metadata.label}
                          className={metadata.color}
                        />
                      );
                    })}
                  </React.Fragment>
                )
              )}

              {/* Participants */}
              {task.participants && task.participants.length > 0 && (
                <div className="flex gap-1">
                  {task.participants.slice(0, 2).map((person, i) => (
                    <Badge key={i} label={person} className="bg-purple-100 text-purple-700 text-xs" />
                  ))}
                  {task.participants.length > 2 && (
                    <Badge label={`+${task.participants.length - 2}`} className="bg-purple-100 text-purple-700 text-xs" />
                  )}
                </div>
              )}

              {/* Source Indicator */}
              {task.source && (
                <Badge
                  label={
                    task.source.type === 'voice' ? '🎤' :
                    task.source.type === 'email' ? '✉️' :
                    task.source.type === 'transcript' ? '📝' :
                    '📱'
                  }
                  className="bg-gray-100 text-gray-700 text-xs"
                  title={`Captured from ${task.source.type}`}
                />
              )}
            </div>

            {/* Context Row */}
            {task.context && (
              <p className="text-sm text-gray-600 line-clamp-2" title={task.context}>
                {task.context}
              </p>
            )}

            {/* Metadata Row */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {task.actionDate && (
                <div className="flex items-center gap-1" title="Action Date">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(task.actionDate).toLocaleDateString()}</span>
                </div>
              )}
              {task.timeEstimate && (
                <div className="flex items-center gap-1" title="Time Estimate">
                  <Clock className="w-3 h-3" />
                  <span>{task.timeEstimate}</span>
                </div>
              )}
              {task.occurredDate && (
                <div className="flex items-center gap-1" title="Occurred Date">
                  <span className="text-gray-400">📅</span>
                  <span>{new Date(task.occurredDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};