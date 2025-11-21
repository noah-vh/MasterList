import React, { useState, useRef, useEffect } from 'react';
import { Entry } from '../types';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, Cancel01Icon, Add01Icon, Edit01Icon, Delete01Icon, Attachment01Icon, Link01Icon, Message01Icon } from '@hugeicons/core-free-icons';
import { useQuery, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { ContentEntryModal } from './ContentEntryModal';
import { ChatInterface } from './ChatInterface';

interface EntryCardProps {
  entry: Entry;
  taskTitle?: string; // For activity logs, the linked task title
  onTaskClick?: (taskId: string) => void;
  onEdit?: (entry: Entry) => void;
  onDelete?: (entryId: string) => void;
  onContentUpdate?: (entry: Entry) => void;
  showTimestamp?: boolean; // Whether to show timestamp (iMessage-style)
  isFirstInGroup?: boolean; // First entry in a time group
  isChatActive?: boolean; // Whether this chat is the active one
  onChatActiveChange?: (isActive: boolean) => void; // Callback when chat active state changes
}

export const EntryCard: React.FC<EntryCardProps> = ({ 
  entry, 
  taskTitle, 
  onTaskClick, 
  onEdit, 
  onDelete,
  onContentUpdate,
  showTimestamp = false,
  isFirstInGroup = false,
  isChatActive = false,
  onChatActiveChange,
}) => {
  const [showPortalCard, setShowPortalCard] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [showChatPortalCard, setShowChatPortalCard] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const chatCardRef = useRef<HTMLDivElement>(null);
  const [chatName, setChatName] = useState<string>('Chat conversation');
  const generateChatTitle = useAction(api.ai.generateChatTitle);
  
  // Swipe-to-delete state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const SWIPE_THRESHOLD = 100; // Minimum distance to trigger delete
  const DELETE_THRESHOLD = 0.4; // 40% of card width to auto-delete
  
  // Sync expanded state with active state
  useEffect(() => {
    if (isChatActive && !isChatExpanded) {
      setIsChatExpanded(true);
    } else if (!isChatActive && isChatExpanded) {
      setIsChatExpanded(false);
    }
  }, [isChatActive]);
  
  
  const isActivity = entry.entryType === 'activity';
  const isManual = entry.entryType === 'manual';
  const isContent = entry.entryType === 'content';
  const isChat = entry.contentType === 'chat' && entry.chatThread;
  
  // Generate chat name from conversation using AI
  useEffect(() => {
    const generateName = async () => {
      if (!entry.chatThread || entry.chatThread.length === 0) {
        setChatName(entry.content || 'Chat conversation');
        return;
      }
      
      // Only generate if we have at least 2 messages (user + assistant)
      if (entry.chatThread.length >= 2) {
        try {
          const title = await generateChatTitle({
            messages: entry.chatThread.map(m => ({
              role: m.role,
              content: m.content,
            })),
          });
          setChatName(title);
        } catch (error) {
          console.error('Error generating chat title:', error);
          // Fallback to first user message
          const firstUserMessage = entry.chatThread.find(m => m.role === 'user');
          if (firstUserMessage) {
            const content = firstUserMessage.content.trim();
            setChatName(content.length > 50 ? content.substring(0, 47) + '...' : content);
          } else {
            setChatName(entry.content || 'Chat conversation');
          }
        }
      } else {
        // If only one message, use it as the name
        const firstUserMessage = entry.chatThread.find(m => m.role === 'user');
        if (firstUserMessage) {
          const content = firstUserMessage.content.trim();
          setChatName(content.length > 50 ? content.substring(0, 47) + '...' : content);
        } else {
          setChatName(entry.content || 'Chat conversation');
        }
      }
    };
    
    generateName();
  }, [entry.chatThread, entry.content, generateChatTitle]);

  // Scroll to card and expand when clicked
  useEffect(() => {
    if (isExpanded && cardRef.current) {
      // Scroll the card into view with smooth behavior
      cardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [isExpanded]);

  // Scroll to chat card when expanded - position above SmartInput
  useEffect(() => {
    if (isChatExpanded && chatCardRef.current) {
      // Simple scroll to show the chat, let natural spacing handle the rest
      setTimeout(() => {
        chatCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 100);
    }
  }, [isChatExpanded]);
  
  // Track if we just swiped to prevent click events
  const justSwipedRef = useRef(false);
  
  // Swipe gesture handlers
  const handleSwipeStart = (clientX: number, clientY: number) => {
    if (!onDelete) return; // Only allow swipe if delete is available
    swipeStartX.current = clientX;
    swipeStartY.current = clientY;
    setIsSwiping(true);
    justSwipedRef.current = false;
  };

  const handleSwipeMove = (clientX: number, clientY: number) => {
    if (swipeStartX.current === null || swipeStartY.current === null || !onDelete) return;
    
    const deltaX = clientX - swipeStartX.current;
    const deltaY = Math.abs(clientY - swipeStartY.current);
    
    // Only allow left swipe (negative deltaX) and ensure it's more horizontal than vertical
    if (deltaX < 0 && Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
      if (!isSwiping) {
        setIsSwiping(true);
      }
      setSwipeOffset(Math.max(deltaX, -200)); // Cap at -200px
    }
  };

  const handleSwipeEnd = () => {
    if (!isSwiping || !swipeContainerRef.current || !onDelete) {
      setIsSwiping(false);
      swipeStartX.current = null;
      swipeStartY.current = null;
      return;
    }

    const containerWidth = swipeContainerRef.current.offsetWidth;
    const shouldDelete = Math.abs(swipeOffset) >= containerWidth * DELETE_THRESHOLD || Math.abs(swipeOffset) >= SWIPE_THRESHOLD;

    if (shouldDelete && onDelete) {
      // Mark that we swiped to prevent click
      justSwipedRef.current = true;
      
      // Trigger delete
      if (window.confirm('Delete this entry?')) {
        onDelete(entry.id);
      }
      
      // Reset immediately
      setSwipeOffset(0);
      setIsSwiping(false);
      swipeStartX.current = null;
      swipeStartY.current = null;
      
      // Reset justSwiped after a delay
      setTimeout(() => {
        justSwipedRef.current = false;
      }, 300);
    } else {
      // Snap back
      setSwipeOffset(0);
      setIsSwiping(false);
      swipeStartX.current = null;
      swipeStartY.current = null;
    }
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onDelete) return;
    const touch = e.touches[0];
    handleSwipeStart(touch.clientX, touch.clientY);
    e.stopPropagation(); // Prevent navigation swipe from starting
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null || !onDelete) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartX.current;
    const deltaY = Math.abs(touch.clientY - swipeStartY.current);
    
    // If we're swiping horizontally, prevent default to allow swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault(); // Prevent scrolling while swiping
      e.stopPropagation(); // Prevent navigation swipe
      if (!isSwiping) {
        setIsSwiping(true);
      }
      handleSwipeMove(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation(); // Prevent navigation swipe
    handleSwipeEnd();
  };

  // Mouse event handlers (for desktop drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start swipe on left mouse button
    if (e.button === 0 && onDelete) {
      handleSwipeStart(e.clientX, e.clientY);
      e.preventDefault();
      e.stopPropagation(); // Prevent navigation swipe from starting
    }
  };
  
  // Prevent clicks when swiping
  const handleClick = (e: React.MouseEvent) => {
    if (justSwipedRef.current || isSwiping || Math.abs(swipeOffset) > 5) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  // Global mouse move/up handlers for drag
  useEffect(() => {
    if (swipeStartX.current !== null && onDelete) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (swipeStartX.current !== null && swipeStartY.current !== null) {
          const deltaX = e.clientX - swipeStartX.current;
          const deltaY = Math.abs(e.clientY - swipeStartY.current);
          
          // If we're swiping horizontally, handle it
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            if (!isSwiping) {
              setIsSwiping(true);
            }
            handleSwipeMove(e.clientX, e.clientY);
          }
        }
      };
      const handleGlobalMouseUp = () => {
        handleSwipeEnd();
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [swipeStartX.current, isSwiping, swipeOffset, onDelete]);

  
  // Get image URL if this is a content entry with an image
  const imageUrl = useQuery(
    api.entries.getImageUrl,
    isContent && entry.sourceImageId 
      ? { storageId: entry.sourceImageId as any }
      : "skip"
  );


  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const getActivityBadge = () => {
    if (entry.activityType === 'task_created') {
      return {
        prefix: 'Task created',
        icon: <HugeiconsIcon icon={Add01Icon} size={10} />,
        bgColor: 'bg-blue-500/8',
        textColor: 'text-blue-600/85',
        borderColor: 'border-blue-500/20'
      };
    } else if (entry.activityType === 'task_completed') {
      return {
        prefix: 'Task completed',
        icon: <HugeiconsIcon icon={CheckmarkCircle01Icon} size={10} />,
        bgColor: 'bg-green-500/8',
        textColor: 'text-green-600/85',
        borderColor: 'border-green-500/20'
      };
    } else if (entry.activityType === 'task_uncompleted') {
      return {
        prefix: 'Task uncompleted',
        icon: <HugeiconsIcon icon={Cancel01Icon} size={10} />,
        bgColor: 'bg-red-500/8',
        textColor: 'text-red-600/85',
        borderColor: 'border-red-500/20'
      };
    } else if (entry.activityType === 'attachment_added') {
      return {
        prefix: 'Attachment added',
        icon: <HugeiconsIcon icon={Attachment01Icon} size={10} />,
        bgColor: 'bg-gray-500/8',
        textColor: 'text-gray-600/85',
        borderColor: 'border-gray-500/20'
      };
    }
    return null;
  };

  const getAttachmentBadge = () => {
    if (entry.hasAttachment) {
      return {
        prefix: 'Attachment added',
        icon: <HugeiconsIcon icon={Attachment01Icon} size={14} />,
        bgColor: 'bg-gray-500/10',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-500/20'
      };
    }
    return null;
  };


  const activityBadge = getActivityBadge();
  
  // Extract task name from content (format: "Task created: Task Name" or "Task completed: Task Name")
  const getTaskNameFromContent = (content: string, prefix: string): string => {
    if (content.startsWith(prefix + ': ')) {
      return content.substring(prefix.length + 2);
    }
    return content;
  };

  return (
    <div className="py-2 group relative overflow-hidden">
      {/* Delete action indicator - fixed on the right, outside swipeable container */}
      {onDelete && (
        <div 
          className={`
            absolute right-0 top-0 bottom-0 flex items-center justify-end pointer-events-none z-0
            transition-opacity duration-200 ease-out
            ${Math.abs(swipeOffset) > 15 ? 'opacity-100' : 'opacity-0'}
            ${isActivity ? 'pr-2' : 'pr-4'}
          `}
        >
          <HugeiconsIcon 
            icon={Delete01Icon} 
            size={isActivity ? 16 : isContent || isChat ? 28 : 20} 
            className="text-red-600/85 transition-all duration-200 ease-out"
            style={{
              transform: `scale(${Math.min(1, 0.85 + (Math.abs(swipeOffset) / 400))})`,
            }}
          />
        </div>
      )}

      {/* Timestamp - Outside swipeable container, stays visible during swipe */}
      {showTimestamp && (
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="flex-1 h-px bg-gray-300 opacity-60 max-w-[80px]" />
          <span className="text-xs font-normal text-gray-400 flex-shrink-0">
            {formatTimestamp(entry.createdAt)}
          </span>
          <div className="flex-1 h-px bg-gray-300 opacity-60 max-w-[80px]" />
        </div>
      )}

      {/* Swipeable container */}
      <div
        ref={swipeContainerRef}
        data-swipeable="true"
        className="relative transition-transform duration-200 ease-out z-10"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          touchAction: 'pan-x pan-y', // Allow both directions, we'll detect which one
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Content wrapper */}
        <div className="relative bg-transparent">
          {/* Edit/Delete Actions - Subtle icons in top-right corner */}
          {isManual && (onEdit || onDelete) && (
            <div className="absolute top-2 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(entry);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100/60 rounded-md transition-all backdrop-blur-sm"
                  title="Edit entry"
                >
                  <HugeiconsIcon icon={Edit01Icon} size={14} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(entry.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50/60 rounded-md transition-all backdrop-blur-sm"
                  title="Delete entry"
                >
                  <HugeiconsIcon icon={Delete01Icon} size={14} />
                </button>
              )}
            </div>
          )}
      
      {/* Activity Badge - Long pill with full content, glassy glow style */}
      {isActivity && activityBadge && (
        <div className="flex justify-center mb-0.5">
          <div 
            className={`flex items-center gap-1 px-2.5 py-0.5 ${activityBadge.textColor} ${activityBadge.bgColor} ${activityBadge.borderColor} border rounded-full text-xs font-normal backdrop-blur-sm max-w-[85%] min-w-[120px]`}
          >
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {activityBadge.icon}
              <span className="text-[9px] font-normal normal-case tracking-normal opacity-80 whitespace-nowrap">
                {activityBadge.prefix}
              </span>
            </div>
            <div className="h-2.5 w-px bg-current opacity-20 flex-shrink-0" />
            <span className="flex-1 truncate font-normal text-[10px] text-center min-w-0">
              {getTaskNameFromContent(entry.content, activityBadge.prefix)}
            </span>
          </div>
        </div>
      )}

      {/* Attachment Badge for manual entries with attachments */}
      {isManual && (() => {
        const attachmentBadge = getAttachmentBadge();
        return attachmentBadge ? (
          <div className="flex justify-center mb-2">
            <div 
              className={`inline-flex items-center gap-3 px-6 py-2.5 ${attachmentBadge.textColor} ${attachmentBadge.bgColor} ${attachmentBadge.borderColor} border rounded-full text-sm font-medium backdrop-blur-sm max-w-[85%] min-w-[240px]`}
            >
              <div className="flex items-center gap-2 flex-shrink-0">
                {attachmentBadge.icon}
                <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  {attachmentBadge.prefix}
                </span>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Chat Entry Card - Collapsible like content entries */}
      {isChat && entry.chatThread && (
        <div 
          ref={chatCardRef}
          className="w-full mb-3"
          onMouseEnter={() => setShowChatPortalCard(true)}
          onMouseLeave={() => {
            if (!isChatExpanded) {
              setShowChatPortalCard(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer transition-shadow duration-300"
            style={{
              boxShadow: showChatPortalCard || isChatExpanded 
                ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' 
                : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => {
              handleClick(e);
              if (justSwipedRef.current || isSwiping || Math.abs(swipeOffset) > 5) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              const newExpanded = !isChatExpanded;
              setIsChatExpanded(newExpanded);
              if (onChatActiveChange) {
                onChatActiveChange(newExpanded);
              }
            }}
          >
            {/* Content */}
            <div className={`${isChatExpanded ? 'px-4 pb-4' : 'p-4'}`}>
              {/* Preview - Show first 2 messages when collapsed */}
              {!isChatExpanded && (
                <div>
                  {/* Chat name in collapsed state */}
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    {chatName}
                  </h3>
                  <div className="space-y-2">
                    {entry.chatThread.slice(0, 2).map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] ${
                            message.role === 'user'
                              ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20'
                              : 'bg-gray-50 text-gray-900 border border-gray-200 rounded-2xl px-4 py-2.5'
                          }`}
                        >
                          {message.role === 'user' ? (
                            <p className="text-xs font-medium text-blue-700 whitespace-pre-wrap break-words line-clamp-2">
                              {message.content}
                            </p>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words line-clamp-2 leading-relaxed">
                              {message.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {entry.chatThread.length > 2 && (
                      <p className="text-xs text-gray-400 text-center mt-2">
                        +{entry.chatThread.length - 2} more message{entry.chatThread.length - 2 !== 1 ? 's' : ''}...
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Expanded Chat Interface - Interactive when expanded, stays in place */}
              {isChatExpanded && (
                <div className="mt-4">
                  <ChatInterface
                    onSave={async () => {}}
                    onCancel={() => {
                      setIsChatExpanded(false);
                      if (onChatActiveChange) {
                        onChatActiveChange(false);
                      }
                    }}
                    onCollapse={async () => {
                      setIsChatExpanded(false);
                      if (onChatActiveChange) {
                        onChatActiveChange(false);
                      }
                    }}
                    messages={entry.chatThread.map(m => ({
                      role: m.role,
                      content: m.content,
                      timestamp: m.timestamp || Date.now(),
                    }))}
                    isSubmitting={false}
                    readOnly={true}
                    showCollapseButton={true}
                    onCollapseClick={() => {
                      setIsChatExpanded(false);
                      if (onChatActiveChange) {
                        onChatActiveChange(false);
                      }
                    }}
                    chatName={chatName}
                  />
                  {/* Subtle notice that user is engaged in this conversation */}
                  <p className="text-xs text-gray-400 text-center italic pt-1">
                    Active conversation
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Entry Content - Only show for manual entries (not chat) */}
      {isManual && !isChat && (
        <div className="text-base text-gray-900 whitespace-pre-wrap break-words leading-relaxed pr-12">
          {entry.content}
        </div>
      )}

      {/* Content Entry Card - Inline expansion */}
      {isContent && entry.classification && (
        <div 
          ref={cardRef}
          className="w-full mb-3"
          onMouseEnter={() => setShowPortalCard(true)}
          onMouseLeave={() => {
            if (!isExpanded) {
              setShowPortalCard(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer transition-all duration-500 ease-in-out"
            style={{
              boxShadow: showPortalCard || isExpanded 
                ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' 
                : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              minHeight: isExpanded ? 'calc(100vh - 20rem)' : 'auto',
              maxHeight: isExpanded ? 'calc(100vh - 20rem)' : 'none',
            }}
            onClick={(e) => {
              handleClick(e);
              if (justSwipedRef.current || isSwiping || Math.abs(swipeOffset) > 5) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded(prev => !prev);
            }}
          >
              {/* Link Preview Image or Uploaded Image */}
              {(entry.ogMetadata?.image || imageUrl) && (
                <div 
                  className="w-full bg-gray-100 overflow-hidden transition-all duration-500 ease-in-out"
                  style={{
                    height: isExpanded ? '16rem' : showPortalCard ? '10rem' : '8rem',
                  }}
                >
                  <img
                    src={entry.ogMetadata?.image || imageUrl}
                    alt={entry.ogMetadata?.title || entry.classification.category || "Content preview"}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            
            {/* Content */}
            <div className="p-4 transition-all duration-500 ease-in-out">
              {/* Header with close button when expanded */}
              <div 
                className="flex items-center justify-end mb-2 transition-all duration-300 ease-in-out overflow-hidden"
                style={{
                  maxHeight: isExpanded ? '3rem' : '0',
                  opacity: isExpanded ? 1 : 0,
                  marginBottom: isExpanded ? '0.5rem' : '0',
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors -mt-1 -mr-1"
                  title="Collapse"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              
              {/* Category badge */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                  {entry.classification.category}
                </span>
              </div>
              
              {/* Title - Use OG title if available, otherwise classification or content */}
              <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
                {entry.ogMetadata?.title || entry.classification.category || entry.content}
              </h3>
              
              {/* Source URL with site name */}
              {entry.sourceUrl && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <HugeiconsIcon icon={Link01Icon} size={12} />
                  <a 
                    href={entry.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {entry.ogMetadata?.siteName || new URL(entry.sourceUrl).hostname}
                  </a>
                </div>
              )}
              
              {/* OG Description - Show as preview if available */}
              {entry.ogMetadata?.description && !showPortalCard && !isExpanded && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                  {entry.ogMetadata.description}
                </p>
              )}
              
              {/* Summary/Description - Only show on hover/expand */}
              {entry.analyzedContent && (showPortalCard || isExpanded) && (
                <div 
                  className="overflow-hidden transition-all duration-500 ease-in-out"
                  style={{
                    maxHeight: isExpanded 
                      ? '1000px' 
                      : showPortalCard 
                        ? '6rem' 
                        : '0',
                    opacity: showPortalCard || isExpanded ? 1 : 0,
                    marginBottom: showPortalCard || isExpanded ? '0.75rem' : '0',
                  }}
                >
                  <p className={`text-sm text-gray-600 ${isExpanded ? '' : 'line-clamp-4'}`}>
                    {entry.analyzedContent}
                  </p>
                </div>
              )}
              
              {/* Topics/Tags preview - shown on hover or when expanded */}
              <div 
                className="overflow-hidden transition-all duration-500 ease-in-out"
                style={{
                  maxHeight: (showPortalCard || isExpanded) && ((entry.classification.topics && entry.classification.topics.length > 0) || (entry.tags && entry.tags.length > 0))
                    ? isExpanded ? 'none' : '2.5rem'
                    : '0',
                  opacity: (showPortalCard || isExpanded) && ((entry.classification.topics && entry.classification.topics.length > 0) || (entry.tags && entry.tags.length > 0)) ? 1 : 0,
                  marginTop: (showPortalCard || isExpanded) && ((entry.classification.topics && entry.classification.topics.length > 0) || (entry.tags && entry.tags.length > 0)) ? '0.75rem' : '0',
                  paddingTop: (showPortalCard || isExpanded) && ((entry.classification.topics && entry.classification.topics.length > 0) || (entry.tags && entry.tags.length > 0)) ? '0.75rem' : '0',
                  borderTop: (showPortalCard || isExpanded) && ((entry.classification.topics && entry.classification.topics.length > 0) || (entry.tags && entry.tags.length > 0))
                    ? '1px solid rgb(229, 231, 235)'
                    : '0 solid transparent',
                }}
              >
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    const allItems = [
                      ...(entry.classification.topics || []).map(t => ({ type: 'topic', value: t })),
                      ...(entry.tags || []).map(t => ({ type: 'tag', value: t }))
                    ];
                    
                    if (isExpanded) {
                      // Show all when expanded
                      return allItems.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {item.type === 'tag' ? '#' : ''}{item.value}
                        </span>
                      ));
                    } else {
                      // Show one row with "+X more" on hover
                      const maxItems = 3; // Show up to 3 items, then "+X more"
                      const visibleItems = allItems.slice(0, maxItems);
                      const remainingCount = allItems.length - maxItems;
                      
                      return (
                        <>
                          {visibleItems.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              {item.type === 'tag' ? '#' : ''}{item.value}
                            </span>
                          ))}
                          {remainingCount > 0 && (
                            <span className="px-2 py-0.5 text-gray-400 text-xs">
                              +{remainingCount} more
                            </span>
                          )}
                        </>
                      );
                    }
                  })()}
                </div>
              </div>
              
              {/* Expanded content - only show when fully expanded */}
              {(isExpanded && entry.classification) && (
                <div 
                  className="overflow-visible transition-all duration-500 ease-in-out pt-3 mt-3 border-t border-gray-100"
                  style={{
                    opacity: 1,
                  }}
                >
                  <div className="space-y-4">
                    {/* Key Points */}
                    {entry.classification.keyPoints && entry.classification.keyPoints.length > 0 && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Points</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {entry.classification.keyPoints.map((point, idx) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Lessons */}
                    {entry.classification.lessons && entry.classification.lessons.length > 0 && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Lessons</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {entry.classification.lessons.map((lesson, idx) => (
                            <li key={idx}>{lesson}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


          {/* Tags - Show for manual entries only (content entries show tags inside the card) */}
          {isManual && entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-gray-500"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

