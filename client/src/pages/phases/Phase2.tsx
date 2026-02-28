// Phase2: 人物与机甲资产
// 工作流：① AI 生成 MJ7 提示词 → ② 用 MJ7 生成图后上传 → ③ 填写 Nano 辅助提示词 → ④ 生成主视图/三视图 → ⑤ 导入资产库
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, ChevronRight, Wand2, Copy, Check, Bot, User,
  Loader2, Upload, ImageIcon, Download, Library, RefreshCw
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

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
          {generating ? "生成中" : url ? "重新生成" : "生成"}
        </button>
      </div>
      <div className="rounded overflow-hidden" style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.20 0.006 240)", minHeight: "100px" }}>
        {url
          ? <img src={url} alt={label} className="w-full object-contain" style={{ maxHeight: "160px" }} />
          : <div className="flex items-center justify-center" style={{ minHeight: "100px" }}>
            <ImageIcon className="w-5 h-5" style={{ color: "oklch(0.30 0.006 240)" }} />
          </div>
        }
      </div>
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
  const [generatingMain, setGeneratingMain] = useState(false);
  const [generatingViews, setGeneratingViews] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);

  const generateMJMutation = trpc.ai.generateCharacterPrompt.useMutation();
  const createAssetMutation = trpc.assets.create.useMutation();
  const uploadMutation = trpc.assets.uploadImage.useMutation();
  const generateMainMutation = trpc.assets.generateMain.useMutation();
  const generateMultiMutation = trpc.assets.generateMultiView.useMutation();

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
        appearance: char.appearance || char.name,
        costume: char.costume || "",
        marks: char.marks || "",
        styleZh: projectInfo.styleZh,
        styleEn: projectInfo.styleEn,
      });
      updateCharacter(char.id, { promptZh: result.zh, promptEn: result.en });
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
      toast.success("参考图已上传");
    } catch (err) {
      toast.error(`上传失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setUploading(false);
    }
  };

  // 生成主视图
  const handleGenerateMain = async () => {
    if (!char.uploadedImageUrl) { toast.error("请先上传 MJ 参考图"); return; }
    if (!isAuthenticated) { toast.error("请先登录后再生成图片"); return; }
    setGeneratingMain(true);
    try {
      const assetId = await getOrCreateAssetId();
      // 同步 nanoPrompt 到资产库
      if (char.nanoPrompt) {
        await createAssetMutation.mutateAsync({ type: "character", name: char.name, description: char.appearance || "", mainPrompt: char.nanoPrompt }).catch(() => {});
      }
      const result = await generateMainMutation.mutateAsync({ id: assetId, prompt: char.nanoPrompt || undefined });
      updateCharacter(char.id, { mainImageUrl: result.imageUrl });
      utils.assets.list.invalidate();
      toast.success("主视图生成完成！");
    } catch (err) {
      toast.error(`生成失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setGeneratingMain(false);
    }
  };

  // 生成单个视角图
  const handleGenerateView = async (viewType: "front" | "side" | "back") => {
    if (!char.uploadedImageUrl) { toast.error("请先上传 MJ 参考图"); return; }
    if (!isAuthenticated) { toast.error("请先登录后再生成图片"); return; }
    setGeneratingViews(p => ({ ...p, [viewType]: true }));
    try {
      const assetId = await getOrCreateAssetId();
      const result = await generateMultiMutation.mutateAsync({ id: assetId, viewType, prompt: char.nanoPrompt || undefined });
      const urlKey = viewType === "front" ? "frontImageUrl" : viewType === "side" ? "sideImageUrl" : "backImageUrl";
      updateCharacter(char.id, { [urlKey]: result.imageUrl });
      utils.assets.list.invalidate();
      toast.success(`${viewType === "front" ? "正面" : viewType === "side" ? "侧面" : "背面"}视图生成完成`);
    } catch (err) {
      toast.error(`生成失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setGeneratingViews(p => ({ ...p, [viewType]: false }));
    }
  };

  // 导入资产库（确保资产库已有最新数据）
  const handleImport = async () => {
    if (!isAuthenticated) { toast.error("请先登录后再导入资产库"); return; }
    setImporting(true);
    try {
      const assetId = await getOrCreateAssetId();
      // 更新资产库中的提示词
      await createAssetMutation.mutateAsync({
        type: "character",
        name: char.name,
        description: char.appearance || char.name,
        mjPrompt: char.promptEn || undefined,
        mainPrompt: char.nanoPrompt || undefined,
      }).catch(() => {});
      utils.assets.list.invalidate();
      toast.success(`${char.name} 已导入资产库（ID: ${assetId}）`);
    } catch (err) {
      toast.error(`导入失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setImporting(false);
    }
  };

  const hasImages = char.mainImageUrl || char.frontImageUrl || char.sideImageUrl || char.backImageUrl;

  return (
    <div className="p-4 space-y-4" style={S.card}>
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
          <Button size="sm" onClick={handleGenerateMJ} disabled={generatingMJ}
            style={{ background: "oklch(0.75 0.17 65 / 0.12)", border: "1px solid oklch(0.75 0.17 65 / 0.35)", color: S.amber }}>
            {generatingMJ ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />生成中</> : <><Wand2 className="w-3 h-3 mr-1" />{char.promptZh ? "重新生成" : "AI 生成"}</>}
          </Button>
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
          </div>
        ) : (
          <div className="p-3 rounded text-xs text-center" style={{ background: "oklch(0.10 0.004 240)", border: "1px dashed oklch(0.28 0.008 240)", color: S.dim }}>
            点击「AI 生成」，Gemini AI 将基于角色信息生成专属 MJ7 提示词
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
            <ImageUploadZone
              imageUrl={char.uploadedImageUrl}
              onUpload={handleUpload}
              uploading={uploading}
            />
          </div>
          <div>
            <p className="text-[10px] mb-1.5" style={{ color: S.dim }}>Nano 辅助提示词（可选，留空使用默认）</p>
            <Textarea
              value={char.nanoPrompt || ""}
              onChange={e => updateCharacter(char.id, { nanoPrompt: e.target.value })}
              placeholder={`输入 Nano Banana Pro 辅助提示词...\n例如：character, front view, full body, maintain exact same style`}
              rows={5}
              className="text-xs resize-none"
              style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.28 0.008 240)", color: "oklch(0.85 0.005 60)", fontFamily: S.mono }}
            />
          </div>
        </div>
      </div>

      {/* STEP 3: 生成主视图 + 三视图 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.60 0.18 240 / 0.15)", border: "1px solid oklch(0.60 0.18 240 / 0.3)", color: S.blue, fontFamily: S.mono }}>STEP 3</span>
            <span className="text-xs font-semibold" style={{ color: S.blue, fontFamily: S.grotesk }}>Nano Banana Pro 生成视图</span>
          </div>
          {!char.uploadedImageUrl && (
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
                disabled={generatingMain || !char.uploadedImageUrl}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all disabled:opacity-40"
                style={{
                  background: char.mainImageUrl ? "oklch(0.55 0.18 290 / 0.12)" : "oklch(0.65 0.2 145 / 0.12)",
                  border: `1px solid ${char.mainImageUrl ? "oklch(0.55 0.18 290 / 0.4)" : "oklch(0.65 0.2 145 / 0.35)"}`,
                  color: char.mainImageUrl ? S.purple : S.green,
                  fontFamily: S.mono,
                }}>
                {generatingMain ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : char.mainImageUrl ? <RefreshCw className="w-2.5 h-2.5" /> : <Wand2 className="w-2.5 h-2.5" />}
                {generatingMain ? "生成中" : char.mainImageUrl ? "重新生成" : "生成 (10积分)"}
              </button>
            </div>
            <div className="rounded overflow-hidden" style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.20 0.006 240)", minHeight: "120px" }}>
              {char.mainImageUrl
                ? <img src={char.mainImageUrl} alt="主视图" className="w-full object-contain" style={{ maxHeight: "180px" }} />
                : <div className="flex items-center justify-center" style={{ minHeight: "120px" }}>
                  <ImageIcon className="w-5 h-5" style={{ color: "oklch(0.30 0.006 240)" }} />
                </div>
              }
            </div>
          </div>

          {/* 三视图区域 */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: "frontImageUrl", viewType: "front" as const, label: "正面" },
              { key: "sideImageUrl", viewType: "side" as const, label: "侧面" },
              { key: "backImageUrl", viewType: "back" as const, label: "背面" },
            ] as const).map(({ key, viewType, label }) => (
              <ViewImage
                key={viewType}
                url={char[key]}
                label={label}
                onGenerate={() => handleGenerateView(viewType)}
                generating={!!generatingViews[viewType]}
                disabled={!char.uploadedImageUrl}
              />
            ))}
          </div>
        </div>

        {/* 下载已生成的图片 */}
        {hasImages && (
          <div className="flex flex-wrap gap-2 pt-1">
            {char.mainImageUrl && (
              <a href={char.mainImageUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: S.sub, fontFamily: S.mono }}>
                <Download className="w-2.5 h-2.5" />主视图
              </a>
            )}
            {char.frontImageUrl && (
              <a href={char.frontImageUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: S.sub, fontFamily: S.mono }}>
                <Download className="w-2.5 h-2.5" />正面
              </a>
            )}
            {char.sideImageUrl && (
              <a href={char.sideImageUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: S.sub, fontFamily: S.mono }}>
                <Download className="w-2.5 h-2.5" />侧面
              </a>
            )}
            {char.backImageUrl && (
              <a href={char.backImageUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: S.sub, fontFamily: S.mono }}>
                <Download className="w-2.5 h-2.5" />背面
              </a>
            )}
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
          <h2 className="text-xl font-bold mb-1" style={{ color: S.text, fontFamily: S.grotesk }}>人物与机甲资产</h2>
          <p className="text-sm" style={{ color: S.sub }}>MJ7 提示词 → 上传参考图 → Nano Banana Pro 生成三视图 → 导入资产库</p>
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
            Nano Banana Pro 生成主视图 + 三视图
          </div>
          <span style={{ color: "oklch(0.30 0.006 240)" }}>→</span>
          <div className="flex items-center gap-1.5">
            <Library className="w-3 h-3" style={{ color: S.green }} />
            导入资产库统一管理
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
