// DESIGN: 出海真人短剧图生视频工作流 — 工业风暗色系（与鎏光机主工作流一致）
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Film, Plus, Trash2, ChevronRight, ChevronDown, ChevronUp,
  Wand2, ImageIcon, Video, Upload, Edit3, Check, X,
  Loader2, Globe, Clapperboard, ArrowLeft, RefreshCw,
  Copy, Download, Play, AlertCircle, Sparkles
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
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="outline"
              onClick={() => setShowScriptInput(!showScriptInput)}
              style={{ borderColor: C.border, color: C.muted, fontSize: 12, gap: 6 }}
            >
              <Upload size={13} /> {episodeShots.length > 0 ? "重新解析剧本" : "导入剧本"}
            </Button>
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
                <label style={{ fontSize: 11, color: C.muted, marginBottom: 10, display: "block", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  STEP 1 — 首尾帧图片（Nano Banana Pro）
                </label>
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
                      generateFrame.mutate({ shotId: shot.id, frameType: "first" });
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
                      generateFrame.mutate({ shotId: shot.id, frameType: "last" });
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
