import React, { useState, useEffect, useRef } from 'react';
import { FilterState, DateScope, TaskStatus } from '../types';
import { X, Sparkles, Plus, Calendar, Check, ChevronDown } from 'lucide-react';
import { DEFAULT_FILTER_GROUPS, FilterGroup, TAG_CATEGORIES, getTagMetadata } from '../constants';
import { FilterGroupCreator } from './FilterGroupCreator';

interface FilterBarProps {
  activeFilters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  currentViewName?: string;
  onClearView: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ activeFilters, setFilters, currentViewName, onClearView }) => {
  const [openMenu, setOpenMenu] = useState<'date' | string | null>(null);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>(DEFAULT_FILTER_GROUPS);
  const [selectedTagsByCategory, setSelectedTagsByCategory] = useState<Record<string, string[]>>({});
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenu) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking inside the menu container
      if (menuRef.current && menuRef.current.contains(target as Node)) {
        return;
      }
      
      // Check if clicking inside any dropdown menu (they have z-50)
      const dropdown = target.closest('.z-50');
      if (dropdown) {
        return;
      }
      
      // Close menu if clicking outside
      setOpenMenu(null);
    };
    
    // Use click event with capture phase to catch events early
    // Add a small delay to let button clicks process first
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [openMenu]);

  const toggleMenu = (menu: 'date' | string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setOpenMenu(prev => prev === menu ? null : menu);
  };

  const handleDateSelect = (value: DateScope) => {
    setFilters(prev => ({ ...prev, dateScope: value }));
    setOpenMenu(null);
  };

  const handleCategoryTagToggle = (category: string, tag: string) => {
    setSelectedTagsByCategory(prev => {
      const currentTags = prev[category] || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];
      
      // Update filters with all selected tags from all categories
      const allSelectedTags = Object.entries({ ...prev, [category]: newTags })
        .flatMap(([_, tags]) => tags);
      
      setFilters(prevFilters => ({
        ...prevFilters,
        tags: allSelectedTags,
      }));
      
      return { ...prev, [category]: newTags };
    });
  };

  const handleCategoryClear = (category: string) => {
    setSelectedTagsByCategory(prev => {
      const newState = { ...prev };
      delete newState[category];
      
      // Update filters
      const allSelectedTags = Object.values(newState).flat();
      setFilters(prevFilters => ({
        ...prevFilters,
        tags: allSelectedTags,
      }));
      
      return newState;
    });
  };

  const handleCreateGroup = (group: FilterGroup) => {
    setFilterGroups(prev => [...prev, group]);
    setShowGroupCreator(false);
  };

  const clearAll = () => {
    if (currentViewName) {
      onClearView();
    } else {
      setSelectedTagsByCategory({});
      setFilters({ tags: [], status: [], dateScope: 'All' });
    }
  };

  // Derived state for display
  let currentDateValue = 'All Time';
  let isDateActive = false;

  if (activeFilters.dateScope === 'Today') {
    currentDateValue = 'Today';
    isDateActive = true;
  } else if (activeFilters.dateScope === 'ThisWeek') {
    currentDateValue = 'This Week';
    isDateActive = true;
  } else if (activeFilters.dateScope === 'Overdue') {
    currentDateValue = 'Overdue';
    isDateActive = true;
  }

  const getPillClasses = (isOpen: boolean, isActive: boolean) => `
    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap
    ${isOpen 
      ? 'bg-gray-900 text-white border-gray-900' 
      : isActive 
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
    }
  `;

  return (
    <div className="sticky top-0 z-10 bg-[#F3F4F6]/95 backdrop-blur-sm pt-2 pb-4 px-6 border-b border-gray-200/50" ref={menuRef}>
      <div className="flex flex-col gap-3">
        
        {/* AI View Active State */}
        {currentViewName ? (
          <div className="flex items-center gap-2 w-full animate-in fade-in zoom-in duration-300">
            <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold shadow-sm border border-purple-200">
              <Sparkles className="w-4 h-4" />
              <span className="truncate">{currentViewName}</span>
            </div>
            <button 
              onClick={clearAll}
              className="p-2 bg-white text-gray-400 rounded-full hover:bg-gray-50 hover:text-gray-600 transition-colors border border-gray-200 shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Filter Groups Row */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full pb-1">
              
              {/* Date/Time Filter */}
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMenu('date', e);
                  }}
                  className={getPillClasses(openMenu === 'date', isDateActive)}
                >
                  <Calendar className={`w-3.5 h-3.5 ${!isDateActive && openMenu !== 'date' ? 'text-gray-400' : ''}`} />
                  <span>{currentDateValue}</span>
                  <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${openMenu === 'date' ? 'rotate-180' : ''}`} />
                </button>

                {openMenu === 'date' && (
                  <div 
                    className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 duration-200 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateSelect('All');
                        }} 
                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between"
                      >
                        <span>All Time</span>
                        {activeFilters.dateScope === 'All' && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                      <div className="h-px bg-gray-100 my-1"></div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateSelect('Today');
                        }} 
                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between"
                      >
                        <span>Today</span>
                        {activeFilters.dateScope === 'Today' && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateSelect('ThisWeek');
                        }} 
                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between"
                      >
                        <span>This Week</span>
                        {activeFilters.dateScope === 'ThisWeek' && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateSelect('Overdue');
                        }} 
                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between"
                      >
                        <span>Overdue</span>
                        {activeFilters.dateScope === 'Overdue' && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Filter Group Pills */}
              {filterGroups.map(group => {
                const isOpen = openMenu === group.id;
                const selectedTags = selectedTagsByCategory[group.id] || [];
                const isActive = selectedTags.length > 0;
                const groupColor = group.color || 'bg-gray-100 text-gray-700 border-gray-200';
                const categoryTags = TAG_CATEGORIES[group.category] || [];
                
                return (
                  <div key={group.id} className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleMenu(group.id, e);
                      }}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap
                        ${isOpen 
                          ? 'bg-gray-900 text-white border-gray-900' 
                          : isActive 
                            ? `${groupColor} ring-2 ring-offset-1 ring-gray-300` 
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <span>{group.name}</span>
                      {isActive && !isOpen && (
                        <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-semibold">
                          {selectedTags.length}
                        </span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && categoryTags.length > 0 && (
                      <div 
                        className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[100]"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <div className="p-2">
                          <div className="flex items-center justify-between px-3 py-2 mb-1 border-b border-gray-100">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              {group.name}
                            </span>
                            {selectedTags.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCategoryClear(group.id);
                                }}
                                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          <div className="space-y-0.5 max-h-64 overflow-y-auto">
                            {categoryTags && categoryTags.length > 0 ? (
                              categoryTags.map(tag => {
                                const isSelected = selectedTags.includes(tag);
                                const tagMetadata = getTagMetadata(tag);
                                return (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCategoryTagToggle(group.id, tag);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected ? 'bg-blue-600' : 'bg-gray-300'}`} />
                                      <span className={isSelected ? tagMetadata.color.split(' ')[1] || 'text-gray-700' : 'text-gray-700'}>
                                        {tagMetadata.label}
                                      </span>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-3 py-2 text-sm text-gray-400 text-center">
                                No tags available
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Custom Group Button */}
              <button
                onClick={() => setShowGroupCreator(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 shadow-sm transition-all whitespace-nowrap flex-shrink-0 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Group</span>
              </button>

              {/* Clear All Button */}
              {(Object.keys(selectedTagsByCategory).length > 0 || isDateActive) && (
                <button
                  onClick={clearAll}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </>
        )}
        
        {/* Filter Group Creator Modal */}
        {showGroupCreator && (
          <FilterGroupCreator
            onSave={handleCreateGroup}
            onCancel={() => setShowGroupCreator(false)}
          />
        )}
      </div>
    </div>
  );
};