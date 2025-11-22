import { query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getCurrentUserIdOrNull, userIdMatches } from "./authHelpers";

/**
 * Debug query to check userId filtering
 */
export const checkUserData = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserIdOrNull(ctx, args.token ?? null);
    
    if (!userId) {
      return { error: "Not authenticated", userId: null };
    }
    
    // Get all data (not just samples)
    const allTasks = await ctx.db.query("tasks").collect();
    const allEntries = await ctx.db.query("entries").collect();
    
    // Check userId types and values for all data
    const taskUserIds = allTasks.map(t => {
      const taskUserIdStr = t.userId ? (typeof t.userId === "string" ? t.userId : (t.userId as { toString(): string }).toString()) : null;
      const matches = userIdMatches(t.userId, userId);
      return {
        taskId: t._id,
        userId: t.userId,
        userIdType: typeof t.userId,
        userIdString: taskUserIdStr,
        matches,
        currentUserId: userId,
      };
    });
    
    const entryUserIds = allEntries.map(e => {
      const entryUserIdStr = e.userId ? (typeof e.userId === "string" ? e.userId : (e.userId as { toString(): string }).toString()) : null;
      const matches = userIdMatches(e.userId, userId);
      return {
        entryId: e._id,
        userId: e.userId,
        userIdType: typeof e.userId,
        userIdString: entryUserIdStr,
        matches,
        currentUserId: userId,
      };
    });
    
    // Count matches
    const matchingTasks = taskUserIds.filter(t => t.matches).length;
    const matchingEntries = entryUserIds.filter(e => e.matches).length;
    
    return {
      currentUserId: userId,
      currentUserIdType: typeof userId,
      totalTasks: allTasks.length,
      totalEntries: allEntries.length,
      matchingTasks,
      matchingEntries,
      taskUserIds: taskUserIds.slice(0, 10), // First 10 for debugging
      entryUserIds: entryUserIds.slice(0, 10), // First 10 for debugging
      uniqueTaskUserIds: [...new Set(taskUserIds.map(t => t.userIdString))],
      uniqueEntryUserIds: [...new Set(entryUserIds.map(e => e.userIdString))],
    };
  },
});

