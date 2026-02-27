import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, Wand2, Copy, Check, Bot, User, Loader2, Pin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── Fixed Nanobananapro Templates ────────────────────────────────────────────
const NANO_TEMPLATES = {
  charMain: {
    label: "角色主图 + 三视图",
    zh: `角色设计参考图，干净的深灰色背景，画幅分为左右两部分。
左侧部分：角色的电影级特写肖像，[面部特征]，专注而坚定的表情，电影级侧光照明。
右侧部分：同一角色的标准三视图（正面、侧面、背面），全身站姿，采用标准正交视图。清晰展示[服装描述]，[体型特征]，特殊标记：[特殊标记]。
整体要求：左右两部分的角色设计、比例、细节必须完全一致。
[视觉风格标签]`,
    en: `Character design sheet, clean dark gray background, frame split into two parts.
Left side: A cinematic close-up portrait of the character, [facial features], focused and determined expression, cinematic side lighting.
Right side: A standard orthographic three-view turnaround (front, side, back) of the same character in a full-body standing pose. Clearly showing [clothing], [body type], special marks: [marks].
Overall requirement: The character design, proportions, and details must be perfectly consistent between the left and right parts.
[Style tag]`,
  },
  sceneMulti: {
    label: "场景多角度图",
    zh: `场景设计参考图，[场景名称]，[场景描述]，无人物，纯场景参考。
画幅分为三部分，分别展示：正面全景视角、侧面45度视角、俯瞰鸟瞰视角。
三个视角的场景设计、光影、细节必须完全一致。
[视觉风格标签] --ar 16:9`,
    en: `Scene design reference sheet, [scene name], [scene description], no characters, pure scene reference.
Frame divided into three parts showing: front full-view angle, 45-degree side angle, overhead bird's-eye view.
The scene design, lighting, and details must be perfectly consistent across all three angles.
[Style tag] --ar 16:9`,
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("已复制");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all"
      style={{ background: copied ? "oklch(0.65 0.2 145 / 0.15)" : "oklch(0.22 0.006 240)", border: `1px solid ${copied ? "oklch(0.65 0.2 145 / 0.4)" : "oklch(0.28 0.008 240)"}`, color: copied ? "oklch(0.65 0.2 145)" : "oklch(0.60 0.01 240)", fontFamily: "'JetBrains Mono', monospace" }}>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "已复制" : "复制"}
    </button>
  );
}

function PromptBlock({ label, zh, en }: { label: string; zh: string; en: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "oklch(0.60 0.01 240)", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
        <div className="flex gap-1">
          <CopyButton text={zh} />
          <CopyButton text={en} />
        </div>
      </div>
      <div className="p-3 rounded text-xs leading-relaxed" style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.22 0.006 240)", color: "oklch(0.75 0.008 240)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "pre-wrap" }}>
        <span style={{ color: "oklch(0.55 0.01 240)" }}>ZH: </span>{zh}
      </div>
      <div className="p-3 rounded text-xs leading-relaxed" style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.22 0.006 240)", color: "oklch(0.70 0.008 240)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "pre-wrap" }}>
        <span style={{ color: "oklch(0.55 0.01 240)" }}>EN: </span>{en}
      </div>
    </div>
  );
}

export default function Phase2() {
  const { projectInfo, characters, updateCharacter, markPhaseComplete, setActivePhase } = useProject();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);

  const generateCharPromptMutation = trpc.ai.generateCharacterPrompt.useMutation();

  const handleGenerateChar = async (charId: string) => {
    const char = characters.find(c => c.id === charId);
    if (!char) return;
    setGeneratingId(charId);
    try {
      const result = await generateCharPromptMutation.mutateAsync({
        name: char.name,
        role: char.role || "角色",
        isMecha: char.isMecha ?? false,
        appearance: char.appearance || char.name,
        costume: char.costume || "",
        marks: char.marks || "",
        styleZh: projectInfo.styleZh,
        styleEn: projectInfo.styleEn,
      });
      updateCharacter(charId, { promptZh: result.zh, promptEn: result.en });
      toast.success(`${char.name} 提示词已生成`);
    } catch (err) {
      toast.error(`生成失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    for (const char of characters) {
      setGeneratingId(char.id);
      try {
        const result = await generateCharPromptMutation.mutateAsync({
          name: char.name,
          role: char.role || "角色",
          isMecha: char.isMecha ?? false,
          appearance: char.appearance || char.name,
          costume: char.costume || "",
          marks: char.marks || "",
          styleZh: projectInfo.styleZh,
          styleEn: projectInfo.styleEn,
        });
        updateCharacter(char.id, { promptZh: result.zh, promptEn: result.en });
      } catch {
        // continue with next character
      }
    }
    setGeneratingId(null);
    setGeneratingAll(false);
    toast.success("全部人物提示词生成完成");
  };

  const handleComplete = () => {
    markPhaseComplete("phase2");
    setActivePhase("phase2b");
  };

  const S = {
    card: { background: "oklch(0.15 0.006 240)", border: "1px solid oklch(0.22 0.006 240)", borderRadius: "8px" } as React.CSSProperties,
    amber: "oklch(0.75 0.17 65)",
    dim: "oklch(0.55 0.01 240)",
    text: "oklch(0.88 0.005 60)",
    sub: "oklch(0.70 0.008 240)",
  };

  return (
    <div className="space-y-8">
      {/* Phase header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded flex items-center justify-center text-lg font-bold"
          style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.4)", color: S.amber, fontFamily: "'JetBrains Mono', monospace" }}>02</div>
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: S.text, fontFamily: "'Space Grotesk', sans-serif" }}>人物与机甲资产</h2>
          <p className="text-sm" style={{ color: S.sub }}>全局人物 MJ7 竖版单张参考图提示词 · 不分集</p>
        </div>
      </div>

      {/* ── Section A: Fixed Nanobananapro Templates ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4" style={{ color: S.amber }} />
          <h3 className="text-sm font-bold tracking-widest uppercase" style={{ color: S.amber, fontFamily: "'JetBrains Mono', monospace" }}>固定模板 · Nanobananapro 专用</h3>
        </div>
        <p className="text-xs" style={{ color: S.dim }}>以下模板用于 Nanobananapro 生成高精度角色三视图和场景多角度图，将 [ ] 内容替换为实际描述后使用。</p>
        {Object.entries(NANO_TEMPLATES).map(([key, tpl]) => (
          <div key={key} className="p-4 space-y-3" style={S.card}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.55 0.18 290 / 0.15)", border: "1px solid oklch(0.55 0.18 290 / 0.4)", color: "oklch(0.70 0.18 290)", fontFamily: "'JetBrains Mono', monospace" }}>
                Nanobananapro
              </span>
              <span className="text-sm font-medium" style={{ color: S.text }}>{tpl.label}</span>
            </div>
            <PromptBlock label="模板提示词" zh={tpl.zh} en={tpl.en} />
          </div>
        ))}
      </div>

      {/* ── Section B: Global Character Prompts (MJ7) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" style={{ color: S.amber }} />
            <h3 className="text-sm font-bold tracking-widest uppercase" style={{ color: S.amber, fontFamily: "'JetBrains Mono', monospace" }}>人物与机甲 · MJ7 竖版参考图</h3>
          </div>
          {characters.length > 0 && (
            <Button size="sm" onClick={handleGenerateAll} disabled={generatingAll}
              style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.4)", color: S.amber }}>
              {generatingAll ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />生成中...</> : <><Wand2 className="w-3 h-3 mr-1" />一键生成全部</>}
            </Button>
          )}
        </div>
        <p className="text-xs" style={{ color: S.dim }}>
          由 Gemini AI 基于剧本分析生成 · 竖版 2:3 · 全身正面站姿 · 深灰渐变背景 · 直接输入 MJ7 使用
        </p>

        {characters.length === 0 ? (
          <div className="p-8 text-center rounded" style={S.card}>
            <p className="text-sm" style={{ color: S.dim }}>请先在阶段一完成剧本解析，系统将自动提取人物信息</p>
          </div>
        ) : (
          <div className="space-y-4">
            {characters.map(char => (
              <div key={char.id} className="p-4 space-y-4" style={S.card}>
                {/* Character header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {char.isMecha
                      ? <Bot className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.60 0.18 240)" }} />
                      : <User className="w-4 h-4 flex-shrink-0" style={{ color: S.amber }} />
                    }
                    <span className="font-bold text-base" style={{ color: S.text, fontFamily: "'Space Grotesk', sans-serif" }}>{char.name}</span>
                    {char.isMecha && (
                      <Badge className="text-xs px-1.5 py-0" style={{ background: "oklch(0.55 0.18 240 / 0.15)", border: "1px solid oklch(0.55 0.18 240 / 0.4)", color: "oklch(0.65 0.18 240)" }}>机甲</Badge>
                    )}
                    {char.role && (
                      <Badge className="text-xs px-1.5 py-0" style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.30 0.008 240)", color: S.dim }}>{char.role}</Badge>
                    )}
                  </div>
                  <Button size="sm" onClick={() => handleGenerateChar(char.id)}
                    disabled={generatingId === char.id || generatingAll}
                    style={{ background: "oklch(0.75 0.17 65 / 0.12)", border: "1px solid oklch(0.75 0.17 65 / 0.35)", color: S.amber, flexShrink: 0 }}>
                    {generatingId === char.id
                      ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />生成中</>
                      : <><Wand2 className="w-3 h-3 mr-1" />生成提示词</>
                    }
                  </Button>
                </div>

                {/* AI-extracted details */}
                {(char.appearance || char.costume) && (
                  <div className="grid grid-cols-1 gap-2 text-xs" style={{ color: S.sub }}>
                    {char.appearance && (
                      <div className="flex gap-2">
                        <span className="flex-shrink-0" style={{ color: S.dim, fontFamily: "'JetBrains Mono', monospace" }}>外貌</span>
                        <span>{char.appearance}</span>
                      </div>
                    )}
                    {char.costume && (
                      <div className="flex gap-2">
                        <span className="flex-shrink-0" style={{ color: S.dim, fontFamily: "'JetBrains Mono', monospace" }}>服装</span>
                        <span>{char.costume}</span>
                      </div>
                    )}
                    {char.marks && (
                      <div className="flex gap-2">
                        <span className="flex-shrink-0" style={{ color: S.dim, fontFamily: "'JetBrains Mono', monospace" }}>标记</span>
                        <span>{char.marks}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Generated prompt */}
                {char.promptZh && char.promptEn ? (
                  <PromptBlock label="MJ7 提示词（竖版 2:3 单张参考图）" zh={char.promptZh} en={char.promptEn} />
                ) : (
                  <div className="p-3 rounded text-xs text-center" style={{ background: "oklch(0.10 0.004 240)", border: "1px dashed oklch(0.28 0.008 240)", color: S.dim }}>
                    点击「生成提示词」，Gemini AI 将基于角色信息生成专属 MJ7 提示词
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete button */}
      <div className="flex justify-end pt-4 border-t" style={{ borderColor: "oklch(0.22 0.006 240)" }}>
        <Button onClick={handleComplete} className="gap-2"
          style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.10 0.005 240)", fontWeight: 700 }}>
          人物资产完成，进入场景道具
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
