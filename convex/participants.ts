import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const upsert = mutation({
  args: {
    planId: v.id("plans"),
    participantId: v.string(),
    name: v.string(),
    slots: v.record(v.string(), v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_participant", (q) =>
        q.eq("planId", args.planId).eq("participantId", args.participantId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        slots: args.slots,
      });
    } else {
      await ctx.db.insert("participants", args);
    }
  },
});
