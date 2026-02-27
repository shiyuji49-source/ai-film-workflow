import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";

// ─── Gemini API helper ────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) throw new Error("GEMINI_API_KEY 未配置");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API 错误 ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const aiRouter = router({

  // ── 1. 剧本解析 ──────────────────────────────────────────────────────────────
  analyzeScript: publicProcedure
    .input(z.object({
      scriptText: z.string().min(10).max(200000),
      styleZh: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `你是一位专业的影视制作人和剧本分析师。请仔细阅读以下剧本，进行结构化分析。

【分析规则】
1. 集数识别：
   - 忽略剧本开头的简介、序言、人物介绍、世界观说明等非正文内容（通常标注为"序章"、"前言"、"人物介绍"或EP-01等）
   - 从第一个真正的故事集数开始（通常是EP-02或第一集正文）
   - 每集提取：集数编号、标题、时长（分钟）、剧情简介（100字内）
   
2. 人物识别（全局，不分集）：
   - 只提取真实的角色名，包括人类角色和机甲/机器人角色
   - 严格排除：场景说明、舞台指示、"出场人物"、"一卡"、"旁白"、"解说"、"画外音"、"字幕"等非角色词
   - 同一角色去重，不要出现"张三（快乐）"和"张三（悲伤）"这样的重复，只保留"张三"
   - 每个角色分析：姓名、角色定位（主角/配角/反派等）、外貌特征（肤色/发型/脸型/体型等）、服装特征、是否为机甲/机器人
   - 机甲识别关键词：机甲、战甲、机器人、战机、机械体、AI战士等
   
3. 场景识别（按集）：
   - 每集提取主要场景：场景名称、环境类型（室内/室外/太空等）、时间（白天/夜晚/黄昏等）、氛围描述、视觉特征
   
4. 道具识别（按集）：
   - 每集提取重要道具：名称、外观描述、材质、用途

【剧本内容】
${input.scriptText.slice(0, 80000)}

【输出格式】严格输出以下JSON结构，不要有任何额外说明：
{
  "episodes": [
    {
      "id": "ep01",
      "number": 1,
      "title": "集数标题",
      "duration": 5,
      "synopsis": "剧情简介",
      "scenes": [
        {
          "name": "场景名称",
          "environment": "室内/室外/太空等",
          "timeOfDay": "白天/夜晚/黄昏/清晨",
          "atmosphere": "氛围描述，如：紧张压抑、温暖宁静",
          "visualFeatures": "视觉特征描述，如：霓虹灯光、废墟废墟、金属质感"
        }
      ],
      "props": [
        {
          "name": "道具名称",
          "appearance": "外观描述",
          "material": "材质",
          "purpose": "用途"
        }
      ]
    }
  ],
  "characters": [
    {
      "name": "角色名",
      "role": "主角/配角/反派/机甲/其他",
      "isMecha": false,
      "appearance": "详细外貌：肤色、发型、发色、脸型、眼睛、体型、年龄感等",
      "costume": "服装描述：颜色、款式、材质、特殊标志等",
      "marks": "特殊标记：伤疤、纹身、特殊装备等（无则留空）",
      "personality": "性格特点（简短）"
    }
  ]
}`;

      const raw = await callGemini(prompt);
      // 清理 markdown 代码块
      const cleaned = raw.replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```\s*$/m, "").trim();
      const parsed = JSON.parse(cleaned) as {
        episodes: Array<{
          id: string; number: number; title: string; duration: number; synopsis: string;
          scenes: Array<{ name: string; environment: string; timeOfDay: string; atmosphere: string; visualFeatures: string }>;
          props: Array<{ name: string; appearance: string; material: string; purpose: string }>;
        }>;
        characters: Array<{
          name: string; role: string; isMecha: boolean; appearance: string;
          costume: string; marks: string; personality: string;
        }>;
      };
      return parsed;
    }),

  // ── 2. 生成人物 MJ7 提示词 ────────────────────────────────────────────────────
  generateCharacterPrompt: publicProcedure
    .input(z.object({
      name: z.string(),
      role: z.string(),
      isMecha: z.boolean(),
      appearance: z.string(),
      costume: z.string(),
      marks: z.string().optional(),
      styleZh: z.string().optional(),
      styleEn: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { name, isMecha, appearance, costume, marks, styleZh, styleEn } = input;

      const prompt = isMecha
        ? `你是专业的AI影片制作提示词工程师。请为以下机甲角色生成一张用于 Midjourney 7（MJ7）的竖版单张参考图提示词。

【机甲信息】
名称：${name}
外观特征：${appearance}
装甲/外壳：${costume}
特殊标记：${marks || "无"}
整体风格：${styleZh || "科幻机甲风格"}

【MJ7提示词要求】
- 生成一张竖版（2:3比例）的机甲全身参考图
- 纯黑色背景，蓝图辅助线风格
- 正面视角，全身展示，清晰展现机甲结构
- 强调金属质感、能量核心、装甲分层
- 中文提示词：详细描述机甲外观，包含材质、光效、科技感
- 英文提示词：对应的英文版本，用于直接输入MJ7
- 英文提示词末尾加上：--ar 2:3 --style raw --q 2
- 不要出现@符号，不要引用具体作品名称

请严格输出以下JSON格式：
{
  "zh": "中文提示词内容",
  "en": "English prompt content --ar 2:3 --style raw --q 2"
}`
        : `你是专业的AI影片制作提示词工程师。请为以下角色生成一张用于 Midjourney 7（MJ7）的竖版单张人物形象参考图提示词。

【角色信息】
姓名：${name}
外貌特征：${appearance}
服装描述：${costume}
特殊标记：${marks || "无"}
整体风格：${styleZh || ""}

【MJ7提示词要求】
- 生成一张竖版（2:3比例）的人物全身形象参考图
- 干净的深灰色渐变背景
- 正面站姿，全身展示，面部清晰可见
- 强调人物气质、服装细节、面部特征
- 中文提示词：详细描述人物外貌、服装、神态、光线
- 英文提示词：对应的英文版本，用于直接输入MJ7
- 英文提示词末尾加上：--ar 2:3 --style raw --q 2
- 不要出现@符号，不要引用具体作品名称

请严格输出以下JSON格式：
{
  "zh": "中文提示词内容",
  "en": "English prompt content --ar 2:3 --style raw --q 2"
}`;

      const raw = await callGemini(prompt);
      const cleaned = raw.replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```\s*$/m, "").trim();
      const parsed = JSON.parse(cleaned) as { zh: string; en: string };
      return parsed;
    }),

  // ── 3. 生成场景/道具 MJ7 提示词 ──────────────────────────────────────────────
  generateAssetPrompt: publicProcedure
    .input(z.object({
      type: z.enum(["scene", "prop"]),
      name: z.string(),
      description: z.string(),
      episodeContext: z.string().optional(),
      styleZh: z.string().optional(),
      styleEn: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { type, name, description, episodeContext, styleZh, styleEn } = input;

      const isScene = type === "scene";
      const prompt = isScene
        ? `你是专业的AI影片制作提示词工程师。请为以下场景生成用于 Midjourney 7（MJ7）的多角度场景参考图提示词。

【场景信息】
场景名称：${name}
场景描述：${description}
所在集数背景：${episodeContext || ""}
整体风格：${styleZh || ""}

【MJ7提示词要求】
- 生成一张横版（16:9比例）的场景环境参考图
- 展现场景的空间感、氛围、光线、材质
- 无人物，纯场景环境
- 中文提示词：详细描述场景的视觉元素、光影、氛围、色调
- 英文提示词：对应的英文版本，用于直接输入MJ7
- 英文提示词末尾加上：--ar 16:9 --style raw --q 2
- 不要出现@符号，不要引用具体作品名称

请严格输出以下JSON格式：
{
  "zh": "中文提示词内容",
  "en": "English prompt content --ar 16:9 --style raw --q 2"
}`
        : `你是专业的AI影片制作提示词工程师。请为以下道具生成用于 Midjourney 7（MJ7）的道具展示图提示词。

【道具信息】
道具名称：${name}
道具描述：${description}
所在集数背景：${episodeContext || ""}
整体风格：${styleZh || ""}

【MJ7提示词要求】
- 生成一张方形（1:1比例）的道具展示图
- 纯黑色或深色背景，产品展示风格
- 清晰展示道具的外观、材质、细节
- 中文提示词：详细描述道具的外观、材质、光泽、特殊效果
- 英文提示词：对应的英文版本，用于直接输入MJ7
- 英文提示词末尾加上：--ar 1:1 --style raw --q 2
- 不要出现@符号，不要引用具体作品名称

请严格输出以下JSON格式：
{
  "zh": "中文提示词内容",
  "en": "English prompt content --ar 1:1 --style raw --q 2"
}`;

      const raw = await callGemini(prompt);
      const cleaned = raw.replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```\s*$/m, "").trim();
      const parsed = JSON.parse(cleaned) as { zh: string; en: string };
      return parsed;
    }),

  // ── 4. 验证 Gemini API Key ────────────────────────────────────────────────────
  testConnection: publicProcedure
    .mutation(async () => {
      const result = await callGemini(JSON.stringify({ test: true }) + '\n请回复：{"status":"ok"}');
      return { ok: true, raw: result };
    }),
});
