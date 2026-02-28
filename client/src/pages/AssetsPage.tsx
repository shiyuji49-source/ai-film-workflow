// 鎏光机 - 资产库页面
// 左侧：人物/场景分类列表；右侧：生成工作台
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Plus, Trash2, Loader2, ImageIcon, Download,
  User, Mountain, ChevronRight, Sparkles, RefreshCw,
  ArrowLeft, Eye, RotateCcw, Camera
} from "lucide-react";
import { Link } from "wouter";
import * as XLSX from "xlsx";

// ─── 颜色常量 ────────────────────────────────────────────────────────────────
const BG = "oklch(0.11 0.005 240)";
const CARD_BG = "oklch(0.15 0.006 240)";
const BORDER = "oklch(0.22 0.006 240)";
const GOLD = "oklch(0.75 0.17 65)";
const TEXT = "oklch(0.88 0.005 60)";
const MUTED = "oklch(0.50 0.01 240)";
const INPUT_BG = "oklch(0.12 0.005 240)";
const ACCENT = "oklch(0.60 0.15 200)";

type AssetType = "character" | "scene";
type ViewType = "front" | "side" | "back" | "angle1" | "angle2" | "angle3";

const VIEW_LABELS: Record<string, string> = {
  front: "正面",
  side: "侧面",
  back: "背面",
  angle1: "四分之三视角",
  angle2: "俯视角",
  angle3: "仰视角",
};

const CHARACTER_VIEWS: ViewType[] = ["front", "side", "back"];
const SCENE_VIEWS: ViewType[] = ["angle1", "angle2", "angle3"];

export default function AssetsPage() {
  const [activeType, setActiveType] = useState<AssetType>("character");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // 新建表单状态
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrompt, setNewPrompt] = useState("");

  // 生成状态
  const [generatingMain, setGeneratingMain] = useState(false);
  const [generatingView, setGeneratingView] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  const utils = trpc.useUtils();

  const { data: assets = [], isLoading } = trpc.assets.list.useQuery({ type: activeType });

  const selectedAsset = assets.find(a => a.id === selectedId) ?? null;

  const createMutation = trpc.assets.create.useMutation({
    onSuccess: (asset) => {
      toast.success("资产已创建");
      utils.assets.list.invalidate();
      setSelectedId(asset.id);
      setShowCreate(false);
      setNewName(""); setNewDesc(""); setNewPrompt("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.assets.delete.useMutation({
    onSuccess: () => {
      toast.success("已删除");
      utils.assets.list.invalidate();
      setSelectedId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.assets.update.useMutation({
    onSuccess: () => { utils.assets.list.invalidate(); },
  });

  const generateMainMutation = trpc.assets.generateMain.useMutation({
    onSuccess: (data) => {
      toast.success("主图生成成功！");
      utils.assets.list.invalidate();
      setGeneratingMain(false);
    },
    onError: (e) => {
      toast.error(e.message);
      setGeneratingMain(false);
    },
  });

  const generateMultiMutation = trpc.assets.generateMultiView.useMutation({
    onSuccess: (data) => {
      toast.success(`${VIEW_LABELS[data.viewType]} 生成成功！`);
      utils.assets.list.invalidate();
      setGeneratingView(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setGeneratingView(null);
    },
  });

  // 导出 Excel
  const handleExport = () => {
    if (assets.length === 0) { toast.error("没有资产可导出"); return; }
    const rows = assets.map(a => {
      const multiViews = a.multiViewUrls ? JSON.parse(a.multiViewUrls) : {};
      return {
        "资产名称": a.name,
        "类型": a.type === "character" ? "人物" : "场景",
        "描述": a.description ?? "",
        "生成提示词": a.mainPrompt ?? "",
        "主图链接": a.mainImageUrl ?? "",
        "正面/视角1": multiViews.front ?? multiViews.angle1 ?? "",
        "侧面/视角2": multiViews.side ?? multiViews.angle2 ?? "",
        "背面/视角3": multiViews.back ?? multiViews.angle3 ?? "",
        "生成状态": a.status === "done" ? "完成" : a.status === "generating" ? "生成中" : a.status === "failed" ? "失败" : "草稿",
        "创建时间": new Date(a.createdAt).toLocaleString("zh-CN"),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [20, 8, 30, 50, 60, 60, 60, 60, 8, 20].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeType === "character" ? "人物资产" : "场景资产");
    XLSX.writeFile(wb, `鎏光机_${activeType === "character" ? "人物" : "场景"}资产_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.xlsx`);
    toast.success("Excel 已导出");
  };

  const handleGenerateMain = () => {
    if (!selectedAsset || !editPrompt.trim()) { toast.error("请先填写提示词"); return; }
    setGeneratingMain(true);
    generateMainMutation.mutate({ id: selectedAsset.id, prompt: editPrompt.trim() });
  };

  const handleGenerateView = (viewType: ViewType) => {
    if (!selectedAsset || !editPrompt.trim()) { toast.error("请先填写提示词"); return; }
    setGeneratingView(viewType);
    generateMultiMutation.mutate({ id: selectedAsset.id, viewType, prompt: editPrompt.trim() });
  };

  // 批量生成所有视角图（依次执行，避免并发请求）
  const handleBatchGenerate = async () => {
    if (!selectedAsset || !editPrompt.trim()) { toast.error("请先填写提示词"); return; }
    const currentMultiViews = selectedAsset.multiViewUrls ? JSON.parse(selectedAsset.multiViewUrls) : {};
    const pendingViews = viewTypes.filter(v => !currentMultiViews[v]);
    if (pendingViews.length === 0) { toast.info("所有视角图已生成完成！如需重新生成请单张点击重生成按鈕。"); return; }
    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: pendingViews.length });
    let successCount = 0;
    for (let i = 0; i < pendingViews.length; i++) {
      const viewType = pendingViews[i];
      setBatchProgress({ current: i + 1, total: pendingViews.length });
      setGeneratingView(viewType);
      try {
        await new Promise<void>((resolve, reject) => {
          generateMultiMutation.mutate(
            { id: selectedAsset.id, viewType, prompt: editPrompt.trim() },
            {
              onSuccess: () => { successCount++; resolve(); },
              onError: (e) => { toast.error(`${VIEW_LABELS[viewType]}生成失败: ${e.message}`); resolve(); },
            }
          );
        });
        // 等待一下再生成下一张，避免请求过于频繁
        if (i < pendingViews.length - 1) await new Promise(r => setTimeout(r, 1000));
      } catch {
        // ignore, already handled
      }
    }
    setGeneratingView(null);
    setBatchGenerating(false);
    setBatchProgress(null);
    utils.assets.list.invalidate();
    toast.success(`批量生成完成！成功生成 ${successCount}/${pendingViews.length} 张图片`);
  };

  const multiViews = selectedAsset?.multiViewUrls ? JSON.parse(selectedAsset.multiViewUrls) : {};
  const viewTypes = activeType === "character" ? CHARACTER_VIEWS : SCENE_VIEWS;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG, fontFamily: "'Noto Sans SC', 'Space Grotesk', sans-serif" }}>
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER, background: "oklch(0.13 0.005 240)" }}>
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <button className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity" style={{ color: MUTED }}>
              <ArrowLeft size={14} />
              返回工作台
            </button>
          </Link>
          <div className="w-px h-4" style={{ background: BORDER }} />
          <div className="flex items-center gap-2">
            <ImageIcon size={16} style={{ color: GOLD }} />
            <span className="font-bold text-sm" style={{ color: TEXT, fontFamily: "'Space Grotesk', sans-serif" }}>资产库</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: "oklch(0.20 0.006 240)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <Download size={12} />
            导出 Excel
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold hover:opacity-90 transition-opacity"
            style={{ background: GOLD, color: "oklch(0.1 0.005 240)" }}
          >
            <Plus size={12} />
            新建资产
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── 左侧列表 ─────────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-r flex flex-col" style={{ borderColor: BORDER, background: "oklch(0.13 0.005 240)" }}>
          {/* 类型切换 */}
          <div className="p-3 border-b" style={{ borderColor: BORDER }}>
            <div className="flex rounded-lg p-1" style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}>
              {([["character", "人物", User], ["scene", "场景", Mountain]] as const).map(([type, label, Icon]) => (
                <button
                  key={type}
                  onClick={() => { setActiveType(type); setSelectedId(null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: activeType === type ? GOLD : "transparent",
                    color: activeType === type ? "oklch(0.1 0.005 240)" : MUTED,
                  }}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 资产列表 */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin" style={{ color: MUTED }} />
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon size={32} className="mx-auto mb-3 opacity-30" style={{ color: MUTED }} />
                <p className="text-xs" style={{ color: MUTED }}>暂无{activeType === "character" ? "人物" : "场景"}资产</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-3 text-xs px-3 py-1.5 rounded-lg hover:opacity-80"
                  style={{ color: GOLD, border: `1px solid ${GOLD}30` }}
                >
                  + 新建
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {assets.map(asset => (
                  <button
                    key={asset.id}
                    onClick={() => { setSelectedId(asset.id); setEditPrompt(asset.mainPrompt ?? ""); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all hover:opacity-90"
                    style={{
                      background: selectedId === asset.id ? "oklch(0.75 0.17 65 / 0.12)" : "transparent",
                      border: `1px solid ${selectedId === asset.id ? GOLD + "40" : "transparent"}`,
                    }}
                  >
                    {/* 缩略图 */}
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden" style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}>
                      {asset.mainImageUrl ? (
                        <img src={asset.mainImageUrl} alt={asset.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {activeType === "character" ? <User size={14} style={{ color: MUTED }} /> : <Mountain size={14} style={{ color: MUTED }} />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: TEXT }}>{asset.name}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                        {asset.status === "done" ? "✓ 已完成" : asset.status === "generating" ? "⟳ 生成中" : asset.status === "failed" ? "✗ 失败" : "○ 草稿"}
                      </div>
                    </div>
                    <ChevronRight size={12} style={{ color: MUTED }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── 右侧工作台 ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedAsset ? (
            <div className="flex flex-col items-center justify-center h-full" style={{ color: MUTED }}>
              <Sparkles size={48} className="mb-4 opacity-20" />
              <p className="text-sm">从左侧选择资产，或新建一个</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* 资产标题 */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: TEXT, fontFamily: "'Space Grotesk', sans-serif" }}>{selectedAsset.name}</h2>
                  {selectedAsset.description && (
                    <p className="text-sm mt-1" style={{ color: MUTED }}>{selectedAsset.description}</p>
                  )}
                </div>
                <button
                  onClick={() => { if (confirm("确认删除此资产？")) deleteMutation.mutate({ id: selectedAsset.id }); }}
                  className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ color: "oklch(0.60 0.15 30)", border: `1px solid oklch(0.60 0.15 30 / 0.3)` }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* 提示词输入 */}
              <div className="rounded-xl p-4" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <label className="block text-xs mb-2 font-medium" style={{ color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                  生成提示词（英文效果更佳）
                </label>
                <textarea
                  value={editPrompt}
                  onChange={e => setEditPrompt(e.target.value)}
                  placeholder={activeType === "character"
                    ? "e.g. young female warrior, silver armor, long black hair, fantasy style..."
                    : "e.g. ancient Chinese palace courtyard, moonlight, misty atmosphere, cinematic..."}
                  rows={3}
                  className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none transition-all"
                  style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                  onFocus={e => (e.target.style.borderColor = GOLD)}
                  onBlur={e => (e.target.style.borderColor = BORDER)}
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px]" style={{ color: MUTED }}>
                    生成主图消耗 <span style={{ color: GOLD }}>10</span> 积分 · 多视角图消耗 <span style={{ color: GOLD }}>8</span> 积分/张
                  </span>
                  <button
                    onClick={handleGenerateMain}
                    disabled={generatingMain || !editPrompt.trim()}
                    className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-bold transition-all"
                    style={{
                      background: generatingMain || !editPrompt.trim() ? "oklch(0.25 0.006 240)" : GOLD,
                      color: generatingMain || !editPrompt.trim() ? MUTED : "oklch(0.1 0.005 240)",
                      cursor: generatingMain || !editPrompt.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {generatingMain ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {generatingMain ? "生成中..." : "生成主图"}
                  </button>
                </div>
              </div>

              {/* 主图展示 */}
              <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
                  <span className="text-xs font-medium" style={{ color: TEXT }}>主图</span>
                  {selectedAsset.mainImageUrl && (
                    <a href={selectedAsset.mainImageUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] hover:opacity-80"
                      style={{ color: ACCENT }}>
                      <Eye size={10} /> 查看原图
                    </a>
                  )}
                </div>
                <div className="p-4">
                  {selectedAsset.mainImageUrl ? (
                    <img
                      src={selectedAsset.mainImageUrl}
                      alt={selectedAsset.name}
                      className="w-full max-h-80 object-contain rounded-lg"
                      style={{ background: INPUT_BG }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 rounded-lg" style={{ background: INPUT_BG, border: `1px dashed ${BORDER}` }}>
                      <ImageIcon size={32} className="mb-2 opacity-30" style={{ color: MUTED }} />
                      <p className="text-xs" style={{ color: MUTED }}>填写提示词后点击「生成主图」</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 多视角图 */}
              <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
                  <div>
                    <span className="text-xs font-medium" style={{ color: TEXT }}>
                      {activeType === "character" ? "三视图" : "多视角图"}
                    </span>
                    {batchProgress && (
                      <span className="ml-2 text-[10px]" style={{ color: GOLD }}>
                        生成中 {batchProgress.current}/{batchProgress.total}...
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleBatchGenerate}
                    disabled={batchGenerating || !editPrompt.trim() || !selectedAsset}
                    className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{
                      background: batchGenerating || !editPrompt.trim() ? "oklch(0.20 0.006 240)" : "oklch(0.60 0.15 200 / 0.15)",
                      border: `1px solid ${batchGenerating || !editPrompt.trim() ? BORDER : "oklch(0.60 0.15 200 / 0.5)"}`,
                      color: batchGenerating || !editPrompt.trim() ? MUTED : ACCENT,
                      cursor: batchGenerating || !editPrompt.trim() ? "not-allowed" : "pointer",
                    }}
                    title={`一键生成所有未生成的${activeType === "character" ? "三视图" : "多视角图"}，每张消耗 8 积分`}
                  >
                    {batchGenerating
                      ? <Loader2 size={10} className="animate-spin" />
                      : <Sparkles size={10} />}
                    {batchGenerating ? `生成中...` : `一键批量生成`}
                  </button>
                </div>
                <div className="p-4 grid grid-cols-3 gap-3">
                  {viewTypes.map(viewType => {
                    const imgUrl = multiViews[viewType];
                    const isGenerating = generatingView === viewType;
                    return (
                      <div key={viewType} className="space-y-2">
                        <div
                          className="relative rounded-lg overflow-hidden aspect-square"
                          style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                        >
                          {imgUrl ? (
                            <>
                              <img src={imgUrl} alt={VIEW_LABELS[viewType]} className="w-full h-full object-cover" />
                              <button
                                onClick={() => handleGenerateView(viewType)}
                                disabled={isGenerating || !editPrompt.trim()}
                                className="absolute top-1 right-1 p-1 rounded opacity-0 hover:opacity-100 transition-opacity"
                                style={{ background: "oklch(0 0 0 / 0.6)" }}
                                title="重新生成"
                              >
                                <RefreshCw size={10} style={{ color: "white" }} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleGenerateView(viewType)}
                              disabled={isGenerating || !editPrompt.trim()}
                              className="w-full h-full flex flex-col items-center justify-center gap-1 transition-all hover:opacity-80"
                              style={{ cursor: isGenerating || !editPrompt.trim() ? "not-allowed" : "pointer" }}
                            >
                              {isGenerating ? (
                                <Loader2 size={16} className="animate-spin" style={{ color: GOLD }} />
                              ) : (
                                <>
                                  <Camera size={16} style={{ color: MUTED }} />
                                  <span className="text-[10px]" style={{ color: MUTED }}>点击生成</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-center" style={{ color: MUTED }}>{VIEW_LABELS[viewType]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 新建资产弹窗 ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "oklch(0 0 0 / 0.6)" }}
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md rounded-xl p-6" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <h3 className="text-base font-bold mb-4" style={{ color: TEXT, fontFamily: "'Space Grotesk', sans-serif" }}>
                  新建{activeType === "character" ? "人物" : "场景"}资产
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: MUTED }}>资产名称 *</label>
                    <input
                      type="text" value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder={activeType === "character" ? "如：主角 李明" : "如：古城墙外景"}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT }}
                      onFocus={e => (e.target.style.borderColor = GOLD)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: MUTED }}>描述（可选）</label>
                    <input
                      type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                      placeholder="简短描述这个资产"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT }}
                      onFocus={e => (e.target.style.borderColor = GOLD)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: MUTED }}>初始提示词（可选）</label>
                    <textarea
                      value={newPrompt} onChange={e => setNewPrompt(e.target.value)}
                      placeholder="可以稍后在工作台填写"
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                      style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 12 }}
                      onFocus={e => (e.target.style.borderColor = GOLD)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2 rounded-lg text-sm"
                    style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: MUTED }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      if (!newName.trim()) { toast.error("请填写资产名称"); return; }
                      createMutation.mutate({ type: activeType, name: newName.trim(), description: newDesc.trim() || undefined, mainPrompt: newPrompt.trim() || undefined });
                    }}
                    disabled={createMutation.isPending}
                    className="flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                    style={{ background: GOLD, color: "oklch(0.1 0.005 240)" }}
                  >
                    {createMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                    创建
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
