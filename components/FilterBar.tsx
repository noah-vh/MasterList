import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FilterState, DateScope, TaskStatus } from '../types';
import { X, Sparkles, Plus, Calendar, Check, ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_FILTER_GROUPS, FilterGroup, TAG_CATEGORIES, getTagMetadata, getAllTags } from '../constants';
// import { FilterGroupCreator } from './FilterGroupCreator'; // Removed as inline creation is used

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
  
  // Inline Group Creation State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupTags, setNewGroupTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  
  const menuRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for dropdown positioning
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const groupButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const addGroupButtonRef = useRef<HTMLDivElement>(null);
  
  // State to force re-render on scroll/resize for portal positioning
  const [, forceUpdate] = useState(0);
  
  // Update dropdown positions on scroll/resize
  useEffect(() => {
    if (!openMenu && !isCreatingGroup) return;
    
    const updatePositions = () => {
      forceUpdate(prev => prev + 1);
    };
    
    window.addEventListener('scroll', updatePositions, true);
    window.addEventListener('resize', updatePositions);
    
    return () => {
      window.removeEventListener('scroll', updatePositions, true);
      window.removeEventListener('resize', updatePositions);
    };
  }, [openMenu, isCreatingGroup]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenu && !isCreatingGroup) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking inside the menu container
      if (menuRef.current && menuRef.current.contains(target as Node)) {
        return;
      }
      
      // Check if clicking inside any dropdown menu
      const dropdown = target.closest('[data-dropdown-menu]');
      if (dropdown) {
        return;
      }
      
      // Close menu if clicking outside
      setOpenMenu(null);
      if (isCreatingGroup) {
        setIsCreatingGroup(false);
        setNewGroupName('');
        setNewGroupTags([]);
        setTagSearch('');
      }
    };
    
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [openMenu, isCreatingGroup]);

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

  const handleSaveNewGroup = () => {
    if (newGroupName.trim()) {
      const newGroup: FilterGroup = {
        id: `custom-${Date.now()}`,
        name: newGroupName.trim(),
        tags: newGroupTags.length > 0 ? newGroupTags : undefined,
        category: newGroupTags.length === 0 ? 'domains' : undefined,
        color: 'bg-gray-100 text-gray-700 border-gray-200',
      };
      setFilterGroups(prev => [...prev, newGroup]);
      setIsCreatingGroup(false);
      setNewGroupName('');
      setNewGroupTags([]);
      setTagSearch('');
    }
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

  // Helper to get dropdown position
  const getDropdownPosition = (buttonRef: React.RefObject<HTMLElement>) => {
    if (!buttonRef.current) return { top: 0, left: 0 };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    };
  };

  // Render dropdown portal
  const renderDropdownPortal = (content: React.ReactNode, buttonRef: React.RefObject<HTMLElement> | { current: HTMLElement | null }, isOpen: boolean) => {
    if (!isOpen || typeof window === 'undefined') return null;
    if (!buttonRef.current) return null;
    
    const position = getDropdownPosition(buttonRef as React.RefObject<HTMLElement>);
    
    return createPortal(
      <div
        data-dropdown-menu
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: 1000,
        }}
      >
        {content}
      </div>,
      document.body
    );
  };

  return (
    <div className="pt-2 pb-1 px-4" ref={menuRef}>
      <div className="flex flex-col gap-3">
        
        {/* AI View Active State */}
        {currentViewName ? (
          <div className="flex items-center gap-2 w-full animate-in fade-in zoom-in duration-300">
            <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold shadow-sm border border-purple-200 min-w-0">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="truncate">{currentViewName}</span>
            </div>
            <button 
              onClick={clearAll}
              className="p-2 bg-white text-gray-400 rounded-full hover:bg-gray-50 hover:text-gray-600 transition-colors border border-gray-200 shadow-sm shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Filter Groups Row */}
            <div className="-mx-4">
              <div 
                className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 pb-2"
                style={{
                  maskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)'
                }}
              >
              
              {/* Date/Time Filter */}
              <div className="relative flex-shrink-0">
                <button
                  ref={dateButtonRef}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMenu('date', e);
                  }}
                  className={`${getPillClasses(openMenu === 'date', isDateActive)} z-10 relative`}
                >
                  <Calendar className={`w-3.5 h-3.5 ${!isDateActive && openMenu !== 'date' ? 'text-gray-400' : ''}`} />
                  <span>{currentDateValue}</span>
                  <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${openMenu === 'date' ? '' : 'rotate-180'}`} />
                </button>

                {renderDropdownPortal(
                  <AnimatePresence>
                    {openMenu === 'date' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden origin-top-left"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDateSelect('All');
                            }} 
                            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between transition-colors"
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
                            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between transition-colors"
                          >
                            <span>Today</span>
                            {activeFilters.dateScope === 'Today' && <Check className="w-4 h-4 text-blue-600" />}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDateSelect('ThisWeek');
                            }} 
                            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between transition-colors"
                          >
                            <span>This Week</span>
                            {activeFilters.dateScope === 'ThisWeek' && <Check className="w-4 h-4 text-blue-600" />}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDateSelect('Overdue');
                            }} 
                            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between transition-colors"
                          >
                            <span>Overdue</span>
                            {activeFilters.dateScope === 'Overdue' && <Check className="w-4 h-4 text-blue-600" />}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>,
                  dateButtonRef,
                  openMenu === 'date'
                )}
              </div>

              {/* Filter Group Pills */}
              {filterGroups.map(group => {
                const isOpen = openMenu === group.id;
                const selectedTags = selectedTagsByCategory[group.id] || [];
                const isActive = selectedTags.length > 0;
                const groupColor = group.color || 'bg-gray-100 text-gray-700 border-gray-200';
                const categoryTags = group.tags || (group.category ? TAG_CATEGORIES[group.category] : []);
                
                if (!groupButtonRefs.current[group.id]) {
                  groupButtonRefs.current[group.id] = null;
                }
                
                return (
                  <div key={group.id} className="relative flex-shrink-0">
                    <button
                      ref={(el) => { groupButtonRefs.current[group.id] = el; }}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleMenu(group.id, e);
                      }}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap z-10 relative
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
                      <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`} />
                    </button>

                    {(() => {
                      const buttonRef = { current: groupButtonRefs.current[group.id] };
                      return renderDropdownPortal(
                        <AnimatePresence>
                          {isOpen && categoryTags.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className="w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden origin-top-left"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <div className="p-1">
                                <div className="space-y-0.5 max-h-64 overflow-y-auto custom-scrollbar">
                                  {categoryTags.length > 0 ? (
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
                                {selectedTags.length > 0 && (
                                    <div className="border-t border-gray-50 mt-1 pt-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCategoryClear(group.id);
                                        }}
                                        className="w-full text-center text-xs text-gray-400 hover:text-gray-600 px-2 py-2 transition-colors"
                                      >
                                        Clear Selection
                                      </button>
                                    </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>,
                        buttonRef,
                        isOpen
                      );
                    })()}
                  </div>
                );
              })}

              {/* Add Custom Group Button / Inline Creator */}
              <div className="relative flex-shrink-0">
                {!isCreatingGroup ? (
                  <button
                    onClick={() => setIsCreatingGroup(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 shadow-sm transition-all whitespace-nowrap flex-shrink-0 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Group</span>
                  </button>
                ) : (
                  <div ref={addGroupButtonRef} className="relative z-50">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap bg-white border-gray-300 ring-2 ring-blue-100">
                      <input
                        ref={createInputRef}
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Group Name..."
                        className="bg-transparent outline-none border-none p-0 text-gray-900 placeholder-gray-400 min-w-[100px]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNewGroup();
                          if (e.key === 'Escape') setIsCreatingGroup(false);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-1">
                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">
                          {newGroupTags.length}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleSaveNewGroup(); }}
                          disabled={!newGroupName.trim()}
                          className="p-1 hover:bg-gray-100 rounded-full text-blue-600 disabled:text-gray-300 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {renderDropdownPortal(
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden origin-top-left"
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-2 border-b border-gray-100">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input 
                              type="text"
                              value={tagSearch}
                              onChange={(e) => setTagSearch(e.target.value)}
                              placeholder="Search tags..."
                              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="p-1 max-h-64 overflow-y-auto custom-scrollbar">
                          {getAllTags().filter(t => t.toLowerCase().includes(tagSearch.toLowerCase())).map(tag => {
                            const isSelected = newGroupTags.includes(tag);
                            const meta = getTagMetadata(tag);
                            return (
                              <button
                                key={tag}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewGroupTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-gray-300'}`} />
                                  <span className={isSelected ? meta.color.split(' ')[1] || 'text-gray-900' : 'text-gray-700'}>
                                    {meta.label}
                                  </span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                            );
                          })}
                          {getAllTags().filter(t => t.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && (
                            <div className="text-center py-4 text-gray-400 text-xs">No matching tags</div>
                          )}
                        </div>
                      </motion.div>,
                      addGroupButtonRef,
                      isCreatingGroup
                    )}
                  </div>
                )}
              </div>

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
            </div>
          </>
        )}
      </div>
    </div>
  );
};
