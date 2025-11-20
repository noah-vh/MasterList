import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, ConversationMessage, TaskStatus } from "../types";

const apiKey = process.env.API_KEY;

export const parseUserIntent = async (
  input: string,
  conversationHistory?: ConversationMessage[]
): Promise<AIResponse | null> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Build conversation context if provided
    // For Google GenAI, we need to format conversation history properly
    let contents: any = input;
    if (conversationHistory && conversationHistory.length > 0) {
      // Build conversation history as array of content objects
      const historyParts = conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
      contents = [...historyParts, { role: 'user', parts: [{ text: input }] }];
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: `
          You are the 'External Brain' OS. You function as both a task capturer and a context manager.
          Analyze the user's input and determine if they are trying to (A) Add a new item to their list, (B) Change their current view/context based on how they feel, or (C) Plan a bigger project/idea that needs to be broken down.

          TAG SYSTEM:
          Use the following tag categories when suggesting tags:
          
          Headspace (Mode): DeepFocus, Admin, Creative, Social
          Energy/Friction: QuickWin, HeavyLift, Braindead
          Duration: Minutes, Hours, Multi-Session
          Domains: Finance, Health, Tech, People, Growth, Work, Personal, Errand, Fun, Offline
          
          You can also suggest custom domain tags if they make sense (e.g., "Dinner" for a social dinner task).
          Map natural language to tags:
          - "coding", "writing", "complex" → DeepFocus
          - "forms", "emails", "logistics" → Admin
          - "brainstorming", "designing" → Creative
          - "networking", "calling", "meeting" → Social
          - "quick", "< 5 mins" → QuickWin
          - "complex", "requires focus" → HeavyLift
          - "easy", "while tired" → Braindead
          - "work", "business" → Work
          - "home", "personal" → Personal
          - "tech", "computer" → Tech
          - "people", "social" → People or Social

          SCENARIO A: CAPTURE_TASK
          If the user input implies a single, simple action to be done later (e.g., "Buy milk", "Remind me to...", "Call dentist"), extract the task metadata.
          - Suggest 3-5 relevant tags from the categories above based on the task description
          - Set status to 'Active' by default
          - Infer actionDate if mentioned (Format YYYY-MM-DD). If "today" or "tomorrow" is used, calculate the date relative to now.
          - Extract enhanced metadata: occurredDate, participants, context, source

          SCENARIO B: GENERATE_VIEW
          If the user input describes a feeling, a timeframe, or a mode of work (e.g., "I'm tired", "Deep work mode", "What should I do at home?", "Weekend vibes"), generate a Filter View.
          - Create a creative 'viewName' (e.g., "🧟 Brain Dead Mode", "🚀 Deep Focus", "🏠 Housekeeping").
          - Create a short 'description' encouraging the user.
          - Construct a 'filters' object with appropriate tags and status filters.
          - Map feelings to tags: "tired" → ['Braindead', 'QuickWin'], "high energy" → ['DeepFocus', 'HeavyLift'], etc.

          SCENARIO C: PLAN_PROJECT
          If the user mentions a bigger idea, project, or goal that clearly needs multiple steps (e.g., "I want to launch a website", "Plan a birthday party", "Redesign my apartment"), engage in planning mode.
          
          In planning mode:
          1. If this is the first message about the project, ask clarifying questions to understand scope, timeline, priorities, and constraints.
          2. If conversation history exists, continue the dialogue to gather more information.
          3. Once you have enough information, propose a breakdown with:
             - A parent task (the main project/goal)
             - Multiple child tasks (the actionable steps)
             - A summary explaining the breakdown
          
          For the breakdown:
          - Parent task should have tags like ['Multi-Session'] and relevant context tags (Work, Personal, etc.)
          - Child tasks should be specific, actionable steps
          - Each task should have appropriate tags from the tag system, status='Active', and actionDate if relevant
          - Set needsClarification=true if you need more info, false when proposing breakdown

          ${conversationHistory && conversationHistory.length > 0 
            ? `\nCONVERSATION CONTEXT:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUse this context to continue the conversation.`
            : ''
          }

          Return JSON matching the Schema.
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: { 
              type: Type.STRING, 
              enum: ['CAPTURE_TASK', 'GENERATE_VIEW', 'PLAN_PROJECT'],
              description: "Whether the user is adding a task, asking for a view, or planning a project."
            },
            taskData: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                title: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of relevant tags" },
                status: { type: Type.STRING, enum: ['Active', 'WaitingOn', 'SomedayMaybe', 'Archived'] },
                actionDate: { type: Type.STRING, description: "ISO Date YYYY-MM-DD", nullable: true },
                timeEstimate: { type: Type.STRING, nullable: true },
                occurredDate: { type: Type.STRING, description: "When this was mentioned/discussed YYYY-MM-DD", nullable: true },
                participants: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                context: { type: Type.STRING, description: "Additional context/notes", nullable: true },
                source: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    type: { type: Type.STRING, enum: ['voice', 'email', 'transcript', 'manual'] },
                    id: { type: Type.STRING, nullable: true }
                  }
                }
              },
            },
            viewData: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                viewName: { type: Type.STRING },
                description: { type: Type.STRING },
                filters: {
                  type: Type.OBJECT,
                  properties: {
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    status: { type: Type.ARRAY, items: { type: Type.STRING, enum: ['Active', 'WaitingOn', 'SomedayMaybe', 'Archived'] } },
                    dateScope: { type: Type.STRING, enum: ['All', 'Today', 'ThisWeek', 'Overdue'] },
                    actionDateRange: {
                      type: Type.OBJECT,
                      nullable: true,
                      properties: {
                        start: { type: Type.STRING },
                        end: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            },
            projectBreakdown: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                parentTask: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    status: { type: Type.STRING, enum: ['Active', 'WaitingOn', 'SomedayMaybe', 'Archived'] },
                    actionDate: { type: Type.STRING, nullable: true },
                    timeEstimate: { type: Type.STRING, nullable: true },
                    context: { type: Type.STRING, nullable: true }
                  }
                },
                childTasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                      status: { type: Type.STRING, enum: ['Active', 'WaitingOn', 'SomedayMaybe', 'Archived'] },
                      actionDate: { type: Type.STRING, nullable: true },
                      timeEstimate: { type: Type.STRING, nullable: true },
                      context: { type: Type.STRING, nullable: true }
                    }
                  }
                },
                summary: { type: Type.STRING, nullable: true }
              }
            },
            conversationMessage: {
              type: Type.STRING,
              nullable: true,
              description: "AI's conversational response in planning mode"
            },
            needsClarification: {
              type: Type.BOOLEAN,
              nullable: true,
              description: "Whether AI needs more information before proposing breakdown"
            }
          },
          required: ['intent'],
        },
      },
    });

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text) as AIResponse;
  } catch (error) {
    console.error("Error parsing intent with Gemini:", error);
    return null;
  }
};