// Phase2: 人物资产
// 工作流：① AI 生成 MJ7 提示词 → ② 上传 MJ 参考图 + Nano 提示词 → ③ 生成16:9角色设计主图 → ④ 一键切分4张（近景/正视/侧视/后视）→ ⑤ 导入资产库
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronRight, Wand2, Copy, Check, Loader2, Upload, ImageIcon,
  Download, Library, RefreshCw, Scissors, CheckCircle2, Bot, User
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

// ─── CharacterCard ────────────────────────────────────────────────────────────
function CharacterCard({ char }: { char: ReturnType<typeof useProject>["characters"][0] }) {
  const { projectInfo, updateCharacter } = useProject();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [uploading, setUploading] = useState(false);
  const [generatingMJ, setGeneratingMJ] = useState(false);
  const [generatingDesign, setGeneratingDesign] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [importing, setImporting] = useState(false);

  const generateMJMutation = trpc.ai.generateCharacterPrompt.useMutation();
  const createAssetMutation = trpc.assets.create.useMutation();
  const uploadMutation = trpc.assets.uploadImage.useMutation();
  const generateDesignMutation = trpc.assets.generateCharacterDesign.useMutation();
  const splitDesignMutation = trpc.assets.splitCharacterDesign.useMutation();

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

  // 上传 MJ 参考图（上传成功后自动触发生成主图）
  const handleUpload = async (base64: string, mimeType: string) => {
    if (!isAuthenticated) { toast.error("请先登录后再上传图片"); return; }
    setUploading(true);
    try {
      const assetId = await getOrCreateAssetId();
      const result = await uploadMutation.mutateAsync({ id: assetId, imageBase64: base64, mimeType });
      updateCharacter(char.id, { uploadedImageUrl: result.uploadedImageUrl });
      utils.assets.list.invalidate();
      toast.success("参考图已上传，正在自动生成角色设计主图...");
      // 自动触发生成主图
      await handleGenerateDesign(result.uploadedImageUrl);
    } catch (err) {
      toast.error(`上传失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setUploading(false);
    }
  };

  // 生成 16:9 角色设计主图
  const handleGenerateDesign = async (uploadedUrl?: string) => {
    const imageUrl = uploadedUrl || char.uploadedImageUrl;
    if (!imageUrl) { toast.error("请先上传 MJ 参考图"); return; }
    if (!isAuthenticated) { toast.error("请先登录后再生成图片"); return; }
    setGeneratingDesign(true);
    try {
      const assetId = await getOrCreateAssetId();
      const result = await generateDesignMutation.mutateAsync({
        id: assetId,
        nanoPrompt: char.nanoPrompt || undefined,
      });
      updateCharacter(char.id, { designImageUrl: result.imageUrl, mainImageUrl: result.imageUrl });
      utils.assets.list.invalidate();
      toast.success("角色设计主图生成完成！");
    } catch (err) {
      toast.error(`生成失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setGeneratingDesign(false);
    }
  };

  // 一键切分 4 张图
  const handleSplit = async () => {
    const designImg = char.designImageUrl || char.mainImageUrl;
    if (!designImg) { toast.error("请先生成角色设计主图"); return; }
    if (!isAuthenticated) { toast.error("请先登录后再切分图片"); return; }
    setSplitting(true);
    try {
      const assetId = await getOrCreateAssetId();
      const result = await splitDesignMutation.mutateAsync({ id: assetId });
      const urls = result.splitUrls as Record<string, string>;
      updateCharacter(char.id, {
        closeupImageUrl: urls.closeup,
        frontImageUrl: urls.front,
        sideImageUrl: urls.side,
        backImageUrl: urls.back,
      });
      utils.assets.list.invalidate();
      toast.success("已成功切分为 4 张视图");
    } catch (err) {
      toast.error(`切分失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setSplitting(false);
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
  const hasSplitImages = char.closeupImageUrl || char.frontImageUrl || char.sideImageUrl || char.backImageUrl;

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

      {/* STEP 2: 上传 MJ 参考图 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.55 0.18 290 / 0.15)", border: "1px solid oklch(0.55 0.18 290 / 0.3)", color: S.purple, fontFamily: S.mono }}>STEP 2</span>
          <span className="text-xs font-semibold" style={{ color: S.purple, fontFamily: S.grotesk }}>上传 MJ 参考图（上传后一键生成）</span>
        </div>
        <div>
          <p className="text-[10px] mb-1.5" style={{ color: S.dim }}>MJ 参考图（用 MJ7 生成后上传，NBP 提示词已预设）</p>
          <ImageUploadZone
            imageUrl={char.uploadedImageUrl}
            onUpload={handleUpload}
            uploading={uploading}
          />
        </div>
      </div>

      {/* STEP 3: 生成 16:9 角色设计主图 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.60 0.18 240 / 0.15)", border: "1px solid oklch(0.60 0.18 240 / 0.3)", color: S.blue, fontFamily: S.mono }}>STEP 3</span>
            <span className="text-xs font-semibold" style={{ color: S.blue, fontFamily: S.grotesk }}>生成角色设计主图（16:9）</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm"
              onClick={() => handleGenerateDesign()}
              disabled={generatingDesign || !char.uploadedImageUrl}
              style={{
                background: designImage ? "oklch(0.55 0.18 290 / 0.12)" : "oklch(0.60 0.18 240 / 0.12)",
                border: `1px solid ${designImage ? "oklch(0.55 0.18 290 / 0.4)" : "oklch(0.60 0.18 240 / 0.35)"}`,
                color: designImage ? S.purple : S.blue,
              }}>
              {generatingDesign
                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />生成中</>
                : designImage
                  ? <><RefreshCw className="w-3 h-3 mr-1" />重新生成</>
                  : <><Wand2 className="w-3 h-3 mr-1" />生成主图 (20积分)</>
              }
            </Button>
          </div>
        </div>

        {/* 主图展示 */}
        {designImage ? (
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid oklch(0.25 0.008 240)" }}>
              <img src={designImage} alt="角色设计主图" className="w-full object-contain" style={{ maxHeight: 320 }} />
            </div>
            <div className="flex items-center gap-2">
              <a href={designImage} download target="_blank" rel="noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                style={{ background: "oklch(0.22 0.006 240)", border: "1px solid oklch(0.28 0.008 240)", color: S.sub, fontFamily: S.mono }}>
                <Download className="w-2.5 h-2.5" />下载主图
              </a>
              <span className="text-[10px]" style={{ color: S.dim }}>
                布局：左1/3 近景 | 右2/3 正面·侧面·背面三视图
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded text-center" style={{ background: "oklch(0.10 0.004 240)", border: "1px dashed oklch(0.28 0.008 240)" }}>
            <ImageIcon className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.30 0.006 240)" }} />
            <p className="text-xs" style={{ color: S.dim }}>
              {char.uploadedImageUrl
                ? "点击「生成主图」，Nano Banana Pro 将生成含近景+三视图的16:9角色设计图"
                : "请先上传 MJ 参考图"}
            </p>
          </div>
        )}
      </div>

      {/* STEP 4: 一键切分 4 张图 */}
      {designImage && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.65 0.2 145 / 0.15)", border: "1px solid oklch(0.65 0.2 145 / 0.3)", color: S.green, fontFamily: S.mono }}>STEP 4</span>
              <span className="text-xs font-semibold" style={{ color: S.green, fontFamily: S.grotesk }}>一键切分 4 张视图</span>
            </div>
            <Button size="sm"
              onClick={handleSplit}
              disabled={splitting}
              style={{
                background: hasSplitImages ? "oklch(0.55 0.18 290 / 0.12)" : "oklch(0.65 0.2 145 / 0.12)",
                border: `1px solid ${hasSplitImages ? "oklch(0.55 0.18 290 / 0.4)" : "oklch(0.65 0.2 145 / 0.35)"}`,
                color: hasSplitImages ? S.purple : S.green,
              }}>
              {splitting
                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />切分中</>
                : hasSplitImages
                  ? <><RefreshCw className="w-3 h-3 mr-1" />重新切分</>
                  : <><Scissors className="w-3 h-3 mr-1" />切分 4 张 (2积分)</>
              }
            </Button>
          </div>

          {/* 切分后的 4 张图 */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: "closeupImageUrl" as const, label: "近景" },
              { key: "frontImageUrl" as const, label: "正视图" },
              { key: "sideImageUrl" as const, label: "侧视图" },
              { key: "backImageUrl" as const, label: "后视图" },
            ].map(({ key, label }) => {
              const url = char[key];
              return (
                <div key={key} className="space-y-1">
                  <div className="rounded overflow-hidden"
                    style={{ background: "oklch(0.10 0.004 240)", border: "1px solid oklch(0.22 0.006 240)", aspectRatio: "3/4" }}>
                    {url
                      ? <img src={url} alt={label} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-4 h-4" style={{ color: "oklch(0.30 0.006 240)" }} />
                      </div>
                    }
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: S.dim }}>{label}</span>
                    {url && (
                      <a href={url} download target="_blank" rel="noreferrer"
                        className="hover:opacity-80" style={{ color: "oklch(0.45 0.01 240)" }}>
                        <Download className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
          <p className="text-sm" style={{ color: S.sub }}>MJ7 提示词 → 上传参考图 → Nano Banana Pro 生成16:9角色设计主图 → 一键切分近景/正视/侧视/后视图</p>
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
            上传 MJ 参考图 + 填写 Nano 辅助提示词
          </div>
          <span style={{ color: "oklch(0.30 0.006 240)" }}>→</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "oklch(0.60 0.18 240 / 0.15)", color: S.blue, fontFamily: S.mono }}>STEP 3</span>
            Nano 生成16:9角色设计主图（近景+三视图）
          </div>
          <span style={{ color: "oklch(0.30 0.006 240)" }}>→</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "oklch(0.65 0.2 145 / 0.15)", color: S.green, fontFamily: S.mono }}>STEP 4</span>
            一键切分 4 张视图
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
