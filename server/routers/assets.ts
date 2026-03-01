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
  generateMain: 10,           // 生成主视图
  generateMulti: 8,           // 生成三视图/多视角（每张）
  generateCharDesign: 15,     // 生成人物16:9设计主图
  splitCharDesign: 2,         // 切分设计图（每张）
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
    .input(z.object({ type: z.enum(["character", "scene", "prop"]).optional() }))
    .query(async ({ ctx, input }) => {
      return getUserAssets(ctx.user.id, input.type as "character" | "scene" | undefined);
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
      type: z.enum(["character", "scene", "prop"]),
      name: z.string().min(1).max(128),
      description: z.string().optional(),
      mjPrompt: z.string().optional(),
      mainPrompt: z.string().optional(),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return createAsset({
        userId: ctx.user.id,
        type: input.type as "character" | "scene",
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
      imageBase64: z.string().min(1),
      mimeType: z.string().default("image/png"),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetById(input.id, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });

      try {
        const imgBuffer = Buffer.from(input.imageBase64, "base64");
        if (imgBuffer.length > 16 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "图片大小不能超过 16MB" });
        }
        const ext = input.mimeType.split("/")[1] ?? "png";
        const fileKey = `assets/${ctx.user.id}/${input.id}-upload-${nanoid(8)}.${ext}`;
        const { url: s3Url } = await storagePut(fileKey, imgBuffer, input.mimeType);
        await updateAsset(input.id, ctx.user.id, { uploadedImageUrl: s3Url });
        return { success: true, uploadedImageUrl: s3Url };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "图片上传失败，请重试" });
      }
    }),

  // ── 人物资产专用：生成 16:9 角色设计主图（含近景+三视图布局）──
  generateCharacterDesign: protectedProcedure
    .input(z.object({
      id: z.number(),
      nanoPrompt: z.string().optional(), // Nano Banana Pro 辅助提示词
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetById(input.id, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });
      if (!asset.uploadedImageUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "请先上传 MJ 参考图" });
      }
      if (ctx.user.credits < CREDITS.generateCharDesign) {
        throw new TRPCError({ code: "FORBIDDEN", message: `积分不足，生成角色设计图需要 ${CREDITS.generateCharDesign} 积分` });
      }

      await updateAsset(input.id, ctx.user.id, { status: "generating" });

      try {
        // 使用用户提供的 NBP 提示词，或使用默认的角色设计图提示词
        const basePrompt = input.nanoPrompt?.trim() || "";
        // 强制横版 16:9 布局：左1/3大头像，右2/3三视图（正/侧/背）左右排列
        const layoutInstruction = `CHARACTER DESIGN SHEET. HORIZONTAL LANDSCAPE FORMAT, wider than tall, 16:9 aspect ratio. Divided into FOUR vertical columns side by side (left to right): [Column 1 - leftmost, 1/4 width] Large portrait/bust close-up of the character's face and upper body, filling the full height. [Column 2 - 1/4 width] Full-body FRONT VIEW, standing pose, full height. [Column 3 - 1/4 width] Full-body SIDE VIEW (profile), standing pose, full height. [Column 4 - rightmost, 1/4 width] Full-body BACK VIEW, standing pose, full height. All four panels are arranged horizontally in ONE ROW. Pure white background. No text labels. Clean anime character model sheet style. The image is LANDSCAPE (wide), NOT portrait (tall).`;
        const designPrompt = basePrompt
          ? `${layoutInstruction} Character description: ${basePrompt}. Maintain exact same art style and character appearance as the reference image.`
          : `${layoutInstruction} Maintain exact same art style and character appearance as the reference image. High quality, clean linework.`;

        const genResult = await generateImage({
          prompt: designPrompt,
          originalImages: [{ url: asset.uploadedImageUrl, mimeType: "image/jpeg" }],
        });
        if (!genResult.url) throw new Error("图片生成返回空URL");

        const imgResp = await fetch(genResult.url);
        const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
        const fileKey = `assets/${ctx.user.id}/${input.id}-chardesign-${nanoid(8)}.png`;
        const { url: s3Url } = await storagePut(fileKey, imgBuffer, "image/png");

        await deductCredits(ctx.user.id, ctx.user.credits, CREDITS.generateCharDesign, `生成角色设计主图: ${asset.name}`);

        await addAssetHistory({
          assetId: input.id,
          userId: ctx.user.id,
          imageType: "chardesign",
          imageUrl: s3Url,
          prompt: designPrompt,
        });

        await updateAsset(input.id, ctx.user.id, {
          mainImageUrl: s3Url,
          generationModel: "nano-banana-pro",
          status: "done",
          ...(input.nanoPrompt && { mainPrompt: input.nanoPrompt }),
        });

        return { success: true, imageUrl: s3Url };
      } catch (err) {
        await updateAsset(input.id, ctx.user.id, { status: "failed" });
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "图片生成失败，请重试" });
      }
    }),

  // ── 人物资产专用：切分 16:9 设计主图为 4 张图（近景/正视/侧视/后视）──
  splitCharacterDesign: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetById(input.id, ctx.user.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "资产不存在" });
      if (!asset.mainImageUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "请先生成角色设计主图" });
      }

      try {
        const sharp = (await import("sharp")).default;

        // 下载主图
        const imgResp = await fetch(asset.mainImageUrl);
        let imgBuffer = Buffer.from(await imgResp.arrayBuffer());
        let metadata = await sharp(imgBuffer).metadata();
        let W = metadata.width ?? 1600;
        let H = metadata.height ?? 900;

        // 4列横切：左1/4近景 | 中左1/4正视 | 中右1/4侧视 | 右1/4后视
        const colW = Math.floor(W / 4);

        const crops = [
          { key: "closeup", label: "近景",   left: 0,         top: 0, width: colW,           height: H },
          { key: "front",   label: "正视图", left: colW,      top: 0, width: colW,           height: H },
          { key: "side",    label: "侧视图", left: colW * 2,  top: 0, width: colW,           height: H },
          { key: "back",    label: "后视图", left: colW * 3,  top: 0, width: W - colW * 3,   height: H },
        ];

        const results: Record<string, string> = {};
        const existing = asset.multiViewUrls ? JSON.parse(asset.multiViewUrls) : {};

        for (const crop of crops) {
          const cropped = await sharp(imgBuffer)
            .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
            .png()
            .toBuffer();
          const fileKey = `assets/${ctx.user.id}/${input.id}-${crop.key}-${nanoid(8)}.png`;
          const { url: s3Url } = await storagePut(fileKey, cropped, "image/png");
          results[crop.key] = s3Url;
          existing[crop.key] = s3Url;

          await addAssetHistory({
            assetId: input.id,
            userId: ctx.user.id,
            imageType: crop.key,
            imageUrl: s3Url,
            prompt: `split from character design sheet: ${crop.label}`,
          });
        }

        await updateAsset(input.id, ctx.user.id, {
          multiViewUrls: JSON.stringify(existing),
          status: "done",
        });

        await deductCredits(ctx.user.id, ctx.user.credits, CREDITS.splitCharDesign * 4, `切分角色设计图: ${asset.name}`);

        return { success: true, splitUrls: results };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "图片切分失败，请重试" });
      }
    }),

  // 基于上传图生成主视图（Nano Banana Pro 图生图）
  generateMain: protectedProcedure
    .input(z.object({
      id: z.number(),
      prompt: z.string().optional(),
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
        const typeLabel = asset.type === "scene"
          ? "scene concept art, establishing shot, wide angle"
          : asset.type === "prop"
          ? "prop concept art, product view, clean background"
          : "character, front view, full body";
        const promptText = input.prompt
          ? `${typeLabel}, ${input.prompt}, maintain exact same style and appearance as reference, high quality, 4K`
          : `${typeLabel}, maintain exact same style and appearance as reference, high quality, 4K`;

        const genResult = await generateImage({
          prompt: promptText,
          originalImages: [{ url: asset.uploadedImageUrl, mimeType: "image/jpeg" }],
        });
        if (!genResult.url) throw new Error("图片生成返回空URL");

        const imgResp = await fetch(genResult.url);
        const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
        const fileKey = `assets/${ctx.user.id}/${input.id}-main-${nanoid(8)}.png`;
        const { url: s3Url } = await storagePut(fileKey, imgBuffer, "image/png");

        await deductCredits(ctx.user.id, ctx.user.credits, CREDITS.generateMain, `生成资产主视图: ${asset.name}`);

        await addAssetHistory({
          assetId: input.id,
          userId: ctx.user.id,
          imageType: "main",
          imageUrl: s3Url,
          prompt: promptText,
        });

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

        await addAssetHistory({
          assetId: input.id,
          userId: ctx.user.id,
          imageType: input.viewType,
          imageUrl: s3Url,
          prompt: fullPrompt,
        });

        const existing = asset.multiViewUrls ? JSON.parse(asset.multiViewUrls) : {};
        existing[input.viewType] = s3Url;
        await updateAsset(input.id, ctx.user.id, {
          multiViewUrls: JSON.stringify(existing),
          status: "done",
        });

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
