import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Entry, Task } from '../types';
import { EntryCard } from './EntryCard';
import { Id } from '../convex/_generated/dataModel';
import { Menu } from 'lucide-react';

interface EntriesViewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement>;
  showContentEntries?: boolean;
  showTaskNotifications?: boolean;
  activeChatEntryId?: string | null;
  onActiveChatChange?: (entryId: string | null) => void;
  searchQuery?: string;
}

// Helper to convert Convex entry to frontend Entry type
const convexEntryToEntry = (convexEntry: any): Entry => {
  return {
    id: convexEntry._id,
    content: convexEntry.content,
    createdAt: convexEntry.createdAt,
    updatedAt: convexEntry.updatedAt,
    entryType: convexEntry.entryType,
    activityType: convexEntry.activityType,
    linkedTaskId: convexEntry.linkedTaskId,
    linkedTaskIds: convexEntry.linkedTaskIds,
    tags: convexEntry.tags,
    hasAttachment: convexEntry.hasAttachment,
    // Content logging fields
    contentType: convexEntry.contentType,
    sourceUrl: convexEntry.sourceUrl,
    sourceImageId: convexEntry.sourceImageId,
    analyzedContent: convexEntry.analyzedContent,
    ogMetadata: convexEntry.ogMetadata,
    classification: convexEntry.classification,
    chatThread: convexEntry.chatThread,
  };
};

// Group entries by date
const groupEntriesByDate = (entries: Entry[]): Map<string, Entry[]> => {
  const groups = new Map<string, Entry[]>();
  
  entries.forEach(entry => {
    const date = new Date(entry.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0);
    
    let dateKey: string;
    const diffTime = today.getTime() - entryDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      dateKey = 'Today';
    } else if (diffDays === 1) {
      dateKey = 'Yesterday';
    } else {
      // Full date format: "Wednesday, October 08, 2025"
      dateKey = entryDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(entry);
  });
  
  return groups;
};

export const EntriesView: React.FC<EntriesViewProps> = ({ 
  tasks, 
  onTaskClick,
  scrollRef,
  showContentEntries = true,
  showTaskNotifications = true,
  activeChatEntryId,
  onActiveChatChange,
  searchQuery = '',
}) => {
  // All hooks must be called at the top, before any conditional returns
  const entries = useQuery(api.entries.list);
  const createEntry = useMutation(api.entries.create);
  const updateEntry = useMutation(api.entries.update);
  const updateContentEntry = useMutation(api.entries.updateContentEntry);
  const deleteEntry = useMutation(api.entries.deleteEntry);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [draftContent, setDraftContent] = useState('');
  
  // Convert Convex entries to frontend Entry type and filter by visibility toggles and search
  const frontendEntries = useMemo(() => {
    if (!entries || !Array.isArray(entries)) return [];
    const allEntries = entries.map(convexEntryToEntry);
    
    // Filter entries based on visibility toggles and search query
    return allEntries.filter(entry => {
      // Filter content entries
      if (entry.entryType === 'content' && !showContentEntries) {
        return false;
      }
      // Filter task notifications (activity entries)
      if (entry.entryType === 'activity' && !showTaskNotifications) {
        return false;
      }
      
      // Apply search query filter (case-insensitive search in entry content)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const contentMatch = entry.content.toLowerCase().includes(query);
        const analyzedContentMatch = entry.analyzedContent?.toLowerCase().includes(query) || false;
        const classificationMatch = entry.classification?.category?.toLowerCase().includes(query) ||
          entry.classification?.topics?.some(topic => topic.toLowerCase().includes(query)) ||
          entry.classification?.keyPoints?.some(point => point.toLowerCase().includes(query)) || false;
        
        if (!contentMatch && !analyzedContentMatch && !classificationMatch) {
          return false;
        }
      }
      
      // Always show manual entries (if they pass search)
      return true;
    });
  }, [entries, showContentEntries, showTaskNotifications, searchQuery]);

  // Group entries by date (must be before conditional return)
  const groupedEntries = useMemo(() => {
    return groupEntriesByDate(frontendEntries);
  }, [frontendEntries]);

  // Sort date groups - chronological order (oldest first, newest last)
  // Today and Yesterday should be at the end
  const sortedDateKeys = useMemo(() => {
    const keys = Array.from(groupedEntries.keys()) as string[];
    const todayKey = keys.find(k => k === 'Today');
    const yesterdayKey = keys.find(k => k === 'Yesterday');
    const otherKeys = keys.filter(k => k !== 'Today' && k !== 'Yesterday');
    
    // Sort other keys chronologically (parse dates)
    const sortedOtherKeys = otherKeys.sort((a, b) => {
      try {
        const dateA = new Date(a as string);
        const dateB = new Date(b as string);
        return dateA.getTime() - dateB.getTime(); // Oldest first
      } catch {
        return (a as string).localeCompare(b as string);
      }
    });
    
    // Combine: other dates first, then Yesterday, then Today (oldest to newest)
    return [...sortedOtherKeys, ...(yesterdayKey ? [yesterdayKey] : []), ...(todayKey ? [todayKey] : [])];
  }, [groupedEntries]);
  
  // Auto-scroll to bottom when entries change (must be before conditional return)
  useEffect(() => {
    if (scrollRef?.current && frontendEntries.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [frontendEntries.length, scrollRef]);
  
  // Handle loading state (after all hooks)
  if (entries === undefined) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <div className="text-gray-400 text-sm">Loading entries...</div>
      </div>
    );
  }
  
  const entriesArray = Array.isArray(entries) ? entries : [];

  // Get task title for activity log entries
  const getTaskTitle = (taskId: string | undefined): string | undefined => {
    if (!taskId) return undefined;
    const task = tasks.find(t => t.id === taskId);
    return task?.title;
  };

  const handleSubmit = async (content: string) => {
    if (editingEntry) {
      // Update existing entry
      await updateEntry({
        id: editingEntry.id as Id<"entries">,
        content,
      });
      setEditingEntry(null);
      setDraftContent('');
    } else {
      // Create new entry
      await createEntry({
        content,
      });
      // Auto-scroll to bottom after creating new entry
      setTimeout(() => {
        if (scrollRef?.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const handleAutoSave = async (content: string) => {
    if (editingEntry) {
      await updateEntry({
        id: editingEntry.id as Id<"entries">,
        content,
      });
    }
  };

  const handleEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setDraftContent(entry.content);
  };

  const handleDelete = async (entryId: string) => {
    if (confirm('Delete this entry?')) {
      await deleteEntry({ id: entryId as Id<"entries"> });
      if (editingEntry?.id === entryId) {
        setEditingEntry(null);
        setDraftContent('');
      }
    }
  };

  const handleContentEntryUpdate = async (updatedEntry: Entry) => {
    if (updatedEntry.classification) {
      await updateContentEntry({
        id: updatedEntry.id as Id<"entries">,
        classification: updatedEntry.classification,
      });
    }
  };

  const handleTaskClick = (taskId: string) => {
    if (onTaskClick) {
      onTaskClick(taskId);
    }
  };


  return (
    <div className="flex flex-col h-full w-full">
      {/* Entries List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-28 pb-32 no-scrollbar"
        style={{ 
          minHeight: 0,
          paddingTop: '7rem' // Ensure content starts below header/filter bar
        }}
      >
        {sortedDateKeys.length > 0 ? (
          <div className="space-y-10">
            {sortedDateKeys.map((dateKey, dateIndex) => {
              const dateEntries = groupedEntries.get(dateKey)!;
              const fullDate = dateKey === 'Today' 
                ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                : dateKey === 'Yesterday'
                ? new Date(Date.now() - 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                : dateKey;
              
              return (
                <div key={dateKey} className="space-y-4">
                  {/* Date Header - Simple text header */}
                  <div className="pt-2 pb-1 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {fullDate}
                    </h2>
                  </div>
                  
                  {/* Entries for this date */}
                  <div className="space-y-1">
                    {dateEntries.map((entry, entryIndex) => {
                      const isEditing = editingEntry?.id === entry.id;
                      
                      // Determine if we should show timestamp (iMessage-style)
                      // Show timestamp if:
                      // 1. First entry of the day
                      // 2. More than 10 minutes gap from previous entry
                      const isFirstEntry = entryIndex === 0;
                      const previousEntry = entryIndex > 0 ? dateEntries[entryIndex - 1] : null;
                      const timeGap = previousEntry 
                        ? (entry.createdAt - previousEntry.createdAt) / (1000 * 60) // minutes
                        : Infinity;
                      const showTimestamp = isFirstEntry || timeGap > 10; // 10 minute threshold
                      
                      return (
                        <div key={entry.id}>
                          {isEditing ? (
                            <div className="py-2">
                              <textarea
                                value={draftContent}
                                onChange={(e) => setDraftContent(e.target.value)}
                                className="w-full resize-none border border-blue-300 rounded-lg p-3 outline-none text-base text-gray-900 mb-2 focus:ring-2 focus:ring-blue-500 leading-relaxed"
                                rows={4}
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingEntry(null);
                                    setDraftContent('');
                                  }}
                                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 font-medium rounded hover:bg-gray-100 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSubmit(draftContent)}
                                  className="px-3 py-1.5 text-xs bg-gray-900 text-white font-medium rounded hover:bg-gray-800 transition-colors"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <EntryCard
                              entry={entry}
                              taskTitle={entry.linkedTaskId ? getTaskTitle(entry.linkedTaskId) : undefined}
                              onTaskClick={handleTaskClick}
                              onEdit={entry.entryType === 'manual' ? handleEdit : undefined}
                              onDelete={handleDelete}
                              onContentUpdate={entry.entryType === 'content' ? handleContentEntryUpdate : undefined}
                              showTimestamp={showTimestamp}
                              isFirstInGroup={isFirstEntry}
                              isChatActive={activeChatEntryId === entry.id}
                              onChatActiveChange={(isActive) => {
                                if (onActiveChatChange) {
                                  onActiveChatChange(isActive ? entry.id : null);
                                }
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-20 text-center opacity-50">
            <div className="bg-gray-200 p-4 rounded-full mb-4">
              <Menu className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No entries yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Start writing or create a task to see activity here
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

