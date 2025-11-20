# Usage Guide

## Getting Started

### First Launch

1. **Set up your API key**: Create a `.env` file with your Gemini API key
2. **Start the app**: Run `npm run dev`
3. **Add your first task**: Type something like "Buy groceries" in the input field

### Understanding the Interface

The Master List interface consists of:

- **Header**: App title and notification/search icons
- **Filter Bar**: Controls for filtering your tasks
- **Task List**: Your filtered master list of tasks
- **Smart Input**: AI-powered input at the bottom

## Basic Operations

### Adding a Task

**Method 1: Natural Language (Recommended)**

Simply type what you want to do:
- "Buy milk"
- "Fix the kitchen sink"
- "Email client about proposal"
- "Book idea: AI productivity app"

The AI will automatically:
- Extract the task title
- Determine the area (Professional, Personal, Domestic, Social)
- Estimate energy level required
- Identify location context
- Estimate time needed

**Method 2: Manual Entry**

After AI extraction, you can edit any field before confirming:
- Click on any field in the confirmation UI
- Modify the values
- Click "Add to List" when satisfied

### Completing a Task

- Click the checkbox next to any task
- Completed tasks fade out and move to bottom
- They remain in the list but are visually distinct

### Viewing Task Details

- Click on any task card
- Modal opens with full task information
- Edit any field
- Save changes or delete the task

### Editing a Task

1. Click on the task to open detail view
2. Modify any field
3. Click "Save" or press Enter
4. Changes are immediately reflected

### Deleting a Task

1. Open task detail view
2. Click "Delete" button
3. Confirm deletion
4. Task is permanently removed

## Using Filters

### Understanding Filter Logic

**Within a Category (OR Logic):**
- Selecting "Professional" AND "Personal" shows tasks in EITHER area

**Across Categories (AND Logic):**
- Selecting "Professional" + "High Energy" shows only professional tasks that require high energy

### Filter Categories

#### Area Filters
- **Professional**: Work, career, business tasks
- **Personal**: Health, hobbies, self-development
- **Domestic**: Housework, chores, maintenance
- **Social**: Friends, family, events

#### Type Filters
- **Task**: Single action items
- **Project**: Multi-step goals
- **Idea**: Non-actionable items (books, concepts, etc.)

#### Energy Filters
- **Low**: Easy tasks for when you're tired
- **Medium**: Normal focus required
- **High**: Deep work, complex tasks

#### Location Filters
- **Home**: Tasks done at home
- **Office**: Work location tasks
- **Computer**: Any computer-based task
- **Errands**: Tasks requiring leaving the house

#### Date Filters
- **All**: No date filter
- **Today**: Due today
- **This Week**: Due within 7 days
- **Overdue**: Past due date

#### Urgency Toggle
- Shows only urgent tasks when enabled

### Clearing Filters

- Click "Clear View" button (when a view is active)
- Or manually deselect all filters

## Creating Views

### Using Natural Language

Instead of manually setting filters, describe your state:

**Examples:**
- "I'm tired" → Brain Dead Mode (Low Energy + Home)
- "Deep work mode" → Professional + High Energy
- "What do I need to do today?" → Today's tasks
- "Weekend chores" → Domestic + Home
- "Errands" → Location: Errands

The AI generates a view with:
- Creative name
- Motivational description
- Appropriate filters

### Manual View Creation

1. Set desired filters using Filter Bar
2. Filters are immediately applied
3. No need to "save" - filters persist until changed

## Common Workflows

### Morning Routine

1. Open app
2. Say "What do I need to do today?"
3. Review Executive Mode view
4. Start with highest priority tasks

### Low Energy Mode

1. Type "I'm tired" or "Brain dead mode"
2. See only low-energy, home-based tasks
3. Pick easy wins to stay productive

### Deep Work Session

1. Type "Deep work mode" or "Focus time"
2. See only high-energy professional tasks
3. Eliminate distractions, focus on important work

### Errand Planning

1. Type "Errands" or filter by Location: Errands
2. See all tasks requiring leaving home
3. Plan efficient route
4. Check off as you complete

### Weekly Review

1. Clear all filters
2. Review all tasks
3. Update metadata as needed
4. Add any missing tasks
5. Archive completed items

## Tips for Effective Use

### Capture Everything

- Don't filter yourself during capture
- Throw everything into the system
- Let AI handle initial categorization
- Refine later if needed

### Use Natural Language

- The AI understands context
- Be conversational: "I need to..." works
- Include time references: "tomorrow", "next week"
- Mention urgency: "urgent", "asap", "important"

### Regular Reviews

- Weekly review to maintain system
- Update metadata as tasks evolve
- Archive completed tasks periodically
- Refine areas/types to match your life

### Leverage Views

- Create views for common states
- Switch views based on context
- Don't manually filter every time
- Let AI generate contextual views

### Metadata Matters

- Accurate metadata = better filtering
- Update energy/time estimates as you learn
- Be honest about energy requirements
- Location tags help with batching

## Keyboard Shortcuts

(Currently not implemented, but planned)
- `Enter` - Submit input
- `Esc` - Close modal/clear input
- `/` - Focus input
- `j/k` - Navigate tasks
- `Space` - Toggle completion

## Mobile Usage

- Swipe gestures for quick actions (planned)
- Touch-optimized interface
- Floating action button for quick capture
- Collapsible filter bar

## Troubleshooting

### AI Not Extracting Correctly

- Be more specific in your input
- Manually edit fields after extraction
- The system learns from your corrections

### Too Many Tasks Showing

- Apply more specific filters
- Use view generation for context
- Clear completed tasks periodically

### Can't Find a Task

- Clear all filters
- Check if task is completed (at bottom)
- Use search (when implemented)

### Filters Not Working

- Ensure at least one filter is active
- Check filter logic (AND vs OR)
- Clear and reapply filters

## Best Practices

1. **Capture immediately** - Don't wait to process
2. **Trust the AI** - It's usually right, but verify
3. **Review regularly** - Keep system current
4. **Use views** - Don't manually filter constantly
5. **Be specific** - Better input = better extraction
6. **Update metadata** - Keep it accurate
7. **Batch similar tasks** - Use location/energy filters
8. **Respect your energy** - Match tasks to your state

## Advanced Usage

### Task Lifecycle Management

1. **Capture**: Quick input, no thinking
2. **Process**: AI extracts, you verify
3. **Organize**: Add missing metadata
4. **Execute**: Filter by context, complete
5. **Review**: Weekly cleanup and refinement

### Context Switching

- Morning: Executive Mode (high priority)
- Afternoon: Deep Work (professional, high energy)
- Evening: Brain Dead (low energy, home)
- Weekend: Domestic + Personal views

### Project Management

- Mark multi-step goals as "Project"
- Break down into individual tasks
- Filter by project type when planning
- Track progress through completion

## Getting Help

- Check component documentation for technical details
- Review architecture docs for system understanding
- See concepts guide for philosophy and design
- Check views & filters guide for advanced filtering

