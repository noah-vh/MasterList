import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Sparkles, X, Loader2, LayoutTemplate, CheckCircle2, MessageSquare, Plus } from 'lucide-react';
import { parseUserIntent } from '../services/geminiService';
import { AIResponse, ExtractedTaskData, GeneratedViewData, ConversationMessage, ProjectBreakdown, TaskStatus } from '../types';
import { TagInput } from './TagInput';

interface SmartInputProps {
  onAddTask: (data: ExtractedTaskData) => void;
  onApplyView: (data: GeneratedViewData) => void;
  onAddProjectWithSubtasks: (parent: ExtractedTaskData, children: ExtractedTaskData[]) => void;
}

export const SmartInput: React.FC<SmartInputProps> = ({ onAddTask, onApplyView, onAddProjectWithSubtasks }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Conversation state for planning mode
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isPlanningMode, setIsPlanningMode] = useState(false);

  // Local state for editable task data
  const [editableTaskData, setEditableTaskData] = useState<ExtractedTaskData | null>(null);
  
  // State for project breakdown editing
  const [editableBreakdown, setEditableBreakdown] = useState<ProjectBreakdown | null>(null);

  useEffect(() => {
    if (aiResponse?.intent === 'CAPTURE_TASK' && aiResponse.taskData) {
      setEditableTaskData(aiResponse.taskData);
    } else {
      setEditableTaskData(null);
    }

    if (aiResponse?.intent === 'PLAN_PROJECT') {
      setIsPlanningMode(true);

      // Add AI response to conversation (user message is added in handleSubmit)
      if (aiResponse.conversationMessage) {
        setConversation(prev => {
          // Avoid duplicates
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant' && lastMessage.content === aiResponse.conversationMessage) {
            return prev;
          }
          return [...prev, {
            role: 'assistant',
            content: aiResponse.conversationMessage!,
            timestamp: Date.now()
          }];
        });
      }

      // If breakdown is proposed, set editable breakdown
      if (aiResponse.projectBreakdown) {
        setEditableBreakdown(aiResponse.projectBreakdown);
      }
    } else {
      // Exit planning mode if intent changes
      if (isPlanningMode && aiResponse?.intent !== 'PLAN_PROJECT') {
        setIsPlanningMode(false);
        setConversation([]);
        setEditableBreakdown(null);
      }
    }
  }, [aiResponse, isPlanningMode]);

  // Scroll to bottom of conversation
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userInput = input.trim();
    
    // Add user message to conversation if in planning mode
    if (isPlanningMode) {
      setConversation(prev => [...prev, {
        role: 'user',
        content: userInput,
        timestamp: Date.now()
      }]);
    }
    
    setInput('');

    setIsProcessing(true);
    const result = await parseUserIntent(
      userInput,
      isPlanningMode ? conversation : undefined
    );
    setIsProcessing(false);
    
    if (result) {
      setAiResponse(result);
    } else {
      console.error("Failed to process input");
    }
  };

  const handleConfirm = () => {
    if (!aiResponse) return;

    if (aiResponse.intent === 'CAPTURE_TASK' && editableTaskData) {
      onAddTask(editableTaskData);
      resetState();
    } else if (aiResponse.intent === 'GENERATE_VIEW' && aiResponse.viewData) {
      onApplyView(aiResponse.viewData);
      resetState();
    } else if (aiResponse.intent === 'PLAN_PROJECT' && editableBreakdown) {
      onAddProjectWithSubtasks(editableBreakdown.parentTask, editableBreakdown.childTasks);
      resetState();
    }
  };

  const handleCancel = () => {
    resetState();
  };

  const resetState = () => {
    setAiResponse(null);
    setEditableTaskData(null);
    setEditableBreakdown(null);
    setInput('');
    setIsPlanningMode(false);
    setConversation([]);
  };

  const updateTaskField = (field: keyof ExtractedTaskData, value: any) => {
    if (editableTaskData) {
      setEditableTaskData({ ...editableTaskData, [field]: value });
    }
  };

  const updateBreakdownParent = (field: keyof ExtractedTaskData, value: any) => {
    if (editableBreakdown) {
      setEditableBreakdown({
        ...editableBreakdown,
        parentTask: { ...editableBreakdown.parentTask, [field]: value }
      });
    }
  };

  const updateBreakdownChild = (index: number, field: keyof ExtractedTaskData, value: any) => {
    if (editableBreakdown) {
      const updatedChildren = [...editableBreakdown.childTasks];
      updatedChildren[index] = { ...updatedChildren[index], [field]: value };
      setEditableBreakdown({
        ...editableBreakdown,
        childTasks: updatedChildren
      });
    }
  };

  const removeChildTask = (index: number) => {
    if (editableBreakdown) {
      setEditableBreakdown({
        ...editableBreakdown,
        childTasks: editableBreakdown.childTasks.filter((_, i) => i !== index)
      });
    }
  };

  // --- Render Logic for Different Intents ---

  const renderTaskConfirmation = () => {
    if (!editableTaskData) return null;

    return (
      <>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Capture Task
            </h4>
            <input 
              type="text" 
              value={editableTaskData.title}
              onChange={(e) => updateTaskField('title', e.target.value)}
              className="text-lg font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full"
            />
          </div>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3 mb-4">
          <div>
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-2">Tags</span>
            <TagInput
              tags={editableTaskData.tags || []}
              onChange={(tags) => updateTaskField('tags', tags)}
              placeholder="Add tags..."
              allowCustom={true}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-2 rounded-lg">
              <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-1">Status</span>
              <select
                value={editableTaskData.status || TaskStatus.Active}
                onChange={(e) => updateTaskField('status', e.target.value as TaskStatus)}
                className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-sm appearance-none cursor-pointer"
              >
                {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="bg-gray-50 p-2 rounded-lg">
              <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-1">Action Date</span>
              <input
                type="date"
                value={editableTaskData.actionDate || ''}
                onChange={(e) => updateTaskField('actionDate', e.target.value || undefined)}
                className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-sm"
              />
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderViewConfirmation = (data: GeneratedViewData) => (
    <>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1 flex items-center gap-1">
            <LayoutTemplate className="w-3 h-3" /> Generate View
          </h4>
          <p className="text-lg font-bold text-gray-900">{data.viewName}</p>
          <p className="text-sm text-gray-600 mt-1">{data.description}</p>
        </div>
        <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {data.filters.tags?.map(t => <span key={t} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{t}</span>)}
        {data.filters.status?.map(s => <span key={s} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">{s}</span>)}
        {data.filters.dateScope && data.filters.dateScope !== 'All' && <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">{data.filters.dateScope}</span>}
      </div>
    </>
  );

  const renderPlanningConversation = () => {
    if (!isPlanningMode) return null;

    return (
      <div className="absolute bottom-full left-0 right-0 mb-4 bg-white rounded-2xl shadow-xl border border-gray-200 p-5 max-h-[60vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wide flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Planning Mode
          </h4>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[200px] max-h-[300px]">
          {conversation.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-50 text-blue-900'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            </div>
          )}
          <div ref={conversationEndRef} />
        </div>

        {/* Proposed Breakdown */}
        {editableBreakdown && !aiResponse?.needsClarification && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h5 className="text-sm font-semibold text-gray-900 mb-3">Proposed Breakdown</h5>
            
            {editableBreakdown.summary && (
              <p className="text-xs text-gray-600 mb-3 italic">{editableBreakdown.summary}</p>
            )}

            {/* Parent Task */}
            <div className="bg-blue-50 p-3 rounded-lg mb-3">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-semibold text-blue-700 uppercase">Parent Project</span>
              </div>
              <input
                type="text"
                value={editableBreakdown.parentTask.title}
                onChange={(e) => updateBreakdownParent('title', e.target.value)}
                className="w-full bg-transparent font-medium text-gray-900 focus:outline-none border-b border-transparent focus:border-blue-500 mb-2"
              />
              <TagInput
                tags={editableBreakdown.parentTask.tags || []}
                onChange={(tags) => updateBreakdownParent('tags', tags)}
                placeholder="Add tags..."
                allowCustom={true}
              />
            </div>

            {/* Child Tasks */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {editableBreakdown.childTasks.map((child, idx) => (
                <div key={idx} className="bg-gray-50 p-2 rounded-lg flex items-start gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={child.title}
                      onChange={(e) => updateBreakdownChild(idx, 'title', e.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-gray-900 focus:outline-none border-b border-transparent focus:border-gray-400 mb-1"
                    />
                    <TagInput
                      tags={child.tags || []}
                      onChange={(tags) => updateBreakdownChild(idx, 'tags', tags)}
                      placeholder="Add tags..."
                      allowCustom={true}
                    />
                  </div>
                  <button
                    onClick={() => removeChildTask(idx)}
                    className="text-gray-400 hover:text-red-500 mt-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleConfirm}
                className="flex-1 bg-green-50 text-green-700 py-2.5 rounded-xl font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-2 border border-green-200"
              >
                Create Project
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#F3F4F6] via-[#F3F4F6] to-transparent pb-6 pt-12 z-20">
      <div className="max-w-2xl mx-auto relative">
        
        {/* Planning Conversation */}
        {isPlanningMode && renderPlanningConversation()}

        {/* AI Confirmation Card (for non-planning intents) */}
        {aiResponse && !isPlanningMode && (
          <div className="absolute bottom-full left-0 right-0 mb-4 bg-white rounded-2xl shadow-xl border border-gray-200 p-5 animate-in slide-in-from-bottom-4 duration-300">
            {aiResponse.intent === 'CAPTURE_TASK' && renderTaskConfirmation()}
            {aiResponse.intent === 'GENERATE_VIEW' && aiResponse.viewData && renderViewConfirmation(aiResponse.viewData)}

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleConfirm}
                className="flex-1 bg-blue-50 text-blue-700 py-2.5 rounded-xl font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 border border-blue-200"
              >
                {aiResponse.intent === 'CAPTURE_TASK' ? 'Add to List' : 'Enter Mode'}
              </button>
            </div>
          </div>
        )}

        {/* Main Input Bar */}
        <form onSubmit={handleSubmit} className="relative shadow-lg rounded-full group bg-white">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isPlanningMode ? "Continue the conversation..." : "Add a task or tell me how you feel..."}
            disabled={isProcessing}
            className="w-full pl-6 pr-14 py-4 rounded-full border-none focus:ring-2 focus:ring-blue-500/20 outline-none text-base text-gray-800 placeholder-gray-400 bg-white disabled:bg-gray-50 disabled:text-gray-400 transition-all"
          />
          
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className={`
              absolute right-2 top-2 bottom-2 aspect-square rounded-full flex items-center justify-center transition-all duration-200
              ${input.trim() && !isProcessing ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
            `}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </form>

        {!aiResponse && !isProcessing && !isPlanningMode && (
          <div className="mt-2 text-center">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              Powered by Gemini 2.5
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
