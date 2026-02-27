// DESIGN: "导演手册" 工业风暗色系 — Project State Context
import React, { createContext, useContext, useState, useCallback } from "react";

export interface ProjectInfo {
  title: string;
  type: string;
  episodes: string;
  platform: string;
  ratio: string;
  audience: string;
  selling: string;
  styleZh: string;
  styleEn: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  appearance: string;
  costume: string;
  marks: string;
}

export interface Shot {
  id: string;
  number: string;
  type: string;
  size: string;
  movement: string;
  description: string;
  vo: string;
  sfx: string;
  duration: string;
  emotion: string;
  promptZh: string;
  promptEn: string;
}

export interface VideoSegment {
  id: string;
  name: string;
  shots: string; // e.g. "1-3"
  duration: string;
  prompt: string;
}

interface ProjectContextType {
  projectInfo: ProjectInfo;
  characters: Character[];
  shots: Shot[];
  videoSegments: VideoSegment[];
  activePhase: string;
  completedPhases: Set<string>;
  setActivePhase: (phase: string) => void;
  updateProjectInfo: (info: Partial<ProjectInfo>) => void;
  addCharacter: () => void;
  updateCharacter: (id: string, data: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
  addShot: () => void;
  updateShot: (id: string, data: Partial<Shot>) => void;
  removeShot: (id: string) => void;
  addVideoSegment: () => void;
  updateVideoSegment: (id: string, data: Partial<VideoSegment>) => void;
  removeVideoSegment: (id: string) => void;
  markPhaseComplete: (phase: string) => void;
  generateCharacterPrompt: (char: Character, styleZh: string, styleEn: string) => { zh: string; en: string };
  generateVideoPrompt: (segment: VideoSegment, shots: Shot[], styleZh: string) => string;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

const nanoid = () => Math.random().toString(36).slice(2, 9);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    title: "", type: "", episodes: "", platform: "", ratio: "9:16",
    audience: "", selling: "", styleZh: "", styleEn: "",
  });
  const [characters, setCharacters] = useState<Character[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [activePhase, setActivePhase] = useState("phase1");
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(() => new Set<string>());

  const updateProjectInfo = useCallback((info: Partial<ProjectInfo>) => {
    setProjectInfo(prev => ({ ...prev, ...info }));
  }, []);

  const addCharacter = useCallback(() => {
    setCharacters(prev => [...prev, {
      id: nanoid(), name: "", role: "", appearance: "", costume: "", marks: ""
    }]);
  }, []);

  const updateCharacter = useCallback((id: string, data: Partial<Character>) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const removeCharacter = useCallback((id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  }, []);

  const addShot = useCallback(() => {
    const num = shots.length + 1;
    setShots(prev => [...prev, {
      id: nanoid(), number: String(num).padStart(2, "0"),
      type: "定场镜头", size: "全景", movement: "固定",
      description: "", vo: "", sfx: "", duration: "3", emotion: "", promptZh: "", promptEn: "",
    }]);
  }, [shots.length]);

  const updateShot = useCallback((id: string, data: Partial<Shot>) => {
    setShots(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }, []);

  const removeShot = useCallback((id: string) => {
    setShots(prev => prev.filter(s => s.id !== id));
  }, []);

  const addVideoSegment = useCallback(() => {
    setVideoSegments(prev => [...prev, {
      id: nanoid(), name: `片段 ${prev.length + 1}`, shots: "", duration: "12", prompt: "",
    }]);
  }, []);

  const updateVideoSegment = useCallback((id: string, data: Partial<VideoSegment>) => {
    setVideoSegments(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }, []);

  const removeVideoSegment = useCallback((id: string) => {
    setVideoSegments(prev => prev.filter(s => s.id !== id));
  }, []);

  const markPhaseComplete = useCallback((phase: string) => {
    setCompletedPhases(prev => { const next = new Set<string>(Array.from(prev)); next.add(phase); return next; });
  }, []);

  const generateCharacterPrompt = useCallback((char: Character, styleZh: string, styleEn: string) => {
    const zh = `角色设计参考图，干净的深灰色背景，画幅分为左右两部分。\n左侧部分：${char.name || "角色"}的电影级特写肖像，${char.appearance || "[面部特征]"}，专注而坚定的表情，电影级侧光照明。\n右侧部分：同一角色的标准三视图（正面、侧面、背面），全身站姿，采用标准正交视图。清晰展示${char.costume || "[服装描述]"}，${char.role || "[体型特征]"}${char.marks ? `，特殊标记：${char.marks}` : ""}。\n整体要求：左右两部分的角色设计、比例、细节必须完全一致。\n${styleZh || "[视觉风格标签]"}`;

    const en = `Character design sheet, clean dark gray background, frame split into two parts.\nLeft side: A cinematic close-up portrait of ${char.name || "the character"}, ${char.appearance || "[facial features]"}, focused and determined expression, cinematic side lighting.\nRight side: A standard orthographic three-view turnaround (front, side, back) of the same character in a full-body standing pose. Clearly showing ${char.costume || "[clothing]"}, ${char.role || "[body type]"}${char.marks ? `, special marks: ${char.marks}` : ""}.\nOverall requirement: The character design, proportions, and details must be perfectly consistent between the left and right parts.\n${styleEn || "[Style tag]"}`;

    return { zh, en };
  }, []);

  const generateVideoPrompt = useCallback((segment: VideoSegment, relatedShots: Shot[], styleZh: string) => {
    const dur = segment.duration || "12";
    const shotCount = relatedShots.length;
    let prompt = `一个${dur}秒的视频片段，包含${shotCount || 3}个镜头：\n`;

    if (relatedShots.length > 0) {
      relatedShots.forEach((shot, i) => {
        prompt += `镜头${i + 1}：${shot.size}，${shot.description || "[画面描述]"}。${shot.movement !== "固定" ? `镜头${shot.movement}。` : ""}\n`;
      });
      const voShots = relatedShots.filter(s => s.vo);
      const sfxShots = relatedShots.filter(s => s.sfx);
      if (voShots.length > 0) {
        prompt += `VO: "${voShots.map(s => s.vo).join(" ")}"\n`;
      }
      if (sfxShots.length > 0) {
        prompt += `SFX: ${sfxShots.map(s => s.sfx).join("，")}\n`;
      }
      const emotions = Array.from(new Set(relatedShots.filter(s => s.emotion).map(s => s.emotion)));
      if (emotions.length > 0) {
        prompt += `整体氛围：${emotions.join("、")}。\n`;
      }
    } else {
      prompt += `镜头1：[景别]，[画面描述]。\n镜头2：[景别]，[画面描述]。\n镜头3：[景别]，[画面描述]。\n`;
      prompt += `VO: "[旁白内容]"\nSFX: [音效描述]\n整体氛围：[情绪关键词]。\n`;
    }

    prompt += styleZh || "[视觉风格标签]";
    return prompt;
  }, []);

  return (
    <ProjectContext.Provider value={{
      projectInfo, characters, shots, videoSegments,
      activePhase, completedPhases,
      setActivePhase, updateProjectInfo,
      addCharacter, updateCharacter, removeCharacter,
      addShot, updateShot, removeShot,
      addVideoSegment, updateVideoSegment, removeVideoSegment,
      markPhaseComplete,
      generateCharacterPrompt, generateVideoPrompt,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
