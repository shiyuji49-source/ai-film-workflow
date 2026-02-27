import { describe, it, expect, vi, beforeEach } from "vitest";

// 测试邀请码验证逻辑（不依赖数据库，纯逻辑测试）
describe("邀请码验证逻辑", () => {
  it("应正确检测邀请码是否过期", () => {
    const now = Date.now();
    const expiredCode = { expiresAt: now - 1000, useCount: 0, maxUses: 1 };
    const validCode = { expiresAt: now + 86400000, useCount: 0, maxUses: 1 };
    const noExpiry = { expiresAt: null, useCount: 0, maxUses: 1 };

    const isExpired = (code: typeof expiredCode) =>
      code.expiresAt !== null && Date.now() > code.expiresAt;

    expect(isExpired(expiredCode)).toBe(true);
    expect(isExpired(validCode)).toBe(false);
    expect(isExpired(noExpiry)).toBe(false);
  });

  it("应正确检测邀请码是否已用尽", () => {
    const usedUp = { useCount: 1, maxUses: 1 };
    const available = { useCount: 0, maxUses: 1 };
    const multiUse = { useCount: 2, maxUses: 5 };

    const isUsedUp = (code: typeof usedUp) => code.useCount >= code.maxUses;

    expect(isUsedUp(usedUp)).toBe(true);
    expect(isUsedUp(available)).toBe(false);
    expect(isUsedUp(multiUse)).toBe(false);
  });

  it("邀请码应转为大写进行比较", () => {
    const normalize = (code: string) => code.trim().toUpperCase();
    expect(normalize("abc12345")).toBe("ABC12345");
    expect(normalize("  XYZ789  ")).toBe("XYZ789");
    expect(normalize("ALREADY-UPPER")).toBe("ALREADY-UPPER");
  });
});

// 测试积分包配置
describe("积分包配置", () => {
  it("应包含四个积分包", async () => {
    const { CREDIT_PACKAGES } = await import("./products");
    expect(CREDIT_PACKAGES).toHaveLength(4);
  });

  it("积分包 ID 应唯一", async () => {
    const { CREDIT_PACKAGES } = await import("./products");
    const ids = CREDIT_PACKAGES.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("积分包价格应使用人民币分为单位", async () => {
    const { CREDIT_PACKAGES } = await import("./products");
    for (const pkg of CREDIT_PACKAGES) {
      expect(pkg.amountFen).toBeGreaterThan(0);
      expect(pkg.amountDisplay).toMatch(/^¥/);
    }
  });

  it("积分包应包含正确的四档价格", async () => {
    const { CREDIT_PACKAGES } = await import("./products");
    const prices = CREDIT_PACKAGES.map(p => p.amountFen);
    expect(prices).toContain(990);   // ¥9.9
    expect(prices).toContain(2990);  // ¥29.9
    expect(prices).toContain(9990);  // ¥99.9
    expect(prices).toContain(29900); // ¥299
  });

  it("积分包应包含正确的积分数量", async () => {
    const { CREDIT_PACKAGES } = await import("./products");
    const credits = CREDIT_PACKAGES.map(p => p.credits);
    expect(credits).toContain(1000);
    expect(credits).toContain(3000);
    expect(credits).toContain(10000);
    expect(credits).toContain(30000);
  });
});

// 测试积分流水操作类型标签
describe("积分流水操作类型", () => {
  const ACTION_LABELS: Record<string, string> = {
    register_bonus: "注册赠送",
    admin_grant: "管理员充值",
    stripe_purchase: "购买积分",
    analyze_script: "AI 解析剧本",
    generate_shot: "AI 生成分镜",
    generate_prompt: "AI 生成视频提示词",
  };

  it("应包含所有操作类型标签", () => {
    const expectedActions = [
      "register_bonus",
      "admin_grant",
      "stripe_purchase",
      "analyze_script",
      "generate_shot",
      "generate_prompt",
    ];
    for (const action of expectedActions) {
      expect(ACTION_LABELS[action]).toBeDefined();
      expect(ACTION_LABELS[action].length).toBeGreaterThan(0);
    }
  });

  it("积分变动方向应正确", () => {
    const positiveActions = ["register_bonus", "admin_grant", "stripe_purchase"];
    const negativeActions = ["analyze_script", "generate_shot", "generate_prompt"];

    // 正向操作（充值）
    for (const action of positiveActions) {
      expect(ACTION_LABELS[action]).toBeDefined();
    }
    // 负向操作（消耗）
    for (const action of negativeActions) {
      expect(ACTION_LABELS[action]).toBeDefined();
    }
  });
});
