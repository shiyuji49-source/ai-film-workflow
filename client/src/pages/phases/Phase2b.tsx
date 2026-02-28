// Phase2b: 场景与道具资产
// 工作流：① AI 生成 MJ7 提示词 → ② 用 MJ7 生成图后上传 → ③ 填写 Nano 辅助提示词 → ④ 生成主视图/多视角图 → ⑤ 导入资产库
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, ChevronRight, Wand2, Copy, Check, Mountain, Package,
  Loader2, Upload, ImageIcon, Download, Library, RefreshCw, Plus, Trash2, ChevronDown, ChevronUp
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { EpisodeAsset } from "@/contexts/ProjectContext";

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  card: { background: "oklch(0.15 0.006 240)", border: "1px solid oklch(0.22 0.006 240)", borderRadius: "8px" } as React.CSSProperties,
  innerCard: { background: "oklch(0.12 0.005 240)", border: "1px solid oklch(0.20 0.006 240)", borderRadius: "6px" } as React.CSSProperties,
  amber: "oklch(0.75 0.17 65)",
  green: "oklch(0.65 0.2 145)",
  blue: "oklch(0.60 0.18 240)",
  purple: "oklch(0.65 0.18 290)",
  teal: "oklch(0.65 0.15 185)",
  dim: "oklch(0.55 0.01 240)",
  text: "oklch(0.88 0.005 60)",
  sub: "oklch(0.70 0.008 240)",
  mono: "'JetBrains Mono', monospace" as const,
  grotesk: "'Space Grotesk', sans-serif" as const,
};

// ─── CopyButton ───────────────────────────────────────────────────────────────
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
        color: copied ? S.green : "oklch(0.60 0.01 240)",
        fontFamily: S.mono,
      }}>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "已复制" : label}
    </button>
  );
}

// ─── ImageUploadZone ──────────────────────────────────────────────────────────
function ImageUploadZone({
  imageUrl, onUpload, uploading
}: {
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
      className="relative border-2 border-dashed rounded-lg overflow-hidden cursor-pointer transition-all"
      style={{
        borderColor: imageUrl ? "oklch(0.45 0.12 65)" : "oklch(0.28 0.008 240)",
        background: "oklch(0.10 0.004 240)",
        minHeight: "130px",
      }}
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleFile(f); }}
      onDragOver={(e) => e.preventDefault()}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {imageUrl ? (
        <div className="relative" style={{ minHeight: "130px" }}>
          <img src={imageUrl} alt="参考图" className="w-full object-contain" style={{ maxHeight: "180px" }} />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            style={{ background: "oklch(0 0 0 / 0.6)" }}>
            <span className="text-xs" style={{ color: S.text }}>点击重新上传</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-5" style={{ minHeight: "130px" }}>
          {uploading
            ? <Loader2 className="w-6 h-6 animate-spin" style={{ color: S.amber }} />
            : <>
              <Upload className="w-5 h-5" style={{ color: "oklch(0.35 0.008 240)" }} />
              <p className="text-xs text-center" style={{ color: S.dim }}>点击或拖拽上传 MJ 生成的参考图</p>
              <p className="text-[10px]" style={{ color: "oklch(0.38 0.008 240)" }}>最大 16MB · JPG / PNG / WEBP</p>
            </>
          }
        </div>
      )}
    </div>
  );
}

// ─── ViewImage ────────────────────────────────────────────────────────────────
function ViewImage({ url, label, onGenerate, generating, disabled }: {
  url?: string | null;
  label: string;
  onGenerate: () => void;
  generating: boolean;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold" style={{ color: S.dim, fontFamily: S.mono }}>{label}</span>
        <button
          onClick={onGenerate}
          disabled={generating || disabled}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all disabled:opacity-40"
          style={{
            background: url ? "oklch(0.55 0.18 290 / 0.12)" : "oklch(0.65 0.2 145 / 0.12)",
            border: `1px solid ${url ? "oklch(0.55 0.18 290 / 0.4)" : "oklch(0.65 0.2 145 / 0.35)"}`,
            color: url ? S.purple : S.green,
            fontFamily: S.mono,
          }}>
          {generating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : url ? <RefreshCw className="w-2.5 h-2.5" /> : <Wand2 className="w-2.5 h-2.5" />}
          {generating ? "生成中" : url ? "重新" : "生成"}
        </button>
      </div>
      <div className="rounded overflow-hidden" style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.20 0.006 240)", minHeight: "90px" }}>
        {url
          ? <img src={url} alt={label} className="w-full object-contain" style={{ maxHeight: "140px" }} />
          : <div className="flex items-center justify-center" style={{ minHeight: "90px" }}>
            <ImageIcon className="w-4 h-4" style={{ color: "oklch(0.30 0.006 240)" }} />
          </div>
        }
      </div>
    </div>
  );
}

// ─── AssetCard ────────────────────────────────────────────────────────────────
function AssetCard({ asset, projectInfo }: { asset: EpisodeAsset; projectInfo: { styleZh: string; styleEn: string } }) {
  const { updateEpisodeAsset, removeEpisodeAsset, scriptAnalysis } = useProject();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [uploading, setUploading] = useState(false);
  const [generatingMJ, setGeneratingMJ] = useState(false);
  const [generatingMain, setGeneratingMain] = useState(false);
  const [generatingViews, setGeneratingViews] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const generateMJMutation = trpc.ai.generateAssetPrompt.useMutation();
  const createAssetMutation = trpc.assets.create.useMutation();
  const uploadMutation = trpc.assets.uploadImage.useMutation();
  const generateMainMutation = trpc.assets.generateMain.useMutation();
  const generateMultiMutation = trpc.assets.generateMultiView.useMutation();

  // 解析 MJ 提示词（JSON 格式）
  const parsedPrompt = (() => {
    if (!asset.promptMJ) return null;
    try { return JSON.parse(asset.promptMJ) as { zh: string; en: string }; }
    catch { return { zh: asset.promptMJ, en: "" }; }
  })();

  // 获取或创建资产库 ID
  const getOrCreateAssetId = async (): Promise<number> => {
    if (asset.assetLibId) return asset.assetLibId;
    const a = await createAssetMutation.mutateAsync({
      type: "scene",
      name: asset.name,
      description: asset.description || asset.name,
      mjPrompt: parsedPrompt?.en || undefined,
      mainPrompt: asset.nanoPrompt || undefined,
    });
    updateEpisodeAsset(asset.id, { assetLibId: a.id });
    return a.id;
  };

  // 生成 MJ7 提示词
  const handleGenerateMJ = async () => {
    setGeneratingMJ(true);
    try {
      const ep = scriptAnalysis.episodes.find(e => e.id === asset.episodeId);
      const result = await generateMJMutation.mutateAsync({
        type: asset.type as "scene" | "prop",
        name: asset.name,
        description: asset.description || asset.name,
        episodeContext: ep ? `第${ep.number}集《${ep.title}》：${ep.synopsis}` : undefined,
        styleZh: projectInfo.styleZh,
        styleEn: projectInfo.styleEn,
      });
      updateEpisodeAsset(asset.id, { promptMJ: JSON.stringify(result) });
      toast.success(`${asset.name} MJ7 提示词已生成`);
    } catch (err) {
      toast.error(`生成失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setGeneratingMJ(false);
    }
  };

  // 上传 MJ 参考图
  const handleUpload = async (base64: string, mimeType: string) => {
    if (!isAuthenticated) { toast.error("请先登录后再上传图片"); return; }
    setUploading(true);
    try {
      const assetId = await getOrCreateAssetId();
      const result = await uploadMutation.mutateAsync({ id: assetId, imageBase64: base64, mimeType });
      updateEpisodeAsset(asset.id, { uploadedImageUrl: result.uploadedImageUrl });
      utils.assets.list.invalidate();
      toast.success("参考图已上传");
    } catch (err) {
      toast.error(`上传失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setUploading(false);
    }
  };

  // 生成主视图
  const handleGenerateMain = async () => {
    if (!asset.uploadedImageUrl) { toast.error("请先上传 MJ 参考图"); return; }
    if (!isAuthenticated) { toast.error("请先登录后再生成图片"); return; }
    setGeneratingMain(true);
    try {
      const assetId = await getOrCreateAssetId();
      const result = await generateMainMutation.mutateAsync({ id: assetId, prompt: asset.nanoPrompt || undefined });
      updateEpisodeAsset(asset.id, { mainImageUrl: result.imageUrl });
      utils.assets.list.invalidate();
      toast.success("主视图生成完成！");
    } catch (err) {
      toast.error(`生成失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setGeneratingMain(false);
    }
  };

  // 生成单个视角图
  const handleGenerateView = async (viewType: "angle1" | "angle2" | "angle3") => {
    if (!asset.uploadedImageUrl) { toast.error("请先上传 MJ 参考图"); return; }
    if (!isAuthenticated) { toast.error("请先登录后再生成图片"); return; }
    setGeneratingViews(p => ({ ...p, [viewType]: true }));
    try {
      const assetId = await getOrCreateAssetId();
      const result = await generateMultiMutation.mutateAsync({ id: assetId, viewType, prompt: asset.nanoPrompt || undefined });
      const urlKey = viewType === "angle1" ? "angle1ImageUrl" : viewType === "angle2" ? "angle2ImageUrl" : "angle3ImageUrl";
      updateEpisodeAsset(asset.id, { [urlKey]: result.imageUrl });
      utils.assets.list.invalidate();
      const labels: Record<string, string> = { angle1: "四分之三视角", angle2: "俯视", angle3: "仰视" };
      toast.success(`${labels[viewType]} 生成完成`);
    } catch (err) {
      toast.error(`生成失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setGeneratingViews(p => ({ ...p, [viewType]: false }));
    }
  };

  // 导入资产库
  const handleImport = async () => {
    if (!isAuthenticated) { toast.error("请先登录后再导入资产库"); return; }
    setImporting(true);
    try {
      const assetId = await getOrCreateAssetId();
      utils.assets.list.invalidate();
      toast.success(`${asset.name} 已导入资产库（ID: ${assetId}）`);
    } catch (err) {
      toast.error(`导入失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setImporting(false);
    }
  };

  const hasImages = asset.mainImageUrl || asset.angle1ImageUrl || asset.angle2ImageUrl || asset.angle3ImageUrl;
  const isScene = asset.type === "scene";
  const typeColor = isScene ? S.teal : S.amber;

  return (
    <div className="p-4 space-y-4" style={S.card}>
      {/* 资产标题 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {isScene
            ? <Mountain className="w-3.5 h-3.5 flex-shrink-0" style={{ color: S.teal }} />
            : <Package className="w-3.5 h-3.5 flex-shrink-0" style={{ color: S.amber }} />
          }
          <span className="font-bold text-sm" style={{ color: S.text, fontFamily: S.grotesk }}>{asset.name || "未命名资产"}</span>
          <Badge className="text-xs px-1.5 py-0" style={{
            background: `oklch(0.55 0.15 ${isScene ? "185" : "65"} / 0.15)`,
            border: `1px solid ${typeColor}40`,
            color: typeColor
          }}>{isScene ? "场景" : "道具"}</Badge>
          {asset.assetLibId && (
            <Badge className="text-xs px-1.5 py-0" style={{ background: "oklch(0.65 0.2 145 / 0.15)", border: "1px solid oklch(0.65 0.2 145 / 0.4)", color: S.green }}>
              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />已入库
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" onClick={handleImport} disabled={importing}
            style={{ background: "oklch(0.65 0.2 145 / 0.12)", border: "1px solid oklch(0.65 0.2 145 / 0.35)", color: S.green }}>
            {importing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Library className="w-3 h-3 mr-1" />}
            导入资产库
          </Button>
          <button onClick={() => setExpanded(p => !p)} className="p-1 rounded" style={{ color: S.dim }}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => removeEpisodeAsset(asset.id)} className="p-1 rounded hover:opacity-70" style={{ color: "oklch(0.55 0.15 15)" }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* 资产描述 */}
          {asset.description && (
            <div className="p-2 rounded text-xs" style={{ ...S.innerCard, color: S.sub }}>
              {asset.description}
            </div>
          )}

          {/* STEP 1: MJ7 提示词 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)", color: S.amber, fontFamily: S.mono }}>STEP 1</span>
                <span className="text-xs font-semibold" style={{ color: S.amber, fontFamily: S.grotesk }}>MJ7 提示词</span>
              </div>
              <Button size="sm" onClick={handleGenerateMJ} disabled={generatingMJ}
                style={{ background: "oklch(0.75 0.17 65 / 0.12)", border: "1px solid oklch(0.75 0.17 65 / 0.35)", color: S.amber }}>
                {generatingMJ ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />生成中</> : <><Wand2 className="w-3 h-3 mr-1" />{parsedPrompt ? "重新生成" : "AI 生成"}</>}
              </Button>
            </div>
            {parsedPrompt ? (
              <div className="space-y-2">
                {parsedPrompt.zh && (
                  <div className="p-3 rounded text-xs leading-relaxed" style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.22 0.006 240)", color: "oklch(0.75 0.008 240)", fontFamily: S.mono, whiteSpace: "pre-wrap" }}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span style={{ color: S.dim }}>ZH</span>
                      <CopyButton text={parsedPrompt.zh} />
                    </div>
                    {parsedPrompt.zh}
                  </div>
                )}
                {parsedPrompt.en && (
                  <div className="p-3 rounded text-xs leading-relaxed" style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.22 0.006 240)", color: "oklch(0.70 0.008 240)", fontFamily: S.mono, whiteSpace: "pre-wrap" }}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span style={{ color: S.dim }}>EN</span>
                      <CopyButton text={parsedPrompt.en} />
                    </div>
                    {parsedPrompt.en}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded text-xs text-center" style={{ background: "oklch(0.10 0.004 240)", border: "1px dashed oklch(0.28 0.008 240)", color: S.dim }}>
                点击「AI 生成」，Gemini AI 将基于{isScene ? "场景" : "道具"}信息生成专属 MJ7 提示词
              </div>
            )}
          </div>

          {/* STEP 2: 上传 MJ 参考图 + Nano 辅助提示词 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.55 0.18 290 / 0.15)", border: "1px solid oklch(0.55 0.18 290 / 0.3)", color: S.purple, fontFamily: S.mono }}>STEP 2</span>
              <span className="text-xs font-semibold" style={{ color: S.purple, fontFamily: S.grotesk }}>上传 MJ 参考图 + Nano Banana Pro 辅助提示词</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] mb-1.5" style={{ color: S.dim }}>MJ 参考图（用 MJ7 生成后上传）</p>
                <ImageUploadZone imageUrl={asset.uploadedImageUrl} onUpload={handleUpload} uploading={uploading} />
              </div>
              <div>
                <p className="text-[10px] mb-1.5" style={{ color: S.dim }}>Nano 辅助提示词（可选，留空使用默认）</p>
                <Textarea
                  value={asset.nanoPrompt || ""}
                  onChange={e => updateEpisodeAsset(asset.id, { nanoPrompt: e.target.value })}
                  placeholder={`输入 Nano Banana Pro 辅助提示词...\n例如：${isScene ? "scene, establishing shot, cinematic lighting" : "product display, clean background, studio lighting"}`}
                  rows={5}
                  className="text-xs resize-none"
                  style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.85 0.005 60)", fontFamily: S.mono }}
                />
              </div>
            </div>
          </div>

          {/* STEP 3: 生成主视图 + 多视角图 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.60 0.18 240 / 0.15)", border: "1px solid oklch(0.60 0.18 240 / 0.3)", color: S.blue, fontFamily: S.mono }}>STEP 3</span>
                <span className="text-xs font-semibold" style={{ color: S.blue, fontFamily: S.grotesk }}>Nano Banana Pro 生成视图</span>
              </div>
              {!asset.uploadedImageUrl && (
                <span className="text-[10px]" style={{ color: S.dim }}>请先上传 MJ 参考图</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* 主视图 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold" style={{ color: S.dim, fontFamily: S.mono }}>主视图（精修）</span>
                  <button
                    onClick={handleGenerateMain}
                    disabled={generatingMain || !asset.uploadedImageUrl}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all disabled:opacity-40"
                    style={{
                      background: asset.mainImageUrl ? "oklch(0.55 0.18 290 / 0.12)" : "oklch(0.65 0.2 145 / 0.12)",
                      border: `1px solid ${asset.mainImageUrl ? "oklch(0.55 0.18 290 / 0.4)" : "oklch(0.65 0.2 145 / 0.35)"}`,
                      color: asset.mainImageUrl ? S.purple : S.green,
                      fontFamily: S.mono,
                    }}>
                    {generatingMain ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : asset.mainImageUrl ? <RefreshCw className="w-2.5 h-2.5" /> : <Wand2 className="w-2.5 h-2.5" />}
                    {generatingMain ? "生成中" : asset.mainImageUrl ? "重新生成" : "生成 (10积分)"}
                  </button>
                </div>
                <div className="rounded overflow-hidden" style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.20 0.006 240)", minHeight: "110px" }}>
                  {asset.mainImageUrl
                    ? <img src={asset.mainImageUrl} alt="主视图" className="w-full object-contain" style={{ maxHeight: "160px" }} />
                    : <div className="flex items-center justify-center" style={{ minHeight: "110px" }}>
                      <ImageIcon className="w-5 h-5" style={{ color: "oklch(0.30 0.006 240)" }} />
                    </div>
                  }
                </div>
              </div>

              {/* 多视角图 */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: "angle1ImageUrl" as const, viewType: "angle1" as const, label: "3/4视角" },
                  { key: "angle2ImageUrl" as const, viewType: "angle2" as const, label: "俯视" },
                  { key: "angle3ImageUrl" as const, viewType: "angle3" as const, label: "仰视" },
                ]).map(({ key, viewType, label }) => (
                  <ViewImage
                    key={viewType}
                    url={asset[key]}
                    label={label}
                    onGenerate={() => handleGenerateView(viewType)}
                    generating={!!generatingViews[viewType]}
                    disabled={!asset.uploadedImageUrl}
                  />
                ))}
              </div>
            </div>

            {/* 下载已生成的图片 */}
            {hasImages && (
              <div className="flex flex-wrap gap-2 pt-1">
                {asset.mainImageUrl && (
                  <a href={asset.mainImageUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                    style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: S.sub, fontFamily: S.mono }}>
                    <Download className="w-2.5 h-2.5" />主视图
                  </a>
                )}
                {asset.angle1ImageUrl && (
                  <a href={asset.angle1ImageUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                    style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: S.sub, fontFamily: S.mono }}>
                    <Download className="w-2.5 h-2.5" />3/4视角
                  </a>
                )}
                {asset.angle2ImageUrl && (
                  <a href={asset.angle2ImageUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                    style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: S.sub, fontFamily: S.mono }}>
                    <Download className="w-2.5 h-2.5" />俯视
                  </a>
                )}
                {asset.angle3ImageUrl && (
                  <a href={asset.angle3ImageUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                    style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: S.sub, fontFamily: S.mono }}>
                    <Download className="w-2.5 h-2.5" />仰视
                  </a>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── EpisodeSection ────────────────────────────────────────────────────────────
function EpisodeSection({ episodeId, episodeTitle, assets, projectInfo }: {
  episodeId: string;
  episodeTitle: string;
  assets: EpisodeAsset[];
  projectInfo: { styleZh: string; styleEn: string };
}) {
  const { addEpisodeAsset } = useProject();
  const [collapsed, setCollapsed] = useState(false);

  const scenes = assets.filter(a => a.type === "scene");
  const props = assets.filter(a => a.type === "prop");

  return (
    <div className="space-y-3">
      {/* 集标题 */}
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setCollapsed(p => !p)}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: S.amber }} />
          <h3 className="text-sm font-bold" style={{ color: S.text, fontFamily: S.grotesk }}>{episodeTitle}</h3>
          <span className="text-xs" style={{ color: S.dim, fontFamily: S.mono }}>
            {scenes.length} 场景 · {props.length} 道具
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={(e) => { e.stopPropagation(); addEpisodeAsset(episodeId, "scene"); }}
            style={{ background: "oklch(0.65 0.15 185 / 0.12)", border: "1px solid oklch(0.65 0.15 185 / 0.35)", color: S.teal }}>
            <Plus className="w-3 h-3 mr-1" />添加场景
          </Button>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); addEpisodeAsset(episodeId, "prop"); }}
            style={{ background: "oklch(0.75 0.17 65 / 0.12)", border: "1px solid oklch(0.75 0.17 65 / 0.35)", color: S.amber }}>
            <Plus className="w-3 h-3 mr-1" />添加道具
          </Button>
          {collapsed ? <ChevronDown className="w-4 h-4" style={{ color: S.dim }} /> : <ChevronUp className="w-4 h-4" style={{ color: S.dim }} />}
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-4 pl-4 border-l" style={{ borderColor: "oklch(0.22 0.006 240)" }}>
          {assets.length === 0 ? (
            <div className="p-4 text-center rounded text-xs" style={{ background: "oklch(0.13 0.005 240)", border: "1px dashed oklch(0.25 0.008 240)", color: S.dim }}>
              点击上方按钮添加场景或道具
            </div>
          ) : (
            assets.map(asset => <AssetCard key={asset.id} asset={asset} projectInfo={projectInfo} />)
          )}
        </div>
      )}
    </div>
  );
}

// ─── Phase2b Main ──────────────────────────────────────────────────────────────
export default function Phase2b() {
  const { scriptAnalysis, episodeAssets, markPhaseComplete, setActivePhase, projectInfo } = useProject();
  const episodes = scriptAnalysis.episodes;

  const handleComplete = () => {
    markPhaseComplete("phase2b");
    setActivePhase("phase3");
  };

  return (
    <div className="space-y-8">
      {/* Phase header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded flex items-center justify-center text-lg font-bold"
          style={{ background: "oklch(0.65 0.15 185 / 0.15)", border: "1px solid oklch(0.65 0.15 185 / 0.4)", color: S.teal, fontFamily: S.mono }}>2b</div>
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: S.text, fontFamily: S.grotesk }}>场景与道具资产</h2>
          <p className="text-sm" style={{ color: S.sub }}>MJ7 提示词 → 上传参考图 → Nano Banana Pro 生成多视角图 → 导入资产库</p>
        </div>
      </div>

      {/* 工作流说明 */}
      <div className="p-4 rounded" style={{ background: "oklch(0.13 0.005 240)", border: "1px solid oklch(0.20 0.006 240)" }}>
        <div className="flex flex-wrap gap-4 text-xs" style={{ color: S.dim }}>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "oklch(0.75 0.17 65 / 0.15)", color: S.amber, fontFamily: S.mono }}>STEP 1</span>
            AI 生成 MJ7 提示词 → 复制到 Midjourney 生成参考图
          </div>
          <span style={{ color: "oklch(0.30 0.006 240)" }}>→</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "oklch(0.55 0.18 290 / 0.15)", color: S.purple, fontFamily: S.mono }}>STEP 2</span>
            上传 MJ 生成的图片 + 填写 Nano 辅助提示词
          </div>
          <span style={{ color: "oklch(0.30 0.006 240)" }}>→</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "oklch(0.60 0.18 240 / 0.15)", color: S.blue, fontFamily: S.mono }}>STEP 3</span>
            Nano Banana Pro 生成主视图 + 多视角图
          </div>
          <span style={{ color: "oklch(0.30 0.006 240)" }}>→</span>
          <div className="flex items-center gap-1.5">
            <Library className="w-3 h-3" style={{ color: S.green }} />
            导入资产库统一管理
          </div>
        </div>
      </div>

      {/* 按集分组的资产列表 */}
      {episodes.length === 0 ? (
        <div className="p-8 text-center rounded" style={{ background: "oklch(0.15 0.006 240)", border: "1px solid oklch(0.22 0.006 240)", borderRadius: "8px" }}>
          <p className="text-sm" style={{ color: S.dim }}>请先在阶段一完成剧本解析，系统将自动提取场景与道具信息</p>
        </div>
      ) : (
        <div className="space-y-8">
          {episodes.map(ep => {
            const epAssets = episodeAssets.filter(a => a.episodeId === ep.id);
            return (
              <EpisodeSection
                key={ep.id}
                episodeId={ep.id}
                episodeTitle={`第 ${ep.number} 集${ep.title ? `：${ep.title}` : ""}`}
                assets={epAssets}
                projectInfo={projectInfo}
              />
            );
          })}
        </div>
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
