import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { TimeBlock } from '../types';
import { Plus, Trash2, X, Check, Clock, GripVertical } from 'lucide-react';

// Utility for class names
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

interface TimelineViewProps {
  templateId: string | null;
}

const BLOCK_COLORS = [
  { value: '#818CF8', label: 'Indigo' }, // indigo-400
  { value: '#F9A8D4', label: 'Pink' }, // pink-300
  { value: '#C084FC', label: 'Purple' }, // purple-400
  { value: '#6EE7B7', label: 'Emerald' }, // emerald-300
  { value: '#FCA5A5', label: 'Rose' }, // rose-300
  { value: '#FCD34D', label: 'Amber' }, // amber-300
  { value: '#93C5FD', label: 'Blue' }, // blue-300
  { value: '#86EFAC', label: 'Green' }, // green-300
  { value: '#F87171', label: 'Red' }, // red-400
  { value: '#67E8F9', label: 'Cyan' }, // cyan-300
  { value: '#FDE047', label: 'Yellow' }, // yellow-300
  { value: '#5EEAD4', label: 'Teal' }, // teal-300
  { value: '#FB923C', label: 'Orange' }, // orange-400
  { value: '#94A3B8', label: 'Slate' }, // slate-400
];

// Convert minutes to time string (e.g., 480 -> "8:00 AM")
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
};

export const TimelineView: React.FC<TimelineViewProps> = ({ templateId }) => {
  const timeBlocks = useQuery(
    api.timeBlocks.list,
    templateId ? { templateId: templateId as Id<"timeBlockTemplates"> } : "skip"
  ) ?? [];
  
  const createBlock = useMutation(api.timeBlocks.create);
  const updateBlock = useMutation(api.timeBlocks.update);
  const deleteBlock = useMutation(api.timeBlocks.deleteBlock);
  const resizeBlock = useMutation(api.timeBlocks.resize);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'top' | 'bottom' | 'move' | null>(null); 
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragStartTime, setDragStartTime] = useState<number>(0);
  const [dragStartEndTime, setDragStartEndTime] = useState<number>(0);
  const [dragCurrentBlock, setDragCurrentBlock] = useState<TimeBlock | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Scroll to current time on mount
  useEffect(() => {
    // Calculate current minutes from midnight
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    setCurrentTime(minutes);

    // Scroll to current time - 2 hours (to give context)
    if (timelineRef.current) {
        // 24 hours = 1440 minutes
        // Total rendered height is based on minuteHeight * 1440
        // Let's set a fixed height per minute to make it "long and stretched out"
        // E.g., 2px per minute -> 2880px total height
        
        const scrollMinutes = Math.max(0, minutes - 120);
        // We rely on the container scrolling, so we need to scroll the container
        // The container is the ref
        
        // Wait for layout
        setTimeout(() => {
            if (timelineRef.current) {
               const minuteHeight = 2; // Must match the CSS calculation
               timelineRef.current.scrollTop = scrollMinutes * minuteHeight;
            }
        }, 100);
    }

    // Update current time every minute
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.getHours() * 60 + now.getMinutes());
    }, 60000);

    return () => clearInterval(interval);
  }, []);
  
  // Convert Convex blocks to frontend TimeBlock type
  const blocks = useMemo(() => {
    return timeBlocks.map((block: any): TimeBlock => ({
      id: block._id,
      templateId: block.templateId,
      startTime: block.startTime,
      endTime: block.endTime,
      title: block.title,
      color: block.color,
      createdAt: block.createdAt,
    }));
  }, [timeBlocks]);
  
  const MINUTE_HEIGHT = 2; // 2px per minute = 120px per hour. Nice and spacious.
  const TOTAL_HEIGHT = 1440 * MINUTE_HEIGHT;

  // Calculate position and height for a block
  const getBlockStyle = (block: TimeBlock) => {
    const top = block.startTime * MINUTE_HEIGHT;
    const height = (block.endTime - block.startTime) * MINUTE_HEIGHT;
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      minHeight: '30px', // Ensure very short blocks are visible
    };
  };
  
  // Get Y position in timeline from click event
  const getTimeFromY = (clientY: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const y = clientY - rect.top + timelineRef.current.scrollTop; // Account for scroll
    const minutes = y / MINUTE_HEIGHT;
    return Math.max(0, Math.min(1440, Math.round(minutes)));
  };
  
  // Handle click on timeline to create new block
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!templateId || draggingBlockId) return;
    
    // Don't create block if clicking on an existing block
    const target = e.target as HTMLElement;
    if (target.closest('[data-time-block]')) return;
    
    const clickedTime = getTimeFromY(e.clientY);
    // Snap to nearest 15 minutes
    const snappedTime = Math.round(clickedTime / 15) * 15;
    
    const defaultDuration = 60; // 1 hour default
    const startTime = Math.max(0, snappedTime);
    const endTime = Math.min(1440, startTime + defaultDuration);
    
    createBlock({
      templateId: templateId as Id<"timeBlockTemplates">,
      startTime,
      endTime,
      title: '',
      color: BLOCK_COLORS[0].value, // Default color
    });
  }, [templateId, createBlock, draggingBlockId]);
  
  // Handle drag start on block edge
  const handleBlockMouseDown = useCallback((
    e: React.MouseEvent,
    block: TimeBlock,
    type: 'top' | 'bottom' | 'move'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingBlockId(block.id);
    setDragType(type);
    setDragStartY(e.clientY);
    setDragStartTime(block.startTime);
    setDragStartEndTime(block.endTime);
    setDragCurrentBlock(block);
  }, []);
  
  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingBlockId || !dragType || !timelineRef.current || !dragCurrentBlock) return;
    
    const deltaY = e.clientY - dragStartY;
    // Convert pixels to minutes directly using our fixed scale
    const deltaMinutes = Math.round(deltaY / MINUTE_HEIGHT);
    
    let newStartTime = dragStartTime;
    let newEndTime = dragStartEndTime;
    
    if (dragType === 'top') {
      newStartTime = Math.max(0, Math.min(dragStartEndTime - 15, dragStartTime + deltaMinutes));
      // Snap to 5 min
      newStartTime = Math.round(newStartTime / 5) * 5;
    } else if (dragType === 'bottom') {
      newEndTime = Math.max(dragStartTime + 15, Math.min(1440, dragStartEndTime + deltaMinutes));
      // Snap to 5 min
      newEndTime = Math.round(newEndTime / 5) * 5;
    } else if (dragType === 'move') {
        const duration = dragStartEndTime - dragStartTime;
        newStartTime = Math.max(0, Math.min(1440 - duration, dragStartTime + deltaMinutes));
        // Snap to 15 min
        newStartTime = Math.round(newStartTime / 15) * 15;
        newEndTime = newStartTime + duration;
    }
    
    // Update block optimistically
    setDragCurrentBlock({
      ...dragCurrentBlock,
      startTime: newStartTime,
      endTime: newEndTime,
    });
  }, [draggingBlockId, dragType, dragStartY, dragStartTime, dragStartEndTime, dragCurrentBlock]);
  
  // Handle mouse up to finish drag
  const handleMouseUp = useCallback(async () => {
    if (!draggingBlockId || !dragType || !dragCurrentBlock) return;
    
    const finalStartTime = dragCurrentBlock.startTime;
    const finalEndTime = dragCurrentBlock.endTime;
    
    // Only update if changed
    if (finalStartTime !== dragStartTime || finalEndTime !== dragStartEndTime) {
        try {
        await resizeBlock({
            id: draggingBlockId as Id<"timeBlocks">,
            startTime: finalStartTime,
            endTime: finalEndTime,
        });
        } catch (error) {
        console.error('Error resizing block:', error);
        }
    }
    
    setDraggingBlockId(null);
    setDragType(null);
    setDragCurrentBlock(null);
  }, [draggingBlockId, dragType, dragCurrentBlock, resizeBlock, dragStartTime, dragStartEndTime]);
  
  // Set up global mouse listeners for dragging
  useEffect(() => {
    if (draggingBlockId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingBlockId, handleMouseMove, handleMouseUp]);
  
  // Generate hour markers
  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let hour = 0; hour < 24; hour++) {
      markers.push({
        hour,
        minutes: hour * 60,
        label: hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`,
      });
    }
    return markers;
  }, []);

  // Popover state for editing
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleBlockClick = (e: React.MouseEvent, block: TimeBlock) => {
      // Prevent click if we just finished dragging
      if (draggingBlockId) return;
      e.stopPropagation();
      // Toggle editing mode
      if (editingBlockId === block.id) {
          setEditingBlockId(null);
          setShowColorPicker(false);
      } else {
      setEditingBlockId(block.id);
      setEditTitle(block.title || '');
      setEditColor(block.color || BLOCK_COLORS[0].value);
      setShowColorPicker(false);
      }
  };

  const handleSaveEdit = async (blockId: string, color?: string, keepOpen?: boolean) => {
      const colorToSave = color || editColor;
      await updateBlock({
          id: blockId as Id<"timeBlocks">,
          title: editTitle,
          color: colorToSave,
      });
      if (color) {
          setEditColor(color);
      }
      if (!keepOpen) {
          setEditingBlockId(null);
      }
  };

  const handleDeleteBlock = async (blockId: string) => {
      await deleteBlock({ id: blockId as Id<"timeBlocks"> });
      setEditingBlockId(null);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent, blockId: string) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          handleSaveEdit(blockId);
      } else if (e.key === 'Escape') {
          setEditingBlockId(null);
      }
  };
  
  if (!templateId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm m-4">
        <Clock className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-medium">Select a template to view timeline</p>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col relative">
      {/* Timeline Container - This scrolls */}
      <div
        ref={timelineRef}
        className="flex-1 relative overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar"
        onClick={handleTimelineClick}
        style={{ cursor: draggingBlockId ? 'grabbing' : 'default' }}
      >
        {/* Inner Container - This sets the height */}
        <div style={{ height: `${TOTAL_HEIGHT}px`, position: 'relative' }}>
            
            {/* Background Grid */}
            <div className="absolute left-16 right-0 top-0 bottom-0 pointer-events-none">
            {hourMarkers.map((marker) => (
                <div
                key={marker.hour}
                className="absolute left-0 right-0 border-t border-gray-200/60 border-dashed"
                style={{ top: `${marker.minutes * MINUTE_HEIGHT}px` }}
                />
            ))}
            </div>

            {/* Hour Markers */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-transparent pointer-events-none">
            {hourMarkers.map((marker) => (
                <div
                key={marker.hour}
                className="absolute right-3 -translate-y-1/2 text-xs font-medium text-gray-400 select-none"
                style={{ top: `${marker.minutes * MINUTE_HEIGHT}px` }}
                >
                {marker.label}
                </div>
            ))}
            </div>
            
            {/* Current Time Indicator */}
            <div 
                className="absolute left-16 right-0 h-px bg-red-500 z-20 pointer-events-none flex items-center"
                style={{ top: `${currentTime * MINUTE_HEIGHT}px` }}
            >
                <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-red-500" />
            </div>

            {/* Timeline Blocks */}
            <div className="absolute left-16 right-2 top-0 bottom-0">
            {blocks.map((block) => {
                const displayBlock = draggingBlockId === block.id && dragCurrentBlock ? dragCurrentBlock : block;
                const isEditing = editingBlockId === block.id;
                // Use editColor when editing to show preview, otherwise use block color
                const blockColor = isEditing && editColor ? editColor : (displayBlock.color || BLOCK_COLORS[0].value);
                const style = getBlockStyle(displayBlock);
                const isDragging = draggingBlockId === block.id;
                const duration = displayBlock.endTime - displayBlock.startTime;
                
                return (
                <div
                    key={block.id}
                    data-time-block
                    className={cn(
                        "absolute left-2 right-2 rounded-2xl transition-all group overflow-hidden",
                        isDragging ? "shadow-2xl z-30 opacity-95 cursor-grabbing scale-[1.02]" : "hover:shadow-lg cursor-pointer z-10",
                        isEditing ? "ring-2 ring-offset-2 ring-offset-[#F3F4F6]" : "",
                        "backdrop-blur-sm"
                    )}
                    style={{
                        ...style,
                        backgroundColor: isEditing 
                            ? `${blockColor}15` 
                            : `${blockColor}20`,
                        border: `2px solid ${blockColor}`,
                        boxShadow: isEditing 
                            ? `0 10px 40px -10px ${blockColor}40, 0 0 0 1px ${blockColor}20`
                            : `0 4px 12px -2px ${blockColor}30`,
                    }}
                    onClick={(e) => handleBlockClick(e, block)}
                    onMouseEnter={() => setHoveredBlockId(block.id)}
                    onMouseLeave={() => setHoveredBlockId(null)}
                    onMouseDown={(e) => !isEditing && handleBlockMouseDown(e, block, 'move')}
                >
                    {/* Gradient overlay for depth */}
                    <div 
                        className="absolute inset-0 opacity-60 pointer-events-none bg-gradient-to-br from-white/40 to-transparent"
                    />

                    {/* Resize Handle - Top */}
                    {!isEditing && (
                        <div
                            className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-white/20 z-20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl"
                            onMouseDown={(e) => handleBlockMouseDown(e, block, 'top')}
                        />
                    )}
                    
                    {/* Block Content */}
                    <div className="relative h-full flex flex-col px-3 py-2.5">
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                {/* Compact Inline Title Edit */}
                                <input 
                                    type="text" 
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onKeyDown={(e) => handleTitleKeyDown(e, block.id)}
                                    onBlur={() => handleSaveEdit(block.id)}
                                    placeholder="Untitled"
                                    className="flex-1 bg-white/95 backdrop-blur-sm border-0 rounded-lg px-2.5 py-1.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-white/60 focus:bg-white transition-all min-w-0"
                                    autoFocus
                                />
                                
                                {/* Compact Color Picker - Collapsible */}
                                <div 
                                    className="flex items-center gap-1.5"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    {!showColorPicker ? (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setShowColorPicker(true);
                                            }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                            }}
                                            className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-white/50 hover:bg-white transition-colors z-10 relative"
                                            title="Change color"
                                        >
                                            <div 
                                                className="w-4 h-4 rounded-md shadow-sm border border-white/50"
                                                style={{ backgroundColor: blockColor }}
                                            />
                                            <span className="text-xs text-gray-600">Color</span>
                                        </button>
                                    ) : (
                                        <div 
                                            className="flex gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 border border-white/50 z-10 relative"
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                        >
                                            {BLOCK_COLORS.map((c) => {
                                                const isSelected = editColor === c.value || blockColor === c.value;
                                                return (
                                                    <button
                                                        key={c.value}
                                                        type="button"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            setEditColor(c.value);
                                                            await handleSaveEdit(block.id, c.value, true);
                                                            setShowColorPicker(false);
                                                        }}
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                        className={cn(
                                                            "w-5 h-5 rounded-md transition-all relative overflow-hidden shadow-sm",
                                                            isSelected
                                                                ? "ring-2 ring-gray-800 scale-110 shadow-md" 
                                                                : "hover:scale-110 hover:shadow-md"
                                                        )}
                                                        style={{ backgroundColor: c.value }}
                                                        title={c.label}
                                                    >
                                                        {isSelected && (
                                                            <Check className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg stroke-[3]" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setShowColorPicker(false);
                                                }}
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                }}
                                                className="ml-1 px-1.5 text-gray-500 hover:text-gray-700 text-xs"
                                                title="Close"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Compact Delete Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleDeleteBlock(block.id);
                                    }}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-600 p-1.5 rounded-lg transition-colors flex-shrink-0"
                                    title="Delete block"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="font-bold text-base text-gray-900 truncate leading-tight mb-0.5 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
                                    {displayBlock.title || <span className="text-gray-600/70 italic font-normal">Untitled</span>}
                                </div>
                                
                                {/* Time details */}
                                {duration > 20 && (
                                    <div className="text-[10px] font-medium text-gray-700/80 flex items-center gap-1.5">
                                        <Clock className="w-3 h-3 opacity-70" />
                                        {minutesToTime(displayBlock.startTime)} - {minutesToTime(displayBlock.endTime)}
                                    </div>
                                )}
                                
                                {/* Drag Handle Indicator */}
                                {duration > 45 && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity">
                                        <GripVertical className="w-4 h-4 text-gray-600" />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    
                    {/* Resize Handle - Bottom */}
                    {!isEditing && (
                        <div
                            className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-white/20 z-20 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl"
                            onMouseDown={(e) => handleBlockMouseDown(e, block, 'bottom')}
                        />
                    )}
                </div>
                );
            })}
            </div>
            
            {/* Empty State */}
            {blocks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                <div className="bg-white p-4 rounded-full mb-4 inline-block shadow-sm border border-gray-100">
                    <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No time blocks</p>
                <p className="text-sm text-gray-400 mt-1">
                    Click anywhere on the timeline to plan your day
                </p>
                </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};
