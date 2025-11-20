import { Task, TaskStatus } from '../types';

// Legacy task structure (for migration purposes)
interface LegacyTask {
  id: string;
  title: string;
  isCompleted: boolean;
  type?: string;
  area?: string;
  energy?: string;
  timeEstimate?: string;
  location?: string;
  dueDate?: string;
  isUrgent?: boolean;
  createdAt: number;
  occurredDate?: string;
  participants?: string[];
  context?: string;
  source?: {
    type: 'voice' | 'email' | 'transcript' | 'manual';
    id?: string;
  };
  linkedTasks?: string[];
}

// Mapping from old enums to new tags
const AREA_TO_TAGS: Record<string, string[]> = {
  Professional: ['Work'],
  Personal: ['Personal'],
  Domestic: ['Personal', 'Errand'],
  Social: ['People', 'Social'],
};

const ENERGY_TO_TAGS: Record<string, string[]> = {
  Low: ['Braindead'],
  Medium: ['QuickWin'],
  High: ['HeavyLift'],
};

const LOCATION_TO_TAGS: Record<string, string[]> = {
  Home: ['Offline'],
  Office: ['Work', 'Offline'],
  Computer: ['Tech'],
  Errands: ['Errand', 'Offline'],
};

const TYPE_TO_TAGS: Record<string, string[]> = {
  Task: [],
  Project: ['Multi-Session'],
  Idea: ['Creative'],
};

// Infer duration from time estimate
function inferDurationTag(timeEstimate?: string): string[] {
  if (!timeEstimate) return [];
  
  const lower = timeEstimate.toLowerCase();
  if (lower.includes('min') || lower.includes('minute')) {
    return ['Minutes'];
  }
  if (lower.includes('hr') || lower.includes('hour')) {
    return ['Hours'];
  }
  return [];
}

/**
 * Migrates a legacy task to the new tag-based format
 */
export function migrateTask(legacyTask: LegacyTask): Task {
  const tags: string[] = [];
  
  // Map area to domain tags
  if (legacyTask.area) {
    tags.push(...(AREA_TO_TAGS[legacyTask.area] || []));
  }
  
  // Map energy to energy tags
  if (legacyTask.energy) {
    tags.push(...(ENERGY_TO_TAGS[legacyTask.energy] || []));
  }
  
  // Map location to domain tags
  if (legacyTask.location) {
    tags.push(...(LOCATION_TO_TAGS[legacyTask.location] || []));
  }
  
  // Map type to tags
  if (legacyTask.type) {
    tags.push(...(TYPE_TO_TAGS[legacyTask.type] || []));
  }
  
  // Infer duration from time estimate
  tags.push(...inferDurationTag(legacyTask.timeEstimate));
  
  // Add headspace tags based on context
  if (legacyTask.area === 'Professional' && legacyTask.energy === 'High') {
    tags.push('DeepFocus');
  } else if (legacyTask.energy === 'Low') {
    tags.push('Admin');
  }
  
  // Remove duplicates
  const uniqueTags = Array.from(new Set(tags));
  
  // Convert dueDate to actionDate
  const actionDate = legacyTask.dueDate;
  
  return {
    id: legacyTask.id,
    title: legacyTask.title,
    isCompleted: legacyTask.isCompleted,
    status: TaskStatus.Active,
    createdAt: legacyTask.createdAt,
    actionDate,
    tags: uniqueTags,
    timeEstimate: legacyTask.timeEstimate,
    context: legacyTask.context,
    participants: legacyTask.participants,
    occurredDate: legacyTask.occurredDate,
    source: legacyTask.source,
    linkedTasks: legacyTask.linkedTasks,
  };
}

/**
 * Migrates an array of legacy tasks
 */
export function migrateTasks(legacyTasks: LegacyTask[]): Task[] {
  return legacyTasks.map(migrateTask);
}

