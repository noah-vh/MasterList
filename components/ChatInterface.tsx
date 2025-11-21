import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, X } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatInterfaceProps {
  onSave: (thread: ChatMessage[]) => Promise<void>;
  onCancel: () => void;
  initialMessage?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSave,
  onCancel,
  initialMessage = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (initialMessage) {
      return [{
        role: 'user' as const,
        content: initialMessage,
        timestamp: Date.now(),
      }];
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const chatWithLLM = useAction(api.ai.chatWithLLM);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // If we have an initial message, start the conversation
    if (initialMessage && messages.length === 1) {
      handleSendMessage(initialMessage);
    }
  }, []);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isSubmitting) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSubmitting(true);

    try {
      // Get conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Add the new user message
      conversationHistory.push({
        role: 'user',
        content: textToSend,
      });

      // Call LLM
      const response = await chatWithLLM({
        messages: conversationHistory,
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSendMessage();
  };

  const handleSave = async () => {
    if (messages.length > 0) {
      await onSave(messages);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl w-full max-w-3xl shadow-2xl border border-white/50 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white/50 backdrop-blur-xl sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={messages.length === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                messages.length > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Save Thread
            </button>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg mb-2">Start a conversation</p>
              <p className="text-sm">Type a message to begin chatting with the AI</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {isSubmitting && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white/50 backdrop-blur-xl p-4">
          <form onSubmit={handleSubmit} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isSubmitting}
              className="w-full pl-4 pr-12 py-3 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 outline-none text-base text-gray-800 placeholder-gray-500 bg-white disabled:text-gray-400 transition-all"
              autoFocus
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
      </div>
    </div>
  );
};

