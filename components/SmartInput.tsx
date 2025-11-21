import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, X, Loader2, LayoutTemplate, CheckCircle2, ChevronRight, Plus, Calendar, Clock, Sparkles, PenTool } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Message01Icon, Pen01Icon } from '@hugeicons/core-free-icons';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { AIResponse, ExtractedTaskData, GeneratedViewData } from '../types';
import { TagInput } from './TagInput';
import { getTagMetadata } from '../constants';
import { TaskCreateModal } from './TaskCreateModal';
import { ChatInterface } from './ChatInterface';

interface SmartInputProps {
  onAddTask: (data: ExtractedTaskData) => void;
  onApplyView: (data: GeneratedViewData) => void;
  onAddEntry?: (content: string) => Promise<void>; // For entries view
  defaultToRoutine?: boolean; // When true, default new tasks to be routines
  currentView?: 'entries' | 'today' | 'master' | 'routines' | 'timeline' | 'library'; // Current page context
  activeChatEntryId?: string | null; // ID of the active chat entry to route messages to
}

const TIME_ESTIMATE_OPTIONS = [
  '5 minutes',
  '10 minutes',
  '15 minutes',
  '30 minutes',
  '45 minutes',
  '1 hour',
  '2 hours',
  '3 hours',
  'Half day',
  'Full day',
  'Multi-day',
];

// Get contextual placeholder text based on current view
const getPlaceholderText = (view: 'entries' | 'today' | 'master' | 'routines' | 'timeline' | 'library'): string => {
  switch (view) {
    case 'entries':
      return "Add an entry, paste a link, or upload an image...";
    case 'today':
      return "What needs to get done today?";
    case 'routines':
      return "Add a new routine or habit...";
    case 'timeline':
      return "Add a task or schedule time...";
    case 'library':
      return "Search by tags, categories, or describe what you're looking for...";
    case 'master':
    default:
      return "Add a task or tell me how you feel...";
  }
};

export const SmartInput: React.FC<SmartInputProps> = ({ onAddTask, onApplyView, onAddEntry, defaultToRoutine = false, currentView = 'master', activeChatEntryId }) => {
  const parseUserIntent = useAction(api.ai.parseUserIntent);
  const analyzeContent = useAction(api.ai.analyzeContent);
  const createContentEntry = useMutation(api.entries.createContentEntry);
  const createChatEntry = useMutation(api.entries.createChatEntry);
  const updateChatEntry = useMutation(api.entries.updateChatEntry);
  const chatWithLLMForEntry = useAction(api.ai.chatWithLLM);
  const entries = useQuery(api.entries.list);
  
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isInstantMode, setIsInstantMode] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false); // For entries view
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>>([]);
  const [isChatSubmitting, setIsChatSubmitting] = useState(false);
  const chatWithLLM = useAction(api.ai.chatWithLLM);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalInitialTitle, setModalInitialTitle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state for editable task data
  const [editableTaskData, setEditableTaskData] = useState<ExtractedTaskData | null>(null);
  // State for multiple tasks
  const [multipleTasks, setMultipleTasks] = useState<ExtractedTaskData[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  // State for showing optional fields
  const [showActionDate, setShowActionDate] = useState(false);
  const [showTimeEstimate, setShowTimeEstimate] = useState(false);
  const [showOccurredDate, setShowOccurredDate] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showContext, setShowContext] = useState(false);

  useEffect(() => {
    if (aiResponse?.intent === 'CAPTURE_TASK') {
      // Reset field visibility when new task data arrives
      if (aiResponse.taskData || (aiResponse.tasks && aiResponse.tasks.length > 0)) {
        const firstTask = aiResponse.taskData || (aiResponse.tasks && aiResponse.tasks[0]);
        setShowActionDate(!!firstTask?.actionDate);
        setShowTimeEstimate(!!firstTask?.timeEstimate);
        setShowOccurredDate(!!firstTask?.occurredDate);
        setShowParticipants(!!(firstTask?.participants && firstTask.participants.length > 0));
        setShowContext(!!firstTask?.context);
      } else {
        // Reset all field visibility if no task data
        setShowActionDate(false);
        setShowTimeEstimate(false);
        setShowOccurredDate(false);
        setShowParticipants(false);
        setShowContext(false);
      }
      
      // Check if we have multiple tasks (must be > 1 to show as multiple)
      if (aiResponse.tasks && Array.isArray(aiResponse.tasks) && aiResponse.tasks.length > 1) {
        // Deduplicate by title (case-insensitive)
        const seenTitles = new Set<string>();
        const normalizedTasks = aiResponse.tasks
          .map((task, index) => ({
            title: task.title || `Task ${index + 1}`,
            tags: Array.isArray(task.tags) ? task.tags : [],
            actionDate: task.actionDate,
            timeEstimate: task.timeEstimate,
            occurredDate: task.occurredDate,
            participants: Array.isArray(task.participants) ? task.participants : [],
            context: task.context,
            source: task.source || { type: 'manual' },
            status: task.status || 'Active',
            type: task.type,
            isRoutine: task.isRoutine !== undefined ? task.isRoutine : (defaultToRoutine ? true : undefined),
          }))
          .filter(task => {
            if (!task.title || task.title.trim() === '') return false;
            const titleKey = task.title.trim().toLowerCase();
            if (seenTitles.has(titleKey)) {
              console.warn("Duplicate task filtered out:", task.title);
              return false;
            }
            seenTitles.add(titleKey);
            return true;
          });
        
        if (normalizedTasks.length > 1) {
          setMultipleTasks(normalizedTasks);
          setEditableTaskData(normalizedTasks[0]);
          setCurrentTaskIndex(0);
        } else if (normalizedTasks.length === 1) {
          // Only one task after deduplication - treat as single task
          setEditableTaskData(normalizedTasks[0]);
          setMultipleTasks([]);
          // Update field visibility for single task
          setShowActionDate(!!normalizedTasks[0].actionDate);
          setShowTimeEstimate(!!normalizedTasks[0].timeEstimate);
          setShowOccurredDate(!!normalizedTasks[0].occurredDate);
          setShowParticipants(!!(normalizedTasks[0].participants && normalizedTasks[0].participants.length > 0));
          setShowContext(!!normalizedTasks[0].context);
        } else {
          console.error("No valid tasks found in response");
        }
      } else if (aiResponse.taskData) {
        // Single task
        const taskData: ExtractedTaskData = {
          title: aiResponse.taskData.title || '',
          tags: Array.isArray(aiResponse.taskData.tags) ? aiResponse.taskData.tags : [],
          actionDate: aiResponse.taskData.actionDate,
          timeEstimate: aiResponse.taskData.timeEstimate,
          occurredDate: aiResponse.taskData.occurredDate,
          participants: Array.isArray(aiResponse.taskData.participants) ? aiResponse.taskData.participants : [],
          context: aiResponse.taskData.context,
          source: aiResponse.taskData.source || { type: 'manual' },
          status: aiResponse.taskData.status || 'Active',
          type: aiResponse.taskData.type,
          isRoutine: aiResponse.taskData.isRoutine !== undefined ? aiResponse.taskData.isRoutine : (defaultToRoutine ? true : undefined),
        };
        setEditableTaskData(taskData);
        setMultipleTasks([]);
        // Update field visibility for single task
        setShowActionDate(!!taskData.actionDate);
        setShowTimeEstimate(!!taskData.timeEstimate);
        setShowOccurredDate(!!taskData.occurredDate);
        setShowParticipants(!!(taskData.participants && taskData.participants.length > 0));
        setShowContext(!!taskData.context);
      }
    } else {
      setEditableTaskData(null);
      setMultipleTasks([]);
      setCurrentTaskIndex(0);
      // Reset field visibility
      setShowActionDate(false);
      setShowTimeEstimate(false);
      setShowOccurredDate(false);
      setShowParticipants(false);
      setShowContext(false);
    }
  }, [aiResponse]);

  // Entry-specific helpers (for entries view)
  const isUrl = (text: string): boolean => {
    const trimmed = text.trim();
    try {
      const url = new URL(trimmed);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      const urlPattern = /^(www\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(\.(com|org|net|edu|gov|io|co|ai|dev|app|xyz|id|me|tv|us|uk|ca|au|de|fr|jp|cn|in|br|ru|es|it|nl|se|no|dk|fi|pl|cz|ie|at|ch|be|pt|gr|tr|kr|tw|hk|sg|my|th|ph|vn|id|nz|za|mx|ar|cl|co|pe|ec|uy|py|bo|ve|cr|pa|do|gt|hn|ni|sv|bz|jm|tt|bb|gd|lc|vc|ag|dm|kn|ms|tc|vg|ai|aw|bm|bs|ky|fk|gi|gl|gp|gu|mp|mq|pr|re|sh|sj|pm|tf|um|vi|wf|yt|ax|ad|al|am|ao|aq|as|at|az|ba|bb|bd|bf|bg|bh|bi|bj|bl|bm|bn|bo|bq|br|bs|bt|bv|bw|by|bz|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cu|cv|cw|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mf|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|ss|st|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tr|tt|tv|tw|tz|ua|ug|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw))(\/.*)?$/i;
      return urlPattern.test(trimmed) && !trimmed.includes(' ');
    }
  };

  const normalizeUrl = (text: string): string => {
    const trimmed = text.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const handleChatSave = async (thread: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>) => {
    try {
      const firstUserMessage = thread.find(m => m.role === 'user')?.content || 'Chat conversation';
      const summary = thread.length > 0 
        ? `${thread.length} message${thread.length > 1 ? 's' : ''} conversation`
        : 'Chat conversation';

      await createChatEntry({
        chatThread: thread,
        content: summary,
      });

      setShowChatInterface(false);
      setChatMessages([]);
      setInput('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error('Failed to save chat:', error);
      setError('Failed to save chat thread');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSendChatMessage = async (messageText: string) => {
    if (!messageText.trim() || isChatSubmitting) return;

    const userMessage = {
      role: 'user' as const,
      content: messageText.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setInput('');
    setIsChatSubmitting(true);

    try {
      const conversationHistory = updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await chatWithLLM({
        messages: conversationHistory,
      });

      const assistantMessage = {
        role: 'assistant' as const,
        content: response.content,
        timestamp: Date.now(),
      };

      setChatMessages([...updatedMessages, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setChatMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsChatSubmitting(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Handle entries view differently
    if (currentView === 'entries' && onAddEntry) {
      const trimmedInput = input.trim();
      
      // If there's an active chat entry, route message to it
      if (activeChatEntryId && entries) {
        // Get current entry to update
        const activeEntry = entries.find((e: any) => e._id === activeChatEntryId);
        if (activeEntry && activeEntry.chatThread) {
          const userMessage = {
            role: 'user' as const,
            content: trimmedInput,
            timestamp: Date.now(),
          };
          
          const updatedMessages = [...activeEntry.chatThread, userMessage];
          
          // Update entry immediately with user message
          await updateChatEntry({
            id: activeChatEntryId as any,
            chatThread: updatedMessages,
          });
          
          try {
            // Get assistant response
            const conversationHistory = updatedMessages.map(m => ({
              role: m.role,
              content: m.content,
            }));
            
            const response = await chatWithLLMForEntry({
              messages: conversationHistory,
            });
            
            const assistantMessage = {
              role: 'assistant' as const,
              content: response.content,
              timestamp: Date.now(),
            };
            
            const finalMessages = [...updatedMessages, assistantMessage];
            
            // Update entry with assistant response
            await updateChatEntry({
              id: activeChatEntryId as any,
              chatThread: finalMessages,
            });
          } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = {
              role: 'assistant' as const,
              content: 'Sorry, I encountered an error. Please try again.',
              timestamp: Date.now(),
            };
            await updateChatEntry({
              id: activeChatEntryId as any,
              chatThread: [...updatedMessages, errorMessage],
            });
          }
          
          setInput('');
          return;
        }
      }
      
      // If in chat mode, send message to chat
      if (isChatMode) {
        if (!showChatInterface) {
          // First message - initialize chat and send
          setShowChatInterface(true);
        }
        await handleSendChatMessage(trimmedInput);
        return;
      }

      setIsProcessing(true);
      setIsAnalyzing(true);

      try {
        setError(null);
        // Check if input is a URL
        if (isUrl(trimmedInput)) {
          const normalizedUrl = normalizeUrl(trimmedInput);
          const analysis = await analyzeContent({
            contentType: "link",
            content: normalizedUrl,
            originalInput: trimmedInput,
          });

          if (!analysis || !analysis.classification) {
            throw new Error('Invalid analysis response from AI');
          }

          await createContentEntry({
            contentType: "link",
            sourceUrl: normalizedUrl,
            content: trimmedInput,
            analyzedContent: analysis.summary || '',
            classification: analysis.classification,
            tags: analysis.tags || [],
            title: analysis.title || trimmedInput,
            ogMetadata: analysis.ogMetadata,
          });
        } else {
          // Regular text entry
          await onAddEntry(trimmedInput);
        }
        
        setInput('');
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } catch (error) {
        console.error('Failed to process entry:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError(errorMessage);
        setTimeout(() => setError(null), 5000);
      } finally {
        setIsProcessing(false);
        setIsAnalyzing(false);
      }
      return;
    }

    // Handle task views (existing logic)
    // If instant mode is enabled, open the create modal directly
    if (isInstantMode) {
      const inputText = input.trim();
      setModalInitialTitle(inputText);
      setInput('');
      setShowCreateModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      const result = await parseUserIntent({ input, currentView: currentView === 'entries' ? 'master' : (currentView as 'today' | 'master' | 'routines' | 'timeline' | 'library') });
      setIsProcessing(false);
      
      if (result) {
        // Debug logging
        console.log("AI Response:", result);
        console.log("Intent:", result.intent);
        console.log("Task Data:", result.taskData);
        console.log("Tasks:", result.tasks);
        console.log("View Data:", result.viewData);
        
        setAiResponse(result);
        // If there's an error, it will be displayed in the UI
        if (result.error) {
          console.error("AI processing error:", result.error);
        }
      } else {
        console.error("Failed to process input - no result returned");
        setAiResponse({
          error: "Failed to process your input. Please try again.",
          intent: null,
          taskData: null,
          viewData: null,
        });
      }
    } catch (error) {
      console.error("Error processing input:", error);
      setIsProcessing(false);
      setAiResponse({
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        intent: null,
        taskData: null,
        viewData: null,
      });
    }
  };

  const handleModalSave = async (data: ExtractedTaskData) => {
    try {
      await onAddTask(data);
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating task:", error);
      alert(`Error creating task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleConfirm = async () => {
    if (!aiResponse) return;

    if (aiResponse.intent === 'CAPTURE_TASK') {
      // Handle multiple tasks
      if (multipleTasks.length > 0 && editableTaskData) {
        // Validate task before adding
        if (!editableTaskData.title || editableTaskData.title.trim() === '') {
          console.error("Cannot add task - missing title");
          alert("Please add a title to the task");
          return;
        }
        
        try {
          console.log("Adding task:", editableTaskData);
          await onAddTask(editableTaskData);
          console.log("Task added successfully");
          
          // Move to next task or finish
          if (currentTaskIndex < multipleTasks.length - 1) {
            const nextIndex = currentTaskIndex + 1;
            setCurrentTaskIndex(nextIndex);
            setEditableTaskData(multipleTasks[nextIndex]);
          } else {
            // All tasks added, reset
            setAiResponse(null);
            setEditableTaskData(null);
            setMultipleTasks([]);
            setCurrentTaskIndex(0);
            setInput('');
          }
        } catch (error) {
          console.error("Error adding task:", error);
          alert(`Error adding task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        // Single task
        const taskDataToAdd = editableTaskData || aiResponse.taskData;
        if (!taskDataToAdd) {
          console.error("No task data to add");
          alert("No task data available. Please try again.");
          return;
        }
        
        if (!taskDataToAdd.title || taskDataToAdd.title.trim() === '') {
          console.error("Cannot add task - missing title:", taskDataToAdd);
          alert("Please add a title to the task");
          return;
        }
        
        try {
          console.log("Adding single task:", taskDataToAdd);
          console.log("Task data structure:", {
            title: taskDataToAdd.title,
            tags: taskDataToAdd.tags,
            status: taskDataToAdd.status,
            source: taskDataToAdd.source,
          });
          
          await onAddTask(taskDataToAdd);
          console.log("Task added successfully");
          
          setAiResponse(null);
          setEditableTaskData(null);
          setMultipleTasks([]);
          setCurrentTaskIndex(0);
          setInput('');
        } catch (error) {
          console.error("Error adding task:", error);
          console.error("Error details:", error);
          alert(`Error adding task: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
          return;
        }
      }
    } else if (aiResponse.intent === 'GENERATE_VIEW' && aiResponse.viewData) {
      onApplyView(aiResponse.viewData);
    setAiResponse(null);
    setEditableTaskData(null);
    setInput('');
    }
  };

  const handleCancel = () => {
    setAiResponse(null);
    setEditableTaskData(null);
    setMultipleTasks([]);
    setCurrentTaskIndex(0);
  };

  const updateTaskField = (field: keyof ExtractedTaskData, value: any) => {
    if (editableTaskData) {
      setEditableTaskData({ ...editableTaskData, [field]: value });
    }
  };

  // --- Render Logic for Different Intents ---

  const renderTaskConfirmation = () => {
    if (!editableTaskData) return null;

    const getTodayDate = () => {
      const today = new Date();
      return today.toISOString().split('T')[0];
    };

    const getTomorrowDate = () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    };

    const handleAddField = (field: string) => {
      switch (field) {
        case 'actionDate':
          setShowActionDate(true);
          if (!editableTaskData.actionDate) {
            updateTaskField('actionDate', getTodayDate());
          }
          break;
        case 'timeEstimate':
          setShowTimeEstimate(true);
          break;
        case 'occurredDate':
          setShowOccurredDate(true);
          if (!editableTaskData.occurredDate) {
            updateTaskField('occurredDate', getTodayDate());
          }
          break;
        case 'participants':
          setShowParticipants(true);
          if (!editableTaskData.participants || editableTaskData.participants.length === 0) {
            updateTaskField('participants', []);
          }
          break;
        case 'context':
          setShowContext(true);
          if (!editableTaskData.context) {
            updateTaskField('context', '');
          }
          break;
      }
    };

    return (
      <>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Capture Task
            </h4>
            <input 
                type="text" 
                value={editableTaskData.title || ''}
                onChange={(e) => updateTaskField('title', e.target.value)}
                className="text-base font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full min-h-[32px]"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
            />
          </div>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Compact Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div className="bg-gray-50 p-1.5 rounded-lg">
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-0.5">Tags</span>
            <TagInput
              tags={editableTaskData.tags || []}
              onChange={(tags) => updateTaskField('tags', tags)}
              placeholder="Add tags..."
              allowCustom={true}
            />
          </div>

          {showTimeEstimate ? (
            <div className="bg-gray-50 p-1.5 rounded-lg relative">
              <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-0.5">Time Est.</span>
            <select
                value={editableTaskData.timeEstimate || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'custom') {
                    updateTaskField('timeEstimate', '');
                  } else if (value) {
                    updateTaskField('timeEstimate', value);
                  }
                }}
                className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-xs appearance-none cursor-pointer"
              >
                <option value="">Select time...</option>
                {TIME_ESTIMATE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value="custom">Custom...</option>
            </select>
              {(editableTaskData.timeEstimate === 'custom' || (editableTaskData.timeEstimate && !TIME_ESTIMATE_OPTIONS.includes(editableTaskData.timeEstimate))) && (
                <input
                  type="text"
                  placeholder="Enter custom time"
                  value={editableTaskData.timeEstimate === 'custom' ? '' : (editableTaskData.timeEstimate || '')}
                  onChange={(e) => updateTaskField('timeEstimate', e.target.value)}
                  className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-xs mt-1 border-t border-gray-200 pt-1"
                  onFocus={(e) => {
                    if (editableTaskData.timeEstimate === 'custom') {
                      e.target.value = '';
                    } else {
                      e.target.select();
                    }
                  }}
                />
              )}
            </div>
          ) : (
            <div className="bg-gray-50 p-1.5 rounded-lg flex items-center justify-between">
              <span className="text-gray-500 block text-[10px] uppercase tracking-wider">Time Est.</span>
              <button
                onClick={() => handleAddField('timeEstimate')}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Add time estimate"
                type="button"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {showActionDate ? (
            <div className="bg-gray-50 p-1.5 rounded-lg relative">
              <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-0.5">Action Date</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <input
                  type="date"
                  value={editableTaskData.actionDate || ''}
                  onChange={(e) => updateTaskField('actionDate', e.target.value)}
                  className="flex-1 bg-transparent font-medium text-gray-800 focus:outline-none text-xs min-h-[24px]"
                  style={{ WebkitAppearance: 'none' }}
                />
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => updateTaskField('actionDate', getTodayDate())}
                    className="text-xs text-gray-500 hover:text-gray-700 px-1"
                    title="Today"
                    type="button"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => updateTaskField('actionDate', getTomorrowDate())}
                    className="text-xs text-gray-500 hover:text-gray-700 px-1"
                    title="Tomorrow"
                    type="button"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-1.5 rounded-lg flex items-center justify-between">
              <span className="text-gray-500 block text-[10px] uppercase tracking-wider">Action Date</span>
              <button
                onClick={() => handleAddField('actionDate')}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Add action date"
                type="button"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
          </div>
          )}

          <div className="bg-gray-50 p-1.5 rounded-lg">
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-0.5">Status</span>
            <select
              value={editableTaskData.status || 'Active'}
              onChange={(e) => updateTaskField('status', e.target.value)}
              className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-xs appearance-none cursor-pointer"
            >
              <option value="Active">Active</option>
              <option value="WaitingOn">WaitingOn</option>
              <option value="SomedayMaybe">SomedayMaybe</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Additional fields - show if added or have values */}
        {(showOccurredDate || showParticipants || showContext) && (
          <div className="space-y-2 mb-2 text-sm">
            {showOccurredDate && (
              <div className="bg-gray-50 p-1.5 rounded-lg relative">
                <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-0.5">Occurred Date</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <input
                    type="date"
                    value={editableTaskData.occurredDate || ''}
                    onChange={(e) => updateTaskField('occurredDate', e.target.value)}
                    className="flex-1 bg-transparent font-medium text-gray-800 focus:outline-none text-xs min-h-[24px]"
                    style={{ WebkitAppearance: 'none' }}
                  />
                  <button
                    onClick={() => {
                      setShowOccurredDate(false);
                      updateTaskField('occurredDate', undefined);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
          </div>
            )}

            {showParticipants && (
              <div className="bg-gray-50 p-1.5 rounded-lg relative">
                <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-0.5">Participants</span>
                <div className="flex items-center gap-1">
            <input
                type="text"
                value={editableTaskData.participants?.join(', ') || ''}
                onChange={(e) => updateTaskField('participants', e.target.value.split(',').map(p => p.trim()).filter(p => p))}
                placeholder="John, Sarah"
                    className="flex-1 bg-transparent font-medium text-gray-800 focus:outline-none text-xs"
                  />
                  <button
                    onClick={() => {
                      setShowParticipants(false);
                      updateTaskField('participants', []);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
          </div>
        </div>
            )}

            {showContext && (
              <div className="bg-gray-50 p-1.5 rounded-lg relative">
                <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-0.5">Context</span>
                <div className="flex items-start gap-1">
            <textarea
                    value={editableTaskData.context || ''}
                onChange={(e) => updateTaskField('context', e.target.value)}
                    className="flex-1 bg-transparent font-medium text-gray-800 focus:outline-none text-xs min-h-[40px] resize-none"
                placeholder="Additional context or notes..."
            />
                  <button
                    onClick={() => {
                      setShowContext(false);
                      updateTaskField('context', undefined);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 mt-0.5 flex-shrink-0"
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add more fields button */}
        <div className="flex flex-wrap gap-1 mb-2">
          {!showActionDate && (
            <button
              onClick={() => handleAddField('actionDate')}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 bg-gray-50 rounded-lg flex items-center gap-1 hover:bg-gray-100 transition-colors"
              type="button"
            >
              <Plus className="w-3 h-3" />
              <Calendar className="w-3 h-3" />
              Action Date
            </button>
          )}
          {!showTimeEstimate && (
            <button
              onClick={() => handleAddField('timeEstimate')}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 bg-gray-50 rounded-lg flex items-center gap-1 hover:bg-gray-100 transition-colors"
              type="button"
            >
              <Plus className="w-3 h-3" />
              <Clock className="w-3 h-3" />
              Time
            </button>
          )}
          {!showOccurredDate && (
            <button
              onClick={() => handleAddField('occurredDate')}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 bg-gray-50 rounded-lg flex items-center gap-1 hover:bg-gray-100 transition-colors"
              type="button"
            >
              <Plus className="w-3 h-3" />
              Occurred
            </button>
          )}
          {!showParticipants && (
            <button
              onClick={() => handleAddField('participants')}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 bg-gray-50 rounded-lg flex items-center gap-1 hover:bg-gray-100 transition-colors"
              type="button"
            >
              <Plus className="w-3 h-3" />
              People
            </button>
          )}
          {!showContext && (
            <button
              onClick={() => handleAddField('context')}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 bg-gray-50 rounded-lg flex items-center gap-1 hover:bg-gray-100 transition-colors"
              type="button"
            >
              <Plus className="w-3 h-3" />
              Context
            </button>
          )}
        </div>

        {/* Helper text */}
        <p className="text-xs text-gray-400 mt-2 mb-1">
          💡 Type again to add more details or change anything
        </p>
      </>
    );
  };

  const renderViewConfirmation = (data: GeneratedViewData) => (
    <>
       <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1 flex items-center gap-1">
            <LayoutTemplate className="w-3 h-3" /> Generate View
          </h4>
          <p className="text-lg font-bold text-gray-900">{data.viewName}</p>
          <p className="text-sm text-gray-600 mt-1">{data.description}</p>
        </div>
        <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 ml-2">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 mb-4">
        {/* Tags */}
        {data.filters.tags && data.filters.tags.length > 0 && (
          <div>
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-2">Filtering by Tags</span>
            <div className="flex flex-wrap gap-2">
              {data.filters.tags.map(tag => {
                const metadata = getTagMetadata(tag);
                return (
                  <span key={tag} className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${metadata.color}`}>
                    {metadata.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Status */}
        {data.filters.status && data.filters.status.length > 0 && (
          <div>
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-2">Status</span>
            <div className="flex flex-wrap gap-2">
              {data.filters.status.map(status => (
                <span key={status} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  {status}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Date Scope */}
        {data.filters.dateScope && data.filters.dateScope !== 'All' && (
          <div>
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-2">Time Range</span>
            <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
              {data.filters.dateScope}
            </span>
          </div>
        )}

        {/* Date Range */}
        {data.filters.actionDateRange && (
          <div>
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-2">Date Range</span>
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              {data.filters.actionDateRange.start} to {data.filters.actionDateRange.end}
            </span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {showChatInterface && currentView === 'entries' && (
        <ChatInterface
          onSave={handleChatSave}
          onCancel={() => {
            setShowChatInterface(false);
            setChatMessages([]);
            setInput('');
          }}
          onCollapse={async (thread) => {
            await handleChatSave(thread);
          }}
          onSendMessage={handleSendChatMessage}
          initialMessage={input.trim() || undefined}
          messages={chatMessages}
          isSubmitting={isChatSubmitting}
        />
      )}
      
      <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none" data-allow-nav-swipe="true">
      {/* Gradient Fade Background */}
      <div 
        className="absolute inset-0 bg-[#F3F4F6]/60 backdrop-blur-xl border-t border-white/20"
        style={{
          maskImage: 'linear-gradient(to top, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 60%, transparent 100%)'
        }}
      />
      
      <div className="relative pb-6 pt-12 pointer-events-auto" data-allow-nav-swipe="true">
        <div className="max-w-2xl mx-auto relative px-3">
        
        {/* AI Confirmation Card */}
        {aiResponse && (
          <div className="absolute bottom-full left-0 right-0 mb-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-5 animate-in slide-in-from-bottom-4 duration-300 max-h-[80vh] overflow-y-auto touch-pan-y">
             {aiResponse.error ? (
               <div className="mb-4">
                 <div className="flex items-start justify-between mb-2">
                   <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
                     Error
                   </h4>
                   <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                     <X className="w-5 h-5" />
                   </button>
                 </div>
                 <p className="text-sm text-gray-700 mb-4">{aiResponse.error}</p>
                 <button
                   onClick={handleCancel}
                   className="w-full bg-red-50 text-red-700 py-2.5 rounded-xl font-medium hover:bg-red-100 transition-colors border border-red-200"
                 >
                   Close
                 </button>
               </div>
             ) : (
               <>
                 {aiResponse.intent === 'CAPTURE_TASK' && multipleTasks.length > 1 && (
                   <>
                     {/* Multiple tasks - show compact header with task navigation */}
                     <div className="mb-3">
                       <div className="flex items-center justify-between mb-2">
                         <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide flex items-center gap-1">
                           <CheckCircle2 className="w-3 h-3" /> Task {currentTaskIndex + 1} of {multipleTasks.length}
                         </h4>
                         <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                           <X className="w-4 h-4" />
                         </button>
                       </div>
                       {/* Compact preview of other tasks */}
                       <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                         {multipleTasks.map((task, idx) => (
                           <div
                             key={idx}
                             className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs border transition-all cursor-pointer ${
                               idx === currentTaskIndex
                                 ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                                 : 'bg-gray-50 border-gray-200 text-gray-600'
                             }`}
                             onClick={() => {
                               setCurrentTaskIndex(idx);
                               setEditableTaskData(multipleTasks[idx]);
                             }}
                           >
                             {idx + 1}. {task.title.substring(0, 20)}{task.title.length > 20 ? '...' : ''}
                           </div>
                         ))}
                       </div>
                     </div>
                   </>
                 )}
                 {aiResponse.intent === 'CAPTURE_TASK' && editableTaskData && renderTaskConfirmation()}
                 {aiResponse.intent === 'GENERATE_VIEW' && aiResponse.viewData && renderViewConfirmation(aiResponse.viewData)}

                 {(!aiResponse.intent || (aiResponse.intent === 'CAPTURE_TASK' && !editableTaskData && multipleTasks.length === 0 && !aiResponse.taskData)) && (
                   <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                     <p className="text-sm text-yellow-800">
                       Unexpected response format. Intent: {aiResponse.intent || 'null'}
                     </p>
                     <pre className="text-xs text-yellow-600 mt-2 overflow-auto max-h-40">
                       {JSON.stringify(aiResponse, null, 2)}
                     </pre>
                   </div>
                 )}

                 {(aiResponse.intent === 'CAPTURE_TASK' && editableTaskData) || (aiResponse.intent === 'GENERATE_VIEW' && aiResponse.viewData) ? (
                 <div className="flex gap-3">
                    <button
                        onClick={handleConfirm}
                        className="flex-1 bg-blue-50 text-blue-700 py-2.5 rounded-xl font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 border border-blue-200"
                    >
                         {multipleTasks.length > 1 
                           ? (currentTaskIndex < multipleTasks.length - 1 ? `Add & Next (${currentTaskIndex + 1}/${multipleTasks.length})` : `Add Final Task (${multipleTasks.length}/${multipleTasks.length})`)
                           : (aiResponse.intent === 'CAPTURE_TASK' ? 'Add to List' : 'Enter Mode')}
                         {multipleTasks.length > 1 && currentTaskIndex < multipleTasks.length - 1 && (
                           <ChevronRight className="w-4 h-4" />
                         )}
                    </button>
                 </div>
                 ) : null}
               </>
             )}
          </div>
        )}

        {/* Main Input Bar */}
        <form onSubmit={handleSubmit} className="relative shadow-lg rounded-full group bg-white/70 backdrop-blur-md border border-white/50 hover:bg-white/80 transition-all">
          {/* Toggle Button - Chat mode for entries, Instant mode for tasks */}
          {currentView === 'entries' ? (
            <>
              {/* Chat/Manual Toggle for entries */}
              <button
                type="button"
                onClick={() => setIsChatMode(!isChatMode)}
                className={`
                  absolute left-2 top-2 bottom-2 aspect-square rounded-full flex items-center justify-center transition-all duration-300
                  ${isChatMode 
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' 
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200 hover:text-gray-700'
                  }
                `}
                title={isChatMode ? "Chat mode: Start a conversation" : "Manual mode: Quick entry"}
              >
                <HugeiconsIcon icon={isChatMode ? Message01Icon : Pen01Icon} size={20} />
              </button>
              
            </>
          ) : (
            /* Instant Entry Toggle for task views */
            <button
              type="button"
              onClick={() => setIsInstantMode(!isInstantMode)}
              className={`
                absolute left-2 top-2 bottom-2 aspect-square rounded-full flex items-center justify-center transition-all duration-300
                ${isInstantMode 
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200 hover:text-gray-700'
                }
              `}
              title={isInstantMode ? "Instant entry mode: Skip AI classification" : "Auto mode: AI classifies your input"}
            >
              <div className="relative w-5 h-5 flex items-center justify-center">
                <PenTool 
                  className={`w-5 h-5 absolute transition-all duration-300 ${
                    isInstantMode 
                      ? 'opacity-100 scale-100 rotate-0' 
                      : 'opacity-0 scale-75 rotate-90'
                  }`}
                />
                <Sparkles 
                  className={`w-5 h-5 absolute transition-all duration-300 ${
                    !isInstantMode 
                      ? 'opacity-100 scale-100 rotate-0' 
                      : 'opacity-0 scale-75 -rotate-90'
                  }`}
                />
              </div>
            </button>
          )}
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              currentView === 'entries' && activeChatEntryId 
                ? "Type your message to continue the conversation..." 
                : currentView === 'entries' && (isChatMode || showChatInterface) 
                  ? "Type your message..." 
                  : getPlaceholderText(currentView === 'entries' ? 'master' : (currentView as 'today' | 'master' | 'routines' | 'timeline' | 'library'))
            }
            disabled={(isProcessing || isAnalyzing || !!aiResponse) || (currentView === 'entries' && showChatInterface && isChatSubmitting)}
            className={`w-full ${currentView === 'entries' && !isChatMode ? 'pl-14' : 'pl-14'} pr-14 py-4 rounded-full border-none focus:ring-2 focus:ring-blue-500/20 outline-none text-base text-gray-800 placeholder-gray-500 bg-transparent disabled:text-gray-400 transition-all`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            inputMode="text"
          />
          
          <button
            type="submit"
            disabled={!input.trim() || isProcessing || isAnalyzing || !!aiResponse || (currentView === 'entries' && showChatInterface && isChatSubmitting)}
            className={`
              absolute right-2 top-2 bottom-2 aspect-square rounded-full flex items-center justify-center transition-all duration-200
              ${input.trim() && !isProcessing && !isAnalyzing && !aiResponse && !(currentView === 'entries' && showChatInterface && isChatSubmitting) ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
            `}
          >
            {(isProcessing || isAnalyzing) ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </form>
        
        {/* Status messages */}
        <div className="text-xs mt-1 px-4">
          {error ? (
            <span className="text-red-500">Error: {error}</span>
          ) : isAnalyzing ? (
            <span className="text-blue-500">Analyzing content...</span>
          ) : currentView === 'entries' && isChatMode ? (
            <span className="text-gray-400">Press Enter to start a conversation</span>
          ) : null}
        </div>
        
        {/* Task Create Modal */}
        {showCreateModal && (
          <TaskCreateModal
            initialTitle={modalInitialTitle}
            onSave={handleModalSave}
            onClose={() => setShowCreateModal(false)}
            defaultToRoutine={defaultToRoutine}
          />
        )}
      </div>
      </div>
    </div>
    </>
  );
};
