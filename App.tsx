import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Bell, Menu, Settings, LogOut } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from './convex/_generated/api';
import { Id } from './convex/_generated/dataModel';
import { Task, FilterState, ExtractedTaskData, GeneratedViewData, TaskStatus, RoutineTask, TimeBlockTemplate, RoutineFrequency } from './types';
import { TAG_CATEGORIES } from './constants';
import { FilterBar } from './components/FilterBar';
import { TaskCard } from './components/TaskCard';
import { SmartInput } from './components/SmartInput';
import { TaskDetailView } from './components/TaskDetailView';
import { TimelineView } from './components/TimelineView';
import { EntriesView } from './components/EntriesView';
import { LibraryView } from './components/LibraryView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsDialog } from './components/SettingsDialog';
import { LoginForm, getAuthToken, clearAuthToken } from './components/auth/LoginForm';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to convert Convex task to frontend Task type
const convexTaskToTask = (convexTask: any): Task => {
  return {
    id: convexTask._id,
    title: convexTask.title,
    isCompleted: convexTask.isCompleted,
    status: convexTask.status,
    priority: convexTask.priority,
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
    isRoutine: convexTask.isRoutine,
  };
};

const App: React.FC = () => {
  const token = getAuthToken();
  const currentUser = useQuery(api.auth.getCurrentUser, token ? { token } : "skip");
  const signOutMutation = useMutation(api.auth.signOut);
  const migrateData = useMutation(api.migrations.migrateExistingDataToUser);
  const [hasMigrated, setHasMigrated] = useState(false);
  const [migrationChecked, setMigrationChecked] = useState(false);

  // All hooks must be called before any conditional returns
  // Use "skip" for queries when not authenticated
  const isAuthenticated = !!(token && currentUser);
  
  const convexTasks = useQuery(api.tasks.list, isAuthenticated ? { token: token! } : "skip") ?? [];
  const routinesData = useQuery(api.routines.list, isAuthenticated ? { token: token! } : "skip") ?? [];
  const templates = useQuery(api.timeBlocks.listTemplates, isAuthenticated ? { token: token! } : "skip") ?? [];
  const defaultTemplate = useQuery(api.timeBlocks.getDefaultTemplate, isAuthenticated ? { token: token! } : "skip");
  const createTemplate = useMutation(api.timeBlocks.createTemplate);
  
  // Merge tasks with routine data
  const tasks = useMemo(() => {
    const baseTasks = convexTasks.map(convexTaskToTask);
    return baseTasks.map(task => {
      const routineData = routinesData.find((r: any) => r.task?._id === task.id);
      if (routineData && task.isRoutine) {
        const routineTask: RoutineTask = {
          ...task,
          routine: {
            id: routineData._id,
            taskId: task.id,
            frequency: routineData.frequency as RoutineFrequency,
            daysOfWeek: routineData.daysOfWeek,
            customInterval: routineData.customInterval,
            timeEstimate: routineData.timeEstimate,
            goal: routineData.goal,
            trackStreaks: routineData.trackStreaks,
            lastCompletedDate: routineData.lastCompletedDate,
            currentStreak: routineData.currentStreak,
            longestStreak: routineData.longestStreak,
            completionHistory: routineData.completionHistory,
          },
        };
        return routineTask;
      }
      return task;
    });
  }, [convexTasks, routinesData]);
  
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const toggleTask = useMutation(api.tasks.toggleComplete);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const createWithSubtasks = useMutation(api.tasks.createWithSubtasks);
  const createEntry = useMutation(api.entries.create);

  const [filters, setFilters] = useState<FilterState>({
    tags: [],
    status: [],
    dateScope: 'All'
  });
  const [currentViewName, setCurrentViewName] = useState<string | undefined>(undefined);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'library' | 'entries' | 'today' | 'master' | 'routines' | 'timeline'>('entries');
  const [previousView, setPreviousView] = useState<'library' | 'entries' | 'today' | 'master' | 'routines' | 'timeline' | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showRoutinesFilter, setShowRoutinesFilter] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [showContentEntries, setShowContentEntries] = useState(true);
  const [showTaskNotifications, setShowTaskNotifications] = useState(true);
  const [activeChatEntryId, setActiveChatEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Swipe navigation state
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const gestureLockRef = useRef<'horizontal' | 'vertical' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Scroll position tracking for each view
  const entriesScrollRef = useRef<HTMLDivElement>(null);
  const todayScrollRef = useRef<HTMLElement>(null);
  const masterScrollRef = useRef<HTMLElement>(null);
  const routinesScrollRef = useRef<HTMLElement>(null);
  const timelineScrollRef = useRef<HTMLElement>(null);
  const libraryScrollRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<{ entries: number; today: number; master: number; routines: number; timeline: number; library: number }>({ 
    entries: 0,
    today: 0, 
    master: 0, 
    routines: 0, 
    timeline: 0,
    library: 0
  });
  
  // Check if we need to migrate data on first login
  // Allow re-running migration by checking localStorage
  useEffect(() => {
    if (currentUser && token) {
      const lastMigration = localStorage.getItem('lastMigrationRun');
      const shouldRunMigration = !migrationChecked || 
        (lastMigration && Date.now() - parseInt(lastMigration) > 60000); // Allow re-run after 1 minute
      
      if (shouldRunMigration) {
        setMigrationChecked(true);
        // Run migration in the background
        migrateData({ token }).then((result) => {
          console.log('Migration completed:', result);
          setHasMigrated(true);
          localStorage.setItem('lastMigrationRun', Date.now().toString());
        }).catch((err) => {
          console.error('Migration error:', err);
          setHasMigrated(true);
        });
      }
    }
  }, [currentUser, migrationChecked, migrateData, token]);

  // Set default template on mount, create one if none exists
  useEffect(() => {
    if (defaultTemplate && !selectedTemplateId) {
      setSelectedTemplateId(defaultTemplate._id);
    } else if (!defaultTemplate && templates.length === 0 && currentView === 'timeline' && isAuthenticated) {
      // Create default template if none exists and we're on timeline view
      createTemplate({ name: 'Default', token: token! }).then((templateId) => {
        setSelectedTemplateId(templateId);
      });
    }
  }, [defaultTemplate, selectedTemplateId, templates.length, currentView, createTemplate, isAuthenticated, token]);
  
  const handleSignOut = async () => {
    if (token) {
      try {
        await signOutMutation({ token });
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
    clearAuthToken();
    window.location.reload();
  };

// Shared spring transition for unified feel
const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 350,
  damping: 25,
  mass: 0.5,
};

  // Helper to get view order for animation direction
  const getViewOrder = (view: typeof currentView): number => {
    const order: Record<typeof view, number> = {
      library: 0,
      entries: 1,
      today: 2,
      master: 3,
      routines: 4,
      timeline: 5,
    };
    return order[view];
  };

  // Helper to get x offset for inactive tabs based on direction
  const getInactiveXOffset = (view: typeof currentView): number => {
    if (currentView === view) return 0;
    const currentOrder = getViewOrder(currentView);
    const viewOrder = getViewOrder(view);
    // If view is after current (forward), offset to the right
    // If view is before current (backward), offset to the left
    return viewOrder > currentOrder ? 15 : -15;
};

  // Helper to check if date is today
  const isToday = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return dateStr === todayStr;
  };

  // Today view filtering - tasks with actionDate = today, plus filter bar filters
  const todayTasks = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const filtered = tasks.filter(task => {
      // First filter: must have actionDate = today
      if (!task.actionDate) return false;
      const taskDateStr = task.actionDate.includes('T') 
        ? task.actionDate.split('T')[0] 
        : task.actionDate;
      if (taskDateStr !== todayStr) return false;
      
      // Apply search query filter (case-insensitive search in task title)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        if (!task.title.toLowerCase().includes(query)) return false;
      }
      
      // Apply filter bar filters
      // 1. Status filter
      const matchesStatus = filters.status.length === 0 || filters.status.includes(task.status);
      if (!matchesStatus) return false;
      
      // 2. Tag filter (AND logic - task must have ALL selected tags)
      const matchesTags = filters.tags.length === 0 || 
        filters.tags.every(tag => task.tags.includes(tag));
      if (!matchesTags) return false;
      
      // 3. Date scope filter (for today view, this is less relevant but we'll apply it)
      // Note: Today view already filters by today's date, so dateScope filter is mostly redundant
      // but we'll respect it for consistency
      let matchesDate = true;
      if (filters.dateScope !== 'All') {
        const targetDate = task.actionDate ? new Date(task.actionDate) : new Date(task.createdAt);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        
        const isSameDay = (d1: Date, d2: Date) => 
          d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() === d2.getDate();

        if (filters.dateScope === 'Today') {
          matchesDate = isSameDay(targetDate, todayDate);
        } else if (filters.dateScope === 'ThisWeek') {
          const nextWeek = new Date(todayDate);
          nextWeek.setDate(todayDate.getDate() + 7);
          matchesDate = targetDate >= todayDate && targetDate <= nextWeek;
        } else if (filters.dateScope === 'Overdue') {
          matchesDate = targetDate < todayDate && !isSameDay(targetDate, todayDate) && !task.isCompleted;
        }
      }
      
      return matchesStatus && matchesTags && matchesDate;
    });
    
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
  }, [tasks, filters, searchQuery]);

  // Routines view filtering - show only routine tasks
  const routinesTasks = useMemo(() => {
    return tasks.filter(task => {
      // Must be a routine task
      if (!task.isRoutine) return false;
      
      // Apply search query filter (case-insensitive search in task title)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        if (!task.title.toLowerCase().includes(query)) return false;
      }
      
      // Apply filter bar filters
      // 1. Status filter
      const matchesStatus = filters.status.length === 0 || filters.status.includes(task.status);
      if (!matchesStatus) return false;
      
      // 2. Tag filter (AND logic - task must have ALL selected tags)
      const matchesTags = filters.tags.length === 0 || 
        filters.tags.every(tag => task.tags.includes(tag));
      if (!matchesTags) return false;
      
      // 3. Date scope filter
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
      const aDate = a.actionDate ? new Date(a.actionDate).getTime() : a.createdAt;
      const bDate = b.actionDate ? new Date(b.actionDate).getTime() : b.createdAt;
      return bDate - aDate;
    });
  }, [tasks, filters, searchQuery]);

  // Filter Logic - Tag-based faceted filtering with AND logic
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Screen-specific filtering
      if (currentView === 'routines') {
        // Routines view handled separately
        return false;
      } else if (currentView === 'master') {
        // Master view: show all tasks, but filter by routines toggle if enabled
        if (showRoutinesFilter && !task.isRoutine) {
          return false;
        }
      }
      
      // Apply search query filter (case-insensitive search in task title)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        if (!task.title.toLowerCase().includes(query)) return false;
      }
      
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
  }, [tasks, filters, currentView, showRoutinesFilter, searchQuery]);

  const handleToggleTask = async (id: string) => {
    await toggleTask({ id: id as Id<"tasks">, token: token! });
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
        priority: data.priority || undefined,
        createdAt: Date.now(),
        timeEstimate: data.timeEstimate || undefined,
        context: data.context || undefined,
        participants: Array.isArray(data.participants) && data.participants.length > 0 ? data.participants : undefined,
        occurredDate: data.occurredDate || undefined,
        source: data.source || { type: 'manual' as const },
        isRoutine: data.isRoutine || undefined,
      };
      
      console.log("Creating task with data:", taskData);
      const taskId = await createTask({ ...taskData, token: token! });
      console.log("Task created with ID:", taskId);
    } catch (error) {
      console.error("Error in handleAddTask:", error);
      throw error; // Re-throw so SmartInput can catch it
    }
  };

  const handleAddProjectWithSubtasks = async (parentData: ExtractedTaskData, childrenData: ExtractedTaskData[]) => {
    await createWithSubtasks({
      token: token!,
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
        isRoutine: parentData.isRoutine,
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
        isRoutine: childData.isRoutine,
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
    // Stay on library view to show results as a card/category
  };

  const handleClearView = () => {
    setCurrentViewName(undefined);
    setFilters({ tags: [], status: [], dateScope: 'All' });
  };

  const handleTaskClick = (id: string) => {
    setSelectedTaskId(id);
  };

  const handleUpdateTask = async (updatedTask: RoutineTask) => {
    await updateTask({
      id: updatedTask.id as Id<"tasks">,
      title: updatedTask.title,
      isCompleted: updatedTask.isCompleted,
      status: updatedTask.status,
      priority: updatedTask.priority,
      actionDate: updatedTask.actionDate,
      tags: updatedTask.tags,
      timeEstimate: updatedTask.timeEstimate,
      context: updatedTask.context,
      participants: updatedTask.participants,
      occurredDate: updatedTask.occurredDate,
      source: updatedTask.source,
      linkedTasks: updatedTask.linkedTasks,
      isRoutine: updatedTask.isRoutine,
      token: token!,
    });
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask({ id: id as Id<"tasks">, token: token! });
    setSelectedTaskId(null);
  };

  // Swipe navigation handlers
  const startNavSwipe = (clientX: number, clientY: number) => {
    swipeStartX.current = clientX;
    swipeStartY.current = clientY;
    gestureLockRef.current = null; // Reset gesture lock on new touch
  };

  const updateNavSwipe = (clientX: number, clientY: number) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return false;
    
    const deltaX = clientX - swipeStartX.current;
    const deltaY = clientY - swipeStartY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // If already locked to vertical, allow scrolling
    if (gestureLockRef.current === 'vertical') {
      return false;
    }
    
    // If already locked to horizontal, prevent scrolling
    if (gestureLockRef.current === 'horizontal') {
      return true;
    }
    
    // Need minimum movement before making decision
    const MIN_MOVEMENT = 10; // Lower threshold to detect earlier
    
    if (absDeltaX < MIN_MOVEMENT && absDeltaY < MIN_MOVEMENT) {
      // Too early - prevent default to give horizontal swipe a chance
      return true; // Prevent scroll until we know the direction
    }
    
    // Check if clearly vertical (vertical is 2x horizontal)
    if (absDeltaY > absDeltaX * 2 && absDeltaY >= 15) {
      gestureLockRef.current = 'vertical';
      return false; // Allow vertical scrolling
    }
    
    // If there's any significant horizontal movement, lock to horizontal
    if (absDeltaX >= MIN_MOVEMENT) {
      gestureLockRef.current = 'horizontal';
      return true; // Prevent scrolling
    }
    
    // Default: prevent scroll until direction is clear
    return true;
  };

  const endNavSwipe = (clientX: number, clientY: number) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    
    const deltaX = clientX - swipeStartX.current;
    const deltaY = clientY - swipeStartY.current;
    
    const threshold = 150;
    
    // Swipe navigation for 6 views: Library -> Entries -> Today -> Master -> Routines -> Timeline
    // Swipe left (finger moves left): Library -> Entries -> Today -> Master -> Routines -> Timeline
    if (deltaX < -threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (currentView === 'library') {
        setPreviousView(currentView);
        setCurrentView('entries');
      } else if (currentView === 'entries') {
        setPreviousView(currentView);
        setCurrentView('today');
      } else if (currentView === 'today') {
        setPreviousView(currentView);
        setCurrentView('master');
      } else if (currentView === 'master') {
        setPreviousView(currentView);
        setCurrentView('routines');
      } else if (currentView === 'routines') {
        setPreviousView(currentView);
        setCurrentView('timeline');
      }
    }
    // Swipe right (finger moves right): Timeline -> Routines -> Master -> Today -> Entries -> Library
    else if (deltaX > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (currentView === 'timeline') {
        setPreviousView(currentView);
        setCurrentView('routines');
      } else if (currentView === 'routines') {
        setPreviousView(currentView);
        setCurrentView('master');
      } else if (currentView === 'master') {
        setPreviousView(currentView);
        setCurrentView('today');
      } else if (currentView === 'today') {
        setPreviousView(currentView);
        setCurrentView('entries');
      } else if (currentView === 'entries') {
        setPreviousView(currentView);
        setCurrentView('library');
      }
    }
    
    swipeStartX.current = null;
    swipeStartY.current = null;
    gestureLockRef.current = null; // Reset gesture lock
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Always allow navigation swipe on SmartInput
    if (target.closest('[data-allow-nav-swipe="true"]')) {
      const touch = e.touches[0];
      startNavSwipe(touch.clientX, touch.clientY);
      return;
    }
    // Don't start navigation swipe if touch is on a swipeable element
    if (target.closest('[data-swipeable="true"]')) return;
    
    const touch = e.touches[0];
    startNavSwipe(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Always allow navigation swipe on SmartInput
    if (target.closest('[data-allow-nav-swipe="true"]')) {
      const touch = e.touches[0];
      if (updateNavSwipe(touch.clientX, touch.clientY)) {
        e.preventDefault(); // Prevent scrolling during horizontal swipe
      }
      return;
    }
    // Don't handle navigation swipe if touch is on a swipeable element
    if (target.closest('[data-swipeable="true"]')) return;
    
    const touch = e.touches[0];
    if (updateNavSwipe(touch.clientX, touch.clientY)) {
      e.preventDefault(); // Prevent scrolling during horizontal swipe
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Always allow navigation swipe on SmartInput
    if (target.closest('[data-allow-nav-swipe="true"]')) {
      const touch = e.changedTouches[0];
      endNavSwipe(touch.clientX, touch.clientY);
      return;
    }
    // Don't handle navigation swipe if touch is on a swipeable element
    if (target.closest('[data-swipeable="true"]')) return;
    
    const touch = e.changedTouches[0];
    endNavSwipe(touch.clientX, touch.clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    // Only handle if clicking on the main container, not on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select')) return;
    
    // Always allow navigation swipe on SmartInput
    const isOnSmartInput = target.closest('[data-allow-nav-swipe="true"]');
    // Don't start navigation swipe if touch is on a swipeable element (entry card, task card)
    if (!isOnSmartInput && target.closest('[data-swipeable="true"]')) return;
    
    startNavSwipe(e.clientX, e.clientY);
    
    // Add global mouse listeners for drag
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const moveTarget = e.target as HTMLElement;
      // Always allow navigation swipe on SmartInput
      const isOnSmartInputMove = moveTarget.closest('[data-allow-nav-swipe="true"]');
      // Don't handle navigation swipe if mouse is over a swipeable element
      if (!isOnSmartInputMove && moveTarget.closest('[data-swipeable="true"]')) {
        return;
      }
      if (updateNavSwipe(e.clientX, e.clientY)) {
        e.preventDefault();
      }
    };
    
    const handleGlobalMouseUp = (e: MouseEvent) => {
      const upTarget = e.target as HTMLElement;
      // Always allow navigation swipe on SmartInput
      const isOnSmartInputUp = upTarget.closest('[data-allow-nav-swipe="true"]');
      // Don't handle navigation swipe if mouse is over a swipeable element
      if (!isOnSmartInputUp && upTarget.closest('[data-swipeable="true"]')) {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        return;
      }
      endNavSwipe(e.clientX, e.clientY);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  };

  // Get tasks for current view
  const displayTasks = currentView === 'today' 
    ? todayTasks 
    : currentView === 'routines' 
      ? routinesTasks 
      : filteredTasks;
  
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

  // Calculate routines stats
  const routinesStats = useMemo(() => {
    const activeTasks = routinesTasks.filter(t => !t.isCompleted);
    const completedTasks = routinesTasks.filter(t => t.isCompleted);
    return {
      total: routinesTasks.length,
      active: activeTasks.length,
      completed: completedTasks.length,
    };
  }, [routinesTasks]);

  // Simplified scroll position handling
  useEffect(() => {
    // When switching views, we just need to make sure we aren't scrolled into empty space
    // The independent scroll containers (overflow-y-auto on each main) handle their own scroll state naturally
    // We just need to check bounds when switching back to a potentially shorter list
    
    const timeoutId = setTimeout(() => {
      let targetRef: HTMLElement | null = null;
      if (currentView === 'entries') {
        targetRef = entriesScrollRef.current;
      } else if (currentView === 'today') {
        targetRef = todayScrollRef.current;
      } else if (currentView === 'master') {
        targetRef = masterScrollRef.current;
      } else if (currentView === 'routines') {
        targetRef = routinesScrollRef.current;
      } else if (currentView === 'timeline') {
        targetRef = timelineScrollRef.current;
      } else if (currentView === 'library') {
        targetRef = libraryScrollRef.current;
      }
      
      if (!targetRef) return;
      
      const scrollHeight = targetRef.scrollHeight;
      const clientHeight = targetRef.clientHeight;
      const scrollTop = targetRef.scrollTop;
      const maxScroll = Math.max(0, scrollHeight - clientHeight);
      
      // If we're scrolled past the bottom (because the list changed size or we restored a bad position), clamp it
      if (scrollTop > maxScroll) {
        targetRef.scrollTop = maxScroll;
      }
    }, 50); // Short delay to let layout settle
    
    return () => clearTimeout(timeoutId);
  }, [currentView, todayTasks.length, filteredTasks.length, routinesTasks.length]);

  // We don't need complex manual scroll tracking/restoring anymore because 
  // the <main> elements persist in the DOM within the carousel
  // keeping their scroll positions automatically.

  // Calculate master list stats
  const masterStats = useMemo(() => {
    const activeTasks = filteredTasks.filter(t => !t.isCompleted);
    const completedTasks = filteredTasks.filter(t => t.isCompleted);
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
    
    // Count tasks by status
    const statusCounts = filteredTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<TaskStatus, number>);
    
    return {
      total: filteredTasks.length,
      active: activeTasks.length,
      completed: completedTasks.length,
      timeEstimate: totalTime > 0 ? `${Math.round(totalTime / 60 * 10) / 10}h` : null,
      hasFilters: filters.tags.length > 0 || filters.status.length > 0 || filters.dateScope !== 'All',
    };
  }, [filteredTasks, filters]);

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      className="h-[100dvh] flex flex-col max-w-2xl mx-auto overflow-hidden relative select-none"
    >
      
      {/* Fixed Header + Filter Container */}
      <div className="fixed top-0 left-0 right-0 z-20 pointer-events-none">
        {/* Unified Background with Blur and Fade */}
        <div 
          className="absolute inset-0 z-0 bg-[#F3F4F6]/60 backdrop-blur-xl border-b border-white/20"
          style={{ 
            maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)'
          }}
        />
        
        <div className="max-w-2xl mx-auto relative pointer-events-auto pb-8">
          {/* Header */}
          <header className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0 relative z-10">
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-start gap-2 h-8"> {/* Restored fixed height for consistent vertical alignment */}
                {/* Library Section */}
                <motion.div 
                  className="flex flex-col items-start cursor-pointer group select-none relative justify-center h-full"
                  onClick={() => {
                    setPreviousView(currentView);
                    setCurrentView('library');
                  }}
                  animate={{ 
                    width: currentView === 'library' ? 'auto' : '6px',
                  }}
                  transition={SPRING_TRANSITION}
                >
                  <div className="flex items-center h-6 relative">
                    {currentView !== 'library' && (
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-300 group-hover:bg-gray-400 rounded-full transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={SPRING_TRANSITION}
                      />
                    )}
                    <motion.h1 
                      animate={{ 
                        opacity: currentView === 'library' ? 1 : 0,
                        scaleX: currentView === 'library' ? 1 : 0,
                        x: currentView === 'library' ? 0 : getInactiveXOffset('library')
                      }}
                      transition={SPRING_TRANSITION}
                      className="text-2xl font-bold text-gray-900 tracking-tight whitespace-nowrap leading-none origin-left"
                    >
                      Library
                    </motion.h1>
                  </div>
                  <AnimatePresence>
                    {currentView === 'library' && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={SPRING_TRANSITION}
                        className="text-xs text-gray-500 whitespace-nowrap absolute top-full mt-0.5 pl-0.5 left-0"
                      >
                        <span className="text-gray-400">Organized by tags</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Entries Section */}
                <motion.div 
                  className="flex flex-col items-start cursor-pointer group select-none relative justify-center h-full"
                  onClick={() => {
                    setPreviousView(currentView);
                    setCurrentView('entries');
                  }}
                  animate={{ 
                    width: currentView === 'entries' ? 'auto' : '6px',
                  }}
                  transition={SPRING_TRANSITION}
                >
                  <div className="flex items-center h-6 relative">
                    {currentView !== 'entries' && (
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-300 group-hover:bg-gray-400 rounded-full transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={SPRING_TRANSITION}
                      />
                    )}
                    <motion.h1 
                      animate={{ 
                        opacity: currentView === 'entries' ? 1 : 0,
                        scaleX: currentView === 'entries' ? 1 : 0,
                        x: currentView === 'entries' ? 0 : getInactiveXOffset('entries')
                      }}
                      transition={SPRING_TRANSITION}
                      className="text-2xl font-bold text-gray-900 tracking-tight whitespace-nowrap leading-none origin-left"
                    >
                      Entries
                    </motion.h1>
                  </div>
                  <AnimatePresence>
                    {currentView === 'entries' && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={SPRING_TRANSITION}
                        className="text-xs text-gray-500 whitespace-nowrap absolute top-full mt-0.5 pl-0.5 left-0"
                      >
                        <span className="text-gray-400">Activity timeline</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Today Section */}
                <motion.div 
                  className="flex flex-col items-start cursor-pointer group select-none relative justify-center h-full" // Center content vertically
                  onClick={() => {
                    setPreviousView(currentView);
                    setCurrentView('today');
                  }}
                  animate={{ 
                    width: currentView === 'today' ? 'auto' : '6px',
                  }}
                  transition={SPRING_TRANSITION}
                >
                  <div className="flex items-center h-6 relative">
                    {/* Background bar - only visible when inactive */}
                    {currentView !== 'today' && (
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-300 group-hover:bg-gray-400 rounded-full transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={SPRING_TRANSITION}
                      />
                    )}
                    
                    {/* Title text */}
                    <motion.h1 
                      animate={{ 
                        opacity: currentView === 'today' ? 1 : 0,
                        scaleX: currentView === 'today' ? 1 : 0,
                        x: currentView === 'today' ? 0 : getInactiveXOffset('today')
                      }}
                      transition={SPRING_TRANSITION}
                      className="text-2xl font-bold text-gray-900 tracking-tight whitespace-nowrap leading-none origin-left"
                    >
                      Today's List
                    </motion.h1>
                  </div>

                  {/* Meta Info - Anchored to Today title */}
                  <AnimatePresence>
                    {currentView === 'today' && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={SPRING_TRANSITION}
                        className="text-xs text-gray-500 whitespace-nowrap absolute top-full mt-0.5 pl-0.5 left-0" // Absolute positioning to not affect height
                      >
                        {todayStats.count > 0 ? (
                          <>
                            {todayStats.count} active
                            {todayStats.timeEstimate && ` • ${todayStats.timeEstimate}`}
                          </>
                        ) : (
                          <span className="text-gray-400">No tasks</span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Master Section */}
                <motion.div 
                  className="flex flex-col items-start cursor-pointer group select-none relative justify-center h-full" // Center content vertically
                  onClick={() => {
                    setPreviousView(currentView);
                    setCurrentView('master');
                  }}
                  animate={{ 
                    width: currentView === 'master' ? 'auto' : '6px',
                  }}
                  transition={SPRING_TRANSITION}
                >
                  <div className="flex items-center h-6 relative">
                    {/* Background bar - only visible when inactive */}
                    {currentView !== 'master' && (
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-300 group-hover:bg-gray-400 rounded-full transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={SPRING_TRANSITION}
                      />
                    )}
                    
                    {/* Title text */}
                    <motion.h1 
                      animate={{ 
                        opacity: currentView === 'master' ? 1 : 0,
                        scaleX: currentView === 'master' ? 1 : 0,
                        x: currentView === 'master' ? 0 : getInactiveXOffset('master')
                      }}
                      transition={SPRING_TRANSITION}
                      className="text-2xl font-bold text-gray-900 tracking-tight whitespace-nowrap leading-none origin-left"
                    >
                      Master List
                    </motion.h1>
                  </div>

                  {/* Meta Info - Anchored to Master title */}
                  <AnimatePresence>
                    {currentView === 'master' && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={SPRING_TRANSITION}
                        className="text-xs text-gray-500 whitespace-nowrap absolute top-full mt-0.5 pl-0.5 left-0" // Absolute positioning to not affect height
                      >
                        {masterStats.total > 0 ? (
                          <>
                            {masterStats.active} active
                            {masterStats.completed > 0 && ` • ${masterStats.completed} done`}
                            {masterStats.timeEstimate && ` • ${masterStats.timeEstimate}`}
                          </>
                        ) : (
                          <span className="text-gray-400">
                            {masterStats.hasFilters ? 'No matches' : 'Empty'}
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Routines Section */}
                <motion.div 
                  className="flex flex-col items-start cursor-pointer group select-none relative justify-center h-full"
                  onClick={() => {
                    setPreviousView(currentView);
                    setCurrentView('routines');
                  }}
                  animate={{ 
                    width: currentView === 'routines' ? 'auto' : '6px',
                  }}
                  transition={SPRING_TRANSITION}
                >
                  <div className="flex items-center h-6 relative">
                    {currentView !== 'routines' && (
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-300 group-hover:bg-gray-400 rounded-full transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={SPRING_TRANSITION}
                      />
                    )}
                    <motion.h1 
                      animate={{ 
                        opacity: currentView === 'routines' ? 1 : 0,
                        scaleX: currentView === 'routines' ? 1 : 0,
                        x: currentView === 'routines' ? 0 : getInactiveXOffset('routines')
                      }}
                      transition={SPRING_TRANSITION}
                      className="text-2xl font-bold text-gray-900 tracking-tight whitespace-nowrap leading-none origin-left"
                    >
                      Routines
                    </motion.h1>
                  </div>
                  <AnimatePresence>
                    {currentView === 'routines' && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={SPRING_TRANSITION}
                        className="text-xs text-gray-500 whitespace-nowrap absolute top-full mt-0.5 pl-0.5 left-0"
                      >
                        {routinesStats.total > 0 ? (
                          <>
                            {routinesStats.active} active
                            {routinesStats.completed > 0 && ` • ${routinesStats.completed} done`}
                          </>
                        ) : (
                          <span className="text-gray-400">No routines</span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Timeline Section */}
                <motion.div 
                  className="flex flex-col items-start cursor-pointer group select-none relative justify-center h-full"
                  onClick={() => {
                    setPreviousView(currentView);
                    setCurrentView('timeline');
                  }}
                  animate={{ 
                    width: currentView === 'timeline' ? 'auto' : '6px',
                  }}
                  transition={SPRING_TRANSITION}
                >
                  <div className="flex items-center h-6 relative">
                    {currentView !== 'timeline' && (
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-300 group-hover:bg-gray-400 rounded-full transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={SPRING_TRANSITION}
                      />
                    )}
                    <motion.h1 
                      animate={{ 
                        opacity: currentView === 'timeline' ? 1 : 0,
                        scaleX: currentView === 'timeline' ? 1 : 0,
                        x: currentView === 'timeline' ? 0 : getInactiveXOffset('timeline')
                      }}
                      transition={SPRING_TRANSITION}
                      className="text-2xl font-bold text-gray-900 tracking-tight whitespace-nowrap leading-none origin-left"
                    >
                      Time Blocks
                    </motion.h1>
                  </div>
                  <AnimatePresence>
                    {currentView === 'timeline' && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={SPRING_TRANSITION}
                        className="text-xs text-gray-500 whitespace-nowrap absolute top-full mt-0.5 pl-0.5 left-0"
                      >
                        {selectedTemplateId ? (
                          <span>{templates.find((t: any) => t._id === selectedTemplateId)?.name || 'Template'}</span>
                        ) : (
                          <span className="text-gray-400">No template</span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-500 flex-shrink-0 min-w-0">
              {/* Search - Expandable Icon to Input */}
              <motion.div
                className="relative flex items-center"
                animate={{
                  width: isSearchExpanded ? 200 : 24,
                }}
                transition={SPRING_TRANSITION}
              >
                {!isSearchExpanded ? (
                  <button
                    onClick={() => {
                      setIsSearchExpanded(true);
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }}
                    className="w-6 h-6 flex items-center justify-center hover:text-gray-900 transition-colors"
                  >
                    <Search className="w-6 h-6" />
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative w-full flex items-center"
                  >
                    <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none z-10">
                      <Search className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={() => {
                        // Only collapse if there's no search query
                        if (!searchQuery.trim()) {
                          setIsSearchExpanded(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setSearchQuery('');
                          setIsSearchExpanded(false);
                          searchInputRef.current?.blur();
                        }
                      }}
                      placeholder={
                        currentView === 'entries' ? 'Search entries...' :
                        currentView === 'library' ? 'Search library...' :
                        'Search tasks...'
                      }
                      className="w-full pl-10 pr-9 py-2 text-sm bg-gray-50/80 backdrop-blur-sm border border-gray-200 rounded-full focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-2.5 top-0 bottom-0 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-200"
                      >
                        <span className="text-sm leading-none">×</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </motion.div>
              <button 
                onClick={() => setSettingsOpen(true)}
                className="hover:text-gray-900 transition-colors relative flex-shrink-0"
                title="Settings"
              >
                <Settings className="w-6 h-6" />
              </button>
              <button 
                onClick={handleSignOut}
                className="hover:text-gray-900 transition-colors relative flex-shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-6 h-6" />
              </button>
              <button className="hover:text-gray-900 transition-colors relative flex-shrink-0">
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-[#F3F4F6] rounded-full"></span>
              </button>
            </div>
          </header>

          {/* Filter Bar - persistent across views */}
          <div className="relative z-10 mt-2"> {/* Added top margin to restore spacing */}
            <FilterBar 
              activeFilters={filters} 
              setFilters={setFilters} 
              currentViewName={currentViewName}
              onClearView={handleClearView}
              currentView={currentView}
              showRoutinesFilter={showRoutinesFilter}
              onToggleRoutinesFilter={setShowRoutinesFilter}
              templates={templates.map((t: any) => ({ id: t._id, name: t.name, createdAt: t.createdAt, isDefault: t.isDefault }))}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={setSelectedTemplateId}
              visibleCategories={visibleCategories}
              onToggleCategory={(category, visible) => {
                setVisibleCategories(prev => 
                  visible 
                    ? [...prev, category].filter((v, i, a) => a.indexOf(v) === i)
                    : prev.filter(c => c !== category)
                );
              }}
              showContentEntries={showContentEntries}
              onToggleContentEntries={setShowContentEntries}
              showTaskNotifications={showTaskNotifications}
              onToggleTaskNotifications={setShowTaskNotifications}
            />
          </div>
        </div>
      </div>
      
      {/* Spacer for fixed header */}
      <div className="h-[100px]"></div>

      {/* Task List Carousel */}
      <div 
        className="flex-1 relative overflow-hidden min-h-0"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)'
        }}
      >
        <motion.div
          className="flex h-full"
          animate={{
            x: currentView === 'library' ? 0 : 
               currentView === 'entries' ? '-16.666%' : 
               currentView === 'today' ? '-33.333%' : 
               currentView === 'master' ? '-50%' : 
               currentView === 'routines' ? '-66.666%' : '-83.333%',
          }}
          transition={SPRING_TRANSITION}
          style={{
            width: '600%',
            height: '100%',
          }}
        >
          {/* Library View */}
          <div className="w-full h-full flex flex-col" style={{ width: '16.666%' }}>
            <ErrorBoundary>
              <LibraryView 
                tasks={tasks}
                activeFilters={filters}
                currentViewName={currentViewName}
                visibleCategories={visibleCategories}
                onClearSearch={handleClearView}
                onTagClick={(tag) => {
                  setFilters(prev => ({ ...prev, tags: [tag] }));
                  setCurrentViewName(undefined);
                }}
                onCategoryClick={(category) => {
                  if (category === 'all') {
                    setFilters({ tags: [], status: [], dateScope: 'All' });
                    setCurrentViewName(undefined);
                  } else if (category.startsWith('content:')) {
                    // Handle content category clicks - could filter entries by classification
                    setCurrentViewName(undefined);
                  } else {
                    // Handle tag category clicks - get all tags in that category
                    const categoryTags = Object.values(TAG_CATEGORIES[category as keyof typeof TAG_CATEGORIES] || []);
                    setFilters(prev => ({ ...prev, tags: categoryTags }));
                    setCurrentViewName(undefined);
                  }
                }}
                onTaskClick={handleTaskClick}
                onToggleTask={handleToggleTask}
                scrollRef={libraryScrollRef}
                searchQuery={currentView === 'library' ? searchQuery : ''}
                token={token}
              />
            </ErrorBoundary>
          </div>

          {/* Entries View */}
          <div className="w-full h-full flex flex-col" style={{ width: '16.666%' }}>
            <ErrorBoundary>
              <EntriesView 
                tasks={tasks}
                onTaskClick={handleTaskClick}
                scrollRef={entriesScrollRef}
                showContentEntries={showContentEntries}
                showTaskNotifications={showTaskNotifications}
                activeChatEntryId={activeChatEntryId}
                onActiveChatChange={setActiveChatEntryId}
                searchQuery={currentView === 'entries' ? searchQuery : ''}
                token={token}
              />
            </ErrorBoundary>
          </div>

          {/* Today View */}
          <main ref={todayScrollRef} className="w-full px-4 pt-2 pb-32 overflow-y-auto overflow-x-hidden no-scrollbar" style={{ width: '16.666%' }}>
            <div className="space-y-1 min-w-0">
              {todayTasks.length > 0 ? (
                todayTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onToggle={handleToggleTask} 
                    onClick={handleTaskClick}
                    onDelete={handleDeleteTask}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center pt-20 text-center opacity-50">
                  <div className="bg-gray-200 p-4 rounded-full mb-4">
                    <Menu className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No tasks found</p>
                  <p className="text-sm text-gray-400">
                    No tasks scheduled for today. Swipe right on a task card to add it to today's list.
                  </p>
                </div>
              )}
            </div>
          </main>

          {/* Master View */}
          <main ref={masterScrollRef} className="w-full px-4 pt-2 pb-32 overflow-y-auto overflow-x-hidden no-scrollbar" style={{ width: '16.666%' }}>
            <div className="space-y-1 min-w-0">
              {filteredTasks.length > 0 ? (
                filteredTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onToggle={handleToggleTask} 
                    onClick={handleTaskClick}
                    onDelete={handleDeleteTask}
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

          {/* Routines View */}
          <main ref={routinesScrollRef} className="w-full px-4 pt-2 pb-32 overflow-y-auto overflow-x-hidden no-scrollbar" style={{ width: '16.666%' }}>
            <div className="space-y-1 min-w-0">
              {routinesTasks.length > 0 ? (
                routinesTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onToggle={handleToggleTask} 
                    onClick={handleTaskClick}
                    onDelete={handleDeleteTask}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center pt-20 text-center opacity-50">
                  <div className="bg-gray-200 p-4 rounded-full mb-4">
                    <Menu className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No routines found</p>
                  <p className="text-sm text-gray-400">
                    Mark a task as a routine to see it here.
                  </p>
                </div>
              )}
            </div>
          </main>

          {/* Timeline View */}
          <main ref={timelineScrollRef} className="w-full px-4 pt-2 pb-32 overflow-y-auto overflow-x-hidden no-scrollbar" style={{ width: '16.666%' }}>
            <TimelineView templateId={selectedTemplateId} />
          </main>
        </motion.div>
      </div>

      {/* Smart Input - contextual to each page */}
      <SmartInput 
        onAddTask={handleAddTask} 
        onApplyView={handleApplyView}
        onAddEntry={currentView === 'entries' ? async (content: string) => {
          await createEntry({ content, token: token! });
        } : undefined}
        defaultToRoutine={currentView === 'routines'}
        currentView={currentView}
        activeChatEntryId={currentView === 'entries' ? activeChatEntryId : null}
        onActiveChatChange={currentView === 'entries' ? setActiveChatEntryId : undefined}
      />

      {/* Detail Modal */}
      {selectedTaskId && (
        <TaskDetailView 
          task={tasks.find(t => t.id === selectedTaskId)! as RoutineTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* Settings Dialog */}
      <SettingsDialog 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />
      
    </div>
  );
};

export default App;