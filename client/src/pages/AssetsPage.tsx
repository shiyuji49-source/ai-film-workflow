// 鎏光机 - 资产库页面（重构版）
// 流程：上传 MJ 参考图 → Nano Banana Pro 生成主视图和三视图
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Trash2, Upload, Loader2, Download, ImageIcon,
  User, Mountain, ChevronRight, Copy, RefreshCw, Zap, ArrowLeft, Layers
} from "lucide-react";
import { Link } from "wouter";
import * as XLSX from "xlsx";

type AssetType = "character" | "scene";
type ViewType = "front" | "side" | "back" | "angle1" | "angle2" | "angle3";

const VIEW_LABELS: Record<ViewType, string> = {
  front: "正面",
  side: "侧面",
  back: "背面",
  angle1: "四分之三视角",
  angle2: "俯视",
  angle3: "仰视",
};

const CHARACTER_VIEWS: ViewType[] = ["front", "side", "back"];
const SCENE_VIEWS: ViewType[] = ["angle1", "angle2", "angle3"];

const BG = "oklch(0.11 0.005 240)";
const CARD_BG = "oklch(0.15 0.006 240)";
const BORDER = "oklch(0.22 0.006 240)";
const GOLD = "oklch(0.75 0.17 65)";
const TEXT = "oklch(0.92 0.005 60)";
const MUTED = "oklch(0.50 0.008 240)";
const INPUT_BG = "oklch(0.11 0.005 240)";
const ACCENT = "oklch(0.65 0.15 200)";

// ─── 图片上传区 ───────────────────────────────────────────────────────────────
function ImageUploadZone({
  label, imageUrl, onUpload, uploading,
}: {
  label: string;
  imageUrl?: string | null;
  onUpload: (base64: string, mimeType: string) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file.size > 16 * 1024 * 1024) { toast.error("图片大小不能超过 16MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const [header, base64] = result.split(",");
      const mimeType = header.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";
      onUpload(base64, mimeType);
    };
    reader.readAsDataURL(file);
  }, [onUpload]);

  return (
    <div
      className="relative border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{ borderColor: imageUrl ? "oklch(0.45 0.12 65)" : BORDER, background: INPUT_BG, minHeight: "200px" }}
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleFile(f); }}
      onDragOver={(e) => e.preventDefault()}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {imageUrl ? (
        <div className="relative" style={{ minHeight: "200px" }}>
          <img src={imageUrl} alt={label} className="w-full object-contain" style={{ maxHeight: "260px" }} />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            style={{ background: "oklch(0 0 0 / 0.6)" }}>
            <span className="text-xs" style={{ color: TEXT }}>点击重新上传</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 p-8" style={{ minHeight: "200px" }}>
          {uploading
            ? <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
            : <>
                <Upload className="w-8 h-8" style={{ color: "oklch(0.35 0.008 240)" }} />
                <p className="text-sm text-center" style={{ color: MUTED }}>{label}</p>
                <p className="text-xs" style={{ color: "oklch(0.38 0.008 240)" }}>点击或拖拽上传 · 最大 16MB</p>
              </>
          }
        </div>
      )}
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default function AssetsPage() {
  const { user } = useAuth();
  const [activeType, setActiveType] = useState<AssetType>("character");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generatingMain, setGeneratingMain] = useState(false);
  const [generatingViews, setGeneratingViews] = useState<Record<string, boolean>>({});
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");

  const utils = trpc.useUtils();
  const { data: assets = [], isLoading } = trpc.assets.list.useQuery({ type: activeType });
  const selectedAsset = assets.find((a) => a.id === selectedId) ?? null;
  const multiViewUrls: Record<string, string> = selectedAsset?.multiViewUrls ? JSON.parse(selectedAsset.multiViewUrls) : {};
  const views = activeType === "character" ? CHARACTER_VIEWS : SCENE_VIEWS;

  const createMutation = trpc.assets.create.useMutation({
    onSuccess: (asset) => {
      utils.assets.list.invalidate();
      setSelectedId(asset.id);
      setShowCreate(false);
      setNewName(""); setNewDesc("");
      toast.success("资产已创建");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.assets.update.useMutation({
    onSuccess: () => utils.assets.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.assets.delete.useMutation({
    onSuccess: () => { utils.assets.list.invalidate(); setSelectedId(null); toast.success("资产已删除"); },
    onError: (e) => toast.error(e.message),
  });

  const uploadMutation = trpc.assets.uploadImage.useMutation({
    onSuccess: () => { utils.assets.list.invalidate(); toast.success("参考图已上传"); },
    onError: (e) => toast.error(e.message),
  });

  const generateMainMutation = trpc.assets.generateMain.useMutation({
    onSuccess: () => { utils.assets.list.invalidate(); toast.success("主视图生成完成！"); },
    onError: (e) => toast.error(e.message),
  });

  const generateMultiMutation = trpc.assets.generateMultiView.useMutation({
    onSuccess: () => utils.assets.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const handleUpload = async (base64: string, mimeType: string) => {
    if (!selectedId) return;
    setUploading(true);
    try { await uploadMutation.mutateAsync({ id: selectedId, imageBase64: base64, mimeType }); }
    finally { setUploading(false); }
  };

  const handleGenerateMain = async () => {
    if (!selectedId) return;
    if (!selectedAsset?.uploadedImageUrl) { toast.error("请先上传 MJ 参考图"); return; }
    setGeneratingMain(true);
    try { await generateMainMutation.mutateAsync({ id: selectedId, prompt: selectedAsset.mainPrompt ?? undefined }); }
    finally { setGeneratingMain(false); }
  };

  const handleGenerateView = async (viewType: ViewType) => {
    if (!selectedId) return;
    if (!selectedAsset?.uploadedImageUrl) { toast.error("请先上传 MJ 参考图"); return; }
    setGeneratingViews((p) => ({ ...p, [viewType]: true }));
    try {
      await generateMultiMutation.mutateAsync({ id: selectedId, viewType, prompt: selectedAsset.mainPrompt ?? undefined });
      toast.success(`${VIEW_LABELS[viewType]} 生成完成`);
    } finally { setGeneratingViews((p) => ({ ...p, [viewType]: false })); }
  };

  const handleBatchGenerate = async () => {
    if (!selectedId || !selectedAsset?.uploadedImageUrl) { toast.error("请先上传 MJ 参考图"); return; }
    const pending = views.filter((v) => !multiViewUrls[v]);
    if (pending.length === 0) { toast.info("所有视角图已生成完毕"); return; }
    setBatchGenerating(true);
    for (let i = 0; i < pending.length; i++) {
      const vt = pending[i];
      setBatchProgress(`${i + 1}/${pending.length}`);
      try {
        await generateMultiMutation.mutateAsync({ id: selectedId, viewType: vt, prompt: selectedAsset.mainPrompt ?? undefined });
        await utils.assets.list.invalidate();
      } catch { toast.error(`${VIEW_LABELS[vt]} 生成失败，已跳过`); }
    }
    setBatchGenerating(false); setBatchProgress("");
    toast.success("批量生成完成！");
  };

  const handleExport = () => {
    if (assets.length === 0) { toast.error("暂无资产数据"); return; }
    const rows = assets.map((a) => {
      const mv = a.multiViewUrls ? JSON.parse(a.multiViewUrls) : {};
      return {
        "资产名称": a.name, "类型": a.type === "character" ? "人物" : "场景/道具",
        "描述": a.description ?? "", "MJ7 提示词": (a as any).mjPrompt ?? "",
        "NBP 辅助提示词": a.mainPrompt ?? "", "MJ 参考图": (a as any).uploadedImageUrl ?? "",
        "主视图": a.mainImageUrl ?? "",
        "正面": mv.front ?? "", "侧面": mv.side ?? "", "背面": mv.back ?? "",
        "四分之三视角": mv.angle1 ?? "", "俯视": mv.angle2 ?? "", "仰视": mv.angle3 ?? "",
        "状态": a.status === "done" ? "已完成" : a.status === "generating" ? "生成中" : a.status === "failed" ? "失败" : "草稿",
        "创建时间": new Date(a.createdAt).toLocaleString("zh-CN"),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [20, 10, 30, 60, 50, 60, 60, 60, 60, 60, 60, 60, 60, 8, 20].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeType === "character" ? "人物资产" : "场景资产");
    XLSX.writeFile(wb, `鎏光机_${activeType === "character" ? "人物" : "场景"}资产_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.xlsx`);
    toast.success("Excel 已导出");
  };

  const pendingViews = views.filter((v) => !multiViewUrls[v]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG, fontFamily: "'Noto Sans SC', 'Space Grotesk', sans-serif" }}>
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: BORDER, background: "oklch(0.13 0.005 240)" }}>
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <button className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity" style={{ color: MUTED }}>
              <ArrowLeft size={14} />返回工作台
            </button>
          </Link>
          <div className="w-px h-4" style={{ background: BORDER }} />
          <div className="flex items-center gap-2">
            <Layers size={15} style={{ color: GOLD }} />
            <span className="font-bold text-sm" style={{ color: TEXT }}>资产库</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-xs font-mono" style={{ color: MUTED }}>余额 {user.credits.toLocaleString()} 积分</span>}
          <button onClick={handleExport}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <Download size={12} />导出 Excel
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── 左侧列表 ─────────────────────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 border-r flex flex-col" style={{ borderColor: BORDER, background: "oklch(0.13 0.005 240)" }}>
          {/* 类型切换 */}
          <div className="p-3 border-b" style={{ borderColor: BORDER }}>
            <div className="flex rounded-lg p-1" style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}>
              {([["character", "人物", User], ["scene", "场景", Mountain]] as const).map(([t, label, Icon]) => (
                <button key={t} onClick={() => { setActiveType(t); setSelectedId(null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{ background: activeType === t ? GOLD : "transparent", color: activeType === t ? "oklch(0.1 0.005 240)" : MUTED }}>
                  <Icon size={12} />{label}
                </button>
              ))}
            </div>
          </div>

          {/* 新建 */}
          <div className="p-3 border-b" style={{ borderColor: BORDER }}>
            {showCreate ? (
              <div className="flex flex-col gap-2">
                <Input placeholder="资产名称" value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="h-8 text-xs" style={{ background: INPUT_BG, borderColor: BORDER, color: TEXT }} />
                <Input placeholder="描述（可选）" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                  className="h-8 text-xs" style={{ background: INPUT_BG, borderColor: BORDER, color: TEXT }} />
                <div className="flex gap-1.5">
                  <Button size="sm" className="flex-1 h-7 text-xs" style={{ background: GOLD, color: "oklch(0.1 0.005 240)" }}
                    disabled={!newName.trim() || createMutation.isPending}
                    onClick={() => createMutation.mutate({ type: activeType, name: newName.trim(), description: newDesc.trim() || undefined })}>
                    {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "创建"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" style={{ borderColor: BORDER, color: MUTED }}
                    onClick={() => { setShowCreate(false); setNewName(""); setNewDesc(""); }}>取消</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowCreate(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs hover:opacity-80 transition-opacity"
                style={{ background: "oklch(0.17 0.006 240)", border: `1px dashed ${BORDER}`, color: MUTED }}>
                <Plus size={12} />新建{activeType === "character" ? "人物" : "场景"}资产
              </button>
            )}
          </div>

          {/* 列表 */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin" style={{ color: MUTED }} /></div>
            ) : assets.length === 0 ? (
              <div className="text-center py-10">
                <ImageIcon size={28} className="mx-auto mb-2 opacity-20" style={{ color: MUTED }} />
                <p className="text-xs" style={{ color: MUTED }}>暂无资产</p>
              </div>
            ) : assets.map((asset) => (
              <button key={asset.id} onClick={() => setSelectedId(asset.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-1 text-left transition-all"
                style={{
                  background: selectedId === asset.id ? "oklch(0.20 0.008 240)" : "transparent",
                  border: selectedId === asset.id ? `1px solid oklch(0.35 0.012 65)` : "1px solid transparent",
                }}>
                <div className="w-9 h-9 rounded-md flex-shrink-0 overflow-hidden"
                  style={{ background: "oklch(0.17 0.006 240)", border: `1px solid ${BORDER}` }}>
                  {(asset as any).uploadedImageUrl
                    ? <img src={(asset as any).uploadedImageUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        {activeType === "character" ? <User size={14} style={{ color: "oklch(0.38 0.008 240)" }} /> : <Mountain size={14} style={{ color: "oklch(0.38 0.008 240)" }} />}
                      </div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: TEXT }}>{asset.name}</p>
                  <p className="text-[10px]" style={{ color: MUTED }}>
                    {asset.status === "done" ? "✓ 完成" : asset.status === "generating" ? "⟳ 生成中" : asset.status === "failed" ? "✗ 失败" : "草稿"}
                  </p>
                </div>
                {selectedId === asset.id && <ChevronRight size={12} style={{ color: MUTED }} />}
              </button>
            ))}
          </div>
        </div>

        {/* ─── 右侧工作台 ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {!selectedAsset ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Layers size={40} style={{ color: "oklch(0.25 0.008 240)" }} />
              <p className="text-sm" style={{ color: MUTED }}>从左侧选择资产，或新建一个开始</p>
            </div>
          ) : (
            <div className="p-6 max-w-3xl mx-auto space-y-5">
              {/* 标题栏 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px]"
                    style={{ borderColor: "oklch(0.35 0.12 65)", color: GOLD }}>
                    {activeType === "character" ? "人物" : "场景/道具"}
                  </Badge>
                  <h2 className="text-xl font-bold" style={{ color: TEXT }}>{selectedAsset.name}</h2>
                </div>
                <button onClick={() => deleteMutation.mutate({ id: selectedAsset.id })}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${BORDER}`, color: MUTED }}>
                  <Trash2 size={11} />删除
                </button>
              </div>

              {/* ── 区块一：提示词管理 ─────────────────────────────────────── */}
              <div className="rounded-xl p-5 space-y-4" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <h3 className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: MUTED, fontFamily: "monospace" }}>
                  提示词管理
                </h3>

                {/* 描述 */}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: "oklch(0.60 0.008 240)" }}>资产描述</label>
                  <Input placeholder="简短描述这个资产（如：古风侠女，身着白衣）"
                    defaultValue={selectedAsset.description ?? ""}
                    className="text-sm" style={{ background: INPUT_BG, borderColor: BORDER, color: TEXT }}
                    onBlur={(e) => { if (e.target.value !== (selectedAsset.description ?? "")) updateMutation.mutate({ id: selectedAsset.id, description: e.target.value }); }} />
                </div>

                {/* MJ7 提示词 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs flex items-center gap-1.5" style={{ color: "oklch(0.60 0.008 240)" }}>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.20 0.008 240)", color: GOLD }}>MJ7</span>
                      Midjourney 生成提示词
                    </label>
                    <button onClick={() => { if ((selectedAsset as any).mjPrompt) { navigator.clipboard.writeText((selectedAsset as any).mjPrompt); toast.success("已复制"); } }}
                      className="flex items-center gap-1 text-[10px] hover:opacity-70 transition-opacity" style={{ color: MUTED }}>
                      <Copy size={10} />复制
                    </button>
                  </div>
                  <Textarea placeholder={"在 Midjourney 中生成参考图时使用的提示词（英文）\n例：ancient chinese female warrior, white hanfu, sword, cinematic lighting --ar 2:3 --v 7"}
                    defaultValue={(selectedAsset as any).mjPrompt ?? ""}
                    rows={3} className="text-sm resize-none"
                    style={{ background: INPUT_BG, borderColor: BORDER, color: TEXT }}
                    onBlur={(e) => { if (e.target.value !== ((selectedAsset as any).mjPrompt ?? "")) updateMutation.mutate({ id: selectedAsset.id, mjPrompt: e.target.value }); }} />
                </div>

                {/* NBP 提示词 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs flex items-center gap-1.5" style={{ color: "oklch(0.60 0.008 240)" }}>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.20 0.008 240)", color: ACCENT }}>NBP</span>
                      Nano Banana Pro 辅助提示词
                    </label>
                    <button onClick={() => { if (selectedAsset.mainPrompt) { navigator.clipboard.writeText(selectedAsset.mainPrompt); toast.success("已复制"); } }}
                      className="flex items-center gap-1 text-[10px] hover:opacity-70 transition-opacity" style={{ color: MUTED }}>
                      <Copy size={10} />复制
                    </button>
                  </div>
                  <Textarea placeholder={"指导 Nano Banana Pro 生成视角图的辅助提示词（可选）\n例：maintain consistent character design, same clothing and accessories"}
                    defaultValue={selectedAsset.mainPrompt ?? ""}
                    rows={2} className="text-sm resize-none"
                    style={{ background: INPUT_BG, borderColor: BORDER, color: TEXT }}
                    onBlur={(e) => { if (e.target.value !== (selectedAsset.mainPrompt ?? "")) updateMutation.mutate({ id: selectedAsset.id, mainPrompt: e.target.value }); }} />
                </div>
              </div>

              {/* ── 区块二：图片生成工作台 ────────────────────────────────── */}
              <div className="rounded-xl p-5 space-y-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <h3 className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: MUTED, fontFamily: "monospace" }}>
                  图片生成工作台
                </h3>

                <div className="grid grid-cols-2 gap-5">
                  {/* Step 1：上传 MJ 参考图 */}
                  <div>
                    <p className="text-xs mb-2 flex items-center gap-1.5" style={{ color: "oklch(0.60 0.008 240)" }}>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.20 0.008 240)", color: GOLD }}>Step 1</span>
                      上传 MJ 参考图
                    </p>
                    <ImageUploadZone label="拖拽或点击上传 MJ 生成的图片"
                      imageUrl={(selectedAsset as any).uploadedImageUrl} onUpload={handleUpload} uploading={uploading} />
                  </div>

                  {/* Step 2：生成主视图 */}
                  <div>
                    <p className="text-xs mb-2 flex items-center gap-1.5" style={{ color: "oklch(0.60 0.008 240)" }}>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.20 0.008 240)", color: ACCENT }}>Step 2</span>
                      生成主视图
                      <span className="text-[10px]" style={{ color: MUTED }}>(-10积分)</span>
                    </p>
                    <div className="relative rounded-xl overflow-hidden border flex items-center justify-center"
                      style={{ background: INPUT_BG, borderColor: selectedAsset.mainImageUrl ? "oklch(0.45 0.12 65)" : BORDER, minHeight: "200px" }}>
                      {selectedAsset.mainImageUrl ? (
                        <img src={selectedAsset.mainImageUrl} alt="主视图" className="w-full object-contain" style={{ maxHeight: "260px" }} />
                      ) : generatingMain ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
                          <p className="text-xs" style={{ color: MUTED }}>生成中，约 10-20 秒...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 p-6">
                          <ImageIcon size={28} style={{ color: "oklch(0.30 0.008 240)" }} />
                          <p className="text-xs text-center" style={{ color: MUTED }}>
                            {(selectedAsset as any).uploadedImageUrl ? "点击下方按钮生成主视图" : "请先上传 MJ 参考图"}
                          </p>
                        </div>
                      )}
                    </div>
                    <button onClick={handleGenerateMain}
                      disabled={!(selectedAsset as any).uploadedImageUrl || generatingMain}
                      className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                      style={{ background: ACCENT, color: "white" }}>
                      {generatingMain
                        ? <><Loader2 className="w-3 h-3 animate-spin" />生成中...</>
                        : selectedAsset.mainImageUrl
                          ? <><RefreshCw size={12} />重新生成主视图</>
                          : <><Zap size={12} />生成主视图</>
                      }
                    </button>
                  </div>
                </div>

                {/* Step 3：视角图 */}
                <div className="border-t pt-5" style={{ borderColor: BORDER }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs flex items-center gap-1.5" style={{ color: "oklch(0.60 0.008 240)" }}>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.20 0.008 240)", color: ACCENT }}>Step 3</span>
                      {activeType === "character" ? "生成三视图" : "生成多视角图"}
                      <span className="text-[10px]" style={{ color: MUTED }}>(-8积分/张)</span>
                    </p>
                    {pendingViews.length > 0 && (
                      <button onClick={handleBatchGenerate} disabled={batchGenerating || !(selectedAsset as any).uploadedImageUrl}
                        className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
                        style={{ background: "oklch(0.20 0.008 240)", border: `1px solid oklch(0.35 0.12 65)`, color: GOLD }}>
                        {batchGenerating
                          ? <><Loader2 className="w-2.5 h-2.5 animate-spin" />生成中 {batchProgress}...</>
                          : <><Zap size={10} />一键批量生成 ({pendingViews.length}张)</>
                        }
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {views.map((viewType) => (
                      <div key={viewType} className="flex flex-col gap-1.5">
                        <div className="relative rounded-lg overflow-hidden border flex items-center justify-center"
                          style={{ background: INPUT_BG, borderColor: multiViewUrls[viewType] ? "oklch(0.45 0.12 65)" : BORDER, aspectRatio: "1" }}>
                          {multiViewUrls[viewType] ? (
                            <img src={multiViewUrls[viewType]} alt={VIEW_LABELS[viewType]} className="w-full h-full object-cover" />
                          ) : generatingViews[viewType] ? (
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
                          ) : (
                            <button onClick={() => handleGenerateView(viewType)}
                              disabled={!(selectedAsset as any).uploadedImageUrl}
                              className="flex flex-col items-center gap-1 p-3 w-full h-full justify-center hover:opacity-80 transition-opacity disabled:opacity-30">
                              <Plus size={18} style={{ color: MUTED }} />
                              <span className="text-[10px]" style={{ color: MUTED }}>生成</span>
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-center" style={{ color: MUTED }}>{VIEW_LABELS[viewType]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
