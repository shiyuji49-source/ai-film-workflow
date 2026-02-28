import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getUserAssets,
  getAssetById,
  createAsset,
  updateAsset,
  softDeleteAsset,
} from "../db";
import { generateImage } from "../_core/imageGeneration";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

// 积分消耗配置
const CREDITS = {
  generateMain: 10,    // 生成主图
  generateMulti: 8,    // 生成三视图/多视角（每张）
};

export const assetsRouter = router({
  // 获取资产列表
  list: protectedProcedure
    .input(z.object({ type: z.enum(["character", "scene"]).optional() }))
    .query(async ({ ctx, input }) => {
      return getUserAssets(ctx.user.id, input.type);
    }),

  // 获取单个资产
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const asset = await getAssetById(input.id, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });
      return asset;
    }),

  // 创建资产（草稿）
  create: protectedProcedure
    .input(z.object({
      type: z.enum(["character", "scene"]),
      name: z.string().min(1).max(128),
      description: z.string().optional(),
      mainPrompt: z.string().optional(),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return createAsset({
        userId: ctx.user.id,
        type: input.type,
        name: input.name,
        description: input.description,
        mainPrompt: input.mainPrompt,
        projectId: input.projectId,
      });
    }),

  // 更新资产基本信息
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(128).optional(),
      description: z.string().optional(),
      mainPrompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetById(input.id, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });
      await updateAsset(input.id, ctx.user.id, {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.mainPrompt !== undefined && { mainPrompt: input.mainPrompt }),
      });
      return { success: true };
    }),

  // 删除资产
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetById(input.id, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });
      await softDeleteAsset(input.id, ctx.user.id);
      return { success: true };
    }),

  // 生成主图
  generateMain: protectedProcedure
    .input(z.object({
      id: z.number(),
      prompt: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetById(input.id, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });

      // 检查积分
      if (ctx.user.credits < CREDITS.generateMain) {
        throw new TRPCError({ code: "FORBIDDEN", message: `积分不足，生成主图需要 ${CREDITS.generateMain} 积分` });
      }

      // 标记生成中
      await updateAsset(input.id, ctx.user.id, { status: "generating", mainPrompt: input.prompt });

      try {
        // 调用 Nano Banana Pro（Gemini Image）
        const typeLabel = asset.type === "character" ? "character concept art" : "scene concept art";
        const fullPrompt = `${typeLabel}, ${input.prompt}, high quality, detailed, professional illustration, 4K`;

        const genResult = await generateImage({ prompt: fullPrompt });
        if (!genResult.url) throw new Error("图片生成返回空URL");
        const generatedUrl = genResult.url;

        // 下载并上传到 S3
        const imgResp = await fetch(generatedUrl);
        const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
        const fileKey = `assets/${ctx.user.id}/${input.id}-main-${nanoid(8)}.png`;
        const { url: s3Url } = await storagePut(fileKey, imgBuffer, "image/png");

        // 扣除积分
        const { getDb } = await import("../db");
        const { users, creditLogs } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (db) {
          const newCredits = ctx.user.credits - CREDITS.generateMain;
          await db.update(users).set({ credits: newCredits }).where(eq(users.id, ctx.user.id));
          await db.insert(creditLogs).values({
            userId: ctx.user.id,
            delta: -CREDITS.generateMain,
            balance: newCredits,
            action: "generate_prompt",
            note: `生成资产主图: ${asset.name}`,
          });
        }

        // 更新资产
        await updateAsset(input.id, ctx.user.id, {
          mainImageUrl: s3Url,
          generationModel: "nano-banana-pro",
          status: "done",
        });

        return { success: true, imageUrl: s3Url };
      } catch (err) {
        await updateAsset(input.id, ctx.user.id, { status: "failed" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "图片生成失败，请重试" });
      }
    }),

  // 生成三视图/多视角图
  generateMultiView: protectedProcedure
    .input(z.object({
      id: z.number(),
      viewType: z.enum(["front", "side", "back", "angle1", "angle2", "angle3"]),
      prompt: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetById(input.id, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });

      if (ctx.user.credits < CREDITS.generateMulti) {
        throw new TRPCError({ code: "FORBIDDEN", message: `积分不足，生成多视角图需要 ${CREDITS.generateMulti} 积分` });
      }

      const viewLabels: Record<string, string> = {
        front: "front view",
        side: "side view",
        back: "back view",
        angle1: "three-quarter view",
        angle2: "bird eye view",
        angle3: "worm eye view",
      };

      const typeLabel = asset.type === "character" ? "character concept art" : "scene concept art";
      const fullPrompt = `${typeLabel}, ${viewLabels[input.viewType]}, ${input.prompt}, consistent style, high quality, 4K`;

      try {
        const genResult2 = await generateImage({ prompt: fullPrompt });
        if (!genResult2.url) throw new Error("图片生成返回空URL");
        const generatedUrl = genResult2.url;
        const imgResp = await fetch(generatedUrl);
        const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
        const fileKey = `assets/${ctx.user.id}/${input.id}-${input.viewType}-${nanoid(8)}.png`;
        const { url: s3Url } = await storagePut(fileKey, imgBuffer, "image/png");

        // 更新 multiViewUrls
        const existing = asset.multiViewUrls ? JSON.parse(asset.multiViewUrls) : {};
        existing[input.viewType] = s3Url;
        await updateAsset(input.id, ctx.user.id, {
          multiViewUrls: JSON.stringify(existing),
          status: "done",
        });

        // 扣积分
        const { getDb } = await import("../db");
        const { users, creditLogs } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (db) {
          const newCredits = ctx.user.credits - CREDITS.generateMulti;
          await db.update(users).set({ credits: newCredits }).where(eq(users.id, ctx.user.id));
          await db.insert(creditLogs).values({
            userId: ctx.user.id,
            delta: -CREDITS.generateMulti,
            balance: newCredits,
            action: "generate_prompt",
            note: `生成资产多视角图(${input.viewType}): ${asset.name}`,
          });
        }

        return { success: true, imageUrl: s3Url, viewType: input.viewType };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "图片生成失败，请重试" });
      }
    }),
});
