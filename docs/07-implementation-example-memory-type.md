# Implementation Example: Adding Memory Type

This document shows a practical implementation example for adding Memory type support, inspired by Spacebar's approach to preserving non-actionable information.

## Overview

This example demonstrates:
1. Extending the type system to include Memory
2. Updating the AI service to handle memory extraction
3. Enhancing the UI to display memories differently
4. Adding a memory-specific view

## Step 1: Update Type Definitions

```typescript
// types.ts

export enum TaskType {
  Task = 'Task',
  Project = 'Project',
  Idea = 'Idea',
  Memory = 'Memory', // NEW
}

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  type: TaskType;
  area: Area;
  energy?: EnergyLevel;
  timeEstimate?: string;
  location?: LocationContext;
  dueDate?: string;
  isUrgent?: boolean;
  createdAt: number;
  
  // NEW: Memory-specific fields
  occurredDate?: string; // When this happened (for memories)
  source?: {
    type: 'voice' | 'email' | 'transcript' | 'manual';
    id?: string;
  };
  participants?: string[]; // Who was involved
  context?: string; // Additional context/notes
  linkedTasks?: string[]; // Related task IDs
}
```

## Step 2: Enhance AI Service for Memory Extraction

```typescript
// services/geminiService.ts

const MEMORY_EXTRACTION_PROMPT = `
You are analyzing input to determine if it's a memory (something that happened) vs a task (something to do).

MEMORY indicators:
- Past tense: "We discussed...", "John mentioned...", "In the meeting..."
- Non-actionable: "Remember that...", "Note that...", "Sarah said..."
- Context/background: "For context...", "Background:..."

TASK indicators:
- Action verbs: "Buy...", "Call...", "Fix...", "Send..."
- Future tense: "I need to...", "Remind me to..."
- Actionable items

If it's a MEMORY:
- Extract occurredDate if mentioned (or use today if not)
- Extract participants if mentioned
- Extract context
- Set type to "Memory"
- Set area based on context
- Energy/Location not required for memories

If it's a TASK:
- Use existing extraction logic
`;

export const parseUserIntent = async (input: string): Promise<AIResponse | null> => {
  // ... existing code ...
  
  const enhancedSystemInstruction = `
    ${existingSystemInstruction}
    
    ${MEMORY_EXTRACTION_PROMPT}
    
    For memories, return:
    - type: "Memory"
    - occurredDate: ISO date string (when this happened)
    - participants: Array of names if mentioned
    - context: Full context/notes
    - area: Still required for organization
    - energy/location: Optional for memories
  `;
  
  // Update response schema to include memory fields
  const responseSchema = {
    // ... existing schema ...
    taskData: {
      // ... existing properties ...
      occurredDate: { type: Type.STRING, description: "When this happened (for memories)" },
      participants: { type: Type.ARRAY, items: { type: Type.STRING } },
      context: { type: Type.STRING, description: "Additional context/notes" },
    }
  };
};
```

## Step 3: Update SmartInput to Handle Memories

```typescript
// components/SmartInput.tsx

const renderTaskConfirmation = () => {
  if (!editableTaskData) return null;
  
  const isMemory = editableTaskData.type === TaskType.Memory;

  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 
            {isMemory ? 'Capture Memory' : 'Capture Task'}
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
      
      {/* Memory-specific fields */}
      {isMemory && (
        <div className="mb-4 space-y-3">
          <div className="bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-1">Occurred Date</span>
            <input 
              type="date" 
              value={editableTaskData.occurredDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => updateTaskField('occurredDate', e.target.value)}
              className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-sm"
            />
          </div>
          
          {editableTaskData.participants && editableTaskData.participants.length > 0 && (
            <div className="bg-gray-50 p-2 rounded-lg">
              <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-1">Participants</span>
              <div className="flex flex-wrap gap-1">
                {editableTaskData.participants.map((p, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {editableTaskData.context && (
            <div className="bg-gray-50 p-2 rounded-lg">
              <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-1">Context</span>
              <textarea 
                value={editableTaskData.context}
                onChange={(e) => updateTaskField('context', e.target.value)}
                className="w-full bg-transparent font-medium text-gray-800 focus:outline-none text-sm min-h-[60px]"
                placeholder="Additional context or notes..."
              />
            </div>
          )}
        </div>
      )}
      
      {/* Existing task fields (only show if not memory) */}
      {!isMemory && (
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          {/* ... existing task fields ... */}
        </div>
      )}
    </>
  );
};
```

## Step 4: Update TaskCard to Display Memories Differently

```typescript
// components/TaskCard.tsx

export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onClick }) => {
  const isMemory = task.type === TaskType.Memory;
  const isReference = task.type === TaskType.Reference;
  
  return (
    <div 
      className={`
        bg-white rounded-lg p-4 border border-gray-200 
        ${task.isCompleted ? 'opacity-50' : ''}
        ${isMemory ? 'border-l-4 border-l-purple-400' : ''}
        ${isReference ? 'border-l-4 border-l-blue-400' : ''}
        cursor-pointer hover:shadow-md transition-shadow
      `}
      onClick={() => onClick(task.id)}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox - only for actionable items */}
        {!isMemory && !isReference && (
          <input
            type="checkbox"
            checked={task.isCompleted}
            onChange={(e) => {
              e.stopPropagation();
              onToggle(task.id);
            }}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`
              font-medium text-gray-900
              ${task.isCompleted ? 'line-through' : ''}
            `}>
              {task.title}
            </h3>
            
            {/* Memory indicator */}
            {isMemory && (
              <span className="text-xs text-purple-600 font-medium flex-shrink-0">
                💭 Memory
              </span>
            )}
          </div>
          
          {/* Memory-specific metadata */}
          {isMemory && task.occurredDate && (
            <p className="text-xs text-gray-500 mt-1">
              Occurred: {new Date(task.occurredDate).toLocaleDateString()}
            </p>
          )}
          
          {isMemory && task.participants && task.participants.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.participants.map((p, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                  {p}
                </span>
              ))}
            </div>
          )}
          
          {/* Standard metadata badges */}
          {!isMemory && (
            <div className="flex flex-wrap gap-2 mt-2">
              {/* ... existing badge display ... */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

## Step 5: Add Memory View to FilterBar

```typescript
// components/FilterBar.tsx

// Add Memory to type filter options
const TYPE_OPTIONS = [
  { value: TaskType.Task, label: 'Task' },
  { value: TaskType.Project, label: 'Project' },
  { value: TaskType.Idea, label: 'Idea' },
  { value: TaskType.Memory, label: 'Memory' }, // NEW
];

// Add "Memories" quick filter button
<div className="flex gap-2 mb-4">
  <button
    onClick={() => {
      setFilters({
        ...activeFilters,
        type: [TaskType.Memory],
      });
    }}
    className="px-3 py-1.5 text-sm rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100"
  >
    💭 Memories
  </button>
</div>
```

## Step 6: Update Filter Logic

```typescript
// App.tsx

const filteredTasks = useMemo(() => {
  return tasks.filter(task => {
    // ... existing filters ...
    
    // Memories are never "completed" in the traditional sense
    // But we can filter them out if needed
    if (task.type === TaskType.Memory && filters.showCompleted === false) {
      // Handle memory visibility separately
    }
    
    return matchesArea && matchesType && matchesEnergy && matchesLocation && matchesUrgent && matchesDate;
  }).sort((a, b) => {
    // Memories sorted by occurredDate (most recent first)
    if (a.type === TaskType.Memory && b.type === TaskType.Memory) {
      const aDate = a.occurredDate ? new Date(a.occurredDate).getTime() : 0;
      const bDate = b.occurredDate ? new Date(b.occurredDate).getTime() : 0;
      return bDate - aDate;
    }
    
    // ... existing sorting logic ...
  });
}, [tasks, filters]);
```

## Step 7: Add Memory-Specific View Generation

```typescript
// services/geminiService.ts

// Update view generation prompt
const VIEW_GENERATION_PROMPT = `
When generating views, you can also create memory-specific views:

Examples:
- "Show me what happened last week" → Memory view filtered by date
- "What did we discuss in meetings?" → Memory view with participants
- "My memories" → All memories

Memory views should:
- Filter by type: Memory
- Optionally filter by occurredDate
- Optionally filter by participants
- Use creative names like "📚 Memory Lane" or "💭 Recent Conversations"
`;

// Update AI prompt to include memory view examples
```

## Step 8: Example Usage

### Capturing a Memory

**User Input:**
```
"In today's meeting, Sarah mentioned that the client wants to see a demo next week. John said he'll prepare the slides."
```

**AI Extraction:**
```json
{
  "intent": "CAPTURE_TASK",
  "taskData": {
    "title": "Client wants demo next week - Sarah mentioned in meeting",
    "type": "Memory",
    "area": "Professional",
    "occurredDate": "2024-01-15",
    "participants": ["Sarah", "John"],
    "context": "In today's meeting, Sarah mentioned that the client wants to see a demo next week. John said he'll prepare the slides.",
    "linkedTasks": [] // Could link to "Prepare demo slides" task
  }
}
```

### Viewing Memories

**User Input:**
```
"Show me my memories from last week"
```

**AI Response:**
```json
{
  "intent": "GENERATE_VIEW",
  "viewData": {
    "viewName": "📚 Last Week's Memories",
    "description": "Recalling what happened last week",
    "filters": {
      "type": ["Memory"],
      "dateScope": "ThisWeek" // Would need to enhance date filtering
    }
  }
}
```

## Benefits of This Implementation

1. **Preserves Context**: Memories capture "what happened" not just "what to do"
2. **Better Recall**: Can look back at conversations and context
3. **Cleaner Task List**: Non-actionable items don't clutter actionable list
4. **Rich Metadata**: Participants, occurred dates, context all preserved
5. **Linked Information**: Memories can link to related tasks

## Next Steps

1. Implement the type system changes
2. Update AI prompts for memory extraction
3. Enhance UI components to display memories
4. Add memory-specific views
5. Test with real conversations/transcripts
6. Iterate based on usage patterns

## Considerations

- **Storage**: Memories might accumulate quickly - consider archiving old memories
- **Privacy**: If capturing from conversations, ensure user consent
- **Search**: Need good search functionality for memories
- **Timeline View**: Visual timeline of memories would be valuable
- **Integration**: Link memories to calendar events, emails, etc.

