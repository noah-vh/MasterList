# Components Documentation

## Component Overview

Master List uses a component-based architecture with clear separation of concerns. Each component has a specific responsibility and communicates through props and callbacks.

## Component Hierarchy

```
App
├── Header
├── FilterBar
├── TaskCard[] (mapped from filtered tasks)
├── SmartInput
└── TaskDetailView (conditional modal)
```

## Component Details

### App.tsx

**Location:** `/App.tsx`

**Purpose:** Main application orchestrator

**Props:** None (root component)

**State:**
- `tasks: Task[]` - Master list of all tasks
- `filters: FilterState` - Current filter configuration
- `currentViewName: string | undefined` - Active view name
- `selectedTaskId: string | null` - Task ID for detail view

**Key Methods:**
- `filteredTasks` - Computed filtered and sorted task list
- `handleToggleTask` - Toggle task completion
- `handleAddTask` - Add new task to list
- `handleApplyView` - Apply generated view filters
- `handleClearView` - Clear all filters
- `handleTaskClick` - Open task detail view
- `handleUpdateTask` - Update existing task
- `handleDeleteTask` - Remove task from list

**Dependencies:**
- FilterBar
- TaskCard
- SmartInput
- TaskDetailView

---

### FilterBar

**Location:** `/components/FilterBar.tsx`

**Purpose:** Filter control interface

**Props:**
```typescript
interface FilterBarProps {
  activeFilters: FilterState;
  setFilters: (filters: FilterState) => void;
  currentViewName?: string;
  onClearView: () => void;
}
```

**Features:**
- Toggle filters by category (Area, Type, Energy, Location)
- Date scope selector (All, Today, ThisWeek, Overdue)
- Urgency toggle
- Active filter indicators
- Clear all filters button
- Current view name display

**Filter Categories:**
- **Area**: Professional, Personal, Domestic, Social
- **Type**: Task, Project, Idea
- **Energy**: Low, Medium, High
- **Location**: Home, Office, Computer, Errands
- **Date Scope**: All, Today, ThisWeek, Overdue
- **Urgency**: Boolean toggle

**UI Elements:**
- Filter chips/buttons for each category
- Active state highlighting
- Clear view button (when view is active)

---

### SmartInput

**Location:** `/components/SmartInput.tsx`

**Purpose:** AI-powered natural language input

**Props:**
```typescript
interface SmartInputProps {
  onAddTask: (data: ExtractedTaskData) => void;
  onApplyView: (data: GeneratedViewData) => void;
}
```

**State:**
- `input: string` - User input text
- `isProcessing: boolean` - AI processing state
- `aiResponse: AIResponse | null` - AI response data
- `editableTaskData: ExtractedTaskData | null` - Editable task data

**Features:**
- Natural language input
- AI intent classification
- Task extraction confirmation UI
- View generation confirmation UI
- Manual field editing before confirmation
- Processing indicator
- Fixed bottom position

**User Flow:**
1. User types natural language
2. Submits (Enter or button click)
3. AI processes input
4. Confirmation UI appears
5. User reviews/edits extracted data
6. User confirms or cancels
7. Task added or view applied

**Confirmation UI:**
- **Task Capture**: Shows editable fields (title, area, energy, location, time)
- **View Generation**: Shows view name, description, and active filters

**Dependencies:**
- `geminiService.parseUserIntent()`

---

### TaskCard

**Location:** `/components/TaskCard.tsx`

**Purpose:** Individual task display

**Props:**
```typescript
interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onClick: (id: string) => void;
}
```

**Features:**
- Task title display
- Completion checkbox
- Metadata badges (area, energy, location, time)
- Visual indicators (color-coded by area/energy)
- Click to open detail view
- Completed state styling

**Visual Elements:**
- Area badge (color-coded)
- Energy badge (color-coded)
- Location badge
- Time estimate badge
- Urgency indicator
- Completion checkbox

**Styling:**
- Completed tasks: Faded/strikethrough
- Active tasks: Full opacity
- Hover effects for interactivity

---

### TaskDetailView

**Location:** `/components/TaskDetailView.tsx`

**Purpose:** Task detail modal

**Props:**
```typescript
interface TaskDetailViewProps {
  task: Task;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
}
```

**Features:**
- Full task information display
- Editable fields
- Update task functionality
- Delete task functionality
- Close modal
- Modal overlay

**Editable Fields:**
- Title
- Type
- Area
- Energy Level
- Location
- Time Estimate
- Due Date
- Urgency

**Actions:**
- Save changes
- Delete task
- Close modal

---

### Badge

**Location:** `/components/Badge.tsx`

**Purpose:** Reusable badge component for metadata display

**Props:**
```typescript
interface BadgeProps {
  label: string;
  colorClass: string;
}
```

**Usage:**
Used throughout the app to display:
- Area tags
- Energy levels
- Location contexts
- Time estimates

**Styling:**
- Color-coded by category
- Consistent sizing
- Rounded corners
- Text styling

---

## Component Communication

### Data Flow

1. **User Input** → SmartInput
2. **AI Processing** → Gemini Service
3. **Task Creation** → App state update
4. **Filter Change** → FilterBar → App state update
5. **Task Display** → App → TaskCard
6. **Task Detail** → TaskCard click → TaskDetailView

### Callback Pattern

All child components communicate with parent through callbacks:
- `onAddTask` - Add new task
- `onApplyView` - Apply view filters
- `onToggle` - Toggle completion
- `onClick` - Open detail view
- `onUpdate` - Update task
- `onDelete` - Delete task
- `onClose` - Close modal

## Styling Approach

All components use Tailwind CSS for styling:
- Utility-first classes
- Consistent color scheme
- Responsive design
- Mobile-first approach
- Custom color mappings in `constants.ts`

## Component Patterns

### Controlled Components
All form inputs are controlled components with React state.

### Conditional Rendering
- TaskDetailView only renders when task is selected
- Confirmation UI only shows when AI response exists
- Empty state when no tasks match filters

### Memoization
- `filteredTasks` uses `useMemo` for performance
- Prevents unnecessary re-renders

## Accessibility Considerations

- Semantic HTML elements
- Keyboard navigation support
- Focus management
- ARIA labels (can be enhanced)
- Screen reader friendly structure

## Future Component Enhancements

- Search component
- Bulk operations component
- View preset manager
- Settings component
- Keyboard shortcuts handler
- Drag-and-drop reordering
- Task grouping/collapsing

