import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Create a deterministic hash from a password
 * Uses a simple but consistent hashing approach that works in Convex runtime
 */
function hashPassword(password: string): string {
  // Use a fixed salt for consistency
  const salt = "convex_auth_2024_salt_key";
  const combined = password + salt;
  
  // Create a deterministic hash
  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) + hash) + char; // hash * 33 + char
  }
  
  // Convert to hex string and ensure consistent length
  let hexHash = Math.abs(hash).toString(16);
  
  // Add additional rounds for more security
  for (let round = 0; round < 3; round++) {
    let tempHash = 0;
    for (let i = 0; i < hexHash.length; i++) {
      tempHash = ((tempHash << 5) - tempHash) + hexHash.charCodeAt(i);
    }
    hexHash = Math.abs(tempHash).toString(16);
  }
  
  // Ensure consistent format
  return hexHash.padStart(32, '0');
}

/**
 * Generate a secure random token
 */
function generateToken(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  const randomPart3 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${randomPart}${randomPart2}${randomPart3}`;
}

/**
 * Sign up a new user
 */
export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }

    // Validate password length
    if (args.password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    const normalizedEmail = args.email.toLowerCase().trim();

    // Check if user already exists (check all users to be thorough)
    const allUsers = await ctx.db.query("users").collect();
    const existingUser = allUsers.find(u => u.email.toLowerCase().trim() === normalizedEmail);

    if (existingUser) {
      throw new Error("An account with this email already exists");
    }

    // Hash password
    const passwordHash = hashPassword(args.password);

    // Create user
    const userId = await ctx.db.insert("users", {
      email: normalizedEmail,
      passwordHash: passwordHash,
      createdAt: Date.now(),
    });

    // Create session
    const token = generateToken();
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt,
      createdAt: Date.now(),
    });

    return { 
      success: true,
      userId: userId, 
      token: token 
    };
  },
});

/**
 * Sign in an existing user
 */
export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check if user has a password (not from old auth system)
    if (!user.passwordHash) {
      throw new Error("Please sign up with email and password");
    }

    // Verify password
    const inputPasswordHash = hashPassword(args.password);
    
    if (inputPasswordHash !== user.passwordHash) {
      throw new Error("Invalid email or password");
    }

    // Clean up expired sessions for this user
    const existingSessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const now = Date.now();
    for (const session of existingSessions) {
      if (session.expiresAt < now) {
        await ctx.db.delete(session._id);
      }
    }

    // Create new session
    const token = generateToken();
    const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days

    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
      createdAt: now,
    });

    return { 
      success: true,
      userId: user._id, 
      token: token 
    };
  },
});

/**
 * Sign out (delete session)
 */
export const signOut = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

/**
 * Get current user from token
 */
export const getCurrentUser = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.token) {
      return null;
    }

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    return {
      userId: user._id,
      email: user.email,
    };
  },
});

/**
 * Validate a session token (for middleware use)
 */
export const validateToken = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.token) {
      return { valid: false, userId: null };
    }

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token!))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return { valid: false, userId: null };
    }

    return { valid: true, userId: session.userId };
  },
});

/**
 * Delete all sessions for a user (useful for "log out everywhere")
 */
export const deleteAllSessions = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // First validate the current session
    const currentSession = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!currentSession || currentSession.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    // Delete all sessions for this user
    const allSessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", currentSession.userId))
      .collect();

    for (const session of allSessions) {
      await ctx.db.delete(session._id);
    }

    return { success: true, deletedCount: allSessions.length };
  },
});

/**
 * Reset password for a user (admin function - for recovery)
 * WARNING: This should only be used for account recovery
 */
export const resetPassword = mutation({
  args: {
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate password length
    if (args.newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    const normalizedEmail = args.email.toLowerCase().trim();

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Hash new password
    const passwordHash = hashPassword(args.newPassword);

    // Update user's password
    await ctx.db.patch(user._id, {
      passwordHash,
    });

    // Delete all existing sessions to force re-login
    const allSessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    for (const session of allSessions) {
      await ctx.db.delete(session._id);
    }

    return { success: true, message: "Password reset successfully" };
  },
});

/**
 * Clean up expired sessions (can be run periodically)
 */
export const cleanupExpiredSessions = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const allSessions = await ctx.db.query("sessions").collect();
    
    let deletedCount = 0;
    for (const session of allSessions) {
      if (session.expiresAt < now) {
        await ctx.db.delete(session._id);
        deletedCount++;
      }
    }
    
    return { deletedCount };
  },
});