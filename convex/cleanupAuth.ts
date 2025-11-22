import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Delete all users and sessions - for testing purposes
 */
export const deleteAllAuthData = mutation({
  handler: async (ctx) => {
    // Delete all users
    const allUsers = await ctx.db.query("users").collect();
    for (const user of allUsers) {
      await ctx.db.delete(user._id);
    }
    
    // Delete all sessions
    const allSessions = await ctx.db.query("sessions").collect();
    for (const session of allSessions) {
      await ctx.db.delete(session._id);
    }
    
    return {
      deletedUsers: allUsers.length,
      deletedSessions: allSessions.length,
    };
  },
});

/**
 * List all users for debugging
 */
export const listUsers = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(u => ({
      id: u._id,
      email: u.email,
      hasPasswordHash: !!u.passwordHash,
      passwordHashPreview: u.passwordHash ? u.passwordHash.substring(0, 10) + "..." : null,
      createdAt: u.createdAt,
    }));
  },
});

/**
 * Delete a specific user by email
 */
export const deleteUserByEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    
    if (!user) {
      return { success: false, message: "User not found" };
    }
    
    // Delete user's sessions
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
    
    // Delete user
    await ctx.db.delete(user._id);
    
    return {
      success: true,
      deletedSessions: sessions.length,
    };
  },
});
