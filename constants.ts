import { Task, TaskStatus } from './types';

// Tag Categories - Layer 2 & 3
export const TAG_CATEGORIES = {
  headspace: ['DeepFocus', 'Admin', 'Creative', 'Social'],
  energy: ['QuickWin', 'HeavyLift', 'Braindead'],
  duration: ['Minutes', 'Hours', 'Multi-Session'],
  domains: ['Finance', 'Health', 'Tech', 'People', 'Growth', 'Work', 'Personal', 'Errand', 'Fun', 'Offline'],
} as const;

// Tag metadata for display
export interface TagMetadata {
  label: string;
  color: string;
  category: 'headspace' | 'energy' | 'duration' | 'domains';
  description?: string;
}

export const TAG_METADATA: Record<string, TagMetadata> = {
  // Headspace tags
  DeepFocus: {
    label: 'Deep Focus',
    color: 'bg-indigo-100 text-indigo-700',
    category: 'headspace',
    description: 'Coding, writing, complex strategy',
  },
  Admin: {
    label: 'Admin',
    color: 'bg-gray-100 text-gray-700',
    category: 'headspace',
    description: 'Forms, emails, logistics - low brain power',
  },
  Creative: {
    label: 'Creative',
    color: 'bg-pink-100 text-pink-700',
    category: 'headspace',
    description: 'Brainstorming, designing',
  },
  Social: {
    label: 'Social',
    color: 'bg-purple-100 text-purple-700',
    category: 'headspace',
    description: 'Networking, calling, meeting',
  },
  
  // Energy/Friction tags
  QuickWin: {
    label: 'Quick Win',
    color: 'bg-emerald-100 text-emerald-700',
    category: 'energy',
    description: 'Takes < 5 mins, low friction',
  },
  HeavyLift: {
    label: 'Heavy Lift',
    color: 'bg-rose-100 text-rose-700',
    category: 'energy',
    description: 'Requires mental preparation and stamina',
  },
  Braindead: {
    label: 'Braindead',
    color: 'bg-amber-100 text-amber-700',
    category: 'energy',
    description: 'Can do while tired/sick',
  },
  
  // Duration tags
  Minutes: {
    label: 'Minutes',
    color: 'bg-blue-50 text-blue-600',
    category: 'duration',
  },
  Hours: {
    label: 'Hours',
    color: 'bg-blue-100 text-blue-700',
    category: 'duration',
  },
  'Multi-Session': {
    label: 'Multi-Session',
    color: 'bg-blue-200 text-blue-800',
    category: 'duration',
  },
  
  // Domain tags
  Finance: {
    label: 'Finance',
    color: 'bg-green-100 text-green-700',
    category: 'domains',
  },
  Health: {
    label: 'Health',
    color: 'bg-red-100 text-red-700',
    category: 'domains',
  },
  Tech: {
    label: 'Tech',
    color: 'bg-cyan-100 text-cyan-700',
    category: 'domains',
  },
  People: {
    label: 'People',
    color: 'bg-purple-100 text-purple-700',
    category: 'domains',
  },
  Growth: {
    label: 'Growth',
    color: 'bg-yellow-100 text-yellow-700',
    category: 'domains',
  },
  Work: {
    label: 'Work',
    color: 'bg-blue-100 text-blue-700',
    category: 'domains',
  },
  Personal: {
    label: 'Personal',
    color: 'bg-teal-100 text-teal-700',
    category: 'domains',
  },
  Errand: {
    label: 'Errand',
    color: 'bg-orange-100 text-orange-700',
    category: 'domains',
  },
  Fun: {
    label: 'Fun',
    color: 'bg-pink-100 text-pink-700',
    category: 'domains',
  },
  Offline: {
    label: 'Offline',
    color: 'bg-slate-100 text-slate-700',
    category: 'domains',
  },
};

// Helper function to get tag metadata (with fallback for custom tags)
export function getTagMetadata(tag: string): TagMetadata {
  return TAG_METADATA[tag] || {
    label: tag,
    color: 'bg-gray-100 text-gray-700',
    category: 'domains',
  };
}

// Get all tags from a category
export function getTagsByCategory(category: keyof typeof TAG_CATEGORIES): string[] {
  return TAG_CATEGORIES[category];
}

// Get all available tags
export function getAllTags(): string[] {
  return Object.values(TAG_CATEGORIES).flat();
}

// Mock tasks in new tag-based format
export const MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: 'Finalize Q3 presentation slides',
    isCompleted: false,
    status: TaskStatus.Active,
    tags: ['Work', 'DeepFocus', 'HeavyLift', 'Tech', 'Hours'],
    timeEstimate: '45min',
    createdAt: Date.now() - 100000,
    actionDate: new Date().toISOString().split('T')[0],
  },
  {
    id: '2',
    title: 'Draft project proposal for Lumina',
    isCompleted: true,
    status: TaskStatus.Active,
    tags: ['Work', 'DeepFocus', 'HeavyLift', 'Multi-Session'],
    timeEstimate: '2hr',
    createdAt: Date.now() - 200000,
  },
  {
    id: '3',
    title: 'Book flight to New York',
    isCompleted: false,
    status: TaskStatus.Active,
    tags: ['Personal', 'Admin', 'QuickWin', 'Tech', 'Minutes'],
    timeEstimate: '15min',
    createdAt: Date.now() - 300000,
    participants: ['Sarah'],
    context: 'Sarah suggested we book flights for the conference next week',
    occurredDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    source: { type: 'manual' },
  },
  {
    id: '4',
    title: 'Fix the kitchen sink leak',
    isCompleted: false,
    status: TaskStatus.Active,
    tags: ['Personal', 'Errand', 'Offline', 'Hours'],
    timeEstimate: '30min',
    createdAt: Date.now() - 400000,
    context: 'Sink was leaking badly this morning - need plumber tools',
    participants: ['John'],
    occurredDate: new Date(Date.now() - 3600000).toISOString().split('T')[0],
  },
  {
    id: '5',
    title: 'Brainstorm AI app ideas',
    isCompleted: false,
    status: TaskStatus.Active,
    tags: ['Work', 'Creative', 'Growth', 'Tech', 'Minutes'],
    timeEstimate: '10min',
    createdAt: Date.now() - 500000,
  },
];
