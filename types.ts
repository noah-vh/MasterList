// Layer 1: Anchors - Universal Metadata
export enum TaskStatus {
  Active = 'Active',
  WaitingOn = 'WaitingOn',
  SomedayMaybe = 'SomedayMaybe',
  Archived = 'Archived',
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
  
  // Parent-child relationships
  parentTaskId?: string; // ID of parent task for hierarchical structure
  
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

export type UserIntent = 'CAPTURE_TASK' | 'GENERATE_VIEW' | 'PLAN_PROJECT';

// Payload for creating a new task
export interface ExtractedTaskData {
  title: string;
  tags: string[]; // Suggested tags
  status: TaskStatus;
  actionDate?: string; // ISO date string YYYY-MM-DD

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

// Planning conversation message
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Planning conversation state
export interface PlanningConversation {
  messages: ConversationMessage[];
  isActive: boolean;
  projectTitle?: string;
}

// Project breakdown with parent and children
export interface ProjectBreakdown {
  parentTask: ExtractedTaskData;
  childTasks: ExtractedTaskData[];
  summary?: string; // AI's explanation of the breakdown
}

// Unified response from Gemini
export interface AIResponse {
  intent: UserIntent;
  taskData?: ExtractedTaskData;
  viewData?: GeneratedViewData;
  projectBreakdown?: ProjectBreakdown;
  conversationMessage?: string; // AI's response in planning mode
  needsClarification?: boolean; // Whether AI needs more info before proposing breakdown
}