import React, { useState, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp01Icon, Loading01Icon, Image01Icon, Message01Icon, Pen01Icon } from '@hugeicons/core-free-icons';
import { useAction, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { ChatInterface } from './ChatInterface';

interface EntrySmartInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
}

export const EntrySmartInput: React.FC<EntrySmartInputProps> = ({
  onSubmit,
  placeholder = "Add an entry, paste a link, or upload an image...",
}) => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChatMode, setIsChatMode] = useState(false);
  const [showChatInterface, setShowChatInterface] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const analyzeContent = useAction(api.ai.analyzeContent);
  const createContentEntry = useMutation(api.entries.createContentEntry);
  const createChatEntry = useMutation(api.entries.createChatEntry);
  const generateImageUploadUrl = useMutation(api.entries.generateImageUploadUrl);
  const saveImageContent = useAction(api.entries.saveImageContent);

  // Detect if input is a URL (with or without protocol)
  const isUrl = (text: string): boolean => {
    const trimmed = text.trim();
    
    // Check if it already has a protocol
    try {
      const url = new URL(trimmed);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      // If URL constructor fails, check if it looks like a URL
      // Patterns: domain.tld, www.domain.tld, domain.tld/path
      const urlPattern = /^(www\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(\.(com|org|net|edu|gov|io|co|ai|dev|app|xyz|id|me|tv|us|uk|ca|au|de|fr|jp|cn|in|br|ru|es|it|nl|se|no|dk|fi|pl|cz|ie|at|ch|be|pt|gr|tr|kr|tw|hk|sg|my|th|ph|vn|id|nz|za|mx|ar|cl|co|pe|ec|uy|py|bo|ve|cr|pa|do|gt|hn|ni|sv|bz|jm|tt|bb|gd|lc|vc|ag|dm|kn|ms|tc|vg|ai|aw|bm|bs|ky|fk|gi|gl|gp|gu|mp|mq|pr|re|sh|sj|pm|tf|um|vi|wf|yt|ax|ad|al|am|ao|aq|as|at|az|ba|bb|bd|bf|bg|bh|bi|bj|bl|bm|bn|bo|bq|br|bs|bt|bv|bw|by|bz|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cu|cv|cw|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mf|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|ss|st|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tr|tt|tv|tw|tz|ua|ug|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw))(\/.*)?$/i;
      return urlPattern.test(trimmed) && !trimmed.includes(' ');
    }
  };
  
  // Normalize URL (add https:// if missing)
  const normalizeUrl = (text: string): string => {
    const trimmed = text.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const handleChatSave = async (thread: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>) => {
    try {
      // Create summary from first user message
      const firstUserMessage = thread.find(m => m.role === 'user')?.content || 'Chat conversation';
      const summary = thread.length > 0 
        ? `${thread.length} message${thread.length > 1 ? 's' : ''} conversation`
        : 'Chat conversation';

      await createChatEntry({
        chatThread: thread,
        content: summary,
      });

      setShowChatInterface(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting || isAnalyzing) return;

    const trimmedInput = input.trim();
    
    // If in chat mode, open chat interface
    if (isChatMode) {
      setShowChatInterface(true);
      return;
    }

    setIsSubmitting(true);
    setIsAnalyzing(true);

    try {
      setError(null);
      // Check if input is a URL
      if (isUrl(trimmedInput)) {
        const normalizedUrl = normalizeUrl(trimmedInput);
        console.log('Detected URL, analyzing...', normalizedUrl);
        // Analyze link
        const analysis = await analyzeContent({
          contentType: "link",
          content: normalizedUrl,
          originalInput: trimmedInput,
        });

        console.log('Analysis complete:', analysis);

        // Validate analysis response
        if (!analysis || !analysis.classification) {
          throw new Error('Invalid analysis response from AI');
        }

        // Create content entry
        const entryId = await createContentEntry({
          contentType: "link",
          sourceUrl: normalizedUrl,
          content: trimmedInput, // Keep original input as content
          analyzedContent: analysis.summary || '',
          classification: analysis.classification,
          tags: analysis.tags || [],
          title: analysis.title || trimmedInput,
          ogMetadata: analysis.ogMetadata,
        });

        console.log('Content entry created:', entryId);
      } else {
        // Regular text entry
        await onSubmit(trimmedInput);
      }
      
      setInput('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error('Failed to process entry:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error details:', errorMessage);
      setError(errorMessage);
      // Don't fallback - show error to user
      setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
    } finally {
      setIsSubmitting(false);
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (file.type.startsWith('image/')) {
      setIsAnalyzing(true);
      try {
        // Generate upload URL
        const uploadUrl = await generateImageUploadUrl();
        
        // Upload image to Convex storage
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        
        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        }
        
        // Convex storage returns the storageId as text
        const storageId = await uploadResponse.text();
        
        // Save and analyze image content
        await saveImageContent({
          storageId,
          originalInput: file.name,
        });
      } catch (error) {
        console.error('Failed to analyze image:', error);
      } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <>
      {showChatInterface && (
        <ChatInterface
          onSave={handleChatSave}
          onCancel={() => setShowChatInterface(false)}
          initialMessage={input.trim() || undefined}
        />
      )}
      
      <div className="fixed bottom-0 left-0 right-0 bg-[#F3F4F6]/60 backdrop-blur-xl border-t border-white/20 z-10">
        <div className="max-w-2xl mx-auto p-4">
          <form onSubmit={handleSubmit} className="relative shadow-lg rounded-full group bg-white/70 backdrop-blur-md border border-white/50 hover:bg-white/80 transition-all">
            {/* Manual/Chat Toggle */}
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
              {isChatMode ? (
                <HugeiconsIcon icon={Message01Icon} size={20} />
              ) : (
                <HugeiconsIcon icon={Pen01Icon} size={20} />
              )}
            </button>
            
            {/* Image upload button - only show in manual mode */}
            {!isChatMode && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || isAnalyzing}
                className="absolute left-14 top-2 bottom-2 aspect-square rounded-full flex items-center justify-center transition-all duration-200 bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Upload image"
              >
                <HugeiconsIcon icon={Image01Icon} size={20} />
              </button>
            )}
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isChatMode ? "Start a conversation..." : placeholder}
            disabled={isSubmitting || isAnalyzing || showChatInterface}
            className={`w-full ${isChatMode ? 'pl-14' : 'pl-14'} pr-14 py-4 rounded-full border-none focus:ring-2 focus:ring-blue-500/20 outline-none text-base text-gray-800 placeholder-gray-500 bg-transparent disabled:text-gray-400 transition-all`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            inputMode="text"
          />
          
          <button
            type="submit"
            disabled={!input.trim() || isSubmitting || isAnalyzing}
            className={`
              absolute right-2 top-2 bottom-2 aspect-square rounded-full flex items-center justify-center transition-all duration-200
              ${input.trim() && !isSubmitting && !isAnalyzing ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
            `}
          >
            {isSubmitting || isAnalyzing ? (
              <HugeiconsIcon icon={Loading01Icon} size={20} className="animate-spin" />
            ) : (
              <HugeiconsIcon icon={ArrowUp01Icon} size={20} />
            )}
          </button>
        </form>
        
        <div className="text-xs mt-1 px-4">
          {error ? (
            <span className="text-red-500">Error: {error}</span>
          ) : isAnalyzing ? (
            <span className="text-blue-500">Analyzing content...</span>
          ) : isChatMode ? (
            <span className="text-gray-400">Press Enter to start a conversation</span>
          ) : (
            <span className="text-gray-400">Press Enter to save, paste a link or upload an image to analyze</span>
          )}
        </div>
      </div>
    </div>
    </>
  );
};


