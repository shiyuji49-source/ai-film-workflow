// DESIGN: "导演手册" 工业风暗色系 — Phase 1: Project Definition
import { useProject } from "@/contexts/ProjectContext";
import { STYLE_TAGS } from "@/lib/workflowData";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, AlertTriangle } from "lucide-react";
import { useState } from "react";
import PromptBox from "@/components/PromptBox";

export default function Phase1() {
  const { projectInfo, updateProjectInfo, markPhaseComplete, setActivePhase } = useProject();
  const [selectedStyleIdx, setSelectedStyleIdx] = useState<number | null>(null);

  const handleSelectStyle = (idx: number) => {
    setSelectedStyleIdx(idx);
    const tag = STYLE_TAGS[idx];
    updateProjectInfo({ styleZh: tag.zh, styleEn: tag.en });
  };

  const handleComplete = () => {
    markPhaseComplete("phase1");
    setActivePhase("phase2");
  };

  const isReady = projectInfo.title && projectInfo.type && (projectInfo.styleZh || projectInfo.styleEn);

  return (
    <div className="space-y-8">
      {/* Phase header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded flex items-center justify-center text-lg font-bold"
          style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.4)", color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
          01
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "oklch(0.92 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>
            项目定义
          </h2>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 240)" }}>
            确定项目基础信息与视觉风格标签 — 这是全片一致性的绝对基石
          </p>
        </div>
      </div>

      {/* Section 1.1: Basic Info */}
      <section>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"
          style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
          <span className="step-badge px-2 py-0.5 rounded text-[10px]"
            style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)" }}>
            1.1
          </span>
          项目基础信息
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "title", label: "片名", placeholder: "输入项目名称" },
            { key: "episodes", label: "集数/时长", placeholder: "如：1集 / 3分钟" },
            { key: "audience", label: "目标受众", placeholder: "如：18-35岁动漫爱好者" },
            { key: "selling", label: "核心卖点", placeholder: "一句话概括最大看点" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>{label}</Label>
              <Input
                value={projectInfo[key as keyof typeof projectInfo]}
                onChange={e => updateProjectInfo({ [key]: e.target.value })}
                placeholder={placeholder}
                className="text-sm h-9"
                style={{
                  background: "oklch(0.17 0.006 240)",
                  border: "1px solid oklch(0.28 0.008 240)",
                  color: "oklch(0.88 0.005 60)",
                }}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>类型</Label>
            <Select value={projectInfo.type} onValueChange={v => updateProjectInfo({ type: v })}>
              <SelectTrigger className="h-9 text-sm" style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }}>
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
                {["短剧", "动画", "广告", "MV", "纪录片", "预告片"].map(t => (
                  <SelectItem key={t} value={t} className="text-sm" style={{ color: "oklch(0.88 0.005 60)" }}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>目标平台</Label>
            <Select value={projectInfo.platform} onValueChange={v => updateProjectInfo({ platform: v })}>
              <SelectTrigger className="h-9 text-sm" style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }}>
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
                {["抖音", "B站", "YouTube", "小红书", "微信视频号", "院线"].map(p => (
                  <SelectItem key={p} value={p} className="text-sm" style={{ color: "oklch(0.88 0.005 60)" }}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>画面比例</Label>
            <Select value={projectInfo.ratio} onValueChange={v => updateProjectInfo({ ratio: v })}>
              <SelectTrigger className="h-9 text-sm" style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
                {["9:16 竖屏", "16:9 横屏", "1:1 方形", "4:3"].map(r => (
                  <SelectItem key={r} value={r} className="text-sm" style={{ color: "oklch(0.88 0.005 60)" }}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Section 1.2: Style Tags */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2"
            style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="step-badge px-2 py-0.5 rounded text-[10px]"
              style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)" }}>
              1.2
            </span>
            视觉风格定义
          </h3>
          <Badge variant="outline" className="text-[10px] px-2 py-0"
            style={{ borderColor: "oklch(0.577 0.245 27.325 / 0.5)", color: "oklch(0.7 0.2 27)" }}>
            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
            禁止引用具体作品名称
          </Badge>
        </div>
        <p className="text-xs mb-4" style={{ color: "oklch(0.50 0.01 240)" }}>
          选择一个预设风格标签，或在下方自定义。风格标签将附加在所有提示词末尾，确保全片视觉一致性。
        </p>

        {/* Preset style cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {STYLE_TAGS.map((tag, idx) => (
            <button
              key={tag.type}
              onClick={() => handleSelectStyle(idx)}
              className="text-left p-3 rounded transition-all duration-200"
              style={{
                background: selectedStyleIdx === idx ? "oklch(0.75 0.17 65 / 0.12)" : "oklch(0.17 0.006 240)",
                border: `1px solid ${selectedStyleIdx === idx ? "oklch(0.75 0.17 65 / 0.6)" : "oklch(0.28 0.008 240)"}`,
              }}
            >
              <div className="text-sm font-semibold mb-1"
                style={{ color: selectedStyleIdx === idx ? "oklch(0.75 0.17 65)" : "oklch(0.85 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>
                {tag.type}
              </div>
              <div className="text-[10px] line-clamp-2" style={{ color: "oklch(0.50 0.01 240)" }}>
                {tag.zh.slice(0, 40)}...
              </div>
            </button>
          ))}
        </div>

        {/* Custom style inputs */}
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>
              中文风格标签 <span style={{ color: "oklch(0.55 0.01 240)" }}>(可直接编辑)</span>
            </Label>
            <Textarea
              value={projectInfo.styleZh}
              onChange={e => updateProjectInfo({ styleZh: e.target.value })}
              placeholder="输入或修改中文风格标签..."
              rows={3}
              className="text-xs resize-none"
              style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)", fontFamily: "'JetBrains Mono', monospace" }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>
              English Style Tag <span style={{ color: "oklch(0.55 0.01 240)" }}>(editable)</span>
            </Label>
            <Textarea
              value={projectInfo.styleEn}
              onChange={e => updateProjectInfo({ styleEn: e.target.value })}
              placeholder="Enter or edit English style tag..."
              rows={3}
              className="text-xs resize-none"
              style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)", fontFamily: "'JetBrains Mono', monospace" }}
            />
          </div>
        </div>
      </section>

      {/* Style preview */}
      {(projectInfo.styleZh || projectInfo.styleEn) && (
        <section>
          <h3 className="text-xs font-semibold mb-2 tracking-widest uppercase"
            style={{ color: "oklch(0.55 0.01 240)", fontFamily: "'JetBrains Mono', monospace" }}>
            已选风格标签预览
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {projectInfo.styleZh && <PromptBox label="中文风格标签" content={projectInfo.styleZh} lang="zh" />}
            {projectInfo.styleEn && <PromptBox label="English Style Tag" content={projectInfo.styleEn} lang="en" />}
          </div>
        </section>
      )}

      {/* Complete button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleComplete}
          disabled={!isReady}
          className="flex items-center gap-2 px-6"
          style={{
            background: isReady ? "oklch(0.75 0.17 65)" : "oklch(0.22 0.006 240)",
            color: isReady ? "oklch(0.1 0.005 240)" : "oklch(0.45 0.008 240)",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
          }}
        >
          <CheckCircle2 className="w-4 h-4" />
          完成本阶段，进入资产设计
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
