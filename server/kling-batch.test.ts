import { describe, it, expect } from "vitest";

// ─── 测试 Kling 3.0 Elements payload 构建逻辑 ──────────────────────────────

describe("Kling 3.0 Elements payload", () => {
  function buildKlingPayload(params: {
    prompt: string;
    imageUrl: string;
    lastFrameUrl?: string;
    elementImageUrls?: string[];
    aspectRatio: string;
    duration: number;
  }) {
    const { prompt, imageUrl, lastFrameUrl, elementImageUrls, aspectRatio, duration } = params;
    const payload: Record<string, unknown> = {
      prompt,
      image_url: imageUrl,
      aspect_ratio: aspectRatio,
      duration: String(duration),
      cfg_scale: 0.5,
    };
    if (lastFrameUrl) payload.tail_image_url = lastFrameUrl;
    if (elementImageUrls && elementImageUrls.length > 0) {
      payload.elements = elementImageUrls.slice(0, 4).map((url) => ({
        image_url: url,
        reference_type: "subject",
      }));
    }
    return payload;
  }

  it("should include elements when elementImageUrls provided", () => {
    const payload = buildKlingPayload({
      prompt: "A hero walks forward",
      imageUrl: "https://cdn.example.com/frame.jpg",
      elementImageUrls: [
        "https://cdn.example.com/char1.jpg",
        "https://cdn.example.com/char2.jpg",
      ],
      aspectRatio: "9:16",
      duration: 5,
    });
    expect(payload.elements).toHaveLength(2);
    expect((payload.elements as any[])[0].reference_type).toBe("subject");
    expect((payload.elements as any[])[0].image_url).toBe("https://cdn.example.com/char1.jpg");
  });

  it("should limit elements to 4 max", () => {
    const payload = buildKlingPayload({
      prompt: "test",
      imageUrl: "https://cdn.example.com/frame.jpg",
      elementImageUrls: [
        "https://cdn.example.com/1.jpg",
        "https://cdn.example.com/2.jpg",
        "https://cdn.example.com/3.jpg",
        "https://cdn.example.com/4.jpg",
        "https://cdn.example.com/5.jpg", // 第5张应被截断
      ],
      aspectRatio: "16:9",
      duration: 10,
    });
    expect((payload.elements as any[]).length).toBe(4);
  });

  it("should not include elements when none provided", () => {
    const payload = buildKlingPayload({
      prompt: "test",
      imageUrl: "https://cdn.example.com/frame.jpg",
      aspectRatio: "9:16",
      duration: 5,
    });
    expect(payload.elements).toBeUndefined();
  });

  it("should include tail_image_url when lastFrameUrl provided", () => {
    const payload = buildKlingPayload({
      prompt: "test",
      imageUrl: "https://cdn.example.com/frame.jpg",
      lastFrameUrl: "https://cdn.example.com/last.jpg",
      aspectRatio: "9:16",
      duration: 5,
    });
    expect(payload.tail_image_url).toBe("https://cdn.example.com/last.jpg");
  });

  it("should set duration as string", () => {
    const payload = buildKlingPayload({
      prompt: "test",
      imageUrl: "https://cdn.example.com/frame.jpg",
      aspectRatio: "9:16",
      duration: 10,
    });
    expect(payload.duration).toBe("10");
  });
});

// ─── 测试批量跑量集数过滤逻辑 ─────────────────────────────────────────────

describe("batchRun episode filter", () => {
  const mockShots = [
    { id: 1, episodeNumber: 1, shotNumber: 1, status: "done" },
    { id: 2, episodeNumber: 1, shotNumber: 2, status: "draft" },
    { id: 3, episodeNumber: 2, shotNumber: 1, status: "draft" },
    { id: 4, episodeNumber: 3, shotNumber: 1, status: "failed" },
  ];

  it("should filter shots by episode numbers", () => {
    const episodeNumbers = [1, 2];
    const filtered = mockShots.filter((s) => episodeNumbers.includes(s.episodeNumber));
    expect(filtered).toHaveLength(3);
  });

  it("should skip existing done shots when skipExisting=true", () => {
    const episodeNumbers = [1];
    const skipExisting = true;
    const filtered = mockShots
      .filter((s) => episodeNumbers.includes(s.episodeNumber))
      .filter((s) => !skipExisting || s.status !== "done");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(2);
  });

  it("should include all shots when skipExisting=false", () => {
    const episodeNumbers = [1];
    const skipExisting = false;
    const filtered = mockShots
      .filter((s) => episodeNumbers.includes(s.episodeNumber))
      .filter((s) => !skipExisting || s.status !== "done");
    expect(filtered).toHaveLength(2);
  });
});

// ─── 测试全局参考图 URL 提取逻辑 ──────────────────────────────────────────

describe("globalRefUrls extraction", () => {
  const mockAssets = [
    { id: 1, name: "Hero", isGlobalRef: true, mainImageUrl: "https://cdn.example.com/hero.jpg", mjImageUrl: null },
    { id: 2, name: "Villain", isGlobalRef: true, mainImageUrl: null, mjImageUrl: "https://cdn.example.com/villain-mj.jpg" },
    { id: 3, name: "Scene", isGlobalRef: false, mainImageUrl: "https://cdn.example.com/scene.jpg", mjImageUrl: null },
  ];

  it("should extract URLs from global ref assets only", () => {
    const globalAssets = mockAssets.filter((a) => a.isGlobalRef);
    const globalRefUrls = globalAssets
      .map((a) => a.mainImageUrl || a.mjImageUrl)
      .filter(Boolean) as string[];
    expect(globalRefUrls).toHaveLength(2);
    expect(globalRefUrls[0]).toBe("https://cdn.example.com/hero.jpg");
    expect(globalRefUrls[1]).toBe("https://cdn.example.com/villain-mj.jpg");
  });

  it("should prefer mainImageUrl over mjImageUrl", () => {
    const asset = { mainImageUrl: "https://cdn.example.com/main.jpg", mjImageUrl: "https://cdn.example.com/mj.jpg" };
    const url = asset.mainImageUrl || asset.mjImageUrl;
    expect(url).toBe("https://cdn.example.com/main.jpg");
  });
});
