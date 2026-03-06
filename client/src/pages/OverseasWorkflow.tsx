// DESIGN: 出海真人短剧图生视频工作流 — 工业风暗色系（与鎏光机主工作流一致）
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Film, Plus, Trash2, ChevronRight, ChevronDown, ChevronUp,
  Wand2, ImageIcon, Video, Upload, Edit3, Check, X,
  Loader2, Globe, Clapperboard, ArrowLeft, RefreshCw,
  Copy, Download, Play, AlertCircle, Sparkles,
  Users, MapPin, Package, Layers, FileSpreadsheet, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// ─── 类型 ──────────────────────────────────────────────────────────────────────

type OverseasProject = {
  id: number;
  name: string;
  market: string;
  aspectRatio: "landscape" | "portrait";
  style: "realistic" | "animation" | "cg";
  genre: string;
  totalEpisodes: number | null;
  status: "draft" | "in_progress" | "completed";
  characters: string | null;
  scenes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type OverseasAsset = {
  id: number;
  projectId: number;
  userId: number;
  type: "character" | "scene" | "prop";
  name: string;
  description: string | null;
  mjPrompt: string | null;
  nbpPrompt: string | null;
  mjImageUrl: string | null;
  mainImageUrl: string | null;
  viewFrontUrl: string | null;
  viewSideUrl: string | null;
  viewBackUrl: string | null;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ScriptShot = {
  id: number;
  projectId: number;
  episodeNumber: number;
  shotNumber: number;
  sceneName: string | null;
  shotType: string | null;
  visualDescription: string | null;
  dialogue: string | null;
  characters: string | null;
  emotion: string | null;
  firstFrameUrl: string | null;
  lastFrameUrl: string | null;
  firstFramePrompt: string | null;
  lastFramePrompt: string | null;
  videoUrl: string | null;
  videoPrompt: string | null;
  videoEngine: "seedance_1_5" | "veo_3_1" | null;
  videoDuration: number | null;
  status: "draft" | "generating_frame" | "frame_done" | "generating_video" | "done" | "failed";
  errorMessage: string | null;
};

// ─── 颜色常量 ──────────────────────────────────────────────────────────────────
const C = {
  bg: "oklch(0.11 0.005 240)",
  surface: "oklch(0.14 0.006 240)",
  border: "oklch(0.22 0.006 240)",
  amber: "oklch(0.75 0.17 65)",
  text: "oklch(0.88 0.005 60)",
  muted: "oklch(0.55 0.01 240)",
  green: "oklch(0.70 0.18 145)",
  red: "oklch(0.65 0.22 25)",
  blue: "oklch(0.65 0.15 240)",
};

const MARKET_OPTIONS = [
  { value: "us", label: "🇺🇸 美国" },
  { value: "uk", label: "🇬🇧 英国" },
  { value: "au", label: "🇦🇺 澳大利亚" },
  { value: "ca", label: "🇨🇦 加拿大" },
  { value: "in", label: "🇮🇳 印度" },
  { value: "jp", label: "🇯🇵 日本" },
  { value: "kr", label: "🇰🇷 韩国" },
  { value: "global", label: "🌍 全球" },
];

const GENRE_OPTIONS = [
  { value: "romance", label: "爱情" },
  { value: "revenge", label: "复仇" },
  { value: "scifi", label: "科幻" },
  { value: "fantasy", label: "奇幻" },
  { value: "thriller", label: "悬疑" },
  { value: "action", label: "动作" },
  { value: "comedy", label: "喜剧" },
  { value: "drama", label: "家庭剧情" },
];

const SHOT_STATUS_CONFIG = {
  draft: { label: "待处理", color: C.muted },
  generating_frame: { label: "生成帧中", color: C.amber },
  frame_done: { label: "帧已就绪", color: C.blue },
  generating_video: { label: "生成视频中", color: C.amber },
  done: { label: "完成", color: C.green },
  failed: { label: "失败", color: C.red },
};

// ─── 主组件 ────────────────────────────────────────────────────────────────────

export default function OverseasWorkflow() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [view, setView] = useState<"dashboard" | "project">("dashboard");
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<number>(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <Loader2 className="animate-spin w-8 h-8" style={{ color: C.amber }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: C.bg }}>
        <Clapperboard size={48} style={{ color: C.amber }} />
        <h2 className="text-2xl font-bold" style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>
          出海短剧工作流
        </h2>
        <p style={{ color: C.muted }}>请先登录以使用此功能</p>
        <Button onClick={() => (window.location.href = getLoginUrl())} style={{ background: C.amber, color: "oklch(0.1 0.005 240)" }}>
          登录
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text, fontFamily: "'Noto Sans SC', 'Space Grotesk', sans-serif" }}>
      {/* 顶部导航 */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: `${C.surface}`, padding: "0 1.5rem", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {view === "project" && (
            <button onClick={() => setView("dashboard")} style={{ color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
              <ArrowLeft size={14} /> 返回
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Globe size={18} style={{ color: C.amber }} />
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: C.text }}>出海短剧工作流</span>
            <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>IMAGE-TO-VIDEO</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href="/" style={{ fontSize: 12, color: C.muted, textDecoration: "none" }}>← 鎏光机主工作流</a>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {view === "dashboard" ? (
          <motion.div key="dashboard" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <ProjectDashboard
              onOpenProject={(id) => { setActiveProjectId(id); setView("project"); }}
              onCreateNew={() => setShowCreateDialog(true)}
            />
          </motion.div>
        ) : activeProjectId ? (
          <motion.div key="project" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <ProjectWorkspace
              projectId={activeProjectId}
              activeEpisode={activeEpisode}
              onEpisodeChange={setActiveEpisode}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CreateProjectDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} onCreated={(id) => { setActiveProjectId(id); setView("project"); setShowCreateDialog(false); }} />
    </div>
  );
}

// ─── 项目仪表板 ────────────────────────────────────────────────────────────────

function ProjectDashboard({ onOpenProject, onCreateNew }: { onOpenProject: (id: number) => void; onCreateNew: () => void }) {
  const { data: projects, isLoading, refetch } = trpc.overseas.listProjects.useQuery();
  const deleteProject = trpc.overseas.deleteProject.useMutation({ onSuccess: () => refetch() });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: C.text, marginBottom: 4 }}>出海短剧项目</h1>
          <p style={{ fontSize: 13, color: C.muted }}>图生视频工作流 · MJ → Nano Banana Pro → Seedance 1.5 / Veo 3.1</p>
        </div>
        <Button onClick={onCreateNew} style={{ background: C.amber, color: "oklch(0.1 0.005 240)", fontWeight: 700, gap: 6 }}>
          <Plus size={15} /> 新建项目
        </Button>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
          <Loader2 className="animate-spin" style={{ color: C.amber }} />
        </div>
      ) : !projects?.length ? (
        <div style={{ textAlign: "center", padding: "5rem 0", border: `1px dashed ${C.border}`, borderRadius: 16 }}>
          <Globe size={40} style={{ color: C.muted, margin: "0 auto 16px" }} />
          <p style={{ color: C.muted, marginBottom: 20 }}>还没有出海短剧项目</p>
          <Button onClick={onCreateNew} variant="outline" style={{ borderColor: C.amber, color: C.amber }}>
            <Plus size={14} /> 创建第一个项目
          </Button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p as OverseasProject}
              onOpen={() => onOpenProject(p.id)}
              onDelete={() => {
                if (confirm(`确认删除项目「${p.name}」？`)) {
                  deleteProject.mutate({ id: p.id });
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onOpen, onDelete }: { project: OverseasProject; onOpen: () => void; onDelete: () => void }) {
  const marketLabel = MARKET_OPTIONS.find(m => m.value === project.market)?.label || project.market;
  const genreLabel = GENRE_OPTIONS.find(g => g.value === project.genre)?.label || project.genre;

  return (
    <div
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, cursor: "pointer", transition: "border-color 0.2s, transform 0.2s" }}
      onClick={onOpen}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.amber; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: "'Space Grotesk', sans-serif" }}>{project.name}</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, padding: "2px 8px", background: "oklch(0.18 0.006 240)", borderRadius: 4, color: C.muted }}>{marketLabel}</span>
            <span style={{ fontSize: 11, padding: "2px 8px", background: "oklch(0.18 0.006 240)", borderRadius: 4, color: C.muted }}>{genreLabel}</span>
            <span style={{ fontSize: 11, padding: "2px 8px", background: "oklch(0.18 0.006 240)", borderRadius: 4, color: C.muted }}>{project.aspectRatio === "portrait" ? "9:16" : "16:9"}</span>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ color: C.muted, cursor: "pointer", padding: 4, borderRadius: 6, transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = C.red)}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
        <span style={{ fontSize: 12, color: C.muted }}>{project.totalEpisodes} 集</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.amber }}>
          进入工作流 <ChevronRight size={12} />
        </div>
      </div>
    </div>
  );
}

// ─── 创建项目对话框 ────────────────────────────────────────────────────────────

function CreateProjectDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const [form, setForm] = useState({ name: "", market: "us", aspectRatio: "portrait" as "portrait" | "landscape", style: "realistic" as "realistic" | "animation" | "cg", genre: "romance", totalEpisodes: 20 });
  const createProject = trpc.overseas.createProject.useMutation({
    onSuccess: (data) => { toast.success("项目已创建"); onCreated(data.id); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, maxWidth: 480 }}>
        <DialogHeader>
          <DialogTitle style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>新建出海短剧项目</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 0" }}>
          <div>
            <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>剧名</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：无敌教师 / Invincible Teacher" style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>目标市场</label>
              <Select value={form.market} onValueChange={v => setForm(f => ({ ...f, market: v }))}>
                <SelectTrigger style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  {MARKET_OPTIONS.map(m => <SelectItem key={m.value} value={m.value} style={{ color: C.text }}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>题材</label>
              <Select value={form.genre} onValueChange={v => setForm(f => ({ ...f, genre: v }))}>
                <SelectTrigger style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  {GENRE_OPTIONS.map(g => <SelectItem key={g.value} value={g.value} style={{ color: C.text }}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>画幅</label>
              <Select value={form.aspectRatio} onValueChange={v => setForm(f => ({ ...f, aspectRatio: v as "portrait" | "landscape" }))}>
                <SelectTrigger style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <SelectItem value="portrait" style={{ color: C.text }}>竖屏 9:16</SelectItem>
                  <SelectItem value="landscape" style={{ color: C.text }}>横屏 16:9</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>风格</label>
              <Select value={form.style} onValueChange={v => setForm(f => ({ ...f, style: v as "realistic" | "animation" | "cg" }))}>
                <SelectTrigger style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <SelectItem value="realistic" style={{ color: C.text }}>真人写实</SelectItem>
                  <SelectItem value="animation" style={{ color: C.text }}>动画</SelectItem>
                  <SelectItem value="cg" style={{ color: C.text }}>CG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>总集数</label>
              <Input type="number" min={1} max={100} value={form.totalEpisodes} onChange={e => setForm(f => ({ ...f, totalEpisodes: parseInt(e.target.value) || 20 }))} style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text }} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} style={{ borderColor: C.border, color: C.muted }}>取消</Button>
          <Button
            onClick={() => createProject.mutate(form)}
            disabled={!form.name.trim() || createProject.isPending}
            style={{ background: C.amber, color: "oklch(0.1 0.005 240)", fontWeight: 700 }}
          >
            {createProject.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "创建项目"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 项目工作区 ────────────────────────────────────────────────────────────────

function ProjectWorkspace({ projectId, activeEpisode, onEpisodeChange }: { projectId: number; activeEpisode: number; onEpisodeChange: (ep: number) => void }) {
  const { data, isLoading, refetch } = trpc.overseas.getProject.useQuery({ id: projectId });
  const [scriptText, setScriptText] = useState("");
  const [parsingScript, setParsingScript] = useState(false);
  const [expandedShot, setExpandedShot] = useState<number | null>(null);
  const [showScriptInput, setShowScriptInput] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<"shots" | "assets">("shots");
  const [importingExcel, setImportingExcel] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  // 批量生成首帧状态
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });

  const parseScript = trpc.overseas.parseScript.useMutation({
    onSuccess: (result) => {
      toast.success(`已解析 ${result.count} 个镜头`);
      setShowScriptInput(false);
      setScriptText("");
      refetch();
      setParsingScript(false);
    },
    onError: (e) => { toast.error(e.message); setParsingScript(false); },
  });

  const importExcel = trpc.overseas.importScriptFromExcel.useMutation({
    onSuccess: (result) => {
      toast.success(`已导入 ${result.imported} 个分镜`);
      refetch();
      setImportingExcel(false);
    },
    onError: (e) => { toast.error(e.message); setImportingExcel(false); },
  });

  const generateFrame = trpc.overseas.generateFrame.useMutation();

  const handleExcelUpload = async (file: File) => {
    setImportingExcel(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      importExcel.mutate({ projectId, episodeNumber: activeEpisode, fileBase64: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleBatchGenerateFrames = async (shots: ScriptShot[]) => {
    const pending = shots.filter(s => !s.firstFrameUrl);
    if (pending.length === 0) { toast.success("本集所有镜头已生成首帧"); return; }
    setBatchGenerating(true);
    setBatchProgress({ done: 0, total: pending.length });
    for (let i = 0; i < pending.length; i++) {
      try {
        await generateFrame.mutateAsync({ shotId: pending[i].id, frameType: "first" });
        setBatchProgress({ done: i + 1, total: pending.length });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`镜头 ${pending[i].shotNumber} 生成失败: ${msg}`);
      }
    }
    setBatchGenerating(false);
    refetch();
    toast.success(`批量生成完成！共处理 ${pending.length} 个镜头`);
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "5rem 0" }}>
        <Loader2 className="animate-spin w-8 h-8" style={{ color: C.amber }} />
      </div>
    );
  }

  if (!data) return null;

  const { project, shots } = data;
  const episodeShots = shots.filter(s => s.episodeNumber === activeEpisode) as ScriptShot[];
  const totalEpisodes = project.totalEpisodes || 20;
  const episodeNumbers = Array.from({ length: totalEpisodes }, (_, i) => i + 1);

  const doneCount = episodeShots.filter(s => s.status === "done").length;
  const frameCount = episodeShots.filter(s => s.firstFrameUrl).length;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
      {/* 左侧集数导航 */}
      <div style={{ width: 72, borderRight: `1px solid ${C.border}`, overflowY: "auto", padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        {episodeNumbers.map(ep => {
          const epShots = shots.filter(s => s.episodeNumber === ep);
          const epDone = epShots.filter(s => s.status === "done").length;
          const hasShots = epShots.length > 0;
          return (
            <button
              key={ep}
              onClick={() => onEpisodeChange(ep)}
              style={{
                width: 52, height: 52, borderRadius: 10, border: `1px solid ${activeEpisode === ep ? C.amber : C.border}`,
                background: activeEpisode === ep ? "oklch(0.75 0.17 65 / 0.12)" : "transparent",
                color: activeEpisode === ep ? C.amber : C.muted,
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700 }}>E{ep}</span>
              {hasShots && <span style={{ fontSize: 9, color: epDone === epShots.length ? C.green : C.muted }}>{epDone}/{epShots.length}</span>}
            </button>
          );
        })}
      </div>

      {/* 主内容区 */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Tab 切换 */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, padding: "0 1.5rem", background: C.surface, flexShrink: 0 }}>
          {(["shots", "assets"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setWorkspaceTab(tab)}
              style={{
                padding: "12px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: "transparent", border: "none",
                borderBottom: `2px solid ${workspaceTab === tab ? C.amber : "transparent"}`,
                color: workspaceTab === tab ? C.amber : C.muted,
                display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
              }}
            >
              {tab === "shots" ? <><Film size={14} /> 分镜</> : <><Layers size={14} /> 资产库</>}
            </button>
          ))}
        </div>
        {workspaceTab === "shots" ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
        {/* 集头部 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: C.text, marginBottom: 2 }}>
              {project.name} — 第 {activeEpisode} 集
            </h2>
            <p style={{ fontSize: 12, color: C.muted }}>
              {episodeShots.length} 个镜头 · {frameCount} 帧已生成 · {doneCount} 视频完成
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* 隐藏的 Excel file input */}
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleExcelUpload(f); e.target.value = ""; }}
            />
            {/* Excel 导入按鈕 */}
            <Button
              variant="outline"
              onClick={() => excelInputRef.current?.click()}
              disabled={importingExcel}
              style={{ borderColor: C.border, color: C.muted, fontSize: 12, gap: 6 }}
            >
              {importingExcel ? <><Loader2 className="animate-spin w-3 h-3" /> 导入中...</> : <><FileSpreadsheet size={13} /> Excel 分镜导入</>}
            </Button>
            {/* AI 解析剧本按鈕 */}
            <Button
              variant="outline"
              onClick={() => setShowScriptInput(!showScriptInput)}
              style={{ borderColor: C.border, color: C.muted, fontSize: 12, gap: 6 }}
            >
              <Upload size={13} /> {episodeShots.length > 0 ? "重新解析剧本" : "AI 解析剧本"}
            </Button>
            {/* 批量生成首帧按鈕 */}
            {episodeShots.length > 0 && (
              <Button
                onClick={() => handleBatchGenerateFrames(episodeShots)}
                disabled={batchGenerating}
                style={{ background: batchGenerating ? "oklch(0.30 0.01 240)" : "oklch(0.75 0.17 65 / 0.15)", border: `1px solid ${C.amber}`, color: C.amber, fontSize: 12, gap: 6, fontWeight: 600 }}
              >
                {batchGenerating
                  ? <><Loader2 className="animate-spin w-3 h-3" /> 生成中 {batchProgress.done}/{batchProgress.total}</>
                  : <><Zap size={13} /> 一键生成全部首帧</>}
              </Button>
            )}
          </div>
        </div>

        {/* 剧本输入区 */}
        <AnimatePresence>
          {showScriptInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden", marginBottom: 20 }}
            >
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                  粘贴第 {activeEpisode} 集剧本（支持中英文，AI 将自动解析为 20-30 个镜头）
                </p>
                <Textarea
                  value={scriptText}
                  onChange={e => setScriptText(e.target.value)}
                  placeholder={`Episode ${activeEpisode} Script\n\nScene 1 - INT. CLASSROOM - DAY\n\nTeacher ALEX stands at the front of the class...\n\n或粘贴中文剧本，AI 会自动翻译为英文分镜`}
                  rows={10}
                  style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text, fontSize: 13, resize: "vertical" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                  <Button variant="outline" onClick={() => setShowScriptInput(false)} style={{ borderColor: C.border, color: C.muted, fontSize: 12 }}>取消</Button>
                  <Button
                    onClick={() => {
                      if (!scriptText.trim()) return;
                      setParsingScript(true);
                      parseScript.mutate({ projectId, episodeNumber: activeEpisode, scriptText, language: "en" });
                    }}
                    disabled={!scriptText.trim() || parsingScript}
                    style={{ background: C.amber, color: "oklch(0.1 0.005 240)", fontWeight: 700, fontSize: 12, gap: 6 }}
                  >
                    {parsingScript ? <><Loader2 className="animate-spin w-3 h-3" /> 解析中...</> : <><Sparkles size={13} /> AI 解析分镜</>}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 工作流说明（空状态） */}
        {episodeShots.length === 0 && !showScriptInput && (
          <div style={{ textAlign: "center", padding: "4rem 0", border: `1px dashed ${C.border}`, borderRadius: 16 }}>
            <Film size={40} style={{ color: C.muted, margin: "0 auto 16px" }} />
            <p style={{ color: C.muted, marginBottom: 8 }}>第 {activeEpisode} 集还没有分镜</p>
            <p style={{ fontSize: 12, color: "oklch(0.40 0.01 240)", marginBottom: 20 }}>导入剧本后，AI 将自动解析为 20-30 个镜头，每个镜头包含首尾帧生成和视频生成流程</p>
            <Button onClick={() => setShowScriptInput(true)} style={{ background: C.amber, color: "oklch(0.1 0.005 240)", fontWeight: 700, gap: 6 }}>
              <Upload size={14} /> 导入第 {activeEpisode} 集剧本
            </Button>
          </div>
        )}

        {/* 工作流流程说明 */}
        {episodeShots.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: "10px 14px", background: "oklch(0.75 0.17 65 / 0.06)", border: `1px solid oklch(0.75 0.17 65 / 0.2)`, borderRadius: 10, fontSize: 12, color: C.muted, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: C.amber, fontWeight: 700 }}>工作流：</span>
            <span>① MJ 生成人物/场景资产</span>
            <ChevronRight size={12} />
            <span>② AI 生成首帧提示词 → Nano Banana Pro 生成首帧图</span>
            <ChevronRight size={12} />
            <span>③（可选）生成尾帧图</span>
            <ChevronRight size={12} />
            <span>④ 生成视频提示词 → Seedance 1.5 / Veo 3.1 生成视频</span>
          </div>
        )}

        {/* 分镜列表 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {episodeShots.map((shot) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              project={project as OverseasProject}
              expanded={expandedShot === shot.id}
              onToggle={() => setExpandedShot(expandedShot === shot.id ? null : shot.id)}
              onRefresh={refetch}
            />
          ))}
        </div>
        </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <OverseasAssetPanel projectId={projectId} project={project as OverseasProject} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 分镜卡片 ──────────────────────────────────────────────────────────────────

function ShotCard({ shot, project, expanded, onToggle, onRefresh }: {
  shot: ScriptShot;
  project: OverseasProject;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const [generatingFirstFrame, setGeneratingFirstFrame] = useState(false);
  const [generatingLastFrame, setGeneratingLastFrame] = useState(false);
  const [generatingVideoPrompt, setGeneratingVideoPrompt] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoEngine, setVideoEngine] = useState<"seedance_1_5" | "veo_3_1">("seedance_1_5");
  const [useLastFrame, setUseLastFrame] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [editedVideoPrompt, setEditedVideoPrompt] = useState(shot.videoPrompt || "");
  const [selectedRefAssets, setSelectedRefAssets] = useState<number[]>([]);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  // 加载项目资产（人物+场景）
  const { data: charAssets } = trpc.overseas.listAssets.useQuery({ projectId: shot.projectId, type: "character" }, { enabled: expanded });
  const { data: sceneAssets } = trpc.overseas.listAssets.useQuery({ projectId: shot.projectId, type: "scene" }, { enabled: expanded });
  const allAssets = [...(charAssets ?? []), ...(sceneAssets ?? [])] as OverseasAsset[];
  const selectedAssetUrls = selectedRefAssets
    .map(id => allAssets.find(a => a.id === id))
    .filter(Boolean)
    .map(a => a!.mainImageUrl || a!.mjImageUrl)
    .filter(Boolean) as string[];

  const generateFrame = trpc.overseas.generateFrame.useMutation({
    onSuccess: () => { onRefresh(); },
    onError: (e) => toast.error(e.message),
    onSettled: () => { setGeneratingFirstFrame(false); setGeneratingLastFrame(false); },
  });

  const generateVideoPrompt = trpc.overseas.generateVideoPrompt.useMutation({
    onSuccess: () => { toast.success("视频提示词已生成"); onRefresh(); setGeneratingVideoPrompt(false); },
    onError: (e) => { toast.error(e.message); setGeneratingVideoPrompt(false); },
  });

  const generateVideo = trpc.overseas.generateVideo.useMutation({
    onSuccess: () => { toast.success("视频生成完成！"); onRefresh(); setGeneratingVideo(false); },
    onError: (e) => { toast.error(`视频生成失败：${e.message}`); onRefresh(); setGeneratingVideo(false); },
  });

  const updateShot = trpc.overseas.updateShot.useMutation({
    onSuccess: () => { onRefresh(); setEditingPrompt(false); },
    onError: (e) => toast.error(e.message),
  });

  const statusCfg = SHOT_STATUS_CONFIG[shot.status];
  const aspectRatio = project.aspectRatio === "portrait" ? "9:16" : "16:9";

  return (
    <div style={{ background: C.surface, border: `1px solid ${expanded ? C.amber : C.border}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
      {/* 卡片头部 */}
      <div
        style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
        onClick={onToggle}
      >
        {/* 镜号 */}
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "oklch(0.18 0.006 240)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: C.amber }}>
            {String(shot.shotNumber).padStart(2, "0")}
          </span>
        </div>

        {/* 信息 */}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{shot.sceneName || `镜头 ${shot.shotNumber}`}</span>
            {shot.shotType && <span style={{ fontSize: 10, padding: "1px 6px", background: "oklch(0.18 0.006 240)", borderRadius: 4, color: C.muted }}>{shot.shotType}</span>}
            {shot.emotion && <span style={{ fontSize: 10, padding: "1px 6px", background: "oklch(0.18 0.006 240)", borderRadius: 4, color: C.muted }}>{shot.emotion}</span>}
          </div>
          <p style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
            {shot.visualDescription || "无描述"}
          </p>
        </div>

        {/* 状态指示器 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* 资产状态点 */}
          <div style={{ display: "flex", gap: 4 }}>
            <div title="首帧" style={{ width: 8, height: 8, borderRadius: "50%", background: shot.firstFrameUrl ? C.green : C.border }} />
            <div title="尾帧" style={{ width: 8, height: 8, borderRadius: "50%", background: shot.lastFrameUrl ? C.green : C.border }} />
            <div title="视频" style={{ width: 8, height: 8, borderRadius: "50%", background: shot.videoUrl ? C.green : C.border }} />
          </div>
          <span style={{ fontSize: 11, color: statusCfg.color, fontFamily: "'JetBrains Mono', monospace" }}>{statusCfg.label}</span>
          {expanded ? <ChevronUp size={14} style={{ color: C.muted }} /> : <ChevronDown size={14} style={{ color: C.muted }} />}
        </div>
      </div>

      {/* 展开内容 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ borderTop: `1px solid ${C.border}`, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* 视觉描述 */}
              <div>
                <label style={{ fontSize: 11, color: C.muted, marginBottom: 6, display: "block", letterSpacing: "0.05em", textTransform: "uppercase" }}>视觉描述（用于生成首尾帧）</label>
                <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, padding: "10px 12px", background: "oklch(0.18 0.006 240)", borderRadius: 8 }}>
                  {shot.visualDescription || "—"}
                </p>
              </div>

              {/* 台词 */}
              {shot.dialogue && (
                <div>
                  <label style={{ fontSize: 11, color: C.muted, marginBottom: 6, display: "block", letterSpacing: "0.05em", textTransform: "uppercase" }}>台词 / 旁白</label>
                  <p style={{ fontSize: 13, color: "oklch(0.78 0.01 240)", lineHeight: 1.6, padding: "10px 12px", background: "oklch(0.18 0.006 240)", borderRadius: 8, fontStyle: "italic" }}>
                    "{shot.dialogue}"
                  </p>
                </div>
              )}

              {/* STEP 1: 首帧 + 尾帧 */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: C.muted, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    STEP 1 — 首尾帧图片（Nano Banana Pro）
                  </label>
                  {/* 资产引用选择器 */}
                  <button
                    onClick={() => setShowAssetPicker(!showAssetPicker)}
                    style={{
                      fontSize: 10, padding: "3px 8px", borderRadius: 6, cursor: "pointer",
                      background: selectedRefAssets.length > 0 ? "oklch(0.75 0.17 65 / 0.15)" : "transparent",
                      border: `1px solid ${selectedRefAssets.length > 0 ? C.amber : C.border}`,
                      color: selectedRefAssets.length > 0 ? C.amber : C.muted,
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <Users size={10} />
                    {selectedRefAssets.length > 0 ? `已选 ${selectedRefAssets.length} 个资产` : "选择参考资产"}
                  </button>
                </div>

                {/* 资产选择展开区 */}
                {showAssetPicker && allAssets.length > 0 && (
                  <div style={{ marginBottom: 10, padding: "10px", background: "oklch(0.16 0.006 240)", borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <p style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>选择人物/场景参考图（最多 3 个），生成首尾帧时会作为参考</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {allAssets.map(asset => {
                        const thumbUrl = asset.mainImageUrl || asset.mjImageUrl;
                        const isSelected = selectedRefAssets.includes(asset.id);
                        return (
                          <button
                            key={asset.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedRefAssets(prev => prev.filter(id => id !== asset.id));
                              } else if (selectedRefAssets.length < 3) {
                                setSelectedRefAssets(prev => [...prev, asset.id]);
                              } else {
                                toast.error("最多选择 3 个参考资产");
                              }
                            }}
                            style={{
                              display: "flex", alignItems: "center", gap: 5, padding: "4px 8px",
                              borderRadius: 6, cursor: "pointer",
                              background: isSelected ? "oklch(0.75 0.17 65 / 0.15)" : "oklch(0.18 0.006 240)",
                              border: `1px solid ${isSelected ? C.amber : C.border}`,
                              color: isSelected ? C.amber : C.muted, fontSize: 11,
                            }}
                          >
                            {thumbUrl && <img src={thumbUrl} alt={asset.name} style={{ width: 20, height: 20, borderRadius: 3, objectFit: "cover" }} />}
                            <span>{asset.name}</span>
                            <span style={{ fontSize: 9, opacity: 0.6 }}>{asset.type === "character" ? "人" : "场"}</span>
                            {isSelected && <Check size={10} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {showAssetPicker && allAssets.length === 0 && (
                  <div style={{ marginBottom: 10, padding: "8px 10px", background: "oklch(0.16 0.006 240)", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>
                    尚无资产，请先在「资产库」 Tab 中添加人物/场景资产
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {/* 首帧 */}
                  <FramePanel
                    label="首帧"
                    url={shot.firstFrameUrl}
                    prompt={shot.firstFramePrompt}
                    aspectRatio={aspectRatio}
                    generating={generatingFirstFrame}
                    onGenerate={() => {
                      setGeneratingFirstFrame(true);
                      generateFrame.mutate({ shotId: shot.id, frameType: "first", referenceImageUrls: selectedAssetUrls.length > 0 ? selectedAssetUrls : undefined });
                    }}
                  />
                  {/* 尾帧 */}
                  <FramePanel
                    label="尾帧（可选）"
                    url={shot.lastFrameUrl}
                    prompt={shot.lastFramePrompt}
                    aspectRatio={aspectRatio}
                    generating={generatingLastFrame}
                    onGenerate={() => {
                      setGeneratingLastFrame(true);
                      generateFrame.mutate({ shotId: shot.id, frameType: "last", referenceImageUrls: selectedAssetUrls.length > 0 ? selectedAssetUrls : undefined });
                    }}
                  />
                </div>
              </div>

              {/* STEP 2: 视频提示词 */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 11, color: C.muted, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    STEP 2 — 视频提示词
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {shot.videoPrompt && !editingPrompt && (
                      <>
                        <button onClick={() => { navigator.clipboard.writeText(shot.videoPrompt!); toast.success("已复制"); }} style={{ fontSize: 11, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                          <Copy size={11} /> 复制
                        </button>
                        <button onClick={() => { setEditedVideoPrompt(shot.videoPrompt!); setEditingPrompt(true); }} style={{ fontSize: 11, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                          <Edit3 size={11} /> 编辑
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingPrompt ? (
                  <div>
                    <Textarea
                      value={editedVideoPrompt}
                      onChange={e => setEditedVideoPrompt(e.target.value)}
                      rows={4}
                      style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text, fontSize: 13, marginBottom: 8 }}
                    />
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Button variant="outline" onClick={() => setEditingPrompt(false)} style={{ borderColor: C.border, color: C.muted, fontSize: 11, height: 28 }}>取消</Button>
                      <Button onClick={() => updateShot.mutate({ id: shot.id, videoPrompt: editedVideoPrompt })} style={{ background: C.amber, color: "oklch(0.1 0.005 240)", fontSize: 11, height: 28, fontWeight: 700 }}>保存</Button>
                    </div>
                  </div>
                ) : shot.videoPrompt ? (
                  <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, padding: "10px 12px", background: "oklch(0.18 0.006 240)", borderRadius: 8 }}>
                    {shot.videoPrompt}
                  </p>
                ) : (
                  <Button
                    onClick={() => { setGeneratingVideoPrompt(true); generateVideoPrompt.mutate({ shotId: shot.id }); }}
                    disabled={generatingVideoPrompt}
                    variant="outline"
                    style={{ borderColor: C.border, color: C.muted, fontSize: 12, gap: 6, width: "100%" }}
                  >
                    {generatingVideoPrompt ? <><Loader2 className="animate-spin w-3 h-3" /> 生成中...</> : <><Wand2 size={13} /> AI 生成视频提示词</>}
                  </Button>
                )}
              </div>

              {/* STEP 3: 视频生成 */}
              <div>
                <label style={{ fontSize: 11, color: C.muted, marginBottom: 10, display: "block", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  STEP 3 — 视频生成
                </label>

                {shot.videoUrl ? (
                  <div>
                    <video
                      src={shot.videoUrl}
                      controls
                      style={{ width: "100%", maxHeight: 240, borderRadius: 8, background: "#000" }}
                    />
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <a href={shot.videoUrl} download target="_blank" rel="noreferrer">
                        <Button variant="outline" style={{ borderColor: C.border, color: C.muted, fontSize: 11, height: 28, gap: 4 }}>
                          <Download size={11} /> 下载
                        </Button>
                      </a>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setGeneratingVideo(true);
                          generateVideo.mutate({ shotId: shot.id, engine: videoEngine, aspectRatio: project.aspectRatio === "portrait" ? "9:16" : "16:9", useLastFrame });
                        }}
                        disabled={!shot.firstFrameUrl || !shot.videoPrompt || generatingVideo}
                        style={{ borderColor: C.border, color: C.muted, fontSize: 11, height: 28, gap: 4 }}
                      >
                        <RefreshCw size={11} /> 重新生成
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* 引擎选择 */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["seedance_1_5", "veo_3_1"] as const).map(eng => (
                        <button
                          key={eng}
                          onClick={() => setVideoEngine(eng)}
                          style={{
                            flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${videoEngine === eng ? C.amber : C.border}`,
                            background: videoEngine === eng ? "oklch(0.75 0.17 65 / 0.1)" : "transparent",
                            color: videoEngine === eng ? C.amber : C.muted, cursor: "pointer", fontSize: 12, fontWeight: videoEngine === eng ? 700 : 400,
                            transition: "all 0.15s",
                          }}
                        >
                          {eng === "seedance_1_5" ? "🎬 Seedance 1.5" : "🌐 Veo 3.1"}
                        </button>
                      ))}
                    </div>

                    {/* 尾帧选项 */}
                    {shot.lastFrameUrl && (
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.muted, cursor: "pointer" }}>
                        <input type="checkbox" checked={useLastFrame} onChange={e => setUseLastFrame(e.target.checked)} />
                        使用尾帧（首尾帧模式）
                      </label>
                    )}

                    {/* 生成按钮 */}
                    {shot.status === "failed" && shot.errorMessage && (
                      <div style={{ display: "flex", gap: 6, padding: "8px 10px", background: "oklch(0.65 0.22 25 / 0.1)", border: `1px solid oklch(0.65 0.22 25 / 0.3)`, borderRadius: 8, fontSize: 12, color: C.red }}>
                        <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{shot.errorMessage}</span>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        if (!shot.firstFrameUrl) { toast.error("请先生成首帧图片"); return; }
                        if (!shot.videoPrompt) { toast.error("请先生成视频提示词"); return; }
                        setGeneratingVideo(true);
                        generateVideo.mutate({ shotId: shot.id, engine: videoEngine, aspectRatio: project.aspectRatio === "portrait" ? "9:16" : "16:9", useLastFrame });
                      }}
                      disabled={generatingVideo || shot.status === "generating_video"}
                      style={{ background: C.amber, color: "oklch(0.1 0.005 240)", fontWeight: 700, fontSize: 13, gap: 6 }}
                    >
                      {generatingVideo || shot.status === "generating_video" ? (
                        <><Loader2 className="animate-spin w-4 h-4" /> 生成视频中（约 1-3 分钟）...</>
                      ) : (
                        <><Video size={14} /> 生成视频</>
                      )}
                    </Button>

                    {!shot.firstFrameUrl && (
                      <p style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>⚠️ 需先生成首帧图片</p>
                    )}
                    {shot.firstFrameUrl && !shot.videoPrompt && (
                      <p style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>⚠️ 需先生成视频提示词</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 帧图片面板 ────────────────────────────────────────────────────────────────

function FramePanel({ label, url, prompt, aspectRatio, generating, onGenerate }: {
  label: string;
  url: string | null;
  prompt: string | null;
  aspectRatio: string;
  generating: boolean;
  onGenerate: () => void;
}) {
  const isPortrait = aspectRatio === "9:16";
  const imgStyle = {
    width: "100%",
    aspectRatio: isPortrait ? "9/16" : "16/9",
    objectFit: "cover" as const,
    borderRadius: 8,
    maxHeight: isPortrait ? 240 : 135,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
        {url && (
          <a href={url} download target="_blank" rel="noreferrer">
            <button style={{ fontSize: 10, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
              <Download size={10} /> 下载
            </button>
          </a>
        )}
      </div>

      {url ? (
        <div>
          <img src={url} alt={label} style={imgStyle} />
          {prompt && (
            <p style={{ fontSize: 10, color: "oklch(0.40 0.01 240)", marginTop: 4, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
              {prompt}
            </p>
          )}
          <Button
            variant="outline"
            onClick={onGenerate}
            disabled={generating}
            style={{ borderColor: C.border, color: C.muted, fontSize: 10, height: 24, gap: 3, marginTop: 6, width: "100%" }}
          >
            {generating ? <Loader2 className="animate-spin w-3 h-3" /> : <RefreshCw size={10} />} 重新生成
          </Button>
        </div>
      ) : (
        <div
          style={{
            width: "100%", aspectRatio: isPortrait ? "9/16" : "16/9", maxHeight: isPortrait ? 240 : 135,
            background: "oklch(0.18 0.006 240)", border: `1px dashed ${C.border}`, borderRadius: 8,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer",
          }}
          onClick={!generating ? onGenerate : undefined}
        >
          {generating ? (
            <><Loader2 className="animate-spin w-5 h-5" style={{ color: C.amber }} /><span style={{ fontSize: 11, color: C.muted }}>生成中...</span></>
          ) : (
            <><ImageIcon size={20} style={{ color: C.muted }} /><span style={{ fontSize: 11, color: C.muted }}>点击生成{label}</span></>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 出海短剧资产管理面板 ──────────────────────────────────────────────────────

function OverseasAssetPanel({ projectId, project }: { projectId: number; project: OverseasProject }) {
  const [assetTab, setAssetTab] = useState<"character" | "scene" | "prop">("character");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [expandedAsset, setExpandedAsset] = useState<number | null>(null);

  const { data: assets, isLoading, refetch } = trpc.overseas.listAssets.useQuery({ projectId, type: assetTab });

  const createAsset = trpc.overseas.createAsset.useMutation({
    onSuccess: () => { refetch(); setShowAddDialog(false); setNewName(""); setNewDesc(""); toast.success("资产已创建"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteAsset = trpc.overseas.deleteAsset.useMutation({
    onSuccess: () => { refetch(); toast.success("已删除"); },
    onError: (e) => toast.error(e.message),
  });

  const ASSET_TABS = [
    { key: "character" as const, label: "人物", icon: <Users size={13} /> },
    { key: "scene" as const, label: "场景", icon: <MapPin size={13} /> },
    { key: "prop" as const, label: "道具", icon: <Package size={13} /> },
  ];

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* 资产类型 Tab */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {ASSET_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setAssetTab(t.key)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: assetTab === t.key ? "oklch(0.75 0.17 65 / 0.15)" : "transparent",
                border: `1px solid ${assetTab === t.key ? C.amber : C.border}`,
                color: assetTab === t.key ? C.amber : C.muted,
                display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          style={{ background: C.amber, color: "oklch(0.1 0.005 240)", fontWeight: 700, fontSize: 12, gap: 5 }}
        >
          <Plus size={13} /> 添加{ASSET_TABS.find(t => t.key === assetTab)?.label}
        </Button>
      </div>

      {/* 资产列表 */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
          <Loader2 className="animate-spin w-6 h-6" style={{ color: C.amber }} />
        </div>
      ) : !assets || assets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0", border: `1px dashed ${C.border}`, borderRadius: 16 }}>
          {assetTab === "character" ? <Users size={36} style={{ color: C.muted, margin: "0 auto 12px" }} /> :
           assetTab === "scene" ? <MapPin size={36} style={{ color: C.muted, margin: "0 auto 12px" }} /> :
           <Package size={36} style={{ color: C.muted, margin: "0 auto 12px" }} />}
          <p style={{ color: C.muted, marginBottom: 8 }}>还没有{ASSET_TABS.find(t => t.key === assetTab)?.label}资产</p>
          <p style={{ fontSize: 12, color: "oklch(0.40 0.01 240)", marginBottom: 20 }}>
            {assetTab === "character" ? "添加主要角色，上传 MJ 参考图后生成一致性参考图" :
             assetTab === "scene" ? "添加主要场景，生成场景参考图用于首尾帧一致性" :
             "添加道具资产，生成道具参考图"}
          </p>
          <Button onClick={() => setShowAddDialog(true)} style={{ background: C.amber, color: "oklch(0.1 0.005 240)", fontWeight: 700, gap: 6 }}>
            <Plus size={14} /> 添加{ASSET_TABS.find(t => t.key === assetTab)?.label}
          </Button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {(assets as OverseasAsset[]).map(asset => (
            <OverseasAssetCard
              key={asset.id}
              asset={asset}
              project={project}
              expanded={expandedAsset === asset.id}
              onToggle={() => setExpandedAsset(expandedAsset === asset.id ? null : asset.id)}
              onDelete={() => deleteAsset.mutate({ id: asset.id })}
              onRefresh={refetch}
            />
          ))}
        </div>
      )}

      {/* 添加资产对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
          <DialogHeader>
            <DialogTitle style={{ color: C.text }}>
              添加{ASSET_TABS.find(t => t.key === assetTab)?.label}
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>名称 *</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={assetTab === "character" ? "如：ALEX（主角）" : assetTab === "scene" ? "如：INT. CLASSROOM - DAY" : "如：Magic Sword"}
                style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>描述（可选）</label>
              <Textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder={assetTab === "character" ? "外貌特征、服装、性格..." : assetTab === "scene" ? "场景氛围、光线、时间..." : "道具外观、材质、用途..."}
                rows={3}
                style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text, fontSize: 13, resize: "none" }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} style={{ borderColor: C.border, color: C.muted }}>取消</Button>
            <Button
              onClick={() => {
                if (!newName.trim()) return;
                createAsset.mutate({ projectId, type: assetTab, name: newName.trim(), description: newDesc.trim() || undefined });
              }}
              disabled={!newName.trim() || createAsset.isPending}
              style={{ background: C.amber, color: "oklch(0.1 0.005 240)", fontWeight: 700 }}
            >
              {createAsset.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 资产卡片 ──────────────────────────────────────────────────────────────────

function OverseasAssetCard({ asset, project, expanded, onToggle, onDelete, onRefresh }: {
  asset: OverseasAsset;
  project: OverseasProject;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const [generatingMjPrompt, setGeneratingMjPrompt] = useState(false);
  const [generatingMain, setGeneratingMain] = useState(false);
  const [generatingFront, setGeneratingFront] = useState(false);
  const [generatingSide, setGeneratingSide] = useState(false);
  const [generatingBack, setGeneratingBack] = useState(false);
  const [uploadingMj, setUploadingMj] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPortrait = project.aspectRatio === "portrait";
  const isCharacter = asset.type === "character";

  const genMjPrompt = trpc.overseas.generateAssetMjPrompt.useMutation({
    onSuccess: (r) => { toast.success("MJ 提示词已生成"); onRefresh(); setGeneratingMjPrompt(false); },
    onError: (e) => { toast.error(e.message); setGeneratingMjPrompt(false); },
  });

  const genImage = trpc.overseas.generateAssetImage.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.viewType === "main" ? "主图" : r.viewType} 已生成`);
      onRefresh();
      setGeneratingMain(false); setGeneratingFront(false); setGeneratingSide(false); setGeneratingBack(false);
    },
    onError: (e) => {
      toast.error(e.message);
      setGeneratingMain(false); setGeneratingFront(false); setGeneratingSide(false); setGeneratingBack(false);
    },
  });

  const updateAsset = trpc.overseas.updateAsset.useMutation({
    onSuccess: () => { onRefresh(); setUploadingMj(false); },
    onError: (e) => { toast.error(e.message); setUploadingMj(false); },
  });

  const handleMjUpload = async (file: File) => {
    setUploadingMj(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const resp = await fetch("/api/upload-asset", { method: "POST", body: formData, credentials: "include" });
      if (!resp.ok) throw new Error("上传失败");
      const { url } = await resp.json();
      updateAsset.mutate({ id: asset.id, mjImageUrl: url });
    } catch (e: any) {
      toast.error(e.message ?? "上传失败");
      setUploadingMj(false);
    }
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* 卡片头部 */}
      <div
        onClick={onToggle}
        style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* 缩略图 */}
          <div style={{
            width: 40, height: isCharacter ? 53 : (isPortrait ? 53 : 30),
            borderRadius: 6, overflow: "hidden", background: "oklch(0.18 0.006 240)",
            flexShrink: 0, border: `1px solid ${C.border}`,
          }}>
            {asset.mainImageUrl ? (
              <img src={asset.mainImageUrl} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : asset.mjImageUrl ? (
              <img src={asset.mjImageUrl} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ImageIcon size={14} style={{ color: C.muted }} />
              </div>
            )}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{asset.name}</p>
            <p style={{ fontSize: 11, color: C.muted, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 160 }}>
              {asset.description ?? "无描述"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {asset.mainImageUrl && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />}
          {expanded ? <ChevronUp size={14} style={{ color: C.muted }} /> : <ChevronDown size={14} style={{ color: C.muted }} />}
        </div>
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* STEP 1: MJ 提示词 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, fontFamily: "'JetBrains Mono', monospace" }}>STEP 1 · MJ 提示词</span>
              <Button
                variant="outline"
                onClick={() => { setGeneratingMjPrompt(true); genMjPrompt.mutate({ assetId: asset.id, projectId: project.id }); }}
                disabled={generatingMjPrompt}
                style={{ borderColor: C.border, color: C.muted, fontSize: 10, height: 22, gap: 3 }}
              >
                {generatingMjPrompt ? <Loader2 className="animate-spin w-3 h-3" /> : <Sparkles size={10} />} AI 生成
              </Button>
            </div>
            {asset.mjPrompt ? (
              <div style={{ background: "oklch(0.18 0.006 240)", borderRadius: 8, padding: "8px 10px", fontSize: 11, color: C.muted, lineHeight: 1.5, position: "relative" }}>
                <p style={{ marginBottom: 6 }}>{asset.mjPrompt}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(asset.mjPrompt!); toast.success("已复制"); }}
                  style={{ fontSize: 10, color: C.amber, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  复制提示词
                </button>
              </div>
            ) : (
              <p style={{ fontSize: 11, color: "oklch(0.40 0.01 240)" }}>点击「AI 生成」自动生成 MJ 提示词，然后在 MJ 中生成参考图后上传</p>
            )}
          </div>

          {/* STEP 2: 上传 MJ 图 */}
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, fontFamily: "'JetBrains Mono', monospace", display: "block", marginBottom: 8 }}>STEP 2 · 上传 MJ 参考图</span>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%", aspectRatio: isCharacter ? "9/16" : (isPortrait ? "9/16" : "16/9"),
                maxHeight: isCharacter ? 200 : (isPortrait ? 200 : 120),
                background: "oklch(0.18 0.006 240)", border: `1px dashed ${asset.mjImageUrl ? C.amber : C.border}`,
                borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "pointer", overflow: "hidden", position: "relative",
              }}
            >
              {asset.mjImageUrl ? (
                <img src={asset.mjImageUrl} alt="MJ ref" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  {uploadingMj ? <Loader2 className="animate-spin w-5 h-5" style={{ color: C.amber }} /> : <Upload size={20} style={{ color: C.muted }} />}
                  <span style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{uploadingMj ? "上传中..." : "点击上传 MJ 生成的参考图"}</span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleMjUpload(f); e.target.value = ""; }}
            />
          </div>

          {/* STEP 3: 生成 NBP 参考图 */}
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, fontFamily: "'JetBrains Mono', monospace", display: "block", marginBottom: 8 }}>
              STEP 3 · 生成参考图（Nano Banana Pro）
            </span>
            <div style={{ display: "grid", gridTemplateColumns: isCharacter ? "1fr 1fr 1fr 1fr" : "1fr", gap: 8 }}>
              {/* 主图 */}
              <AssetImageSlot
                label={isCharacter ? "主图" : "参考图"}
                url={asset.mainImageUrl}
                isPortrait={isCharacter ? true : isPortrait}
                generating={generatingMain}
                disabled={!asset.mjImageUrl}
                onGenerate={() => {
                  setGeneratingMain(true);
                  genImage.mutate({ assetId: asset.id, projectId: project.id, viewType: "main" });
                }}
              />
              {/* 人物三视图 */}
              {isCharacter && (
                <>
                  <AssetImageSlot label="正视" url={asset.viewFrontUrl} isPortrait generating={generatingFront} disabled={!asset.mjImageUrl}
                    onGenerate={() => { setGeneratingFront(true); genImage.mutate({ assetId: asset.id, projectId: project.id, viewType: "front" }); }} />
                  <AssetImageSlot label="侧视" url={asset.viewSideUrl} isPortrait generating={generatingSide} disabled={!asset.mjImageUrl}
                    onGenerate={() => { setGeneratingSide(true); genImage.mutate({ assetId: asset.id, projectId: project.id, viewType: "side" }); }} />
                  <AssetImageSlot label="背视" url={asset.viewBackUrl} isPortrait generating={generatingBack} disabled={!asset.mjImageUrl}
                    onGenerate={() => { setGeneratingBack(true); genImage.mutate({ assetId: asset.id, projectId: project.id, viewType: "back" }); }} />
                </>
              )}
            </div>
          </div>

          {/* 删除按钮 */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="outline"
              onClick={onDelete}
              style={{ borderColor: "oklch(0.45 0.15 25)", color: "oklch(0.65 0.15 25)", fontSize: 11, height: 26, gap: 4 }}
            >
              <Trash2 size={11} /> 删除资产
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 资产图片槽 ────────────────────────────────────────────────────────────────

function AssetImageSlot({ label, url, isPortrait, generating, disabled, onGenerate }: {
  label: string;
  url: string | null | undefined;
  isPortrait: boolean;
  generating: boolean;
  disabled: boolean;
  onGenerate: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, color: C.muted, textAlign: "center" }}>{label}</span>
      {url ? (
        <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", aspectRatio: isPortrait ? "9/16" : "16/9" }}>
          <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <a
            href={url}
            download
            onClick={e => e.stopPropagation()}
            style={{ position: "absolute", top: 4, right: 4, background: "oklch(0 0 0 / 0.6)", borderRadius: 4, padding: "2px 4px", display: "flex" }}
          >
            <Download size={10} style={{ color: "white" }} />
          </a>
          <Button
            variant="outline"
            onClick={onGenerate}
            disabled={generating || disabled}
            style={{ position: "absolute", bottom: 4, right: 4, borderColor: C.border, color: C.muted, fontSize: 9, height: 20, gap: 2, padding: "0 6px" }}
          >
            {generating ? <Loader2 className="animate-spin w-2 h-2" /> : <RefreshCw size={9} />}
          </Button>
        </div>
      ) : (
        <div
          onClick={disabled ? undefined : onGenerate}
          style={{
            aspectRatio: isPortrait ? "9/16" : "16/9",
            background: "oklch(0.18 0.006 240)", border: `1px dashed ${C.border}`, borderRadius: 6,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
            cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
          }}
        >
          {generating ? (
            <Loader2 className="animate-spin w-4 h-4" style={{ color: C.amber }} />
          ) : (
            <>
              <ImageIcon size={16} style={{ color: C.muted }} />
              <span style={{ fontSize: 9, color: C.muted }}>{disabled ? "需先上传MJ图" : "点击生成"}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
