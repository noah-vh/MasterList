import { TaskStatus } from './types';

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

// Default Filter Groups (Category-based views)
export interface FilterGroup {
  id: string;
  name: string;
  category?: 'headspace' | 'energy' | 'duration' | 'domains';
  tags?: string[]; // Custom list of tags for this group
  color?: string;
  icon?: string;
}

export const DEFAULT_FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'energy',
    name: 'Energy',
    category: 'energy',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  {
    id: 'headspace',
    name: 'Headspace',
    category: 'headspace',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  {
    id: 'domains',
    name: 'Domains',
    category: 'domains',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    id: 'duration',
    name: 'Duration',
    category: 'duration',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
];

// Routine constants
export const ROUTINE_BADGE_COLOR = 'bg-purple-100 text-purple-700';

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];
