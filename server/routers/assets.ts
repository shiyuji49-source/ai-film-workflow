import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getUserAssets,
  getAssetById,
  createAsset,
  updateAsset,
  softDeleteAsset,
  addAssetHistory,
  getAssetHistory,
} from "../db";
import { generateImage } from "../_core/imageGeneration";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

// 积分消耗配置
const CREDITS = {
  generateMain: 10,    // 生成主视图
  generateMulti: 8,    // 生成三视图/多视角（每张）
};

// 通用扣积分函数
async function deductCredits(userId: number, currentCredits: number, amount: number, note: string) {
  const { getDb } = await import("../db");
  const { users, creditLogs } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const db = await getDb();
  if (!db) return currentCredits;
  const newCredits = currentCredits - amount;
  await db.update(users).set({ credits: newCredits }).where(eq(users.id, userId));
  await db.insert(creditLogs).values({
    userId,
    delta: -amount,
    balance: newCredits,
    action: "generate_prompt",
    note,
  });
  return newCredits;
}

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
      mjPrompt: z.string().optional(),
      mainPrompt: z.string().optional(),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return createAsset({
        userId: ctx.user.id,
        type: input.type,
        name: input.name,
        description: input.description,
        mjPrompt: input.mjPrompt,
        mainPrompt: input.mainPrompt,
        projectId: input.projectId,
      });
    }),

  // 更新资产基本信息（包含提示词）
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(128).optional(),
      description: z.string().optional(),
      mjPrompt: z.string().optional(),
      mainPrompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetById(input.id, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });
      await updateAsset(input.id, ctx.user.id, {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.mjPrompt !== undefined && { mjPrompt: input.mjPrompt }),
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

  // 上传 MJ 原图到 S3（前端 base64 → 后端上传）
  uploadImage: protectedProcedure
    .input(z.object({
      id: z.number(),
      // base64 编码的图片数据（不含 data:image/xxx;base64, 前缀）
      imageBase64: z.string().min(1),
      mimeType: z.string().default("image/png"),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetById(input.id, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });

      try {
        const imgBuffer = Buffer.from(input.imageBase64, "base64");
        // 限制 16MB
        if (imgBuffer.length > 16 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "图片大小不能超过 16MB" });
        }
        const ext = input.mimeType.split("/")[1] ?? "png";
        const fileKey = `assets/${ctx.user.id}/${input.id}-upload-${nanoid(8)}.${ext}`;
        const { url: s3Url } = await storagePut(fileKey, imgBuffer, input.mimeType);

        // 保存上传图 URL
        await updateAsset(input.id, ctx.user.id, { uploadedImageUrl: s3Url });
        return { success: true, uploadedImageUrl: s3Url };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "图片上传失败，请重试" });
      }
    }),

  // 基于上传图生成主视图（Nano Banana Pro 图生图）
  generateMain: protectedProcedure
    .input(z.object({
      id: z.number(),
      prompt: z.string().optional(),  // 辅助提示词（可选）
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetById(input.id, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });
      if (!asset.uploadedImageUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "请先上传 MJ 参考图" });
      }

      if (ctx.user.credits < CREDITS.generateMain) {
        throw new TRPCError({ code: "FORBIDDEN", message: `积分不足，生成主视图需要 ${CREDITS.generateMain} 积分` });
      }

      await updateAsset(input.id, ctx.user.id, { status: "generating" });

      try {
        const typeLabel = asset.type === "character" ? "character, front view, full body" : "scene, establishing shot";
        const promptText = input.prompt
          ? `${typeLabel}, ${input.prompt}, maintain exact same style and appearance as reference, high quality, 4K`
          : `${typeLabel}, maintain exact same style and appearance as reference, high quality, 4K`;

        // 使用图生图模式：传入参考图
        const genResult = await generateImage({
          prompt: promptText,
          originalImages: [{ url: asset.uploadedImageUrl, mimeType: "image/jpeg" }],
        });
        if (!genResult.url) throw new Error("图片生成返回空URL");

        // 下载并上传到 S3
        const imgResp = await fetch(genResult.url);
        const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
        const fileKey = `assets/${ctx.user.id}/${input.id}-main-${nanoid(8)}.png`;
        const { url: s3Url } = await storagePut(fileKey, imgBuffer, "image/png");

        // 扣积分
        await deductCredits(ctx.user.id, ctx.user.credits, CREDITS.generateMain, `生成资产主视图: ${asset.name}`);

        // 保存到历史记录
        await addAssetHistory({
          assetId: input.id,
          userId: ctx.user.id,
          imageType: "main",
          imageUrl: s3Url,
          prompt: promptText,
        });

        // 更新资产
        await updateAsset(input.id, ctx.user.id, {
          mainImageUrl: s3Url,
          generationModel: "nano-banana-pro",
          status: "done",
          ...(input.prompt && { mainPrompt: input.prompt }),
        });

        return { success: true, imageUrl: s3Url };
      } catch (err) {
        await updateAsset(input.id, ctx.user.id, { status: "failed" });
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "图片生成失败，请重试" });
      }
    }),

  // 基于上传图生成三视图/多视角图
  generateMultiView: protectedProcedure
    .input(z.object({
      id: z.number(),
      viewType: z.enum(["front", "side", "back", "angle1", "angle2", "angle3"]),
      prompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetById(input.id, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });
      if (!asset.uploadedImageUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "请先上传 MJ 参考图" });
      }

      if (ctx.user.credits < CREDITS.generateMulti) {
        throw new TRPCError({ code: "FORBIDDEN", message: `积分不足，生成多视角图需要 ${CREDITS.generateMulti} 积分` });
      }

      const viewLabels: Record<string, string> = {
        front: "front view, facing camera directly",
        side: "side profile view, 90 degrees",
        back: "back view, rear facing",
        angle1: "three-quarter view, 45 degrees",
        angle2: "bird eye view, top-down angle",
        angle3: "worm eye view, low angle looking up",
      };

      const typeLabel = asset.type === "character" ? "character concept art, full body" : "scene concept art";
      const basePrompt = input.prompt ?? asset.mainPrompt ?? "";
      const fullPrompt = `${typeLabel}, ${viewLabels[input.viewType]}, ${basePrompt ? basePrompt + ", " : ""}maintain exact same style and appearance as reference, consistent design, high quality, 4K`;

      try {
        const genResult = await generateImage({
          prompt: fullPrompt,
          originalImages: [{ url: asset.uploadedImageUrl, mimeType: "image/jpeg" }],
        });
        if (!genResult.url) throw new Error("图片生成返回空URL");

        const imgResp = await fetch(genResult.url);
        const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
        const fileKey = `assets/${ctx.user.id}/${input.id}-${input.viewType}-${nanoid(8)}.png`;
        const { url: s3Url } = await storagePut(fileKey, imgBuffer, "image/png");

        // 保存到历史记录
        await addAssetHistory({
          assetId: input.id,
          userId: ctx.user.id,
          imageType: input.viewType,
          imageUrl: s3Url,
          prompt: fullPrompt,
        });

        // 更新 multiViewUrls
        const existing = asset.multiViewUrls ? JSON.parse(asset.multiViewUrls) : {};
        existing[input.viewType] = s3Url;
        await updateAsset(input.id, ctx.user.id, {
          multiViewUrls: JSON.stringify(existing),
          status: "done",
        });

        // 扣积分
        await deductCredits(ctx.user.id, ctx.user.credits, CREDITS.generateMulti, `生成资产多视角图(${input.viewType}): ${asset.name}`);

        return { success: true, imageUrl: s3Url, viewType: input.viewType };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "图片生成失败，请重试" });
      }
    }),

  // 获取资产历史记录
  getHistory: protectedProcedure
    .input(z.object({ id: z.number(), imageType: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const asset = await getAssetById(input.id, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });
      return getAssetHistory(input.id, input.imageType);
    }),

  // 从历史记录中选择一张作为当前版本
  selectHistoryVersion: protectedProcedure
    .input(z.object({
      assetId: z.number(),
      historyId: z.number(),
      imageType: z.string(),
      imageUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetById(input.assetId, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });

      if (input.imageType === "main") {
        await updateAsset(input.assetId, ctx.user.id, { mainImageUrl: input.imageUrl });
      } else {
        const existing = asset.multiViewUrls ? JSON.parse(asset.multiViewUrls) : {};
        existing[input.imageType] = input.imageUrl;
        await updateAsset(input.assetId, ctx.user.id, { multiViewUrls: JSON.stringify(existing) });
      }
      return { success: true };
    }),
});
