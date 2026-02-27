// DESIGN: "鎏光机" 导演手册工业风暗色系 — Single-Project Context (v3)
// Now backed by ProjectManagerContext for multi-project support + localStorage persistence.
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useProjectManager } from "./ProjectManagerContext";

// ─── Core Types ───────────────────────────────────────────────────────────────

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

export interface Episode {
  id: string;
  number: number;
  title: string;
  duration: number;
  synopsis: string;
  scenes: string[];
  props: string[];
  characters: string[];
}

export interface Character {
  id: string;
  name: string;
  role: string;
  appearance: string;
  costume: string;
  marks: string;
  promptZh: string;
  promptEn: string;
}

export interface EpisodeAsset {
  id: string;
  episodeId: string;
  type: "scene" | "prop";
  name: string;
  description: string;
  promptMJ: string;
}

export interface Shot {
  id: string;
  episodeId: string;
  number: number;
  type: string;
  size: string;
  movement: string;
  description: string;
  vo: string;
  sfx: string;
  duration: number;
  emotion: string;
  emotionLevel: number;
}

export interface VideoSegment {
  id: string;
  episodeId: string;
  name: string;
  shotIds: string[];
  duration: number;
  prompt: string;
}

export interface ScriptAnalysis {
  episodes: Episode[];
  globalCharacters: string[];
  isAnalyzed: boolean;
}

// ─── Context Type ─────────────────────────────────────────────────────────────

interface ProjectContextType {
  projectInfo: ProjectInfo;
  scriptText: string;
  scriptAnalysis: ScriptAnalysis;
  characters: Character[];
  episodeAssets: EpisodeAsset[];
  shots: Shot[];
  videoSegments: VideoSegment[];
  activePhase: string;
  activeEpisodeId: string;
  completedPhases: Set<string>;

  setActivePhase: (phase: string) => void;
  setActiveEpisodeId: (id: string) => void;
  updateProjectInfo: (info: Partial<ProjectInfo>) => void;

  setScriptText: (text: string) => void;
  analyzeScript: () => void;
  updateEpisode: (id: string, data: Partial<Episode>) => void;

  addCharacter: (name?: string) => void;
  updateCharacter: (id: string, data: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
  generateCharacterPrompt: (char: Character) => { zh: string; en: string };

  addEpisodeAsset: (episodeId: string, type: "scene" | "prop") => void;
  updateEpisodeAsset: (id: string, data: Partial<EpisodeAsset>) => void;
  removeEpisodeAsset: (id: string) => void;
  generateAssetPromptMJ: (asset: EpisodeAsset) => string;

  addShot: (episodeId: string) => void;
  updateShot: (id: string, data: Partial<Shot>) => void;
  removeShot: (id: string) => void;
  autoGenerateShots: (episodeId: string) => void;

  addVideoSegment: (episodeId: string) => void;
  updateVideoSegment: (id: string, data: Partial<VideoSegment>) => void;
  removeVideoSegment: (id: string) => void;
  autoGenerateSegments: (episodeId: string) => void;
  generateSegmentPrompt: (segId: string) => string;

  markPhaseComplete: (phase: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nanoid = () => Math.random().toString(36).slice(2, 9);

const SHOT_TEMPLATES_BY_TYPE: Record<string, Array<{
  type: string; size: string; movement: string; emotion: string; emotionLevel: number;
  descTemplate: string; sfxTemplate: string;
}>> = {
  "短剧": [
    { type: "定场镜头", size: "大远景", movement: "固定", emotion: "平静", emotionLevel: 1, descTemplate: "场景全貌，交代环境与时间", sfxTemplate: "环境背景音" },
    { type: "逻辑镜头", size: "全景", movement: "固定", emotion: "平静", emotionLevel: 1, descTemplate: "角色登场，交代人物关系", sfxTemplate: "脚步声，环境音" },
    { type: "Action镜头", size: "中景", movement: "推（Dolly In）", emotion: "紧张", emotionLevel: 3, descTemplate: "核心冲突爆发，角色做出关键行动", sfxTemplate: "戏剧性音效" },
    { type: "Reaction镜头", size: "近景", movement: "固定", emotion: "紧张", emotionLevel: 3, descTemplate: "对方角色的震惊反应", sfxTemplate: "静默或心跳声" },
    { type: "Action镜头", size: "中近景", movement: "固定", emotion: "热血、燃", emotionLevel: 4, descTemplate: "主角反击或做出决定", sfxTemplate: "动作音效" },
    { type: "Reaction镜头", size: "特写", movement: "推（Dolly In）", emotion: "热血、燃", emotionLevel: 5, descTemplate: "主角眼神特写，坚定决心", sfxTemplate: "情绪音效" },
  ],
  "动画": [
    { type: "定场镜头", size: "大远景", movement: "航拍（Aerial）", emotion: "史诗、磅礴", emotionLevel: 3, descTemplate: "宏大的动画世界全景，确立世界观", sfxTemplate: "史诗背景音乐起" },
    { type: "逻辑镜头", size: "远景", movement: "降（Crane Down）", emotion: "神秘、悬疑", emotionLevel: 2, descTemplate: "镜头下降聚焦到主角所在地点", sfxTemplate: "风声，环境音" },
    { type: "Action镜头", size: "全景", movement: "跟（Follow）", emotion: "热血、燃", emotionLevel: 3, descTemplate: "主角行动，展示角色能力", sfxTemplate: "动作音效，能量音效" },
    { type: "Reaction镜头", size: "中近景", movement: "固定", emotion: "神圣、觉醒", emotionLevel: 4, descTemplate: "关键人物的震惊与敬畏", sfxTemplate: "静默" },
    { type: "Action镜头", size: "中景", movement: "环绕（Orbit）", emotion: "神圣、觉醒", emotionLevel: 5, descTemplate: "主角技能爆发或变身，能量特效", sfxTemplate: "爆发音效，能量冲击波" },
    { type: "旁跳镜头", size: "特写", movement: "固定", emotion: "史诗、磅礴", emotionLevel: 4, descTemplate: "关键道具或标志性元素特写", sfxTemplate: "余韵音效" },
  ],
  "广告": [
    { type: "定场镜头", size: "全景", movement: "推（Dolly In）", emotion: "温暖、亲密", emotionLevel: 2, descTemplate: "品牌场景建立，产品所在环境", sfxTemplate: "轻快背景音乐" },
    { type: "Action镜头", size: "中景", movement: "固定", emotion: "温暖、亲密", emotionLevel: 3, descTemplate: "用户使用产品的自然场景", sfxTemplate: "产品使用音效" },
    { type: "旁跳镜头", size: "大特写", movement: "推（Dolly In）", emotion: "神圣、觉醒", emotionLevel: 4, descTemplate: "产品核心卖点特写展示", sfxTemplate: "清脆提示音" },
    { type: "Reaction镜头", size: "近景", movement: "固定", emotion: "温暖、亲密", emotionLevel: 5, descTemplate: "用户满意的表情与反应", sfxTemplate: "愉悦音效" },
  ],
  "default": [
    { type: "定场镜头", size: "大远景", movement: "固定", emotion: "平静", emotionLevel: 1, descTemplate: "场景全貌，交代时间地点", sfxTemplate: "环境背景音" },
    { type: "逻辑镜头", size: "全景", movement: "固定", emotion: "平静", emotionLevel: 2, descTemplate: "人物登场，交代关系", sfxTemplate: "脚步声" },
    { type: "Action镜头", size: "中景", movement: "推（Dolly In）", emotion: "紧张", emotionLevel: 3, descTemplate: "核心事件发生", sfxTemplate: "戏剧音效" },
    { type: "Reaction镜头", size: "近景", movement: "固定", emotion: "紧张", emotionLevel: 3, descTemplate: "角色反应", sfxTemplate: "静默" },
    { type: "Action镜头", size: "中近景", movement: "固定", emotion: "热血、燃", emotionLevel: 4, descTemplate: "高潮动作", sfxTemplate: "动作音效" },
    { type: "旁跳镜头", size: "特写", movement: "固定", emotion: "史诗、磅礴", emotionLevel: 5, descTemplate: "关键细节特写", sfxTemplate: "余韵" },
  ],
};

function parseScript(text: string, projectType: string): ScriptAnalysis {
  if (!text.trim()) return { episodes: [], globalCharacters: [], isAnalyzed: false };
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const episodes: Episode[] = [];
  const allChars = new Set<string>();
  const epRegex = /^(第\s*[一二三四五六七八九十百\d]+\s*集|EP\s*\d+|Episode\s*\d+|第\s*\d+\s*集)/i;
  const charRegex = /【([^】]{1,10})】|「([^」]{1,10})」|^([^\s：:，,。.！!？?]{1,8})[：:]/;
  let currentEpLines: string[] = [];
  let currentEpTitle = "";
  let epNum = 0;

  const flushEpisode = () => {
    if (!currentEpLines.length && !currentEpTitle) return;
    epNum++;
    const content = currentEpLines.join(" ");
    const chars: string[] = [];
    currentEpLines.forEach(line => {
      const m = line.match(charRegex);
      if (m) {
        const name = m[1] || m[2] || m[3];
        if (name && name.length <= 8) { chars.push(name); allChars.add(name); }
      }
    });
    const sceneWords = ["室内", "室外", "夜晚", "白天", "森林", "城市", "学校", "家", "战场", "宫殿", "街道", "山顶", "海边", "地下", "天空"];
    const scenes = sceneWords.filter(w => content.includes(w)).slice(0, 4);
    const propWords = ["剑", "枪", "书", "信", "戒指", "面具", "地图", "钥匙", "手机", "车", "船", "飞机", "药", "符文", "魔法阵"];
    const props = propWords.filter(w => content.includes(w)).slice(0, 3);
    const duration = Math.max(1, Math.min(5, Math.round(content.length / 150)));
    episodes.push({
      id: nanoid(), number: epNum, title: currentEpTitle || `第${epNum}集`,
      duration, synopsis: content.slice(0, 200) + (content.length > 200 ? "..." : ""),
      scenes: scenes.length ? scenes : ["主要场景"],
      props: props.length ? props : [],
      characters: Array.from(new Set(chars)),
    });
    currentEpLines = [];
    currentEpTitle = "";
  };

  const hasEpMarkers = lines.some(l => epRegex.test(l));
  if (!hasEpMarkers) {
    const chars: string[] = [];
    lines.forEach(line => {
      const m = line.match(charRegex);
      if (m) {
        const name = m[1] || m[2] || m[3];
        if (name && name.length <= 8) { chars.push(name); allChars.add(name); }
      }
    });
    const sceneWords = ["室内", "室外", "夜晚", "白天", "森林", "城市", "学校", "家", "战场", "宫殿", "街道", "山顶", "海边", "地下", "天空"];
    const scenes = sceneWords.filter(w => text.includes(w)).slice(0, 4);
    const propWords = ["剑", "枪", "书", "信", "戒指", "面具", "地图", "钥匙", "手机", "车", "船", "飞机", "药", "符文", "魔法阵"];
    const props = propWords.filter(w => text.includes(w)).slice(0, 3);
    const duration = Math.max(1, Math.min(5, Math.round(text.length / 150)));
    episodes.push({
      id: nanoid(), number: 1, title: "第1集",
      duration, synopsis: text.slice(0, 200) + (text.length > 200 ? "..." : ""),
      scenes: scenes.length ? scenes : ["主要场景"],
      props: props.length ? props : [],
      characters: Array.from(new Set(chars)),
    });
  } else {
    for (const line of lines) {
      if (epRegex.test(line)) { flushEpisode(); currentEpTitle = line; }
      else {
        currentEpLines.push(line);
        const m = line.match(charRegex);
        if (m) {
          const name = m[1] || m[2] || m[3];
          if (name && name.length <= 8) allChars.add(name);
        }
      }
    }
    flushEpisode();
  }
  return { episodes, globalCharacters: Array.from(allChars).filter(n => n.length >= 2), isAnalyzed: true };
}

function autoGenerateShotsForEpisode(episode: Episode, projectType: string): Shot[] {
  const templates = SHOT_TEMPLATES_BY_TYPE[projectType] || SHOT_TEMPLATES_BY_TYPE["default"];
  const targetShots = Math.round(episode.duration * 25);
  const shots: Shot[] = [];
  const cycles = Math.ceil(targetShots / templates.length);
  let shotNum = 0;
  for (let c = 0; c < cycles && shots.length < targetShots; c++) {
    for (const tpl of templates) {
      if (shots.length >= targetShots) break;
      shotNum++;
      const dur = tpl.emotionLevel >= 4 ? 2 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 2);
      const sceneHint = episode.scenes[shotNum % episode.scenes.length] || "主要场景";
      const charHint = episode.characters[shotNum % Math.max(1, episode.characters.length)] || "主角";
      shots.push({
        id: nanoid(), episodeId: episode.id, number: shotNum,
        type: tpl.type, size: tpl.size, movement: tpl.movement,
        description: `${sceneHint}，${charHint}，${tpl.descTemplate}`,
        vo: shotNum % 5 === 0 ? `[第${episode.number}集旁白${Math.ceil(shotNum / 5)}]` : "",
        sfx: tpl.sfxTemplate, duration: dur,
        emotion: tpl.emotion, emotionLevel: tpl.emotionLevel,
      });
    }
  }
  return shots;
}

function autoGenerateSegmentsFromShots(shots: Shot[], episodeId: string): VideoSegment[] {
  const segments: VideoSegment[] = [];
  let i = 0, segNum = 1;
  while (i < shots.length) {
    const groupShots: Shot[] = [];
    let totalDur = 0;
    while (i < shots.length && groupShots.length < 5 && totalDur + shots[i].duration <= 15) {
      groupShots.push(shots[i]); totalDur += shots[i].duration; i++;
    }
    if (groupShots.length === 0) { i++; continue; }
    segments.push({
      id: nanoid(), episodeId,
      name: `片段${segNum}（镜头${groupShots[0].number}-${groupShots[groupShots.length - 1].number}）`,
      shotIds: groupShots.map(s => s.id), duration: totalDur, prompt: "",
    });
    segNum++;
  }
  return segments;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const manager = useProjectManager();
  const activeSnap = manager.projects.find(p => p.id === manager.activeProjectId);

  // Local state mirrors the active snapshot; syncs to manager on every change
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(
    activeSnap?.projectInfo ?? { title: "", type: "", episodes: "", platform: "", ratio: "9:16 竖屏", audience: "", selling: "", styleZh: "", styleEn: "" }
  );
  const [scriptText, setScriptTextState] = useState(activeSnap?.scriptText ?? "");
  const [scriptAnalysis, setScriptAnalysis] = useState<ScriptAnalysis>(
    activeSnap?.scriptAnalysis ?? { episodes: [], globalCharacters: [], isAnalyzed: false }
  );
  const [characters, setCharacters] = useState<Character[]>(activeSnap?.characters ?? []);
  const [episodeAssets, setEpisodeAssets] = useState<EpisodeAsset[]>(activeSnap?.episodeAssets ?? []);
  const [shots, setShots] = useState<Shot[]>(activeSnap?.shots ?? []);
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>(activeSnap?.videoSegments ?? []);
  const [activePhase, setActivePhaseState] = useState(activeSnap?.activePhase ?? "phase1");
  const [activeEpisodeId, setActiveEpisodeId] = useState("");
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(
    () => new Set<string>(activeSnap?.completedPhases ?? [])
  );

  // When active project changes in manager, reload all local state
  useEffect(() => {
    const snap = manager.projects.find(p => p.id === manager.activeProjectId);
    if (!snap) return;
    setProjectInfo(snap.projectInfo);
    setScriptTextState(snap.scriptText);
    setScriptAnalysis(snap.scriptAnalysis);
    setCharacters(snap.characters);
    setEpisodeAssets(snap.episodeAssets);
    setShots(snap.shots);
    setVideoSegments(snap.videoSegments);
    setActivePhaseState(snap.activePhase);
    setCompletedPhases(new Set<string>(snap.completedPhases));
    if (snap.scriptAnalysis.episodes.length > 0) {
      setActiveEpisodeId(snap.scriptAnalysis.episodes[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager.activeProjectId]);

  // Sync all state changes back to manager (debounced via useEffect)
  useEffect(() => {
    manager.updateProjectSnapshot({
      projectInfo, scriptText, scriptAnalysis, characters,
      episodeAssets, shots, videoSegments,
      activePhase, completedPhases: Array.from(completedPhases),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectInfo, scriptText, scriptAnalysis, characters, episodeAssets, shots, videoSegments, activePhase, completedPhases]);

  const setActivePhase = useCallback((phase: string) => setActivePhaseState(phase), []);

  const updateProjectInfo = useCallback((info: Partial<ProjectInfo>) => {
    setProjectInfo(prev => ({ ...prev, ...info }));
  }, []);

  const setScriptText = useCallback((text: string) => setScriptTextState(text), []);

  const analyzeScript = useCallback(() => {
    const analysis = parseScript(scriptText, projectInfo.type);
    setScriptAnalysis(analysis);
    if (analysis.episodes.length > 0) setActiveEpisodeId(analysis.episodes[0].id);
    if (analysis.globalCharacters.length > 0) {
      setCharacters(analysis.globalCharacters.map(name => ({
        id: nanoid(), name, role: "", appearance: "", costume: "", marks: "", promptZh: "", promptEn: "",
      })));
    }
    const newAssets: EpisodeAsset[] = [];
    analysis.episodes.forEach(ep => {
      ep.scenes.forEach(scene => newAssets.push({ id: nanoid(), episodeId: ep.id, type: "scene", name: scene, description: `第${ep.number}集主要场景`, promptMJ: "" }));
      ep.props.forEach(prop => newAssets.push({ id: nanoid(), episodeId: ep.id, type: "prop", name: prop, description: `第${ep.number}集关键道具`, promptMJ: "" }));
    });
    setEpisodeAssets(newAssets);
  }, [scriptText, projectInfo.type]);

  const updateEpisode = useCallback((id: string, data: Partial<Episode>) => {
    setScriptAnalysis(prev => ({ ...prev, episodes: prev.episodes.map(e => e.id === id ? { ...e, ...data } : e) }));
  }, []);

  const addCharacter = useCallback((name = "") => {
    setCharacters(prev => [...prev, { id: nanoid(), name, role: "", appearance: "", costume: "", marks: "", promptZh: "", promptEn: "" }]);
  }, []);

  const updateCharacter = useCallback((id: string, data: Partial<Character>) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const removeCharacter = useCallback((id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  }, []);

  const generateCharacterPrompt = useCallback((char: Character) => {
    const zh = `角色设计参考图，干净的深灰色背景，画幅分为左右两部分。\n左侧部分：${char.name || "角色"}的电影级特写肖像，${char.appearance || "[面部特征]"}，专注而坚定的表情，电影级侧光照明。\n右侧部分：同一角色的标准三视图（正面、侧面、背面），全身站姿，采用标准正交视图。清晰展示${char.costume || "[服装描述]"}，${char.role || "[体型特征]"}${char.marks ? `，特殊标记：${char.marks}` : ""}。\n整体要求：左右两部分的角色设计、比例、细节必须完全一致。\n${projectInfo.styleZh || "[视觉风格标签]"}`;
    const en = `Character design sheet, clean dark gray background, frame split into two parts.\nLeft side: A cinematic close-up portrait of ${char.name || "the character"}, ${char.appearance || "[facial features]"}, focused and determined expression, cinematic side lighting.\nRight side: A standard orthographic three-view turnaround (front, side, back) of the same character in a full-body standing pose. Clearly showing ${char.costume || "[clothing]"}, ${char.role || "[body type]"}${char.marks ? `, special marks: ${char.marks}` : ""}.\nOverall requirement: The character design, proportions, and details must be perfectly consistent between the left and right parts.\n${projectInfo.styleEn || "[Style tag]"}`;
    return { zh, en };
  }, [projectInfo.styleZh, projectInfo.styleEn]);

  const addEpisodeAsset = useCallback((episodeId: string, type: "scene" | "prop") => {
    setEpisodeAssets(prev => [...prev, { id: nanoid(), episodeId, type, name: "", description: "", promptMJ: "" }]);
  }, []);

  const updateEpisodeAsset = useCallback((id: string, data: Partial<EpisodeAsset>) => {
    setEpisodeAssets(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
  }, []);

  const removeEpisodeAsset = useCallback((id: string) => {
    setEpisodeAssets(prev => prev.filter(a => a.id !== id));
  }, []);

  const generateAssetPromptMJ = useCallback((asset: EpisodeAsset) => {
    if (asset.type === "scene") {
      return `${asset.name}场景设计图，${asset.description || "宏大壮观的场景"}，电影级构图，精细环境细节，多角度展示，无人物，纯场景参考。${projectInfo.styleZh || "[视觉风格标签]"} --ar 16:9`;
    }
    return `${asset.name}道具设计图，${asset.description || "精致的道具"}，白色或深灰色纯净背景，多角度展示（正面、侧面、细节），高精度材质渲染。${projectInfo.styleZh || "[视觉风格标签]"} --ar 1:1`;
  }, [projectInfo.styleZh]);

  const addShot = useCallback((episodeId: string) => {
    setShots(prev => {
      const epShots = prev.filter(s => s.episodeId === episodeId);
      return [...prev, { id: nanoid(), episodeId, number: epShots.length + 1, type: "定场镜头", size: "全景", movement: "固定", description: "", vo: "", sfx: "", duration: 3, emotion: "平静", emotionLevel: 2 }];
    });
  }, []);

  const updateShot = useCallback((id: string, data: Partial<Shot>) => {
    setShots(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }, []);

  const removeShot = useCallback((id: string) => {
    setShots(prev => prev.filter(s => s.id !== id));
  }, []);

  const autoGenerateShots = useCallback((episodeId: string) => {
    const episode = scriptAnalysis.episodes.find(e => e.id === episodeId);
    if (!episode) return;
    setShots(prev => {
      const others = prev.filter(s => s.episodeId !== episodeId);
      return [...others, ...autoGenerateShotsForEpisode(episode, projectInfo.type)];
    });
    setVideoSegments(prev => prev.filter(s => s.episodeId !== episodeId));
  }, [scriptAnalysis.episodes, projectInfo.type]);

  const addVideoSegment = useCallback((episodeId: string) => {
    setVideoSegments(prev => {
      const epSegs = prev.filter(s => s.episodeId === episodeId);
      return [...prev, { id: nanoid(), episodeId, name: `片段${epSegs.length + 1}`, shotIds: [], duration: 12, prompt: "" }];
    });
  }, []);

  const updateVideoSegment = useCallback((id: string, data: Partial<VideoSegment>) => {
    setVideoSegments(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }, []);

  const removeVideoSegment = useCallback((id: string) => {
    setVideoSegments(prev => prev.filter(s => s.id !== id));
  }, []);

  const autoGenerateSegments = useCallback((episodeId: string) => {
    const epShots = shots.filter(s => s.episodeId === episodeId);
    if (epShots.length === 0) return;
    setVideoSegments(prev => [...prev.filter(s => s.episodeId !== episodeId), ...autoGenerateSegmentsFromShots(epShots, episodeId)]);
  }, [shots]);

  const generateSegmentPrompt = useCallback((segId: string) => {
    const seg = videoSegments.find(s => s.id === segId);
    if (!seg) return "";
    const relatedShots = seg.shotIds.map(id => shots.find(s => s.id === id)).filter(Boolean) as Shot[];
    let prompt = `一个${seg.duration}秒的视频片段，包含${relatedShots.length || 3}个镜头：\n`;
    if (relatedShots.length > 0) {
      relatedShots.forEach((shot, i) => {
        prompt += `镜头${i + 1}：${shot.size}，${shot.description || "[画面描述]"}。${shot.movement !== "固定" ? `镜头${shot.movement}。` : ""}\n`;
      });
      const vos = relatedShots.filter(s => s.vo).map(s => s.vo);
      if (vos.length) prompt += `VO: "${vos.join(" ")}"\n`;
      const sfxList = relatedShots.filter(s => s.sfx).map(s => s.sfx);
      if (sfxList.length) prompt += `SFX: ${sfxList.join("，")}\n`;
      const emotions = Array.from(new Set(relatedShots.filter(s => s.emotion).map(s => s.emotion)));
      if (emotions.length) prompt += `整体氛围：${emotions.join("、")}。\n`;
    } else {
      prompt += `镜头1：[景别]，[画面描述]。\n镜头2：[景别]，[画面描述]。\n镜头3：[景别]，[画面描述]。\nVO: "[旁白内容]"\nSFX: [音效描述]\n整体氛围：[情绪关键词]。\n`;
    }
    prompt += projectInfo.styleZh || "[视觉风格标签]";
    return prompt;
  }, [videoSegments, shots, projectInfo.styleZh]);

  const markPhaseComplete = useCallback((phase: string) => {
    setCompletedPhases(prev => {
      const next = new Set<string>(Array.from(prev));
      next.add(phase);
      return next;
    });
  }, []);

  return (
    <ProjectContext.Provider value={{
      projectInfo, scriptText, scriptAnalysis,
      characters, episodeAssets, shots, videoSegments,
      activePhase, activeEpisodeId, completedPhases,
      setActivePhase, setActiveEpisodeId, updateProjectInfo,
      setScriptText, analyzeScript, updateEpisode,
      addCharacter, updateCharacter, removeCharacter, generateCharacterPrompt,
      addEpisodeAsset, updateEpisodeAsset, removeEpisodeAsset, generateAssetPromptMJ,
      addShot, updateShot, removeShot, autoGenerateShots,
      addVideoSegment, updateVideoSegment, removeVideoSegment, autoGenerateSegments, generateSegmentPrompt,
      markPhaseComplete,
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
