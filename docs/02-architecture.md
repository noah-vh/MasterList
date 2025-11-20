# Architecture

## System Overview

Master List is a React + TypeScript application built with Vite. It uses Google Gemini 2.5 Flash for AI-powered task extraction and view generation. The architecture follows a component-based structure with clear separation of concerns.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Google Gemini 2.5 Flash** - AI service for natural language processing
- **Lucide React** - Icon library
- **UUID** - Unique ID generation

## Project Structure

```
MasterList/
├── App.tsx                 # Main application component
├── index.tsx              # Application entry point
├── types.ts              # TypeScript type definitions
├── constants.ts          # Constants and mock data
├── components/           # React components
│   ├── Badge.tsx         # Badge component for metadata display
│   ├── FilterBar.tsx     # Filter controls UI
│   ├── SmartInput.tsx    # AI-powered input component
│   ├── TaskCard.tsx      # Individual task display
│   └── TaskDetailView.tsx # Task detail modal
└── services/             # Business logic
    └── geminiService.ts   # Gemini API integration
```

## Data Models

### Task Interface

```typescript
interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  type: TaskType;
  area: Area;
  energy?: EnergyLevel;
  timeEstimate?: string;
  location?: LocationContext;
  dueDate?: string; // ISO date string YYYY-MM-DD
  isUrgent?: boolean;
  createdAt: number;
}
```

### Filter State

```typescript
interface FilterState {
  area: Area[];
  type: TaskType[];
  energy: EnergyLevel[];
  location: LocationContext[];
  isUrgent?: boolean;
  dateScope: DateScope; // 'All' | 'Today' | 'ThisWeek' | 'Overdue'
}
```

### AI Response Structure

```typescript
interface AIResponse {
  intent: 'CAPTURE_TASK' | 'GENERATE_VIEW';
  taskData?: ExtractedTaskData;
  viewData?: GeneratedViewData;
}
```

## Core Components

### App.tsx

The main application component that orchestrates:
- Task state management
- Filter state management
- Filtering logic
- Task CRUD operations
- View management

**Key Responsibilities:**
- Maintains the master task list
- Applies filters to tasks
- Handles task creation, updates, and deletion
- Manages selected task for detail view
- Coordinates between components

### SmartInput Component

The AI-powered input component that:
- Accepts natural language input
- Sends input to Gemini API
- Displays confirmation UI for extracted data
- Allows manual editing before confirmation
- Handles both task capture and view generation

**Flow:**
1. User types natural language
2. Input sent to `geminiService.parseUserIntent()`
3. AI determines intent (CAPTURE_TASK or GENERATE_VIEW)
4. Confirmation UI shown with extracted data
5. User confirms or cancels
6. Task added or view applied

### FilterBar Component

The filter control interface that:
- Displays all available filter categories
- Shows active filter state
- Allows toggling filters on/off
- Displays current view name
- Provides "Clear All" functionality

**Filter Logic:**
- Multi-select within category = OR logic
- Across categories = AND logic
- Filters combine to show matching tasks

### TaskCard Component

Individual task display that:
- Shows task title and metadata badges
- Displays completion checkbox
- Shows visual indicators (area, energy, location)
- Handles click to open detail view
- Supports toggle completion

### TaskDetailView Component

Modal view for task details that:
- Shows full task information
- Allows editing all task fields
- Supports task deletion
- Provides close functionality

## Services

### Gemini Service

The AI integration service that:
- Connects to Google Gemini 2.5 Flash API
- Parses user intent from natural language
- Extracts task metadata
- Generates filter views based on user state

**System Prompt:**
The service uses a detailed system instruction that:
- Defines the "External Brain" persona
- Explains CAPTURE_TASK vs GENERATE_VIEW scenarios
- Provides extraction guidelines
- Specifies response schema

**Response Schema:**
Structured JSON response with:
- Intent classification
- Task data (if capturing)
- View data (if generating view)

## State Management

The application uses React's built-in state management:

- **Tasks**: Array of all tasks (master list)
- **Filters**: Current filter state
- **Selected Task**: ID of task in detail view
- **Current View**: Name of active view preset

All state is managed in `App.tsx` and passed down as props.

## Filtering Algorithm

The filtering logic in `App.tsx`:

1. **Area Filter**: Matches if area array is empty OR task area is in array
2. **Type Filter**: Matches if type array is empty OR task type is in array
3. **Energy Filter**: Matches if energy array is empty OR task energy is in array
4. **Location Filter**: Matches if location array is empty OR task location is in array
5. **Urgency Filter**: Matches if undefined OR matches urgency requirement
6. **Date Filter**: Matches based on date scope (Today, ThisWeek, Overdue)

All filters combine with AND logic (all must match).

**Sorting:**
- Incomplete tasks first
- Urgent tasks prioritized
- Newest tasks first (by creation date)

## AI Integration

### Intent Classification

The AI determines user intent:
- **CAPTURE_TASK**: User wants to add a task
- **GENERATE_VIEW**: User wants to see a filtered view

### Task Extraction

When capturing a task, AI extracts:
- Title
- Type (Task, Project, Idea)
- Area (Professional, Personal, Domestic, Social)
- Energy Level (Low, Medium, High)
- Time Estimate
- Location (Home, Office, Computer, Errands)
- Urgency
- Due Date (if mentioned)

### View Generation

When generating a view, AI creates:
- View name (creative, contextual)
- Description (motivational)
- Filter configuration matching user's state

## Data Flow

1. **User Input** → SmartInput component
2. **AI Processing** → Gemini service parses intent
3. **Confirmation UI** → User reviews extracted data
4. **Confirmation** → Task added to state or view applied
5. **Filtering** → Tasks filtered based on current filters
6. **Display** → Filtered tasks rendered in TaskCard components

## Future Enhancements

Potential architectural improvements:
- Backend integration (Convex, Supabase, etc.)
- Persistent storage
- User authentication
- Multi-device sync
- Advanced AI features (suggestions, auto-categorization)
- Saved view presets
- Task dependencies
- Recurring tasks

