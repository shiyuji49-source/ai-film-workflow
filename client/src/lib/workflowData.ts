// ============================================================
// DESIGN: "导演手册" 工业风暗色系
// All workflow data for the AI Film Production Methodology Tool
// ============================================================

export interface StyleTag {
  type: string;
  zh: string;
  en: string;
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

export const STYLE_TAGS: StyleTag[] = [
  {
    type: "3D国漫",
    zh: "3D国风幻想风格，高精度CG渲染，细腻的角色建模与服装纹理，动态体积光，电影级光影构图，4K超清",
    en: "3D Chinese fantasy style, high-quality CG rendering, detailed character models and costume textures, dynamic volumetric lighting, cinematic lighting and composition, 4K ultra HD",
  },
  {
    type: "2D日漫",
    zh: "2D日式动画风格，高饱和度赛璐璐上色，清晰锐利的动态手绘线条，电影级叙事构图，4K超清",
    en: "2D Japanese anime style, high-saturation cel-shading, clean and sharp dynamic hand-drawn linework, cinematic narrative composition, 4K ultra HD",
  },
  {
    type: "写实CG",
    zh: "超写实CG渲染，照片级真实质感，电影级灯光布局，皮肤次表面散射效果，精细毛发模拟，虚幻引擎渲染质感，8K超清",
    en: "Hyper-realistic CG rendering, photorealistic quality, cinematic lighting setup, subsurface skin scattering, detailed hair simulation, Unreal Engine rendering quality, 8K ultra HD",
  },
  {
    type: "真人电影",
    zh: "真人电影质感，35mm胶片颗粒感，柔和的浅景深效果，自然光线氛围，专业级电影摄影机质感，4K超清",
    en: "Live-action cinematic quality, 35mm film grain, soft shallow depth of field, natural lighting atmosphere, professional cinema camera look, 4K ultra HD",
  },
  {
    type: "水墨国风",
    zh: "中国传统水墨动画风格，融合工笔画的精细与写意画的洒脱，焦墨、浓、淡、清多层次墨色渲染，强调留白与意境，东方美学构图，4K超清",
    en: "Chinese traditional ink-wash animation style, blending Gongbi's detail with Xieyi's expressiveness, multi-layered ink tones (scorched, thick, light, clear), emphasizing negative space and artistic conception, Eastern aesthetic composition, 4K ultra HD",
  },
  {
    type: "赛博朋克",
    zh: "赛博朋克视觉风格，高密度城市景观，霓虹灯光污染与潮湿街道的反射，高科技与低生活感的强烈对比，冷色调与高饱和度色彩并存，4K超清",
    en: "Cyberpunk visual style, dense urban landscapes, neon light pollution with wet street reflections, strong contrast between high-tech and low-life, coexistence of cool tones and high-saturation colors, 4K ultra HD",
  },
];

export const SHOT_TYPES: ShotType[] = [
  { name: "定场镜头", en: "Establishing Shot", role: "交代环境、时间、空间关系", timing: "每个新场景/新地点开头；重大转折后" },
  { name: "Action镜头", en: "Action Shot", role: "推进核心动作和情节", timing: "角色做出关键动作、战斗、变身、爆发" },
  { name: "Reaction镜头", en: "Reaction Shot", role: "展示角色/环境对动作的情感反馈", timing: "Action之后紧接；展示其他角色的惊讶/恐惧/感动" },
  { name: "逻辑镜头", en: "Bridge/Logic Shot", role: "补充因果关系、时间过渡、信息交代", timing: "场景之间的过渡；解释为什么会发生某事" },
  { name: "旁跳镜头", en: "Cutaway Shot", role: "提供环境细节、时间流逝、气氛渲染", timing: "主线叙事间隙；强调某个细节物品/环境变化" },
];

export const SHOT_RATIOS: ShotRatio[] = [
  { scene: "对话场景", establishing: "1-2", action: "2-3", reaction: "5-8", logic: "1-2", cutaway: "1-2", total: "10-17" },
  { scene: "战斗场景", establishing: "1-2", action: "8-12", reaction: "3-5", logic: "1-2", cutaway: "2-3", total: "15-24" },
  { scene: "史诗开场", establishing: "3-4", action: "6-10", reaction: "4-6", logic: "2-3", cutaway: "2-3", total: "17-26" },
  { scene: "情感场景", establishing: "1-2", action: "1-2", reaction: "6-10", logic: "2-3", cutaway: "2-4", total: "12-21" },
  { scene: "悬念/转折", establishing: "1-2", action: "3-5", reaction: "4-6", logic: "3-4", cutaway: "2-3", total: "13-20" },
  { scene: "日常/喜剧", establishing: "1-2", action: "3-5", reaction: "4-7", logic: "1-2", cutaway: "3-5", total: "12-21" },
];

export const SHOT_SIZES = [
  { name: "大远景", desc: "环境全貌，人物极小（定场/史诗感）" },
  { name: "远景", desc: "可见人物全身，环境为主（空间关系）" },
  { name: "全景", desc: "人物全身清晰，环境为辅（动作展示）" },
  { name: "中景", desc: "膝盖以上（对话/互动）" },
  { name: "中近景", desc: "腰部以上（表演/表情）" },
  { name: "近景", desc: "胸部以上（情感传递）" },
  { name: "特写", desc: "面部/物品细节（强调/情绪高潮）" },
  { name: "大特写", desc: "眼睛/嘴唇/手等局部（极致情感/关键细节）" },
];

export const CAMERA_MOVEMENTS = [
  { name: "固定", effect: "稳定、客观", use: "对话、定场、定格" },
  { name: "推（Dolly In）", effect: "逐渐靠近、聚焦、紧张", use: "揭示重要信息、情绪升级" },
  { name: "拉（Dolly Out）", effect: "远离、揭示全貌、孤独", use: "揭示环境、角色渺小" },
  { name: "摇（Pan）", effect: "横向扫视", use: "展示广阔场景、跟随视线" },
  { name: "移（Track）", effect: "平行跟随", use: "角色行走、追逐" },
  { name: "跟（Follow）", effect: "跟在主体后方", use: "行走、奔跑、追踪" },
  { name: "升（Crane Up）", effect: "升起揭示", use: "史诗揭示、壮观场面" },
  { name: "降（Crane Down）", effect: "降落聚焦", use: "从宏观到微观" },
  { name: "环绕（Orbit）", effect: "360度环绕主体", use: "角色亮相、变身、展示" },
  { name: "手持（Handheld）", effect: "微晃、纪实感", use: "紧张、慌乱、真实感" },
  { name: "航拍（Aerial）", effect: "鸟瞰/俯瞰", use: "开场定场、战场全貌" },
  { name: "穿越（Through）", effect: "穿墙/穿物体", use: "科幻感、揭示内部" },
];

export const PROMPT_TIPS: PromptTip[] = [
  { key: "分段叙事", desc: "将一分钟的戏解构成4-6个视频片段，每个片段（10-15秒）为一个独立的Prompt。" },
  { key: "镜头化思考", desc: "在一个Prompt内部，用「镜头1/2/3」的结构清晰地描述镜头切换，覆盖2-5个镜头。" },
  { key: "音画同步", desc: "将VO（旁白）和SFX（音效）作为独立参数写入Prompt，让AI一并生成，无需后期单独处理。" },
  { key: "角色一致性", desc: "在每个Prompt中，都简要重复角色的核心外貌特征（如「白发红瞳的法师」）。" },
  { key: "风格统一", desc: "必须在每个Prompt的末尾，附加完全相同的本项目视觉风格标签。" },
  { key: "纯净指令", desc: "Prompt中不包含任何「@」或「《》」等特殊符号或后期处理标记。" },
];

export const MOOD_KEYWORDS: MoodKeyword[] = [
  { zh: "史诗、磅礴", en: "Epic, grand", scene: "大场面、战争、觉醒" },
  { zh: "紧张、压迫", en: "Tense, oppressive", scene: "危机、追逐、倒计时" },
  { zh: "恐惧、末日", en: "Fear, apocalyptic", scene: "灾难、怪物、毁灭" },
  { zh: "温暖、亲密", en: "Warm, intimate", scene: "爱情、友情、家庭" },
  { zh: "悲伤、绝望", en: "Sad, desperate", scene: "失去、牺牲、离别" },
  { zh: "热血、燃", en: "Hot-blooded, fiery", scene: "战斗、逆袭、爆发" },
  { zh: "神圣、觉醒", en: "Sacred, awakening", scene: "变身、升级、超越" },
  { zh: "搞笑、轻松", en: "Funny, lighthearted", scene: "日常、反差、吐槽" },
  { zh: "神秘、悬疑", en: "Mysterious, suspenseful", scene: "阴谋、暗线、未知" },
  { zh: "孤独、苍凉", en: "Lonely, desolate", scene: "独行、废墟、回忆" },
];

export const LIGHTING_TYPES: LightingType[] = [
  { name: "黄金时刻", zh: "黄昏暖金色阳光，长影", en: "Golden hour warm sunlight, long shadows" },
  { name: "蓝色时刻", zh: "日出前/日落后的冷蓝调", en: "Blue hour cool tones" },
  { name: "逆光剪影", zh: "背后强光，人物成黑色剪影", en: "Backlit silhouette, strong rim light" },
  { name: "顶光", zh: "正上方硬光，强烈明暗对比", en: "Top-down hard lighting, high contrast" },
  { name: "侧光", zh: "侧面45度光，半明半暗", en: "Side lighting, half shadow, dramatic" },
  { name: "霓虹光", zh: "彩色霓虹灯照射，赛博感", en: "Neon lighting, colorful reflections" },
  { name: "月光", zh: "冷蓝色月光，静谧氛围", en: "Moonlight, cool blue tones, serene" },
  { name: "火光", zh: "暖橙红跳动光源", en: "Firelight, warm flickering orange" },
  { name: "体积光", zh: "丁达尔效应，光束可见", en: "Volumetric lighting, god rays" },
  { name: "环境遮蔽", zh: "柔和间接光，无明显光源", en: "Ambient occlusion, soft indirect light" },
];

export const WORKFLOW_STEPS = [
  {
    id: "phase1",
    number: "01",
    title: "项目定义",
    subtitle: "Project Definition",
    desc: "确定项目基础信息与视觉风格标签，这是全片一致性的基石。",
    color: "amber",
  },
  {
    id: "phase2",
    number: "02",
    title: "人物与机甲资产",
    subtitle: "Character Assets",
    desc: "Nanobananapro 固定模板 + MJ7 全局人物竖版参考图提示词。",
    color: "amber",
  },
  {
    id: "phase2b",
    number: "2B",
    title: "场景与道具资产",
    subtitle: "Scene & Prop Assets",
    desc: "按集分类的 MJ7 场景横版参考图 + 道具展示图提示词。",
    color: "amber",
  },
  {
    id: "phase3",
    number: "03",
    title: "分镜设计",
    subtitle: "Storyboarding",
    desc: "将剧本转化为视觉语言，规划镜头类型、景别与运动方式。",
    color: "amber",
  },
  {
    id: "phase4",
    number: "04",
    title: "提示词撰写",
    subtitle: "Prompt Writing",
    desc: "为Seedance撰写多镜头视频提示词，集成旁白与音效。",
    color: "amber",
  },
  {
    id: "phase5",
    number: "05",
    title: "生成与后期",
    subtitle: "Generation & Post",
    desc: "按工作流生成视频片段，完成剪辑、终混与交付。",
    color: "amber",
  },
  {
    id: "phase6",
    number: "06",
    title: "参考素材库",
    subtitle: "Reference Library",
    desc: "情绪关键词、光影描述等常用创作素材速查。",
    color: "amber",
  },
];
