// Phase2: 人物资产
// 工作流：① AI 生成 MJ7 提示词 → ② 上传 MJ 参考图 → ③ 分别生成4张9:16视角图（近景/正视/侧视/背视）→ ④ 拼合成16:9设计主图 → ⑤ 导入资产库
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight, Wand2, Copy, Check, Loader2, Upload, ImageIcon,
  Download, Library, RefreshCw, CheckCircle2, Bot, User, Merge
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AIEstimateHint } from "@/components/AIEstimateHint";
import { GEMINI_ESTIMATE_SECS } from "@shared/const";

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  card: { background: "oklch(0.15 0.006 240)", border: "1px solid oklch(0.22 0.006 240)", borderRadius: "8px" } as React.CSSProperties,
  innerCard: { background: "oklch(0.12 0.005 240)", border: "1px solid oklch(0.20 0.006 240)", borderRadius: "6px" } as React.CSSProperties,
  amber: "oklch(0.75 0.17 65)",
  green: "oklch(0.65 0.2 145)",
  blue: "oklch(0.60 0.18 240)",
  purple: "oklch(0.65 0.18 290)",
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
  imageUrl, onUpload, uploading, label = "点击或拖拽上传 MJ 生成的参考图"
}: {
  imageUrl?: string | null;
  onUpload: (base64: string, mimeType: string) => void;
  uploading: boolean;
  label?: string;
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
        minHeight: "140px",
      }}
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleFile(f); }}
      onDragOver={(e) => e.preventDefault()}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {imageUrl ? (
        <div className="relative" style={{ minHeight: "140px" }}>
          <img src={imageUrl} alt="参考图" className="w-full object-contain" style={{ maxHeight: "200px" }} />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            style={{ background: "oklch(0 0 0 / 0.6)" }}>
            <span className="text-xs" style={{ color: S.text }}>点击重新上传</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-6" style={{ minHeight: "140px" }}>
          {uploading
            ? <Loader2 className="w-6 h-6 animate-spin" style={{ color: S.amber }} />
            : <>
              <Upload className="w-6 h-6" style={{ color: "oklch(0.35 0.008 240)" }} />
              <p className="text-xs text-center" style={{ color: S.dim }}>{label}</p>
              <p className="text-[10px]" style={{ color: "oklch(0.38 0.008 240)" }}>最大 16MB · JPG / PNG / WEBP</p>
            </>
          }
        </div>
      )}
    </div>
  );
}

// ─── ViewPanel: 单个视角图面板 ─────────────────────────────────────────────────
function ViewPanel({
  viewType, label, color, imageUrl, loading, disabled, onGenerate, onDownload
}: {
  viewType: "closeup" | "front" | "side" | "back";
  label: string;
  color: string;
  imageUrl?: string | null;
  loading: boolean;
  disabled: boolean;
  onGenerate: () => void;
  onDownload: (url: string, filename: string) => void;
}) {
  return (
    <div className="space-y-2">
      {/* 视角标签 + 生成按钮 */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: `${color} / 0.15`, border: `1px solid ${color} / 0.35`, color, fontFamily: S.mono }}>
          {label}
        </span>
        <button
          onClick={onGenerate}
          disabled={loading || disabled}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all disabled:opacity-40"
          style={{
            background: imageUrl ? "oklch(0.55 0.18 290 / 0.12)" : `${color.replace("oklch(", "oklch(")} / 0.12`,
            border: `1px solid ${imageUrl ? "oklch(0.55 0.18 290 / 0.4)" : `${color} / 0.35`}`,
            color: imageUrl ? S.purple : color,
            fontFamily: S.mono,
          }}
        >
          {loading
            ? <><Loader2 className="w-2.5 h-2.5 animate-spin" />生成中</>
            : imageUrl
              ? <><RefreshCw className="w-2.5 h-2.5" />重新生成</>
              : <><Wand2 className="w-2.5 h-2.5" />生成</>
          }
        </button>
      </div>

      {/* 图片预览区（9:16 比例） */}
      <div className="rounded overflow-hidden"
        style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.22 0.006 240)", aspectRatio: "9/16" }}>
        {imageUrl
          ? <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            <ImageIcon className="w-5 h-5" style={{ color: "oklch(0.30 0.006 240)" }} />
            <span className="text-[9px]" style={{ color: "oklch(0.35 0.006 240)", fontFamily: S.mono }}>
              {disabled ? "先上传参考图" : "待生成"}
            </span>
          </div>
        }
      </div>

      {/* 下载按鈕 */}
      {imageUrl && (
        <button
          onClick={() => onDownload(imageUrl, `${label}.png`)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] w-fit transition-all hover:opacity-80"
          style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: S.dim, fontFamily: S.mono }}>
          <Download className="w-2.5 h-2.5" />下载
        </button>
      )}
    </div>
  );
}

// ─── CharacterCard ────────────────────────────────────────────────────────────
function CharacterCard({ char }: { char: ReturnType<typeof useProject>["characters"][0] }) {
  const { projectInfo, updateCharacter } = useProject();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [uploading, setUploading] = useState(false);
  const [generatingMJ, setGeneratingMJ] = useState(false);
  const [generatingView, setGeneratingView] = useState<Record<string, boolean>>({});
  const [merging, setMerging] = useState(false);
  const [importing, setImporting] = useState(false);

  const generateMJMutation = trpc.ai.generateCharacterPrompt.useMutation();
  const isQVersion = char.isQVersion ?? false;
  const createAssetMutation = trpc.assets.create.useMutation();
  const uploadMutation = trpc.assets.uploadImage.useMutation();
  const generateViewMutation = trpc.assets.generateCharacterView.useMutation();
  const mergeDesignMutation = trpc.assets.mergeCharacterDesign.useMutation();

  // 获取或创建资产库 ID
  const getOrCreateAssetId = async (): Promise<number> => {
    if (char.assetLibId) return char.assetLibId;
    const asset = await createAssetMutation.mutateAsync({
      type: "character",
      name: char.name,
      description: char.appearance || char.name,
      mjPrompt: char.promptEn || undefined,
      mainPrompt: char.nanoPrompt || undefined,
    });
    updateCharacter(char.id, { assetLibId: asset.id });
    return asset.id;
  };

  // 生成 MJ7 提示词
  const handleGenerateMJ = async () => {
    setGeneratingMJ(true);
    try {
      const result = await generateMJMutation.mutateAsync({
        name: char.name,
        role: char.role || "角色",
        isMecha: char.isMecha ?? false,
        isQVersion: char.isQVersion ?? false,
        appearance: char.appearance || char.name,
        costume: char.costume || "",
        marks: char.marks || "",
        styleZh: projectInfo.styleZh,
        styleEn: projectInfo.styleEn,
      });
      updateCharacter(char.id, {
        promptZh: result.zh,
        promptEn: result.en,
        ...(result.qVersionZh ? { qVersionPromptZh: result.qVersionZh } : {}),
        ...(result.qVersionEn ? { qVersionPromptEn: result.qVersionEn } : {}),
      });
      toast.success(`${char.name} MJ7 提示词已生成`);
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
      updateCharacter(char.id, { uploadedImageUrl: result.uploadedImageUrl });
      utils.assets.list.invalidate();
      toast.success("参考图已上传！请分别生成4张视角图");
    } catch (err) {
      toast.error(`上传失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setUploading(false);
    }
  };

  // 生成单张视角图（9:16）
  const handleGenerateView = async (viewType: "closeup" | "front" | "side" | "back") => {
    if (!char.uploadedImageUrl) { toast.error("请先上传 MJ 参考图"); return; }
    if (!isAuthenticated) { toast.error("请先登录后再生成图片"); return; }
    setGeneratingView(prev => ({ ...prev, [viewType]: true }));
    try {
      const assetId = await getOrCreateAssetId();
      const result = await generateViewMutation.mutateAsync({
        id: assetId,
        viewType,
        nanoPrompt: char.nanoPrompt || undefined,
      });
      // 更新对应视角图 URL
      const fieldMap: Record<string, keyof typeof char> = {
        closeup: "closeupImageUrl",
        front: "frontImageUrl",
        side: "sideImageUrl",
        back: "backImageUrl",
      };
      updateCharacter(char.id, { [fieldMap[viewType]]: result.imageUrl });
      utils.assets.list.invalidate();
      const labelMap: Record<string, string> = { closeup: "近景肖像", front: "正视全身", side: "侧视全身", back: "背视全身" };
      toast.success(`${labelMap[viewType]}生成完成！`);
    } catch (err) {
      toast.error(`生成失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setGeneratingView(prev => ({ ...prev, [viewType]: false }));
    }
  };

  // 一键生成全部4张视角图（串行）
  const [generatingAllViews, setGeneratingAllViews] = useState(false);
  const handleGenerateAllViews = async () => {
    if (!char.uploadedImageUrl) { toast.error("请先上传 MJ 参考图"); return; }
    if (!isAuthenticated) { toast.error("请先登录后再生成图片"); return; }
    setGeneratingAllViews(true);
    const views: ("closeup" | "front" | "side" | "back")[] = ["closeup", "front", "side", "back"];
    const fieldMap: Record<string, keyof typeof char> = {
      closeup: "closeupImageUrl", front: "frontImageUrl", side: "sideImageUrl", back: "backImageUrl",
    };
    const labelMap: Record<string, string> = { closeup: "近景肖像", front: "正视全身", side: "侧视全身", back: "背视全身" };
    for (const viewType of views) {
      setGeneratingView(prev => ({ ...prev, [viewType]: true }));
      try {
        const assetId = await getOrCreateAssetId();
        const result = await generateViewMutation.mutateAsync({
          id: assetId,
          viewType,
          nanoPrompt: char.nanoPrompt || undefined,
        });
        updateCharacter(char.id, { [fieldMap[viewType]]: result.imageUrl });
        toast.success(`${labelMap[viewType]}生成完成！`);
      } catch (err) {
        toast.error(`${labelMap[viewType]}生成失败：${err instanceof Error ? err.message : "未知错误"}`);
      } finally {
        setGeneratingView(prev => ({ ...prev, [viewType]: false }));
      }
    }
    setGeneratingAllViews(false);
    utils.assets.list.invalidate();
  };

  // 强制下载图片（避免跨域图片在新窗口打开）
  const handleDownload = async (url: string, filename: string) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  // 拼呼4张视角图为16:9合图
  const handleMerge = async () => {
    const { closeupImageUrl, frontImageUrl, sideImageUrl, backImageUrl } = char;
    if (!closeupImageUrl || !frontImageUrl || !sideImageUrl || !backImageUrl) {
      toast.error("请先生成全部4张视角图（近景/正视/侧视/背视）");
      return;
    }
    if (!isAuthenticated) { toast.error("请先登录后再拼合图片"); return; }
    setMerging(true);
    try {
      const assetId = await getOrCreateAssetId();
      // 直接传入前端已有的 URL，避免数据库竞态导致的视角图丢失
      const result = await mergeDesignMutation.mutateAsync({
        id: assetId,
        closeupUrl: closeupImageUrl,
        frontUrl: frontImageUrl,
        sideUrl: sideImageUrl,
        backUrl: backImageUrl,
      });
      updateCharacter(char.id, { designImageUrl: result.imageUrl, mainImageUrl: result.imageUrl });
      utils.assets.list.invalidate();
      toast.success("16:9 角色设计主图拼合完成！");
    } catch (err) {
      toast.error(`拼合失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setMerging(false);
    }
  };

  // 导入资产库
  const handleImport = async () => {
    if (!isAuthenticated) { toast.error("请先登录后再导入资产库"); return; }
    setImporting(true);
    try {
      const assetId = await getOrCreateAssetId();
      utils.assets.list.invalidate();
      toast.success(`${char.name} 已导入资产库（ID: ${assetId}）`);
    } catch (err) {
      toast.error(`导入失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setImporting(false);
    }
  };

  const designImage = char.designImageUrl || char.mainImageUrl;
  const allViewsDone = !!(char.closeupImageUrl && char.frontImageUrl && char.sideImageUrl && char.backImageUrl);
  const anyViewDone = !!(char.closeupImageUrl || char.frontImageUrl || char.sideImageUrl || char.backImageUrl);

  const viewConfigs: { viewType: "closeup" | "front" | "side" | "back"; label: string; color: string; urlKey: keyof typeof char }[] = [
    { viewType: "closeup", label: "近景肖像", color: S.amber,  urlKey: "closeupImageUrl" },
    { viewType: "front",   label: "正视全身", color: S.blue,   urlKey: "frontImageUrl"   },
    { viewType: "side",    label: "侧视全身", color: S.purple, urlKey: "sideImageUrl"    },
    { viewType: "back",    label: "背视全身", color: S.green,  urlKey: "backImageUrl"    },
  ];

  return (
    <div className="p-4 space-y-5" style={S.card}>
      {/* 人物标题 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {char.isMecha
            ? <Bot className="w-4 h-4 flex-shrink-0" style={{ color: S.blue }} />
            : <User className="w-4 h-4 flex-shrink-0" style={{ color: S.amber }} />
          }
          <span className="font-bold text-base" style={{ color: S.text, fontFamily: S.grotesk }}>{char.name}</span>
          {char.isMecha && (
            <Badge className="text-xs px-1.5 py-0" style={{ background: "oklch(0.55 0.18 240 / 0.15)", border: "1px solid oklch(0.55 0.18 240 / 0.4)", color: S.blue }}>机甲</Badge>
          )}
          {!char.isMecha && (
            <button
              onClick={() => updateCharacter(char.id, { isQVersion: !isQVersion })}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all"
              style={{
                background: isQVersion ? "oklch(0.65 0.18 320 / 0.15)" : "oklch(0.22 0.006 240)",
                border: `1px solid ${isQVersion ? "oklch(0.65 0.18 320 / 0.4)" : "oklch(0.30 0.008 240)"}`,
                color: isQVersion ? "oklch(0.75 0.18 320)" : S.dim,
                fontFamily: S.mono,
              }}
              title="开启后生成 MJ7 提示词时会同时生成 Q 版形象提示词"
            >
              {isQVersion ? "♥ Q版" : "□ Q版"}
            </button>
          )}
          {char.role && (
            <Badge className="text-xs px-1.5 py-0" style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.30 0.008 240)", color: S.dim }}>{char.role}</Badge>
          )}
          {char.assetLibId && (
            <Badge className="text-xs px-1.5 py-0" style={{ background: "oklch(0.65 0.2 145 / 0.15)", border: "1px solid oklch(0.65 0.2 145 / 0.4)", color: S.green }}>
              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />已入库
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={handleImport} disabled={importing}
          style={{ background: "oklch(0.65 0.2 145 / 0.12)", border: "1px solid oklch(0.65 0.2 145 / 0.35)", color: S.green, flexShrink: 0 }}>
          {importing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Library className="w-3 h-3 mr-1" />}
          导入资产库
        </Button>
      </div>

      {/* 人物基础信息 */}
      {(char.appearance || char.costume || char.marks) && (
        <div className="grid grid-cols-1 gap-1.5 text-xs p-3 rounded" style={S.innerCard}>
          {char.appearance && (
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-8" style={{ color: S.dim, fontFamily: S.mono }}>外貌</span>
              <span style={{ color: S.sub }}>{char.appearance}</span>
            </div>
          )}
          {char.costume && (
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-8" style={{ color: S.dim, fontFamily: S.mono }}>服装</span>
              <span style={{ color: S.sub }}>{char.costume}</span>
            </div>
          )}
          {char.marks && (
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-8" style={{ color: S.dim, fontFamily: S.mono }}>标记</span>
              <span style={{ color: S.sub }}>{char.marks}</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 1: MJ7 提示词 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.3)", color: S.amber, fontFamily: S.mono }}>STEP 1</span>
            <span className="text-xs font-semibold" style={{ color: S.amber, fontFamily: S.grotesk }}>MJ7 提示词</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleGenerateMJ} disabled={generatingMJ}
              style={{ background: "oklch(0.75 0.17 65 / 0.12)", border: "1px solid oklch(0.75 0.17 65 / 0.35)", color: S.amber }}>
              {generatingMJ ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />生成中</> : <><Wand2 className="w-3 h-3 mr-1" />{char.promptZh ? "重新生成" : "AI 生成"}</>}
            </Button>
            <AIEstimateHint isLoading={generatingMJ} min={GEMINI_ESTIMATE_SECS.generateCharacter.min} max={GEMINI_ESTIMATE_SECS.generateCharacter.max} />
          </div>
        </div>
        {char.promptZh && char.promptEn ? (
          <div className="space-y-2">
            <div className="p-3 rounded text-xs leading-relaxed" style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.22 0.006 240)", color: "oklch(0.75 0.008 240)", fontFamily: S.mono, whiteSpace: "pre-wrap" }}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span style={{ color: S.dim }}>ZH</span>
                <CopyButton text={char.promptZh} />
              </div>
              {char.promptZh}
            </div>
            <div className="p-3 rounded text-xs leading-relaxed" style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.22 0.006 240)", color: "oklch(0.70 0.008 240)", fontFamily: S.mono, whiteSpace: "pre-wrap" }}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span style={{ color: S.dim }}>EN</span>
                <CopyButton text={char.promptEn} />
              </div>
              {char.promptEn}
            </div>
            {/* Q 版形象提示词 */}
            {isQVersion && (char.qVersionPromptZh || char.qVersionPromptEn) && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.65 0.18 320 / 0.15)", border: "1px solid oklch(0.65 0.18 320 / 0.3)", color: "oklch(0.75 0.18 320)", fontFamily: S.mono }}>♥ Q版形象</span>
                  <span className="text-[10px]" style={{ color: S.dim }}>大头小身可爱风格提示词</span>
                </div>
                {char.qVersionPromptZh && (
                  <div className="p-3 rounded text-xs leading-relaxed" style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.65 0.18 320 / 0.25)", color: "oklch(0.75 0.008 240)", fontFamily: S.mono, whiteSpace: "pre-wrap" }}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span style={{ color: "oklch(0.65 0.18 320 / 0.7)" }}>ZH</span>
                      <CopyButton text={char.qVersionPromptZh} />
                    </div>
                    {char.qVersionPromptZh}
                  </div>
                )}
                {char.qVersionPromptEn && (
                  <div className="p-3 rounded text-xs leading-relaxed" style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.65 0.18 320 / 0.25)", color: "oklch(0.70 0.008 240)", fontFamily: S.mono, whiteSpace: "pre-wrap" }}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span style={{ color: "oklch(0.65 0.18 320 / 0.7)" }}>EN</span>
                      <CopyButton text={char.qVersionPromptEn} />
                    </div>
                    {char.qVersionPromptEn}
                  </div>
                )}
              </div>
            )}
            {isQVersion && !char.qVersionPromptZh && !char.qVersionPromptEn && (
              <div className="p-2 rounded text-[10px] text-center" style={{ background: "oklch(0.65 0.18 320 / 0.05)", border: "1px dashed oklch(0.65 0.18 320 / 0.25)", color: "oklch(0.65 0.18 320 / 0.7)" }}>
                已开启 Q 版形象，点击「AI 生成」将同时生成 Q 版提示词
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 rounded text-xs text-center" style={{ background: "oklch(0.10 0.004 240)", border: "1px dashed oklch(0.28 0.008 240)", color: S.dim }}>
            点击「AI 生成」，Gemini AI 将基于角色信息生成专属 MJ7 提示词
          </div>
        )}
      </div>

      {/* STEP 2: 上传 MJ 参考图 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.55 0.18 290 / 0.15)", border: "1px solid oklch(0.55 0.18 290 / 0.3)", color: S.purple, fontFamily: S.mono }}>STEP 2</span>
          <span className="text-xs font-semibold" style={{ color: S.purple, fontFamily: S.grotesk }}>上传 MJ 参考图</span>
        </div>
        <div>
          <p className="text-[10px] mb-1.5" style={{ color: S.dim }}>将 MJ7 生成的参考图上传（支持 JPG/PNG/WEBP，最大 16MB）</p>
          <ImageUploadZone
            imageUrl={char.uploadedImageUrl}
            onUpload={handleUpload}
            uploading={uploading}
          />
        </div>
      </div>

      {/* STEP 3: 分别生成4张9:16视角图 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.60 0.18 240 / 0.15)", border: "1px solid oklch(0.60 0.18 240 / 0.3)", color: S.blue, fontFamily: S.mono }}>STEP 3</span>
            <span className="text-xs font-semibold" style={{ color: S.blue, fontFamily: S.grotesk }}>分别生成4张视角图（9:16 竖版）</span>
            {anyViewDone && (
              <span className="text-[10px]" style={{ color: S.dim, fontFamily: S.mono }}>
                {[char.closeupImageUrl, char.frontImageUrl, char.sideImageUrl, char.backImageUrl].filter(Boolean).length}/4 已完成
              </span>
            )}
          </div>
          <Button size="sm"
            onClick={handleGenerateAllViews}
            disabled={generatingAllViews || !char.uploadedImageUrl || Object.values(generatingView).some(Boolean)}
            style={{ background: "oklch(0.60 0.18 240 / 0.12)", border: "1px solid oklch(0.60 0.18 240 / 0.35)", color: S.blue, flexShrink: 0 }}>
            {generatingAllViews
              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />生成中…</>
              : <><Wand2 className="w-3 h-3 mr-1" />一键生成4张</>
            }
          </Button>
        </div>

        {!char.uploadedImageUrl && (
          <div className="p-3 rounded text-xs text-center" style={{ background: "oklch(0.10 0.004 240)", border: "1px dashed oklch(0.28 0.008 240)", color: S.dim }}>
            请先完成 STEP 2 上传 MJ 参考图
          </div>
        )}

        {/* 4张视角图并排展示 */}
        <div className="grid grid-cols-4 gap-3">
          {viewConfigs.map(({ viewType, label, color, urlKey }) => (
            <ViewPanel
              key={viewType}
              viewType={viewType}
              label={label}
              color={color}
              imageUrl={char[urlKey] as string | null | undefined}
              loading={!!generatingView[viewType]}
              disabled={!char.uploadedImageUrl}
              onGenerate={() => handleGenerateView(viewType)}
              onDownload={handleDownload}
            />
          ))}
        </div>

        {char.uploadedImageUrl && (
          <p className="text-[10px]" style={{ color: S.dim }}>
            每张图单独生成，可以重新生成不满意的视角。每张消耗 5 积分。
          </p>
        )}
      </div>

      {/* STEP 4: 拼合成16:9设计主图 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.65 0.2 145 / 0.15)", border: "1px solid oklch(0.65 0.2 145 / 0.3)", color: S.green, fontFamily: S.mono }}>STEP 4</span>
            <span className="text-xs font-semibold" style={{ color: S.green, fontFamily: S.grotesk }}>拼合成16:9角色设计主图</span>
          </div>
          <Button size="sm"
            onClick={handleMerge}
            disabled={merging || !allViewsDone}
            style={{
              background: designImage ? "oklch(0.55 0.18 290 / 0.12)" : "oklch(0.65 0.2 145 / 0.12)",
              border: `1px solid ${designImage ? "oklch(0.55 0.18 290 / 0.4)" : "oklch(0.65 0.2 145 / 0.35)"}`,
              color: designImage ? S.purple : S.green,
              opacity: allViewsDone ? 1 : 0.5,
            }}>
            {merging
              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />拼合中</>
              : designImage
                ? <><RefreshCw className="w-3 h-3 mr-1" />重新拼合</>
                : <><Merge className="w-3 h-3 mr-1" />拼合4图为16:9</>
            }
          </Button>
        </div>

        {!allViewsDone && (
          <p className="text-[10px]" style={{ color: S.dim }}>
            需先完成全部4张视角图的生成，才能拼合
          </p>
        )}

        {/* 合图展示 */}
        {designImage ? (
          <div className="space-y-2">
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid oklch(0.25 0.008 240)", background: "oklch(0.08 0.003 240)" }}>
              <img src={designImage} alt="角色设计主图（16:9）" className="w-full h-auto block" />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload(designImage, `${char.name}-角色设计主图-16x9.png`)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all hover:opacity-80"
                style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: S.sub, fontFamily: S.mono }}>
                <Download className="w-2.5 h-2.5" />下载16:9合图
              </button>
              <span className="text-[10px]" style={{ color: S.dim }}>
                布局：近景肖像 | 正视全身 | 侧视全身 | 背视全身（程序拼合，比例精确）
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded text-center" style={{ background: "oklch(0.10 0.004 240)", border: "1px dashed oklch(0.28 0.008 240)" }}>
            <ImageIcon className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.30 0.006 240)" }} />
            <p className="text-xs" style={{ color: S.dim }}>
              {allViewsDone
                ? "4张视角图已就绪，点击「拼合4图为16:9」生成角色设计主图"
                : "完成4张视角图后，系统将自动拼合为16:9横版角色设计主图"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Phase2 Main ──────────────────────────────────────────────────────────────
export default function Phase2() {
  const { characters, markPhaseComplete, setActivePhase, projectInfo, updateCharacter } = useProject();
  const [generatingAll, setGeneratingAll] = useState(false);

  const generateMJMutation = trpc.ai.generateCharacterPrompt.useMutation();

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    for (const char of characters) {
      try {
        const result = await generateMJMutation.mutateAsync({
          name: char.name,
          role: char.role || "角色",
          isMecha: char.isMecha ?? false,
          appearance: char.appearance || char.name,
          costume: char.costume || "",
          marks: char.marks || "",
          styleZh: projectInfo.styleZh,
          styleEn: projectInfo.styleEn,
        });
        updateCharacter(char.id, { promptZh: result.zh, promptEn: result.en });
      } catch {
        // continue
      }
    }
    setGeneratingAll(false);
    toast.success("全部人物 MJ7 提示词生成完成");
  };

  const handleComplete = () => {
    markPhaseComplete("phase2");
    setActivePhase("phase2b");
  };

  return (
    <div className="space-y-8">
      {/* Phase header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded flex items-center justify-center text-lg font-bold"
          style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.4)", color: S.amber, fontFamily: S.mono }}>02</div>
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: S.text, fontFamily: S.grotesk }}>人物资产</h2>
          <p className="text-sm" style={{ color: S.sub }}>MJ7 提示词 → 上传参考图 → 分别生成4张9:16视角图 → 程序拼合为16:9设计主图</p>
        </div>
      </div>

      {/* 工作流说明 */}
      <div className="p-4 rounded" style={{ background: "oklch(0.13 0.005 240)", border: "1px solid oklch(0.20 0.006 240)" }}>
        <div className="flex flex-wrap gap-4 text-xs" style={{ color: S.dim }}>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "oklch(0.75 0.17 65 / 0.15)", color: S.amber, fontFamily: S.mono }}>STEP 1</span>
            AI 生成 MJ7 提示词 → 复制到 Midjourney
          </div>
          <span style={{ color: "oklch(0.30 0.006 240)" }}>→</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "oklch(0.55 0.18 290 / 0.15)", color: S.purple, fontFamily: S.mono }}>STEP 2</span>
            上传 MJ 参考图
          </div>
          <span style={{ color: "oklch(0.30 0.006 240)" }}>→</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "oklch(0.60 0.18 240 / 0.15)", color: S.blue, fontFamily: S.mono }}>STEP 3</span>
            分别生成4张9:16视角图（近景/正视/侧视/背视）
          </div>
          <span style={{ color: "oklch(0.30 0.006 240)" }}>→</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "oklch(0.65 0.2 145 / 0.15)", color: S.green, fontFamily: S.mono }}>STEP 4</span>
            程序拼合为16:9横版设计主图
          </div>
          <span style={{ color: "oklch(0.30 0.006 240)" }}>→</span>
          <div className="flex items-center gap-1.5">
            <Library className="w-3 h-3" style={{ color: S.green }} />
            导入资产库
          </div>
        </div>
      </div>

      {/* 一键生成全部 MJ7 提示词 */}
      {characters.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleGenerateAll} disabled={generatingAll}
            style={{ background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.4)", color: S.amber }}>
            {generatingAll ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />生成中...</> : <><Wand2 className="w-3 h-3 mr-1" />一键生成全部 MJ7 提示词</>}
          </Button>
        </div>
      )}

      {/* 人物列表 */}
      {characters.length === 0 ? (
        <div className="p-8 text-center rounded" style={S.card}>
          <p className="text-sm" style={{ color: S.dim }}>请先在阶段一完成剧本解析，系统将自动提取人物信息</p>
        </div>
      ) : (
        <div className="space-y-6">
          {characters.map(char => (
            <CharacterCard key={char.id} char={char} />
          ))}
        </div>
      )}

      {/* Complete button */}
      <div className="flex justify-end pt-4 border-t" style={{ borderColor: "oklch(0.22 0.006 240)" }}>
        <Button onClick={handleComplete} className="gap-2"
          style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.10 0.005 240)", fontWeight: 700 }}>
          人物资产完成，进入场景道具
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
