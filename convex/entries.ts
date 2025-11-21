import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Query: Get storage URL for an image
export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Query: Get all entries, chronological (oldest first, newest last)
export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("entries")
      .withIndex("by_createdAt")
      .order("asc") // Oldest first for chat-like display
      .collect();
  },
});

// Query: Get entries by date range
export const getByDateRange = query({
  args: {
    start: v.number(),
    end: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("entries")
      .withIndex("by_createdAt", (q) => 
        q.gte("createdAt", args.start).lte("createdAt", args.end)
      )
      .order("desc")
      .collect();
  },
});

// Mutation: Create new manual entry
export const create = mutation({
  args: {
    content: v.string(),
    linkedTaskIds: v.optional(v.array(v.id("tasks"))),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("entries", {
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
  },
  handler: async (ctx, args) => {
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      classification: args.classification,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// Mutation: Delete entry
export const deleteEntry = mutation({
  args: { id: v.id("entries") },
  handler: async (ctx, args) => {
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("entries", {
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
  },
  handler: async (ctx, args) => {
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("entries", {
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

