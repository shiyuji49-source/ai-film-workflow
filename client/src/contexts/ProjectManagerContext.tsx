// DESIGN: "鎏光机" 导演手册工业风暗色系 — Multi-Project Manager Context
// Manages a list of projects, each containing a full ProjectState snapshot.
// Persists to localStorage automatically.

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type {
  ProjectInfo, ScriptAnalysis, Character, EpisodeAsset, Shot, VideoSegment,
} from "./ProjectContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectSnapshot {
  id: string;
  createdAt: number;
  updatedAt: number;
  projectInfo: ProjectInfo;
  scriptText: string;
  scriptAnalysis: ScriptAnalysis;
  characters: Character[];
  episodeAssets: EpisodeAsset[];
  shots: Shot[];
  videoSegments: VideoSegment[];
  activePhase: string;
  completedPhases: string[];  // serialized Set
}

interface ProjectManagerContextType {
  projects: ProjectSnapshot[];
  activeProjectId: string | null;

  createProject: () => string;
  duplicateProject: (id: string) => string;
  deleteProject: (id: string) => void;
  switchProject: (id: string) => void;
  updateProjectSnapshot: (snapshot: Partial<ProjectSnapshot>) => void;
  exportProjectMarkdown: (id: string) => void;
  exportProjectJSON: (id: string) => void;
  importProjectJSON: (json: string) => void;
  getShareLink: (id: string) => string;
  importFromShareLink: (hash: string) => void;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "liuguangji_projects_v1";
const ACTIVE_KEY = "liuguangji_active_project_v1";

function loadProjects(): ProjectSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProjectSnapshot[];
  } catch {
    return [];
  }
}

function saveProjects(projects: ProjectSnapshot[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // quota exceeded — silently ignore
  }
}

function nanoid() {
  return Math.random().toString(36).slice(2, 9);
}

function defaultProjectInfo(): ProjectInfo {
  return {
    title: "", type: "", episodes: "", platform: "", ratio: "9:16 竖屏",
    audience: "", selling: "", styleZh: "", styleEn: "",
  };
}

function defaultScriptAnalysis(): ScriptAnalysis {
  return { episodes: [], globalCharacters: [], isAnalyzed: false };
}

function newSnapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  const now = Date.now();
  return {
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
    projectInfo: defaultProjectInfo(),
    scriptText: "",
    scriptAnalysis: defaultScriptAnalysis(),
    characters: [],
    episodeAssets: [],
    shots: [],
    videoSegments: [],
    activePhase: "phase1",
    completedPhases: [],
    ...overrides,
  };
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function buildMarkdown(p: ProjectSnapshot): string {
  const { projectInfo: info, scriptAnalysis, characters, shots, videoSegments } = p;
  const lines: string[] = [];

  lines.push(`# ${info.title || "未命名项目"} — 制作文档`);
  lines.push(`> 由鎏光机 AI 影片工作流工具导出 · ${new Date(p.updatedAt).toLocaleString("zh-CN")}`);
  lines.push("");

  lines.push("## 项目基础信息");
  lines.push(`| 字段 | 内容 |`);
  lines.push(`|------|------|`);
  lines.push(`| 类型 | ${info.type || "-"} |`);
  lines.push(`| 平台 | ${info.platform || "-"} |`);
  lines.push(`| 画面比例 | ${info.ratio || "-"} |`);
  lines.push(`| 目标受众 | ${info.audience || "-"} |`);
  lines.push(`| 核心卖点 | ${info.selling || "-"} |`);
  lines.push(`| 视觉风格 | ${info.styleZh || "-"} |`);
  lines.push("");

  if (characters.length > 0) {
    lines.push("## 角色档案");
    characters.forEach(c => {
      lines.push(`### ${c.name} (${c.role || "未定义"})`);
      lines.push(`- **外貌**: ${c.appearance || "-"}`);
      lines.push(`- **服装**: ${c.costume || "-"}`);
      lines.push(`- **特殊标记**: ${c.marks || "-"}`);
      if (c.promptZh) {
        lines.push("");
        lines.push("**MJ 提示词 (中文)**");
        lines.push("```");
        lines.push(c.promptZh);
        lines.push("```");
      }
      if (c.promptEn) {
        lines.push("");
        lines.push("**MJ Prompt (English)**");
        lines.push("```");
        lines.push(c.promptEn);
        lines.push("```");
      }
      lines.push("");
    });
  }

  if (scriptAnalysis.episodes.length > 0) {
    lines.push("## 分集概要");
    scriptAnalysis.episodes.forEach(ep => {
      lines.push(`### 第 ${ep.number} 集 — ${ep.title}`);
      lines.push(`- **时长**: 约 ${ep.duration} 分钟`);
      lines.push(`- **简介**: ${ep.synopsis}`);
      lines.push(`- **主要场景**: ${ep.scenes.join("、")}`);
      lines.push(`- **关键道具**: ${ep.props.join("、") || "-"}`);
      lines.push(`- **出场角色**: ${ep.characters.join("、") || "-"}`);
      lines.push("");

      const epShots = shots.filter(s => s.episodeId === ep.id);
      if (epShots.length > 0) {
        lines.push("#### 分镜表");
        lines.push("| # | 类型 | 景别 | 运动 | 描述 | 时长 | 情绪 | VO | SFX |");
        lines.push("|---|------|------|------|------|------|------|----|----|");
        epShots.forEach(s => {
          lines.push(`| ${s.number} | ${s.type} | ${s.size} | ${s.movement} | ${s.description} | ${s.duration}s | ${s.emotion} | ${s.vo || "-"} | ${s.sfx || "-"} |`);
        });
        lines.push("");
      }

      const epSegs = videoSegments.filter(s => s.episodeId === ep.id);
      if (epSegs.length > 0) {
        lines.push("#### Seedance 提示词");
        epSegs.forEach((seg, i) => {
          lines.push(`**片段 ${i + 1} — ${seg.name}** (${seg.duration}s)`);
          lines.push("```");
          lines.push(seg.prompt || "[未生成]");
          lines.push("```");
          lines.push("");
        });
      }
    });
  }

  return lines.join("\n");
}

function downloadText(content: string, filename: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProjectManagerContext = createContext<ProjectManagerContextType | null>(null);

export function ProjectManagerProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectSnapshot[]>(() => {
    const loaded = loadProjects();
    return loaded.length > 0 ? loaded : [newSnapshot({ projectInfo: { ...defaultProjectInfo(), title: "我的第一个项目" } })];
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    const saved = localStorage.getItem(ACTIVE_KEY);
    const loaded = loadProjects();
    if (saved && loaded.some(p => p.id === saved)) return saved;
    return loaded.length > 0 ? loaded[0].id : null;
  });

  // Auto-save to localStorage whenever projects change
  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    if (activeProjectId) localStorage.setItem(ACTIVE_KEY, activeProjectId);
  }, [activeProjectId]);

  const createProject = useCallback(() => {
    const snap = newSnapshot();
    setProjects(prev => [snap, ...prev]);
    setActiveProjectId(snap.id);
    return snap.id;
  }, []);

  const duplicateProject = useCallback((id: string) => {
    setProjects(prev => {
      const src = prev.find(p => p.id === id);
      if (!src) return prev;
      const copy = newSnapshot({
        ...src,
        id: nanoid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        projectInfo: { ...src.projectInfo, title: `${src.projectInfo.title || "项目"} (副本)` },
      });
      setActiveProjectId(copy.id);
      return [copy, ...prev];
    });
    return "";
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      if (next.length === 0) {
        const fresh = newSnapshot();
        setActiveProjectId(fresh.id);
        return [fresh];
      }
      setActiveProjectId(curr => {
        if (curr === id) return next[0].id;
        return curr;
      });
      return next;
    });
  }, []);

  const switchProject = useCallback((id: string) => {
    setActiveProjectId(id);
  }, []);

  const updateProjectSnapshot = useCallback((snapshot: Partial<ProjectSnapshot>) => {
    setProjects(prev => prev.map(p =>
      p.id === activeProjectId
        ? { ...p, ...snapshot, updatedAt: Date.now() }
        : p
    ));
  }, [activeProjectId]);

  const exportProjectMarkdown = useCallback((id: string) => {
    const p = projects.find(proj => proj.id === id);
    if (!p) return;
    const md = buildMarkdown(p);
    const name = (p.projectInfo.title || "项目").replace(/[/\\?%*:|"<>]/g, "_");
    downloadText(md, `${name}_制作文档.md`);
  }, [projects]);

  const exportProjectJSON = useCallback((id: string) => {
    const p = projects.find(proj => proj.id === id);
    if (!p) return;
    const json = JSON.stringify(p, null, 2);
    const name = (p.projectInfo.title || "项目").replace(/[/\\?%*:|"<>]/g, "_");
    downloadText(json, `${name}_项目文件.json`, "application/json");
  }, [projects]);

  const importProjectJSON = useCallback((json: string) => {
    try {
      const data = JSON.parse(json) as ProjectSnapshot;
      const snap = newSnapshot({ ...data, id: nanoid(), updatedAt: Date.now() });
      setProjects(prev => [snap, ...prev]);
      setActiveProjectId(snap.id);
    } catch {
      // invalid JSON — caller should show error
    }
  }, []);

  const getShareLink = useCallback((id: string) => {
    const p = projects.find(proj => proj.id === id);
    if (!p) return "";
    const encoded = btoa(encodeURIComponent(JSON.stringify(p)));
    return `${window.location.origin}/#share=${encoded}`;
  }, [projects]);

  const importFromShareLink = useCallback((hash: string) => {
    try {
      const encoded = hash.replace(/^#?share=/, "");
      const json = decodeURIComponent(atob(encoded));
      const data = JSON.parse(json) as ProjectSnapshot;
      const snap = newSnapshot({ ...data, id: nanoid(), updatedAt: Date.now() });
      setProjects(prev => [snap, ...prev]);
      setActiveProjectId(snap.id);
    } catch {
      // invalid share link
    }
  }, []);

  return (
    <ProjectManagerContext.Provider value={{
      projects, activeProjectId,
      createProject, duplicateProject, deleteProject, switchProject,
      updateProjectSnapshot, exportProjectMarkdown, exportProjectJSON,
      importProjectJSON, getShareLink, importFromShareLink,
    }}>
      {children}
    </ProjectManagerContext.Provider>
  );
}

export function useProjectManager() {
  const ctx = useContext(ProjectManagerContext);
  if (!ctx) throw new Error("useProjectManager must be used within ProjectManagerProvider");
  return ctx;
}
