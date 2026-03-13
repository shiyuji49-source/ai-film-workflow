// 跑量剧工作流 — 三段式界面（剧本 / 主体 / 故事版）
// 参考幻角产品设计，工业暗色调，绿色主题

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Film, Plus, Trash2, ChevronDown, ChevronUp,
  Wand2, ImageIcon, Video, Upload, Edit3, Check, X,
  Loader2, Globe, ArrowLeft, RefreshCw,
  Copy, Download, Play, AlertCircle, Sparkles,
  Users, MapPin, Package, Zap, MessageSquare, FileText,
  ChevronLeft, ChevronRight, Settings, FileDown, FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// ─── 颜色主题（幻角风格 深色+绿色主题） ──────────────────────────────────────
const C = {
  bg: "oklch(0.10 0.005 240)",
  surface: "oklch(0.13 0.006 240)",
  card: "oklch(0.15 0.006 240)",
  border: "oklch(0.20 0.006 240)",
  borderHover: "oklch(0.30 0.01 240)",
  green: "oklch(0.72 0.20 160)",       // 幻角绿
  greenDim: "oklch(0.72 0.20 160 / 0.15)",
  greenBorder: "oklch(0.72 0.20 160 / 0.5)",
  amber: "oklch(0.75 0.17 65)",
  text: "oklch(0.88 0.005 60)",
  textSub: "oklch(0.70 0.008 240)",
  muted: "oklch(0.50 0.01 240)",
  mutedDim: "oklch(0.25 0.008 240)",
  red: "oklch(0.65 0.22 25)",
  blue: "oklch(0.65 0.15 240)",
};

// ─── 类型定义 ─────────────────────────────────────────────────────────────────
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
  isGlobalRef: boolean;
  sortOrder: number;
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
  videoEngine: "seedance_1_5" | "veo_3_1" | "kling_3_0" | null;
  videoDuration: number | null;
  status: "draft" | "generating_frame" | "frame_done" | "generating_video" | "done" | "failed";
  errorMessage: string | null;
};

type WorkflowTab = "script" | "subject" | "storyboard";
type SubjectFilter = "all" | "character" | "scene" | "prop";
type StoryboardPanel = "image" | "video";

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

const SHOT_TYPE_COLORS: Record<string, string> = {
  "大特写": "oklch(0.72 0.20 160)",
  "特写": "oklch(0.72 0.20 160)",
  "近景": "oklch(0.65 0.15 200)",
  "中景": "oklch(0.65 0.15 200)",
  "中近景": "oklch(0.65 0.15 200)",
  "全景": "oklch(0.65 0.15 240)",
  "远景": "oklch(0.65 0.15 240)",
  "大远景": "oklch(0.65 0.15 240)",
};

// ─── 主组件 ───────────────────────────────────────────────────────────────────
export default function OverseasWorkflow() {
  const { isAuthenticated, loading } = useAuth();
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeEpisode, setActiveEpisode] = useState(1);
  const [activeTab, setActiveTab] = useState<WorkflowTab>("script");

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <Loader2 className="animate-spin" style={{ color: C.green }} size={32} />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <div style={{ textAlign: "center" }}>
          <Film size={48} style={{ color: C.muted, marginBottom: 16 }} />
          <p style={{ color: C.textSub, marginBottom: 16 }}>请先登录以使用跑量剧工作流</p>
          <Button onClick={() => window.location.href = getLoginUrl()} style={{ background: C.green, color: "oklch(0.1 0.005 240)" }}>
            登录
          </Button>
        </div>
      </div>
    );
  }

  if (!activeProjectId) {
    return (
      <ProjectDashboard
        onOpenProject={(id) => { setActiveProjectId(id); setActiveTab("script"); setActiveEpisode(1); }}
        onCreateNew={() => {}}
      />
    );
  }

  return (
    <ProjectWorkspace
      projectId={activeProjectId}
      activeEpisode={activeEpisode}
      onEpisodeChange={setActiveEpisode}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onBack={() => setActiveProjectId(null)}
    />
  );
}

// ─── 项目列表 Dashboard ───────────────────────────────────────────────────────
function ProjectDashboard({ onOpenProject, onCreateNew }: { onOpenProject: (id: number) => void; onCreateNew: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const { data: projects, refetch } = trpc.overseas.listProjects.useQuery();

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "32px 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Zap size={20} style={{ color: C.green }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>跑量剧</span>
            <span style={{ fontSize: 12, color: C.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>IMAGE-TO-VIDEO</span>
          </div>
          <p style={{ fontSize: 13, color: C.muted }}>MJ 资产 → NBP 首帧 → Seedance 视频，全自动批量跑量</p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          style={{ background: C.green, color: "oklch(0.08 0.005 240)", fontWeight: 700, gap: 6, fontSize: 13 }}
        >
          <Plus size={15} /> 新建项目
        </Button>
      </div>

      {/* Project Grid */}
      {!projects || projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", border: `1px dashed ${C.border}`, borderRadius: 16 }}>
          <Film size={48} style={{ color: C.mutedDim, margin: "0 auto 16px" }} />
          <p style={{ color: C.muted, marginBottom: 8 }}>还没有跑量剧项目</p>
          <p style={{ fontSize: 12, color: "oklch(0.35 0.008 240)", marginBottom: 20 }}>
            创建项目后，导入剧本，AI 自动拆解分镜，批量生成首帧和视频
          </p>
          <Button onClick={() => setShowCreate(true)} style={{ background: C.green, color: "oklch(0.08 0.005 240)", fontWeight: 700, gap: 6 }}>
            <Plus size={14} /> 创建第一个项目
          </Button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {(projects as OverseasProject[]).map(p => (
            <ProjectCard key={p.id} project={p} onOpen={() => onOpenProject(p.id)} onDelete={() => refetch()} />
          ))}
          <button
            onClick={() => setShowCreate(true)}
            style={{
              border: `2px dashed ${C.border}`, borderRadius: 12, padding: "32px 20px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              cursor: "pointer", background: "transparent", color: C.muted,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.green; (e.currentTarget as HTMLButtonElement).style.color = C.green; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.muted; }}
          >
            <Plus size={24} />
            <span style={{ fontSize: 13 }}>新建项目</span>
          </button>
        </div>
      )}

      <CreateProjectDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); onOpenProject(id); }} />
    </div>
  );
}

function ProjectCard({ project, onOpen, onDelete }: { project: OverseasProject; onOpen: () => void; onDelete: () => void }) {
  const deleteProject = trpc.overseas.deleteProject.useMutation({
    onSuccess: () => { toast.success("项目已删除"); onDelete(); },
    onError: (e) => toast.error(e.message),
  });

  const marketLabel = MARKET_OPTIONS.find(m => m.value === project.market)?.label ?? project.market;
  const episodeCount = project.totalEpisodes ?? 20;

  return (
    <div
      style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: "20px", cursor: "pointer", transition: "all 0.2s",
        position: "relative",
      }}
      onClick={onOpen}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.green; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: C.greenDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Film size={18} style={{ color: C.green }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>{project.name}</p>
            <p style={{ fontSize: 11, color: C.muted }}>{marketLabel}</p>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); if (confirm("确认删除此项目？")) deleteProject.mutate({ id: project.id }); }}
          style={{ padding: 4, borderRadius: 6, cursor: "pointer", background: "transparent", color: C.muted, border: "none" }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: C.greenDim, color: C.green, border: `1px solid ${C.greenBorder}` }}>
          {project.aspectRatio === "portrait" ? "9:16" : "16:9"}
        </span>
        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "oklch(0.18 0.006 240)", color: C.textSub }}>
          {episodeCount} 集
        </span>
        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "oklch(0.18 0.006 240)", color: C.textSub }}>
          真人写实
        </span>
      </div>
    </div>
  );
}

function CreateProjectDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const [form, setForm] = useState({ name: "", market: "us", aspectRatio: "portrait" as "portrait" | "landscape", genre: "romance", totalEpisodes: 20 });
  const createProject = trpc.overseas.createProject.useMutation({
    onSuccess: (data) => { toast.success("项目已创建"); onCreated(data.id); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ background: C.surface, border: `1px solid ${C.border}`, maxWidth: 480 }}>
        <DialogHeader>
          <DialogTitle style={{ color: C.text }}>新建跑量剧项目</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
          <div>
            <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>项目名称</label>
            <Input
              placeholder="例：荒野12 · 第一季"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text }}
            />
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
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>总集数</label>
            <Input
              type="number" min={1} max={100} value={form.totalEpisodes}
              onChange={e => setForm(f => ({ ...f, totalEpisodes: parseInt(e.target.value) || 20 }))}
              style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} style={{ borderColor: C.border, color: C.muted }}>取消</Button>
          <Button
            onClick={() => createProject.mutate({ name: form.name, market: form.market, aspectRatio: form.aspectRatio, style: "realistic", genre: form.genre, totalEpisodes: form.totalEpisodes })}
            disabled={!form.name.trim() || createProject.isPending}
            style={{ background: C.green, color: "oklch(0.08 0.005 240)", fontWeight: 700 }}
          >
            {createProject.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "创建项目"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 项目工作区（三段式导航） ──────────────────────────────────────────────────
function ProjectWorkspace({
  projectId, activeEpisode, onEpisodeChange, activeTab, onTabChange, onBack
}: {
  projectId: number;
  activeEpisode: number;
  onEpisodeChange: (ep: number) => void;
  activeTab: WorkflowTab;
  onTabChange: (tab: WorkflowTab) => void;
  onBack: () => void;
}) {
  const { data } = trpc.overseas.getProject.useQuery({ id: projectId });
  const project = data?.project as OverseasProject | undefined;

  if (!project) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" style={{ color: C.green }} size={32} />
      </div>
    );
  }

  const tabs: { key: WorkflowTab; label: string }[] = [
    { key: "script", label: "剧本" },
    { key: "subject", label: "主体" },
    { key: "storyboard", label: "故事版" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Top Bar */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", borderBottom: `1px solid ${C.border}`,
        background: C.surface, flexShrink: 0,
      }}>
        {/* Left: Back + Project Name */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: 4, color: C.muted, cursor: "pointer", background: "none", border: "none", fontSize: 12, padding: "4px 8px", borderRadius: 6 }}
          >
            <ChevronLeft size={14} /> 返回
          </button>
          <span style={{ color: C.border }}>|</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{project.name}</span>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
            {MARKET_OPTIONS.find(m => m.value === project.market)?.label}
          </span>
        </div>

        {/* Center: Tab Navigation */}
        <div style={{ display: "flex", gap: 2, background: "oklch(0.10 0.005 240)", borderRadius: 8, padding: 3 }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              style={{
                padding: "5px 20px", borderRadius: 6, cursor: "pointer", border: "none",
                fontSize: 13, fontWeight: 500, transition: "all 0.15s",
                background: activeTab === tab.key ? C.green : "transparent",
                color: activeTab === tab.key ? "oklch(0.08 0.005 240)" : C.muted,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 4, color: C.muted, cursor: "pointer", background: "none", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, padding: "4px 10px" }}>
            <FileDown size={12} /> 导出 Excel
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 4, color: C.muted, cursor: "pointer", background: "none", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, padding: "4px 10px" }}>
            <FileUp size={12} /> 导入 Excel
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <AnimatePresence mode="wait">
          {activeTab === "script" && (
            <motion.div key="script" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ height: "100%" }}>
              <ScriptTab projectId={projectId} project={project} activeEpisode={activeEpisode} onEpisodeChange={onEpisodeChange} />
            </motion.div>
          )}
          {activeTab === "subject" && (
            <motion.div key="subject" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ height: "100%" }}>
              <SubjectTab projectId={projectId} project={project} />
            </motion.div>
          )}
          {activeTab === "storyboard" && (
            <motion.div key="storyboard" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ height: "100%", overflow: "hidden" }}>
              <StoryboardTab projectId={projectId} project={project} activeEpisode={activeEpisode} onEpisodeChange={onEpisodeChange} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── 剧本 Tab ─────────────────────────────────────────────────────────────────
function ScriptTab({ projectId, project, activeEpisode, onEpisodeChange }: {
  projectId: number;
  project: OverseasProject;
  activeEpisode: number;
  onEpisodeChange: (ep: number) => void;
}) {
  const [showScriptInput, setShowScriptInput] = useState(false);
  const [scriptText, setScriptText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selectedShotIds, setSelectedShotIds] = useState<Set<number>>(new Set());
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  const totalEpisodes = project.totalEpisodes ?? 20;
  const { data: shotsData, refetch } = trpc.overseas.listShots.useQuery({ projectId, episodeNumber: activeEpisode });
  const shots = (shotsData ?? []) as ScriptShot[];

  const parseScript = trpc.overseas.parseScript.useMutation({
    onSuccess: () => { toast.success("分镜拆解完成"); setShowScriptInput(false); setScriptText(""); setGenerating(false); refetch(); },
    onError: (e: { message: string }) => { toast.error(e.message); setGenerating(false); },
  });

  const deleteShot = trpc.overseas.deleteShot.useMutation({
    onSuccess: () => { toast.success("已删除"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleGenerate = () => {
    if (!scriptText.trim()) { toast.error("请输入剧本内容"); return; }
    setGenerating(true);
    parseScript.mutate({ projectId, episodeNumber: activeEpisode, scriptText });
  };

  const toggleSelect = (id: number) => {
    setSelectedShotIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedShotIds(new Set(shots.map(s => s.id)));
  const clearSelect = () => setSelectedShotIds(new Set());

  return (
    <div style={{ display: "flex", height: "calc(100vh - 52px)", overflow: "hidden" }}>
      {/* Episode Sidebar */}
      <div style={{
        width: 64, background: C.surface, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 4,
        overflowY: "auto", flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, color: C.muted, letterSpacing: "0.05em", marginBottom: 4, textTransform: "uppercase" }}>集</span>
        {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map(ep => (
          <button
            key={ep}
            onClick={() => onEpisodeChange(ep)}
            style={{
              width: 40, height: 32, borderRadius: 6, cursor: "pointer", border: "none",
              background: activeEpisode === ep ? C.green : "transparent",
              color: activeEpisode === ep ? "oklch(0.08 0.005 240)" : C.muted,
              fontSize: 12, fontWeight: activeEpisode === ep ? 700 : 400,
              transition: "all 0.15s",
            }}
          >
            {ep}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Toolbar */}
        <div style={{
          padding: "10px 20px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: C.surface, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>第 {activeEpisode} 集</span>
            <span style={{ fontSize: 11, color: C.muted }}>共 {shots.length} 个镜头</span>
            {selectedShotIds.size > 0 && (
              <span style={{ fontSize: 11, color: C.green }}>已选 {selectedShotIds.size} 个</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {shots.length > 0 && selectedShotIds.size === 0 && (
              <button onClick={selectAll} style={{ fontSize: 11, color: C.muted, cursor: "pointer", background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px" }}>
                全选
              </button>
            )}
            {selectedShotIds.size > 0 && (
              <button onClick={clearSelect} style={{ fontSize: 11, color: C.muted, cursor: "pointer", background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px" }}>
                取消选择
              </button>
            )}
            <Button
              onClick={() => setShowScriptInput(true)}
              style={{ background: C.green, color: "oklch(0.08 0.005 240)", fontWeight: 700, fontSize: 12, gap: 5, height: 32 }}
            >
              <Wand2 size={13} /> {shots.length > 0 ? "重新生成" : "导入剧本"}
            </Button>
          </div>
        </div>

        {/* Shot List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {shots.length === 0 && !showScriptInput ? (
            <div style={{ textAlign: "center", padding: "60px 0", border: `1px dashed ${C.border}`, borderRadius: 12 }}>
              <FileText size={40} style={{ color: C.mutedDim, margin: "0 auto 12px" }} />
              <p style={{ color: C.muted, marginBottom: 6 }}>第 {activeEpisode} 集还没有分镜</p>
              <p style={{ fontSize: 12, color: "oklch(0.35 0.008 240)", marginBottom: 20 }}>
                导入剧本后，AI 自动拆解为分镜文字描述（每集 20-30 个镜头）
              </p>
              <Button onClick={() => setShowScriptInput(true)} style={{ background: C.green, color: "oklch(0.08 0.005 240)", fontWeight: 700, gap: 6 }}>
                <Upload size={14} /> 导入第 {activeEpisode} 集剧本
              </Button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {shots.map(shot => (
                <ScriptShotCard
                  key={shot.id}
                  shot={shot}
                  selected={selectedShotIds.has(shot.id)}
                  onToggleSelect={() => toggleSelect(shot.id)}
                  onDelete={() => deleteShot.mutate({ id: shot.id })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        {shots.length > 0 && (
          <div style={{
            padding: "12px 20px", borderTop: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: C.surface, flexShrink: 0,
          }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                variant="outline"
                onClick={() => setShowScriptInput(true)}
                style={{ fontSize: 12, borderColor: C.border, color: C.muted, height: 32, gap: 5 }}
              >
                <RefreshCw size={12} /> 重新生成
              </Button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                style={{ background: C.green, color: "oklch(0.08 0.005 240)", fontWeight: 700, fontSize: 12, gap: 5, height: 32 }}
                onClick={() => toast.info("请切换到「主体」Tab 管理角色/场景资产")}
              >
                下一步：主体 →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Script Input Dialog */}
      <Dialog open={showScriptInput} onOpenChange={setShowScriptInput}>
        <DialogContent style={{ background: C.surface, border: `1px solid ${C.border}`, maxWidth: 680 }}>
          <DialogHeader>
            <DialogTitle style={{ color: C.text }}>导入第 {activeEpisode} 集剧本</DialogTitle>
          </DialogHeader>
          <div style={{ padding: "8px 0" }}>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
              粘贴剧本内容，AI 将自动拆解为分镜（每集 20-30 个镜头），严格按原剧本内容生成，不会添加原剧本没有的内容。
            </p>
            <Textarea
              value={scriptText}
              onChange={e => setScriptText(e.target.value)}
              placeholder={`第${activeEpisode}集剧本内容...\n\n场景1：...\n人物对白：...\n动作描述：...`}
              rows={14}
              style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text, resize: "none", fontSize: 13 }}
            />
            <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>字数：{scriptText.length}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScriptInput(false)} style={{ borderColor: C.border, color: C.muted }}>取消</Button>
            <Button
              onClick={handleGenerate}
              disabled={!scriptText.trim() || generating}
              style={{ background: C.green, color: "oklch(0.08 0.005 240)", fontWeight: 700, gap: 6 }}
            >
              {generating ? <><Loader2 className="animate-spin w-4 h-4" /> AI 拆解中...</> : <><Wand2 size={14} /> 开始拆解</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 分镜卡片（剧本 Tab） ─────────────────────────────────────────────────────
function ScriptShotCard({ shot, selected, onToggleSelect, onDelete }: {
  shot: ScriptShot;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shotTypes = shot.shotType ? shot.shotType.split(/[,，、\s]+/).filter(Boolean) : [];
  const characters = shot.characters ? shot.characters.split(/[,，、\s]+/).filter(Boolean) : [];

  return (
    <div style={{
      background: C.card, border: `1px solid ${selected ? C.green : C.border}`,
      borderRadius: 10, overflow: "hidden", transition: "border-color 0.15s",
    }}>
      {/* Card Header */}
      <div
        style={{ padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Select checkbox */}
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect(); }}
          style={{
            width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected ? C.green : C.border}`,
            background: selected ? C.green : "transparent", cursor: "pointer", flexShrink: 0, marginTop: 2,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {selected && <Check size={11} style={{ color: "oklch(0.08 0.005 240)" }} />}
        </button>

        {/* Shot Number */}
        <div style={{
          minWidth: 40, height: 24, borderRadius: 6, background: C.green,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: "oklch(0.08 0.005 240)",
          fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
        }}>
          {shot.episodeNumber}.{shot.shotNumber}
        </div>

        {/* Shot Type Tags */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
          {shotTypes.map((t, i) => (
            <span key={i} style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 4,
              background: `${SHOT_TYPE_COLORS[t] ?? C.blue}20`,
              color: SHOT_TYPE_COLORS[t] ?? C.blue,
              border: `1px solid ${SHOT_TYPE_COLORS[t] ?? C.blue}50`,
            }}>
              {t}
            </span>
          ))}
          {shot.sceneName && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "oklch(0.20 0.006 240)", color: C.muted }}>
              {shot.sceneName}
            </span>
          )}
        </div>

        {/* Characters */}
        {characters.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {characters.map((c, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: C.greenDim, color: C.green, border: `1px solid ${C.greenBorder}` }}>
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); if (confirm("确认删除此镜头？")) onDelete(); }}
            style={{ padding: 4, borderRadius: 4, cursor: "pointer", background: "transparent", color: C.muted, border: "none" }}
          >
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronUp size={14} style={{ color: C.muted }} /> : <ChevronDown size={14} style={{ color: C.muted }} />}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 16px 14px 46px", display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Scene Description */}
              {shot.visualDescription && (
                <div>
                  <label style={{ fontSize: 10, color: C.muted, marginBottom: 4, display: "block", letterSpacing: "0.06em", textTransform: "uppercase" }}>场景描述</label>
                  <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.7 }}>{shot.visualDescription}</p>
                </div>
              )}
              {/* Dialogue */}
              {shot.dialogue && (
                <div>
                  <label style={{ fontSize: 10, color: C.muted, marginBottom: 4, display: "block", letterSpacing: "0.06em", textTransform: "uppercase" }}>对白</label>
                  <p style={{ fontSize: 12, color: "oklch(0.78 0.01 240)", lineHeight: 1.7, fontStyle: "italic" }}>"{shot.dialogue}"</p>
                </div>
              )}
              {/* Emotion */}
              {shot.emotion && (
                <div>
                  <label style={{ fontSize: 10, color: C.muted, marginBottom: 4, display: "block", letterSpacing: "0.06em", textTransform: "uppercase" }}>情绪/氛围</label>
                  <p style={{ fontSize: 12, color: C.textSub }}>{shot.emotion}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 主体 Tab ─────────────────────────────────────────────────────────────────
function SubjectTab({ projectId, project }: { projectId: number; project: OverseasProject }) {
  const [filter, setFilter] = useState<SubjectFilter>("all");
  const [selectedAsset, setSelectedAsset] = useState<OverseasAsset | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState<"character" | "scene" | "prop">("character");

  const { data: charAssets, refetch: refetchChar } = trpc.overseas.listAssets.useQuery({ projectId, type: "character" });
  const { data: sceneAssets, refetch: refetchScene } = trpc.overseas.listAssets.useQuery({ projectId, type: "scene" });
  const { data: propAssets, refetch: refetchProp } = trpc.overseas.listAssets.useQuery({ projectId, type: "prop" });

  const allAssets = [
    ...(charAssets ?? []).map(a => ({ ...a, _type: "character" as const })),
    ...(sceneAssets ?? []).map(a => ({ ...a, _type: "scene" as const })),
    ...(propAssets ?? []).map(a => ({ ...a, _type: "prop" as const })),
  ] as (OverseasAsset & { _type: "character" | "scene" | "prop" })[];

  const filtered = filter === "all" ? allAssets : allAssets.filter(a => a._type === filter);

  const refetchAll = () => { refetchChar(); refetchScene(); refetchProp(); };

  const FILTER_TABS = [
    { key: "all" as SubjectFilter, label: "全部", icon: <Users size={13} /> },
    { key: "character" as SubjectFilter, label: "角色", icon: <Users size={13} /> },
    { key: "scene" as SubjectFilter, label: "场景", icon: <MapPin size={13} /> },
    { key: "prop" as SubjectFilter, label: "道具", icon: <Package size={13} /> },
  ];

  return (
    <div style={{ display: "flex", height: "calc(100vh - 52px)", overflow: "hidden" }}>
      {/* Asset Grid */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Toolbar */}
        <div style={{
          padding: "10px 20px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: C.surface, flexShrink: 0,
        }}>
          {/* Filter Tabs */}
          <div style={{ display: "flex", gap: 2, background: "oklch(0.10 0.005 240)", borderRadius: 8, padding: 3 }}>
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: "4px 14px", borderRadius: 6, cursor: "pointer", border: "none",
                  fontSize: 12, display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s",
                  background: filter === tab.key ? C.green : "transparent",
                  color: filter === tab.key ? "oklch(0.08 0.005 240)" : C.muted,
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button
              onClick={() => { setAddType("character"); setShowAddDialog(true); }}
              style={{ background: C.green, color: "oklch(0.08 0.005 240)", fontWeight: 700, fontSize: 12, gap: 5, height: 32 }}
            >
              <Plus size={13} /> 新建主体
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", border: `1px dashed ${C.border}`, borderRadius: 12 }}>
              <Users size={40} style={{ color: C.mutedDim, margin: "0 auto 12px" }} />
              <p style={{ color: C.muted, marginBottom: 6 }}>还没有主体资产</p>
              <p style={{ fontSize: 12, color: "oklch(0.35 0.008 240)", marginBottom: 20 }}>
                添加角色、场景、道具，上传 MJ 参考图后可生成一致性主体图
              </p>
              <Button onClick={() => setShowAddDialog(true)} style={{ background: C.green, color: "oklch(0.08 0.005 240)", fontWeight: 700, gap: 6 }}>
                <Plus size={14} /> 新建主体
              </Button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {filtered.map(asset => (
                <SubjectCard
                  key={asset.id}
                  asset={asset}
                  selected={selectedAsset?.id === asset.id}
                  onSelect={() => setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
                  onRefresh={refetchAll}
                />
              ))}
              {/* Add New Card */}
              <button
                onClick={() => setShowAddDialog(true)}
                style={{
                  border: `2px dashed ${C.border}`, borderRadius: 10, aspectRatio: "9/12",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                  cursor: "pointer", background: "transparent", color: C.muted, transition: "all 0.2s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.green; (e.currentTarget as HTMLButtonElement).style.color = C.green; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.muted; }}
              >
                <Plus size={20} />
                <span style={{ fontSize: 12 }}>新建主体</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Generate Subject Image */}
      {selectedAsset && (
        <SubjectGeneratePanel
          asset={selectedAsset}
          project={project}
          onClose={() => setSelectedAsset(null)}
          onRefresh={refetchAll}
        />
      )}

      <AddSubjectDialog
        open={showAddDialog}
        defaultType={addType}
        onClose={() => setShowAddDialog(false)}
        onCreated={() => { setShowAddDialog(false); refetchAll(); }}
        projectId={projectId}
      />
    </div>
  );
}

function SubjectCard({ asset, selected, onSelect, onRefresh }: {
  asset: OverseasAsset;
  selected: boolean;
  onSelect: () => void;
  onRefresh: () => void;
}) {
  const thumbUrl = asset.mainImageUrl || asset.mjImageUrl;
  const TYPE_LABELS: Record<string, string> = { character: "角色", scene: "场景", prop: "道具" };
  const TYPE_COLORS: Record<string, string> = { character: C.green, scene: C.blue, prop: C.amber };

  return (
    <div
      onClick={onSelect}
      style={{
        background: C.card, border: `2px solid ${selected ? C.green : C.border}`,
        borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "all 0.15s",
        aspectRatio: "9/12", display: "flex", flexDirection: "column",
      }}
    >
      {/* Image */}
      <div style={{ flex: 1, background: "oklch(0.12 0.005 240)", position: "relative", overflow: "hidden" }}>
        {thumbUrl ? (
          <img src={thumbUrl} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={28} style={{ color: C.mutedDim }} />
          </div>
        )}
        {/* Type Badge */}
        <div style={{
          position: "absolute", top: 6, left: 6,
          fontSize: 9, padding: "2px 6px", borderRadius: 4,
          background: `${TYPE_COLORS[asset.type]}20`,
          color: TYPE_COLORS[asset.type],
          border: `1px solid ${TYPE_COLORS[asset.type]}50`,
        }}>
          {TYPE_LABELS[asset.type]}
        </div>
        {/* Elements Badge */}
        {asset.isGlobalRef && (
          <div style={{
            position: "absolute", top: 6, right: 6,
            fontSize: 9, padding: "2px 6px", borderRadius: 4,
            background: "oklch(0.75 0.17 65 / 0.2)", color: C.amber,
            border: `1px solid oklch(0.75 0.17 65 / 0.5)`,
          }}>
            ⚡ Elements
          </div>
        )}
        {/* Select Overlay */}
        {selected && (
          <div style={{
            position: "absolute", inset: 0, background: `${C.green}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={16} style={{ color: "oklch(0.08 0.005 240)" }} />
            </div>
          </div>
        )}
      </div>
      {/* Name */}
      <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</p>
        <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
          {thumbUrl ? "已上传参考图" : "点击选择 → 生成主体图"}
        </p>
      </div>
    </div>
  );
}

function SubjectGeneratePanel({ asset, project, onClose, onRefresh }: {
  asset: OverseasAsset;
  project: OverseasProject;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [prompt, setPrompt] = useState(asset.nbpPrompt ?? "");
  const [generating, setGenerating] = useState(false);
  const [uploadingMj, setUploadingMj] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPortrait = project.aspectRatio === "portrait";

  const generateAssetImage = trpc.overseas.generateAssetImage.useMutation({
    onSuccess: () => { toast.success("主体图生成完成"); setGenerating(false); onRefresh(); },
    onError: (e) => { toast.error(e.message); setGenerating(false); },
  });

  const updateAsset = trpc.overseas.updateAsset.useMutation({
    onSuccess: () => { toast.success("图片上传成功"); setUploadingMj(false); onRefresh(); },
    onError: (e: { message: string }) => { toast.error(e.message); setUploadingMj(false); },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMj(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload-asset-image", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json() as { url: string };
      updateAsset.mutate({ id: asset.id, mjImageUrl: url });
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "上传失败");
      setUploadingMj(false);
    }
  };

  const thumbUrl = asset.mainImageUrl || asset.mjImageUrl;

  return (
    <div style={{
      width: 320, background: C.surface, borderLeft: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>生成主体图</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Asset Name */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: C.greenDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={16} style={{ color: C.green }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{asset.name}</p>
            <p style={{ fontSize: 11, color: C.muted }}>{asset.type === "character" ? "角色" : asset.type === "scene" ? "场景" : "道具"}</p>
          </div>
        </div>

        {/* Current Image */}
        <div>
          <label style={{ fontSize: 11, color: C.muted, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" }}>主体素材</label>
          <div style={{
            borderRadius: 8, overflow: "hidden", background: "oklch(0.12 0.005 240)",
            aspectRatio: isPortrait ? "9/16" : "16/9",
            border: `1px solid ${C.border}`,
          }}>
            {thumbUrl ? (
              <img src={thumbUrl} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                <ImageIcon size={28} style={{ color: C.mutedDim }} />
                <span style={{ fontSize: 11, color: C.muted }}>暂无图片</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 6, cursor: "pointer",
                background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              {uploadingMj ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              上传 MJ 图
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
            {thumbUrl && (
              <a href={thumbUrl} download target="_blank" rel="noreferrer">
                <button style={{ padding: "6px 10px", borderRadius: 6, cursor: "pointer", background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  <Download size={12} /> 下载
                </button>
              </a>
            )}
          </div>
        </div>

        {/* Prompt */}
        <div>
          <label style={{ fontSize: 11, color: C.muted, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            主体提示词 <span style={{ color: "oklch(0.35 0.008 240)" }}>（NBP / 即梦）</span>
          </label>
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={`描述${asset.name}的外观特征...\n\nPhotorealistic character design, cinematic lighting...`}
            rows={6}
            style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text, resize: "none", fontSize: 12 }}
          />
          <p style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{prompt.length}/8000</p>
        </div>

        {/* Generate Button */}
        <Button
          onClick={() => {
            if (!prompt.trim()) { toast.error("请输入提示词"); return; }
            setGenerating(true);
            generateAssetImage.mutate({ assetId: asset.id, projectId: asset.projectId ?? 0, viewType: "main" });
          }}
          disabled={generating || !prompt.trim()}
          style={{ background: C.green, color: "oklch(0.08 0.005 240)", fontWeight: 700, gap: 6 }}
        >
          {generating ? <><Loader2 className="animate-spin w-4 h-4" /> 生成中...</> : <><Sparkles size={14} /> 生成主体图</>}
        </Button>
      </div>
    </div>
  );
}

function AddSubjectDialog({ open, defaultType, onClose, onCreated, projectId }: {
  open: boolean;
  defaultType: "character" | "scene" | "prop";
  onClose: () => void;
  onCreated: () => void;
  projectId: number;
}) {
  const [form, setForm] = useState({ name: "", type: defaultType, description: "" });
  const createAsset = trpc.overseas.createAsset.useMutation({
    onSuccess: () => { toast.success("主体已创建"); onCreated(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ background: C.surface, border: `1px solid ${C.border}`, maxWidth: 420 }}>
        <DialogHeader>
          <DialogTitle style={{ color: C.text }}>新建主体</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 0" }}>
          <div>
            <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>主体类型</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { key: "character", label: "角色", icon: <Users size={13} /> },
                { key: "scene", label: "场景", icon: <MapPin size={13} /> },
                { key: "prop", label: "道具", icon: <Package size={13} /> },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setForm(f => ({ ...f, type: t.key as "character" | "scene" | "prop" }))}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer",
                    border: `2px solid ${form.type === t.key ? C.green : C.border}`,
                    background: form.type === t.key ? C.greenDim : "transparent",
                    color: form.type === t.key ? C.green : C.muted,
                    fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>名称</label>
            <Input
              placeholder={form.type === "character" ? "例：LUCAS" : form.type === "scene" ? "例：废弃营地_中心" : "例：战术匕首"}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>描述（可选）</label>
            <Textarea
              placeholder="简要描述外观特征..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text, resize: "none" }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} style={{ borderColor: C.border, color: C.muted }}>取消</Button>
          <Button
            onClick={() => createAsset.mutate({ projectId, type: form.type, name: form.name, description: form.description || undefined })}
            disabled={!form.name.trim() || createAsset.isPending}
            style={{ background: C.green, color: "oklch(0.08 0.005 240)", fontWeight: 700 }}
          >
            {createAsset.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 故事版 Tab ───────────────────────────────────────────────────────────────
function StoryboardTab({ projectId, project, activeEpisode, onEpisodeChange }: {
  projectId: number;
  project: OverseasProject;
  activeEpisode: number;
  onEpisodeChange: (ep: number) => void;
}) {
  const [activeShotId, setActiveShotId] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<StoryboardPanel>("image");

  const { data: shotsData, refetch } = trpc.overseas.listShots.useQuery({ projectId, episodeNumber: activeEpisode });
  const shots = (shotsData ?? []) as ScriptShot[];

  const activeShot = shots.find(s => s.id === activeShotId) ?? shots[0] ?? null;

  // Auto-select first shot when episode changes
  const prevEpisode = useRef(activeEpisode);
  if (prevEpisode.current !== activeEpisode) {
    prevEpisode.current = activeEpisode;
    setActiveShotId(null);
  }

  const displayShot = activeShotId ? shots.find(s => s.id === activeShotId) ?? null : shots[0] ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)", overflow: "hidden" }}>
      {/* Top Bar */}
      <div style={{
        padding: "8px 16px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: C.surface, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: C.muted }}>第</span>
          <Select value={String(activeEpisode)} onValueChange={v => onEpisodeChange(Number(v))}>
            <SelectTrigger style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text, width: 80, height: 30, fontSize: 13 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              {Array.from({ length: project.totalEpisodes ?? 20 }, (_, i) => i + 1).map(ep => (
                <SelectItem key={ep} value={String(ep)} style={{ color: C.text }}>第 {ep} 集</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span style={{ fontSize: 13, color: C.muted }}>共 {shots.length} 个镜头</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 4, color: C.muted, cursor: "pointer", background: "none", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, padding: "4px 10px" }}>
            <Zap size={12} /> 批量生成
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Center: Large Preview */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: C.bg, position: "relative" }}>
          {shots.length === 0 ? (
            <div style={{ textAlign: "center" }}>
              <Film size={48} style={{ color: C.mutedDim, marginBottom: 12 }} />
              <p style={{ color: C.muted, marginBottom: 6 }}>第 {activeEpisode} 集还没有分镜</p>
              <p style={{ fontSize: 12, color: "oklch(0.35 0.008 240)" }}>请先在「剧本」Tab 导入并拆解剧本</p>
            </div>
          ) : displayShot ? (
            <ShotPreview shot={displayShot} project={project} onRefresh={refetch} />
          ) : null}
        </div>

        {/* Right Panel */}
        {displayShot && (
          <StoryboardRightPanel
            shot={displayShot}
            project={project}
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            projectId={projectId}
            onRefresh={refetch}
          />
        )}
      </div>

      {/* Bottom: Shot Strip */}
      {shots.length > 0 && (
        <ShotStrip
          shots={shots}
          activeShotId={displayShot?.id ?? null}
          onSelect={(id) => setActiveShotId(id)}
          project={project}
        />
      )}
    </div>
  );
}

function ShotPreview({ shot, project, onRefresh }: { shot: ScriptShot; project: OverseasProject; onRefresh: () => void }) {
  const isPortrait = project.aspectRatio === "portrait";
  const hasVideo = !!shot.videoUrl;
  const hasImage = !!shot.firstFrameUrl;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, maxHeight: "100%" }}>
      {/* Image/Video Preview */}
      <div style={{
        borderRadius: 10, overflow: "hidden", background: "oklch(0.12 0.005 240)",
        border: `1px solid ${C.border}`,
        ...(isPortrait
          ? { height: "min(480px, calc(100vh - 280px))", aspectRatio: "9/16" }
          : { width: "min(720px, calc(100vw - 400px))", aspectRatio: "16/9" }
        ),
        position: "relative",
      }}>
        {hasVideo ? (
          <video
            src={shot.videoUrl!}
            controls
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : hasImage ? (
          <img src={shot.firstFrameUrl!} alt={`镜头 ${shot.shotNumber}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
            <ImageIcon size={36} style={{ color: C.mutedDim }} />
            <span style={{ fontSize: 12, color: C.muted }}>暂无首帧图片</span>
          </div>
        )}
        {/* Shot Number Badge */}
        <div style={{
          position: "absolute", top: 10, left: 10,
          background: "oklch(0.08 0.005 240 / 0.85)", borderRadius: 6,
          padding: "3px 8px", fontSize: 11, color: C.green,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          镜头 {shot.episodeNumber}.{shot.shotNumber}
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.muted }}>
        {hasImage && (
          <>
            <button style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", background: "none", border: "none", color: C.muted }}>
              <RefreshCw size={12} /> 重绘
            </button>
            <button style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", background: "none", border: "none", color: C.muted }}>
              <Copy size={12} /> 对口型
            </button>
          </>
        )}
        {(hasImage || hasVideo) && (
          <a href={hasVideo ? shot.videoUrl! : shot.firstFrameUrl!} download target="_blank" rel="noreferrer">
            <button style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", background: "none", border: "none", color: C.muted }}>
              <Download size={12} /> 下载
            </button>
          </a>
        )}
      </div>
    </div>
  );
}

function StoryboardRightPanel({ shot, project, activePanel, onPanelChange, projectId, onRefresh }: {
  shot: ScriptShot;
  project: OverseasProject;
  activePanel: StoryboardPanel;
  onPanelChange: (p: StoryboardPanel) => void;
  projectId: number;
  onRefresh: () => void;
}) {
  const [imagePrompt, setImagePrompt] = useState(shot.firstFramePrompt ?? "");
  const [generatingImage, setGeneratingImage] = useState(false);

  const { data: charAssets } = trpc.overseas.listAssets.useQuery({ projectId, type: "character" });
  const { data: sceneAssets } = trpc.overseas.listAssets.useQuery({ projectId, type: "scene" });
  const allAssets = [...(charAssets ?? []), ...(sceneAssets ?? [])] as OverseasAsset[];
  const globalRefs = allAssets.filter(a => a.isGlobalRef);

  const generateFrame = trpc.overseas.generateFrame.useMutation({
    onSuccess: () => { toast.success("首帧生成完成"); setGeneratingImage(false); onRefresh(); },
    onError: (e) => { toast.error(e.message); setGeneratingImage(false); },
  });

  const generateVideoPrompt = trpc.overseas.generateVideoPrompt.useMutation({
    onSuccess: () => { toast.success("视频提示词已生成"); onRefresh(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div style={{
      width: 340, background: C.surface, borderLeft: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Panel Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {[
          { key: "image" as StoryboardPanel, label: "绘图", icon: <ImageIcon size={13} /> },
          { key: "video" as StoryboardPanel, label: "视频", icon: <Video size={13} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => onPanelChange(tab.key)}
            style={{
              flex: 1, padding: "10px 0", cursor: "pointer", border: "none",
              fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              background: activePanel === tab.key ? C.bg : "transparent",
              color: activePanel === tab.key ? C.text : C.muted,
              borderBottom: activePanel === tab.key ? `2px solid ${C.green}` : "2px solid transparent",
              fontWeight: activePanel === tab.key ? 600 : 400,
              transition: "all 0.15s",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {activePanel === "image" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Shot Info */}
            <div>
              <label style={{ fontSize: 10, color: C.muted, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                镜头 {shot.episodeNumber}.{shot.shotNumber}
              </label>
              <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
                {shot.visualDescription ?? "无描述"}
              </p>
            </div>

            {/* Image Prompt */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>首帧提示词</label>
                {shot.firstFramePrompt && (
                  <button
                    onClick={() => navigator.clipboard.writeText(shot.firstFramePrompt!).then(() => toast.success("已复制"))}
                    style={{ fontSize: 10, color: C.muted, cursor: "pointer", background: "none", border: "none", display: "flex", alignItems: "center", gap: 2 }}
                  >
                    <Copy size={10} /> 复制
                  </button>
                )}
              </div>
              <Textarea
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
                placeholder="首帧图片生成提示词..."
                rows={5}
                style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text, resize: "none", fontSize: 12 }}
              />
              <p style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{imagePrompt.length}/8000</p>
            </div>

            {/* Reference Assets */}
            {allAssets.length > 0 && (
              <div>
                <label style={{ fontSize: 10, color: C.muted, marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  参考主体 {globalRefs.length > 0 && <span style={{ color: C.amber }}>（{globalRefs.length} 个 Elements 参考）</span>}
                </label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {allAssets.slice(0, 6).map(asset => {
                    const thumb = asset.mainImageUrl || asset.mjImageUrl;
                    return (
                      <div key={asset.id} style={{ position: "relative" }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 6, overflow: "hidden",
                          border: `2px solid ${asset.isGlobalRef ? C.amber : C.border}`,
                          background: "oklch(0.12 0.005 240)",
                        }}>
                          {thumb ? (
                            <img src={thumb} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Users size={16} style={{ color: C.mutedDim }} />
                            </div>
                          )}
                        </div>
                        <p style={{ fontSize: 9, color: C.muted, textAlign: "center", marginTop: 2, maxWidth: 48, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={() => {
                if (!imagePrompt.trim()) { toast.error("请输入首帧提示词"); return; }
                setGeneratingImage(true);
                const refUrls = globalRefs.map(a => a.mainImageUrl || a.mjImageUrl).filter(Boolean) as string[];
                generateFrame.mutate({
                  shotId: shot.id,
                  frameType: "first",
                  referenceImageUrls: refUrls.length > 0 ? refUrls : undefined,
                });
              }}
              disabled={generatingImage || !imagePrompt.trim()}
              style={{ background: C.green, color: "oklch(0.08 0.005 240)", fontWeight: 700, gap: 6 }}
            >
              {generatingImage ? <><Loader2 className="animate-spin w-4 h-4" /> 生成中...</> : <><Sparkles size={14} /> 生成首帧</>}
            </Button>

            {/* Add Main Image */}
            <button
              style={{
                padding: "8px 0", borderRadius: 8, cursor: "pointer",
                background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 12,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}
              onClick={() => toast.info("功能开发中：上传主体图到此镜头")}
            >
              <Plus size={13} /> 主体
            </button>
          </div>
        ) : (
          /* Video Panel */
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Video Prompt */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>视频提示词</label>
                {!shot.videoPrompt && (
                  <button
                    onClick={() => generateVideoPrompt.mutate({ shotId: shot.id })}
                    style={{ fontSize: 10, color: C.green, cursor: "pointer", background: "none", border: "none", display: "flex", alignItems: "center", gap: 2 }}
                  >
                    <Wand2 size={10} /> AI 生成
                  </button>
                )}
              </div>
              <Textarea
                value={shot.videoPrompt ?? ""}
                readOnly
                placeholder="点击「AI 生成」自动生成视频提示词..."
                rows={6}
                style={{ background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, color: C.text, resize: "none", fontSize: 12 }}
              />
            </div>

            {/* Video Status */}
            {shot.videoUrl ? (
              <div style={{ padding: "10px 12px", background: `${C.green}15`, border: `1px solid ${C.greenBorder}`, borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: C.green, marginBottom: 6 }}>✓ 视频已生成</p>
                <a href={shot.videoUrl} download target="_blank" rel="noreferrer">
                  <Button variant="outline" style={{ fontSize: 12, borderColor: C.greenBorder, color: C.green, height: 30, gap: 4 }}>
                    <Download size={12} /> 下载视频
                  </Button>
                </a>
              </div>
            ) : (
              <div style={{ padding: "12px", background: "oklch(0.18 0.006 240)", border: `1px solid ${C.border}`, borderRadius: 8, textAlign: "center" }}>
                <Video size={24} style={{ color: C.mutedDim, margin: "0 auto 8px" }} />
                <p style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Seedance 1.5 Pro</p>
                <p style={{ fontSize: 11, color: "oklch(0.35 0.008 240)" }}>API 接入中，敬请期待</p>
                <Button
                  disabled
                  style={{ marginTop: 10, background: C.green, color: "oklch(0.08 0.005 240)", fontWeight: 700, fontSize: 12, gap: 5, opacity: 0.5 }}
                >
                  <Video size={13} /> 生成视频（即将上线）
                </Button>
              </div>
            )}

            {/* Video Ref Assets */}
            {allAssets.filter(a => a.isGlobalRef).length > 0 && (
              <div>
                <label style={{ fontSize: 10, color: C.muted, marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  视频分镜素材
                </label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {allAssets.filter(a => a.isGlobalRef).map(asset => {
                    const thumb = asset.mainImageUrl || asset.mjImageUrl;
                    return (
                      <div key={asset.id} style={{
                        width: 64, borderRadius: 6, overflow: "hidden",
                        border: `2px solid ${C.greenBorder}`, background: "oklch(0.12 0.005 240)",
                      }}>
                        <div style={{ aspectRatio: "9/16" }}>
                          {thumb ? (
                            <img src={thumb} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Users size={16} style={{ color: C.mutedDim }} />
                            </div>
                          )}
                        </div>
                        <p style={{ fontSize: 9, color: C.green, textAlign: "center", padding: "3px 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 底部镜头条 ───────────────────────────────────────────────────────────────
function ShotStrip({ shots, activeShotId, onSelect, project }: {
  shots: ScriptShot[];
  activeShotId: number | null;
  onSelect: (id: number) => void;
  project: OverseasProject;
}) {
  const isPortrait = project.aspectRatio === "portrait";
  const stripRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!stripRef.current) return;
    stripRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  return (
    <div style={{
      height: 120, background: C.surface, borderTop: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", flexShrink: 0, position: "relative",
    }}>
      {/* Scroll Left */}
      <button
        onClick={() => scroll("left")}
        style={{ position: "absolute", left: 6, zIndex: 2, width: 28, height: 28, borderRadius: "50%", background: "oklch(0.20 0.006 240)", border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}
      >
        <ChevronLeft size={14} />
      </button>

      {/* Strip */}
      <div
        ref={stripRef}
        style={{
          display: "flex", gap: 8, overflowX: "auto", padding: "8px 40px",
          scrollbarWidth: "none", flex: 1,
        }}
      >
        {shots.map((shot, idx) => {
          const isActive = shot.id === activeShotId || (!activeShotId && idx === 0);
          const thumb = shot.firstFrameUrl;
          const hasVideo = !!shot.videoUrl;

          return (
            <div
              key={shot.id}
              onClick={() => onSelect(shot.id)}
              style={{
                flexShrink: 0, width: isPortrait ? 56 : 96, height: 96,
                borderRadius: 8, overflow: "hidden", cursor: "pointer",
                border: `2px solid ${isActive ? C.green : C.border}`,
                background: "oklch(0.12 0.005 240)", position: "relative",
                transition: "border-color 0.15s",
              }}
            >
              {thumb ? (
                <img src={thumb} alt={`镜头 ${shot.shotNumber}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ImageIcon size={16} style={{ color: C.mutedDim }} />
                </div>
              )}
              {/* Shot Number */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "oklch(0.08 0.005 240 / 0.85)", padding: "2px 4px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 9, color: isActive ? C.green : C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                  {shot.episodeNumber}.{shot.shotNumber}
                </span>
                {hasVideo && <Play size={8} style={{ color: C.green }} />}
              </div>
              {/* Status dot */}
              {shot.status === "generating_frame" || shot.status === "generating_video" ? (
                <div style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: "50%", background: C.amber }} />
              ) : shot.status === "done" ? (
                <div style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: "50%", background: C.green }} />
              ) : null}
            </div>
          );
        })}

        {/* Add Shot */}
        <div
          style={{
            flexShrink: 0, width: isPortrait ? 56 : 96, height: 96,
            borderRadius: 8, border: `2px dashed ${C.border}`, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
            color: C.muted, background: "transparent", transition: "all 0.15s",
          }}
          onClick={() => toast.info("功能开发中：手动添加镜头")}
        >
          <Plus size={16} />
          <span style={{ fontSize: 9 }}>添加</span>
        </div>
      </div>

      {/* Scroll Right */}
      <button
        onClick={() => scroll("right")}
        style={{ position: "absolute", right: 6, zIndex: 2, width: 28, height: 28, borderRadius: "50%", background: "oklch(0.20 0.006 240)", border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
