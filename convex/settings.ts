import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getCurrentUserId, getCurrentUserIdOrNull, userIdMatches } from "./authHelpers";

// Model information with pricing
export interface ModelInfo {
  id: string;
  name: string;
  pricing?: string; // e.g., "$0.003/1M tokens" or "Free"
  category?: "premium" | "standard" | "budget" | "free";
}

// Helper to get default model for each function type
export function getDefaultModel(functionType: "taskClassification" | "chat" | "chatTitle" | "contentAnalysisText" | "contentAnalysisImage"): string {
  switch (functionType) {
    case "taskClassification":
    case "chat":
    case "chatTitle":
    case "contentAnalysisText":
      return "anthropic/claude-3.5-sonnet";
    case "contentAnalysisImage":
      return "google/gemini-pro-vision";
  }
}

// Helper to get list of available models for dropdowns with pricing info
export function getAvailableModels(): ModelInfo[] {
  return [
    // Premium models
    { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", pricing: "$15/1M tokens", category: "premium" },
    { id: "openai/gpt-4", name: "GPT-4", pricing: "$30/1M tokens", category: "premium" },
    { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", pricing: "$10/1M tokens", category: "premium" },
    
    // Standard models
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", pricing: "$3/1M tokens", category: "standard" },
    { id: "google/gemini-pro", name: "Gemini Pro", pricing: "$0.50/1M tokens", category: "standard" },
    { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo", pricing: "$0.50/1M tokens", category: "standard" },
    
    // Budget models
    { id: "google/gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Experimental)", pricing: "$0.075/1M tokens", category: "budget" },
    { id: "google/gemini-1.5-flash", name: "Gemini 1.5 Flash", pricing: "$0.075/1M tokens", category: "budget" },
    { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", pricing: "$0.25/1M tokens", category: "budget" },
    { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", pricing: "$0.59/1M tokens", category: "budget" },
    { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B", pricing: "$0.11/1M tokens", category: "budget" },
    { id: "mistralai/mistral-large", name: "Mistral Large", pricing: "$8/1M tokens", category: "budget" },
    { id: "mistralai/mixtral-8x7b-instruct", name: "Mixtral 8x7B", pricing: "$0.27/1M tokens", category: "budget" },
    
    // Vision models
    { id: "google/gemini-pro-vision", name: "Gemini Pro Vision", pricing: "$0.25/1M tokens", category: "standard" },
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash Vision (Free)", pricing: "Free", category: "free" },
    
    // Free/OSS models
    { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B (Free)", pricing: "Free", category: "free" },
    { id: "google/gemma-2-27b-it:free", name: "Gemma 2 27B (Free)", pricing: "Free", category: "free" },
    { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B (Free)", pricing: "Free", category: "free" },
    { id: "meta-llama/llama-3.2-3b-instruct:free", name: "Llama 3.2 3B (Free)", pricing: "Free", category: "free" },
    { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B (Free)", pricing: "Free", category: "free" },
    { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)", pricing: "Free", category: "free" },
    { id: "qwen/qwen-2.5-7b-instruct:free", name: "Qwen 2.5 7B (Free)", pricing: "Free", category: "free" },
    { id: "microsoft/phi-3-medium-4k-instruct:free", name: "Phi-3 Medium (Free)", pricing: "Free", category: "free" },
  ];
}

// Query: Get user settings
export const getUserSettings = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserIdOrNull(ctx, args.token ?? null);
    if (!userId) {
      return null;
    }
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    
    return settings || null;
  },
});

// Query: Get available models for UI
export const getAvailableModelsQuery = query({
  handler: async () => {
    return getAvailableModels();
  },
});

// Mutation: Update user settings
export const updateUserSettings = mutation({
  args: {
    openRouterApiKey: v.optional(v.string()),
    modelTaskClassification: v.optional(v.string()),
    modelChat: v.optional(v.string()),
    modelChatTitle: v.optional(v.string()),
    modelContentAnalysisText: v.optional(v.string()),
    modelContentAnalysisImage: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    
    // Find existing settings - get all and filter by userId (handles both string and ID types)
    const allSettings = await ctx.db
      .query("userSettings")
      .collect();
    const existing = allSettings.find(setting => userIdMatches(setting.userId, userId));
    
    const now = Date.now();
    const updates: any = {
      updatedAt: now,
    };
    
    // Only update provided fields
    if (args.openRouterApiKey !== undefined) {
      updates.openRouterApiKey = args.openRouterApiKey;
    }
    if (args.modelTaskClassification !== undefined) {
      updates.modelTaskClassification = args.modelTaskClassification;
    }
    if (args.modelChat !== undefined) {
      updates.modelChat = args.modelChat;
    }
    if (args.modelChatTitle !== undefined) {
      updates.modelChatTitle = args.modelChatTitle;
    }
    if (args.modelContentAnalysisText !== undefined) {
      updates.modelContentAnalysisText = args.modelContentAnalysisText;
    }
    if (args.modelContentAnalysisImage !== undefined) {
      updates.modelContentAnalysisImage = args.modelContentAnalysisImage;
    }
    
    if (existing) {
      // Update existing settings
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      // Create new settings - userId is already a string from getCurrentUserId
      const newSettings = {
        userId: userId as any,
        createdAt: now,
        ...updates,
      };
      return await ctx.db.insert("userSettings", newSettings);
    }
  },
});

// Internal query to get user settings (called from actions)
// Note: This is called from actions, so we need to get userId from the action context
// We'll need to pass userId as an argument or get it from the action context
export const internalGetUserSettings = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    return settings;
  },
});

// Helper function to get user's API key (with fallback to env var)
// This must be called from an action context
export async function getUserApiKey(ctx: { runQuery: (query: any, ...args: any[]) => Promise<any>; auth?: any }): Promise<string | null> {
  // Get userId from action context
  const { getAuthUserId } = await import("@convex-dev/auth/server");
  const userId = await getAuthUserId(ctx as any);
  
  if (!userId) {
    // Fallback to environment variable if not authenticated
    return process.env.OPENROUTER_API_KEY || null;
  }
  
  const settings = await ctx.runQuery(internal.settings.internalGetUserSettings, { userId });
  
  if (settings?.openRouterApiKey) {
    return settings.openRouterApiKey;
  }
  
  // Fallback to environment variable
  return process.env.OPENROUTER_API_KEY || null;
}

// Helper function to get model for a specific function (with fallback to env var or default)
// This must be called from an action context
export async function getUserModel(
  ctx: { runQuery: (query: any, ...args: any[]) => Promise<any>; auth?: any },
  functionType: "taskClassification" | "chat" | "chatTitle" | "contentAnalysisText" | "contentAnalysisImage"
): Promise<string> {
  // Get userId from action context
  const { getAuthUserId } = await import("@convex-dev/auth/server");
  const userId = await getAuthUserId(ctx as any);
  
  let settings = null;
  if (userId) {
    settings = await ctx.runQuery(internal.settings.internalGetUserSettings, { userId });
  }
  
  let model: string | undefined;
  
  if (settings) {
    switch (functionType) {
      case "taskClassification":
        model = settings.modelTaskClassification;
        break;
      case "chat":
        model = settings.modelChat;
        break;
      case "chatTitle":
        model = settings.modelChatTitle;
        break;
      case "contentAnalysisText":
        model = settings.modelContentAnalysisText;
        break;
      case "contentAnalysisImage":
        model = settings.modelContentAnalysisImage;
        break;
    }
  }
  
  if (model) {
    return model;
  }
  
  // Fallback to environment variable
  if (process.env.OPENROUTER_MODEL) {
    return process.env.OPENROUTER_MODEL;
  }
  
  // Fallback to default
  return getDefaultModel(functionType);
}

