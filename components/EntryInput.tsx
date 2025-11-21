import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';

interface EntryInputProps {
  onSubmit: (content: string) => Promise<void>;
  onAutoSave?: (content: string) => Promise<void>;
  placeholder?: string;
  autoSaveDelay?: number; // milliseconds
}

export const EntryInput: React.FC<EntryInputProps> = ({
  onSubmit,
  onAutoSave,
  placeholder = "Add an entry...",
  autoSaveDelay = 2000, // 2 seconds default
}) => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save functionality
  useEffect(() => {
    if (!onAutoSave || input.trim().length === 0) {
      setAutoSaveStatus('idle');
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set auto-save status to saving
    setAutoSaveStatus('saving');

    // Set new timeout
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        await onAutoSave(input);
        setAutoSaveStatus('saved');
        // Reset to idle after showing "saved" for 2 seconds
        setTimeout(() => {
          setAutoSaveStatus('idle');
        }, 2000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('idle');
      } finally {
        setIsAutoSaving(false);
      }
    }, autoSaveDelay);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [input, onAutoSave, autoSaveDelay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to submit entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end gap-2 bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none border-none outline-none text-sm text-gray-900 placeholder:text-gray-400 bg-transparent max-h-[200px] overflow-y-auto"
          style={{ minHeight: '24px' }}
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Auto-save indicator */}
          {onAutoSave && input.trim().length > 0 && (
            <div className="text-xs text-gray-400">
              {autoSaveStatus === 'saving' && (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="text-green-500">Saved</span>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={!input.trim() || isSubmitting}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              input.trim() && !isSubmitting
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-1 px-3">
        Press Enter to submit, Shift+Enter for new line
      </div>
    </form>
  );
};


