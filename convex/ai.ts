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
You are the 'External Brain' OS. You function as both a task capturer and a context manager.
Analyze the user's input and determine if they are trying to (A) Add a new item to their list, or (B) Change their current view/context based on how they feel.

CRITICAL: Most user inputs are tasks to be added. Only use GENERATE_VIEW when the user explicitly asks about their current state, feelings, or wants to filter/see existing tasks.

SCENARIO A: CAPTURE_TASK (USE THIS FOR MOST INPUTS)
If the user input describes something to do, remember, or accomplish (e.g., "Buy milk", "Remind me to call John", "I need to finish the report", "Project idea: build an app", "Schedule dentist appointment"), this is ALWAYS a task capture.

CRITICAL RULES FOR TASK EXTRACTION:
1. SINGLE TASK: If the user mentions ONE thing to do (even if they use words like "clean up", "organize", "work on X"), return it as a SINGLE task in taskData (NOT in tasks array).
   - Examples: "I need to clean up" → ONE task with title "Clean up"
   - Examples: "Buy groceries" → ONE task
   - Examples: "Finish the report" → ONE task

2. MULTIPLE TASKS: Only use the tasks array if the user explicitly lists MULTIPLE distinct, separate tasks:
   - Examples: "Buy milk, call John, and finish the report" → 3 tasks in tasks array
   - Examples: "1. Clean kitchen 2. Do laundry 3. Pay bills" → 3 tasks in tasks array
   - Examples: "I need to: schedule dentist, pay bills, update resume" → 3 tasks in tasks array

3. DO NOT split single tasks into multiple tasks. "Clean up" is ONE task, not multiple tasks.
4. DO NOT create duplicates. If the user says something once, create one task.
5. If unsure, default to a SINGLE task in taskData.

TAG SYSTEM - Use tags to classify tasks. Available tags are organized into categories:

HEADSPACE tags (mental state required):
- DeepFocus: Coding, writing, complex strategy work
- Admin: Forms, emails, logistics - low brain power
- Creative: Brainstorming, designing
- Social: Networking, calling, meeting

ENERGY tags (effort/friction level):
- QuickWin: Takes < 5 mins, low friction
- HeavyLift: Requires mental preparation and stamina
- Braindead: Can do while tired/sick

DURATION tags:
- Minutes: Quick tasks
- Hours: Longer tasks
- Multi-Session: Projects spanning multiple sessions

DOMAIN tags:
- Finance, Health, Tech, People, Growth, Work, Personal, Errand, Fun, Offline

TAG MAPPING GUIDELINES:
- Professional/Work context -> ['Work'] + domain tags (Tech, Finance, etc.)
- Personal context -> ['Personal'] + domain tags
- Domestic/Home tasks -> ['Personal', 'Errand'] + 'Offline'
- Social tasks -> ['People', 'Social']
- Low energy/tired -> ['Braindead', 'Admin']
- Medium energy -> ['QuickWin']
- High energy/complex -> ['HeavyLift', 'DeepFocus']
- Home location -> ['Offline']
- Office location -> ['Work', 'Offline']
- Computer/online -> ['Tech'] (if tech-related)
- Errands -> ['Errand', 'Offline']
- Projects -> ['Multi-Session']
- Ideas -> ['Creative']
- Quick tasks (< 5 min) -> ['Minutes', 'QuickWin']
- Longer tasks -> ['Hours']
- Infer duration from time estimate if mentioned

Select 2-5 relevant tags that best describe the task. Be specific and use multiple tags when appropriate.

Also extract:
- actionDate: When to see/do the task (Format YYYY-MM-DD). If "today" or "tomorrow" is mentioned, calculate relative to now.
- occurredDate: When this was mentioned/discussed (if mentioned, format YYYY-MM-DD)
- participants: Array of people names if mentioned
- context: Any background information, reasons, or additional notes
- source: Infer from input style ('voice' for conversational, 'email' for formal, etc.)
- timeEstimate: Estimated time if mentioned (e.g., "30 minutes", "2 hours")
- type: "Task", "Project", or "Idea" based on scope
- status: "Active" (default), "WaitingOn", "SomedayMaybe", or "Archived"

SCENARIO B: GENERATE_VIEW (ONLY USE WHEN USER ASKS TO SEE/FILTER EXISTING TASKS)
ONLY use this when the user explicitly wants to:
- See existing tasks filtered by a state/feeling (e.g., "Show me what I can do when I'm tired", "What should I do at home?", "I'm in deep work mode - what tasks match?")
- Filter their current view based on feelings (e.g., "I'm tired", "Weekend vibes", "Show me quick wins")
- Ask about their current state (e.g., "What do I have to do today?")

If the user is describing something NEW to add/remember, it's ALWAYS CAPTURE_TASK, not GENERATE_VIEW.
- Create a creative 'viewName' (e.g., "🧟 Brain Dead Mode", "🚀 Deep Focus", "🏠 Housekeeping").
- Create a short 'description' encouraging the user.
- Construct a 'filters' object with tags array that matches that state.
  - E.g., "Tired" -> tags: ['Braindead', 'Admin']
  - E.g., "Deep work" -> tags: ['DeepFocus', 'HeavyLift']
  - E.g., "Work tasks" -> tags: ['Work']
  - E.g., "What do I have to do today?" -> dateScope: 'Today'
  - E.g., "Home tasks" -> tags: ['Offline', 'Errand', 'Personal']

Return JSON matching the Schema. You must return valid JSON only, no markdown formatting.
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
        context: { type: "string", description: "Additional context/notes", nullable: true },
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
          context: { type: "string", nullable: true },
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

