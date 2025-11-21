import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, ChevronDown } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { HugeiconsIcon } from '@hugeicons/react';
import { Message01Icon } from '@hugeicons/core-free-icons';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatInterfaceProps {
  onSave: (thread: ChatMessage[]) => Promise<void>;
  onCancel: () => void;
  onCollapse: (thread: ChatMessage[]) => Promise<void>;
  onSendMessage?: (message: string) => Promise<void>;
  initialMessage?: string;
  messages: ChatMessage[];
  isSubmitting: boolean;
  readOnly?: boolean; // When true, hide input and collapse button (for saved entries)
  showCollapseButton?: boolean; // When true, show collapse button even in read-only mode
  onCollapseClick?: () => void; // Handler for collapse button click
  chatName?: string; // Optional name/title for the chat
  hideInput?: boolean; // When true, hide the input field (for use above SmartInput)
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSave,
  onCancel,
  onCollapse,
  onSendMessage,
  initialMessage = '',
  messages,
  isSubmitting,
  readOnly = false,
  showCollapseButton = false,
  onCollapseClick,
  chatName,
  hideInput = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // If we have an initial message and no messages yet, send it (only if not read-only)
    if (!readOnly && initialMessage && messages.length === 0 && !isSubmitting && onSendMessage) {
      onSendMessage(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Focus input when not read-only
    if (!readOnly && inputRef.current) {
      inputRef.current.focus();
    }
  }, [readOnly]);

  const handleCollapse = async () => {
    if (messages.length >= 2) { // At least one user message and one assistant response
      await onCollapse(messages);
    } else {
      onCancel(); // Just close if no conversation yet
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting || !onSendMessage) return;
    
    const messageText = input.trim();
    setInput('');
    await onSendMessage(messageText);
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };


  return (
    <div className="w-full relative">
      <div className="w-full">
        {/* Chat Entry Card - matches EntryCard style */}
        <div className="w-full">
          {/* Header with chat name and collapse button - show if not read-only OR if showCollapseButton is true */}
          {(!readOnly || showCollapseButton) && (
            <div className="flex items-center justify-between pb-1.5">
              <h3 className="text-sm font-medium text-gray-900">{chatName || 'Chat'}</h3>
              <button
                onClick={showCollapseButton && onCollapseClick ? onCollapseClick : (messages.length >= 2 ? handleCollapse : onCancel)}
                className="p-1.5 -mt-1 -mr-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Chat Messages - minimalistic style matching EntryCard */}
          <div className={`${readOnly ? 'px-0' : 'px-4'} ${readOnly ? 'pb-1' : 'pb-4'} space-y-3 ${readOnly ? 'max-h-[60vh]' : 'max-h-[50vh]'} overflow-y-auto`}>
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">
                Start a conversation
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] ${
                        message.role === 'user'
                          ? 'bg-blue-500/10 text-blue-700 border border-blue-500/20 rounded-2xl px-4 py-2.5'
                          : 'bg-gray-50 text-gray-900 border border-gray-200 rounded-2xl px-4 py-2.5'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <p className="text-sm font-medium whitespace-pre-wrap break-words">{message.content}</p>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isSubmitting && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl px-4 py-2.5 border border-gray-200">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input - only show if not read-only and not hidden */}
          {!readOnly && !hideInput && onSendMessage && (
            <div className="px-4 pb-4">
              <form onSubmit={handleSubmit} className="relative shadow-lg rounded-full group bg-white/70 backdrop-blur-md border border-white/50 hover:bg-white/80 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  disabled={isSubmitting}
                  className="w-full pl-4 pr-14 py-3 rounded-full border-none focus:ring-2 focus:ring-blue-500/20 outline-none text-base text-gray-800 placeholder-gray-500 bg-transparent disabled:text-gray-400 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isSubmitting}
                  className={`
                    absolute right-2 top-2 bottom-2 aspect-square rounded-full flex items-center justify-center transition-all duration-200
                    ${input.trim() && !isSubmitting ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                  `}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowUp className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

