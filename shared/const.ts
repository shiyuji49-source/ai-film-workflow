export const COOKIE_NAME = "app_session_id";

// ── Gemini 模型配置 ──────────────────────────────────────────────────────────
// 旗舰模型：用于 MJ 提示词生成、分镇生成、视频提示词生成等高质量创意任务
export const GEMINI_PRO_MODEL = "gemini-3.1-pro-preview";

// Flash 模型：用于剧本解析、通用 LLM 接口等速度优先任务
export const GEMINI_FLASH_MODEL = "gemini-3-flash-preview";

// thinking_level 配置：Gemini 3 系列特有参数
export const GEMINI_THINKING_HIGH = "high";   // 默认，适合创意性内容生成
export const GEMINI_THINKING_LOW  = "low";    // 适合结构化输出，降低延迟

// 各操作的预估时间（秒）
export const GEMINI_ESTIMATE_SECS = {
  analyzeScript:        { min: 10, max: 30 },  // 剧本解析（Flash）
  generateCharacter:    { min: 15, max: 35 },  // 人物提示词（Pro）
  generateAsset:        { min: 15, max: 35 },  // 场景/道具提示词（Pro）
  generateShots:        { min: 20, max: 60 },  // 分镇生成（Pro）
  generateVideoPrompt:  { min: 15, max: 40 },  // 视频提示词（Pro）
} as const;
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
