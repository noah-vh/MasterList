import React, { useState, useEffect, useRef } from 'react';
import { FilterState, DateScope, TaskStatus } from '../types';
import { X, Sparkles, ChevronDown, Calendar, Check, Tag as TagIcon, Filter } from 'lucide-react';
import { TagInput } from './TagInput';

interface FilterBarProps {
  activeFilters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  currentViewName?: string;
  onClearView: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ activeFilters, setFilters, currentViewName, onClearView }) => {
  const [openMenu, setOpenMenu] = useState<'date' | 'status' | null>(null);
  const [showTagInput, setShowTagInput] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMenu = (menu: 'date' | 'status') => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const handleDateSelect = (value: DateScope) => {
    setFilters(prev => ({ ...prev, dateScope: value }));
    setOpenMenu(null);
  };

  const handleStatusToggle = (status: TaskStatus) => {
    setFilters(prev => {
      const currentStatus = prev.status || [];
      const newStatus = currentStatus.includes(status)
        ? currentStatus.filter(s => s !== status)
        : [...currentStatus, status];
      return { ...prev, status: newStatus };
    });
  };

  const clearAll = () => {
    if (currentViewName) {
      onClearView();
    } else {
      setFilters({ tags: [], status: [], dateScope: 'All' });
      setShowTagInput(false);
    }
  };

  const handleTagsChange = (tags: string[]) => {
    setFilters(prev => ({ ...prev, tags }));
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

  const isStatusActive = activeFilters.status.length > 0;
  const isTagsActive = activeFilters.tags.length > 0;

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
    <div className="sticky top-0 z-10 bg-[#F3F4F6]/95 backdrop-blur-sm pt-2 pb-4 px-6 border-b border-gray-200/50">
      <div className="flex flex-col gap-3" ref={menuRef}>
        
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
            {/* Filter Pills Row */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar w-full pb-1">
              
              {/* Date/Time Filter */}
              <div className="relative">
                <button
                  onClick={() => toggleMenu('date')}
                  className={getPillClasses(openMenu === 'date', isDateActive)}
                >
                  <Calendar className={`w-3.5 h-3.5 ${!isDateActive && openMenu !== 'date' ? 'text-gray-400' : ''}`} />
                  <span>{currentDateValue}</span>
                  <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${openMenu === 'date' ? 'rotate-180' : ''}`} />
                </button>

                {openMenu === 'date' && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 duration-200 z-50">
                    <div className="p-1">
                      <button 
                        onClick={() => handleDateSelect('All')} 
                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between"
                      >
                        <span>All Time</span>
                        {activeFilters.dateScope === 'All' && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                      <div className="h-px bg-gray-100 my-1"></div>
                      <button 
                        onClick={() => handleDateSelect('Today')} 
                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between"
                      >
                        <span>Today</span>
                        {activeFilters.dateScope === 'Today' && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                      <button 
                        onClick={() => handleDateSelect('ThisWeek')} 
                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between"
                      >
                        <span>This Week</span>
                        {activeFilters.dateScope === 'ThisWeek' && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                      <button 
                        onClick={() => handleDateSelect('Overdue')} 
                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between"
                      >
                        <span>Overdue</span>
                        {activeFilters.dateScope === 'Overdue' && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative">
                <button
                  onClick={() => toggleMenu('status')}
                  className={getPillClasses(openMenu === 'status', isStatusActive)}
                >
                  <Filter className={`w-3.5 h-3.5 ${!isStatusActive && openMenu !== 'status' ? 'text-gray-400' : ''}`} />
                  <span>
                    {activeFilters.status.length === 0 
                      ? 'Status' 
                      : activeFilters.status.length === 1 
                        ? activeFilters.status[0]
                        : `${activeFilters.status.length} Statuses`
                    }
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${openMenu === 'status' ? 'rotate-180' : ''}`} />
                </button>

                {openMenu === 'status' && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 duration-200 z-50">
                    <div className="p-1">
                      {Object.values(TaskStatus).map(status => (
                        <button
                          key={status}
                          onClick={() => handleStatusToggle(status)}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between"
                        >
                          <span>{status}</span>
                          {activeFilters.status.includes(status) && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tags Filter Toggle */}
              <button
                onClick={() => setShowTagInput(!showTagInput)}
                className={getPillClasses(false, isTagsActive)}
              >
                <TagIcon className={`w-3.5 h-3.5 ${!isTagsActive ? 'text-gray-400' : ''}`} />
                <span>
                  {activeFilters.tags.length === 0 
                    ? 'Tags' 
                    : `${activeFilters.tags.length} Tag${activeFilters.tags.length > 1 ? 's' : ''}`
                  }
                </span>
              </button>

              {/* Clear All Button */}
              {(isTagsActive || isStatusActive || isDateActive) && (
                <button
                  onClick={clearAll}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Tag Input (shown when toggled) */}
            {showTagInput && (
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <TagInput
                  tags={activeFilters.tags}
                  onChange={handleTagsChange}
                  placeholder="Filter by tags..."
                  allowCustom={true}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
