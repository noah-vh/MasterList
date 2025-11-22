import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId, getCurrentUserIdOrNull, userIdMatches } from "./authHelpers";

// Helper function to get today's date as ISO string (YYYY-MM-DD)
function getTodayISO(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Helper function to get yesterday's date as ISO string
function getYesterdayISO(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// Helper function to calculate streak from completion history
function calculateStreak(completionHistory: string[]): { current: number; longest: number } {
  if (!completionHistory || completionHistory.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Sort dates in descending order
  const sortedDates = [...completionHistory].sort((a, b) => b.localeCompare(a));
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  
  // Calculate current streak (consecutive days from most recent)
  const today = getTodayISO();
  const yesterday = getYesterdayISO();
  
  if (sortedDates[0] === today || sortedDates[0] === yesterday) {
    // Start counting from most recent completion
    let expectedDate = sortedDates[0];
    for (let i = 0; i < sortedDates.length; i++) {
      if (sortedDates[i] === expectedDate) {
        currentStreak++;
        // Calculate previous day
        const date = new Date(expectedDate);
        date.setDate(date.getDate() - 1);
        expectedDate = date.toISOString().split('T')[0];
      } else {
        break;
      }
    }
  }
  
  // Calculate longest streak
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const daysDiff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);
  
  return { current: currentStreak, longest: longestStreak };
}

// Query: Get routine config for a specific task
export const getByTaskId = query({
  args: { taskId: v.id("tasks"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    // First verify the task belongs to the user
    const task = await ctx.db.get(args.taskId);
    if (!task || !userIdMatches(task.userId, userId)) {
      throw new Error("Task not found or unauthorized");
    }
    
    const routine = await ctx.db
      .query("routines")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .first();
    return routine;
  },
});

// Query: Get all routines with their tasks
export const list = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserIdOrNull(ctx, args.token ?? null);
    if (!userId) {
      return [];
    }
    // Get all routines and filter by userId (handles both string and ID types)
    const allRoutines = await ctx.db
      .query("routines")
      .order("desc")
      .collect();
    
    // Filter routines that belong to this user
    const routines = allRoutines.filter(routine => userIdMatches(routine.userId, userId));
    
    // Fetch associated tasks
    const routinesWithTasks = await Promise.all(
      routines.map(async (routine) => {
        const task = await ctx.db.get(routine.taskId);
        return { ...routine, task };
      })
    );
    
    return routinesWithTasks.filter((r) => r.task !== null);
  },
});

// Mutation: Create routine config for a task
export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    frequency: v.union(
      v.literal("Daily"),
      v.literal("Weekly"),
      v.literal("Monthly"),
      v.literal("Custom")
    ),
    daysOfWeek: v.optional(v.array(v.number())),
    customInterval: v.optional(v.number()),
    timeEstimate: v.optional(v.string()),
    goal: v.optional(v.string()),
    trackStreaks: v.boolean(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    // Verify the task belongs to the user
    const task = await ctx.db.get(args.taskId);
    if (!task || !userIdMatches(task.userId, userId)) {
      throw new Error("Task not found or unauthorized");
    }
    
    // Check if routine already exists for this task
    const existing = await ctx.db
      .query("routines")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .first();
    
    if (existing) {
      throw new Error("Routine already exists for this task");
    }
    
    // Validate custom interval
    if (args.frequency === "Custom" && (!args.customInterval || args.customInterval <= 0)) {
      throw new Error("Custom interval must be greater than 0");
    }
    
    // Validate days of week for weekly
    if (args.frequency === "Weekly" && (!args.daysOfWeek || args.daysOfWeek.length === 0)) {
      throw new Error("Weekly frequency requires at least one day of week");
    }
    
    // userId is already a string from getCurrentUserId
    const routineId = await ctx.db.insert("routines", {
      userId: userId as any,
      taskId: args.taskId,
      frequency: args.frequency,
      daysOfWeek: args.daysOfWeek,
      customInterval: args.customInterval,
      timeEstimate: args.timeEstimate,
      goal: args.goal,
      trackStreaks: args.trackStreaks,
      currentStreak: args.trackStreaks ? 0 : undefined,
      longestStreak: args.trackStreaks ? 0 : undefined,
      completionHistory: args.trackStreaks ? [] : undefined,
    });
    
    return routineId;
  },
});

// Mutation: Update routine config
export const update = mutation({
  args: {
    id: v.id("routines"),
    frequency: v.optional(v.union(
      v.literal("Daily"),
      v.literal("Weekly"),
      v.literal("Monthly"),
      v.literal("Custom")
    )),
    daysOfWeek: v.optional(v.array(v.number())),
    customInterval: v.optional(v.number()),
    timeEstimate: v.optional(v.string()),
    goal: v.optional(v.string()),
    trackStreaks: v.optional(v.boolean()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const { id, token, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Routine not found");
    }
    
    // Ensure user owns this routine
    if (!userIdMatches(existing.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    // Validate custom interval
    const newFrequency = updates.frequency ?? existing.frequency;
    if (newFrequency === "Custom" && (!updates.customInterval || updates.customInterval <= 0)) {
      const interval = updates.customInterval ?? existing.customInterval;
      if (!interval || interval <= 0) {
        throw new Error("Custom interval must be greater than 0");
      }
    }
    
    // Validate days of week for weekly
    if (newFrequency === "Weekly") {
      const days = updates.daysOfWeek ?? existing.daysOfWeek;
      if (!days || days.length === 0) {
        throw new Error("Weekly frequency requires at least one day of week");
      }
    }
    
    await ctx.db.patch(id, updates);
    return id;
  },
});

// Mutation: Delete routine config
export const deleteRoutine = mutation({
  args: { id: v.id("routines"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const routine = await ctx.db.get(args.id);
    if (!routine) {
      throw new Error("Routine not found");
    }
    
    // Ensure user owns this routine
    if (!userIdMatches(routine.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Mutation: Delete routine by task ID
export const deleteByTaskId = mutation({
  args: { taskId: v.id("tasks"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    // Verify the task belongs to the user
    const task = await ctx.db.get(args.taskId);
    if (!task || !userIdMatches(task.userId, userId)) {
      throw new Error("Task not found or unauthorized");
    }
    
    const routine = await ctx.db
      .query("routines")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .first();
    
    if (routine) {
      await ctx.db.delete(routine._id);
    }
    
    return routine?._id;
  },
});

// Mutation: Mark routine as completed for today (updates streak)
export const complete = mutation({
  args: { routineId: v.id("routines"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const routine = await ctx.db.get(args.routineId);
    if (!routine) {
      throw new Error("Routine not found");
    }
    
    // Ensure user owns this routine
    if (!userIdMatches(routine.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    const today = getTodayISO();
    const yesterday = getYesterdayISO();
    
    // Get current completion history
    const history = routine.completionHistory || [];
    
    // Check if already completed today (idempotent)
    if (history.includes(today)) {
      return routine._id;
    }
    
    // Add today to history
    const newHistory = [...history, today].sort((a, b) => b.localeCompare(a));
    
    // Calculate streaks if tracking is enabled
    let currentStreak = routine.currentStreak;
    let longestStreak = routine.longestStreak;
    
    if (routine.trackStreaks) {
      const streaks = calculateStreak(newHistory);
      currentStreak = streaks.current;
      longestStreak = Math.max(streaks.longest, routine.longestStreak || 0);
    }
    
    await ctx.db.patch(args.routineId, {
      lastCompletedDate: today,
      completionHistory: newHistory,
      currentStreak,
      longestStreak,
    });
    
    return routine._id;
  },
});

// Mutation: Remove today's completion
export const uncomplete = mutation({
  args: { routineId: v.id("routines"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    const routine = await ctx.db.get(args.routineId);
    if (!routine) {
      throw new Error("Routine not found");
    }
    
    // Ensure user owns this routine
    if (!userIdMatches(routine.userId, userId)) {
      throw new Error("Unauthorized");
    }
    
    const today = getTodayISO();
    const history = routine.completionHistory || [];
    
    // Remove today from history if present
    if (!history.includes(today)) {
      return routine._id;
    }
    
    const newHistory = history.filter((date) => date !== today);
    
    // Recalculate streaks if tracking is enabled
    let currentStreak = routine.currentStreak;
    let longestStreak = routine.longestStreak;
    
    if (routine.trackStreaks) {
      const streaks = calculateStreak(newHistory);
      currentStreak = streaks.current;
      // Don't decrease longest streak when uncompleting
      longestStreak = routine.longestStreak;
    }
    
    await ctx.db.patch(args.routineId, {
      completionHistory: newHistory,
      currentStreak,
      lastCompletedDate: newHistory.length > 0 ? newHistory[0] : undefined,
    });
    
    return routine._id;
  },
});

