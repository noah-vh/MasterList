import { QueryCtx, MutationCtx } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Get the current authenticated user ID from a token
 * Throws an error if the user is not authenticated
 */
export async function getCurrentUserId(
  ctx: QueryCtx | MutationCtx,
  token: string | null
): Promise<string> {
  if (!token) {
    throw new Error("User is not authenticated");
  }

  const user = await ctx.runQuery(api.auth.getCurrentUser, { token });
  
  if (!user) {
    throw new Error("User is not authenticated");
  }

  // Convert Id<"users"> to string for consistent comparison
  return user.userId.toString();
}

/**
 * Get the current authenticated user ID, or null if not authenticated
 * Does not throw an error if the user is not authenticated
 */
export async function getCurrentUserIdOrNull(
  ctx: QueryCtx | MutationCtx,
  token: string | null
): Promise<string | null> {
  if (!token) {
    return null;
  }

  const user = await ctx.runQuery(api.auth.getCurrentUser, { token });
  
  // Convert Id<"users"> to string for consistent comparison
  return user?.userId ? user.userId.toString() : null;
}

/**
 * Compare two userIds (handles both string and ID types)
 * Returns true if they match
 * Both parameters can be string, Id<"users">, null, or undefined
 */
export function userIdMatches(
  userId1: string | { toString(): string } | null | undefined,
  userId2: string | { toString(): string } | null | undefined
): boolean {
  if (!userId1 || !userId2) {
    return false;
  }
  
  // Convert both to strings for comparison
  // Handle both string and Id<"users"> types (which have toString method)
  let id1: string;
  let id2: string;
  
  if (typeof userId1 === "string") {
    id1 = userId1;
  } else if (userId1 && typeof userId1.toString === "function") {
    id1 = userId1.toString();
  } else {
    return false;
  }
  
  if (typeof userId2 === "string") {
    id2 = userId2;
  } else if (userId2 && typeof userId2.toString === "function") {
    id2 = userId2.toString();
  } else {
    return false;
  }
  
  // Strict string comparison
  const matches = id1 === id2;
  
  // Debug logging for mismatches (remove in production)
  if (!matches && id1 && id2) {
    console.log(`[userIdMatches] Mismatch: "${id1}" !== "${id2}" (lengths: ${id1.length} vs ${id2.length})`);
  }
  
  return matches;
}
