import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Sparkles, X, Loader2, LayoutTemplate, CheckCircle2 } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { AIResponse, ExtractedTaskData, GeneratedViewData, Area, EnergyLevel, LocationContext } from '../types';

interface SmartInputProps {
  onAddTask: (data: ExtractedTaskData) => void;
  onApplyView: (data: GeneratedViewData) => void;
}

export const SmartInput: React.FC<SmartInputProps> = ({ onAddTask, onApplyView }) => {
  const parseUserIntent = useAction(api.ai.parseUserIntent);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Local state for editable task data
  const [editableTaskData, setEditableTaskData] = useState<ExtractedTaskData | null>(null);

  useEffect(() => {
    if (aiResponse?.intent === 'CAPTURE_TASK' && aiResponse.taskData) {
      setEditableTaskData(aiResponse.taskData);
    } else {
      setEditableTaskData(null);
    }
  }, [aiResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsProcessing(true);
    try {
      const result = await parseUserIntent({ input });
      setIsProcessing(false);
      
      if (result) {
        setAiResponse(result);
      } else {
        console.error("Failed to process input");
      }
    } catch (error) {
      console.error("Error processing input:", error);
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!aiResponse) return;

    if (aiResponse.intent === 'CAPTURE_TASK' && editableTaskData) {
      onAddTask(editableTaskData);
    } else if (aiResponse.intent === 'GENERATE_VIEW' && aiResponse.viewData) {
      onApplyView(aiResponse.viewData);
    }

    setAiResponse(null);
    setEditableTaskData(null);
    setInput('');
  };

  const handleCancel = () => {
    setAiResponse(null);
    setEditableTaskData(null);
  };

  const updateTaskField = (field: keyof ExtractedTaskData, value: any) => {
    if (editableTaskData) {
      setEditableTaskData({ ...editableTaskData, [field]: value });
    }
  };

  // --- Render Logic for Different Intents ---

  const renderTaskConfirmation = () => {
    if (!editableTaskData) return null;

    return (
      <>
        <div className="flex items-start justify-between mb-4">
          <div>
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
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="bg-gray-50 p-2 rounded-lg relative group">
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-1">Area</span>
            <select
                value={editableTaskData.area || ''}
                onChange={(e) => updateTaskField('area', e.target.value as Area)}
                className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-sm appearance-none cursor-pointer"
            >
                <option value="">Select area...</option>
                {Object.values(Area).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-1">Energy</span>
            <select
                value={editableTaskData.energy || ''}
                onChange={(e) => updateTaskField('energy', e.target.value as EnergyLevel)}
                className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-sm appearance-none cursor-pointer"
            >
                <option value="">Select energy...</option>
                {Object.values(EnergyLevel).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div className="bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-1">Location</span>
            <select
                value={editableTaskData.location || ''}
                onChange={(e) => updateTaskField('location', e.target.value as LocationContext)}
                className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-sm appearance-none cursor-pointer"
            >
                <option value="">Select location...</option>
                {Object.values(LocationContext).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-1">Time Est.</span>
            <input
                type="text"
                value={editableTaskData.timeEstimate}
                onChange={(e) => updateTaskField('timeEstimate', e.target.value)}
                className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Enhanced Metadata Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-1">Occurred Date</span>
            <input
                type="date"
                value={editableTaskData.occurredDate || ''}
                onChange={(e) => updateTaskField('occurredDate', e.target.value)}
                className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-sm"
                placeholder="When this was mentioned"
            />
          </div>

          <div className="bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-1">Participants</span>
            <input
                type="text"
                value={editableTaskData.participants?.join(', ') || ''}
                onChange={(e) => updateTaskField('participants', e.target.value.split(',').map(p => p.trim()).filter(p => p))}
                className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-sm"
                placeholder="John, Sarah"
            />
          </div>
        </div>

        {/* Context Field */}
        {editableTaskData.context && (
          <div className="bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-1">Context</span>
            <textarea
                value={editableTaskData.context}
                onChange={(e) => updateTaskField('context', e.target.value)}
                className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-sm min-h-[60px] resize-none"
                placeholder="Additional context or notes..."
            />
          </div>
        )}
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
        {data.filters.area?.map(a => <span key={a} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{a}</span>)}
        {data.filters.energy?.map(e => <span key={e} className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs font-medium">{e} Energy</span>)}
        {data.filters.location?.map(l => <span key={l} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">@{l}</span>)}
        {data.filters.isUrgent && <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">Urgent Only</span>}
        {data.filters.dateScope && data.filters.dateScope !== 'All' && <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">{data.filters.dateScope}</span>}
      </div>
    </>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#F3F4F6] via-[#F3F4F6] to-transparent pb-6 pt-12 z-20">
      <div className="max-w-2xl mx-auto relative">
        
        {/* AI Confirmation Card */}
        {aiResponse && (
          <div className="absolute bottom-full left-0 right-0 mb-4 bg-white rounded-2xl shadow-xl border border-gray-200 p-5 animate-in slide-in-from-bottom-4 duration-300">
             {aiResponse.intent === 'CAPTURE_TASK' && renderTaskConfirmation()}
             {aiResponse.intent === 'GENERATE_VIEW' && aiResponse.viewData && renderViewConfirmation(aiResponse.viewData)}

             <div className="flex gap-3">
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
            placeholder="Add a task or tell me how you feel..."
            disabled={isProcessing || !!aiResponse}
            className="w-full pl-6 pr-14 py-4 rounded-full border-none focus:ring-2 focus:ring-blue-500/20 outline-none text-base text-gray-800 placeholder-gray-400 bg-white disabled:bg-gray-50 disabled:text-gray-400 transition-all"
          />
          
          <button
            type="submit"
            disabled={!input.trim() || isProcessing || !!aiResponse}
            className={`
              absolute right-2 top-2 bottom-2 aspect-square rounded-full flex items-center justify-center transition-all duration-200
              ${input.trim() && !isProcessing && !aiResponse ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
            `}
          >
            {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </form>

        {!aiResponse && !isProcessing && (
             <div className="mt-2 text-center">
                 <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Powered by OpenRouter
                 </p>
             </div>
        )}
      </div>
    </div>
  );
};