// DESIGN: "导演手册" 工业风暗色系 — Phase 2: Asset Design
import { useProject } from "@/contexts/ProjectContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChevronRight, Plus, Trash2, Wand2 } from "lucide-react";
import PromptBox from "@/components/PromptBox";
import { useState } from "react";

export default function Phase2() {
  const { projectInfo, characters, addCharacter, updateCharacter, removeCharacter,
    markPhaseComplete, setActivePhase, generateCharacterPrompt } = useProject();
  const [generatedPrompts, setGeneratedPrompts] = useState<Record<string, { zh: string; en: string }>>({});

  const handleGenerate = (charId: string) => {
    const char = characters.find(c => c.id === charId);
    if (!char) return;
    const result = generateCharacterPrompt(char, projectInfo.styleZh, projectInfo.styleEn);
    setGeneratedPrompts(prev => ({ ...prev, [charId]: result }));
  };

  const handleComplete = () => {
    markPhaseComplete("phase2");
    setActivePhase("phase3");
  };

  return (
    <div className="space-y-8">
      {/* Phase header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded flex items-center justify-center text-lg font-bold"
          style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.4)", color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
          02
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "oklch(0.92 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>
            核心资产设计
          </h2>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 240)" }}>
            MJ 探索风格方向 → Nanobananapro 生成精确的角色主图与三视图
          </p>
        </div>
      </div>

      {/* Workflow reminder */}
      <div className="rounded p-4 text-sm"
        style={{ background: "oklch(0.75 0.17 65 / 0.08)", border: "1px solid oklch(0.75 0.17 65 / 0.25)" }}>
        <div className="flex items-start gap-3">
          <div className="text-base mt-0.5">🎯</div>
          <div>
            <p className="font-semibold mb-1" style={{ color: "oklch(0.85 0.12 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
              工具链提示
            </p>
            <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: "oklch(0.65 0.01 240)" }}>
              <span className="px-2 py-0.5 rounded" style={{ background: "oklch(0.22 0.006 240)" }}>① Midjourney</span>
              <span style={{ color: "oklch(0.45 0.008 240)" }}>→ 广泛探索，确定风格方向</span>
              <span className="px-2 py-0.5 rounded" style={{ background: "oklch(0.22 0.006 240)" }}>② Nanobananapro</span>
              <span style={{ color: "oklch(0.45 0.008 240)" }}>→ 生成高精度角色主图 + 三视图 + 多角度场景图</span>
            </div>
          </div>
        </div>
      </div>

      {/* Character list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"
            style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="step-badge px-2 py-0.5 rounded text-[10px]"
              style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)" }}>
              2.1
            </span>
            角色设计图提示词 (Nanobananapro 专用)
          </h3>
          <Button
            onClick={addCharacter}
            size="sm"
            variant="outline"
            className="flex items-center gap-1.5 text-xs h-7"
            style={{ borderColor: "oklch(0.35 0.008 240)", color: "oklch(0.70 0.008 240)", background: "transparent" }}
          >
            <Plus className="w-3 h-3" />
            添加角色
          </Button>
        </div>

        {characters.length === 0 && (
          <div className="text-center py-10 rounded"
            style={{ border: "1px dashed oklch(0.28 0.008 240)", color: "oklch(0.45 0.008 240)" }}>
            <p className="text-sm">点击「添加角色」开始设计角色</p>
            <p className="text-xs mt-1" style={{ color: "oklch(0.38 0.008 240)" }}>每个主要角色都需要生成三视图作为全片一致性的锚点</p>
          </div>
        )}

        <div className="space-y-6">
          {characters.map((char, idx) => (
            <div key={char.id} className="rounded overflow-hidden"
              style={{ border: "1px solid oklch(0.28 0.008 240)" }}>
              {/* Character header */}
              <div className="flex items-center justify-between px-4 py-2.5"
                style={{ background: "oklch(0.15 0.006 240)", borderBottom: "1px solid oklch(0.28 0.008 240)" }}>
                <span className="text-xs font-semibold" style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
                  CHAR_{String(idx + 1).padStart(2, "0")}
                </span>
                <button onClick={() => removeCharacter(char.id)} className="p-1 rounded hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.2 25)" }} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "name", label: "角色名", placeholder: "如：林枫" },
                    { key: "role", label: "角色定位", placeholder: "如：男主角，热血少年" },
                    { key: "appearance", label: "核心外貌关键词", placeholder: "如：白发红瞳，刀疤左眼，高挑" },
                    { key: "costume", label: "服装描述", placeholder: "如：黑色战袍，金色腰带，披风" },
                    { key: "marks", label: "特殊标记/道具", placeholder: "如：左手玄铁剑，额头印记" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className={key === "appearance" || key === "costume" ? "col-span-2" : ""}>
                      <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 240)" }}>{label}</Label>
                      <Input
                        value={char[key as keyof typeof char]}
                        onChange={e => updateCharacter(char.id, { [key]: e.target.value })}
                        placeholder={placeholder}
                        className="text-xs h-8"
                        style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }}
                      />
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleGenerate(char.id)}
                  size="sm"
                  className="flex items-center gap-2 text-xs"
                  style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  生成角色设计图提示词
                </Button>

                {generatedPrompts[char.id] && (
                  <div className="space-y-2">
                    <PromptBox label="中文提示词 (Nanobananapro)" content={generatedPrompts[char.id].zh} lang="zh" />
                    <PromptBox label="English Prompt (Nanobananapro)" content={generatedPrompts[char.id].en} lang="en" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Complete button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleComplete}
          className="flex items-center gap-2 px-6"
          style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
        >
          <CheckCircle2 className="w-4 h-4" />
          完成本阶段，进入分镜设计
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
