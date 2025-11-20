import { action } from "./_generated/server";
import { v } from "convex/values";

// Helper function to normalize task data
function normalizeTaskData(taskData: any, input: string, index: number) {
  // Ensure title exists - if not, use the input as title
  if (!taskData.title || taskData.title.trim() === '') {
    taskData.title = input.trim().substring(0, 200) || 'New Task';
  }
  // Normalize actionDate from dueDate if needed
  if (taskData.dueDate && !taskData.actionDate) {
    taskData.actionDate = taskData.dueDate;
  }
  // Ensure tags is always an array (default to empty if missing)
  if (!taskData.tags || !Array.isArray(taskData.tags)) {
    taskData.tags = [];
  }
  // Normalize source field - handle string values like 'text' -> { type: 'manual' }
  if (taskData.source) {
    if (typeof taskData.source === 'string') {
      const sourceMap: Record<string, 'voice' | 'email' | 'transcript' | 'manual'> = {
        'text': 'manual',
        'voice': 'voice',
        'email': 'email',
        'transcript': 'transcript',
        'manual': 'manual',
      };
      taskData.source = {
        type: sourceMap[taskData.source.toLowerCase()] || 'manual',
      };
    }
  } else {
    // Default source if missing
    taskData.source = { type: 'manual' };
  }
  // Ensure participants is an array
  if (!taskData.participants || !Array.isArray(taskData.participants)) {
    taskData.participants = [];
  }
  // Ensure status has a default
  if (!taskData.status) {
    taskData.status = 'Active';
  }
  return taskData;
}

const SYSTEM_PROMPT = `
You are the 'External Brain' OS - an intelligent task capturer and context manager.
Analyze user input and determine: (A) Add new task(s) to their list, or (B) Generate a filtered view of existing tasks.

CRITICAL: 95% of inputs are tasks to be added. Only use GENERATE_VIEW when user explicitly asks to SEE/FILTER existing tasks.

═══════════════════════════════════════════════════════════════
SCENARIO A: CAPTURE_TASK (DEFAULT FOR MOST INPUTS)
═══════════════════════════════════════════════════════════════

Use this when user describes something to do, remember, or accomplish.
Examples: "Buy milk", "Remind me to call John", "Finish the report", "Project idea: build an app"

TASK EXTRACTION RULES:
━━━━━━━━━━━━━━━━━━━━
1. SINGLE TASK: One action/item → Return in 'taskData' (NOT tasks array)
   ✓ "I need to clean up" → ONE task: "Clean up"
   ✓ "Buy groceries" → ONE task
   ✓ "Finish the report" → ONE task

2. MULTIPLE TASKS: Explicit list of separate items → Return in 'tasks' array
   ✓ "Buy milk, call John, and finish report" → 3 separate tasks
   ✓ "1. Clean kitchen 2. Do laundry 3. Pay bills" → 3 tasks
   ✓ "Schedule dentist, pay bills, update resume" → 3 tasks

3. DO NOT split single tasks into multiple sub-tasks
4. DO NOT create duplicates
5. If unsure → Default to SINGLE task in taskData

═══════════════════════════════════════════════════════════════
TAG SYSTEM: COMPREHENSIVE CLASSIFICATION GUIDE
═══════════════════════════════════════════════════════════════

Select 2-5 tags that accurately describe the task. Combine tags from multiple categories for precision.

┌─────────────────────────────────────────────────────────────┐
│ HEADSPACE TAGS: Mental State Required                      │
└─────────────────────────────────────────────────────────────┘

DeepFocus: Complex cognitive work requiring sustained concentration
  • Coding, debugging, architectural design
  • Writing (reports, proposals, long-form content)
  • Strategic planning, analysis, problem-solving
  • Research, learning new technical skills
  • Financial planning, complex spreadsheets
  Examples: "Debug authentication system", "Write quarterly report", "Design database schema"

Admin: Low cognitive load, routine administrative work
  • Form filling, data entry, filing
  • Scheduling, calendar management
  • Simple emails (confirmations, updates)
  • Organizing files/folders, basic cleanup
  • Paying bills online, simple transactions
  Examples: "Fill out expense report", "Schedule team meeting", "Update contact list"

Creative: Ideation, design, and artistic work
  • Brainstorming, concept development
  • Visual design (graphics, UI/UX)
  • Content creation (videos, presentations)
  • Writing (creative, marketing copy)
  • Planning events, projects
  Examples: "Design new logo", "Brainstorm campaign ideas", "Create presentation deck"

Social: Interpersonal interaction and communication
  • Calls, video meetings, in-person meetings
  • Networking events, coffee chats
  • Collaborative work sessions
  • Relationship building, check-ins
  • Negotiations, difficult conversations
  Examples: "Call John about project", "Weekly team standup", "Coffee with mentor"

┌─────────────────────────────────────────────────────────────┐
│ ENERGY TAGS: Effort & Friction Level                       │
└─────────────────────────────────────────────────────────────┘

QuickWin: Fast, low-friction tasks (< 5 minutes)
  • Single-step actions with immediate completion
  • Quick responses, simple decisions
  • Minimal setup or context switching
  • Low mental load, easy to start
  Examples: "Reply to Sarah's email", "Buy batteries", "Submit timesheet", "Like LinkedIn post"

HeavyLift: High-effort tasks requiring mental preparation
  • Complex, multi-step work
  • High stakes or pressure
  • Requires energy, focus, and stamina
  • Often postponed due to friction
  • May require special setup or conditions
  Examples: "Prepare investor pitch", "Refactor codebase", "Write performance review", "Tax filing"

Braindead: Can do while tired, sick, or low energy
  • Mindless, repetitive tasks
  • No critical decisions required
  • Can be done on autopilot
  • Physical tasks (not mental)
  • Routine maintenance
  Examples: "Sort emails", "Water plants", "Fold laundry", "Archive old files", "Watch tutorial"

┌─────────────────────────────────────────────────────────────┐
│ DURATION TAGS: Time Required                               │
└─────────────────────────────────────────────────────────────┘

Minutes: 5-30 minutes
  Examples: "Quick grocery run", "Send status update", "Review pull request"

Hours: 1-4 hours in one session
  Examples: "Complete tax forms", "Write blog post", "Deep clean kitchen"

Multi-Session: Projects spanning multiple days/weeks
  Examples: "Build new feature", "Learn Spanish", "Renovate office", "Write book"

┌─────────────────────────────────────────────────────────────┐
│ DOMAIN TAGS: Life Areas & Contexts                         │
└─────────────────────────────────────────────────────────────┘

Finance: Money, banking, investments, taxes
  Examples: "Pay credit card bill", "Review budget", "File taxes", "Update investment portfolio"

Health: Medical, fitness, wellness, self-care
  Examples: "Schedule dentist", "Go to gym", "Meal prep", "Take vitamins", "Meditation"

Tech: Technology, software, digital tools, coding
  Examples: "Fix bug in app", "Update dependencies", "Learn React", "Set up server"

People: Relationships, networking, social obligations
  Examples: "Call mom", "Send birthday card", "Network event", "Thank you note"

Growth: Learning, career development, personal improvement
  Examples: "Read industry article", "Practice presentation skills", "Learn SQL", "Get certification"

Work: Professional/career responsibilities
  Examples: "Prepare quarterly report", "Client meeting", "Code review", "Update resume"

Personal: Private life, self-care, hobbies
  Examples: "Journal", "Plan vacation", "Organize photos", "Read for pleasure"

Errand: Outside errands, shopping, pickups
  Examples: "Buy groceries", "Pick up dry cleaning", "Post office", "Return package"

Fun: Entertainment, leisure, enjoyable activities
  Examples: "Game night", "Watch movie", "Plan party", "Try new restaurant"

Offline: Requires physical presence or non-digital action
  Examples: "Grocery shopping", "Doctor appointment", "Home repairs", "Mail package"

═══════════════════════════════════════════════════════════════
TAG COMBINATION PATTERNS (USE THESE AS TEMPLATES)
═══════════════════════════════════════════════════════════════

WORK TASKS:
• Complex project work: ['Work', 'DeepFocus', 'HeavyLift', 'Tech', 'Multi-Session']
• Quick admin: ['Work', 'Admin', 'QuickWin', 'Minutes']
• Meetings: ['Work', 'Social', 'Hours', 'People']
• Email triage: ['Work', 'Admin', 'Braindead', 'Minutes']

PERSONAL/HOME TASKS:
• Quick errands: ['Personal', 'Errand', 'QuickWin', 'Minutes', 'Offline']
• Home projects: ['Personal', 'HeavyLift', 'Hours', 'Offline']
• Household chores: ['Personal', 'Braindead', 'Minutes', 'Offline']

LEARNING/GROWTH:
• Study sessions: ['Growth', 'DeepFocus', 'Hours', 'Tech' OR relevant domain]
• Quick reads: ['Growth', 'QuickWin', 'Minutes']
• Practice skills: ['Growth', 'Creative', 'Hours']

SOCIAL/PEOPLE:
• Quick calls: ['People', 'Social', 'QuickWin', 'Minutes']
• Networking: ['People', 'Social', 'Work', 'Hours']
• Family time: ['People', 'Personal', 'Fun', 'Offline']

HEALTH/WELLNESS:
• Gym workout: ['Health', 'Braindead', 'Hours', 'Offline']
• Medical appt: ['Health', 'Offline', 'Hours', 'Admin']
• Meal prep: ['Health', 'Personal', 'Braindead', 'Hours', 'Offline']

CREATIVE WORK:
• Design projects: ['Creative', 'DeepFocus', 'HeavyLift', 'Hours' OR 'Multi-Session']
• Quick mockups: ['Creative', 'QuickWin', 'Minutes']
• Brainstorming: ['Creative', 'Social' IF with others, 'Minutes' OR 'Hours']

FINANCIAL:
• Pay bills: ['Finance', 'Admin', 'QuickWin', 'Minutes']
• Tax prep: ['Finance', 'Admin', 'HeavyLift', 'Hours']
• Investment research: ['Finance', 'DeepFocus', 'Hours']

═══════════════════════════════════════════════════════════════
ADDITIONAL METADATA EXTRACTION
═══════════════════════════════════════════════════════════════

actionDate (YYYY-MM-DD): When to see/do this task
  • "today" → Calculate today's date
  • "tomorrow" → Calculate tomorrow's date
  • "next Monday", "in 3 days" → Calculate relative date
  • "June 15" → Infer current/next year

occurredDate (YYYY-MM-DD): When this was mentioned (if relevant)

participants: Extract all person names mentioned
  • "Call John" → ["John"]
  • "Meeting with Sarah and Mike" → ["Sarah", "Mike"]

context: Detailed note capturing the full request with more clarity than the title
  • "Need to call John about the Q4 budget proposal" → 
    title: "Call John"
    context: "Need to discuss the Q4 budget proposal with John - get his feedback on the numbers and timeline"
  • "Buy groceries for tonight's dinner" →
    title: "Buy groceries"
    context: "Shopping for tonight's dinner - need ingredients for the meal we planned"
  • "Remind me to follow up with Sarah about the presentation next week" →
    title: "Follow up with Sarah"
    context: "Check in with Sarah about the presentation we're planning for next week - make sure she has everything she needs"
  
  IMPORTANT: The context should:
  - Capture MORE detail than the title, not less
  - Preserve the full intent and any specific details mentioned
  - Include WHY, WHEN, or HOW if mentioned in the input
  - Add clarity that the shortened title doesn't provide
  - Use as many complete sentences as needed to fully reflect the user's message
  - Don't truncate or summarize - capture the full richness of what was said

source: Infer from writing style
  • Conversational/casual → { type: "voice" }
  • Formal/structured → { type: "email" }
  • Default → { type: "manual" }

timeEstimate: If time is mentioned
  • "30 minutes", "2 hours", "all day", etc.

type: Classify scope
  • "Task": Single action item (default)
  • "Project": Multi-step, long-term goal
  • "Idea": Future consideration, not actionable yet

status: Infer from context
  • "Active" (default)
  • "WaitingOn": Blocked by someone/something
  • "SomedayMaybe": Not urgent, aspirational
  • "Archived": Past/completed context

═══════════════════════════════════════════════════════════════
SCENARIO B: GENERATE_VIEW (RARE - ONLY FOR VIEW REQUESTS)
═══════════════════════════════════════════════════════════════

ONLY use when user explicitly asks to SEE/FILTER existing tasks:
  • "Show me quick wins"
  • "What can I do when I'm tired?"
  • "I'm at home, what should I work on?"
  • "What do I have to do today?"
  • "I'm in deep work mode - show me matching tasks"

If user describes NEW items → ALWAYS use CAPTURE_TASK instead.

Generate view with:
  • viewName: Creative emoji + name (e.g., "🧟 Brain Dead Mode", "🚀 Deep Focus Zone")
  • description: Short, motivating phrase
  • filters: tags array matching the mental state/context
    - "Tired" → ['Braindead', 'Admin']
    - "Deep work" → ['DeepFocus', 'HeavyLift']
    - "At home" → ['Offline', 'Personal']
    - "Quick tasks" → ['QuickWin', 'Minutes']
    - "Today" → dateScope: 'Today'

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

Return ONLY valid JSON (no markdown). Ensure all tag names match exactly (case-sensitive).
`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: ["CAPTURE_TASK", "GENERATE_VIEW"],
      description: "Whether the user is adding a task or asking for a specific view.",
    },
    taskData: {
      type: "object",
      nullable: true,
      properties: {
        title: { type: "string" },
        tags: { 
          type: "array", 
          items: { type: "string" },
          description: "Array of tags categorizing the task. Use tags from: DeepFocus, Admin, Creative, Social, QuickWin, HeavyLift, Braindead, Minutes, Hours, Multi-Session, Finance, Health, Tech, People, Growth, Work, Personal, Errand, Fun, Offline. Select 2-5 relevant tags."
        },
        type: { type: "string", enum: ["Task", "Project", "Idea"], nullable: true },
        timeEstimate: { type: "string", nullable: true },
        actionDate: { type: "string", description: "ISO Date YYYY-MM-DD - when to see/do the task", nullable: true },
        occurredDate: { type: "string", description: "When this was mentioned/discussed YYYY-MM-DD", nullable: true },
        participants: { type: "array", items: { type: "string" }, nullable: true },
        context: { type: "string", description: "Detailed note capturing the full request with more clarity and detail than the shortened title. Include WHY, WHEN, HOW, or any specific details mentioned. Use as many sentences as needed to fully reflect what the user said - don't truncate or summarize.", nullable: true },
        source: {
          type: "object",
          nullable: true,
          properties: {
            type: { type: "string", enum: ["voice", "email", "transcript", "manual"] },
            id: { type: "string", nullable: true },
          },
        },
        status: { type: "string", enum: ["Active", "WaitingOn", "SomedayMaybe", "Archived"], nullable: true },
      },
    },
    tasks: {
      type: "array",
      nullable: true,
      description: "Array of multiple tasks if user mentioned multiple items. Each task should have the same structure as taskData.",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          tags: { 
            type: "array", 
            items: { type: "string" },
            description: "Array of tags categorizing the task."
          },
          type: { type: "string", enum: ["Task", "Project", "Idea"], nullable: true },
          timeEstimate: { type: "string", nullable: true },
          actionDate: { type: "string", nullable: true },
          occurredDate: { type: "string", nullable: true },
          participants: { type: "array", items: { type: "string" }, nullable: true },
          context: { type: "string", description: "Detailed note capturing the full request with more clarity and detail than the shortened title. Use as many sentences as needed to fully reflect what the user said.", nullable: true },
          source: {
            type: "object",
            nullable: true,
            properties: {
              type: { type: "string", enum: ["voice", "email", "transcript", "manual"] },
              id: { type: "string", nullable: true },
            },
          },
          status: { type: "string", enum: ["Active", "WaitingOn", "SomedayMaybe", "Archived"], nullable: true },
        },
      },
    },
    viewData: {
      type: "object",
      nullable: true,
      properties: {
        viewName: { type: "string" },
        description: { type: "string" },
        filters: {
          type: "object",
          properties: {
            tags: { type: "array", items: { type: "string" } },
            status: { type: "array", items: { type: "string", enum: ["Active", "WaitingOn", "SomedayMaybe", "Archived"] } },
            dateScope: { type: "string", enum: ["All", "Today", "ThisWeek", "Overdue"] },
            actionDateRange: {
              type: "object",
              nullable: true,
              properties: {
                start: { type: "string" },
                end: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  required: ["intent"],
};

// Test action to verify OpenRouter API key is working
export const testOpenRouterKey = action({
  handler: async (ctx) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "OPENROUTER_API_KEY is not set in Convex environment",
      };
    }

    try {
      // Test 1: List models (basic auth check)
      const modelsResponse = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!modelsResponse.ok) {
        const errorText = await modelsResponse.text();
        return {
          success: false,
          error: `Models endpoint failed (${modelsResponse.status}): ${errorText}`,
          test: "models",
        };
      }

      // Test 2: Simple chat completion (actual usage)
      const chatResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.CONVEX_SITE_URL || "https://master-list.app",
          "X-Title": "Master List Test",
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo", // Use a cheap model for testing
          messages: [
            {
              role: "user",
              content: "Say 'test successful' and nothing else.",
            },
          ],
          max_tokens: 10,
        }),
      });

      if (!chatResponse.ok) {
        const errorText = await chatResponse.text();
        let errorMessage = `Chat endpoint failed (${chatResponse.status})`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        return {
          success: false,
          error: errorMessage,
          test: "chat",
          status: chatResponse.status,
          details: errorText,
        };
      }

      const chatData = await chatResponse.json();
      return {
        success: true,
        message: "API key is fully functional!",
        response: chatData.choices?.[0]?.message?.content,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const parseUserIntent = action({
  args: { input: v.string() },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is missing");
      return {
        error: "OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in your Convex environment.",
        intent: null,
        taskData: null,
        viewData: null,
      };
    }

    // Default to Claude 3.5 Sonnet, but can be overridden via env var
    const model = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.CONVEX_SITE_URL || "",
          "X-Title": "Master List",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: args.input,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `OpenRouter API error (${response.status})`;
        let errorDetails = "";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
          errorDetails = errorJson.error?.code || "";
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error("OpenRouter API error:", response.status, errorText);
        
        // Provide helpful error messages for common issues
        if (response.status === 401 || errorMessage.toLowerCase().includes("user not found")) {
          errorMessage = "OpenRouter API authentication failed. Please check:\n" +
            "1. Your API key is valid (visit https://openrouter.ai/keys)\n" +
            "2. Your account has credits (visit https://openrouter.ai/credits)\n" +
            "3. The key is set correctly: `npx convex env set OPENROUTER_API_KEY your-key`\n" +
            "4. Restart Convex dev server after updating the key";
        } else if (response.status === 402 || errorMessage.toLowerCase().includes("insufficient")) {
          errorMessage = "OpenRouter account has insufficient credits. Please add credits at https://openrouter.ai/credits";
        }
        
        // Return error info so frontend can display it
        return {
          error: errorMessage,
          intent: null,
          taskData: null,
          viewData: null,
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error("No content in OpenRouter response");
        return {
          error: "OpenRouter returned an empty response. Please try again.",
          intent: null,
          taskData: null,
          viewData: null,
        };
      }

      // Parse JSON response
      let parsed;
      try {
        parsed = JSON.parse(content);
        console.log("Raw parsed response:", JSON.stringify(parsed, null, 2));
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", content);
        console.error("Parse error:", parseError);
        return {
          error: "AI returned invalid response format. Please try again.",
          intent: null,
          taskData: null,
          viewData: null,
        };
      }

      // Handle case where response might be wrapped or have different structure
      // Some models return the JSON in a nested structure
      if (parsed.response) {
        parsed = parsed.response;
      }
      if (parsed.data) {
        parsed = parsed.data;
      }

      // Normalize response structure - handle different field names the AI might use
      // Some models use "action" instead of "intent", "task" instead of "taskData", etc.
      if (parsed.action && !parsed.intent) {
        parsed.intent = parsed.action;
      }
      if (parsed.task && !parsed.taskData) {
        parsed.taskData = parsed.task;
      }
      if (parsed.view && !parsed.viewData) {
        parsed.viewData = parsed.view;
      }

      // Infer intent if missing - be very lenient
      if (!parsed.intent) {
        if (parsed.taskData || parsed.task) {
          parsed.intent = "CAPTURE_TASK";
          if (parsed.task && !parsed.taskData) {
            parsed.taskData = parsed.task;
          }
        } else if (parsed.viewData || parsed.view) {
          parsed.intent = "GENERATE_VIEW";
          if (parsed.view && !parsed.viewData) {
            parsed.viewData = parsed.view;
          }
        } else {
          // Default to CAPTURE_TASK if we can't tell
          parsed.intent = "CAPTURE_TASK";
        }
      }

      // Normalize multiple tasks if present - only if there are actually multiple distinct tasks
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        // Filter out duplicates and empty tasks
        const uniqueTasks = parsed.tasks
          .filter((task: any) => task && task.title && task.title.trim() !== '')
          .filter((task: any, index: number, self: any[]) => {
            const title = task.title?.trim().toLowerCase();
            if (!title) return false;
            // Check for duplicates by title (case-insensitive)
            return index === self.findIndex((t: any) => t.title?.trim().toLowerCase() === title);
          });
        
        if (uniqueTasks.length > 1) {
          // Multiple distinct tasks - normalize them
          parsed.tasks = uniqueTasks.map((task: any, index: number) => {
            const normalized = normalizeTaskData(task, args.input, index);
            // Ensure title exists for each task
            if (!normalized.title || normalized.title.trim() === '') {
              normalized.title = `Task ${index + 1}`;
            }
            return normalized;
          });
        } else if (uniqueTasks.length === 1) {
          // Only one task in array - convert to single taskData
          parsed.taskData = normalizeTaskData(uniqueTasks[0], args.input, 0);
          parsed.tasks = null;
        } else {
          // No valid tasks - clear tasks array
          parsed.tasks = null;
        }
      }

      // Normalize taskData if present - be very lenient, just ensure structure
      if (parsed.taskData) {
        parsed.taskData = normalizeTaskData(parsed.taskData, args.input, 0);
      }

      // Normalize viewData filters if present
      if (parsed.viewData?.filters) {
        if (!parsed.viewData.filters.tags || !Array.isArray(parsed.viewData.filters.tags)) {
          parsed.viewData.filters.tags = [];
        }
        if (!parsed.viewData.filters.status || !Array.isArray(parsed.viewData.filters.status)) {
          parsed.viewData.filters.status = [];
        }
        if (!parsed.viewData.filters.dateScope) {
          parsed.viewData.filters.dateScope = 'All';
        }
      }

      // Ensure tasks array is included in response if present
      const normalizedResponse: any = {
        intent: parsed.intent,
        taskData: parsed.taskData || null,
        tasks: parsed.tasks || null,
        viewData: parsed.viewData || null,
      };
      
      console.log("Normalized AI response:", normalizedResponse);
      return normalizedResponse;
    } catch (error) {
      console.error("Error parsing intent with OpenRouter:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return {
        error: `Failed to process request: ${errorMessage}`,
        intent: null,
        taskData: null,
        viewData: null,
      };
    }
  },
});

