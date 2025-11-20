# Views & Filters System

## Overview

The Master List uses a powerful filtering system that allows you to create dynamic "views" of your tasks. Instead of navigating between separate lists, you filter one master list to see exactly what's relevant to your current context.

## Core Concept: One List, Infinite Views

**Key Principle:** All tasks live in a single master list. You never navigate between pages. Instead, you activate filters to instantly show only what's relevant.

## Filter Architecture

### Filter Categories

#### 1. Area (Life Domains)
- **Professional**: Career, business, freelance work
- **Personal**: Health, hobbies, self-development, admin
- **Domestic**: Housework, chores, home maintenance
- **Social**: Friends, family, events, relationships

#### 2. Type (Nature of Item)
- **Task**: Single action step
- **Project**: Multi-step goal
- **Idea**: Non-actionable reference

#### 3. Energy Level
- **Low**: Easy tasks, minimal focus
- **Medium**: Normal focus required
- **High**: Deep work, complex tasks

#### 4. Location Context
- **Home**: Tasks done at home
- **Office**: Work location tasks
- **Computer**: Any computer-based task
- **Errands**: Tasks requiring leaving home

#### 5. Date Scope
- **All**: No date filtering
- **Today**: Due today
- **This Week**: Due within 7 days
- **Overdue**: Past due date

#### 6. Urgency
- **Toggle**: Show only urgent tasks

## Filter Logic

### Within Category: OR Logic

Selecting multiple filters within the same category shows items matching ANY of them.

**Example:**
- Area: Professional + Personal
- Result: Shows all professional tasks OR all personal tasks

### Across Categories: AND Logic

Filters from different categories combine with AND logic - all must match.

**Example:**
- Area: Professional
- Energy: High
- Location: Computer
- Result: Shows only professional tasks that require high energy AND are done on computer

### Visual Example

```
Active Filters:
- Area: [Professional, Personal]
- Energy: [High]
- Location: [Computer]

Result: Tasks that are:
  (Professional OR Personal) 
  AND 
  High Energy 
  AND 
  Computer Location
```

## Predefined Views

### Executive Mode (Daily Dashboard)

**Purpose:** Morning command center - your "must-do" list

**Filters:**
- Date Scope: Today
- OR Urgency: Enabled

**When to Use:**
- First thing in the morning
- Need to see critical tasks
- Planning your day

**Example Query:**
"Show me what I need to do today"

---

### Brain Dead Mode (Low Energy)

**Purpose:** Easy wins when you're exhausted

**Filters:**
- Energy: Low
- Location: Home

**When to Use:**
- After work
- Feeling tired
- Want to stay productive without mental strain

**Example Query:**
"I'm tired" or "Brain dead mode"

---

### Deep Work Mode

**Purpose:** Focus on your most important professional work

**Filters:**
- Area: Professional
- Energy: High

**When to Use:**
- Peak focus hours (usually morning)
- Need to tackle complex work
- Eliminate distractions

**Example Query:**
"Deep work mode" or "Focus time"

---

### Errand Runner

**Purpose:** All tasks requiring leaving the house

**Filters:**
- Location: Errands

**When to Use:**
- Before leaving home
- Planning errands
- Need to batch out-of-home tasks

**Example Query:**
"Errands" or "What do I need to do out?"

---

### The Incubator (Ideas)

**Purpose:** Keep your action list clean while preserving creative sparks

**Filters:**
- Type: Idea

**When to Use:**
- Reviewing creative thoughts
- Planning future projects
- Separating actionable from aspirational

**Example Query:**
"Show me my ideas"

---

### Weekend Chores

**Purpose:** Home maintenance and domestic tasks

**Filters:**
- Area: Domestic
- Location: Home

**When to Use:**
- Weekend planning
- Home maintenance sessions
- Batch domestic work

**Example Query:**
"Weekend chores" or "Housework"

---

### Quick Wins

**Purpose:** Tasks you can complete quickly

**Filters:**
- Time Estimate: 5 min (or similar)
- Energy: Low or Medium

**When to Use:**
- Need momentum
- Short time windows
- Between larger tasks

**Example Query:**
"Quick wins" or "5 minute tasks"

## Creating Custom Views

### Method 1: Natural Language (AI-Generated)

Describe your state or need, and AI generates appropriate filters:

**Examples:**
- "I'm at the office and have high energy"
- "What can I do from home when I'm tired?"
- "Show me urgent professional tasks"
- "Weekend personal projects"

**AI Process:**
1. Analyzes your input
2. Determines intent (view generation)
3. Creates filter configuration
4. Generates creative view name
5. Provides motivational description

### Method 2: Manual Filter Selection

1. Use Filter Bar to select desired filters
2. Filters apply immediately
3. No need to "save" - active until changed

**Tips:**
- Start broad, then narrow
- Combine 2-3 categories for best results
- Experiment with different combinations

## View Management

### Active View Indicator

When a view is active:
- View name displayed in Filter Bar
- "Clear View" button appears
- Filters are locked to view configuration

### Clearing Views

- Click "Clear View" button
- Returns to unfiltered master list
- All filters reset

### Switching Views

- Generate new view (replaces current)
- Or manually adjust filters
- Previous view configuration is lost (not saved)

## Filter Combinations Guide

### High Productivity Combinations

**Morning Power Hour:**
- Area: Professional
- Energy: High
- Date: Today
- Urgency: Enabled

**Afternoon Focus:**
- Area: Professional
- Energy: Medium or High
- Location: Computer or Office

**Evening Maintenance:**
- Energy: Low
- Location: Home
- Type: Task (not Project)

### Context-Specific Combinations

**At Home, Low Energy:**
- Location: Home
- Energy: Low
- Time: 5 min or 30 min

**At Office, High Energy:**
- Location: Office
- Energy: High
- Area: Professional

**On Computer, Any Energy:**
- Location: Computer
- (No energy filter = all levels)

**Errands Batch:**
- Location: Errands
- (No other filters = see everything)

### Time-Based Combinations

**Today's Priorities:**
- Date: Today
- Urgency: Enabled

**This Week's Goals:**
- Date: This Week
- Type: Project

**Overdue Items:**
- Date: Overdue
- (Shows what needs immediate attention)

## Advanced Filtering Strategies

### Progressive Filtering

Start broad, then narrow:
1. Filter by Area first
2. Add Energy level
3. Add Location if needed
4. Add Date if time-sensitive

### Batch Processing

Use filters to batch similar work:
- All "Computer" tasks together
- All "Errands" in one trip
- All "Low Energy" when tired

### Context Matching

Match filters to your current situation:
- Where you are (Location)
- How you feel (Energy)
- What you're working on (Area)
- When it's due (Date)

## Filter Performance

### Best Practices

1. **Use 2-3 filters max** for best results
2. **Start with Area** - most impactful filter
3. **Add Energy** - matches your state
4. **Add Location** - matches your context
5. **Use Date sparingly** - only when needed

### Common Mistakes

- Too many filters (over-filtering)
- Conflicting filters (e.g., High Energy + Low Energy)
- Forgetting to clear filters
- Not using AI-generated views

## View Examples

### Example 1: Monday Morning

**Query:** "What do I need to do this week for work?"

**Generated View:**
- Name: "🚀 Week Ahead: Professional"
- Filters: Area: Professional, Date: This Week
- Description: "Tackle your professional goals for the week ahead"

### Example 2: Friday Evening

**Query:** "I'm exhausted, what can I do at home?"

**Generated View:**
- Name: "🧟 Brain Dead Mode"
- Filters: Energy: Low, Location: Home
- Description: "Easy wins for when you're running on empty"

### Example 3: Saturday Planning

**Query:** "Weekend housework"

**Generated View:**
- Name: "🏠 Weekend Chores"
- Filters: Area: Domestic, Location: Home
- Description: "Keep your space clean and organized"

## Tips for Effective Filtering

1. **Let AI help** - Use natural language for views
2. **Match your context** - Filter by where you are and how you feel
3. **Batch similar work** - Group by location or energy
4. **Clear regularly** - Don't leave filters active unnecessarily
5. **Experiment** - Try different combinations
6. **Use views for common states** - Save mental energy
7. **Combine 2-3 filters** - More specific = more useful
8. **Review unfiltered** - Periodically see everything

## Future Enhancements

Planned improvements to the filtering system:
- Saved view presets
- View templates
- Filter history
- Smart filter suggestions
- Filter analytics
- Custom filter categories
- Filter sharing

