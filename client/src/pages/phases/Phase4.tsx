// DESIGN: "导演手册" 工业风暗色系 — Phase 4: Seedance Prompt Generation (v2)
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ChevronRight, Wand2, Plus, Trash2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function CopyButton({ text, label = "复制" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("已复制");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all"
      style={{
        background: copied ? "oklch(0.65 0.2 145 / 0.15)" : "oklch(0.22 0.006 240)",
        border: `1px solid ${copied ? "oklch(0.65 0.2 145 / 0.4)" : "oklch(0.28 0.008 240)"}`,
        color: copied ? "oklch(0.65 0.2 145)" : "oklch(0.60 0.01 240)",
        fontFamily: "'JetBrains Mono', monospace"
      }}>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "已复制" : label}
    </button>
  );
}

export default function Phase4() {
  const {
    scriptAnalysis, shots, videoSegments,
    addVideoSegment, updateVideoSegment, removeVideoSegment,
    autoGenerateSegments, generateSegmentPrompt,
    markPhaseComplete, setActivePhase
  } = useProject();

  const [activeEpTab, setActiveEpTab] = useState(
    scriptAnalysis.episodes.length > 0 ? scriptAnalysis.episodes[0].id : ""
  );
  const [generatedPrompts, setGeneratedPrompts] = useState<Record<string, string>>({});

  const episodes = scriptAnalysis.episodes;

  const handleAutoGenerateSegments = (episodeId: string) => {
    const epShots = shots.filter(s => s.episodeId === episodeId);
    if (epShots.length === 0) {
      toast.error("请先在阶段三生成分镜");
      return;
    }
    autoGenerateSegments(episodeId);
    toast.success("已自动生成视频片段分组");
  };

  const handleGeneratePrompt = (segId: string) => {
    const prompt = generateSegmentPrompt(segId);
    setGeneratedPrompts(prev => ({ ...prev, [segId]: prompt }));
    updateVideoSegment(segId, { prompt });
  };

  const handleGenerateAllPrompts = (episodeId: string) => {
    const epSegs = videoSegments.filter(s => s.episodeId === episodeId);
    if (epSegs.length === 0) {
      toast.error("请先生成视频片段分组");
      return;
    }
    const newPrompts: Record<string, string> = {};
    epSegs.forEach(seg => {
      const prompt = generateSegmentPrompt(seg.id);
      newPrompts[seg.id] = prompt;
      updateVideoSegment(seg.id, { prompt });
    });
    setGeneratedPrompts(prev => ({ ...prev, ...newPrompts }));
    toast.success(`已生成 ${epSegs.length} 个片段提示词`);
  };

  const handleCopyAll = (episodeId: string) => {
    const epSegs = videoSegments.filter(s => s.episodeId === episodeId);
    const allPrompts = epSegs.map((seg) => {
      const p = generatedPrompts[seg.id] || seg.prompt;
      return `=== ${seg.name} ===\n${p}`;
    }).join("\n\n");
    navigator.clipboard.writeText(allPrompts);
    toast.success("已复制全集所有提示词");
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
            按分集自动生成 Seedance 多镜头视频片段提示词 · 含 VO / SFX · 无 @ 符号
          </p>
        </div>
      </div>

      {/* Seedance rules reminder */}
      <div className="p-3 rounded text-xs space-y-1"
        style={{ background: "oklch(0.75 0.17 65 / 0.06)", border: "1px solid oklch(0.75 0.17 65 / 0.2)" }}>
        <p style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          Seedance 2.0 全能参考模式 · 规则提醒
        </p>
        <ul className="space-y-0.5" style={{ color: "oklch(0.65 0.01 240)" }}>
          <li>· 每段视频 10–15 秒，含 2–5 个镜头，一分钟需 20–30 个镜头（约 4–6 个片段）</li>
          <li>· 提示词中不出现 @ 符号（参考图自行在平台内添加）</li>
          <li>· 不引用具体作品名称，使用风格描述词代替</li>
          <li>· 旁白（VO）和音效（SFX）直接写入提示词，背景音乐除外</li>
        </ul>
      </div>

      {episodes.length === 0 ? (
        <div className="text-center py-12 rounded"
          style={{ border: "1px dashed oklch(0.28 0.008 240)", color: "oklch(0.45 0.008 240)" }}>
          <p className="text-sm">请先在阶段一完成剧本解析</p>
        </div>
      ) : (
        <Tabs value={activeEpTab} onValueChange={setActiveEpTab}>
          <TabsList className="h-8" style={{ background: "oklch(0.17 0.006 240)" }}>
            {episodes.map(ep => {
              const segCount = videoSegments.filter(s => s.episodeId === ep.id).length;
              return (
                <TabsTrigger key={ep.id} value={ep.id} className="text-xs h-7 px-3"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  EP_{String(ep.number).padStart(2, "0")}
                  {segCount > 0 && (
                    <span className="ml-1 text-[9px] px-1 rounded"
                      style={{ background: "oklch(0.75 0.17 65 / 0.2)", color: "oklch(0.75 0.17 65)" }}>
                      {segCount}段
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {episodes.map(ep => {
            const epShots = shots.filter(s => s.episodeId === ep.id);
            const epSegs = videoSegments.filter(s => s.episodeId === ep.id);
            const totalDur = epSegs.reduce((a, s) => a + s.duration, 0);

            return (
              <TabsContent key={ep.id} value={ep.id} className="mt-4 space-y-4">
                {/* Episode toolbar */}
                <div className="flex items-center justify-between p-3 rounded"
                  style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: "oklch(0.88 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {ep.title}
                    </span>
                    <span className="text-xs ml-3" style={{ color: "oklch(0.50 0.01 240)" }}>
                      {epShots.length} 个镜头 · {epSegs.length} 个片段 · 约 {totalDur}s
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button onClick={() => handleAutoGenerateSegments(ep.id)} size="sm" variant="outline"
                      className="flex items-center gap-1.5 text-xs h-7"
                      style={{ borderColor: "oklch(0.35 0.008 240)", color: "oklch(0.70 0.008 240)", background: "transparent" }}>
                      <Wand2 className="w-3 h-3" />
                      自动分组
                    </Button>
                    <Button onClick={() => handleGenerateAllPrompts(ep.id)} size="sm"
                      className="flex items-center gap-1.5 text-xs h-7"
                      style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                      <Wand2 className="w-3 h-3" />
                      一键生成全部提示词
                    </Button>
                    {epSegs.length > 0 && (
                      <Button onClick={() => handleCopyAll(ep.id)} size="sm" variant="outline"
                        className="flex items-center gap-1.5 text-xs h-7"
                        style={{ borderColor: "oklch(0.35 0.008 240)", color: "oklch(0.70 0.008 240)", background: "transparent" }}>
                        <Copy className="w-3 h-3" />
                        复制全集
                      </Button>
                    )}
                    <Button onClick={() => addVideoSegment(ep.id)} size="sm" variant="outline"
                      className="flex items-center gap-1.5 text-xs h-7"
                      style={{ borderColor: "oklch(0.35 0.008 240)", color: "oklch(0.70 0.008 240)", background: "transparent" }}>
                      <Plus className="w-3 h-3" />
                      手动添加片段
                    </Button>
                  </div>
                </div>

                {epSegs.length === 0 ? (
                  <div className="text-center py-10 rounded"
                    style={{ border: "1px dashed oklch(0.28 0.008 240)", color: "oklch(0.45 0.008 240)" }}>
                    <p className="text-sm">
                      {epShots.length === 0
                        ? "请先在阶段三生成分镜，再回来自动生成提示词"
                        : "点击「自动分组」将分镜自动组合为 2-5 镜头的视频片段"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {epSegs.map((seg, idx) => {
                      const relatedShots = seg.shotIds.map(id => shots.find(s => s.id === id)).filter(Boolean);
                      const prompt = generatedPrompts[seg.id] || seg.prompt;
                      return (
                        <div key={seg.id} className="rounded overflow-hidden"
                          style={{ border: "1px solid oklch(0.28 0.008 240)" }}>
                          {/* Segment header */}
                          <div className="flex items-center justify-between px-4 py-2.5"
                            style={{ background: "oklch(0.15 0.006 240)", borderBottom: "1px solid oklch(0.28 0.008 240)" }}>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold"
                                style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
                                SEG_{String(idx + 1).padStart(2, "0")}
                              </span>
                              <Input value={seg.name}
                                onChange={e => updateVideoSegment(seg.id, { name: e.target.value })}
                                className="h-6 text-xs w-52"
                                style={{ background: "transparent", border: "none", color: "oklch(0.85 0.005 60)", padding: "0" }} />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-2 py-0.5 rounded"
                                style={{ background: "oklch(0.22 0.006 240)", color: "oklch(0.60 0.01 240)" }}>
                                {relatedShots.length} 镜头 · {seg.duration}s
                              </span>
                              <Button onClick={() => handleGeneratePrompt(seg.id)} size="sm"
                                className="flex items-center gap-1 text-xs h-6"
                                style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                                <Wand2 className="w-3 h-3" />
                                生成
                              </Button>
                              {prompt && <CopyButton text={prompt} />}
                              <button onClick={() => removeVideoSegment(seg.id)} className="p-1 rounded hover:bg-red-500/10">
                                <Trash2 className="w-3 h-3" style={{ color: "oklch(0.55 0.2 25)" }} />
                              </button>
                            </div>
                          </div>

                          <div className="p-3 space-y-2">
                            {/* Shot tags */}
                            {relatedShots.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {relatedShots.map(shot => shot && (
                                  <span key={shot.id} className="text-[10px] px-2 py-0.5 rounded"
                                    style={{ background: "oklch(0.22 0.006 240)", color: "oklch(0.65 0.01 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
                                    镜{shot.number} · {shot.size} · {shot.emotion}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Duration control */}
                            <div className="flex items-center gap-3">
                              <Label className="text-[10px] flex-shrink-0" style={{ color: "oklch(0.55 0.01 240)" }}>
                                片段时长(秒)
                              </Label>
                              <Input
                                type="number" min={5} max={15}
                                value={seg.duration}
                                onChange={e => updateVideoSegment(seg.id, { duration: Number(e.target.value) })}
                                className="h-7 text-xs w-20"
                                style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }} />
                              <span className="text-[10px]" style={{ color: "oklch(0.45 0.008 240)" }}>建议 10–15 秒</span>
                            </div>

                            {/* Generated prompt */}
                            {prompt ? (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] uppercase tracking-widest"
                                    style={{ color: "oklch(0.45 0.008 240)", fontFamily: "'JetBrains Mono', monospace" }}>
                                    Seedance 提示词
                                  </span>
                                  <CopyButton text={prompt} />
                                </div>
                                <Textarea value={prompt}
                                  onChange={e => {
                                    setGeneratedPrompts(prev => ({ ...prev, [seg.id]: e.target.value }));
                                    updateVideoSegment(seg.id, { prompt: e.target.value });
                                  }}
                                  rows={6} className="text-xs resize-none"
                                  style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.85 0.005 60)", fontFamily: "'JetBrains Mono', monospace", borderLeft: "3px solid oklch(0.75 0.17 65)" }} />
                              </div>
                            ) : (
                              <div className="text-center py-4 rounded text-xs"
                                style={{ border: "1px dashed oklch(0.25 0.008 240)", color: "oklch(0.40 0.008 240)" }}>
                                点击「生成」按钮生成此片段的 Seedance 提示词
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={() => { markPhaseComplete("phase4"); setActivePhase("phase5"); }}
          className="flex items-center gap-2 px-6"
          style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          <CheckCircle2 className="w-4 h-4" />
          完成本阶段，进入生成与后期
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
