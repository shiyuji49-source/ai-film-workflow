// DESIGN: "导演手册" 工业风暗色系
// All workflow data for the AI Film Production Methodology Tool
// ============================================================

// ── 两级风格体系 ──────────────────────────────────────────────
export interface StyleCategory {
  id: string;      // 大类 ID，如 "3D"
  label: string;   // 显示名称，如 "3D"
  desc: string;    // 简短说明
}

export interface StyleSubtype {
  id: string;      // 小类 ID，如 "guoman"
  label: string;   // 显示名称，如 "国漫"
  parentId: string; // 所属大类 ID
  zh: string;      // 中文风格描述（用于 AI 提示词）
  en: string;      // 英文风格描述（用于 MJ 提示词）
}

export const STYLE_CATEGORIES: StyleCategory[] = [
  { id: "2D", label: "2D", desc: "平面手绘动画风格" },
  { id: "3D", label: "3D", desc: "三维建模渲染风格" },
  { id: "CG", label: "写实 CG", desc: "超写实计算机图形" },
  { id: "live", label: "真人", desc: "真人电影摄影质感" },
];

export const STYLE_SUBTYPES: StyleSubtype[] = [
  // ── 2D 小类 ──
  {
    id: "guoman_2d", label: "国漫", parentId: "2D",
    zh: "2D国漫风格，流畅手绘线条，高饱和度色彩，东方美学构图，精细背景绘制，4K超清",
    en: "2D Chinese animation style, fluid hand-drawn linework, high-saturation colors, Eastern aesthetic composition, detailed background painting, 4K ultra HD",
  },
  {
    id: "riman", label: "日漫", parentId: "2D",
    zh: "2D日式动画风格，高饱和度赛璐璐上色，清晰锐利的动态手绘线条，电影级叙事构图，4K超清",
    en: "2D Japanese anime style, high-saturation cel-shading, clean and sharp dynamic hand-drawn linework, cinematic narrative composition, 4K ultra HD",
  },
  {
    id: "sai_lu_lu", label: "赛璐璐", parentId: "2D",
    zh: "2D赛璐璐动画风格，平涂色块，清晰黑色描边，有限动画节奏，复古动画质感，4K超清",
    en: "2D cel animation style, flat color fills, clean black outlines, limited animation rhythm, retro animation aesthetic, 4K ultra HD",
  },
  {
    id: "shuimo", label: "水墨国风", parentId: "2D",
    zh: "中国传统水墨动画风格，融合工笔画的精细与写意画的洒脱，焦墨浓淡多层次渲染，强调留白与意境，东方美学构图，4K超清",
    en: "Chinese traditional ink-wash animation style, blending Gongbi's detail with Xieyi's expressiveness, multi-layered ink tones, emphasizing negative space and artistic conception, Eastern aesthetic composition, 4K ultra HD",
  },
  {
    id: "pikesi_2d", label: "皮克斯风", parentId: "2D",
    zh: "2D皮克斯动画风格，圆润可爱的角色造型，温暖色调，夸张表情与动作，精细材质细节，4K超清",
    en: "2D Pixar animation style, rounded cute character designs, warm color palette, exaggerated expressions and actions, detailed material textures, 4K ultra HD",
  },
  // ── 3D 小类 ──
  {
    id: "guoman_3d", label: "国漫", parentId: "3D",
    zh: "3D国漫风格，高精度CG渲染，流畅动作，东方美学构图，精细场景建模，电影级灯光，4K超清",
    en: "3D Chinese animation style, high-quality CG rendering, fluid motion, Eastern aesthetic composition, detailed scene modeling, cinematic lighting, 4K ultra HD",
  },
  {
    id: "jia_guoman_3d", label: "科幻机甲", parentId: "3D",
    zh: "3D科幻机甲国漫风格，高精度CG渲染，硬表面机甲建模，金属装甲质感，能量粒子特效，体积光与丁达尔光效，电影级宽画幅构图，4K超清",
    en: "3D sci-fi mecha Chinese animation style, high-quality CG rendering, hard-surface mecha modeling, metallic armor textures, energy particle effects, volumetric and Tyndall lighting, cinematic widescreen composition, 4K ultra HD",
  },
  {
    id: "saibopengke_3d", label: "赛博朋克", parentId: "3D",
    zh: "3D赛博朋克风格，高密度城市景观，霓虹灯光污染与潮湿街道反射，高科技低生活感强烈对比，冷色调与高饱和度色彩并存，4K超清",
    en: "3D cyberpunk style, dense urban landscapes, neon light pollution with wet street reflections, high-tech low-life contrast, cool tones with high-saturation colors, 4K ultra HD",
  },
  {
    id: "pikesi_3d", label: "皮克斯风", parentId: "3D",
    zh: "3D皮克斯动画风格，圆润可爱的角色造型，温暖色调，夸张表情与动作，精细材质细节，次表面散射皮肤效果，4K超清",
    en: "3D Pixar animation style, rounded cute character designs, warm color palette, exaggerated expressions and actions, detailed material textures, subsurface scattering skin, 4K ultra HD",
  },
  {
    id: "zhongguofeng_3d", label: "中国风", parentId: "3D",
    zh: "3D中国风风格，古典建筑场景，汉服服饰细节，水墨晕染光效，东方神话意境，精细场景建模，4K超清",
    en: "3D Chinese fantasy style, classical architecture, Hanfu costume details, ink-wash lighting effects, Eastern mythological atmosphere, detailed scene modeling, 4K ultra HD",
  },
  // ── 写实 CG 小类 ──
  {
    id: "cg_real", label: "超写实", parentId: "CG",
    zh: "超写实CG渲染，照片级真实质感，电影级灯光布局，皮肤次表面散射效果，精细毛发模拟，虚幻引擎渲染质感，8K超清",
    en: "Hyper-realistic CG rendering, photorealistic quality, cinematic lighting setup, subsurface skin scattering, detailed hair simulation, Unreal Engine rendering quality, 8K ultra HD",
  },
  {
    id: "cg_scifi", label: "科幻写实", parentId: "CG",
    zh: "科幻写实CG渲染，未来感科技场景，金属与玻璃材质精细渲染，全局光照，电影级景深，8K超清",
    en: "Sci-fi realistic CG rendering, futuristic tech environments, detailed metal and glass material rendering, global illumination, cinematic depth of field, 8K ultra HD",
  },
  // ── 真人 小类 ──
  {
    id: "live_film", label: "电影质感", parentId: "live",
    zh: "真人电影质感，35mm胶片颗粒感，柔和的浅景深效果，自然光线氛围，专业级电影摄影机质感，4K超清",
    en: "Live-action cinematic quality, 35mm film grain, soft shallow depth of field, natural lighting atmosphere, professional cinema camera look, 4K ultra HD",
  },
  {
    id: "live_scifi", label: "科幻真人", parentId: "live",
    zh: "科幻真人电影质感，未来感场景布景，特效合成质感，冷色调灯光，电影级宽画幅构图，4K超清",
    en: "Sci-fi live-action cinematic quality, futuristic set design, VFX composite look, cool-toned lighting, cinematic widescreen composition, 4K ultra HD",
  },
];

// 兼容旧代码：保留 STYLE_TAGS 导出，映射到新结构
export interface StyleTag {
  type: string;
  zh: string;
  en: string;
}
export const STYLE_TAGS: StyleTag[] = STYLE_SUBTYPES.map(s => ({
  type: s.label,
  zh: s.zh,
  en: s.en,
}));

// 根据大类ID + 小类ID 获取完整风格描述
export function getStyleDesc(categoryId: string, subtypeId?: string): { zh: string; en: string; label: string } {
  const cat = STYLE_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return { zh: "", en: "", label: "" };
  if (!subtypeId) {
    return { zh: `${cat.label}风格`, en: `${cat.label} style`, label: cat.label };
  }
  const sub = STYLE_SUBTYPES.find(s => s.id === subtypeId && s.parentId === categoryId);
  if (!sub) return { zh: `${cat.label}风格`, en: `${cat.label} style`, label: cat.label };
  return { zh: sub.zh, en: sub.en, label: `${cat.label} · ${sub.label}` };
}

export interface ShotType {
  name: string;
  en: string;
  role: string;
  timing: string;
}

export interface ShotRatio {
  scene: string;
  establishing: string;
  action: string;
  reaction: string;
  logic: string;
  cutaway: string;
  total: string;
}

export interface PromptTip {
  key: string;
  desc: string;
}

export interface MoodKeyword {
  zh: string;
  en: string;
  scene: string;
}

export interface LightingType {
  name: string;
  zh: string;
  en: string;
}

export const SHOT_TYPES: ShotType[] = [
  { name: "定场镜头", en: "Establishing Shot", role: "交代环境、时间、空间关系", timing: "每个新场景/新地点开头；重大转折后" },
  { name: "主镜头", en: "Master Shot", role: "全景展示场景内所有人物的位置关系", timing: "场景开始，建立空间感" },
  { name: "过肩镜头", en: "Over-the-Shoulder", role: "表现对话关系，保持视线连贯", timing: "对话场景，交替切换" },
  { name: "特写镜头", en: "Close-Up", role: "强调细节、情绪、关键道具", timing: "情绪高潮；关键信息揭示" },
  { name: "大特写", en: "Extreme Close-Up", role: "极度强调局部细节或强烈情绪", timing: "最高情绪点；悬疑揭示" },
  { name: "反应镜头", en: "Reaction Shot", role: "展示角色对事件的情绪反应", timing: "重要事件发生后立即切入" },
  { name: "插入镜头", en: "Insert Shot", role: "展示关键细节或道具", timing: "需要强调特定物体或信息时" },
  { name: "空镜头", en: "Cutaway Shot", role: "转场、渲染氛围、暗示时间流逝", timing: "场景过渡；情绪渲染" },
  { name: "主观镜头", en: "POV Shot", role: "让观众代入角色视角", timing: "需要强烈代入感的关键时刻" },
  { name: "跟拍镜头", en: "Tracking Shot", role: "跟随角色运动，保持动态感", timing: "角色移动场景；追逐戏" },
];

export const WORKFLOW_STEPS = [
  { id: "phase1", number: "01", title: "项目定义", subtitle: "剧本上传与解析", icon: "FileText" },
  { id: "phase2", number: "02", title: "人物资产", subtitle: "角色与机甲提示词", icon: "Users" },
  { id: "phase2b", number: "02B", title: "场景道具", subtitle: "分集场景道具提示词", icon: "MapPin" },
  { id: "phase3", number: "03", title: "分镜设计", subtitle: "AI 自动分镜生成", icon: "Film" },
  { id: "phase4", number: "04", title: "提示词撰写", subtitle: "Seedance 中文提示词", icon: "Wand2" },
  { id: "phase5", number: "05", title: "生成与后期", subtitle: "工具链操作指南", icon: "Play" },
  { id: "phase6", number: "06", title: "参考素材库", subtitle: "情绪光影关键词", icon: "Library" },
];

export const MOOD_KEYWORDS: MoodKeyword[] = [
  { zh: "史诗壮阔", en: "epic and grand", scene: "战争/决战" },
  { zh: "孤独压抑", en: "lonely and oppressive", scene: "独处/失落" },
  { zh: "紧张窒息", en: "tense and suffocating", scene: "追逐/危机" },
  { zh: "温暖治愈", en: "warm and healing", scene: "亲情/友情" },
  { zh: "神秘诡谲", en: "mysterious and eerie", scene: "悬疑/未知" },
  { zh: "热血沸腾", en: "passionate and fiery", scene: "战斗/突破" },
  { zh: "悲壮凄美", en: "tragic and poignant", scene: "牺牲/告别" },
  { zh: "轻松愉快", en: "light and cheerful", scene: "日常/喜剧" },
  { zh: "冷酷肃杀", en: "cold and deadly", scene: "反派/阴谋" },
  { zh: "震撼人心", en: "awe-inspiring", scene: "揭示/高潮" },
];

export const LIGHTING_TYPES: LightingType[] = [
  { name: "丁达尔光", zh: "丁达尔光效，光束穿透云层或粒子", en: "Tyndall light effect, light beams through clouds or particles" },
  { name: "体积光", zh: "体积光，大气光散射效果", en: "volumetric lighting, atmospheric light scattering" },
  { name: "逆光剪影", zh: "强烈逆光，角色轮廓剪影效果", en: "strong backlight, character silhouette effect" },
  { name: "霓虹灯光", zh: "霓虹灯光，彩色光污染，潮湿地面反射", en: "neon lighting, colorful light pollution, wet surface reflections" },
  { name: "黄金时刻", zh: "黄金时刻光线，温暖橙金色调，长阴影", en: "golden hour lighting, warm orange-gold tones, long shadows" },
  { name: "蓝调时刻", zh: "蓝调时刻，深蓝色天空，冷色调氛围", en: "blue hour lighting, deep blue sky, cool-toned atmosphere" },
  { name: "能量光效", zh: "能量粒子光效，科幻感发光体，光晕扩散", en: "energy particle light effects, sci-fi glowing elements, halo diffusion" },
  { name: "低调布光", zh: "低调布光，强烈明暗对比，神秘阴影", en: "low-key lighting, strong chiaroscuro contrast, mysterious shadows" },
];

export interface ShotSize {
  name: string;
  en: string;
  desc: string;
}

export interface CameraMovement {
  name: string;
  en: string;
  desc: string;
}

export const SHOT_SIZES: ShotSize[] = [
  { name: "极远景", en: "Extreme Long Shot", desc: "展示宏大环境，人物极小" },
  { name: "远景", en: "Long Shot", desc: "全身入镜，环境为主" },
  { name: "全景", en: "Full Shot", desc: "全身入镜，人物为主" },
  { name: "中景", en: "Medium Shot", desc: "腰部以上，对话常用" },
  { name: "中近景", en: "Medium Close-Up", desc: "胸部以上，情绪表达" },
  { name: "近景", en: "Close-Up", desc: "头部及肩膀，强调面部" },
  { name: "特写", en: "Extreme Close-Up", desc: "局部细节，极度强调" },
];

export const CAMERA_MOVEMENTS: CameraMovement[] = [
  { name: "固定镜头", en: "Static Shot", desc: "摄像机不动，稳定叙事" },
  { name: "推镜头", en: "Push In", desc: "向主体推进，强调重要性" },
  { name: "拉镜头", en: "Pull Out", desc: "远离主体，揭示环境" },
  { name: "横移", en: "Pan", desc: "水平旋转，跟随动作" },
  { name: "垂直摇", en: "Tilt", desc: "垂直旋转，展示高度" },
  { name: "跟拍", en: "Tracking Shot", desc: "跟随角色移动" },
  { name: "环绕", en: "Orbit Shot", desc: "环绕主体旋转，展示全貌" },
  { name: "手持抖动", en: "Handheld", desc: "模拟真实感，紧张氛围" },
  { name: "升降镜头", en: "Crane Shot", desc: "垂直升降，宏大感" },
  { name: "俯冲镜头", en: "Dive Shot", desc: "快速向下俯冲，冲击感" },
];

export const SHOT_RATIOS: ShotRatio[] = [
  {
    scene: "动作/战斗",
    establishing: "10%",
    action: "40%",
    reaction: "20%",
    logic: "10%",
    cutaway: "10%",
    total: "100%",
  },
  {
    scene: "对话/情感",
    establishing: "15%",
    action: "20%",
    reaction: "35%",
    logic: "20%",
    cutaway: "10%",
    total: "100%",
  },
  {
    scene: "悬疑/惊悚",
    establishing: "20%",
    action: "15%",
    reaction: "25%",
    logic: "15%",
    cutaway: "25%",
    total: "100%",
  },
  {
    scene: "史诗/宏大",
    establishing: "30%",
    action: "30%",
    reaction: "15%",
    logic: "10%",
    cutaway: "15%",
    total: "100%",
  },
];
