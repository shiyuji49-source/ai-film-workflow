import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";

// Gemini API helper --------------------------------------------------------

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

// Router -------------------------------------------------------------------

export const aiRouter = router({

  // 1. 剧本解析 --------------------------------------------------------------
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

  // 2. 生成人物 MJ7 提示词 ----------------------------------------------------
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

  // 3. 生成场景/道具 MJ7 提示词 ----------------------------------------------
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

  // 4. AI 分镜生成 ------------------------------------------------------
  generateShots: publicProcedure
    .input(z.object({
      episodeTitle: z.string(),
      episodeNumber: z.number(),
      episodeSynopsis: z.string(),
      durationMinutes: z.number().min(1).max(30),
      scenes: z.array(z.string()),
      characters: z.array(z.string()),
      styleZh: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { episodeTitle, episodeNumber, episodeSynopsis, durationMinutes, scenes, characters, styleZh } = input;
      const targetShots = Math.round(durationMinutes * 25);

      const prompt = `你是专业的影视导演和分镜师。请根据以下剧本信息，为第${episodeNumber}集生成完整的分镜表。

【剧本信息】
集数标题：${episodeTitle}
剧情简介：${episodeSynopsis}
单集时长：${durationMinutes}分钟
主要场景：${scenes.join('、')}
出场人物：${characters.join('、')}
整体风格：${styleZh || '3D科幻机甲国漫风格'}

【分镜生成规则】
1. 总镜头数：${targetShots}个（每分钟25个镜头）
2. 每个镜头时长：2-5科，高燃场景用短镜头（2-3科），转场和平静场景用长镜头（4-5科）
3. 镜头类型分配：定场镜头(10%) 逻辑镜头(20%) Action镜头(35%) Reaction镜头(25%) 旁跳镜头(10%)
4. 情绪节奏：开头平静铺垫，中段逐渐升温，高潮点爆发，结尾余韵收尾
5. 画面描述：必须具体描述画面内容（人物动作、表情、场景氛围），不能只写“场景名+模板文字”
6. 每5个镜头左右安排一个旁白（VO）
7. 每个动作镜头应有具体的音效描述（SFX）

请严格输出以下JSON格式，不要有任何额外说明：
{
  "shots": [
    {
      "number": 1,
      "type": "定场镜头|逻辑镜头|Action镜头|Reaction镜头|旁跳镜头",
      "size": "大远景|远景|全景|中景|中近景|近景|特写|大特写",
      "movement": "固定|推（Dolly In）|拉（Dolly Out）|跟（Follow）|左移（Truck Left）|右移（Truck Right）|升（Crane Up）|降（Crane Down）|环绕（Orbit）|手持（Handheld）|航拍（Aerial）",
      "description": "具体的画面内容描述，包含人物动作和场景氛围",
      "vo": "旁白内容，无则留空",
      "sfx": "音效描述，无则留空",
      "duration": 3,
      "emotion": "情绪关键词",
      "emotionLevel": 3
    }
  ]
}`;

      const raw = await callGemini(prompt);
      const cleaned = raw.replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```\s*$/m, "").trim();
      const parsed = JSON.parse(cleaned) as {
        shots: Array<{
          number: number; type: string; size: string; movement: string;
          description: string; vo: string; sfx: string;
          duration: number; emotion: string; emotionLevel: number;
        }>;
      };
      return parsed;
    }),

  // 5. Seedance 多镜头提示词生成 -------------------------------------------
  generateVideoPrompt: publicProcedure
    .input(z.object({
      shots: z.array(z.object({
        number: z.number(),
        type: z.string(),
        size: z.string(),
        movement: z.string(),
        description: z.string(),
        vo: z.string(),
        sfx: z.string(),
        duration: z.number(),
        emotion: z.string(),
        emotionLevel: z.number(),
      })),
      totalDuration: z.number(),
      styleZh: z.string().optional(),
      styleEn: z.string().optional(),
      episodeContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { shots, totalDuration, styleZh, styleEn, episodeContext } = input;

      const shotsDesc = shots.map(s =>
        `镜头${s.number}[类型:${s.type} 景别:${s.size} 运动:${s.movement} 时长:${s.duration}s 情绪:${s.emotion}(${s.emotionLevel}/5)]
  画面: ${s.description}
  VO: ${s.vo || '无'}
  SFX: ${s.sfx || '无'}`
      ).join('\n');

      const prompt = `你是专业的AI影片提示词工程师。请为以下分镜组合生成一段用于即梦Seedance 2.0全能参考模式的多镜头视频提示词。

【分镜信息】
${shotsDesc}

【视频规格】
- 片段时长：${totalDuration}秒（${shots.length}个镜头）
- 整体风格：${styleZh || '3D科幻机甲国漫风格'}
- 剧情背景：${episodeContext || ''}

【Seedance提示词规则】
1. 按镜头顺序描述，每个镜头明确标注景别、运动方式、时长
2. 画面描述具体生动，包含人物动作、表情、光效、场景氛围
3. 旁白（VO）和音效（SFX）直接写入提示词，格式：[VO: "旁白内容"] [SFX: 音效描述]
4. 不要出现@符号
5. 不要引用具体影视作品名称，用风格描述词代替
6. 提示词全程用中文撰写，不要在提示词中加入英文
7. 整体语调要具有电影感和沉浸感

请直接输出提示词文本，不要有任何额外说明或JSON包裹。`;

      const raw = await callGemini(prompt);
      // 清理可能的markdown代码块
      const cleaned = raw.replace(/^```[\w]*\s*/m, "").replace(/```\s*$/m, "").trim();
      return { prompt: cleaned };
    }),

  // 6. 验证 Gemini API Key --------------------------------------------
  testConnection: publicProcedure
    .mutation(async () => {
      const result = await callGemini(JSON.stringify({ test: true }) + '\n请回复：{"status":"ok"}');
      return { ok: true, raw: result };
    }),
});
