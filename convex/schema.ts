import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
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
  })
    .index("by_status", ["status"])
    .index("by_actionDate", ["actionDate"])
    .index("by_createdAt", ["createdAt"])
    .index("by_parentTaskId", ["parentTaskId"]),
});

