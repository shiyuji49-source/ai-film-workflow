import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";
import { GEMINI_PRO_MODEL } from "../shared/const";

describe("Gemini API Key", () => {
  it("should have GEMINI_API_KEY configured", () => {
    expect(ENV.geminiApiKey).toBeTruthy();
    expect(ENV.geminiApiKey.length).toBeGreaterThan(10);
  });

  it("should successfully call Gemini API", async () => {
    const apiKey = ENV.geminiApiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_PRO_MODEL}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: 'Reply with exactly this JSON: {"status":"ok"}' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 500 },
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(res.ok).toBe(true);
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    // Strip markdown code fences (model may wrap JSON in ```json ... ```)
    const text = raw.replace(/^```[a-z]*\n?/m, "").replace(/\n?```$/m, "").trim();
    expect(text).toContain("ok");
  }, 30000);
});
