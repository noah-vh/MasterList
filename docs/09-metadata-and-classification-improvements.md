# Metadata & Classification Improvements (Inspired by Spacebar)

## Focus: Better Classification & Metadata

Spacebar excels at organizing conversation content. Here's what we can learn for better classification and metadata in Master List.

## Current Master List Metadata

```typescript
interface Task {
  type: TaskType;        // Task, Project, Idea
  area: Area;            // Professional, Personal, Domestic, Social
  energy?: EnergyLevel;  // Low, Medium, High
  location?: LocationContext; // Home, Office, Computer, Errands
  timeEstimate?: string;
  dueDate?: string;
  isUrgent?: boolean;
}
```

## What Spacebar Does Well

### 1. **Temporal Classification**
- **When it happened** (occurred date) vs **when to do it** (due date)
- Distinguishes past events from future actions

### 2. **Source Attribution**
- Who said what
- Where it came from (meeting, email, conversation)
- Participants involved

### 3. **Context Preservation**
- Full context/notes field
- Links between related items
- Background information

### 4. **Content Type Distinction**
- Actionable items (tasks)
- Non-actionable items (memories/notes)
- References (bookmarks, articles)

## Recommended Metadata Additions

### 1. **Occurred Date** (When Something Happened)
```typescript
interface Task {
  // ... existing fields
  occurredDate?: string; // NEW: When this was mentioned/discussed
}
```

**Use Cases:**
- "In yesterday's meeting, John said..."
- "Remember that conversation last week..."
- Filter by "what happened this week"

**Why It Helps:**
- Separates "when mentioned" from "when due"
- Better temporal context
- Useful for memories/notes

### 2. **Participants** (Who Was Involved)
```typescript
interface Task {
  // ... existing fields
  participants?: string[]; // NEW: People mentioned/involved
}
```

**Use Cases:**
- Tasks from meetings: ["John", "Sarah"]
- Social tasks: ["Mom", "Friend"]
- Filter by "tasks involving John"

**Why It Helps:**
- Better context for tasks
- Filter by person
- Track who's responsible

### 3. **Context/Notes Field** (Additional Context)
```typescript
interface Task {
  // ... existing fields
  context?: string; // NEW: Background/context information
}
```

**Use Cases:**
- "In the meeting, client requested this because..."
- "For context: This relates to the Q3 project"
- Full notes from conversations

**Why It Helps:**
- Preserves "why" not just "what"
- Better recall later
- Richer information

### 4. **Source Tracking** (Where It Came From)
```typescript
interface Task {
  // ... existing fields
  source?: {
    type: 'voice' | 'email' | 'transcript' | 'manual';
    id?: string;
  };
}
```

**Use Cases:**
- Know if task came from voice, email, meeting
- Link back to original source
- Filter by source type

**Why It Helps:**
- Better traceability
- Understand capture patterns
- Link to original context

### 5. **Related Items** (Links Between Items)
```typescript
interface Task {
  // ... existing fields
  linkedTasks?: string[]; // NEW: Related task IDs
}
```

**Use Cases:**
- Link memory to related task
- Group related items
- Show relationships

**Why It Helps:**
- Better organization
- See full context
- Navigate related items

## Enhanced Type Classification

### Current Types
- **Task**: Single action
- **Project**: Multi-step goal
- **Idea**: Non-actionable yet

### Suggested Addition: **Memory** Type
```typescript
enum TaskType {
  Task = 'Task',
  Project = 'Project',
  Idea = 'Idea',
  Memory = 'Memory', // NEW: Non-actionable, preserves context
}
```

**When to Use:**
- "In the meeting, we discussed..."
- "Remember that John mentioned..."
- "For context: The client said..."

**Why It Helps:**
- Keeps actionable list clean
- Preserves important context
- Better organization

## Updated Task Structure

```typescript
interface Task {
  // Existing fields
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
  
  // NEW: Enhanced metadata
  occurredDate?: string;      // When this happened/was mentioned
  participants?: string[];    // Who was involved
  context?: string;            // Additional context/notes
  source?: {                   // Where it came from
    type: 'voice' | 'email' | 'transcript' | 'manual';
    id?: string;
  };
  linkedTasks?: string[];      // Related task IDs
}
```

## AI Extraction Enhancements

### Enhanced Prompt for Context Extraction
```typescript
// In geminiService.ts, enhance the system prompt:

When extracting task metadata, also extract:
- occurredDate: If user mentions "yesterday", "last week", "in the meeting", extract when this happened
- participants: If names are mentioned (John, Sarah, etc.), extract as participants array
- context: Extract any background information, reasons, or additional notes
- source: Infer source type from input (voice-like = 'voice', email-like = 'email', etc.)

Examples:
- "In yesterday's meeting with John, we decided to launch next week"
  → occurredDate: yesterday, participants: ["John"], context: "decided to launch next week"
  
- "Sarah mentioned in the call that the client wants changes"
  → participants: ["Sarah"], context: "client wants changes", source: 'voice'
```

## Filter Enhancements

### New Filter Options
```typescript
interface FilterState {
  // ... existing filters
  participants?: string[];     // Filter by who's involved
  sourceType?: string[];      // Filter by source (voice, email, etc.)
  occurredDateScope?: DateScope; // Filter by when it happened
}
```

**Use Cases:**
- "Show me tasks involving John"
- "What did I capture from voice inputs?"
- "What happened last week?"

## UI Display Enhancements

### Task Card Additions
- Show participants as small badges
- Display source icon (🎤 voice, ✉️ email, etc.)
- Show occurred date if different from due date
- Expandable context field

### Filter Bar Additions
- Participant filter chips
- Source type filter
- Occurred date scope selector

## Implementation Priority

### Quick Wins (This Week)
1. ✅ Add `context?: string` field
2. ✅ Add `participants?: string[]` field
3. ✅ Update AI prompt to extract these
4. ✅ Display in TaskCard

### Next Steps
1. Add `occurredDate` field
2. Add `source` tracking
3. Add `linkedTasks` for relationships
4. Consider `Memory` type

## Example: Enhanced Task Capture

**User Input:**
```
"In yesterday's meeting with John and Sarah, we decided to launch the feature next week. John will handle the backend."
```

**AI Extraction:**
```json
{
  "title": "Launch feature next week",
  "type": "Task",
  "area": "Professional",
  "energy": "High",
  "location": "Computer",
  "dueDate": "2024-01-22", // next week
  "occurredDate": "2024-01-15", // yesterday
  "participants": ["John", "Sarah"],
  "context": "Decided in meeting. John will handle backend.",
  "source": {
    "type": "manual",
    "metadata": {}
  }
}
```

**Result:**
- Task captured with full context
- Can filter by participants
- Can see when it was discussed
- Preserves meeting context

## Benefits Summary

1. **Better Context**: `context` field preserves "why"
2. **People Tracking**: `participants` helps filter by person
3. **Temporal Clarity**: `occurredDate` vs `dueDate` distinction
4. **Source Awareness**: Know where tasks came from
5. **Relationships**: `linkedTasks` shows connections
6. **Cleaner Organization**: `Memory` type keeps actionable list focused

## What NOT to Add (For Now)

- Voice recording (focus on metadata first)
- Email integration (focus on classification first)
- Rich attachments (focus on structure first)
- Complex timeline views (focus on fields first)

Keep it simple: enhance the metadata structure, improve classification, then build features on top.

