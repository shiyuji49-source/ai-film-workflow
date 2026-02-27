// DESIGN: "导演手册" 工业风暗色系 — Phase 3: Storyboarding + Timeline
import { useProject } from "@/contexts/ProjectContext";
import { SHOT_TYPES, SHOT_SIZES, CAMERA_MOVEMENTS, SHOT_RATIOS } from "@/lib/workflowData";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ChevronRight, Plus, Trash2, Wand2, BarChart2, List } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

// ─── Emotion Timeline Component ───────────────────────────────────────────────
function EmotionTimeline({ shots }: { shots: Array<{ number: number; emotion: string; emotionLevel: number; duration: number; type: string }> }) {
  if (shots.length === 0) return (
    <div className="flex items-center justify-center h-32 rounded"
      style={{ border: "1px dashed oklch(0.28 0.008 240)", color: "oklch(0.40 0.008 240)" }}>
      <p className="text-xs">生成分镜后显示情绪曲线</p>
    </div>
  );

  const maxLevel = 5;
  const totalDur = shots.reduce((s, sh) => s + sh.duration, 0);
  const svgH = 120;
  const svgW = 800;
  const padX = 40;
  const padY = 16;
  const chartH = svgH - padY * 2;
  const chartW = svgW - padX * 2;

  // Build points
  let cumDur = 0;
  const points = shots.map(sh => {
    const x = padX + (cumDur / totalDur) * chartW;
    const y = padY + ((maxLevel - sh.emotionLevel) / (maxLevel - 1)) * chartH;
    cumDur += sh.duration;
    return { x, y, shot: sh };
  });
  // Add final point
  points.push({ x: padX + chartW, y: points[points.length - 1].y, shot: shots[shots.length - 1] });

  // Build SVG path
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${(padX + chartW).toFixed(1)} ${(padY + chartH).toFixed(1)} L ${padX.toFixed(1)} ${(padY + chartH).toFixed(1)} Z`;

  // Color by emotion level
  const getColor = (level: number) => {
    if (level <= 1) return "oklch(0.60 0.01 240)";
    if (level <= 2) return "oklch(0.65 0.15 200)";
    if (level <= 3) return "oklch(0.70 0.18 85)";
    if (level <= 4) return "oklch(0.75 0.17 65)";
    return "oklch(0.65 0.2 25)";
  };

  const EMOTION_LABELS = ["", "平静", "铺垫", "紧张", "高燃", "爆发"];

  return (
    <div className="rounded overflow-hidden" style={{ border: "1px solid oklch(0.28 0.008 240)" }}>
      <div className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: "oklch(0.15 0.006 240)", borderBottom: "1px solid oklch(0.28 0.008 240)" }}>
        <BarChart2 className="w-3.5 h-3.5" style={{ color: "oklch(0.75 0.17 65)" }} />
        <span className="text-xs font-semibold" style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
          情绪曲线 · {shots.length} 个镜头 · 总时长 {totalDur}s
        </span>
        <div className="ml-auto flex items-center gap-3 text-[10px]" style={{ color: "oklch(0.45 0.008 240)" }}>
          {[1, 2, 3, 4, 5].map(l => (
            <span key={l} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: getColor(l) }} />
              {EMOTION_LABELS[l]}
            </span>
          ))}
        </div>
      </div>
      <div className="p-3" style={{ background: "oklch(0.12 0.005 240)" }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ height: "120px" }}>
          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map(level => {
            const y = padY + ((maxLevel - level) / (maxLevel - 1)) * chartH;
            return (
              <g key={level}>
                <line x1={padX} y1={y} x2={padX + chartW} y2={y}
                  stroke="oklch(0.22 0.006 240)" strokeWidth="0.5" strokeDasharray="4,4" />
                <text x={padX - 4} y={y + 3} textAnchor="end" fontSize="8"
                  fill="oklch(0.40 0.008 240)" fontFamily="JetBrains Mono, monospace">
                  {EMOTION_LABELS[level]}
                </text>
              </g>
            );
          })}
          {/* Area fill */}
          <path d={areaD} fill="oklch(0.75 0.17 65 / 0.08)" />
          {/* Line */}
          <path d={pathD} fill="none" stroke="oklch(0.75 0.17 65)" strokeWidth="1.5" strokeLinejoin="round" />
          {/* Points */}
          {points.slice(0, -1).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3"
              fill={getColor(p.shot.emotionLevel)}
              stroke="oklch(0.12 0.005 240)" strokeWidth="1.5">
              <title>{`镜头${p.shot.number}: ${p.shot.emotion} (${p.shot.type})`}</title>
            </circle>
          ))}
          {/* Shot type markers at bottom */}
          {points.slice(0, -1).map((p, i) => (
            <text key={`t${i}`} x={p.x} y={svgH - 2} textAnchor="middle" fontSize="6"
              fill="oklch(0.35 0.008 240)" fontFamily="JetBrains Mono, monospace">
              {p.shot.number}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─── Shot Row Component ────────────────────────────────────────────────────────
function ShotRow({ shot, onUpdate, onRemove }: {
  shot: ReturnType<typeof useProject>["shots"][0];
  onUpdate: (data: Parameters<ReturnType<typeof useProject>["updateShot"]>[1]) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const emotionColors: Record<number, string> = {
    1: "oklch(0.60 0.01 240)", 2: "oklch(0.65 0.15 200)",
    3: "oklch(0.70 0.18 85)", 4: "oklch(0.75 0.17 65)", 5: "oklch(0.65 0.2 25)",
  };
  const ec = emotionColors[shot.emotionLevel] || "oklch(0.60 0.01 240)";

  return (
    <div className="rounded overflow-hidden" style={{ border: "1px solid oklch(0.28 0.008 240)" }}>
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        style={{ background: "oklch(0.15 0.006 240)", borderBottom: expanded ? "1px solid oklch(0.28 0.008 240)" : "none" }}
        onClick={() => setExpanded(e => !e)}>
        <span className="text-[10px] font-bold w-10 flex-shrink-0"
          style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
          {String(shot.number).padStart(3, "0")}
        </span>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ec }} />
        <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ background: "oklch(0.22 0.006 240)", color: "oklch(0.65 0.01 240)" }}>{shot.type}</span>
        <span className="text-[10px] flex-shrink-0" style={{ color: "oklch(0.55 0.01 240)" }}>{shot.size}</span>
        <span className="text-[10px] flex-1 truncate" style={{ color: "oklch(0.65 0.01 240)" }}>{shot.description || "—"}</span>
        <span className="text-[10px] flex-shrink-0" style={{ color: "oklch(0.50 0.01 240)", fontFamily: "'JetBrains Mono', monospace" }}>{shot.duration}s</span>
        <span className="text-[10px] flex-shrink-0" style={{ color: ec }}>{shot.emotion}</span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 rounded hover:bg-red-500/10 flex-shrink-0">
          <Trash2 className="w-3 h-3" style={{ color: "oklch(0.55 0.2 25)" }} />
        </button>
      </div>
      {expanded && (
        <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {[
            { key: "type", label: "镜头类型", type: "select", options: SHOT_TYPES.map(t => t.name) },
            { key: "size", label: "景别", type: "select", options: SHOT_SIZES.map(s => s.name) },
            { key: "movement", label: "镜头运动", type: "select", options: CAMERA_MOVEMENTS.map(m => m.name) },
            { key: "duration", label: "时长(秒)", type: "number" },
            { key: "emotion", label: "情绪", type: "text", placeholder: "如：热血、燃" },
            { key: "emotionLevel", label: "情绪强度(1-5)", type: "number" },
          ].map(({ key, label, type, options, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="text-[10px]" style={{ color: "oklch(0.55 0.01 240)" }}>{label}</Label>
              {type === "select" ? (
                <Select value={String(shot[key as keyof typeof shot])} onValueChange={v => onUpdate({ [key]: v })}>
                  <SelectTrigger className="h-7 text-[10px]" style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
                    {(options || []).map(o => (
                      <SelectItem key={o} value={o} className="text-[10px]" style={{ color: "oklch(0.88 0.005 60)" }}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={String(shot[key as keyof typeof shot])}
                  onChange={e => onUpdate({ [key]: type === "number" ? Number(e.target.value) : e.target.value })}
                  type={type} min={type === "number" ? 1 : undefined} max={key === "emotionLevel" ? 5 : key === "duration" ? 15 : undefined}
                  placeholder={placeholder}
                  className="h-7 text-[10px]"
                  style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }} />
              )}
            </div>
          ))}
          <div className="col-span-2 md:col-span-3 space-y-1">
            <Label className="text-[10px]" style={{ color: "oklch(0.55 0.01 240)" }}>画面描述</Label>
            <Textarea value={shot.description} onChange={e => onUpdate({ description: e.target.value })}
              rows={2} className="text-[10px] resize-none"
              style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-[10px]" style={{ color: "oklch(0.55 0.01 240)" }}>VO / 旁白</Label>
            <Input value={shot.vo} onChange={e => onUpdate({ vo: e.target.value })}
              className="h-7 text-[10px]"
              style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]" style={{ color: "oklch(0.55 0.01 240)" }}>SFX / 音效</Label>
            <Input value={shot.sfx} onChange={e => onUpdate({ sfx: e.target.value })}
              className="h-7 text-[10px]"
              style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Phase3() {
  const { scriptAnalysis, shots, addShot, updateShot, removeShot,
    autoGenerateShots, markPhaseComplete, setActivePhase } = useProject();
  const [activeEpTab, setActiveEpTab] = useState(
    scriptAnalysis.episodes.length > 0 ? scriptAnalysis.episodes[0].id : ""
  );
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");

  const episodes = scriptAnalysis.episodes;
  const activeEp = episodes.find(e => e.id === activeEpTab);
  const epShots = useMemo(() => shots.filter(s => s.episodeId === activeEpTab), [shots, activeEpTab]);

  const handleAutoGenerate = () => {
    if (!activeEpTab) { toast.error("请先选择集数"); return; }
    autoGenerateShots(activeEpTab);
    toast.success(`已为 ${activeEp?.title} 自动生成约 ${(activeEp?.duration || 1) * 25} 个分镜`);
  };

  const handleComplete = () => {
    markPhaseComplete("phase3");
    setActivePhase("phase4");
  };

  return (
    <div className="space-y-8">
      {/* Phase header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded flex items-center justify-center text-lg font-bold"
          style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.4)", color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
          03
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "oklch(0.92 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>
            分镜设计
          </h2>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 240)" }}>
            按集数自动生成分镜 · 可视化情绪曲线 · 支持手动精调
          </p>
        </div>
      </div>

      {episodes.length === 0 ? (
        <div className="text-center py-12 rounded"
          style={{ border: "1px dashed oklch(0.28 0.008 240)", color: "oklch(0.45 0.008 240)" }}>
          <p className="text-sm">请先在阶段一完成剧本解析</p>
        </div>
      ) : (
        <>
          {/* Episode tabs */}
          <Tabs value={activeEpTab} onValueChange={v => { setActiveEpTab(v); setViewMode("list"); }}>
            <div className="flex items-center justify-between mb-3">
              <TabsList className="h-8" style={{ background: "oklch(0.17 0.006 240)" }}>
                {episodes.map(ep => (
                  <TabsTrigger key={ep.id} value={ep.id} className="text-xs h-7 px-3"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    EP_{String(ep.number).padStart(2, "0")}
                    {shots.filter(s => s.episodeId === ep.id).length > 0 && (
                      <span className="ml-1 text-[9px] px-1 rounded"
                        style={{ background: "oklch(0.75 0.17 65 / 0.2)", color: "oklch(0.75 0.17 65)" }}>
                        {shots.filter(s => s.episodeId === ep.id).length}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex items-center gap-2">
                <Button onClick={() => setViewMode(v => v === "list" ? "timeline" : "list")} size="sm" variant="outline"
                  className="flex items-center gap-1.5 text-xs h-7"
                  style={{ borderColor: "oklch(0.35 0.008 240)", color: "oklch(0.70 0.008 240)", background: "transparent" }}>
                  {viewMode === "list" ? <BarChart2 className="w-3 h-3" /> : <List className="w-3 h-3" />}
                  {viewMode === "list" ? "情绪曲线" : "分镜列表"}
                </Button>
              </div>
            </div>

            {episodes.map(ep => (
              <TabsContent key={ep.id} value={ep.id} className="mt-0 space-y-4">
                {/* Episode info bar */}
                <div className="flex items-center justify-between p-3 rounded"
                  style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: "oklch(0.88 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {ep.title}
                    </span>
                    <span className="text-xs ml-3" style={{ color: "oklch(0.50 0.01 240)" }}>
                      {ep.duration} 分钟 · 建议 {ep.duration * 20}–{ep.duration * 30} 个镜头
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAutoGenerate} size="sm"
                      className="flex items-center gap-1.5 text-xs h-7"
                      style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                      <Wand2 className="w-3 h-3" />
                      AI 自动生成分镜
                    </Button>
                    <Button onClick={() => addShot(ep.id)} size="sm" variant="outline"
                      className="flex items-center gap-1.5 text-xs h-7"
                      style={{ borderColor: "oklch(0.35 0.008 240)", color: "oklch(0.70 0.008 240)", background: "transparent" }}>
                      <Plus className="w-3 h-3" />
                      手动添加
                    </Button>
                  </div>
                </div>

                {viewMode === "timeline" ? (
                  <EmotionTimeline shots={epShots.map(s => ({ number: s.number, emotion: s.emotion, emotionLevel: s.emotionLevel, duration: s.duration, type: s.type }))} />
                ) : (
                  <div className="space-y-1.5">
                    {epShots.length === 0 ? (
                      <div className="text-center py-10 rounded"
                        style={{ border: "1px dashed oklch(0.28 0.008 240)", color: "oklch(0.45 0.008 240)" }}>
                        <p className="text-sm">点击「AI 自动生成分镜」快速创建完整分镜表</p>
                        <p className="text-xs mt-1" style={{ color: "oklch(0.38 0.008 240)" }}>
                          将根据集数时长（{ep.duration} 分钟）和类型自动生成约 {ep.duration * 25} 个镜头
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Shot list header */}
                        <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest"
                          style={{ color: "oklch(0.40 0.008 240)", fontFamily: "'JetBrains Mono', monospace" }}>
                          <span className="w-10">编号</span>
                          <span className="w-2"></span>
                          <span className="w-20">类型</span>
                          <span className="w-16">景别</span>
                          <span className="flex-1">画面描述</span>
                          <span className="w-8">时长</span>
                          <span className="w-16">情绪</span>
                          <span className="w-6"></span>
                        </div>
                        {epShots.map(shot => (
                          <ShotRow key={shot.id} shot={shot}
                            onUpdate={(data) => updateShot(shot.id, data)}
                            onRemove={() => removeShot(shot.id)} />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {/* Reference tables */}
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="px-2 py-0.5 rounded text-[10px]"
                style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)" }}>参考</span>
              镜头配比速查
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid oklch(0.28 0.008 240)" }}>
                    {["场景类型", "定场", "Action", "Reaction", "逻辑", "旁跳", "总镜头"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-semibold"
                        style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SHOT_RATIOS.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid oklch(0.22 0.006 240)" }}>
                      {[r.scene, r.establishing, r.action, r.reaction, r.logic, r.cutaway, r.total].map((v, j) => (
                        <td key={j} className="py-2 px-3"
                          style={{ color: j === 0 ? "oklch(0.85 0.005 60)" : j === 6 ? "oklch(0.75 0.17 65)" : "oklch(0.65 0.01 240)" }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={handleComplete} className="flex items-center gap-2 px-6"
          style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          <CheckCircle2 className="w-4 h-4" />
          完成本阶段，进入提示词撰写
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
