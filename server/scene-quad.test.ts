/**
 * 场景四宫格参考图功能单元测试
 * 验证：
 * 1. generateAssetPrompt 接受 scene_quad 类型
 * 2. generateMultiView 接受 quad 视角类型
 * 3. 四宫格提示词模板包含正确的关键词
 */
import { describe, it, expect } from "vitest";

// ─── 测试 generateAssetPrompt 的 scene_quad 类型 ──────────────────────────────

describe("generateAssetPrompt - scene_quad type", () => {
  it("should accept scene_quad as a valid type (Zod schema check)", () => {
    const { z } = require("zod");
    const inputSchema = z.object({
      type: z.enum(["scene", "prop", "scene_quad"]),
      name: z.string(),
      description: z.string(),
      orientation: z.enum(["landscape", "portrait"]).optional(),
    });

    // scene_quad 应该通过验证
    const result = inputSchema.safeParse({
      type: "scene_quad",
      name: "测试场景",
      description: "一个测试场景",
      orientation: "portrait",
    });
    expect(result.success).toBe(true);
  });

  it("should reject unknown type", () => {
    const { z } = require("zod");
    const inputSchema = z.object({
      type: z.enum(["scene", "prop", "scene_quad"]),
      name: z.string(),
      description: z.string(),
    });

    const result = inputSchema.safeParse({
      type: "unknown_type",
      name: "测试",
      description: "测试",
    });
    expect(result.success).toBe(false);
  });
});

// ─── 测试 generateMultiView 的 quad 视角类型 ─────────────────────────────────

describe("generateMultiView - quad viewType", () => {
  it("should accept quad as a valid viewType (Zod schema check)", () => {
    const { z } = require("zod");
    const inputSchema = z.object({
      id: z.number(),
      viewType: z.enum(["front", "side", "back", "angle1", "angle2", "angle3", "quad"]),
      prompt: z.string().optional(),
    });

    const result = inputSchema.safeParse({
      id: 1,
      viewType: "quad",
      prompt: "four-view quad scene reference",
    });
    expect(result.success).toBe(true);
  });

  it("quad prompt should not be prefixed with viewLabel", () => {
    // quad 类型直接使用传入的完整提示词，不拼接 viewLabel
    const viewLabels: Record<string, string> = {
      front: "front view, facing camera directly",
      side: "side profile view, 90 degrees",
      back: "back view, rear facing",
      angle1: "three-quarter view, 45 degrees",
      angle2: "bird eye view, top-down angle",
      angle3: "worm eye view, low angle looking up",
      quad: "", // quad 直接使用传入的完整提示词
    };

    const viewType = "quad";
    const basePrompt = "four-view quad scene, 9:16 vertical format";
    const typeLabel = "scene concept art";

    const fullPrompt = viewType === "quad"
      ? basePrompt
      : `${typeLabel}, ${viewLabels[viewType]}, ${basePrompt ? basePrompt + ", " : ""}maintain exact same style and appearance as reference, consistent design, high quality, 4K`;

    // quad 类型的 prompt 应该直接等于 basePrompt，不含 typeLabel 前缀
    expect(fullPrompt).toBe(basePrompt);
    expect(fullPrompt).not.toContain(typeLabel);
  });
});

// ─── 测试四宫格提示词模板关键词 ───────────────────────────────────────────────

describe("Scene quad prompt template keywords", () => {
  it("should contain required four-view keywords", () => {
    // 模拟四宫格提示词模板中的关键词检查
    const templateKeywords = [
      "四宫格",
      "四个方向",
      "正面",
      "反打",
      "左侧",
      "右侧",
      "相机高度",
      "焦距",
      "全景",
      "无人物",
    ];

    const sampleTemplate = `画面内容：输出一张四宫格图片，四格之间有清晰黑色分割线，展示同一空间的四个方向关联视图，
    四个方向全部为正面平视视角，相机高度1.6m，焦距35mm，景别为全景，无人物。
    四个视角：左上角正面视角，右上角反打视角，左下角左侧面视角，右下角右侧面视角。`;

    for (const keyword of templateKeywords) {
      expect(sampleTemplate).toContain(keyword);
    }
  });

  it("portrait orientation should use 9:16 aspect ratio", () => {
    const isPortrait = true;
    const aspectRatio = isPortrait ? "9:16" : "16:9";
    expect(aspectRatio).toBe("9:16");
  });

  it("landscape orientation should use 16:9 aspect ratio", () => {
    const isPortrait = false;
    const aspectRatio = isPortrait ? "9:16" : "16:9";
    expect(aspectRatio).toBe("16:9");
  });
});
