import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FilterState, DateScope, TaskStatus, TimeBlockTemplate } from '../types';
import { X, Sparkles, Calendar, Check, ChevronDown, Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_FILTER_GROUPS, TAG_CATEGORIES, getTagMetadata, getAllTags, FilterGroup } from '../constants';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
// import { FilterGroupCreator } from './FilterGroupCreator'; // Removed as inline creation is used

interface FilterBarProps {
  activeFilters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  currentViewName?: string;
  onClearView: () => void;
  currentView?: 'today' | 'master' | 'routines' | 'timeline' | 'library' | 'entries';
  showRoutinesFilter?: boolean;
  onToggleRoutinesFilter?: (show: boolean) => void;
  templates?: TimeBlockTemplate[];
  selectedTemplateId?: string | null;
  onSelectTemplate?: (templateId: string | null) => void;
  visibleCategories?: string[];
  onToggleCategory?: (category: string, visible: boolean) => void;
  showContentEntries?: boolean;
  onToggleContentEntries?: (show: boolean) => void;
  showTaskNotifications?: boolean;
  onToggleTaskNotifications?: (show: boolean) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ 
  activeFilters, 
  setFilters, 
  currentViewName, 
  onClearView,
  currentView = 'master',
  showRoutinesFilter = false,
  onToggleRoutinesFilter,
  templates = [],
  selectedTemplateId,
  onSelectTemplate,
  visibleCategories = [],
  onToggleCategory,
  showContentEntries = true,
  onToggleContentEntries,
  showTaskNotifications = true,
  onToggleTaskNotifications,
}) => {
  const createTemplate = useMutation(api.timeBlocks.createTemplate);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const templateInputRef = useRef<HTMLInputElement>(null);
  
  // Focus input when creating template
  useEffect(() => {
    if (isCreatingTemplate && templateInputRef.current) {
      templateInputRef.current.focus();
    }
  }, [isCreatingTemplate]);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<'date' | string | null>(null);
  const [filterGroups, setFilterGroups] = useState(DEFAULT_FILTER_GROUPS);
  const [selectedTagsByCategory, setSelectedTagsByCategory] = useState<Record<string, string[]>>({});
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const groupButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  
  // Inline Group Creation State (for Library view)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupTags, setNewGroupTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const addGroupButtonRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const handleDateSelect = (value: DateScope) => {
    setFilters(prev => ({ ...prev, dateScope: value }));
    setOpenMenu(null);
  };

  const toggleMenu = (menu: 'date' | string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setOpenMenu(prev => prev === menu ? null : menu);
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
        color: 'bg-gray-100 text-gray-700 border-gray-200',
      };
      setFilterGroups(prev => [...prev, newGroup]);
      setIsCreatingGroup(false);
      setNewGroupName('');
      setNewGroupTags([]);
      setTagSearch('');
    }
  };

  // Focus input when creating group
  useEffect(() => {
    if (isCreatingGroup && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreatingGroup]);

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
  const renderDropdownPortal = (content: React.ReactNode, buttonRef: React.RefObject<HTMLElement>, isOpen: boolean) => {
    if (!isOpen || typeof window === 'undefined') return null;
    if (!buttonRef.current) return null;
    
    const position = getDropdownPosition(buttonRef);
    
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

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenu) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      if (menuRef.current && menuRef.current.contains(target as Node)) {
        return;
      }
      
      const dropdown = target.closest('[data-dropdown-menu]');
      if (dropdown) {
        return;
      }
      
      setOpenMenu(null);
    };
    
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [openMenu]);

  // Sync selectedTagsByCategory with activeFilters.tags
  useEffect(() => {
    // Rebuild selectedTagsByCategory from activeFilters.tags
    const newSelected: Record<string, string[]> = {};
    if (activeFilters.tags) {
      activeFilters.tags.forEach(tag => {
        // Find which filter group this tag belongs to
        const metadata = getTagMetadata(tag);
        const category = metadata.category;
        
        // Find the filter group that matches this category
        const matchingGroup = filterGroups.find(g => 
          g.category === category || (g.tags && g.tags.includes(tag))
        );
        
        if (matchingGroup) {
          if (!newSelected[matchingGroup.id]) {
            newSelected[matchingGroup.id] = [];
          }
          newSelected[matchingGroup.id].push(tag);
        }
      });
    }
    setSelectedTagsByCategory(newSelected);
  }, [activeFilters.tags, filterGroups]);

  const clearAll = () => {
    if (currentViewName) {
      onClearView();
    } else {
      setSelectedTagsByCategory({});
      setFilters({ tags: [], status: [], dateScope: 'All' });
    }
  };

  const handleCreateTemplate = async () => {
    if (newTemplateName.trim()) {
      try {
        const templateId = await createTemplate({ name: newTemplateName.trim() });
        if (onSelectTemplate) {
          onSelectTemplate(templateId);
        }
        setIsCreatingTemplate(false);
        setNewTemplateName('');
      } catch (error) {
        console.error('Error creating template:', error);
      }
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


  // Show template selector when on timeline view
  if (currentView === 'timeline') {
    return (
      <div className="pt-2 pb-2 px-4" ref={menuRef}>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate?.(template.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap flex-shrink-0
                ${selectedTemplateId === template.id
                  ? 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-offset-1 ring-blue-300'
                  : 'bg-white/60 text-gray-700 border-white/40 hover:border-white/60 hover:bg-white/80 backdrop-blur-sm'
                }
              `}
            >
              <span>{template.name}</span>
              {template.isDefault && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-xs font-semibold">
                  Default
                </span>
              )}
            </button>
          ))}
          
          {isCreatingTemplate ? (
            <div className="relative flex-shrink-0">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap bg-white/80 backdrop-blur-md border-white/50 ring-2 ring-blue-100">
                <input
                  ref={templateInputRef}
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Template name..."
                  className="bg-transparent outline-none border-none p-0 text-gray-900 placeholder-gray-400 min-w-[120px]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTemplate();
                    if (e.key === 'Escape') {
                      setIsCreatingTemplate(false);
                      setNewTemplateName('');
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-1">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleCreateTemplate(); 
                    }}
                    disabled={!newTemplateName.trim()}
                    className="p-1 hover:bg-gray-100 rounded-full text-blue-600 disabled:text-gray-300 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setIsCreatingTemplate(false);
                      setNewTemplateName('');
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsCreatingTemplate(true);
                setTimeout(() => templateInputRef.current?.focus(), 0);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-white/40 shadow-sm transition-all whitespace-nowrap flex-shrink-0 bg-white/60 backdrop-blur-sm text-gray-700 hover:border-white/60 hover:bg-white/80"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Template</span>
            </button>
          )}
        </div>
      </div>
    );
  }


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
            {/* View Toggles Row - Simple on/off toggles */}
            <div className="-mx-4">
              <div 
                className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 pb-2"
                style={{
                  maskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)'
                }}
              >
              
              {/* Entries View Toggles */}
              {currentView === 'entries' && (
                <>
                  {onToggleContentEntries && (
                    <button
                      type="button"
                      onClick={() => onToggleContentEntries(!showContentEntries)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap flex-shrink-0 bg-white/60 text-gray-700 border-white/40 hover:bg-white/80 hover:border-white/60`}
                    >
                      <span>Content</span>
                      {showContentEntries && (
                        <div className="w-4 h-4 rounded-full border border-blue-400 flex items-center justify-center">
                          <Check className="w-3 h-3 text-blue-500" />
                        </div>
                      )}
                    </button>
                  )}
                  {onToggleTaskNotifications && (
                    <button
                      type="button"
                      onClick={() => onToggleTaskNotifications(!showTaskNotifications)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap flex-shrink-0 bg-white/60 text-gray-700 border-white/40 hover:bg-white/80 hover:border-white/60`}
                    >
                      <span>Tasks</span>
                      {showTaskNotifications && (
                        <div className="w-4 h-4 rounded-full border border-blue-400 flex items-center justify-center">
                          <Check className="w-3 h-3 text-blue-500" />
                        </div>
                      )}
                    </button>
                  )}
                </>
              )}

              {/* Routines Filter Toggle (Master view only) */}
              {currentView === 'master' && onToggleRoutinesFilter && (
                <button
                  type="button"
                  onClick={() => onToggleRoutinesFilter(!showRoutinesFilter)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap flex-shrink-0 bg-white/60 text-gray-700 border-white/40 hover:bg-white/80 hover:border-white/60`}
                >
                  <span>Routines</span>
                  {showRoutinesFilter && (
                    <div className="w-4 h-4 rounded-full border border-blue-400 flex items-center justify-center">
                      <Check className="w-3 h-3 text-blue-500" />
                    </div>
                  )}
                </button>
              )}

              {/* Date/Time Filter - Dropdown - Hidden on entries view */}
              {currentView !== 'entries' && (
                <div className="relative flex-shrink-0">
                  <button
                    ref={dateButtonRef}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleMenu('date');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap flex-shrink-0 bg-white/60 text-gray-700 border-white/40 hover:bg-white/80 hover:border-white/60`}
                  >
                    <Calendar className={`w-3.5 h-3.5 ${!isDateActive && openMenu !== 'date' ? 'text-gray-400' : ''}`} />
                    <span>{currentDateValue}</span>
                    <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${openMenu === 'date' ? 'rotate-180' : ''}`} />
                  </button>

                  {renderDropdownPortal(
                    <AnimatePresence>
                      {openMenu === 'date' && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="w-48 bg-white/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/40 overflow-hidden origin-top-left"
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
              )}

              {/* Filter Group Pills - Show on all views except Library */}
              {currentView !== 'library' && filterGroups.map(group => {
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
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap z-10 relative bg-white/60 text-gray-700 border-white/40 hover:bg-white/80 hover:border-white/60"
                    >
                      <span>{group.name}</span>
                      {isActive && !isOpen && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                          {selectedTags.length}
                        </span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
                              className="w-64 bg-white/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/40 overflow-hidden origin-top-left"
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

              {/* Category View Toggles - Only show on Library view */}
              {currentView === 'library' && (
                <>
                  {Object.keys(TAG_CATEGORIES).map(category => {
                    const isVisible = visibleCategories.includes(category);
                    
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          if (onToggleCategory) {
                            onToggleCategory(category, !isVisible);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap flex-shrink-0 bg-white/60 text-gray-700 border-white/40 hover:bg-white/80 hover:border-white/60"
                      >
                        <span className="capitalize">{category}</span>
                        {isVisible && (
                          <div className="w-4 h-4 rounded-full border border-blue-400 flex items-center justify-center">
                            <Check className="w-3 h-3 text-blue-500" />
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Custom Filter Groups (for Library) */}
                  {filterGroups.filter(g => !g.category).map(group => {
                    const isVisible = visibleCategories.includes(group.id);
                    
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          if (onToggleCategory) {
                            onToggleCategory(group.id, !isVisible);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap flex-shrink-0 bg-white/60 text-gray-700 border-white/40 hover:bg-white/80 hover:border-white/60"
                      >
                        <span>{group.name}</span>
                        {isVisible && (
                          <div className="w-4 h-4 rounded-full border border-blue-400 flex items-center justify-center">
                            <Check className="w-3 h-3 text-blue-500" />
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Add New Group Button - Inline */}
                  {!isCreatingGroup ? (
                    <button
                      onClick={() => setIsCreatingGroup(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-white/40 shadow-sm transition-all whitespace-nowrap flex-shrink-0 bg-white/60 backdrop-blur-sm text-gray-700 hover:border-white/60 hover:bg-white/80"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  ) : (
                    <div ref={addGroupButtonRef} className="relative z-50">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-sm transition-all whitespace-nowrap bg-white/80 backdrop-blur-md border-white/50 ring-2 ring-blue-100">
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
                            if (e.key === 'Escape') {
                              setIsCreatingGroup(false);
                              setNewGroupName('');
                              setNewGroupTags([]);
                              setTagSearch('');
                            }
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
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setIsCreatingGroup(false);
                              setNewGroupName('');
                              setNewGroupTags([]);
                              setTagSearch('');
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {renderDropdownPortal(
                        <motion.div 
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className="w-64 bg-white/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/40 overflow-hidden origin-top-left"
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
                </>
              )}

              {/* Clear All Button */}
              {(Object.keys(selectedTagsByCategory).length > 0 || isDateActive) && (
                <button
                  onClick={clearAll}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-white/60 backdrop-blur-sm text-gray-600 border border-white/40 hover:bg-white/80 transition-colors flex-shrink-0"
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
