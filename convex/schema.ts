import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  plans: defineTable({
    name: v.string(),
    dates: v.array(v.string()),
    timezone: v.string(),
    hasTime: v.boolean(),
    // "global" = same time window for all days, "per_day" = each day has its own
    timeMode: v.union(v.literal("global"), v.literal("per_day")),
    timeStart: v.number(),  // used when timeMode = "global"
    timeEnd: v.number(),    // used when timeMode = "global"
    // per-day overrides (used when timeMode = "per_day")
    perDayStarts: v.optional(v.record(v.string(), v.number())),
    perDayEnds: v.optional(v.record(v.string(), v.number())),
    lockedDate: v.optional(v.string()),
    lockedSlot: v.optional(v.number()),
  }),

  participants: defineTable({
    planId: v.id("plans"),
    participantId: v.string(),
    name: v.string(),
    slots: v.record(v.string(), v.array(v.number())),
  })
    .index("by_plan", ["planId"])
    .index("by_participant", ["planId", "participantId"]),
});
