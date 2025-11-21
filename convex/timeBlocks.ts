import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Template Queries
export const listTemplates = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("timeBlockTemplates")
      .withIndex("by_createdAt")
      .collect();
  },
});

export const getDefaultTemplate = query({
  handler: async (ctx) => {
    const templates = await ctx.db
      .query("timeBlockTemplates")
      .collect();
    
    const defaultTemplate = templates.find(t => t.isDefault);
    if (defaultTemplate) return defaultTemplate;
    
    // If no default, return first template or null
    return templates.length > 0 ? templates[0] : null;
  },
});

// Template Mutations
export const createTemplate = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const existingTemplates = await ctx.db
      .query("timeBlockTemplates")
      .collect();
    
    // If this is the first template, make it default
    const isDefault = existingTemplates.length === 0;
    
    const templateId = await ctx.db.insert("timeBlockTemplates", {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Template not found");
    }
    
    await ctx.db.patch(args.id, {
      name: args.name,
    });
    
    return args.id;
  },
});

export const deleteTemplate = mutation({
  args: { id: v.id("timeBlockTemplates") },
  handler: async (ctx, args) => {
    // Delete all blocks in this template
    const blocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_templateId", (q) => q.eq("templateId", args.id))
      .collect();
    
    for (const block of blocks) {
      await ctx.db.delete(block._id);
    }
    
    // If deleting default template, make another one default
    const template = await ctx.db.get(args.id);
    if (template?.isDefault) {
      const remainingTemplates = await ctx.db
        .query("timeBlockTemplates")
        .collect();
      
      if (remainingTemplates.length > 1) {
        const newDefault = remainingTemplates.find(t => t._id !== args.id);
        if (newDefault) {
          await ctx.db.patch(newDefault._id, { isDefault: true });
        }
      }
    }
    
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Time Block Queries
export const list = query({
  args: { templateId: v.id("timeBlockTemplates") },
  handler: async (ctx, args) => {
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
  },
  handler: async (ctx, args) => {
    // Validate times
    if (args.startTime < 0 || args.startTime >= 1440) {
      throw new Error("Invalid startTime");
    }
    if (args.endTime <= args.startTime || args.endTime > 1440) {
      throw new Error("Invalid endTime");
    }
    
    const blockId = await ctx.db.insert("timeBlocks", {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Time block not found");
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
  args: { id: v.id("timeBlocks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const resize = mutation({
  args: {
    id: v.id("timeBlocks"),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Time block not found");
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

