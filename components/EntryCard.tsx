import React, { useState, useRef, useEffect } from 'react';
import { Entry } from '../types';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, Cancel01Icon, Add01Icon, Edit01Icon, Delete01Icon, Attachment01Icon, Link01Icon, Message01Icon } from '@hugeicons/core-free-icons';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { ContentEntryModal } from './ContentEntryModal';

interface EntryCardProps {
  entry: Entry;
  taskTitle?: string; // For activity logs, the linked task title
  onTaskClick?: (taskId: string) => void;
  onEdit?: (entry: Entry) => void;
  onDelete?: (entryId: string) => void;
  onContentUpdate?: (entry: Entry) => void;
  showTimestamp?: boolean; // Whether to show timestamp (iMessage-style)
  isFirstInGroup?: boolean; // First entry in a time group
}

export const EntryCard: React.FC<EntryCardProps> = ({ 
  entry, 
  taskTitle, 
  onTaskClick, 
  onEdit, 
  onDelete,
  onContentUpdate,
  showTimestamp = false,
  isFirstInGroup = false
}) => {
  const [showPortalCard, setShowPortalCard] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [showChatPortalCard, setShowChatPortalCard] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const chatCardRef = useRef<HTMLDivElement>(null);
  
  const isActivity = entry.entryType === 'activity';
  const isManual = entry.entryType === 'manual';
  const isContent = entry.entryType === 'content';
  const isChat = entry.contentType === 'chat' && entry.chatThread;

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

  // Scroll to chat card when expanded
  useEffect(() => {
    if (isChatExpanded && chatCardRef.current) {
      chatCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [isChatExpanded]);
  
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
        icon: <HugeiconsIcon icon={Add01Icon} size={14} />,
        color: '#93C5FD', // blue-300 - paler blue
        textColor: 'text-blue-800'
      };
    } else if (entry.activityType === 'task_completed') {
      return {
        prefix: 'Task completed',
        icon: <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />,
        color: '#6EE7B7', // emerald-300 - green
        textColor: 'text-green-800'
      };
    } else if (entry.activityType === 'task_uncompleted') {
      return {
        prefix: 'Task uncompleted',
        icon: <HugeiconsIcon icon={Cancel01Icon} size={14} />,
        color: '#FCA5A5', // red-300 - red
        textColor: 'text-red-800'
      };
    } else if (entry.activityType === 'attachment_added') {
      return {
        prefix: 'Attachment added',
        icon: <HugeiconsIcon icon={Attachment01Icon} size={14} />,
        color: '#D1D5DB', // gray-300 - grey
        textColor: 'text-gray-800'
      };
    }
    return null;
  };

  const getAttachmentBadge = () => {
    if (entry.hasAttachment) {
      return {
        prefix: 'Attachment added',
        icon: <HugeiconsIcon icon={Attachment01Icon} size={14} />,
        color: '#D1D5DB', // gray-300 - grey
        textColor: 'text-gray-800'
      };
    }
    return null;
  };

  const getChatBadge = () => {
    if (isChat) {
      return {
        prefix: 'Chat conversation',
        icon: <HugeiconsIcon icon={Message01Icon} size={14} />,
        color: '#D1D5DB', // gray-300 - grey
        textColor: 'text-gray-800'
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
    <div className="py-2 group relative">
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

      {/* Timestamp - Centered, small, and subtle for all entries with divider lines */}
      {showTimestamp && (
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="flex-1 h-px bg-gray-300 opacity-60 max-w-[80px]" />
          <span className="text-xs font-normal text-gray-400 flex-shrink-0">
            {formatTimestamp(entry.createdAt)}
          </span>
          <div className="flex-1 h-px bg-gray-300 opacity-60 max-w-[80px]" />
        </div>
      )}
      
      {/* Activity Badge - Long pill with full content, glassy glow style */}
      {isActivity && activityBadge && (
        <div className="flex justify-center mb-3">
          <div 
            className={`inline-flex items-center gap-3 px-6 py-2.5 ${activityBadge.textColor} rounded-full text-sm font-medium backdrop-blur-sm max-w-[85%] min-w-[240px]`}
            style={{
              backgroundColor: `${activityBadge.color}25`,
              border: `1.5px solid ${activityBadge.color}60`,
              boxShadow: `0 4px 12px -2px ${activityBadge.color}25, 0 0 0 1px ${activityBadge.color}10`,
            }}
          >
            <div className="flex items-center gap-2 flex-shrink-0">
              {activityBadge.icon}
              <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {activityBadge.prefix}
              </span>
            </div>
            <div className="h-4 w-px bg-current opacity-30 flex-shrink-0" />
            <span className="truncate font-semibold">
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
              className={`inline-flex items-center gap-3 px-6 py-2.5 ${attachmentBadge.textColor} rounded-full text-sm font-medium backdrop-blur-sm max-w-[85%] min-w-[240px]`}
              style={{
                backgroundColor: `${attachmentBadge.color}25`,
                border: `1.5px solid ${attachmentBadge.color}60`,
                boxShadow: `0 4px 12px -2px ${attachmentBadge.color}25, 0 0 0 1px ${attachmentBadge.color}10`,
              }}
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

      {/* Chat Entry Card - Expandable like content entries */}
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
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer transition-all duration-500 ease-in-out"
            style={{
              boxShadow: showChatPortalCard || isChatExpanded 
                ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' 
                : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              minHeight: isChatExpanded ? 'calc(100vh - 20rem)' : 'auto',
              maxHeight: isChatExpanded ? 'calc(100vh - 20rem)' : 'none',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsChatExpanded(!isChatExpanded);
            }}
          >
            {/* Content */}
            <div className="p-4 transition-all duration-500 ease-in-out">
              {/* Header with close button when expanded */}
              <div 
                className="flex items-center justify-between mb-2 transition-all duration-300 ease-in-out overflow-hidden"
                style={{
                  maxHeight: isChatExpanded ? '3rem' : '0',
                  opacity: isChatExpanded ? 1 : 0,
                  marginBottom: isChatExpanded ? '0.5rem' : '0',
                }}
              >
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Message01Icon} size={16} className="text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    Chat Conversation
                  </h3>
                  <span className="text-xs text-gray-500">
                    ({entry.chatThread.length} message{entry.chatThread.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsChatExpanded(false);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors -mt-1 -mr-1"
                  title="Collapse"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              
              {/* Preview - Show first message when collapsed */}
              {!isChatExpanded && (
                <div className="space-y-2">
                  {entry.chatThread.slice(0, 2).map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-xs whitespace-pre-wrap break-words line-clamp-2">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {entry.chatThread.length > 2 && (
                    <p className="text-xs text-gray-400 text-center mt-2">
                      +{entry.chatThread.length - 2} more message{entry.chatThread.length - 2 !== 1 ? 's' : ''}...
                    </p>
                  )}
                </div>
              )}
              
              {/* Expanded Chat Thread */}
              <div 
                className="overflow-hidden transition-all duration-500 ease-in-out"
                style={{
                  maxHeight: isChatExpanded ? 'none' : '0',
                  opacity: isChatExpanded ? 1 : 0,
                  marginTop: isChatExpanded ? '1rem' : '0',
                }}
              >
                {isChatExpanded && (
                  <div className="space-y-3 max-h-[calc(100vh-25rem)] overflow-y-auto">
                    {entry.chatThread.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900 border border-gray-200'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
  );
};

