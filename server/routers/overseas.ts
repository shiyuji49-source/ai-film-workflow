import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { overseasProjects, scriptShots, videoJobs, overseasAssets, apiSettings } from "../../drizzle/schema";
import { eq, and, desc, asc, isNull, isNotNull } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import * as XLSX from "xlsx";

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
  language: z.string().default("en"),
});

// ─── 首尾帧生成 ───────────────────────────────────────────────────────────────

const generateFrameSchema = z.object({
  shotId: z.number().int(),
  frameType: z.enum(["first", "last"]),
  referenceImageUrls: z.array(z.string().url()).optional(),
});

// ─── 视频生成 ─────────────────────────────────────────────────────────────────

const generateVideoSchema = z.object({
  shotId: z.number().int(),
  engine: z.enum(["seedance_1_5", "veo_3_1", "kling_3_0"]).default("kling_3_0"),
  duration: z.number().int().min(4).max(12).default(5),
  aspectRatio: z.enum(["16:9", "9:16"]).default("9:16"),
  generateAudio: z.boolean().default(true),
  useLastFrame: z.boolean().default(false),
  referenceImageUrls: z.array(z.string().url()).max(4).optional(),
});

// ─── 批量跑量 ─────────────────────────────────────────────────────────────────

const batchRunSchema = z.object({
  projectId: z.number().int(),
  episodeNumbers: z.array(z.number().int()).min(1).max(30),
  engine: z.enum(["seedance_1_5", "veo_3_1", "kling_3_0"]).default("kling_3_0"),
  aspectRatio: z.enum(["16:9", "9:16"]).default("9:16"),
  duration: z.number().int().min(4).max(10).default(5),
  generateAudio: z.boolean().default(true),
  skipExisting: z.boolean().default(true), // 跳过已生成的镜头
});

// ─── Kling 3.0 视频生成辅助函数 ──────────────────────────────────────────────

async function generateKling3Video(params: {
  prompt: string;
  imageUrl: string;
  lastFrameUrl?: string;
  elementImageUrls?: string[]; // Elements 参考图（最多4张）
  aspectRatio: string;
  duration: number;
  falApiKey: string;
}): Promise<string> {
  const { prompt, imageUrl, lastFrameUrl, elementImageUrls, aspectRatio, duration, falApiKey } = params;

  // Kling 3.0 图生视频 payload
  const payload: Record<string, unknown> = {
    prompt,
    image_url: imageUrl,
    aspect_ratio: aspectRatio,
    duration: String(duration),
    cfg_scale: 0.5,
    camera_control: { type: "simple", config: { speed: 5 } },
  };

  // 尾帧（首尾帧模式）
  if (lastFrameUrl) {
    payload.tail_image_url = lastFrameUrl;
  }

  // Elements 参考图（人物/场景一致性）
  if (elementImageUrls && elementImageUrls.length > 0) {
    payload.elements = elementImageUrls.slice(0, 4).map((url) => ({
      image_url: url,
      reference_type: "subject", // 主体参考（人物/场景）
    }));
  }

  // 提交任务
  const submitResp = await fetch(
    "https://queue.fal.run/fal-ai/kling-video/v3/image-to-video",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${falApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!submitResp.ok) {
    const err = await submitResp.text();
    throw new Error(`Kling 3.0 submit failed: ${err}`);
  }

  const submitData = (await submitResp.json()) as { request_id: string };
  const requestId = submitData.request_id;

  // 轮询结果（最多等待 5 分钟）
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusResp = await fetch(
      `https://queue.fal.run/fal-ai/kling-video/v3/image-to-video/requests/${requestId}`,
      { headers: { Authorization: `Key ${falApiKey}` } }
    );
    if (statusResp.ok) {
      const statusData = (await statusResp.json()) as {
        status?: string;
        video?: { url: string };
      };
      if (statusData.status === "COMPLETED" || statusData.video?.url) {
        if (!statusData.video?.url) throw new Error("Kling 3.0: no video URL in response");
        return statusData.video.url;
      }
      if (statusData.status === "FAILED") {
        throw new Error("Kling 3.0 generation failed");
      }
    }
  }

  throw new Error("Kling 3.0 video generation timed out");
}

// ─── Seedance 1.5 视频生成辅助函数 ───────────────────────────────────────────

async function generateSeedance15Video(params: {
  prompt: string;
  imageUrl: string;
  lastFrameUrl?: string;
  aspectRatio: string;
  duration: number;
  generateAudio: boolean;
  falApiKey: string;
}): Promise<string> {
  const { prompt, imageUrl, lastFrameUrl, aspectRatio, duration, generateAudio, falApiKey } = params;

  const payload: Record<string, unknown> = {
    prompt,
    image_url: imageUrl,
    aspect_ratio: aspectRatio,
    resolution: "720p",
    duration: String(duration),
    generate_audio: generateAudio,
    camera_fixed: false,
  };
  if (lastFrameUrl) payload.end_image_url = lastFrameUrl;

  const submitResp = await fetch(
    "https://queue.fal.run/fal-ai/bytedance/seedance/v1.5/pro/image-to-video",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${falApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!submitResp.ok) {
    const err = await submitResp.text();
    throw new Error(`Seedance 1.5 submit failed: ${err}`);
  }

  const submitData = (await submitResp.json()) as { request_id: string };
  const requestId = submitData.request_id;

  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusResp = await fetch(
      `https://queue.fal.run/fal-ai/bytedance/seedance/v1.5/pro/image-to-video/requests/${requestId}`,
      { headers: { Authorization: `Key ${falApiKey}` } }
    );
    if (statusResp.ok) {
      const statusData = (await statusResp.json()) as {
        status?: string;
        video?: { url: string };
      };
      if (statusData.status === "COMPLETED" || statusData.video?.url) {
        if (!statusData.video?.url) throw new Error("Seedance 1.5: no video URL");
        return statusData.video.url;
      }
    }
  }

  throw new Error("Seedance 1.5 video generation timed out");
}

// ─── Veo 3.1 视频生成辅助函数 ─────────────────────────────────────────────────

async function generateVeo31Video(params: {
  prompt: string;
  imageUrl: string;
  lastFrameUrl?: string;
  aspectRatio: string;
  duration: number;
  referenceImageUrls?: string[];
  geminiKey: string;
}): Promise<string> {
  const { prompt, imageUrl, lastFrameUrl, aspectRatio, duration, referenceImageUrls, geminiKey } = params;

  const imgResp = await fetch(imageUrl);
  const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
  const imgBase64 = imgBuffer.toString("base64");

  const veoPayload: Record<string, unknown> = {
    model: "veo-3.1-generate-preview",
    prompt,
    image: { bytesBase64Encoded: imgBase64, mimeType: "image/jpeg" },
    generationConfig: {
      aspectRatio,
      durationSeconds: Math.min(duration, 8),
      resolution: "720p",
      personGeneration: "allow_adult",
    },
  };

  if (lastFrameUrl) {
    const lastImgResp = await fetch(lastFrameUrl);
    const lastImgBuffer = Buffer.from(await lastImgResp.arrayBuffer());
    veoPayload.lastFrame = {
      bytesBase64Encoded: lastImgBuffer.toString("base64"),
      mimeType: "image/jpeg",
    };
  }

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
    `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning?key=${geminiKey}`,
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

  const veoData = (await veoResp.json()) as { name: string };
  const operationName = veoData.name;

  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const opResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${geminiKey}`
    );
    if (opResp.ok) {
      const opData = (await opResp.json()) as {
        done?: boolean;
        response?: { generatedVideos?: Array<{ video?: { uri: string } }> };
      };
      if (opData.done) {
        const uri = opData.response?.generatedVideos?.[0]?.video?.uri;
        if (!uri) throw new Error("Veo 3.1: no video URI");
        return uri;
      }
    }
  }

  throw new Error("Veo 3.1 video generation timed out");
}

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

  // ── 获取项目进度统计 ──────────────────────────────────────────────────────
  getProjectProgress: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const shots = await (await getDb())!
        .select()
        .from(scriptShots)
        .where(and(eq(scriptShots.projectId, input.projectId), eq(scriptShots.userId, ctx.user.id)));

      // 按集分组统计
      const byEpisode: Record<number, {
        total: number; draft: number; framesDone: number; videoDone: number; failed: number;
      }> = {};

      for (const shot of shots) {
        const ep = shot.episodeNumber;
        if (!byEpisode[ep]) byEpisode[ep] = { total: 0, draft: 0, framesDone: 0, videoDone: 0, failed: 0 };
        byEpisode[ep].total++;
        if (shot.status === "draft" || shot.status === "generating_frame") byEpisode[ep].draft++;
        else if (shot.status === "frame_done" || shot.status === "generating_video") byEpisode[ep].framesDone++;
        else if (shot.status === "done") byEpisode[ep].videoDone++;
        else if (shot.status === "failed") byEpisode[ep].failed++;
      }

      const totalShots = shots.length;
      const doneShots = shots.filter((s) => s.status === "done").length;
      const framesDoneShots = shots.filter((s) => s.firstFrameUrl).length;
      const failedShots = shots.filter((s) => s.status === "failed").length;

      return {
        totalShots,
        doneShots,
        framesDoneShots,
        failedShots,
        byEpisode,
        overallProgress: totalShots > 0 ? Math.round((doneShots / totalShots) * 100) : 0,
      };
    }),

  // ── AI 解析剧本，生成分镜表 ───────────────────────────────────────────────
  parseScript: protectedProcedure.input(parseScriptSchema).mutation(async ({ ctx, input }) => {
    const { projectId, episodeNumber, scriptText, language } = input;

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

    await (await getDb())!
      .delete(scriptShots)
      .where(
        and(
          eq(scriptShots.projectId, projectId),
          eq(scriptShots.userId, ctx.user.id),
          eq(scriptShots.episodeNumber, episodeNumber)
        )
      );

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

  // ── 生成首帧或尾帧图片（Nano Banana Pro Reference to Video） ──────────────
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

    // 使用 Nano Banana Pro 生成帧图片（Reference to Video 模式）
    const originalImages =
      referenceImageUrls && referenceImageUrls.length > 0
        ? referenceImageUrls.slice(0, 3).map((url) => ({ url, mimeType: "image/jpeg" as const }))
        : undefined;

    const genResult = await generateImage({
      prompt: framePrompt,
      originalImages,
    });
    if (!genResult.url) throw new Error("Image generation returned no URL");

    const s3Url = genResult.url;

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
Write concise, cinematic video generation prompts optimized for Kling 3.0 or Seedance 1.5.
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

  // ── 触发视频生成（支持 Kling 3.0 / Seedance 1.5 / Veo 3.1） ─────────────
  generateVideo: protectedProcedure.input(generateVideoSchema).mutation(async ({ ctx, input }) => {
    const { shotId, engine, duration, aspectRatio, generateAudio, useLastFrame, referenceImageUrls } = input;

    const [shot] = await (await getDb())!
      .select()
      .from(scriptShots)
      .where(and(eq(scriptShots.id, shotId), eq(scriptShots.userId, ctx.user.id)));
    if (!shot) throw new Error("Shot not found");
    if (!shot.firstFrameUrl) throw new Error("First frame image is required before generating video");
    if (!shot.videoPrompt) throw new Error("Video prompt is required. Generate it first.");

    await (await getDb())!
      .update(scriptShots)
      .set({ status: "generating_video", videoEngine: engine })
      .where(eq(scriptShots.id, shotId));

    const [jobResult] = await (await getDb())!.insert(videoJobs).values({
      userId: ctx.user.id,
      shotId,
      engine,
      status: "pending",
    });
    const jobId = (jobResult as any).insertId as number;

    try {
      let videoUrl: string;

      if (engine === "kling_3_0") {
        // Kling 3.0 via fal.ai
        let FAL_KEY = process.env.FAL_API_KEY;
        const [userApiSetting] = await (await getDb())!
          .select({ falApiKey: apiSettings.falApiKey })
          .from(apiSettings)
          .where(eq(apiSettings.userId, ctx.user.id))
          .limit(1);
        if (userApiSetting?.falApiKey) FAL_KEY = userApiSetting.falApiKey;
        if (!FAL_KEY) throw new Error("请先在 AI 设置页面配置 Fal.ai API Key，用于 Kling 3.0 视频生成");

        await (await getDb())!.update(videoJobs).set({ status: "processing" }).where(eq(videoJobs.id, jobId));

        videoUrl = await generateKling3Video({
          prompt: shot.videoPrompt,
          imageUrl: shot.firstFrameUrl,
          lastFrameUrl: useLastFrame && shot.lastFrameUrl ? shot.lastFrameUrl : undefined,
          elementImageUrls: referenceImageUrls,
          aspectRatio,
          duration,
          falApiKey: FAL_KEY,
        });
      } else if (engine === "seedance_1_5") {
        let FAL_KEY = process.env.FAL_API_KEY;
        const [userApiSetting] = await (await getDb())!
          .select({ falApiKey: apiSettings.falApiKey })
          .from(apiSettings)
          .where(eq(apiSettings.userId, ctx.user.id))
          .limit(1);
        if (userApiSetting?.falApiKey) FAL_KEY = userApiSetting.falApiKey;
        if (!FAL_KEY) throw new Error("请先在 AI 设置页面配置 Fal.ai API Key");

        await (await getDb())!.update(videoJobs).set({ status: "processing" }).where(eq(videoJobs.id, jobId));

        videoUrl = await generateSeedance15Video({
          prompt: shot.videoPrompt,
          imageUrl: shot.firstFrameUrl,
          lastFrameUrl: useLastFrame && shot.lastFrameUrl ? shot.lastFrameUrl : undefined,
          aspectRatio,
          duration,
          generateAudio,
          falApiKey: FAL_KEY,
        });
      } else {
        // Veo 3.1
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY not configured");

        await (await getDb())!.update(videoJobs).set({ status: "processing" }).where(eq(videoJobs.id, jobId));

        videoUrl = await generateVeo31Video({
          prompt: shot.videoPrompt,
          imageUrl: shot.firstFrameUrl,
          lastFrameUrl: useLastFrame && shot.lastFrameUrl ? shot.lastFrameUrl : undefined,
          aspectRatio,
          duration,
          referenceImageUrls,
          geminiKey: GEMINI_KEY,
        });
      }

      // 下载视频并上传到 S3
      const videoResp = await fetch(videoUrl);
      const videoBuffer = Buffer.from(await videoResp.arrayBuffer());
      const videoKey = `overseas/${ctx.user.id}/videos/${shotId}-${nanoid(8)}.mp4`;
      const { url: s3VideoUrl } = await storagePut(videoKey, videoBuffer, "video/mp4");

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

  // ── 一键批量跑量（Agent 流水线：首帧→视频提示词→视频） ───────────────────
  batchRun: protectedProcedure.input(batchRunSchema).mutation(async ({ ctx, input }) => {
    const { projectId, episodeNumbers, engine, aspectRatio, duration, generateAudio, skipExisting } = input;

    const [project] = await (await getDb())!
      .select()
      .from(overseasProjects)
      .where(and(eq(overseasProjects.id, projectId), eq(overseasProjects.userId, ctx.user.id)));
    if (!project) throw new Error("Project not found");

    // 获取全局参考资产（isGlobalRef = true）
    const globalAssets = await (await getDb())!
      .select()
      .from(overseasAssets)
      .where(
        and(
          eq(overseasAssets.projectId, projectId),
          eq(overseasAssets.userId, ctx.user.id),
          eq(overseasAssets.isGlobalRef, true)
        )
      )
      .orderBy(asc(overseasAssets.sortOrder));

    // 全局参考图 URLs（优先使用 mainImageUrl，其次 mjImageUrl）
    const globalRefUrls = globalAssets
      .map((a) => a.mainImageUrl || a.mjImageUrl)
      .filter(Boolean) as string[];

    // 获取 fal.ai key
    let FAL_KEY = process.env.FAL_API_KEY;
    const [userApiSetting] = await (await getDb())!
      .select({ falApiKey: apiSettings.falApiKey })
      .from(apiSettings)
      .where(eq(apiSettings.userId, ctx.user.id))
      .limit(1);
    if (userApiSetting?.falApiKey) FAL_KEY = userApiSetting.falApiKey;

    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    if ((engine === "kling_3_0" || engine === "seedance_1_5") && !FAL_KEY) {
      throw new Error("请先在 AI 设置页面配置 Fal.ai API Key");
    }
    if (engine === "veo_3_1" && !GEMINI_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // 获取所有待处理的分镜
    const allShots = await (await getDb())!
      .select()
      .from(scriptShots)
      .where(
        and(
          eq(scriptShots.projectId, projectId),
          eq(scriptShots.userId, ctx.user.id)
        )
      )
      .orderBy(scriptShots.episodeNumber, scriptShots.shotNumber);

    const targetShots = allShots.filter((s) => episodeNumbers.includes(s.episodeNumber));

    // 过滤：跳过已完成的
    const shotsToProcess = skipExisting
      ? targetShots.filter((s) => s.status !== "done")
      : targetShots;

    let processed = 0;
    let failed = 0;
    const errors: Array<{ shotId: number; episodeNumber: number; shotNumber: number; error: string }> = [];

    // 串行处理每个镜头（避免 API 限流）
    for (const shot of shotsToProcess) {
      try {
        // STEP A: 生成首帧（如果没有）
        if (!shot.firstFrameUrl) {
          await (await getDb())!
            .update(scriptShots)
            .set({ status: "generating_frame" })
            .where(eq(scriptShots.id, shot.id));

          const framePromptResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are an expert AI image prompt writer for ${project.style} short drama production.
Generate a detailed image generation prompt for an opening/starting frame.
Style: ${project.style} photorealistic
Aspect ratio: ${project.aspectRatio === "portrait" ? "9:16 vertical portrait" : "16:9 horizontal landscape"}
No subtitles, no text overlays, no watermarks.`,
              },
              {
                role: "user",
                content: `Shot visual description: ${shot.visualDescription}
${shot.dialogue ? `Dialogue context: ${shot.dialogue}` : ""}
Characters in shot: ${shot.characters || "none"}
Emotion/mood: ${shot.emotion || "neutral"}
Shot type: ${shot.shotType || "medium shot"}

Generate a concise but detailed image prompt for the FIRST frame (opening moment) of this shot.
Include: subject position, expression/action, environment details, lighting, camera angle.
Return ONLY the prompt text, no explanation.`,
              },
            ],
          });

          const framePrompt = (framePromptResponse.choices[0].message.content as string).trim();

          // Nano Banana Pro Reference to Video（带全局参考图）
          const originalImages =
            globalRefUrls.length > 0
              ? globalRefUrls.slice(0, 3).map((url) => ({ url, mimeType: "image/jpeg" as const }))
              : undefined;

          const genResult = await generateImage({ prompt: framePrompt, originalImages });
          if (!genResult.url) throw new Error("Image generation returned no URL");

          await (await getDb())!
            .update(scriptShots)
            .set({ firstFrameUrl: genResult.url, firstFramePrompt: framePrompt, status: "frame_done" })
            .where(eq(scriptShots.id, shot.id));

          // 更新本地变量
          shot.firstFrameUrl = genResult.url;
          shot.firstFramePrompt = framePrompt;
          shot.status = "frame_done";
        }

        // STEP B: 生成视频提示词（如果没有）
        if (!shot.videoPrompt) {
          const vpResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are an expert AI video prompt writer for ${project.style} short drama production.
Write concise, cinematic video generation prompts optimized for Kling 3.0.
No background music. No subtitles. No watermarks.`,
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

          const videoPrompt = (vpResponse.choices[0].message.content as string).trim();
          await (await getDb())!
            .update(scriptShots)
            .set({ videoPrompt })
            .where(eq(scriptShots.id, shot.id));
          shot.videoPrompt = videoPrompt;
        }

        // STEP C: 生成视频
        await (await getDb())!
          .update(scriptShots)
          .set({ status: "generating_video", videoEngine: engine })
          .where(eq(scriptShots.id, shot.id));

        const [jobResult] = await (await getDb())!.insert(videoJobs).values({
          userId: ctx.user.id,
          shotId: shot.id,
          engine,
          status: "processing",
        });
        const jobId = (jobResult as any).insertId as number;

        let videoUrl: string;

        if (engine === "kling_3_0") {
          videoUrl = await generateKling3Video({
            prompt: shot.videoPrompt,
            imageUrl: shot.firstFrameUrl!,
            elementImageUrls: globalRefUrls.length > 0 ? globalRefUrls.slice(0, 4) : undefined,
            aspectRatio,
            duration,
            falApiKey: FAL_KEY!,
          });
        } else if (engine === "seedance_1_5") {
          videoUrl = await generateSeedance15Video({
            prompt: shot.videoPrompt,
            imageUrl: shot.firstFrameUrl!,
            aspectRatio,
            duration,
            generateAudio,
            falApiKey: FAL_KEY!,
          });
        } else {
          videoUrl = await generateVeo31Video({
            prompt: shot.videoPrompt,
            imageUrl: shot.firstFrameUrl!,
            aspectRatio,
            duration,
            referenceImageUrls: globalRefUrls.length > 0 ? globalRefUrls.slice(0, 3) : undefined,
            geminiKey: GEMINI_KEY!,
          });
        }

        // 下载并上传到 S3
        const videoResp = await fetch(videoUrl);
        const videoBuffer = Buffer.from(await videoResp.arrayBuffer());
        const videoKey = `overseas/${ctx.user.id}/videos/${shot.id}-${nanoid(8)}.mp4`;
        const { url: s3VideoUrl } = await storagePut(videoKey, videoBuffer, "video/mp4");

        await (await getDb())!
          .update(scriptShots)
          .set({ videoUrl: s3VideoUrl, videoDuration: duration, status: "done" })
          .where(eq(scriptShots.id, shot.id));
        await (await getDb())!
          .update(videoJobs)
          .set({ videoUrl: s3VideoUrl, status: "done" })
          .where(eq(videoJobs.id, jobId));

        processed++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        await (await getDb())!
          .update(scriptShots)
          .set({ status: "failed", errorMessage })
          .where(eq(scriptShots.id, shot.id));
        errors.push({
          shotId: shot.id,
          episodeNumber: shot.episodeNumber,
          shotNumber: shot.shotNumber,
          error: errorMessage,
        });
        failed++;
      }
    }

    return {
      total: shotsToProcess.length,
      processed,
      failed,
      errors,
    };
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
        firstFrameUrl: z.string().optional(),
        lastFrameUrl: z.string().optional(),
        status: z.enum(["draft", "generating_frame", "frame_done", "generating_video", "done", "failed"]).optional(),
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

  // ── 重置分镜状态（用于重新生成） ──────────────────────────────────────────
  resetShot: protectedProcedure
    .input(z.object({ id: z.number().int(), clearVideo: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = { status: "draft", errorMessage: null };
      if (input.clearVideo) {
        updateData.videoUrl = null;
        updateData.videoPrompt = null;
        updateData.firstFrameUrl = null;
        updateData.lastFrameUrl = null;
        updateData.firstFramePrompt = null;
        updateData.lastFramePrompt = null;
      }
      await (await getDb())!
        .update(scriptShots)
        .set(updateData)
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
      return db!.select().from(overseasAssets).where(and(...conditions)).orderBy(asc(overseasAssets.sortOrder), desc(overseasAssets.createdAt));
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
      isGlobalRef: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
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

  // ── Excel 分镜表导入 ───────────────────────────────────────────────────────
  importScriptFromExcel: protectedProcedure
    .input(z.object({
      projectId: z.number().int(),
      episodeNumber: z.number().int().min(1),
      fileBase64: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [project] = await db!.select().from(overseasProjects)
        .where(and(eq(overseasProjects.id, input.projectId), eq(overseasProjects.userId, ctx.user.id)));
      if (!project) throw new Error("Project not found");

      const buffer = Buffer.from(input.fileBase64, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

      const shots: Array<{ shotNumber: number; sceneName: string; visualDescription: string; dialogue: string | null; characters: string | null }> = [];
      for (const row of rows) {
        const idKeys = Object.keys(row).filter(k => /^(编号|shot|id|#)/i.test(k.trim()));
        const sceneKeys = Object.keys(row).filter(k => /^(场景|scene)/i.test(k.trim()));
        const contentKeys = Object.keys(row).filter(k => /^(画面|content|visual|description)/i.test(k.trim()));
        const dialogueKeys = Object.keys(row).filter(k => /^(台词|lines|dialogue|dialog)/i.test(k.trim()));
        const charKeys = Object.keys(row).filter(k => /^(角色|char|character)/i.test(k.trim()));

        const idVal = idKeys.length > 0 ? row[idKeys[0]] : null;
        if (!idVal || typeof idVal !== "number") continue;

        const shotNum = Math.round(idVal as number);
        const sceneName = sceneKeys.length > 0 ? String(row[sceneKeys[0]] ?? "") : "";
        const visualDesc = contentKeys.length > 0 ? String(row[contentKeys[0]] ?? "") : "";
        const dialogue = dialogueKeys.length > 0 && row[dialogueKeys[0]] ? String(row[dialogueKeys[0]]) : null;
        const characters = charKeys.length > 0 && row[charKeys[0]] ? String(row[charKeys[0]]) : null;

        if (!visualDesc.trim()) continue;
        shots.push({ shotNumber: shotNum, sceneName, visualDescription: visualDesc, dialogue, characters });
      }

      if (shots.length === 0) throw new Error("未找到有效分镜数据，请确认 Excel 格式正确");

      await db!.delete(scriptShots)
        .where(and(
          eq(scriptShots.projectId, input.projectId),
          eq(scriptShots.episodeNumber, input.episodeNumber),
          eq(scriptShots.userId, ctx.user.id),
        ));

      for (const s of shots) {
        await db!.insert(scriptShots).values({
          projectId: input.projectId,
          userId: ctx.user.id,
          episodeNumber: input.episodeNumber,
          shotNumber: s.shotNumber,
          sceneName: s.sceneName || undefined,
          visualDescription: s.visualDescription,
          dialogue: s.dialogue ?? undefined,
          characters: s.characters ?? undefined,
          status: "draft",
        });
      }

      return { imported: shots.length, episodeNumber: input.episodeNumber };
    }),
});
