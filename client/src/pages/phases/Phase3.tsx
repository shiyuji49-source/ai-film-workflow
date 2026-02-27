// DESIGN: "导演手册" 工业风暗色系 — Phase 3: Storyboarding
import { useProject } from "@/contexts/ProjectContext";
import { SHOT_TYPES, SHOT_RATIOS, SHOT_SIZES, CAMERA_MOVEMENTS } from "@/lib/workflowData";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ChevronRight, Plus, Trash2 } from "lucide-react";

export default function Phase3() {
  const { shots, addShot, updateShot, removeShot, markPhaseComplete, setActivePhase } = useProject();

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
            将剧本转化为视觉语言 — 精良的分镜是高效生成视频的前提
          </p>
        </div>
      </div>

      <Tabs defaultValue="shots">
        <TabsList className="h-8" style={{ background: "oklch(0.17 0.006 240)" }}>
          {[
            { value: "shots", label: "分镜表" },
            { value: "types", label: "镜头类型参考" },
            { value: "ratios", label: "配比建议" },
            { value: "sizes", label: "景别速查" },
            { value: "movements", label: "运动速查" },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs h-7 px-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Shot list */}
        <TabsContent value="shots" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "oklch(0.50 0.01 240)" }}>
              一分钟至少 20-30 个镜头，根据类型灵活调整
            </p>
            <Button onClick={addShot} size="sm" variant="outline"
              className="flex items-center gap-1.5 text-xs h-7"
              style={{ borderColor: "oklch(0.35 0.008 240)", color: "oklch(0.70 0.008 240)", background: "transparent" }}>
              <Plus className="w-3 h-3" />
              添加镜头
            </Button>
          </div>

          {shots.length === 0 && (
            <div className="text-center py-10 rounded"
              style={{ border: "1px dashed oklch(0.28 0.008 240)", color: "oklch(0.45 0.008 240)" }}>
              <p className="text-sm">点击「添加镜头」开始规划分镜</p>
            </div>
          )}

          <div className="space-y-3">
            {shots.map((shot, idx) => (
              <div key={shot.id} className="rounded overflow-hidden"
                style={{ border: "1px solid oklch(0.28 0.008 240)" }}>
                <div className="flex items-center justify-between px-4 py-2"
                  style={{ background: "oklch(0.15 0.006 240)", borderBottom: "1px solid oklch(0.28 0.008 240)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold" style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
                      SHOT_{String(idx + 1).padStart(3, "0")}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded"
                      style={{ background: "oklch(0.22 0.006 240)", color: "oklch(0.65 0.01 240)" }}>
                      {shot.type}
                    </span>
                    <span className="text-xs" style={{ color: "oklch(0.50 0.01 240)" }}>
                      {shot.size} · {shot.movement}
                    </span>
                  </div>
                  <button onClick={() => removeShot(shot.id)} className="p-1 rounded hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.2 25)" }} />
                  </button>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>镜头类型</Label>
                    <Select value={shot.type} onValueChange={v => updateShot(shot.id, { type: v })}>
                      <SelectTrigger className="h-8 text-xs" style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
                        {SHOT_TYPES.map(t => (
                          <SelectItem key={t.name} value={t.name} className="text-xs" style={{ color: "oklch(0.88 0.005 60)" }}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>景别</Label>
                    <Select value={shot.size} onValueChange={v => updateShot(shot.id, { size: v })}>
                      <SelectTrigger className="h-8 text-xs" style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
                        {SHOT_SIZES.map(s => (
                          <SelectItem key={s.name} value={s.name} className="text-xs" style={{ color: "oklch(0.88 0.005 60)" }}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>镜头运动</Label>
                    <Select value={shot.movement} onValueChange={v => updateShot(shot.id, { movement: v })}>
                      <SelectTrigger className="h-8 text-xs" style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
                        {CAMERA_MOVEMENTS.map(m => (
                          <SelectItem key={m.name} value={m.name} className="text-xs" style={{ color: "oklch(0.88 0.005 60)" }}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 md:col-span-3 space-y-1.5">
                    <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>画面描述</Label>
                    <Textarea
                      value={shot.description}
                      onChange={e => updateShot(shot.id, { description: e.target.value })}
                      placeholder="详细描述画面中发生的事情、人物动作和表情..."
                      rows={2}
                      className="text-xs resize-none"
                      style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>VO/台词</Label>
                    <Input
                      value={shot.vo}
                      onChange={e => updateShot(shot.id, { vo: e.target.value })}
                      placeholder="旁白或角色对话..."
                      className="text-xs h-8"
                      style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>时长 (秒)</Label>
                    <Input
                      value={shot.duration}
                      onChange={e => updateShot(shot.id, { duration: e.target.value })}
                      type="number"
                      min="1"
                      max="15"
                      className="text-xs h-8"
                      style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>音效 (SFX)</Label>
                    <Input
                      value={shot.sfx}
                      onChange={e => updateShot(shot.id, { sfx: e.target.value })}
                      placeholder="环境音 + 关键动作音效..."
                      className="text-xs h-8"
                      style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>情绪</Label>
                    <Input
                      value={shot.emotion}
                      onChange={e => updateShot(shot.id, { emotion: e.target.value })}
                      placeholder="如：史诗、紧张"
                      className="text-xs h-8"
                      style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Shot types reference */}
        <TabsContent value="types" className="mt-4">
          <div className="space-y-2">
            {SHOT_TYPES.map(t => (
              <div key={t.name} className="p-3 rounded flex gap-4"
                style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
                <div className="flex-shrink-0 w-24">
                  <div className="text-sm font-semibold" style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>{t.name}</div>
                  <div className="text-[10px]" style={{ color: "oklch(0.45 0.008 240)", fontFamily: "'JetBrains Mono', monospace" }}>{t.en}</div>
                </div>
                <div className="flex-1">
                  <div className="text-xs mb-1" style={{ color: "oklch(0.80 0.005 60)" }}>{t.role}</div>
                  <div className="text-xs" style={{ color: "oklch(0.50 0.01 240)" }}>{t.timing}</div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Shot ratios */}
        <TabsContent value="ratios" className="mt-4">
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
                        style={{ color: j === 0 ? "oklch(0.85 0.005 60)" : j === 6 ? "oklch(0.75 0.17 65)" : "oklch(0.65 0.01 240)" }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Shot sizes */}
        <TabsContent value="sizes" className="mt-4">
          <div className="grid grid-cols-2 gap-2">
            {SHOT_SIZES.map(s => (
              <div key={s.name} className="p-3 rounded"
                style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
                <div className="text-sm font-semibold mb-1" style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>{s.name}</div>
                <div className="text-xs" style={{ color: "oklch(0.60 0.01 240)" }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Camera movements */}
        <TabsContent value="movements" className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(0.28 0.008 240)" }}>
                  {["运动方式", "视觉效果", "适用场景"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-semibold"
                      style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAMERA_MOVEMENTS.map((m, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid oklch(0.22 0.006 240)" }}>
                    <td className="py-2 px-3 font-medium" style={{ color: "oklch(0.85 0.005 60)" }}>{m.name}</td>
                    <td className="py-2 px-3" style={{ color: "oklch(0.65 0.01 240)" }}>{m.effect}</td>
                    <td className="py-2 px-3" style={{ color: "oklch(0.55 0.01 240)" }}>{m.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

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
