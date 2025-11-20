import { action } from "./_generated/server";
import { v } from "convex/values";

const SYSTEM_PROMPT = `
You are the 'External Brain' OS. You function as both a task capturer and a context manager.
Analyze the user's input and determine if they are trying to (A) Add a new item to their list, or (B) Change their current view/context based on how they feel.

SCENARIO A: CAPTURE_TASK
If the user input implies an action to be done later (e.g., "Buy milk", "Remind me to...", "Project idea: X"), extract the task metadata.
- Infer Area (Professional, Personal, Domestic, Social)
- Infer Energy (Low, Medium, High)
- Infer Location (Home, Office, Computer, Errands)
- Infer Due Date if mentioned (Format YYYY-MM-DD). If "today" or "tomorrow" is used, calculate the date relative to now.

Also extract enhanced metadata:
- occurredDate: When this was mentioned/discussed (if mentioned, format YYYY-MM-DD)
- participants: Array of people names if mentioned in the input
- context: Any background information, reasons, or additional notes
- source: Infer from input style ('voice' for conversational, 'email' for formal, etc.)

SCENARIO B: GENERATE_VIEW
If the user input describes a feeling, a timeframe, or a mode of work (e.g., "I'm tired", "Deep work mode", "What should I do at home?", "Weekend vibes"), generate a Filter View.
- Create a creative 'viewName' (e.g., "🧟 Brain Dead Mode", "🚀 Deep Focus", "🏠 Housekeeping").
- Create a short 'description' encouraging the user.
- Construct a 'filters' object that matches that state.
  - E.g., "Tired" -> energy: ['Low']
  - E.g., "Work" -> area: ['Professional'], location: ['Office', 'Computer']
  - E.g., "What do I have to do today?" -> dateScope: 'Today'

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
        type: { type: "string", enum: ["Task", "Project", "Idea"] },
        area: { type: "string", enum: ["Professional", "Personal", "Domestic", "Social"] },
        energy: { type: "string", enum: ["Low", "Medium", "High"] },
        timeEstimate: { type: "string" },
        location: { type: "string", enum: ["Home", "Office", "Computer", "Errands"] },
        isUrgent: { type: "boolean" },
        dueDate: { type: "string", description: "ISO Date YYYY-MM-DD" },
        actionDate: { type: "string", description: "ISO Date YYYY-MM-DD (preferred over dueDate)" },
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
        tags: { type: "array", items: { type: "string" }, nullable: true },
        status: { type: "string", enum: ["Active", "WaitingOn", "SomedayMaybe", "Archived"], nullable: true },
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

export const parseUserIntent = action({
  args: { input: v.string() },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is missing");
      return null;
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
        console.error("OpenRouter API error:", response.status, errorText);
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error("No content in OpenRouter response");
        return null;
      }

      // Parse JSON response
      const parsed = JSON.parse(content);

      // Normalize actionDate from dueDate if needed
      if (parsed.taskData?.dueDate && !parsed.taskData?.actionDate) {
        parsed.taskData.actionDate = parsed.taskData.dueDate;
      }

      return parsed;
    } catch (error) {
      console.error("Error parsing intent with OpenRouter:", error);
      return null;
    }
  },
});

