// Layer 1: Anchors - Universal Metadata
export enum TaskStatus {
  Active = 'Active',
  WaitingOn = 'WaitingOn',
  SomedayMaybe = 'SomedayMaybe',
  Archived = 'Archived',
}

export enum Area {
  Professional = 'Professional',
  Personal = 'Personal',
  Domestic = 'Domestic',
  Social = 'Social',
}

export enum EnergyLevel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export enum LocationContext {
  Home = 'Home',
  Office = 'Office',
  Computer = 'Computer',
  Errands = 'Errands',
}

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  
  // Layer 1: Anchors
  status: TaskStatus;
  createdAt: number;
  actionDate?: string; // When to see the task (replaces dueDate concept) - ISO date string YYYY-MM-DD
  
  // Layer 2 & 3: Tags (arrays of strings)
  tags: string[]; // e.g., ['DeepFocus', 'HeavyLift', 'Work', 'Tech']
  
  // Legacy fields for migration (optional)
  timeEstimate?: string;
  context?: string;
  participants?: string[];
  occurredDate?: string; // When this was mentioned/discussed
  source?: {
    type: 'voice' | 'email' | 'transcript' | 'manual';
    id?: string;
  };
  linkedTasks?: string[]; // Related task IDs
  isRoutine?: boolean; // Whether this task is a routine
  parentTaskId?: string; // Reference to parent task if subtask
}

export enum RoutineFrequency {
  Daily = 'Daily',
  Weekly = 'Weekly',
  Monthly = 'Monthly',
  Custom = 'Custom',
}

export interface Routine {
  id: string;
  taskId: string;
  frequency: RoutineFrequency;
  daysOfWeek?: number[]; // Array of 0-6 for weekly schedules (0 = Sunday, 6 = Saturday)
  customInterval?: number; // Days for custom intervals
  timeEstimate?: string; // Routine-specific time estimate
  goal?: string; // Goal/target description
  trackStreaks: boolean;
  lastCompletedDate?: string; // ISO date string
  currentStreak?: number;
  longestStreak?: number;
  completionHistory?: string[]; // Array of ISO date strings
}

export interface RoutineTask extends Task {
  routine?: Routine;
}

export type DateScope = 'All' | 'Today' | 'ThisWeek' | 'Overdue';

export interface FilterState {
  tags: string[]; // Selected tags (AND logic by default)
  status: TaskStatus[];
  dateScope: DateScope;
  actionDateRange?: { start: string; end: string };
}

// --- AI Response Structures ---

export type UserIntent = 'CAPTURE_TASK' | 'GENERATE_VIEW';

// Payload for creating a new task
export interface ExtractedTaskData {
  title: string;
  tags?: string[]; // Suggested tags (can be derived from area/energy/location)
  status?: TaskStatus; // Optional, defaults to Active
  actionDate?: string; // ISO date string YYYY-MM-DD (replaces dueDate)
  dueDate?: string; // Legacy field, use actionDate instead

  // Classification fields (from AI extraction - used in SmartInput UI)
  area?: Area;
  energy?: EnergyLevel;
  location?: LocationContext;
  type?: 'Task' | 'Project' | 'Idea';
  isUrgent?: boolean;

  // Enhanced metadata
  timeEstimate?: string;
  occurredDate?: string;
  participants?: string[];
  context?: string;
  source?: {
    type: 'voice' | 'email' | 'transcript' | 'manual';
    id?: string;
  };
  isRoutine?: boolean; // Whether this task is a routine
}

// Payload for applying a dynamic filter view
export interface GeneratedViewData {
  viewName: string;
  description: string; // A short motivational phrase or explanation
  filters: FilterState;
}

// Unified response from Gemini
export interface AIResponse {
  intent: UserIntent | null;
  taskData?: ExtractedTaskData | null;
  tasks?: ExtractedTaskData[] | null; // Multiple tasks if user mentioned multiple items
  viewData?: GeneratedViewData | null;
  error?: string; // Error message if API call failed
}

// Time Block Types
export interface TimeBlockTemplate {
  id: string;
  name: string;
  createdAt: number;
  isDefault: boolean;
}

export interface TimeBlock {
  id: string;
  templateId: string;
  startTime: number; // minutes from midnight (0-1439)
  endTime: number; // minutes from midnight (0-1439)
  title?: string;
  color?: string;
  createdAt: number;
}

// Entry Types
export interface Entry {
  id: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  entryType: 'manual' | 'activity' | 'content';
  activityType?: 'task_created' | 'task_completed' | 'task_uncompleted' | 'attachment_added';
  linkedTaskId?: string; // For activity logs (single task)
  linkedTaskIds?: string[]; // For manual entries (multiple tasks)
  tags?: string[];
  hasAttachment?: boolean; // For manual entries with attachments
  // Content logging fields
  contentType?: 'link' | 'image' | 'text' | 'video' | 'chat';
  sourceUrl?: string;
  sourceImageId?: string;
  analyzedContent?: string;
  ogMetadata?: {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  };
  classification?: {
    category: string;
    topics: string[];
    keyPoints: string[];
    lessons: string[];
  };
  // Chat thread fields
  chatThread?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
}