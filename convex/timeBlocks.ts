import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId, getCurrentUserIdOrNull, userIdMatches } from "./authHelpers";

// Template Queries
export const listTemplates = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserIdOrNull(ctx, args.token ?? null);
    if (!userId) {
      return [];
    }
    const allTemplates = await ctx.db
      .query("timeBlockTemplates")
      .order("desc")
      .collect();
    
    return allTemplates.filter(template => userIdMatches(template.userId, userId));
  },
});

export const getDefaultTemplate = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserIdOrNull(ctx, args.token ?? null);
    if (!userId) {
      return null;
    }
    const allTemplates = await ctx.db
      .query("timeBlockTemplates")
      .collect();
    
    const templates = allTemplates.filter(template => userIdMatches(template.userId, userId));
    
    const defaultTemplate = templates.find(t => t.isDefault);
    if (defaultTemplate) return defaultTemplate;
    
    // If no default, return first template or null
    return templates.length > 0 ? templates[0] : null;
  },
});

// Template Mutations
export const createTemplate = mutation({
  args: { name: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const allTemplates = await ctx.db
      .query("timeBlockTemplates")
      .collect();
    
    const existingTemplates = allTemplates.filter(template => userIdMatches(template.userId, userId));
    
    // If this is the first template, make it default
    const isDefault = existingTemplates.length === 0;
    
    // userId is already a string from getCurrentUserId
    const templateId = await ctx.db.insert("timeBlockTemplates", {
      userId: userId as any,
      name: args.name,
      createdAt: Date.now(),
      isDefault,
    });
    
    return templateId;
  },
});

export const updateTemplate = mutation({
  args: {
    id: v.id("timeBlockTemplates"),
    name: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Template not found");
    }
    
    // Ensure user owns this template
    if (!userIdMatches(existing.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.patch(args.id, {
      name: args.name,
    });
    
    return args.id;
  },
});

export const deleteTemplate = mutation({
  args: { id: v.id("timeBlockTemplates"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const template = await ctx.db.get(args.id);
    if (!template) {
      throw new Error("Template not found");
    }
    
    // Ensure user owns this template
    if (!userIdMatches(template.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    // Delete all blocks in this template
    const blocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_templateId", (q) => q.eq("templateId", args.id))
      .collect();
    
    for (const block of blocks) {
      await ctx.db.delete(block._id);
    }
    
    // If deleting default template, make another one default
    if (template.isDefault) {
      const allTemplates = await ctx.db
        .query("timeBlockTemplates")
        .collect();
      
      const remainingTemplates = allTemplates.filter(template => userIdMatches(template.userId, userId));
      
      const otherTemplates = remainingTemplates.filter(t => t._id !== args.id);
      if (otherTemplates.length > 0) {
        await ctx.db.patch(otherTemplates[0]._id, { isDefault: true });
      }
    }
    
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Time Block Queries
export const list = query({
  args: { templateId: v.id("timeBlockTemplates"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserIdOrNull(ctx, args.token ?? null);
    if (!userId) {
      return [];
    }
    // Verify the template belongs to the user
    const template = await ctx.db.get(args.templateId);
    if (!template || !userIdMatches(template.userId, userId)) {
      throw new Error("Template not found or unauthorized");
    }
    
    return await ctx.db
      .query("timeBlocks")
      .withIndex("by_templateId_startTime", (q) => 
        q.eq("templateId", args.templateId)
      )
      .collect();
  },
});

// Time Block Mutations
export const create = mutation({
  args: {
    templateId: v.id("timeBlockTemplates"),
    startTime: v.number(),
    endTime: v.number(),
    title: v.optional(v.string()),
    color: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    // Verify the template belongs to the user
    const template = await ctx.db.get(args.templateId);
    if (!template || !userIdMatches(template.userId, userId)) {
      throw new Error("Template not found or unauthorized");
    }
    
    // Validate times
    if (args.startTime < 0 || args.startTime >= 1440) {
      throw new Error("Invalid startTime");
    }
    if (args.endTime <= args.startTime || args.endTime > 1440) {
      throw new Error("Invalid endTime");
    }
    
    // userId is already a string from getCurrentUserId
    const blockId = await ctx.db.insert("timeBlocks", {
      userId: userId as any,
      templateId: args.templateId,
      startTime: args.startTime,
      endTime: args.endTime,
      title: args.title,
      color: args.color,
      createdAt: Date.now(),
    });
    
    return blockId;
  },
});

export const update = mutation({
  args: {
    id: v.id("timeBlocks"),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    title: v.optional(v.string()),
    color: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Time block not found");
    }
    
    // Ensure user owns this time block
    if (!userIdMatches(existing.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    const startTime = args.startTime ?? existing.startTime;
    const endTime = args.endTime ?? existing.endTime;
    
    // Validate times
    if (startTime < 0 || startTime >= 1440) {
      throw new Error("Invalid startTime");
    }
    if (endTime <= startTime || endTime > 1440) {
      throw new Error("Invalid endTime");
    }
    
    await ctx.db.patch(args.id, {
      startTime,
      endTime,
      title: args.title,
      color: args.color,
    });
    
    return args.id;
  },
});

export const deleteBlock = mutation({
  args: { id: v.id("timeBlocks"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const block = await ctx.db.get(args.id);
    if (!block) {
      throw new Error("Time block not found");
    }
    
    // Ensure user owns this time block
    if (!userIdMatches(block.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const resize = mutation({
  args: {
    id: v.id("timeBlocks"),
    startTime: v.number(),
    endTime: v.number(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Time block not found");
    }
    
    // Ensure user owns this time block
    if (!userIdMatches(existing.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    // Validate times
    if (args.startTime < 0 || args.startTime >= 1440) {
      throw new Error("Invalid startTime");
    }
    if (args.endTime <= args.startTime || args.endTime > 1440) {
      throw new Error("Invalid endTime");
    }
    
    await ctx.db.patch(args.id, {
      startTime: args.startTime,
      endTime: args.endTime,
    });
    
    return args.id;
  },
});

