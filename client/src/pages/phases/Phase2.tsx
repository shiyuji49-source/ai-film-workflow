// DESIGN: "导演手册" 工业风暗色系 — Phase 2: Asset Design (v2)
import { useProject } from "@/contexts/ProjectContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ChevronRight, Plus, Trash2, Wand2, Copy, Check, Pin } from "lucide-react";
import PromptBox from "@/components/PromptBox";
import { useState } from "react";
import { toast } from "sonner";

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

export default function Phase2() {
  const { projectInfo, characters, addCharacter, updateCharacter, removeCharacter,
    generateCharacterPrompt, scriptAnalysis, episodeAssets, addEpisodeAsset,
    updateEpisodeAsset, removeEpisodeAsset, generateAssetPromptMJ,
    markPhaseComplete, setActivePhase } = useProject();

  const [generatedPrompts, setGeneratedPrompts] = useState<Record<string, { zh: string; en: string }>>({});
  const [generatedAssetPrompts, setGeneratedAssetPrompts] = useState<Record<string, string>>({});
  const [activeEpTab, setActiveEpTab] = useState(
    scriptAnalysis.episodes.length > 0 ? scriptAnalysis.episodes[0].id : "ep0"
  );

  const handleGenerateChar = (charId: string) => {
    const char = characters.find(c => c.id === charId);
    if (!char) return;
    const result = generateCharacterPrompt(char);
    setGeneratedPrompts(prev => ({ ...prev, [charId]: result }));
    updateCharacter(charId, { promptZh: result.zh, promptEn: result.en });
  };

  const handleGenerateAllChars = () => {
    characters.forEach(char => {
      const result = generateCharacterPrompt(char);
      setGeneratedPrompts(prev => ({ ...prev, [char.id]: result }));
      updateCharacter(char.id, { promptZh: result.zh, promptEn: result.en });
    });
    toast.success(`已生成 ${characters.length} 个角色提示词`);
  };

  const handleGenerateAsset = (assetId: string) => {
    const asset = episodeAssets.find(a => a.id === assetId);
    if (!asset) return;
    const prompt = generateAssetPromptMJ(asset);
    setGeneratedAssetPrompts(prev => ({ ...prev, [assetId]: prompt }));
    updateEpisodeAsset(assetId, { promptMJ: prompt });
  };

  const handleComplete = () => {
    markPhaseComplete("phase2");
    setActivePhase("phase3");
  };

  const episodes = scriptAnalysis.episodes;

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
            MJ7 探索风格 → Nanobananapro 生成精确资产 → 全集统一锚点
          </p>
        </div>
      </div>

      {/* ── SECTION A: Fixed Nanobananapro Templates ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Pin className="w-4 h-4" style={{ color: "oklch(0.75 0.17 65)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
            固定模板 — Nanobananapro 专用（所有项目通用）
          </h3>
        </div>
        <div className="p-3 rounded mb-4 text-xs"
          style={{ background: "oklch(0.75 0.17 65 / 0.06)", border: "1px solid oklch(0.75 0.17 65 / 0.2)" }}>
          <span style={{ color: "oklch(0.70 0.10 65)" }}>
            以下模板为固定结构，将 [ ] 中的占位符替换为具体内容后，直接粘贴到 Nanobananapro 使用。
          </span>
        </div>
        <div className="space-y-4">
          {Object.entries(NANO_TEMPLATES).map(([key, tpl]) => (
            <div key={key} className="rounded overflow-hidden"
              style={{ border: "1px solid oklch(0.28 0.008 240)" }}>
              <div className="flex items-center justify-between px-4 py-2.5"
                style={{ background: "oklch(0.15 0.006 240)", borderBottom: "1px solid oklch(0.28 0.008 240)" }}>
                <span className="text-xs font-semibold" style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {tpl.label}
                </span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: "oklch(0.45 0.008 240)", fontFamily: "'JetBrains Mono', monospace" }}>中文模板</span>
                  <CopyButton text={tpl.zh} />
                </div>
                <pre className="text-[10px] leading-relaxed whitespace-pre-wrap p-3 rounded"
                  style={{ background: "oklch(0.10 0.004 240)", color: "oklch(0.80 0.005 60)", fontFamily: "'JetBrains Mono', monospace", borderLeft: "3px solid oklch(0.75 0.17 65)" }}>
                  {tpl.zh}
                </pre>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: "oklch(0.45 0.008 240)", fontFamily: "'JetBrains Mono', monospace" }}>English Template</span>
                  <CopyButton text={tpl.en} />
                </div>
                <pre className="text-[10px] leading-relaxed whitespace-pre-wrap p-3 rounded"
                  style={{ background: "oklch(0.10 0.004 240)", color: "oklch(0.80 0.005 60)", fontFamily: "'JetBrains Mono', monospace", borderLeft: "3px solid oklch(0.65 0.18 280)" }}>
                  {tpl.en}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION B: Global Characters & Mecha ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2"
            style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="px-2 py-0.5 rounded text-[10px]"
              style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)" }}>A</span>
            人物与机甲资产提示词（不分集，全局统一）
          </h3>
          <div className="flex gap-2">
            {characters.length > 0 && (
              <Button onClick={handleGenerateAllChars} size="sm"
                className="flex items-center gap-1.5 text-xs h-7"
                style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                <Wand2 className="w-3 h-3" />
                一键生成全部
              </Button>
            )}
            <Button onClick={() => addCharacter()} size="sm" variant="outline"
              className="flex items-center gap-1.5 text-xs h-7"
              style={{ borderColor: "oklch(0.35 0.008 240)", color: "oklch(0.70 0.008 240)", background: "transparent" }}>
              <Plus className="w-3 h-3" />
              添加角色
            </Button>
          </div>
        </div>

        <div className="mb-4 p-2.5 rounded text-xs flex items-center gap-2"
          style={{ background: "oklch(0.20 0.015 65 / 0.3)", border: "1px solid oklch(0.75 0.17 65 / 0.25)" }}>
          <span style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>工具：MJ7</span>
          <span style={{ color: "oklch(0.55 0.01 240)" }}>— 用于探索人物/机甲风格参考图。机甲角色自动识别，提示词模板不同。</span>
        </div>

        {characters.length === 0 && (
          <div className="text-center py-8 rounded"
            style={{ border: "1px dashed oklch(0.28 0.008 240)", color: "oklch(0.45 0.008 240)" }}>
            <p className="text-sm">从剧本解析后自动填充，或手动添加角色/机甲</p>
          </div>
        )}

        <div className="space-y-4">
          {characters.map((char, idx) => (
            <div key={char.id} className="rounded overflow-hidden"
              style={{ border: "1px solid oklch(0.28 0.008 240)" }}>
              <div className="flex items-center justify-between px-4 py-2.5"
                style={{ background: "oklch(0.15 0.006 240)", borderBottom: "1px solid oklch(0.28 0.008 240)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {char.isMecha ? "MECHA" : "CHAR"}_{String(idx + 1).padStart(2, "0")} · {char.name || "未命名"}
                  </span>
                  {char.isMecha && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest"
                      style={{ background: "oklch(0.55 0.2 280 / 0.2)", border: "1px solid oklch(0.55 0.2 280 / 0.5)", color: "oklch(0.70 0.18 280)", fontFamily: "'JetBrains Mono', monospace" }}>
                      机甲
                    </span>
                  )}
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={char.isMecha} onChange={e => updateCharacter(char.id, { isMecha: e.target.checked })}
                      className="w-3 h-3 accent-amber-400" />
                    <span className="text-[9px]" style={{ color: "oklch(0.50 0.01 240)" }}>机甲</span>
                  </label>
                </div>
                <button onClick={() => removeCharacter(char.id)} className="p-1 rounded hover:bg-red-500/10">
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.2 25)" }} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "name", label: "角色名", placeholder: "如：林枫" },
                    { key: "role", label: "角色定位", placeholder: "如：男主角，热血少年" },
                    { key: "appearance", label: "核心外貌", placeholder: "如：白发红瞳，刀疤左眼" },
                    { key: "costume", label: "服装描述", placeholder: "如：黑色战袍，金色腰带" },
                    { key: "marks", label: "特殊标记/道具", placeholder: "如：左手玄铁剑，额头印记" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className={key === "appearance" || key === "costume" ? "col-span-2" : ""}>
                      <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.65 0.01 240)" }}>{label}</Label>
                      <Input value={String(char[key as keyof typeof char] ?? "")} onChange={e => updateCharacter(char.id, { [key]: e.target.value })}
                        placeholder={placeholder} className="text-xs h-8"
                        style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }} />
                    </div>
                  ))}
                </div>
                <Button onClick={() => handleGenerateChar(char.id)} size="sm"
                  className="flex items-center gap-2 text-xs"
                  style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                  <Wand2 className="w-3.5 h-3.5" />
                  生成 MJ7 提示词
                </Button>
                {(generatedPrompts[char.id] || (char.promptZh && char.promptEn)) && (
                  <div className="space-y-2">
                    <PromptBox label={`中文提示词 · MJ7 · ${char.isMecha ? "机甲模板" : "人物模板"}`} content={generatedPrompts[char.id]?.zh || char.promptZh} lang="zh" />
                    <PromptBox label={`English Prompt · MJ7 · ${char.isMecha ? "Mecha Template" : "Character Template"}`} content={generatedPrompts[char.id]?.en || char.promptEn} lang="en" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION C: Per-Episode Scene & Prop Assets ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2"
            style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="px-2 py-0.5 rounded text-[10px]"
              style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)" }}>B</span>
            分集场景 & 道具资产提示词（按集管理）
          </h3>
        </div>
        <div className="mb-4 p-2.5 rounded text-xs flex items-center gap-2"
          style={{ background: "oklch(0.20 0.015 65 / 0.3)", border: "1px solid oklch(0.75 0.17 65 / 0.25)" }}>
          <span style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>工具：MJ7</span>
          <span style={{ color: "oklch(0.55 0.01 240)" }}>— 场景多角度参考图 / 道具展示图。人物不在此列，见上方 A 区。</span>
        </div>

        {episodes.length === 0 ? (
          <div className="text-center py-8 rounded"
            style={{ border: "1px dashed oklch(0.28 0.008 240)", color: "oklch(0.45 0.008 240)" }}>
            <p className="text-sm">请先在阶段一完成剧本解析</p>
          </div>
        ) : (
          <Tabs value={activeEpTab} onValueChange={setActiveEpTab}>
            <TabsList className="h-8 flex-wrap gap-1 mb-4" style={{ background: "oklch(0.17 0.006 240)" }}>
              {episodes.map(ep => (
                <TabsTrigger key={ep.id} value={ep.id} className="text-xs h-7 px-3"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  EP_{String(ep.number).padStart(2, "0")}
                </TabsTrigger>
              ))}
            </TabsList>

            {episodes.map(ep => {
              const epAssets = episodeAssets.filter(a => a.episodeId === ep.id);
              const sceneAssets = epAssets.filter(a => a.type === "scene");
              const propAssets = epAssets.filter(a => a.type === "prop");

              return (
                <TabsContent key={ep.id} value={ep.id} className="space-y-4 mt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold" style={{ color: "oklch(0.88 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {ep.title}
                      </span>
                      <span className="text-xs ml-2" style={{ color: "oklch(0.50 0.01 240)" }}>
                        约 {ep.duration} 分钟 · {ep.characters.join("、") || "无角色"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => addEpisodeAsset(ep.id, "scene")} size="sm" variant="outline"
                        className="flex items-center gap-1 text-xs h-7"
                        style={{ borderColor: "oklch(0.35 0.008 240)", color: "oklch(0.70 0.008 240)", background: "transparent" }}>
                        <Plus className="w-3 h-3" />
                        场景
                      </Button>
                      <Button onClick={() => addEpisodeAsset(ep.id, "prop")} size="sm" variant="outline"
                        className="flex items-center gap-1 text-xs h-7"
                        style={{ borderColor: "oklch(0.35 0.008 240)", color: "oklch(0.70 0.008 240)", background: "transparent" }}>
                        <Plus className="w-3 h-3" />
                        道具
                      </Button>
                    </div>
                  </div>

                  {/* Characters list (names only, no prompts) */}
                  {ep.characters.length > 0 && (
                    <div className="p-3 rounded"
                      style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
                      <p className="text-[10px] font-semibold mb-2 uppercase tracking-widest"
                        style={{ color: "oklch(0.55 0.01 240)", fontFamily: "'JetBrains Mono', monospace" }}>
                        本集出场人物（提示词见上方全局人物区）
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {ep.characters.map(c => (
                          <span key={c} className="text-xs px-2 py-0.5 rounded"
                            style={{ background: "oklch(0.22 0.006 240)", color: "oklch(0.75 0.17 65)", border: "1px solid oklch(0.30 0.008 240)" }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scene assets */}
                  {sceneAssets.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.65 0.2 145)", fontFamily: "'Space Grotesk', sans-serif" }}>
                        场景资产
                      </p>
                      <div className="space-y-3">
                        {sceneAssets.map(asset => (
                          <AssetCard key={asset.id} asset={asset}
                            onUpdate={(data) => updateEpisodeAsset(asset.id, data)}
                            onRemove={() => removeEpisodeAsset(asset.id)}
                            onGenerate={() => handleGenerateAsset(asset.id)}
                            generatedPrompt={generatedAssetPrompts[asset.id] || asset.promptMJ}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prop assets */}
                  {propAssets.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.65 0.18 280)", fontFamily: "'Space Grotesk', sans-serif" }}>
                        道具资产
                      </p>
                      <div className="space-y-3">
                        {propAssets.map(asset => (
                          <AssetCard key={asset.id} asset={asset}
                            onUpdate={(data) => updateEpisodeAsset(asset.id, data)}
                            onRemove={() => removeEpisodeAsset(asset.id)}
                            onGenerate={() => handleGenerateAsset(asset.id)}
                            generatedPrompt={generatedAssetPrompts[asset.id] || asset.promptMJ}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {epAssets.length === 0 && (
                    <div className="text-center py-6 rounded"
                      style={{ border: "1px dashed oklch(0.28 0.008 240)", color: "oklch(0.45 0.008 240)" }}>
                      <p className="text-sm">点击上方按钮添加场景或道具资产</p>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </section>

      <div className="flex justify-end pt-2">
        <Button onClick={handleComplete} className="flex items-center gap-2 px-6"
          style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          <CheckCircle2 className="w-4 h-4" />
          完成本阶段，进入分镜设计
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Asset Card Sub-component ─────────────────────────────────────────────────
import type { EpisodeAsset } from "@/contexts/ProjectContext";

function AssetCard({ asset, onUpdate, onRemove, onGenerate, generatedPrompt }: {
  asset: EpisodeAsset;
  onUpdate: (data: Partial<EpisodeAsset>) => void;
  onRemove: () => void;
  onGenerate: () => void;
  generatedPrompt: string;
}) {
  const accentColor = asset.type === "scene" ? "oklch(0.65 0.2 145)" : "oklch(0.65 0.18 280)";
  return (
    <div className="rounded overflow-hidden" style={{ border: "1px solid oklch(0.28 0.008 240)" }}>
      <div className="flex items-center justify-between px-3 py-2"
        style={{ background: "oklch(0.15 0.006 240)", borderBottom: "1px solid oklch(0.28 0.008 240)" }}>
        <span className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: accentColor, fontFamily: "'JetBrains Mono', monospace" }}>
          {asset.type === "scene" ? "SCENE" : "PROP"}
        </span>
        <button onClick={onRemove} className="p-1 rounded hover:bg-red-500/10">
          <Trash2 className="w-3 h-3" style={{ color: "oklch(0.55 0.2 25)" }} />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]" style={{ color: "oklch(0.55 0.01 240)" }}>名称</Label>
            <Input value={asset.name} onChange={e => onUpdate({ name: e.target.value })}
              className="text-xs h-7" style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]" style={{ color: "oklch(0.55 0.01 240)" }}>描述</Label>
            <Input value={asset.description} onChange={e => onUpdate({ description: e.target.value })}
              className="text-xs h-7" style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }} />
          </div>
        </div>
        <div className="flex gap-2 items-start">
          <Button onClick={onGenerate} size="sm"
            className="flex items-center gap-1.5 text-xs flex-shrink-0"
            style={{ background: "oklch(0.22 0.006 240)", color: accentColor, border: `1px solid ${accentColor}40`, fontFamily: "'Space Grotesk', sans-serif" }}>
            <Wand2 className="w-3 h-3" />
            生成 MJ7 提示词
          </Button>
        </div>
        {generatedPrompt && <PromptBox label="MJ7 提示词" content={generatedPrompt} />}
      </div>
    </div>
  );
}
