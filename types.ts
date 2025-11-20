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
}

// Payload for applying a dynamic filter view
export interface GeneratedViewData {
  viewName: string;
  description: string; // A short motivational phrase or explanation
  filters: FilterState;
}

// Unified response from Gemini
export interface AIResponse {
  intent: UserIntent;
  taskData?: ExtractedTaskData;
  viewData?: GeneratedViewData;
}