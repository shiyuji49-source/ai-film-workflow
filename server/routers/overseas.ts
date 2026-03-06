import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { overseasProjects, scriptShots, videoJobs, overseasAssets } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

// ─── 项目 CRUD ────────────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  name: z.string().min(1).max(128),
  market: z.string().default("us"),
  aspectRatio: z.enum(["landscape", "portrait"]).default("portrait"),
  style: z.enum(["realistic", "animation", "cg"]).default("realistic"),
  genre: z.string().default("romance"),
  totalEpisodes: z.number().int().min(1).max(100).default(20),
});

const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.number().int(),
  characters: z.string().optional(),
  scenes: z.string().optional(),
  status: z.enum(["draft", "in_progress", "completed"]).optional(),
});

// ─── 剧本解析 ─────────────────────────────────────────────────────────────────

const parseScriptSchema = z.object({
  projectId: z.number().int(),
  episodeNumber: z.number().int().min(1),
  scriptText: z.string().min(10),
  language: z.string().default("en"), // 目标语言
});

// ─── 首尾帧生成 ───────────────────────────────────────────────────────────────

const generateFrameSchema = z.object({
  shotId: z.number().int(),
  frameType: z.enum(["first", "last"]),
  referenceImageUrls: z.array(z.string().url()).optional(), // 人物/场景参考图
});

// ─── 视频生成 ─────────────────────────────────────────────────────────────────

const generateVideoSchema = z.object({
  shotId: z.number().int(),
  engine: z.enum(["seedance_1_5", "veo_3_1"]).default("seedance_1_5"),
  duration: z.number().int().min(4).max(12).default(5),
  aspectRatio: z.enum(["16:9", "9:16"]).default("9:16"),
  generateAudio: z.boolean().default(true),
  useLastFrame: z.boolean().default(false),
  referenceImageUrls: z.array(z.string().url()).max(3).optional(), // Veo 3.1 参考图
});

export const overseasRouter = router({
  // ── 列出所有项目 ──────────────────────────────────────────────────────────
  listProjects: protectedProcedure.query(async ({ ctx }) => {
    const rows = await (await getDb())!
      .select()
      .from(overseasProjects)
      .where(and(eq(overseasProjects.userId, ctx.user.id), eq(overseasProjects.isDeleted, false)))
      .orderBy(desc(overseasProjects.updatedAt));
    return rows;
  }),

  // ── 创建项目 ──────────────────────────────────────────────────────────────
  createProject: protectedProcedure.input(createProjectSchema).mutation(async ({ ctx, input }) => {
    const [result] = await (await getDb())!.insert(overseasProjects).values({
      userId: ctx.user.id,
      name: input.name,
      market: input.market,
      aspectRatio: input.aspectRatio,
      style: input.style,
      genre: input.genre,
      totalEpisodes: input.totalEpisodes,
      status: "draft",
    });
    const id = (result as any).insertId as number;
    const [project] = await (await getDb())!.select().from(overseasProjects).where(eq(overseasProjects.id, id));
    return project;
  }),

  // ── 更新项目 ──────────────────────────────────────────────────────────────
  updateProject: protectedProcedure.input(updateProjectSchema).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    await (await getDb())!
      .update(overseasProjects)
      .set(rest)
      .where(and(eq(overseasProjects.id, id), eq(overseasProjects.userId, ctx.user.id)));
    const [project] = await (await getDb())!.select().from(overseasProjects).where(eq(overseasProjects.id, id));
    return project;
  }),

  // ── 删除项目 ──────────────────────────────────────────────────────────────
  deleteProject: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    await (await getDb())!
      .update(overseasProjects)
      .set({ isDeleted: true })
      .where(and(eq(overseasProjects.id, input.id), eq(overseasProjects.userId, ctx.user.id)));
    return { success: true };
  }),

  // ── 获取单个项目（含分镜） ────────────────────────────────────────────────
  getProject: protectedProcedure.input(z.object({ id: z.number().int() })).query(async ({ ctx, input }) => {
    const [project] = await (await getDb())!
      .select()
      .from(overseasProjects)
      .where(and(eq(overseasProjects.id, input.id), eq(overseasProjects.userId, ctx.user.id)));
    if (!project) throw new Error("Project not found");

    const shots = await (await getDb())!
      .select()
      .from(scriptShots)
      .where(and(eq(scriptShots.projectId, input.id), eq(scriptShots.userId, ctx.user.id)))
      .orderBy(scriptShots.episodeNumber, scriptShots.shotNumber);

    return { project, shots };
  }),

  // ── AI 解析剧本，生成分镜表 ───────────────────────────────────────────────
  parseScript: protectedProcedure.input(parseScriptSchema).mutation(async ({ ctx, input }) => {
    const { projectId, episodeNumber, scriptText, language } = input;

    // 获取项目信息
    const [project] = await (await getDb())!
      .select()
      .from(overseasProjects)
      .where(and(eq(overseasProjects.id, projectId), eq(overseasProjects.userId, ctx.user.id)));
    if (!project) throw new Error("Project not found");

    const aspectLabel = project.aspectRatio === "portrait" ? "vertical 9:16" : "horizontal 16:9";
    const langLabel = language === "en" ? "English" : language === "zh" ? "Chinese" : language;

    const systemPrompt = `You are a professional short drama director and script breakdown specialist. 
Your task is to analyze a short drama script and break it down into individual shots for AI video generation.

Rules:
- Generate 20-30 shots per episode maximum. Do NOT invent shots not in the script.
- Each shot should be 4-8 seconds of video content
- All dialogue/narration must be in ${langLabel}
- Visual descriptions must be detailed enough for AI image generation
- Style: ${project.style} (photorealistic for realistic, etc.)
- Aspect ratio: ${aspectLabel}
- Genre: ${project.genre}
- NO background music, NO subtitles in visual descriptions
- Strictly follow the script content, do not add scenes not in the script`;

    const userPrompt = `Analyze this Episode ${episodeNumber} script and generate a shot breakdown:

${scriptText}

Return a JSON array of shots with this exact schema:
[
  {
    "shotNumber": 1,
    "sceneName": "Scene name",
    "shotType": "close_up|medium|wide|extreme_close|aerial|over_shoulder",
    "visualDescription": "Detailed English description of what's in the frame for AI image generation. Include: subject, action, setting, lighting, camera angle, mood. No subtitles, no background music.",
    "dialogue": "Character dialogue or narration in ${langLabel}, or empty string if none",
    "characters": "comma-separated character names in this shot",
    "emotion": "emotional tone: tense|romantic|dramatic|comedic|mysterious|action|sad|happy"
  }
]

Important: Return ONLY the JSON array, no markdown, no explanation.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "shot_breakdown",
          strict: true,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                shotNumber: { type: "integer" },
                sceneName: { type: "string" },
                shotType: { type: "string" },
                visualDescription: { type: "string" },
                dialogue: { type: "string" },
                characters: { type: "string" },
                emotion: { type: "string" },
              },
              required: ["shotNumber", "sceneName", "shotType", "visualDescription", "dialogue", "characters", "emotion"],
              additionalProperties: false,
            },
          },
        },
      },
    });

    const content = response.choices[0].message.content as string;
    let shots: Array<{
      shotNumber: number;
      sceneName: string;
      shotType: string;
      visualDescription: string;
      dialogue: string;
      characters: string;
      emotion: string;
    }>;

    try {
      shots = JSON.parse(content);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    // 删除该集已有分镜
    await (await getDb())!
      .delete(scriptShots)
      .where(
        and(
          eq(scriptShots.projectId, projectId),
          eq(scriptShots.userId, ctx.user.id),
          eq(scriptShots.episodeNumber, episodeNumber)
        )
      );

    // 批量插入新分镜
    if (shots.length > 0) {
      await (await getDb())!.insert(scriptShots).values(
        shots.map((s) => ({
          projectId,
          userId: ctx.user.id,
          episodeNumber,
          shotNumber: s.shotNumber,
          sceneName: s.sceneName,
          shotType: s.shotType,
          visualDescription: s.visualDescription,
          dialogue: s.dialogue,
          characters: s.characters,
          emotion: s.emotion,
          status: "draft" as const,
        }))
      );
    }

    const insertedShots = await (await getDb())!
      .select()
      .from(scriptShots)
      .where(
        and(
          eq(scriptShots.projectId, projectId),
          eq(scriptShots.userId, ctx.user.id),
          eq(scriptShots.episodeNumber, episodeNumber)
        )
      )
      .orderBy(scriptShots.shotNumber);

    return { shots: insertedShots, count: insertedShots.length };
  }),

  // ── 生成首帧或尾帧图片 ────────────────────────────────────────────────────
  generateFrame: protectedProcedure.input(generateFrameSchema).mutation(async ({ ctx, input }) => {
    const { shotId, frameType, referenceImageUrls } = input;

    const [shot] = await (await getDb())!
      .select()
      .from(scriptShots)
      .where(and(eq(scriptShots.id, shotId), eq(scriptShots.userId, ctx.user.id)));
    if (!shot) throw new Error("Shot not found");

    const [project] = await (await getDb())!
      .select()
      .from(overseasProjects)
      .where(eq(overseasProjects.id, shot.projectId));
    if (!project) throw new Error("Project not found");

    const aspectLabel = project.aspectRatio === "portrait" ? "9:16 vertical portrait" : "16:9 horizontal landscape";
    const isLastFrame = frameType === "last";

    // 生成帧提示词
    const framePromptResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert AI image prompt writer for ${project.style} short drama production.
Generate a detailed image generation prompt for a ${isLastFrame ? "final/ending" : "opening/starting"} frame.
Style: ${project.style} photorealistic
Aspect ratio: ${aspectLabel}
No subtitles, no text overlays, no watermarks, no background music notation.`,
        },
        {
          role: "user",
          content: `Shot visual description: ${shot.visualDescription}
${shot.dialogue ? `Dialogue context: ${shot.dialogue}` : ""}
Characters in shot: ${shot.characters || "none"}
Emotion/mood: ${shot.emotion || "neutral"}
Shot type: ${shot.shotType || "medium shot"}

Generate a concise but detailed image prompt for the ${isLastFrame ? "LAST frame (ending moment)" : "FIRST frame (opening moment)"} of this shot.
Include: subject position, expression/action, environment details, lighting, camera angle.
Return ONLY the prompt text, no explanation.`,
        },
      ],
    });

    const framePrompt = (framePromptResponse.choices[0].message.content as string).trim();

    // 使用 Nano Banana Pro 生成帧图片
    const originalImages =
      referenceImageUrls && referenceImageUrls.length > 0
        ? referenceImageUrls.slice(0, 3).map((url) => ({ url, mimeType: "image/jpeg" as const }))
        : undefined;

    const genResult = await generateImage({
      prompt: framePrompt,
      originalImages,
    });
    if (!genResult.url) throw new Error("Image generation returned no URL");
    const imageUrl = genResult.url;

    // 图片已经由 generateImage 上传到 S3，直接使用返回的 URL
    const s3Url = imageUrl;

    // 更新数据库
    if (frameType === "first") {
      await (await getDb())!
        .update(scriptShots)
        .set({ firstFrameUrl: s3Url, firstFramePrompt: framePrompt, status: "frame_done" })
        .where(eq(scriptShots.id, shotId));
    } else {
      await (await getDb())!
        .update(scriptShots)
        .set({ lastFrameUrl: s3Url, lastFramePrompt: framePrompt })
        .where(eq(scriptShots.id, shotId));
    }

    return { url: s3Url, prompt: framePrompt };
  }),

  // ── 生成视频提示词 ────────────────────────────────────────────────────────
  generateVideoPrompt: protectedProcedure
    .input(z.object({ shotId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [shot] = await (await getDb())!
        .select()
        .from(scriptShots)
        .where(and(eq(scriptShots.id, input.shotId), eq(scriptShots.userId, ctx.user.id)));
      if (!shot) throw new Error("Shot not found");

      const [project] = await (await getDb())!
        .select()
        .from(overseasProjects)
        .where(eq(overseasProjects.id, shot.projectId));

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert AI video prompt writer for ${project?.style || "realistic"} short drama production.
Write concise, cinematic video generation prompts optimized for Seedance 1.5 or Veo 3.1.
No background music. No subtitles in the video. No watermarks.`,
          },
          {
            role: "user",
            content: `Shot description: ${shot.visualDescription}
${shot.dialogue ? `Dialogue: "${shot.dialogue}"` : "No dialogue"}
Characters: ${shot.characters || "none"}
Emotion: ${shot.emotion || "neutral"}
Shot type: ${shot.shotType || "medium shot"}

Write a video generation prompt (2-4 sentences) that:
1. Describes the visual action and movement
2. ${shot.dialogue ? `Includes the dialogue naturally: "${shot.dialogue}"` : "Describes ambient sound if relevant"}
3. Specifies camera movement (static/pan/zoom/dolly)
4. Sets the mood and lighting
Return ONLY the prompt, no explanation.`,
          },
        ],
      });

      const videoPrompt = (response.choices[0].message.content as string).trim();

      await (await getDb())!
        .update(scriptShots)
        .set({ videoPrompt })
        .where(eq(scriptShots.id, input.shotId));

      return { videoPrompt };
    }),

  // ── 触发视频生成（Seedance 1.5 via fal.ai） ───────────────────────────────
  generateVideo: protectedProcedure.input(generateVideoSchema).mutation(async ({ ctx, input }) => {
    const { shotId, engine, duration, aspectRatio, generateAudio, useLastFrame, referenceImageUrls } = input;

    const [shot] = await (await getDb())!
      .select()
      .from(scriptShots)
      .where(and(eq(scriptShots.id, shotId), eq(scriptShots.userId, ctx.user.id)));
    if (!shot) throw new Error("Shot not found");
    if (!shot.firstFrameUrl) throw new Error("First frame image is required before generating video");
    if (!shot.videoPrompt) throw new Error("Video prompt is required. Generate it first.");

    // 更新状态
    await (await getDb())!
      .update(scriptShots)
      .set({ status: "generating_video", videoEngine: engine })
      .where(eq(scriptShots.id, shotId));

    // 创建任务记录
    const [jobResult] = await (await getDb())!.insert(videoJobs).values({
      userId: ctx.user.id,
      shotId,
      engine,
      status: "pending",
    });
    const jobId = (jobResult as any).insertId as number;

    try {
      let videoUrl: string;

      if (engine === "seedance_1_5") {
        // Seedance 1.5 via fal.ai
        const FAL_KEY = process.env.FAL_API_KEY;
        if (!FAL_KEY) throw new Error("FAL_API_KEY not configured");

        const payload: Record<string, unknown> = {
          prompt: shot.videoPrompt,
          image_url: shot.firstFrameUrl,
          aspect_ratio: aspectRatio,
          resolution: "720p",
          duration: String(duration),
          generate_audio: generateAudio,
          camera_fixed: false,
        };
        if (useLastFrame && shot.lastFrameUrl) {
          payload.end_image_url = shot.lastFrameUrl;
        }

        const submitResp = await fetch(
          "https://queue.fal.run/fal-ai/bytedance/seedance/v1.5/pro/image-to-video",
          {
            method: "POST",
            headers: {
              "Authorization": `Key ${FAL_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
        if (!submitResp.ok) {
          const err = await submitResp.text();
          throw new Error(`Seedance submit failed: ${err}`);
        }
        const submitData = await submitResp.json() as { request_id: string; status: string };
        const requestId = submitData.request_id;

        // 更新外部任务 ID
        await (await getDb())!.update(videoJobs).set({ externalJobId: requestId, status: "processing" }).where(eq(videoJobs.id, jobId));

        // 轮询结果（最多等待 3 分钟）
        let pollResult: { video?: { url: string } } | null = null;
        for (let i = 0; i < 36; i++) {
          await new Promise((r) => setTimeout(r, 5000));
          const statusResp = await fetch(
            `https://queue.fal.run/fal-ai/bytedance/seedance/v1.5/pro/image-to-video/requests/${requestId}`,
            { headers: { "Authorization": `Key ${FAL_KEY}` } }
          );
          if (statusResp.ok) {
            const statusData = await statusResp.json() as { status?: string; video?: { url: string } };
            if (statusData.status === "COMPLETED" || statusData.video) {
              pollResult = statusData as { video?: { url: string } };
              break;
            }
          }
        }

        if (!pollResult?.video?.url) throw new Error("Seedance video generation timed out");
        videoUrl = pollResult.video.url;
      } else {
        // Veo 3.1 via Gemini API
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY not configured");

        // 下载首帧图片转 base64
        if (!shot.firstFrameUrl) throw new Error("First frame URL is required for Veo 3.1");
        const imgResp = await fetch(shot.firstFrameUrl);
        const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
        const imgBase64 = imgBuffer.toString("base64");
        const imgMime = "image/jpeg";

        const veoPayload: Record<string, unknown> = {
          model: "veo-3.1-generate-preview",
          prompt: shot.videoPrompt,
          image: { bytesBase64Encoded: imgBase64, mimeType: imgMime },
          generationConfig: {
            aspectRatio,
            durationSeconds: Math.min(duration, 8),
            resolution: "720p",
            personGeneration: "allow_adult",
          },
        };

        // 尾帧
        if (useLastFrame && shot.lastFrameUrl) {
          const lastImgResp = await fetch(shot.lastFrameUrl);
          const lastImgBuffer = Buffer.from(await lastImgResp.arrayBuffer());
          veoPayload.lastFrame = {
            bytesBase64Encoded: lastImgBuffer.toString("base64"),
            mimeType: imgMime,
          };
        }

        // 参考图（最多3张）
        if (referenceImageUrls && referenceImageUrls.length > 0) {
          const refImages = await Promise.all(
            referenceImageUrls.slice(0, 3).map(async (url) => {
              const r = await fetch(url);
              const buf = Buffer.from(await r.arrayBuffer());
              return {
                image: { bytesBase64Encoded: buf.toString("base64"), mimeType: "image/jpeg" },
                referenceType: "asset",
              };
            })
          );
          (veoPayload.generationConfig as Record<string, unknown>).referenceImages = refImages;
        }

        const veoResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning?key=${GEMINI_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(veoPayload),
          }
        );
        if (!veoResp.ok) {
          const err = await veoResp.text();
          throw new Error(`Veo 3.1 submit failed: ${err}`);
        }
        const veoData = await veoResp.json() as { name: string };
        const operationName = veoData.name;

        await (await getDb())!.update(videoJobs).set({ externalJobId: operationName, status: "processing" }).where(eq(videoJobs.id, jobId));

        // 轮询
        let veoResult: { done?: boolean; response?: { generatedVideos?: Array<{ video?: { uri: string } }> } } | null = null;
        for (let i = 0; i < 36; i++) {
          await new Promise((r) => setTimeout(r, 5000));
          const opResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${GEMINI_KEY}`
          );
          if (opResp.ok) {
            const opData = await opResp.json() as { done?: boolean; response?: { generatedVideos?: Array<{ video?: { uri: string } }> } };
            if (opData.done) {
              veoResult = opData;
              break;
            }
          }
        }

        const veoVideoUri = veoResult?.response?.generatedVideos?.[0]?.video?.uri;
        if (!veoVideoUri) {
          throw new Error("Veo 3.1 video generation timed out");
        }
        videoUrl = veoVideoUri;
      }

      // 下载视频并上传到 S3
      const videoResp = await fetch(videoUrl);
      const videoBuffer = Buffer.from(await videoResp.arrayBuffer());
      const videoKey = `overseas/${ctx.user.id}/videos/${shotId}-${nanoid(8)}.mp4`;
      const { url: s3VideoUrl } = await storagePut(videoKey, videoBuffer, "video/mp4");

      // 更新数据库
      await (await getDb())!
        .update(scriptShots)
        .set({ videoUrl: s3VideoUrl, videoDuration: duration, status: "done" })
        .where(eq(scriptShots.id, shotId));
      await (await getDb())!
        .update(videoJobs)
        .set({ videoUrl: s3VideoUrl, status: "done" })
        .where(eq(videoJobs.id, jobId));

      return { videoUrl: s3VideoUrl };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await (await getDb())!
        .update(scriptShots)
        .set({ status: "failed", errorMessage })
        .where(eq(scriptShots.id, shotId));
      await (await getDb())!
        .update(videoJobs)
        .set({ status: "failed", errorMessage })
        .where(eq(videoJobs.id, jobId));
      throw err;
    }
  }),

  // ── 获取分镜列表（按集） ──────────────────────────────────────────────────
  listShots: protectedProcedure
    .input(z.object({ projectId: z.number().int(), episodeNumber: z.number().int().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(scriptShots.projectId, input.projectId),
        eq(scriptShots.userId, ctx.user.id),
      ];
      if (input.episodeNumber !== undefined) {
        conditions.push(eq(scriptShots.episodeNumber, input.episodeNumber));
      }
      const shots = await (await getDb())!
        .select()
        .from(scriptShots)
        .where(and(...conditions))
        .orderBy(scriptShots.episodeNumber, scriptShots.shotNumber);
      return shots;
    }),

  // ── 更新单个分镜 ──────────────────────────────────────────────────────────
  updateShot: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        visualDescription: z.string().optional(),
        dialogue: z.string().optional(),
        videoPrompt: z.string().optional(),
        shotType: z.string().optional(),
        emotion: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      await (await getDb())!
        .update(scriptShots)
        .set(rest)
        .where(and(eq(scriptShots.id, id), eq(scriptShots.userId, ctx.user.id)));
      const [shot] = await (await getDb())!.select().from(scriptShots).where(eq(scriptShots.id, id));
      return shot;
    }),

  // ── 删除分镜 ──────────────────────────────────────────────────────────────
  deleteShot: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await (await getDb())!
        .delete(scriptShots)
        .where(and(eq(scriptShots.id, input.id), eq(scriptShots.userId, ctx.user.id)));
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // 资产管理（人物 / 场景 / 道具）
  // ══════════════════════════════════════════════════════════════════════════

  listAssets: protectedProcedure
    .input(z.object({
      projectId: z.number().int(),
      type: z.enum(["character", "scene", "prop"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const conditions: ReturnType<typeof eq>[] = [
        eq(overseasAssets.projectId, input.projectId),
        eq(overseasAssets.userId, ctx.user.id),
      ];
      if (input.type) conditions.push(eq(overseasAssets.type, input.type));
      return db!.select().from(overseasAssets).where(and(...conditions)).orderBy(desc(overseasAssets.createdAt));
    }),

  createAsset: protectedProcedure
    .input(z.object({
      projectId: z.number().int(),
      type: z.enum(["character", "scene", "prop"]),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      tags: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [result] = await db!.insert(overseasAssets).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        type: input.type,
        name: input.name,
        description: input.description,
        tags: input.tags,
      });
      const insertId = (result as any).insertId as number;
      const [asset] = await db!.select().from(overseasAssets).where(eq(overseasAssets.id, insertId));
      return asset;
    }),

  updateAsset: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      name: z.string().optional(),
      description: z.string().optional(),
      mjPrompt: z.string().optional(),
      mjImageUrl: z.string().optional(),
      mainImageUrl: z.string().optional(),
      viewFrontUrl: z.string().optional(),
      viewSideUrl: z.string().optional(),
      viewBackUrl: z.string().optional(),
      tags: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const db = await getDb();
      await db!.update(overseasAssets).set(rest).where(
        and(eq(overseasAssets.id, id), eq(overseasAssets.userId, ctx.user.id))
      );
      const [asset] = await db!.select().from(overseasAssets).where(eq(overseasAssets.id, id));
      return asset;
    }),

  deleteAsset: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await (await getDb())!.delete(overseasAssets).where(
        and(eq(overseasAssets.id, input.id), eq(overseasAssets.userId, ctx.user.id))
      );
      return { success: true };
    }),

  generateAssetMjPrompt: protectedProcedure
    .input(z.object({
      assetId: z.number().int(),
      projectId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [asset] = await db!.select().from(overseasAssets).where(
        and(eq(overseasAssets.id, input.assetId), eq(overseasAssets.userId, ctx.user.id))
      );
      if (!asset) throw new Error("Asset not found");
      const [project] = await db!.select().from(overseasProjects).where(
        and(eq(overseasProjects.id, input.projectId), eq(overseasProjects.userId, ctx.user.id))
      );
      if (!project) throw new Error("Project not found");

      const styleMap: Record<string, string> = {
        realistic: "photorealistic, cinematic, real human, 8K",
        animation: "2D animation style, cel-shaded, vibrant colors",
        cg: "3D CGI render, Unreal Engine, hyper-detailed",
      };
      const styleKw = styleMap[project.style] ?? "photorealistic";
      const aspectNote = project.aspectRatio === "portrait" ? "portrait 9:16" : "landscape 16:9";

      const typePrompts: Record<string, string> = {
        character: `Generate a Midjourney v7 prompt for a character reference sheet. Character: "${asset.name}". Description: ${asset.description ?? "(none)"}. Style: ${styleKw}. Format: ${aspectNote} full-body, front view, clean background, no text, no watermark.`,
        scene: `Generate a Midjourney v7 prompt for a scene/location reference. Scene: "${asset.name}". Description: ${asset.description ?? "(none)"}. Style: ${styleKw}. Format: ${aspectNote} establishing shot, cinematic, no text, no watermark.`,
        prop: `Generate a Midjourney v7 prompt for a prop/object reference. Prop: "${asset.name}". Description: ${asset.description ?? "(none)"}. Style: ${styleKw}. Format: ${aspectNote} product shot, clean background, no text, no watermark.`,
      };

      const res = await invokeLLM({
        messages: [
          { role: "system", content: "You are a professional Midjourney prompt engineer. Output ONLY the raw prompt text, no explanation, no quotes, no markdown." },
          { role: "user", content: typePrompts[asset.type] },
        ],
      });
      const rawContent = res.choices[0]?.message?.content;
      const mjPrompt = (typeof rawContent === "string" ? rawContent : "").trim();
      await db!.update(overseasAssets).set({ mjPrompt }).where(eq(overseasAssets.id, asset.id));
      return { mjPrompt };
    }),

  generateAssetImage: protectedProcedure
    .input(z.object({
      assetId: z.number().int(),
      projectId: z.number().int(),
      viewType: z.enum(["main", "front", "side", "back"]).default("main"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [asset] = await db!.select().from(overseasAssets).where(
        and(eq(overseasAssets.id, input.assetId), eq(overseasAssets.userId, ctx.user.id))
      );
      if (!asset) throw new Error("Asset not found");
      if (!asset.mjImageUrl) throw new Error("Please upload MJ reference image first");

      const [project] = await db!.select().from(overseasProjects).where(
        and(eq(overseasProjects.id, input.projectId), eq(overseasProjects.userId, ctx.user.id))
      );
      if (!project) throw new Error("Project not found");

      const styleMap: Record<string, string> = {
        realistic: "photorealistic, cinematic, real human, 8K, film grain",
        animation: "2D animation, cel-shaded, clean lines, vibrant",
        cg: "3D CGI, Unreal Engine 5, hyper-detailed",
      };
      const styleKw = styleMap[project.style] ?? "photorealistic";
      const isPortrait = project.aspectRatio === "portrait";

      const viewLabels: Record<string, string> = {
        main: asset.type === "character" ? "full body, front facing, character reference" : (isPortrait ? "portrait composition" : "wide establishing shot"),
        front: "front view, full body",
        side: "side profile view, full body",
        back: "back view, full body",
      };

      const prompt = `${asset.name}, ${asset.description ?? ""}, ${viewLabels[input.viewType]}, ${styleKw}, no background music, no subtitles, no text, no watermark`;

      const { url: imageUrl } = await generateImage({
        prompt,
        originalImages: [{ url: asset.mjImageUrl, mimeType: "image/jpeg" }],
      });

      const resp = await fetch(imageUrl as string);
      const buf = Buffer.from(await resp.arrayBuffer());
      const key = `overseas-assets/${ctx.user.id}/${asset.id}-${input.viewType}-${nanoid(6)}.jpg`;
      const { url: s3Url } = await storagePut(key, buf, "image/jpeg");

      const fieldMap: Record<string, string> = {
        main: "mainImageUrl",
        front: "viewFrontUrl",
        side: "viewSideUrl",
        back: "viewBackUrl",
      };
      await db!.update(overseasAssets)
        .set({ [fieldMap[input.viewType]]: s3Url })
        .where(eq(overseasAssets.id, asset.id));

      return { url: s3Url, viewType: input.viewType };
    }),
});
