// DESIGN: "导演手册" 工业风暗色系 — Phase 4: Prompt Writing
import { useProject } from "@/contexts/ProjectContext";
import { PROMPT_TIPS } from "@/lib/workflowData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChevronRight, Plus, Trash2, Wand2 } from "lucide-react";
import PromptBox from "@/components/PromptBox";
import { useState } from "react";

export default function Phase4() {
  const { projectInfo, shots, videoSegments, addVideoSegment, updateVideoSegment,
    removeVideoSegment, markPhaseComplete, setActivePhase, generateVideoPrompt } = useProject();
  const [generatedPrompts, setGeneratedPrompts] = useState<Record<string, string>>({});

  const handleGenerate = (segId: string) => {
    const seg = videoSegments.find(s => s.id === segId);
    if (!seg) return;
    // Parse shot range e.g. "1-3" → shots[0..2]
    let relatedShots = shots;
    if (seg.shots.trim()) {
      const parts = seg.shots.split("-").map(s => parseInt(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        relatedShots = shots.slice(parts[0] - 1, parts[1]);
      } else if (parts.length === 1 && !isNaN(parts[0])) {
        relatedShots = shots.slice(parts[0] - 1, parts[0]);
      }
    }
    const prompt = generateVideoPrompt(seg, relatedShots, projectInfo.styleZh);
    setGeneratedPrompts(prev => ({ ...prev, [segId]: prompt }));
  };

  const handleComplete = () => {
    markPhaseComplete("phase4");
    setActivePhase("phase5");
  };

  return (
    <div className="space-y-8">
      {/* Phase header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded flex items-center justify-center text-lg font-bold"
          style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.4)", color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
          04
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "oklch(0.92 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>
            提示词撰写
          </h2>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 240)" }}>
            为即梦/Seedance 撰写多镜头视频提示词，集成旁白与音效
          </p>
        </div>
      </div>

      {/* Core tips */}
      <section>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
          <span className="step-badge px-2 py-0.5 rounded text-[10px]"
            style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)" }}>
            4.1
          </span>
          核心撰写要点
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {PROMPT_TIPS.map(tip => (
            <div key={tip.key} className="p-3 rounded flex gap-3"
              style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
              <div className="flex-shrink-0 w-1 rounded-full self-stretch" style={{ background: "oklch(0.75 0.17 65)" }} />
              <div>
                <div className="text-xs font-semibold mb-0.5" style={{ color: "oklch(0.85 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {tip.key}
                </div>
                <div className="text-xs" style={{ color: "oklch(0.55 0.01 240)" }}>{tip.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Prompt template */}
      <section>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
          <span className="step-badge px-2 py-0.5 rounded text-[10px]"
            style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)" }}>
            4.2
          </span>
          多镜头视频提示词模板
        </h3>
        <PromptBox
          label="标准模板 (可直接复制修改)"
          content={`一个12秒的视频片段，包含3个镜头：\n镜头1：全景，[主体与环境描述]，[动作起始]。\n镜头2：中近景，[主体执行动作的过程]，镜头推进。\n镜头3：特写，[动作结束或事件结果]，镜头固定。\nVO: "[此处填写完整旁白]"\nSFX: [环境音效]，[关键动作音效]\n整体氛围：[情绪关键词]。\n${projectInfo.styleZh || "[本项目视觉风格标签]"}`}
        />
      </section>

      {/* Video segments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"
            style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="step-badge px-2 py-0.5 rounded text-[10px]"
              style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)" }}>
              4.3
            </span>
            视频片段提示词生成
          </h3>
          <Button onClick={addVideoSegment} size="sm" variant="outline"
            className="flex items-center gap-1.5 text-xs h-7"
            style={{ borderColor: "oklch(0.35 0.008 240)", color: "oklch(0.70 0.008 240)", background: "transparent" }}>
            <Plus className="w-3 h-3" />
            添加片段
          </Button>
        </div>

        {videoSegments.length === 0 && (
          <div className="text-center py-10 rounded"
            style={{ border: "1px dashed oklch(0.28 0.008 240)", color: "oklch(0.45 0.008 240)" }}>
            <p className="text-sm">点击「添加片段」创建视频片段提示词</p>
            <p className="text-xs mt-1" style={{ color: "oklch(0.38 0.008 240)" }}>
              每个片段对应一次 Seedance 生成（10-15秒，包含2-5个镜头）
            </p>
          </div>
        )}

        <div className="space-y-4">
          {videoSegments.map((seg, idx) => (
            <div key={seg.id} className="rounded overflow-hidden"
              style={{ border: "1px solid oklch(0.28 0.008 240)" }}>
              <div className="flex items-center justify-between px-4 py-2.5"
                style={{ background: "oklch(0.15 0.006 240)", borderBottom: "1px solid oklch(0.28 0.008 240)" }}>
                <span className="text-xs font-bold" style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
                  SEG_{String(idx + 1).padStart(2, "0")} · {seg.name}
                </span>
                <button onClick={() => removeVideoSegment(seg.id)} className="p-1 rounded hover:bg-red-500/10">
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.2 25)" }} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>片段名称</Label>
                    <Input value={seg.name} onChange={e => updateVideoSegment(seg.id, { name: e.target.value })}
                      className="text-xs h-8"
                      style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>
                      覆盖镜头范围 <span style={{ color: "oklch(0.45 0.008 240)" }}>(如 1-3)</span>
                    </Label>
                    <Input value={seg.shots} onChange={e => updateVideoSegment(seg.id, { shots: e.target.value })}
                      placeholder="1-3"
                      className="text-xs h-8"
                      style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>目标时长 (秒)</Label>
                    <Input value={seg.duration} onChange={e => updateVideoSegment(seg.id, { duration: e.target.value })}
                      type="number" min="5" max="15"
                      className="text-xs h-8"
                      style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>
                    自定义提示词 <span style={{ color: "oklch(0.45 0.008 240)" }}>(可手动编辑或点击生成)</span>
                  </Label>
                  <Textarea
                    value={generatedPrompts[seg.id] ?? seg.prompt}
                    onChange={e => {
                      updateVideoSegment(seg.id, { prompt: e.target.value });
                      setGeneratedPrompts(prev => ({ ...prev, [seg.id]: e.target.value }));
                    }}
                    rows={5}
                    className="text-xs resize-none"
                    style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.28 0.008 240)", borderLeft: "3px solid oklch(0.75 0.17 65)", color: "oklch(0.85 0.005 60)", fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleGenerate(seg.id)} size="sm"
                    className="flex items-center gap-2 text-xs"
                    style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                    <Wand2 className="w-3.5 h-3.5" />
                    从分镜自动生成
                  </Button>
                  {(generatedPrompts[seg.id] || seg.prompt) && (
                    <PromptBox
                      label="最终提示词 (可复制)"
                      content={generatedPrompts[seg.id] || seg.prompt}
                      className="flex-1"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <Button onClick={handleComplete} className="flex items-center gap-2 px-6"
          style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          <CheckCircle2 className="w-4 h-4" />
          完成本阶段，进入生成与后期
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
