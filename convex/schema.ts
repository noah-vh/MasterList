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
    isRoutine: v.optional(v.boolean()),
  })
    .index("by_status", ["status"])
    .index("by_actionDate", ["actionDate"])
    .index("by_createdAt", ["createdAt"])
    .index("by_parentTaskId", ["parentTaskId"])
    .index("by_isRoutine", ["isRoutine"]),
  routines: defineTable({
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
    lastCompletedDate: v.optional(v.string()),
    currentStreak: v.optional(v.number()),
    longestStreak: v.optional(v.number()),
    completionHistory: v.optional(v.array(v.string())),
  })
    .index("by_taskId", ["taskId"]),
  timeBlockTemplates: defineTable({
    name: v.string(),
    createdAt: v.number(),
    isDefault: v.boolean(),
  })
    .index("by_createdAt", ["createdAt"]),
  timeBlocks: defineTable({
    templateId: v.id("timeBlockTemplates"),
    startTime: v.number(),
    endTime: v.number(),
    title: v.optional(v.string()),
    color: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_templateId", ["templateId"])
    .index("by_templateId_startTime", ["templateId", "startTime"]),
  entries: defineTable({
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    entryType: v.union(
      v.literal("manual"),      // User-created entry
      v.literal("activity"),    // Auto-generated activity log
      v.literal("content")      // Analyzed content (link, image, etc.)
    ),
    activityType: v.optional(v.union(
      v.literal("task_created"),
      v.literal("task_completed"),
      v.literal("task_uncompleted"),
      v.literal("attachment_added")
    )),
    hasAttachment: v.optional(v.boolean()),
    linkedTaskId: v.optional(v.id("tasks")), // Single task for activity logs
    linkedTaskIds: v.optional(v.array(v.id("tasks"))), // Multiple tasks for manual entries
    tags: v.optional(v.array(v.string())),
    // Content logging fields
    contentType: v.optional(v.union(
      v.literal("link"),
      v.literal("image"),
      v.literal("text"),
      v.literal("video"),
      v.literal("chat")
    )),
    // Chat thread fields
    chatThread: v.optional(v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
    }))),
      sourceUrl: v.optional(v.string()), // Original URL or image URL
      sourceImageId: v.optional(v.id("_storage")), // For uploaded images
      analyzedContent: v.optional(v.string()), // AI-analyzed summary/transcription
      ogMetadata: v.optional(v.object({ // Open Graph metadata for link previews
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        image: v.optional(v.string()),
        siteName: v.optional(v.string()),
      })),
    classification: v.optional(v.object({
      category: v.string(), // e.g., "UI Design", "Tutorial", "Article"
      topics: v.array(v.string()), // Extracted topics
      keyPoints: v.array(v.string()), // Key takeaways
      lessons: v.array(v.string()), // Lessons learned
    })),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_contentType", ["contentType"]),
});

