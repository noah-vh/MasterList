import React, { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Task, Entry, FilterState, RoutineTask } from '../types';
import { getTagMetadata, TAG_CATEGORIES, getAllTags } from '../constants';
import { motion } from 'framer-motion';
import { BookOpen, FileText, Tag, Link2, X, Search, Clock, TrendingUp, BarChart3, Sparkles } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { EntryCard } from './EntryCard';

interface LibraryViewProps {
  tasks: RoutineTask[];
  onTagClick?: (tag: string) => void;
  onCategoryClick?: (category: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement>;
  activeFilters?: FilterState;
  currentViewName?: string;
  onClearSearch?: () => void;
  onTaskClick?: (taskId: string) => void;
  onToggleTask?: (taskId: string) => void;
  visibleCategories?: string[]; // Categories to show (controlled by FilterBar toggles)
  searchQuery?: string;
  token?: string | null;
}

interface SearchCard {
  id: string;
  name: string;
  count: number;
  tasks: number;
  entries: number;
  tags: string[];
}

interface TagGroup {
  tag: string;
  count: number;
  category: 'headspace' | 'energy' | 'duration' | 'domains' | 'custom';
  metadata: ReturnType<typeof getTagMetadata>;
}

interface CategoryGroup {
  category: string;
  count: number;
  tags: TagGroup[];
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
    // Content logging fields
    contentType: convexEntry.contentType,
    sourceUrl: convexEntry.sourceUrl,
    sourceImageId: convexEntry.sourceImageId,
    analyzedContent: convexEntry.analyzedContent,
    classification: convexEntry.classification,
    hasAttachment: convexEntry.hasAttachment,
  };
};

export const LibraryView: React.FC<LibraryViewProps> = ({ 
  tasks, 
  onTagClick,
  onCategoryClick,
  scrollRef,
  activeFilters,
  currentViewName,
  onClearSearch,
  onTaskClick,
  onToggleTask,
  visibleCategories = [], // Default: show none
  searchQuery = '',
  token,
}) => {
  const entries = useQuery(api.entries.list, token ? { token } : "skip");
  
  // Convert Convex entries to frontend Entry type
  const frontendEntries = useMemo(() => {
    if (!entries || !Array.isArray(entries)) return [];
    return entries.map(convexEntryToEntry);
  }, [entries]);

  // Aggregate all items by tags
  const tagCounts = useMemo(() => {
    const counts: Record<string, { tasks: number; entries: number; content: number }> = {};
    
    // Count tasks by tag
    tasks.forEach(task => {
      task.tags.forEach(tag => {
        if (!counts[tag]) {
          counts[tag] = { tasks: 0, entries: 0, content: 0 };
        }
        counts[tag].tasks += 1;
      });
    });
    
    // Count entries by tag (including content entries)
    frontendEntries.forEach(entry => {
      if (entry.tags && entry.tags.length > 0) {
        entry.tags.forEach(tag => {
          if (!counts[tag]) {
            counts[tag] = { tasks: 0, entries: 0, content: 0 };
          }
          if (entry.entryType === 'content') {
            counts[tag].content += 1;
          } else {
            counts[tag].entries += 1;
          }
        });
      }
    });
    
    return counts;
  }, [tasks, frontendEntries]);

  // Group content entries by classification category
  const contentCategories = useMemo(() => {
    const categories: Record<string, number> = {};
    const contentEntries = frontendEntries.filter(e => e.entryType === 'content');
    
    contentEntries.forEach(entry => {
      if (entry.classification?.category) {
        const category = entry.classification.category;
        categories[category] = (categories[category] || 0) + 1;
      }
    });
    
    return Object.entries(categories)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [frontendEntries]);

  // Group tags by category and create TagGroup objects
  const tagGroups = useMemo(() => {
    const groups: TagGroup[] = [];
    
    Object.entries(tagCounts).forEach(([tag, counts]) => {
      const metadata = getTagMetadata(tag);
      const totalCount = counts.tasks + counts.entries + counts.content;
      
      if (totalCount > 0) {
        groups.push({
          tag,
          count: totalCount,
          category: metadata.category,
          metadata,
        });
      }
    });
    
    // Sort by count (most popular first)
    return groups.sort((a, b) => b.count - a.count);
  }, [tagCounts]);

  // Group tags by category
  const categoryGroups = useMemo(() => {
    const groups: Record<string, TagGroup[]> = {
      headspace: [],
      energy: [],
      duration: [],
      domains: [],
      custom: [],
    };
    
    tagGroups.forEach(tagGroup => {
      if (groups[tagGroup.category]) {
        groups[tagGroup.category].push(tagGroup);
      } else {
        groups.custom.push(tagGroup);
      }
    });
    
    // Convert to array and calculate category totals
    const categoryArray: CategoryGroup[] = Object.entries(groups)
      .filter(([_, tags]) => tags.length > 0)
      .map(([category, tags]) => ({
        category,
        count: tags.reduce((sum, tag) => sum + tag.count, 0),
        tags: tags.sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.count - a.count);
    
    return categoryArray;
  }, [tagGroups]);

  // Calculate total count and breakdown
  const totalCount = useMemo(() => {
    const contentEntries = frontendEntries.filter(e => e.entryType === 'content');
    const otherEntries = frontendEntries.filter(e => e.entryType !== 'content');
    return {
      total: tasks.length + frontendEntries.length,
      tasks: tasks.length,
      entries: otherEntries.length,
      content: contentEntries.length,
    };
  }, [tasks.length, frontendEntries]);

  const handleTagClick = (tag: string) => {
    if (onTagClick) {
      onTagClick(tag);
    }
  };

  const handleCategoryClick = (category: string) => {
    if (onCategoryClick) {
      onCategoryClick(category);
    }
  };

  // Filter items based on active search/filters
  const filteredItems = useMemo(() => {
    // If we have a text search query, filter by that first
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const searchFilteredTasks = tasks.filter(task => {
        // Search in task title
        if (task.title.toLowerCase().includes(query)) return true;
        // Search in tags
        if (task.tags.some(tag => tag.toLowerCase().includes(query))) return true;
        return false;
      });
      
      const searchFilteredEntries = frontendEntries.filter(entry => {
        // Search in entry content
        if (entry.content.toLowerCase().includes(query)) return true;
        // Search in analyzed content
        if (entry.analyzedContent?.toLowerCase().includes(query)) return true;
        // Search in classification
        if (entry.classification?.category?.toLowerCase().includes(query)) return true;
        if (entry.classification?.topics?.some(topic => topic.toLowerCase().includes(query))) return true;
        // Search in tags
        if (entry.tags?.some(tag => tag.toLowerCase().includes(query))) return true;
        return false;
      });
      
      // Apply additional filters if they exist
      let finalTasks = searchFilteredTasks;
      let finalEntries = searchFilteredEntries;
      
      if (activeFilters) {
        finalTasks = searchFilteredTasks.filter(task => {
          // Tag filter (AND logic - task must have ALL selected tags)
          if (activeFilters.tags && activeFilters.tags.length > 0) {
            const matchesTags = activeFilters.tags.every(tag => task.tags.includes(tag));
            if (!matchesTags) return false;
          }
          
          // Status filter
          if (activeFilters.status && activeFilters.status.length > 0) {
            if (!activeFilters.status.includes(task.status)) return false;
          }
          
          return true;
        });
        
        finalEntries = searchFilteredEntries.filter(entry => {
          // Tag filter (AND logic - entry must have ALL selected tags)
          if (activeFilters.tags && activeFilters.tags.length > 0) {
            const matchesTags = activeFilters.tags.every(tag => entry.tags?.includes(tag));
            if (!matchesTags) return false;
          }
          
          return true;
        });
      }
      
      return { tasks: finalTasks, entries: finalEntries };
    }
    
    // Otherwise, use existing filter logic
    if (!activeFilters || (!activeFilters.tags?.length && !currentViewName)) {
      return { tasks: [], entries: [] };
    }

    const filteredTasks = tasks.filter(task => {
      // Tag filter (AND logic - task must have ALL selected tags)
      if (activeFilters.tags && activeFilters.tags.length > 0) {
        const matchesTags = activeFilters.tags.every(tag => task.tags.includes(tag));
        if (!matchesTags) return false;
      }
      
      // Status filter
      if (activeFilters.status && activeFilters.status.length > 0) {
        if (!activeFilters.status.includes(task.status)) return false;
      }
      
      return true;
    });

    const filteredEntries = frontendEntries.filter(entry => {
      if (!entry.tags || entry.tags.length === 0) return false;
      
      // Tag filter (AND logic - entry must have ALL selected tags)
      if (activeFilters.tags && activeFilters.tags.length > 0) {
        const matchesTags = activeFilters.tags.every(tag => entry.tags?.includes(tag));
        if (!matchesTags) return false;
      }
      
      return true;
    });

    return { tasks: filteredTasks, entries: filteredEntries };
  }, [tasks, frontendEntries, activeFilters, currentViewName, searchQuery]);

  const hasActiveSearch = searchQuery.trim() || currentViewName || (activeFilters?.tags && activeFilters.tags.length > 0);

  // State for expanded search cards
  const [expandedSearchId, setExpandedSearchId] = useState<string | null>(null);

  // Create search result card data for Custom Searches category
  const customSearches = useMemo(() => {
    if (!hasActiveSearch) return [];
    
    const totalCount = filteredItems.tasks.length + filteredItems.entries.length;
    const searchName = searchQuery.trim() 
      ? `"${searchQuery}"` 
      : currentViewName || 'Search Results';
    return [{
      id: 'current-search',
      name: searchName,
      count: totalCount,
      tasks: filteredItems.tasks.length,
      entries: filteredItems.entries.length,
      tags: activeFilters?.tags || [],
    }];
  }, [hasActiveSearch, currentViewName, filteredItems, activeFilters, searchQuery]);

  // Get items for expanded search
  const expandedSearchItems = useMemo(() => {
    if (expandedSearchId === 'current-search' && hasActiveSearch) {
      return filteredItems;
    }
    return { tasks: [], entries: [] };
  }, [expandedSearchId, hasActiveSearch, filteredItems]);

  // Calculate tag usage frequency and recency
  const tagUsageData = useMemo(() => {
    const usage: Record<string, { count: number; lastUsed: number }> = {};
    
    // Track task usage
    tasks.forEach(task => {
      task.tags.forEach(tag => {
        if (!usage[tag]) {
          usage[tag] = { count: 0, lastUsed: 0 };
        }
        usage[tag].count += 1;
        usage[tag].lastUsed = Math.max(usage[tag].lastUsed, task.createdAt);
      });
    });
    
    // Track entry usage
    frontendEntries.forEach(entry => {
      if (entry.tags && entry.tags.length > 0) {
        entry.tags.forEach(tag => {
          if (!usage[tag]) {
            usage[tag] = { count: 0, lastUsed: 0 };
          }
          usage[tag].count += 1;
          usage[tag].lastUsed = Math.max(usage[tag].lastUsed, entry.createdAt);
        });
      }
    });
    
    return usage;
  }, [tasks, frontendEntries]);

  // State for expanded highlight sections
  const [expandedHighlights, setExpandedHighlights] = useState<Record<string, boolean>>({});

  // Get recently updated categories (categories with items added recently) - filtered by visible categories
  const newlyUpdatedCategories = useMemo(() => {
    const filteredCategoryGroups = categoryGroups.filter(cg => 
      visibleCategories.length === 0 || visibleCategories.includes(cg.category)
    );
    
    const categoryLastUpdated: Record<string, number> = {};
    
    // Track latest update time per category
    filteredCategoryGroups.forEach(catGroup => {
      let latestUpdate = 0;
      catGroup.tags.forEach(tagGroup => {
        const lastUsed = tagUsageData[tagGroup.tag]?.lastUsed || 0;
        latestUpdate = Math.max(latestUpdate, lastUsed);
      });
      if (latestUpdate > 0) {
        categoryLastUpdated[catGroup.category] = latestUpdate;
      }
    });
    
    // Sort by most recently updated
    return Object.entries(categoryLastUpdated)
      .sort((a, b) => b[1] - a[1])
      .slice(0, expandedHighlights.newlyUpdated ? Object.keys(categoryLastUpdated).length : 4)
      .map(([category]) => filteredCategoryGroups.find(cg => cg.category === category))
      .filter(Boolean) as CategoryGroup[];
  }, [categoryGroups, tagUsageData, expandedHighlights.newlyUpdated, visibleCategories]);

  // Filter tag groups by visible categories (if none selected, show all)
  const filteredTagGroups = useMemo(() => {
    if (!visibleCategories || visibleCategories.length === 0) return tagGroups;
    return tagGroups.filter(tg => visibleCategories.includes(tg.category));
  }, [tagGroups, visibleCategories]);

  // Get top tags for highlight sections (filtered by visible categories)
  const recentTags = useMemo(() => {
    return [...filteredTagGroups].sort((a, b) => {
      const aLastUsed = tagUsageData[a.tag]?.lastUsed || 0;
      const bLastUsed = tagUsageData[b.tag]?.lastUsed || 0;
      return bLastUsed - aLastUsed;
    }).slice(0, expandedHighlights.recent ? filteredTagGroups.length : 6);
  }, [filteredTagGroups, tagUsageData, expandedHighlights.recent]);

  const mostUsedTags = useMemo(() => {
    return [...filteredTagGroups].sort((a, b) => {
      const aFreq = tagUsageData[a.tag]?.count || 0;
      const bFreq = tagUsageData[b.tag]?.count || 0;
      return bFreq - aFreq;
    }).slice(0, expandedHighlights.mostUsed ? filteredTagGroups.length : 6);
  }, [filteredTagGroups, tagUsageData, expandedHighlights.mostUsed]);

  const biggestTags = useMemo(() => {
    return [...filteredTagGroups].sort((a, b) => b.count - a.count)
      .slice(0, expandedHighlights.biggest ? filteredTagGroups.length : 6);
  }, [filteredTagGroups, expandedHighlights.biggest]);

  // Helper to render tag cards
  const renderTagCards = (tags: TagGroup[]) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {tags.map((tagGroup, tagIndex) => {
        const bgColor = tagGroup.metadata.color.split(' ')[0];
        const textColor = tagGroup.metadata.color.split(' ')[1] || 'text-gray-700';
        
        return (
          <motion.div
            key={tagGroup.tag}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: tagIndex * 0.02 }}
            className="relative rounded-xl p-4 overflow-hidden cursor-pointer group backdrop-blur-md hover:shadow-lg transition-all duration-200"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.06)',
            }}
            onClick={() => handleTagClick(tagGroup.tag)}
          >
            <div className={`absolute inset-0 opacity-20 pointer-events-none ${bgColor}`} />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className={`text-sm font-semibold truncate ${textColor}`}>
                    {tagGroup.metadata.label}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-gray-900">{tagGroup.count}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {tagCounts[tagGroup.tag]?.tasks || 0} tasks • {tagCounts[tagGroup.tag]?.entries || 0} entries
                  {tagCounts[tagGroup.tag]?.content ? ` • ${tagCounts[tagGroup.tag].content} content` : ''}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  // Helper to render highlight section
  const renderHighlightSection = (
    title: string,
    icon: React.ReactNode,
    tags: TagGroup[],
    key: string,
    totalCount: number
  ) => {
    if (tags.length === 0) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{totalCount} items</span>
            {tags.length > 6 && (
              <button
                onClick={() => setExpandedHighlights(prev => ({ ...prev, [key]: !prev[key] }))}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {expandedHighlights[key] ? 'Show Less' : 'View More'}
              </button>
            )}
          </div>
        </div>
        {renderTagCards(tags)}
      </motion.div>
    );
  };

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-2 pb-32 no-scrollbar"
      style={{ minHeight: 0 }}
    >
      <div className="space-y-6">
        {/* Custom Searches Category */}
        {customSearches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {/* Category Header */}
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-semibold text-gray-900">Custom Searches</h3>
              <span className="text-sm text-gray-500">{customSearches.reduce((sum, s) => sum + s.count, 0)} items</span>
            </div>

            {/* Custom Search Cards Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {customSearches.map((search, index) => (
                <motion.div
                  key={search.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="relative rounded-xl p-4 overflow-hidden cursor-pointer group backdrop-blur-md hover:shadow-lg transition-all duration-200"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.06)',
                  }}
                  onClick={() => setExpandedSearchId(expandedSearchId === search.id ? null : search.id)}
                >
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-gradient-to-br from-purple-100 to-blue-100" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {search.name}
                      </span>
                    </div>
                    {search.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {search.tags.slice(0, 2).map(tag => {
                          const metadata = getTagMetadata(tag);
                          return (
                            <span
                              key={tag}
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${metadata.color}`}
                            >
                              {metadata.label}
                            </span>
                          );
                        })}
                        {search.tags.length > 2 && (
                          <span className="text-[10px] text-gray-400">+{search.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                    <div className="mt-3">
                      <div className="text-2xl font-bold text-gray-900">{search.count}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {search.tasks} tasks • {search.entries} entries
                      </div>
                    </div>
                    {onClearSearch && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearSearch();
                        }}
                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Show matching items when search card is expanded */}
            {expandedSearchId === 'current-search' && (expandedSearchItems.tasks.length > 0 || expandedSearchItems.entries.length > 0) && (
              <div className="space-y-1 mt-4">
                {/* Matching Tasks */}
                {expandedSearchItems.tasks.length > 0 && (
                  <>
                    <div className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Tasks ({expandedSearchItems.tasks.length})
                    </div>
                    {expandedSearchItems.tasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task as RoutineTask}
                        onToggle={onToggleTask || (() => {})}
                        onClick={onTaskClick || (() => {})}
                      />
                    ))}
                  </>
                )}

                {/* Matching Entries */}
                {expandedSearchItems.entries.length > 0 && (
                  <>
                    <div className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-4">
                      Entries ({expandedSearchItems.entries.length})
                    </div>
                    {expandedSearchItems.entries.map(entry => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        onTaskClick={onTaskClick}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* All Items Card - At the top */}
        {!hasActiveSearch && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-2xl p-6 overflow-hidden cursor-pointer group backdrop-blur-md hover:shadow-xl transition-all duration-200"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
            }}
            onClick={() => handleCategoryClick('all')}
          >
            <div className="absolute inset-0 opacity-50 pointer-events-none bg-gradient-to-br from-blue-50/50 to-purple-50/50" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">All Items</h2>
                  <p className="text-sm text-gray-500">Everything in your library</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-4xl font-bold text-gray-900">{totalCount.total}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {totalCount.tasks} tasks • {totalCount.entries} entries • {totalCount.content} content
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Highlight Sections - Show when no active search */}
        {!hasActiveSearch && (
          <>
            {/* Recent Tags */}
            {renderHighlightSection(
              'Recent',
              <Clock className="w-5 h-5 text-gray-500" />,
              recentTags,
              'recent',
              recentTags.reduce((sum, t) => sum + t.count, 0)
            )}

            {/* Most Used Tags */}
            {renderHighlightSection(
              'Most Used',
              <TrendingUp className="w-5 h-5 text-gray-500" />,
              mostUsedTags,
              'mostUsed',
              mostUsedTags.reduce((sum, t) => sum + t.count, 0)
            )}

            {/* Biggest Tags */}
            {renderHighlightSection(
              'Biggest',
              <BarChart3 className="w-5 h-5 text-gray-500" />,
              biggestTags,
              'biggest',
              biggestTags.reduce((sum, t) => sum + t.count, 0)
            )}

            {/* Newly Updated Categories */}
            {newlyUpdatedCategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Newly Updated</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {newlyUpdatedCategories.reduce((sum, c) => sum + c.count, 0)} items
                    </span>
                    {categoryGroups.length > 4 && (
                      <button
                        onClick={() => setExpandedHighlights(prev => ({ ...prev, newlyUpdated: !prev.newlyUpdated }))}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {expandedHighlights.newlyUpdated ? 'Show Less' : 'View More'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {newlyUpdatedCategories.map((catGroup, index) => (
                    <motion.div
                      key={catGroup.category}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="relative rounded-xl p-4 overflow-hidden cursor-pointer group backdrop-blur-md hover:shadow-lg transition-all duration-200"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.06)',
                      }}
                      onClick={() => handleCategoryClick(catGroup.category)}
                    >
                      <div className="absolute inset-0 opacity-20 pointer-events-none bg-gradient-to-br from-green-100 to-blue-100" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900 truncate capitalize">
                            {catGroup.category === 'custom' ? 'Other Tags' : catGroup.category}
                          </span>
                        </div>
                        <div className="mt-3">
                          <div className="text-2xl font-bold text-gray-900">{catGroup.count}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{catGroup.tags.length} tags</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Category Groups - Only show if toggled on in FilterBar */}
        {!hasActiveSearch && categoryGroups
          .filter(cg => visibleCategories.length === 0 || visibleCategories.includes(cg.category))
          .map((categoryGroup, categoryIndex) => (
          <motion.div
            key={categoryGroup.category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: categoryIndex * 0.05 }}
            className="space-y-3"
          >
            {/* Category Header */}
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {categoryGroup.category === 'custom' ? 'Other Tags' : categoryGroup.category}
              </h3>
              <span className="text-sm text-gray-500">{categoryGroup.count} items</span>
            </div>

            {/* Tag Cards Grid */}
            {renderTagCards(categoryGroup.tags)}
          </motion.div>
        ))}

        {/* All Items Section - Below categories */}
        {!hasActiveSearch && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {/* Category Header */}
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-semibold text-gray-900">All</h3>
              <span className="text-sm text-gray-500">{totalCount.total} items</span>
            </div>

            {/* All Tags Grid */}
            {renderTagCards(tagGroups)}
          </motion.div>
        )}

        {/* Empty State - Only show when no search and no tags */}
        {!hasActiveSearch && tagGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 text-center opacity-50">
            <div className="bg-gray-200 p-4 rounded-full mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No tags found</p>
            <p className="text-sm text-gray-400 mt-1">
              Add tags to tasks and entries to see them organized here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

