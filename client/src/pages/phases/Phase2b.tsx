import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ChevronRight, Wand2, Copy, Check, MapPin, Package, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

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

export default function Phase2b() {
  const { projectInfo, scriptAnalysis, episodeAssets, updateEpisodeAsset, markPhaseComplete, setActivePhase } = useProject();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatingEpId, setGeneratingEpId] = useState<string | null>(null);

  const generateAssetMutation = trpc.ai.generateAssetPrompt.useMutation();

  const episodes = scriptAnalysis.episodes;
  const activeEpId = episodes.length > 0 ? episodes[0].id : "";
  const [activeTab, setActiveTab] = useState(activeEpId);

  const handleGenerateAsset = async (assetId: string) => {
    const asset = episodeAssets.find(a => a.id === assetId);
    if (!asset) return;
    const ep = episodes.find(e => e.id === asset.episodeId);
    setGeneratingId(assetId);
    try {
      const result = await generateAssetMutation.mutateAsync({
        type: asset.type as "scene" | "prop",
        name: asset.name,
        description: asset.description,
        episodeContext: ep ? `第${ep.number}集《${ep.title}》：${ep.synopsis}` : "",
        styleZh: projectInfo.styleZh,
        styleEn: projectInfo.styleEn,
      });
      // Store both zh and en in promptMJ as JSON string
      updateEpisodeAsset(assetId, { promptMJ: JSON.stringify(result) });
      toast.success(`${asset.name} 提示词已生成`);
    } catch (err) {
      toast.error(`生成失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateAllForEp = async (epId: string) => {
    const epAssets = episodeAssets.filter(a => a.episodeId === epId);
    const ep = episodes.find(e => e.id === epId);
    setGeneratingEpId(epId);
    for (const asset of epAssets) {
      setGeneratingId(asset.id);
      try {
        const result = await generateAssetMutation.mutateAsync({
          type: asset.type as "scene" | "prop",
          name: asset.name,
          description: asset.description,
          episodeContext: ep ? `第${ep.number}集《${ep.title}》：${ep.synopsis}` : "",
          styleZh: projectInfo.styleZh,
          styleEn: projectInfo.styleEn,
        });
        updateEpisodeAsset(asset.id, { promptMJ: JSON.stringify(result) });
      } catch {
        // continue
      }
    }
    setGeneratingId(null);
    setGeneratingEpId(null);
    toast.success(`第${ep?.number}集资产提示词生成完成`);
  };

  const parsePrompt = (promptMJ: string): { zh: string; en: string } | null => {
    if (!promptMJ) return null;
    try {
      return JSON.parse(promptMJ) as { zh: string; en: string };
    } catch {
      return null;
    }
  };

  const handleComplete = () => {
    markPhaseComplete("phase2b");
    setActivePhase("phase3");
  };

  const S = {
    card: { background: "oklch(0.15 0.006 240)", border: "1px solid oklch(0.22 0.006 240)", borderRadius: "8px" } as React.CSSProperties,
    amber: "oklch(0.75 0.17 65)",
    dim: "oklch(0.55 0.01 240)",
    text: "oklch(0.88 0.005 60)",
    sub: "oklch(0.70 0.008 240)",
    green: "oklch(0.65 0.2 145)",
    blue: "oklch(0.60 0.18 240)",
  };

  return (
    <div className="space-y-8">
      {/* Phase header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded flex items-center justify-center text-lg font-bold"
          style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.4)", color: S.amber, fontFamily: "'JetBrains Mono', monospace" }}>2B</div>
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: S.text, fontFamily: "'Space Grotesk', sans-serif" }}>场景与道具资产</h2>
          <p className="text-sm" style={{ color: S.sub }}>按集分类 · MJ7 场景横版参考图 + 道具展示图</p>
        </div>
      </div>

      {episodes.length === 0 ? (
        <div className="p-8 text-center rounded" style={S.card}>
          <p className="text-sm" style={{ color: S.dim }}>请先在阶段一完成剧本解析，系统将自动提取各集场景和道具</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 mb-6" style={{ background: "oklch(0.13 0.005 240)", border: "1px solid oklch(0.22 0.006 240)" }}>
            {episodes.map(ep => {
              const epAssets = episodeAssets.filter(a => a.episodeId === ep.id);
              const done = epAssets.filter(a => a.promptMJ).length;
              return (
                <TabsTrigger key={ep.id} value={ep.id} className="text-xs px-3 py-1.5 rounded"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  EP{String(ep.number).padStart(2, "0")}
                  {done > 0 && <span className="ml-1 text-[10px]" style={{ color: S.green }}>({done}/{epAssets.length})</span>}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {episodes.map(ep => {
            const epAssets = episodeAssets.filter(a => a.episodeId === ep.id);
            const scenes = epAssets.filter(a => a.type === "scene");
            const props = epAssets.filter(a => a.type === "prop");
            const isGenAll = generatingEpId === ep.id;

            return (
              <TabsContent key={ep.id} value={ep.id} className="space-y-6">
                {/* Episode info */}
                <div className="p-4 rounded" style={S.card}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold" style={{ color: S.amber, fontFamily: "'JetBrains Mono', monospace" }}>EP{String(ep.number).padStart(2, "0")}</span>
                        <span className="font-bold" style={{ color: S.text }}>{ep.title}</span>
                        <Badge className="text-xs" style={{ background: "oklch(0.22 0.006 240)", color: S.dim }}>{ep.duration}分钟</Badge>
                      </div>
                      {ep.synopsis && <p className="text-xs" style={{ color: S.sub }}>{ep.synopsis}</p>}
                    </div>
                    <Button size="sm" onClick={() => handleGenerateAllForEp(ep.id)} disabled={isGenAll}
                      style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.4)", color: S.amber, flexShrink: 0 }}>
                      {isGenAll ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />生成中</> : <><Wand2 className="w-3 h-3 mr-1" />一键生成本集全部</>}
                    </Button>
                  </div>
                </div>

                {/* Scenes */}
                {scenes.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" style={{ color: S.green }} />
                      <h4 className="text-sm font-bold" style={{ color: S.green, fontFamily: "'JetBrains Mono', monospace" }}>场景 · MJ7 横版 16:9</h4>
                    </div>
                    {scenes.map(asset => {
                      const parsed = parsePrompt(asset.promptMJ);
                      return (
                        <div key={asset.id} className="p-4 space-y-3" style={S.card}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm" style={{ color: S.text }}>{asset.name}</span>
                                {asset.promptMJ && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: S.green }} />}
                              </div>
                              {asset.description && (
                                <p className="text-xs" style={{ color: S.sub }}>{asset.description}</p>
                              )}
                            </div>
                            <Button size="sm" onClick={() => handleGenerateAsset(asset.id)}
                              disabled={generatingId === asset.id || isGenAll}
                              style={{ background: "oklch(0.65 0.2 145 / 0.12)", border: "1px solid oklch(0.65 0.2 145 / 0.35)", color: S.green, flexShrink: 0 }}>
                              {generatingId === asset.id
                                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />生成中</>
                                : <><Wand2 className="w-3 h-3 mr-1" />{parsed ? "重新生成" : "生成提示词"}</>
                              }
                            </Button>
                          </div>
                          {parsed ? (
                            <PromptBlock label="MJ7 场景参考图（16:9）" zh={parsed.zh} en={parsed.en} />
                          ) : (
                            <div className="p-3 rounded text-xs text-center" style={{ background: "oklch(0.10 0.004 240)", border: "1px dashed oklch(0.28 0.008 240)", color: S.dim }}>
                              Gemini AI 将基于场景描述生成富有氛围感的 MJ7 提示词
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Props */}
                {props.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" style={{ color: S.blue }} />
                      <h4 className="text-sm font-bold" style={{ color: S.blue, fontFamily: "'JetBrains Mono', monospace" }}>道具 · MJ7 方形 1:1</h4>
                    </div>
                    {props.map(asset => {
                      const parsed = parsePrompt(asset.promptMJ);
                      return (
                        <div key={asset.id} className="p-4 space-y-3" style={S.card}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm" style={{ color: S.text }}>{asset.name}</span>
                                {asset.promptMJ && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: S.green }} />}
                              </div>
                              {asset.description && (
                                <p className="text-xs" style={{ color: S.sub }}>{asset.description}</p>
                              )}
                            </div>
                            <Button size="sm" onClick={() => handleGenerateAsset(asset.id)}
                              disabled={generatingId === asset.id || isGenAll}
                              style={{ background: "oklch(0.60 0.18 240 / 0.12)", border: "1px solid oklch(0.60 0.18 240 / 0.35)", color: S.blue, flexShrink: 0 }}>
                              {generatingId === asset.id
                                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />生成中</>
                                : <><Wand2 className="w-3 h-3 mr-1" />{parsed ? "重新生成" : "生成提示词"}</>
                              }
                            </Button>
                          </div>
                          {parsed ? (
                            <PromptBlock label="MJ7 道具展示图（1:1）" zh={parsed.zh} en={parsed.en} />
                          ) : (
                            <div className="p-3 rounded text-xs text-center" style={{ background: "oklch(0.10 0.004 240)", border: "1px dashed oklch(0.28 0.008 240)", color: S.dim }}>
                              Gemini AI 将基于道具描述生成产品展示风格的 MJ7 提示词
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {epAssets.length === 0 && (
                  <div className="p-8 text-center rounded" style={S.card}>
                    <p className="text-sm" style={{ color: S.dim }}>本集暂无场景或道具资产</p>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Complete button */}
      <div className="flex justify-end pt-4 border-t" style={{ borderColor: "oklch(0.22 0.006 240)" }}>
        <Button onClick={handleComplete} className="gap-2"
          style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.10 0.005 240)", fontWeight: 700 }}>
          场景道具完成，进入分镜设计
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
