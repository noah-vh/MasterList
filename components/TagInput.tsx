import React, { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Add01Icon, Search01Icon, Tag01Icon } from '@hugeicons/core-free-icons';
import { TAG_CATEGORIES, TAG_METADATA, getTagMetadata, getAllTags } from '../constants';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  allowCustom?: boolean;
  categoryFilter?: 'headspace' | 'energy' | 'duration' | 'domains';
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Add tags...',
  maxTags,
  allowCustom = true,
  categoryFilter,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter available tags
  const availableTags = React.useMemo(() => {
    const allTags = categoryFilter 
      ? TAG_CATEGORIES[categoryFilter]
      : getAllTags();
    
    // Filter out already selected tags and filter by input
    const filtered = allTags.filter(tag => {
      const isNotSelected = !tags.includes(tag);
      const matchesInput = !inputValue || 
        tag.toLowerCase().includes(inputValue.toLowerCase()) ||
        getTagMetadata(tag).label.toLowerCase().includes(inputValue.toLowerCase());
      return isNotSelected && matchesInput;
    });

    // If custom tags allowed and input doesn't match, suggest creating it
    if (allowCustom && inputValue && !filtered.some(t => t.toLowerCase() === inputValue.toLowerCase())) {
      return [inputValue, ...filtered];
    }

    return filtered;
  }, [tags, inputValue, categoryFilter, allowCustom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay to allow click events on dropdown
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 200);
  };

  const handleAddTag = (tag: string) => {
    if (maxTags && tags.length >= maxTags) return;
    if (!tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (availableTags.length > 0) {
        handleAddTag(availableTags[highlightedIndex] || inputValue.trim());
      } else if (allowCustom) {
        handleAddTag(inputValue.trim());
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < availableTags.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      handleRemoveTag(tags[tags.length - 1]);
    }
  };

  // Group suggestions by category
  const groupedSuggestions = React.useMemo(() => {
    if (categoryFilter) return { [categoryFilter]: availableTags };
    
    const grouped: Record<string, string[]> = {};
    availableTags.forEach(tag => {
      const metadata = getTagMetadata(tag);
      const category = metadata.category;
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(tag);
    });
    return grouped;
  }, [availableTags, categoryFilter]);

  const categoryLabels: Record<string, string> = {
    headspace: 'Headspace',
    energy: 'Energy',
    duration: 'Duration',
    domains: 'Domains',
  };

  return (
    <div className="relative w-full">
      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2 mb-2 min-h-[2.5rem]">
        {tags.map(tag => {
          const metadata = getTagMetadata(tag);
          return (
            <span
              key={tag}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${metadata.color}`}
            >
              {metadata.label}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} />
              </button>
            </span>
          );
        })}
      </div>

      {/* Input Field */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <HugeiconsIcon icon={Search01Icon} size={16} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : 'Add more tags...'}
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400"
            disabled={maxTags !== undefined && tags.length >= maxTags}
          />
          {maxTags && (
            <span className="text-xs text-gray-400">
              {tags.length}/{maxTags}
            </span>
          )}
        </div>

        {/* Dropdown Suggestions */}
        {isOpen && availableTags.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-80 overflow-y-auto"
          >
            {Object.entries(groupedSuggestions).map(([category, categoryTags]) => (
              <div key={category} className="p-2">
                {!categoryFilter && (
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {categoryLabels[category] || category}
                  </div>
                )}
                {categoryTags.map((tag, index) => {
                  const metadata = getTagMetadata(tag);
                  const globalIndex = availableTags.indexOf(tag);
                  const isHighlighted = globalIndex === highlightedIndex;
                  const isCustom = !TAG_METADATA[tag];
                  
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isHighlighted 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {isCustom ? (
                          <HugeiconsIcon icon={Add01Icon} size={16} className="text-gray-400" />
                        ) : (
                          <HugeiconsIcon icon={Tag01Icon} size={16} className="text-gray-400" />
                        )}
                        <span className={metadata.color.split(' ')[1] || ''}>
                          {metadata.label}
                        </span>
                        {isCustom && (
                          <span className="text-xs text-gray-400 ml-auto">New tag</span>
                        )}
                      </div>
                      {metadata.description && (
                        <div className="text-xs text-gray-500 mt-0.5 ml-6">
                          {metadata.description}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

