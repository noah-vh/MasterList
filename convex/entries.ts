import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getCurrentUserId, getCurrentUserIdOrNull, userIdMatches } from "./authHelpers";

// Query: Get storage URL for an image
export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Query: Get all entries, chronological (oldest first, newest last)
export const list = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserIdOrNull(ctx, args.token ?? null);
    if (!userId) {
      return [];
    }
    // Get all entries and filter by userId (handles both string and ID types)
    const allEntries = await ctx.db
      .query("entries")
      .withIndex("by_createdAt")
      .order("asc") // Oldest first for chat-like display
      .collect();
    
    // Filter entries that belong to this user
    const filtered = allEntries.filter(entry => userIdMatches(entry.userId, userId));
    
    // Debug logging (remove in production)
    if (allEntries.length > 0 && filtered.length !== allEntries.length) {
      console.log(`[entries.list] Filtered ${allEntries.length} entries to ${filtered.length} for userId: ${userId}`);
      console.log(`[entries.list] Sample entry userIds:`, allEntries.slice(0, 3).map(e => ({
        entryId: e._id,
        userId: e.userId,
        userIdType: typeof e.userId,
        matches: userIdMatches(e.userId, userId)
      })));
    }
    
    return filtered;
  },
});

// Query: Get entries by date range
export const getByDateRange = query({
  args: {
    start: v.number(),
    end: v.number(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserIdOrNull(ctx, args.token ?? null);
    if (!userId) {
      return [];
    }
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_createdAt", (q) => 
        q.gte("createdAt", args.start).lte("createdAt", args.end)
      )
      .order("desc")
      .collect();
    // Filter by userId (no composite index, so filter in memory)
    return entries.filter(entry => userIdMatches(entry.userId, userId));
  },
});

// Mutation: Create new manual entry
export const create = mutation({
  args: {
    content: v.string(),
    linkedTaskIds: v.optional(v.array(v.id("tasks"))),
    tags: v.optional(v.array(v.string())),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    // userId is already a string from getCurrentUserId
    const now = Date.now();
    return await ctx.db.insert("entries", {
      userId: userId as any,
      content: args.content,
      createdAt: now,
      updatedAt: now,
      entryType: "manual",
      linkedTaskIds: args.linkedTaskIds,
      tags: args.tags,
    });
  },
});

// Mutation: Create automatic activity log entry
export const createActivityLog = mutation({
  args: {
    activityType: v.union(
      v.literal("task_created"),
      v.literal("task_completed"),
      v.literal("task_uncompleted")
    ),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    // Get the task to generate content
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    
    // Use the task's userId for the activity log, convert to string
    const taskUserId = task.userId;
    if (!taskUserId) {
      throw new Error("Task has no userId");
    }
    // Convert to string - handle both string and Id<"users"> types
    const userIdString = typeof taskUserId === "string" ? taskUserId : (taskUserId as { toString(): string }).toString();

    // Generate content based on activity type
    let content = "";
    if (args.activityType === "task_created") {
      content = `Task created: ${task.title}`;
    } else if (args.activityType === "task_completed") {
      content = `Task completed: ${task.title}`;
    } else if (args.activityType === "task_uncompleted") {
      content = `Task uncompleted: ${task.title}`;
    }

    const now = Date.now();
    return await ctx.db.insert("entries", {
      userId: userIdString as any,
      content,
      createdAt: now,
      updatedAt: now,
      entryType: "activity",
      activityType: args.activityType,
      linkedTaskId: args.taskId,
    });
  },
});

// Mutation: Update entry content (for auto-save)
export const update = mutation({
  args: {
    id: v.id("entries"),
    content: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const entry = await ctx.db.get(args.id);
    if (!entry) {
      throw new Error("Entry not found");
    }
    
    // Ensure user owns this entry
    if (!userIdMatches(entry.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.patch(args.id, {
      content: args.content,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// Mutation: Update content entry classification
export const updateContentEntry = mutation({
  args: {
    id: v.id("entries"),
    classification: v.object({
      category: v.string(),
      topics: v.array(v.string()),
      keyPoints: v.array(v.string()),
      lessons: v.array(v.string()),
    }),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const entry = await ctx.db.get(args.id);
    if (!entry) {
      throw new Error("Entry not found");
    }
    
    // Ensure user owns this entry
    if (!userIdMatches(entry.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.patch(args.id, {
      classification: args.classification,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// Mutation: Delete entry
export const deleteEntry = mutation({
  args: { id: v.id("entries"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const entry = await ctx.db.get(args.id);
    if (!entry) {
      throw new Error("Entry not found");
    }
    
    // Ensure user owns this entry
    if (!userIdMatches(entry.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Mutation: Generate upload URL for images
export const generateImageUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Mutation: Create chat entry
export const createChatEntry = mutation({
  args: {
    chatThread: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
    })),
    content: v.string(), // Summary or first message
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    // userId is already a string from getCurrentUserId
    const now = Date.now();
    return await ctx.db.insert("entries", {
      userId: userId as any,
      content: args.content,
      createdAt: now,
      updatedAt: now,
      entryType: "content",
      contentType: "chat",
      chatThread: args.chatThread,
    });
  },
});

// Mutation: Update chat entry thread
export const updateChatEntry = mutation({
  args: {
    id: v.id("entries"),
    chatThread: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
    })),
    content: v.optional(v.string()), // Optional updated summary
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const entry = await ctx.db.get(args.id);
    if (!entry) {
      throw new Error("Entry not found");
    }
    
    // Ensure user owns this entry
    if (!userIdMatches(entry.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    const updateData: any = {
      chatThread: args.chatThread,
      updatedAt: Date.now(),
    };
    if (args.content) {
      updateData.content = args.content;
    }
    await ctx.db.patch(args.id, updateData);
    return args.id;
  },
});

// Mutation: Create content log entry (analyzed content)
export const createContentEntry = mutation({
  args: {
    contentType: v.union(
      v.literal("link"),
      v.literal("image"),
      v.literal("text"),
      v.literal("video"),
      v.literal("chat")
    ),
    sourceUrl: v.optional(v.string()),
    sourceImageId: v.optional(v.id("_storage")),
    content: v.string(), // Original content or URL
    analyzedContent: v.string(), // AI-analyzed summary
    classification: v.object({
      category: v.string(),
      topics: v.array(v.string()),
      keyPoints: v.array(v.string()),
      lessons: v.array(v.string()),
    }),
    tags: v.array(v.string()),
    title: v.string(),
    ogMetadata: v.optional(v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      siteName: v.optional(v.string()),
    })),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    // userId is already a string from getCurrentUserId
    const now = Date.now();
    return await ctx.db.insert("entries", {
      userId: userId as any,
      content: args.content,
      createdAt: now,
      updatedAt: now,
      entryType: "content",
      contentType: args.contentType,
      sourceUrl: args.sourceUrl,
      sourceImageId: args.sourceImageId,
      analyzedContent: args.analyzedContent,
      classification: args.classification,
      tags: args.tags,
      ogMetadata: args.ogMetadata,
    });
  },
});

// Action: Save image content (uploads image, analyzes it, creates entry)
export const saveImageContent = action({
  args: {
    storageId: v.id("_storage"),
    originalInput: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    // Get the image URL from storage
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      throw new Error("Failed to get image URL from storage");
    }

    // Fetch the image and convert to base64 for analysis
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Analyze the image using the analyzeContent action
    const analysis: {
      summary: string;
      classification: {
        category: string;
        topics: string[];
        keyPoints: string[];
        lessons: string[];
      };
      tags: string[];
      title: string;
    } = await ctx.runAction(api.ai.analyzeContent, {
      contentType: "image",
      content: base64,
      originalInput: args.originalInput,
    });

    // Create the content entry
    const entryId = await ctx.runMutation(api.entries.createContentEntry, {
      contentType: "image",
      sourceImageId: args.storageId,
      content: args.originalInput || "Image",
      analyzedContent: analysis.summary,
      classification: analysis.classification,
      tags: analysis.tags,
      title: analysis.title,
    });

    return entryId;
  },
});

