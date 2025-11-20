import React, { useState, useMemo } from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from './convex/_generated/api';
import { Id } from './convex/_generated/dataModel';
import { Task, FilterState, ExtractedTaskData, GeneratedViewData, TaskStatus } from './types';
import { FilterBar } from './components/FilterBar';
import { TaskCard } from './components/TaskCard';
import { SmartInput } from './components/SmartInput';
import { TaskDetailView } from './components/TaskDetailView';

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
    await createTask({
      title: data.title,
      isCompleted: false,
      status: data.status || TaskStatus.Active,
      tags: data.tags || [],
      actionDate: data.actionDate,
      createdAt: Date.now(),
      timeEstimate: data.timeEstimate,
      context: data.context,
      participants: data.participants,
      occurredDate: data.occurredDate,
      source: data.source,
    });
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

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-[#F3F4F6]">
      
      {/* Header */}
      <header className="flex items-center justify-between p-6 pb-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Master List</h1>
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

      {/* Filter Bar */}
      <FilterBar 
        activeFilters={filters} 
        setFilters={setFilters} 
        currentViewName={currentViewName}
        onClearView={handleClearView}
      />

      {/* Task List */}
      <main className="flex-1 px-4 pt-4 pb-32 overflow-y-auto no-scrollbar">
        <div className="space-y-1">
          {filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
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
                  {currentViewName 
                    ? `Your "${currentViewName}" view is empty!` 
                    : "Try adjusting your filters or add a new task."}
                </p>
            </div>
          )}
        </div>
      </main>

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