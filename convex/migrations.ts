import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getCurrentUserId } from "./authHelpers";

/**
 * Transfer all data from one user to another
 */
export const transferUserData = mutation({
  args: {
    fromUserId: v.string(),
    toUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const { fromUserId, toUserId } = args;
    
    // Transfer tasks
    const allTasks = await ctx.db.query("tasks").collect();
    let tasksTransferred = 0;
    for (const task of allTasks) {
      const taskUserId = task.userId ? (typeof task.userId === "string" ? task.userId : (task.userId as { toString(): string }).toString()) : null;
      if (taskUserId === fromUserId) {
        await ctx.db.patch(task._id, { userId: toUserId as any });
        tasksTransferred++;
      }
    }

    // Transfer entries
    const allEntries = await ctx.db.query("entries").collect();
    let entriesTransferred = 0;
    for (const entry of allEntries) {
      const entryUserId = entry.userId ? (typeof entry.userId === "string" ? entry.userId : (entry.userId as { toString(): string }).toString()) : null;
      if (entryUserId === fromUserId) {
        await ctx.db.patch(entry._id, { userId: toUserId as any });
        entriesTransferred++;
      }
    }

    // Transfer routines
    const allRoutines = await ctx.db.query("routines").collect();
    let routinesTransferred = 0;
    for (const routine of allRoutines) {
      const routineUserId = routine.userId ? (typeof routine.userId === "string" ? routine.userId : (routine.userId as { toString(): string }).toString()) : null;
      if (routineUserId === fromUserId) {
        await ctx.db.patch(routine._id, { userId: toUserId as any });
        routinesTransferred++;
      }
    }

    // Transfer timeBlockTemplates
    const allTemplates = await ctx.db.query("timeBlockTemplates").collect();
    let templatesTransferred = 0;
    for (const template of allTemplates) {
      const templateUserId = template.userId ? (typeof template.userId === "string" ? template.userId : (template.userId as { toString(): string }).toString()) : null;
      if (templateUserId === fromUserId) {
        await ctx.db.patch(template._id, { userId: toUserId as any });
        templatesTransferred++;
      }
    }

    // Transfer timeBlocks
    const allTimeBlocks = await ctx.db.query("timeBlocks").collect();
    let timeBlocksTransferred = 0;
    for (const block of allTimeBlocks) {
      const blockUserId = block.userId ? (typeof block.userId === "string" ? block.userId : (block.userId as { toString(): string }).toString()) : null;
      if (blockUserId === fromUserId) {
        await ctx.db.patch(block._id, { userId: toUserId as any });
        timeBlocksTransferred++;
      }
    }

    // Transfer userSettings
    const allSettings = await ctx.db.query("userSettings").collect();
    let settingsTransferred = 0;
    for (const setting of allSettings) {
      const settingUserId = setting.userId ? (typeof setting.userId === "string" ? setting.userId : (setting.userId as { toString(): string }).toString()) : null;
      if (settingUserId === fromUserId) {
        await ctx.db.patch(setting._id, { userId: toUserId as any });
        settingsTransferred++;
      }
    }
    
    return {
      tasksTransferred,
      entriesTransferred,
      routinesTransferred,
      templatesTransferred,
      timeBlocksTransferred,
      settingsTransferred,
    };
  },
});

/**
 * Migration function to assign all existing data to the current authenticated user
 * This should be run once after authentication is set up to migrate existing data
 */
export const migrateExistingDataToUser = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx, args.token ?? null);
    
    // Only migrate data that doesn't have a userId (anonymous/unassigned data)
    // This prevents overwriting data that already belongs to other users
    
    // Migrate tasks - only assign tasks without userId
    const allTasks = await ctx.db.query("tasks").collect();
    let tasksMigrated = 0;
    for (const task of allTasks) {
      if (!task.userId) {
        await ctx.db.patch(task._id, { userId: userId as any });
        tasksMigrated++;
      }
    }

    // Migrate entries - only assign entries without userId
    const allEntries = await ctx.db.query("entries").collect();
    let entriesMigrated = 0;
    for (const entry of allEntries) {
      if (!entry.userId) {
        await ctx.db.patch(entry._id, { userId: userId as any });
        entriesMigrated++;
      }
    }

    // Migrate routines - only assign routines without userId
    const allRoutines = await ctx.db.query("routines").collect();
    let routinesMigrated = 0;
    for (const routine of allRoutines) {
      if (!routine.userId) {
        await ctx.db.patch(routine._id, { userId: userId as any });
        routinesMigrated++;
      }
    }

    // Migrate timeBlockTemplates - only assign templates without userId
    const allTemplates = await ctx.db.query("timeBlockTemplates").collect();
    let templatesMigrated = 0;
    for (const template of allTemplates) {
      if (!template.userId) {
        await ctx.db.patch(template._id, { userId: userId as any });
        templatesMigrated++;
      }
    }

    // Migrate timeBlocks - only assign time blocks without userId
    const allTimeBlocks = await ctx.db.query("timeBlocks").collect();
    let timeBlocksMigrated = 0;
    for (const block of allTimeBlocks) {
      if (!block.userId) {
        await ctx.db.patch(block._id, { userId: userId as any });
        timeBlocksMigrated++;
      }
    }

    // Migrate userSettings - only assign settings without userId
    const allSettings = await ctx.db.query("userSettings").collect();
    let settingsMigrated = 0;
    for (const setting of allSettings) {
      if (!setting.userId) {
        await ctx.db.patch(setting._id, { userId: userId as any });
        settingsMigrated++;
      }
    }
    
    return {
      tasksMigrated,
      entriesMigrated,
      routinesMigrated,
      templatesMigrated,
      timeBlocksMigrated,
      settingsMigrated,
    };
  },
});

/**
 * Admin migration - assigns all data to a specific user ID (as string)
 * Can be run from terminal: npx convex run migrations:adminMigrateData '{"userId": "your-user-id"}'
 */
export const adminMigrateData = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const targetUserId = args.userId;
    
    // Migrate ALL data to the specified user, regardless of existing userId
    
    // Migrate tasks
    const allTasks = await ctx.db.query("tasks").collect();
    let tasksMigrated = 0;
    for (const task of allTasks) {
      await ctx.db.patch(task._id, { userId: targetUserId as any });
      tasksMigrated++;
    }

    // Migrate entries
    const allEntries = await ctx.db.query("entries").collect();
    let entriesMigrated = 0;
    for (const entry of allEntries) {
      await ctx.db.patch(entry._id, { userId: targetUserId as any });
      entriesMigrated++;
    }

    // Migrate routines
    const allRoutines = await ctx.db.query("routines").collect();
    let routinesMigrated = 0;
    for (const routine of allRoutines) {
      await ctx.db.patch(routine._id, { userId: targetUserId as any });
      routinesMigrated++;
    }

    // Migrate timeBlockTemplates
    const allTemplates = await ctx.db.query("timeBlockTemplates").collect();
    let templatesMigrated = 0;
    for (const template of allTemplates) {
      await ctx.db.patch(template._id, { userId: targetUserId as any });
      templatesMigrated++;
    }

    // Migrate timeBlocks
    const allTimeBlocks = await ctx.db.query("timeBlocks").collect();
    let timeBlocksMigrated = 0;
    for (const block of allTimeBlocks) {
      await ctx.db.patch(block._id, { userId: targetUserId as any });
      timeBlocksMigrated++;
    }

    // Migrate userSettings - keep only one settings record for the target user
    const allSettings = await ctx.db.query("userSettings").collect();
    let settingsMigrated = 0;
    let settingsDeleted = 0;
    
    // Find or create settings for target user
    const targetUserSettings = allSettings.find(s => {
      if (!s.userId) return false;
      const sUserId = typeof s.userId === "string" ? s.userId : (s.userId as { toString(): string }).toString();
      return sUserId === targetUserId;
    });
    
    for (const setting of allSettings) {
      if (!setting.userId) {
        // Assign unassigned settings to target user
        await ctx.db.patch(setting._id, { userId: targetUserId as any });
        settingsMigrated++;
      } else {
        const sUserId = typeof setting.userId === "string" ? setting.userId : (setting.userId as { toString(): string }).toString();
        if (sUserId === targetUserId) {
          // Keep this setting
          if (!targetUserSettings || setting._id === targetUserSettings._id) {
            // This is the one we're keeping
            continue;
          }
        }
        // Delete settings that belong to other users or are duplicates
        await ctx.db.delete(setting._id);
        settingsDeleted++;
      }
    }
    
    return {
      tasksMigrated,
      entriesMigrated,
      routinesMigrated,
      templatesMigrated,
      timeBlocksMigrated,
      settingsMigrated,
      settingsDeleted,
    };
  },
});

/**
 * Debug: Check entries and timeBlocks to see if they have userId
 */
export const checkDataFields = query({
  handler: async (ctx) => {
    const entries = await ctx.db.query("entries").take(5);
    const timeBlocks = await ctx.db.query("timeBlocks").take(5);
    
    return {
      sampleEntries: entries.map(e => ({
        id: e._id,
        hasUserId: !!e.userId,
        userId: e.userId,
        userIdType: typeof e.userId,
      })),
      sampleTimeBlocks: timeBlocks.map(t => ({
        id: t._id,
        hasUserId: !!t.userId,
        userId: t.userId,
        userIdType: typeof t.userId,
      })),
    };
  },
});

/**
 * Debug: Test userId filtering with a specific token
 */
export const testUserIdFiltering = query({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{
    error?: string;
    currentUserId?: any;
    currentUserIdString?: string;
    totalEntries?: number;
    filteredEntries?: number;
    totalTasks?: number;
    filteredTasks?: number;
    sampleEntry?: {
      userId: any;
      userIdType: string;
      matches: boolean;
    } | null;
  }> => {
    // Get current user
    const user = await ctx.runQuery(api.auth.getCurrentUser, { token: args.token });
    if (!user) {
      return { error: "Not authenticated" };
    }
    
    const userId: any = user.userId;
    // Convert Id<"users"> to string - userId is always Id<"users"> from getCurrentUser
    const userIdString: string = userId.toString();
    
    // Get all entries
    const allEntries = await ctx.db.query("entries").take(10);
    const allTasks = await ctx.db.query("tasks").take(10);
    
    // Test filtering
    const filteredEntries = allEntries.filter(e => {
      if (!e.userId) return false;
      const entryUserIdString = typeof e.userId === "string" ? e.userId : (e.userId as { toString(): string }).toString();
      return entryUserIdString === userIdString;
    });
    
    const filteredTasks = allTasks.filter(t => {
      if (!t.userId) return false;
      const taskUserIdString = typeof t.userId === "string" ? t.userId : (t.userId as { toString(): string }).toString();
      return taskUserIdString === userIdString;
    });
    
    return {
      currentUserId: userId,
      currentUserIdString: userIdString,
      totalEntries: allEntries.length,
      filteredEntries: filteredEntries.length,
      totalTasks: allTasks.length,
      filteredTasks: filteredTasks.length,
      sampleEntry: allEntries[0] ? {
        userId: allEntries[0].userId,
        userIdType: typeof allEntries[0].userId,
        matches: allEntries[0].userId ? (typeof allEntries[0].userId === "string" ? allEntries[0].userId : (allEntries[0].userId as { toString(): string }).toString()) === userIdString : false,
      } : null,
    };
  },
});

/**
 * Clear all temporary userIds so data is available to authenticated users
 */
export const clearTemporaryUserIds = mutation({
  handler: async (ctx) => {
    // Clear all records with "default_user_fix" userId by setting to undefined
    const allTasks = await ctx.db.query("tasks").collect();
    const tasksToClear = allTasks.filter(task => task.userId === "default_user_fix");

    for (const task of tasksToClear) {
      await ctx.db.patch(task._id, { userId: undefined });
    }

    const allEntries = await ctx.db.query("entries").collect();
    const entriesToClear = allEntries.filter(entry => entry.userId === "default_user_fix");

    for (const entry of entriesToClear) {
      await ctx.db.patch(entry._id, { userId: undefined });
    }

    const allRoutines = await ctx.db.query("routines").collect();
    const routinesToClear = allRoutines.filter(routine => routine.userId === "default_user_fix");

    for (const routine of routinesToClear) {
      await ctx.db.patch(routine._id, { userId: undefined });
    }

    const allTemplates = await ctx.db.query("timeBlockTemplates").collect();
    const templatesToClear = allTemplates.filter(template => template.userId === "default_user_fix");

    for (const template of templatesToClear) {
      await ctx.db.patch(template._id, { userId: undefined });
    }

    const allTimeBlocks = await ctx.db.query("timeBlocks").collect();
    const timeBlocksToClear = allTimeBlocks.filter(block => block.userId === "default_user_fix");

    for (const block of timeBlocksToClear) {
      await ctx.db.patch(block._id, { userId: undefined });
    }

    const allSettings = await ctx.db.query("userSettings").collect();
    const settingsToClear = allSettings.filter(setting => setting.userId === "default_user_fix");

    for (const setting of settingsToClear) {
      await ctx.db.patch(setting._id, { userId: undefined });
    }

    return {
      tasksCleared: tasksToClear.length,
      entriesCleared: entriesToClear.length,
      routinesCleared: routinesToClear.length,
      templatesCleared: templatesToClear.length,
      timeBlocksCleared: timeBlocksToClear.length,
      settingsCleared: settingsToClear.length,
    };
  },
});


