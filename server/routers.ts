import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { systemRouter } from "./_core/systemRouter";

function requireAdmin(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    list: publicProcedure.query(async () => {
      const items = await db.listPublishedMedia();
      return items.map((item) => ({
        id: item.publicId,
        title: item.title,
        artist: item.artist ?? "Mg Flâsh",
        kind: item.kind,
        url: `/manus-storage/${item.storageKey}`,
        mimeType: item.mimeType ?? undefined,
        size: item.fileSize ?? undefined,
      }));
    }),
    publish: protectedProcedure
      .input(z.object({
        publicId: z.string().min(1).max(80),
        title: z.string().min(1).max(255),
        artist: z.string().max(255).optional(),
        kind: z.enum(["audio", "video"]),
        storageKey: z.string().min(1).max(512),
        mimeType: z.string().max(160).optional(),
        fileSize: z.number().int().nonnegative().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await db.createMediaCatalogItem({ ...input, artist: input.artist ?? "Mg Flâsh", published: 1, sortOrder: 0 });
        return { success: true, id: input.publicId } as const;
      }),
    unpublish: protectedProcedure
      .input(z.object({ publicId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await db.updateMediaCatalogItem(input.publicId, { published: 0 });
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
