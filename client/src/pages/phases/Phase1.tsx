// DESIGN: "导演手册" 工业风暗色系 — Phase 1: Project Definition + Script Upload
import { useProject } from "@/contexts/ProjectContext";
import { STYLE_TAGS } from "@/lib/workflowData";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, AlertTriangle, Upload, FileText, Wand2, Users, MapPin, Package } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { extractTextFromFile, detectFormat, ACCEPTED_FORMATS, formatLabel } from "@/lib/scriptParser";

export default function Phase1() {
  const { projectInfo, updateProjectInfo, scriptText, setScriptText,
    scriptAnalysis, analyzeScript, updateEpisode, markPhaseComplete, setActivePhase } = useProject();
  const [selectedStyleIdx, setSelectedStyleIdx] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectStyle = (idx: number) => {
    setSelectedStyleIdx(idx);
    const tag = STYLE_TAGS[idx];
    updateProjectInfo({ styleZh: tag.zh, styleEn: tag.en });
  };

  const [isDragging, setIsDragging] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);

  const processFile = async (file: File) => {
    setIsFileLoading(true);
    try {
      const fmt = detectFormat(file);
      const text = await extractTextFromFile(file);
      setScriptText(text);
      toast.success(`已加载剧本：${file.name}（${formatLabel(fmt)}）`);
    } catch (err) {
      toast.error(`解析失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setIsFileLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleAnalyze = () => {
    if (!scriptText.trim()) { toast.error("请先输入或上传剧本内容"); return; }
    setIsAnalyzing(true);
    setTimeout(() => {
      analyzeScript();
      setIsAnalyzing(false);
      toast.success(`解析完成，共识别 ${scriptAnalysis.episodes.length || "?"} 集`);
    }, 600);
  };

  const handleComplete = () => {
    if (!projectInfo.title || !projectInfo.type) { toast.error("请填写片名和类型"); return; }
    if (!scriptAnalysis.isAnalyzed) { toast.error("请先完成剧本解析"); return; }
    markPhaseComplete("phase1");
    setActivePhase("phase2");
  };

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
            填写基础信息 → 上传剧本 → AI 自动解析分集、人物、场景、道具
          </p>
        </div>
      </div>

      {/* 1.1 Basic Info */}
      <section>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"
          style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
          <span className="px-2 py-0.5 rounded text-[10px]"
            style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)" }}>1.1</span>
          项目基础信息
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "title", label: "片名", placeholder: "输入项目名称" },
            { key: "audience", label: "目标受众", placeholder: "如：18-35岁动漫爱好者" },
            { key: "selling", label: "核心卖点", placeholder: "一句话概括最大看点" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>{label}</Label>
              <Input value={String(projectInfo[key as keyof typeof projectInfo] ?? "")} onChange={e => updateProjectInfo({ [key]: e.target.value })}
                placeholder={placeholder} className="text-sm h-9"
                style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)" }} />
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

      {/* 1.2 Style */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2"
            style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="px-2 py-0.5 rounded text-[10px]"
              style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)" }}>1.2</span>
            视觉风格定义
          </h3>
          <Badge variant="outline" className="text-[10px] px-2 py-0"
            style={{ borderColor: "oklch(0.577 0.245 27.325 / 0.5)", color: "oklch(0.7 0.2 27)" }}>
            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
            禁止引用具体作品名称
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          {STYLE_TAGS.map((tag, idx) => (
            <button key={tag.type} onClick={() => handleSelectStyle(idx)}
              className="text-left p-3 rounded transition-all duration-200"
              style={{ background: selectedStyleIdx === idx ? "oklch(0.75 0.17 65 / 0.12)" : "oklch(0.17 0.006 240)", border: `1px solid ${selectedStyleIdx === idx ? "oklch(0.75 0.17 65 / 0.6)" : "oklch(0.28 0.008 240)"}` }}>
              <div className="text-sm font-semibold mb-1"
                style={{ color: selectedStyleIdx === idx ? "oklch(0.75 0.17 65)" : "oklch(0.85 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>{tag.type}</div>
              <div className="text-[10px] line-clamp-2" style={{ color: "oklch(0.50 0.01 240)" }}>{tag.zh.slice(0, 40)}...</div>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>中文风格标签（可编辑）</Label>
            <Textarea value={projectInfo.styleZh} onChange={e => updateProjectInfo({ styleZh: e.target.value })}
              placeholder="输入或修改中文风格标签..." rows={2} className="text-xs resize-none"
              style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)", fontFamily: "'JetBrains Mono', monospace" }} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>English Style Tag (editable)</Label>
            <Textarea value={projectInfo.styleEn} onChange={e => updateProjectInfo({ styleEn: e.target.value })}
              placeholder="Enter or edit English style tag..." rows={2} className="text-xs resize-none"
              style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.88 0.005 60)", fontFamily: "'JetBrains Mono', monospace" }} />
          </div>
        </div>
      </section>

      {/* 1.3 Script Upload */}
      <section>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
          <span className="px-2 py-0.5 rounded text-[10px]"
            style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)" }}>1.3</span>
          剧本上传与解析
        </h3>

        {/* Upload area — multi-format drag & drop */}
        <div className="mb-3 p-5 rounded cursor-pointer transition-all"
          style={{
            background: isDragging ? "oklch(0.75 0.17 65 / 0.06)" : "oklch(0.17 0.006 240)",
            border: `2px dashed ${isDragging ? "oklch(0.75 0.17 65 / 0.7)" : "oklch(0.35 0.008 240)"}`
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}>
          <div className="flex items-center gap-4 mb-3">
            <Upload className="w-6 h-6 flex-shrink-0" style={{ color: isFileLoading ? "oklch(0.75 0.17 65)" : "oklch(0.55 0.01 240)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "oklch(0.80 0.005 60)" }}>
                {isFileLoading ? "正在解析文件..." : "点击或拖拽上传剧本文件"}
              </p>
              <p className="text-xs" style={{ color: "oklch(0.45 0.008 240)" }}>支持多种格式，或直接在下方粘贴文本</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["txt", "md", "fountain", "docx", "pdf"] as const).map(fmt => (
              <span key={fmt} style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "oklch(0.65 0.01 240)", fontFamily: "'JetBrains Mono', monospace" }}>
                .{fmt}
              </span>
            ))}
          </div>
          <input ref={fileInputRef} type="file" accept={ACCEPTED_FORMATS} className="hidden" onChange={handleFileUpload} />
        </div>

        <Textarea value={scriptText} onChange={e => setScriptText(e.target.value)}
          placeholder={`在此粘贴剧本内容...\n\n支持多集格式，例如：\n第1集 标题\n剧情内容...\n\n第2集 标题\n剧情内容...`}
          rows={8} className="text-xs resize-none mb-3"
          style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.85 0.005 60)", fontFamily: "'JetBrains Mono', monospace" }} />

        <Button onClick={handleAnalyze} disabled={isAnalyzing || !scriptText.trim()}
          className="flex items-center gap-2"
          style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          <Wand2 className="w-4 h-4" />
          {isAnalyzing ? "解析中..." : "AI 解析剧本"}
        </Button>
      </section>

      {/* 1.4 Analysis Results */}
      {scriptAnalysis.isAnalyzed && scriptAnalysis.episodes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="px-2 py-0.5 rounded text-[10px]"
              style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)" }}>1.4</span>
            解析结果
            <Badge className="text-[10px] px-2 py-0"
              style={{ background: "oklch(0.65 0.2 145 / 0.2)", color: "oklch(0.65 0.2 145)", border: "1px solid oklch(0.65 0.2 145 / 0.4)" }}>
              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
              已解析 {scriptAnalysis.episodes.length} 集
            </Badge>
          </h3>

          {/* Global characters */}
          {scriptAnalysis.globalCharacters.length > 0 && (
            <div className="mb-4 p-3 rounded"
              style={{ background: "oklch(0.17 0.006 240)", border: "1px solid oklch(0.28 0.008 240)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5" style={{ color: "oklch(0.75 0.17 65)" }} />
                <span className="text-xs font-semibold" style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  全局人物（{scriptAnalysis.globalCharacters.length}）
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scriptAnalysis.globalCharacters.map(name => (
                  <span key={name} className="px-2 py-0.5 rounded text-xs"
                    style={{ background: "oklch(0.22 0.006 240)", color: "oklch(0.80 0.005 60)", border: "1px solid oklch(0.30 0.008 240)" }}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Episodes */}
          <div className="space-y-3">
            {scriptAnalysis.episodes.map(ep => (
              <div key={ep.id} className="rounded overflow-hidden"
                style={{ border: "1px solid oklch(0.28 0.008 240)" }}>
                <div className="flex items-center gap-3 px-4 py-2.5"
                  style={{ background: "oklch(0.15 0.006 240)", borderBottom: "1px solid oklch(0.28 0.008 240)" }}>
                  <span className="text-xs font-bold" style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
                    EP_{String(ep.number).padStart(2, "0")}
                  </span>
                  <Input value={ep.title} onChange={e => updateEpisode(ep.id, { title: e.target.value })}
                    className="h-6 text-xs flex-1 max-w-[200px]"
                    style={{ background: "transparent", border: "none", color: "oklch(0.88 0.005 60)", padding: "0" }} />
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[10px] px-2 py-0.5 rounded"
                      style={{ background: "oklch(0.22 0.006 240)", color: "oklch(0.60 0.01 240)" }}>
                      约 {ep.duration} 分钟
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded"
                      style={{ background: "oklch(0.22 0.006 240)", color: "oklch(0.60 0.01 240)" }}>
                      ~{ep.duration * 25} 个镜头
                    </span>
                  </div>
                </div>
                <div className="p-3 grid grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Users className="w-3 h-3" style={{ color: "oklch(0.55 0.01 240)" }} />
                      <span className="text-[10px] font-semibold" style={{ color: "oklch(0.55 0.01 240)" }}>出场人物</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ep.characters.length > 0 ? ep.characters.map(c => (
                        <span key={c} className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "oklch(0.22 0.006 240)", color: "oklch(0.70 0.008 240)" }}>{c}</span>
                      )) : <span className="text-[10px]" style={{ color: "oklch(0.40 0.008 240)" }}>未识别</span>}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <MapPin className="w-3 h-3" style={{ color: "oklch(0.55 0.01 240)" }} />
                      <span className="text-[10px] font-semibold" style={{ color: "oklch(0.55 0.01 240)" }}>主要场景</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ep.scenes.map(s => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "oklch(0.22 0.006 240)", color: "oklch(0.70 0.008 240)" }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Package className="w-3 h-3" style={{ color: "oklch(0.55 0.01 240)" }} />
                      <span className="text-[10px] font-semibold" style={{ color: "oklch(0.55 0.01 240)" }}>关键道具</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ep.props.length > 0 ? ep.props.map(p => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "oklch(0.22 0.006 240)", color: "oklch(0.70 0.008 240)" }}>{p}</span>
                      )) : <span className="text-[10px]" style={{ color: "oklch(0.40 0.008 240)" }}>无</span>}
                    </div>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <Textarea value={ep.synopsis} onChange={e => updateEpisode(ep.id, { synopsis: e.target.value })}
                    rows={2} className="text-[10px] resize-none"
                    style={{ background: "oklch(0.13 0.005 240)", border: "1px solid oklch(0.25 0.008 240)", color: "oklch(0.65 0.01 240)", fontFamily: "'JetBrains Mono', monospace" }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Complete button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleComplete}
          className="flex items-center gap-2 px-6"
          style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          <CheckCircle2 className="w-4 h-4" />
          完成本阶段，进入资产设计
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
