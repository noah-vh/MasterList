import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query: Get all tasks
export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("tasks")
      .order("desc")
      .collect();
  },
});

// Query: Get single task by ID
export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Query: Get tasks by status
export const getByStatus = query({
  args: { status: v.union(
    v.literal("Active"),
    v.literal("WaitingOn"),
    v.literal("SomedayMaybe"),
    v.literal("Archived")
  ) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

// Query: Get tasks by date range
export const getByDateRange = query({
  args: {
    start: v.optional(v.string()),
    end: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tasks;
    
    if (args.start) {
      // Use index when start date is provided
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_actionDate", (q) => 
          q.gte("actionDate", args.start!)
        )
        .order("desc")
        .collect();
    } else {
      // Full table scan when no start date
      tasks = await ctx.db
        .query("tasks")
        .order("desc")
        .collect();
    }
    
    // Filter by end date if provided
    if (args.end) {
      const endDate = args.end;
      return tasks.filter(
        (task) => !task.actionDate || task.actionDate <= endDate
      );
    }
    
    return tasks;
  },
});

// Query: Get tasks by tags (contains any of the tags)
export const getByTags = query({
  args: { tags: v.array(v.string()) },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db
      .query("tasks")
      .order("desc")
      .collect();
    
    return allTasks.filter((task) =>
      args.tags.some((tag) => task.tags.includes(tag))
    );
  },
});

// Mutation: Create new task
export const create = mutation({
  args: {
    title: v.string(),
    isCompleted: v.boolean(),
    status: v.union(
      v.literal("Active"),
      v.literal("WaitingOn"),
      v.literal("SomedayMaybe"),
      v.literal("Archived")
    ),
    createdAt: v.number(),
    actionDate: v.optional(v.string()),
    tags: v.array(v.string()),
    timeEstimate: v.optional(v.string()),
    context: v.optional(v.string()),
    participants: v.optional(v.array(v.string())),
    occurredDate: v.optional(v.string()),
    source: v.optional(
      v.object({
        type: v.union(
          v.literal("voice"),
          v.literal("email"),
          v.literal("transcript"),
          v.literal("manual")
        ),
        id: v.optional(v.string()),
      })
    ),
    linkedTasks: v.optional(v.array(v.string())),
    parentTaskId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      isCompleted: args.isCompleted,
      status: args.status,
      createdAt: args.createdAt,
      actionDate: args.actionDate,
      tags: args.tags,
      timeEstimate: args.timeEstimate,
      context: args.context,
      participants: args.participants,
      occurredDate: args.occurredDate,
      source: args.source,
      linkedTasks: args.linkedTasks,
      parentTaskId: args.parentTaskId,
    });
    return taskId;
  },
});

// Mutation: Update existing task
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    isCompleted: v.optional(v.boolean()),
    status: v.optional(v.union(
      v.literal("Active"),
      v.literal("WaitingOn"),
      v.literal("SomedayMaybe"),
      v.literal("Archived")
    )),
    actionDate: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    timeEstimate: v.optional(v.string()),
    context: v.optional(v.string()),
    participants: v.optional(v.array(v.string())),
    occurredDate: v.optional(v.string()),
    source: v.optional(
      v.object({
        type: v.union(
          v.literal("voice"),
          v.literal("email"),
          v.literal("transcript"),
          v.literal("manual")
        ),
        id: v.optional(v.string()),
      })
    ),
    linkedTasks: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Task not found");
    }
    
    await ctx.db.patch(id, updates);
    return id;
  },
});

// Mutation: Toggle task completion
export const toggleComplete = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }
    
    await ctx.db.patch(args.id, {
      isCompleted: !task.isCompleted,
    });
    return args.id;
  },
});

// Mutation: Delete task
export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Mutation: Create parent task with subtasks
export const createWithSubtasks = mutation({
  args: {
    parent: v.object({
      title: v.string(),
      status: v.union(
        v.literal("Active"),
        v.literal("WaitingOn"),
        v.literal("SomedayMaybe"),
        v.literal("Archived")
      ),
      createdAt: v.number(),
      actionDate: v.optional(v.string()),
      tags: v.array(v.string()),
      timeEstimate: v.optional(v.string()),
      context: v.optional(v.string()),
      participants: v.optional(v.array(v.string())),
      occurredDate: v.optional(v.string()),
      source: v.optional(
        v.object({
          type: v.union(
            v.literal("voice"),
            v.literal("email"),
            v.literal("transcript"),
            v.literal("manual")
          ),
          id: v.optional(v.string()),
        })
      ),
    }),
    children: v.array(
      v.object({
        title: v.string(),
        status: v.union(
          v.literal("Active"),
          v.literal("WaitingOn"),
          v.literal("SomedayMaybe"),
          v.literal("Archived")
        ),
        createdAt: v.number(),
        actionDate: v.optional(v.string()),
        tags: v.array(v.string()),
        timeEstimate: v.optional(v.string()),
        context: v.optional(v.string()),
        participants: v.optional(v.array(v.string())),
        occurredDate: v.optional(v.string()),
        source: v.optional(
          v.object({
            type: v.union(
              v.literal("voice"),
              v.literal("email"),
              v.literal("transcript"),
              v.literal("manual")
            ),
            id: v.optional(v.string()),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Create parent task
    const parentId = await ctx.db.insert("tasks", {
      ...args.parent,
      isCompleted: false,
    });

    // Create child tasks with parentTaskId reference
    const childIds = await Promise.all(
      args.children.map((child) =>
        ctx.db.insert("tasks", {
          ...child,
          isCompleted: false,
          parentTaskId: parentId,
        })
      )
    );

    return { parentId, childIds };
  },
});

