import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getCurrentUserId, getCurrentUserIdOrNull, userIdMatches } from "./authHelpers";

// Query: Get all tasks for current user
export const list = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserIdOrNull(ctx, args.token ?? null);
    if (!userId) {
      return [];
    }
    // Get all tasks and filter by userId (handles both string and ID types)
    const allTasks = await ctx.db
      .query("tasks")
      .order("desc")
      .collect();
    
    // Filter tasks that belong to this user
    const filtered = allTasks.filter(task => userIdMatches(task.userId, userId));
    
    // Debug logging (remove in production)
    if (allTasks.length > 0 && filtered.length !== allTasks.length) {
      console.log(`[tasks.list] Filtered ${allTasks.length} tasks to ${filtered.length} for userId: ${userId}`);
      console.log(`[tasks.list] Sample task userIds:`, allTasks.slice(0, 3).map(t => ({
        taskId: t._id,
        userId: t.userId,
        userIdType: typeof t.userId,
        matches: userIdMatches(t.userId, userId)
      })));
    }
    
    return filtered;
  },
});

// Query: Get single task by ID
export const get = query({
  args: { id: v.id("tasks"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const task = await ctx.db.get(args.id);
    if (!task) {
      return null;
    }
    // Ensure user owns this task
    if (!userIdMatches(task.userId, userId)) {
      throw new Error("Unauthorized");
    }
    return task;
  },
});

// Query: Get tasks by status
export const getByStatus = query({
  args: { 
    status: v.union(
      v.literal("Active"),
      v.literal("WaitingOn"),
      v.literal("SomedayMaybe"),
      v.literal("Archived")
    ),
    token: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
    // Filter by userId (no index for status+userId, so filter in memory)
    return tasks.filter(task => userIdMatches(task.userId, userId));
  },
});

// Query: Get tasks by date range
export const getByDateRange = query({
  args: {
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
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
      // Fetch all tasks when no start date (will filter by userId below)
      tasks = await ctx.db
        .query("tasks")
        .order("desc")
        .collect();
    }
    
    // Filter by userId and end date
    let filtered = tasks.filter(task => userIdMatches(task.userId, userId));
    
    if (args.end) {
      const endDate = args.end;
      filtered = filtered.filter(
        (task) => !task.actionDate || task.actionDate <= endDate
      );
    }
    
    return filtered;
  },
});

// Query: Get tasks by tags (contains any of the tags)
export const getByTags = query({
  args: { tags: v.array(v.string()), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    // Get all tasks and filter by userId (handles both string and ID types)
    const allTasks = await ctx.db
      .query("tasks")
      .order("desc")
      .collect();
    
    // Filter by userId first
    const userTasks = allTasks.filter(task => userIdMatches(task.userId, userId));
    
    // Then filter by tags
    return userTasks.filter((task) =>
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
    priority: v.optional(v.union(
      v.literal("Urgent"),
      v.literal("High"),
      v.literal("Medium"),
      v.literal("Low")
    )),
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
    isRoutine: v.optional(v.boolean()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    // userId is already a string from getCurrentUserId
    const taskId = await ctx.db.insert("tasks", {
      userId: userId as any,
      title: args.title,
      isCompleted: args.isCompleted,
      status: args.status,
      priority: args.priority,
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
      isRoutine: args.isRoutine,
    });
    
    // Auto-log task creation in entries
    await ctx.runMutation(api.entries.createActivityLog, {
      activityType: "task_created",
      taskId,
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
    priority: v.optional(v.union(
      v.literal("Urgent"),
      v.literal("High"),
      v.literal("Medium"),
      v.literal("Low")
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
    isRoutine: v.optional(v.boolean()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const { id, token, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Task not found");
    }
    
    // Ensure user owns this task
    if (!userIdMatches(existing.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    // If isRoutine is being set to false, delete the routine record
    if (updates.isRoutine === false && existing.isRoutine === true) {
      const { internal } = await import("./_generated/api");
      const routine = await ctx.db
        .query("routines")
        .withIndex("by_taskId", (q) => q.eq("taskId", id))
        .first();
      if (routine) {
        await ctx.db.delete(routine._id);
      }
    }
    
    await ctx.db.patch(id, updates);
    return id;
  },
});

// Mutation: Toggle task completion
export const toggleComplete = mutation({
  args: { id: v.id("tasks"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }
    
    // Ensure user owns this task
    if (!userIdMatches(task.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    const newIsCompleted = !task.isCompleted;
    await ctx.db.patch(args.id, {
      isCompleted: newIsCompleted,
    });
    
    // Auto-log task completion/uncompletion in entries
    await ctx.runMutation(api.entries.createActivityLog, {
      activityType: newIsCompleted ? "task_completed" : "task_uncompleted",
      taskId: args.id,
    });
    
    return args.id;
  },
});

// Mutation: Delete task
export const deleteTask = mutation({
  args: { id: v.id("tasks"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }
    
    // Ensure user owns this task
    if (!userIdMatches(task.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Mutation: Toggle today status (add/remove from today's list)
export const toggleTodayStatus = mutation({
  args: { id: v.id("tasks"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }
    
    // Ensure user owns this task
    if (!userIdMatches(task.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Normalize task.actionDate to YYYY-MM-DD format for comparison
    const taskDateStr = task.actionDate 
      ? (task.actionDate.includes('T') ? task.actionDate.split('T')[0] : task.actionDate)
      : null;
    
    // If task has actionDate = today, clear it (remove from today)
    // Otherwise, set actionDate to today (add to today)
    const newActionDate = taskDateStr === todayStr ? undefined : todayStr;
    
    console.log('Mutation: toggleTodayStatus', {
      taskId: args.id,
      currentActionDate: task.actionDate,
      taskDateStr,
      todayStr,
      newActionDate
    });
    
    await ctx.db.patch(args.id, {
      actionDate: newActionDate,
    });
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
      isRoutine: v.optional(v.boolean()),
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
        isRoutine: v.optional(v.boolean()),
      })
    ),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    // userId is already a string from getCurrentUserId, but ensure consistency
    const userIdString = userId;
    
    // Create parent task
    const parentId = await ctx.db.insert("tasks", {
      userId: userIdString as any,
      ...args.parent,
      isCompleted: false,
    });

    // Create child tasks with parentTaskId reference
    const childIds = await Promise.all(
      args.children.map((child) =>
        ctx.db.insert("tasks", {
          userId: userIdString as any,
          ...child,
          isCompleted: false,
          parentTaskId: parentId,
        })
      )
    );

    return { parentId, childIds };
  },
});

