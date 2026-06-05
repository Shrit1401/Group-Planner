import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    name: v.string(),
    dates: v.array(v.string()),
    timezone: v.string(),
    hasTime: v.boolean(),
    timeMode: v.union(v.literal("global"), v.literal("per_day")),
    timeStart: v.number(),
    timeEnd: v.number(),
    perDayStarts: v.optional(v.record(v.string(), v.number())),
    perDayEnds: v.optional(v.record(v.string(), v.number())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("plans", args);
  },
});

export const get = query({
  args: { id: v.id("plans") },
  handler: async (ctx, { id }) => {
    const plan = await ctx.db.get(id);
    if (!plan) return null;
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_plan", (q) => q.eq("planId", id))
      .collect();
    return { plan, participants };
  },
});

export const update = mutation({
  args: {
    id: v.id("plans"),
    name: v.string(),
    dates: v.array(v.string()),
    hasTime: v.boolean(),
    timeMode: v.union(v.literal("global"), v.literal("per_day")),
    timeStart: v.number(),
    timeEnd: v.number(),
    perDayStarts: v.optional(v.record(v.string(), v.number())),
    perDayEnds: v.optional(v.record(v.string(), v.number())),
  },
  handler: async (ctx, { id, ...rest }) => {
    await ctx.db.patch(id, rest);
  },
});

export const lock = mutation({
  args: { id: v.id("plans"), date: v.string(), slotIndex: v.number() },
  handler: async (ctx, { id, date, slotIndex }) => {
    await ctx.db.patch(id, { lockedDate: date, lockedSlot: slotIndex });
  },
});
