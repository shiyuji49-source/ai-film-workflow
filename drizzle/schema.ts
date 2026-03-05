import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean } from "drizzle-orm/mysql-core";

// ─── 用户表 ──────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  /** 登录标识：邮符1或手机号（可为空，兼容旧 OAuth 用户） */
  identifier: varchar("identifier", { length: 320 }).unique(),
  /** 标识类型 */
  identifierType: mysqlEnum("identifierType", ["email", "phone"]),
  /** bcrypt 哈希后的密码 */
  passwordHash: varchar("passwordHash", { length: 256 }),
  /** 显示名称 */
  name: varchar("name", { length: 64 }),
  /** 角色：user / admin */
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** 积分余额 */
  credits: int("credits").default(10000).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── 项目表 ──────────────────────────────────────────────────────────────────
// 存储每个用户的鎏光机项目（原来存在 localStorage 的数据）
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** 项目唯一标识（前端使用的 nanoid） */
  clientId: varchar("clientId", { length: 32 }).notNull(),
  name: varchar("name", { length: 128 }).notNull().default("未命名项目"),
  /** 完整项目 JSON 数据（ProjectSnapshot 序列化） */
  data: text("data").notNull().default("{}"),
  /** 最后活跃时间（用于排序） */
  lastActiveAt: timestamp("lastActiveAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── 积分流水表 ──────────────────────────────────────────────────────────────
export const creditLogs = mysqlTable("creditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** 变动量（正数=充值，负数=消耗） */
  delta: int("delta").notNull(),
  /** 变动后余额 */
  balance: int("balance").notNull(),
  /** 操作类型 */
  action: mysqlEnum("action", [
    "register_bonus",    // 注册赠送
    "admin_grant",       // 管理员充值
    "stripe_purchase",   // Stripe 购买积分
    "analyze_script",    // AI 解析剧本 -1
    "generate_shot",     // AI 生成分镜 -1/个
    "generate_prompt",   // AI 生成视频提示词 -3/条
  ]).notNull(),
  /** 关联项目 ID（可选） */
  projectId: int("projectId"),
  /** 备注 */
  note: varchar("note", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditLog = typeof creditLogs.$inferSelect;
export type InsertCreditLog = typeof creditLogs.$inferInsert;

// ─── 邀请码表 ──────────────────────────────────────────────────────────────────
export const inviteCodes = mysqlTable("invite_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  /** 创建者（管理员 userId，0 表示系统生成） */
  createdBy: int("created_by").notNull().default(0),
  /** 使用者 userId */
  usedBy: int("used_by"),
  usedAt: bigint("used_at", { mode: "number" }),
  /** 过期时间（null 表示永不过期） */
  expiresAt: bigint("expires_at", { mode: "number" }),
  /** 最大使用次数（默认 1） */
  maxUses: int("max_uses").notNull().default(1),
  useCount: int("use_count").notNull().default(0),
  note: varchar("note", { length: 255 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type InviteCode = typeof inviteCodes.$inferSelect;

// ─── 订单表（Stripe 支付记录）────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Stripe Checkout Session ID */
  stripeSessionId: varchar("stripeSessionId", { length: 256 }).unique(),
  /** 购买的积分数量 */
  credits: int("credits").notNull(),
  /** 支付金额（分，人民币） */
  amountFen: int("amountFen").notNull(),
  /** 订单状态 */
  status: mysqlEnum("status", ["pending", "paid", "failed", "refunded"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  paidAt: timestamp("paidAt"),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── 团队表（预留，后续团队协作使用）────────────────────────────────────────
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  ownerId: int("ownerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
// ─── 资产库表 ─────────────────────────────────────────────────────────────────
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** 关联项目（可选） */
  projectId: int("projectId"),
  /** 资产类型 */
  type: mysqlEnum("type", ["character", "scene", "prop"]).notNull(),
  /** 资产名称 */
  name: varchar("name", { length: 128 }).notNull(),
  /** 资产描述（中文） */
  description: text("description"),
  /** MJ7 生成提示词（用户在 MJ 中生成图片的提示词） */
  mjPrompt: text("mjPrompt"),
  /** Nano Banana Pro 提示词（基于上传图生成视图的辅助提示词） */
  mainPrompt: text("mainPrompt"),
  /** 用户上传的 MJ 原图 URL（S3） */
  uploadedImageUrl: text("uploadedImageUrl"),
  /** 主视图 URL（由 Nano Banana Pro 生成） */
  mainImageUrl: text("mainImageUrl"),
  /** 三视图 / 多视角图 URLs（JSON 数组字符串） */
  multiViewUrls: text("multiViewUrls"),
  /** 使用的生成模型 */
  generationModel: varchar("generationModel", { length: 64 }),
  /** 生成状态 */
  status: mysqlEnum("status", ["draft", "generating", "done", "failed"]).default("draft").notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

// ─── 资产生成历史表 ─────────────────────────────────
export const assetHistory = mysqlTable("asset_history", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("asset_id").notNull(),
  userId: int("user_id").notNull(),
  /** 图片类型: main | front | back | side | left | right | top | angle1 | angle2 | angle3 */
  imageType: varchar("image_type", { length: 50 }).notNull(),
  imageUrl: text("image_url").notNull(),
  prompt: text("prompt"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type AssetHistory = typeof assetHistory.$inferSelect;
export type InsertAssetHistory = typeof assetHistory.$inferInsert;

// ─── API 设置表（用户自定义 AI 提供商配置）──────────────────────────────────
export const apiSettings = mysqlTable("api_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  /** 当前选用的提供商: gemini | openai | anthropic | kimi | custom */
  provider: varchar("provider", { length: 32 }).notNull().default("gemini"),
  /** 当前选用的模型名称（如 gemini-3-flash-preview） */
  model: varchar("model", { length: 128 }).notNull().default("gemini-3-flash-preview"),
  /** 用户自带的 API Key（加密存储，可覆盖系统默认 Key） */
  apiKey: text("apiKey"),
  /** 自定义 API Base URL（用于代理或本地模型） */
  apiBaseUrl: text("apiBaseUrl"),
  /** 最后一次检测结果: ok | error | untested */
  lastTestStatus: varchar("lastTestStatus", { length: 16 }).default("untested"),
  /** 最后一次检测时间 */
  lastTestedAt: timestamp("lastTestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiSetting = typeof apiSettings.$inferSelect;
export type InsertApiSetting = typeof apiSettings.$inferInsert;

// Team Members Table (reserved)
export const teamMembers = mysqlTable("teamMembers", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "editor", "viewer"]).default("viewer").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

// ─── 出海短剧项目表 ────────────────────────────────────────────────────────────
export const overseasProjects = mysqlTable("overseas_projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** 项目名称（剧名） */
  name: varchar("name", { length: 128 }).notNull().default("未命名剧集"),
  /** 市场：us / uk / au / ca / in / jp 等 */
  market: varchar("market", { length: 32 }).notNull().default("us"),
  /** 画幅：landscape(16:9) / portrait(9:16) */
  aspectRatio: mysqlEnum("aspectRatio", ["landscape", "portrait"]).notNull().default("portrait"),
  /** 风格：realistic / animation / cg */
  style: mysqlEnum("style", ["realistic", "animation", "cg"]).notNull().default("realistic"),
  /** 题材：romance / scifi / revenge / fantasy / thriller */
  genre: varchar("genre", { length: 64 }).notNull().default("romance"),
  /** 总集数 */
  totalEpisodes: int("totalEpisodes").default(20),
  /** 项目状态 */
  status: mysqlEnum("status", ["draft", "in_progress", "completed"]).default("draft").notNull(),
  /** 角色设定 JSON（[{name, description, appearance}]） */
  characters: text("characters").default("[]"),
  /** 场景设定 JSON（[{name, description}]） */
  scenes: text("scenes").default("[]"),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OverseasProject = typeof overseasProjects.$inferSelect;
export type InsertOverseasProject = typeof overseasProjects.$inferInsert;

// ─── 分镜表（每集每个镜头）────────────────────────────────────────────────────
export const scriptShots = mysqlTable("script_shots", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  /** 集数编号（1-based） */
  episodeNumber: int("episodeNumber").notNull(),
  /** 镜头编号（集内序号，1-based） */
  shotNumber: int("shotNumber").notNull(),
  /** 场景名称 */
  sceneName: varchar("sceneName", { length: 128 }),
  /** 镜头类型：close_up / medium / wide / extreme_close / aerial */
  shotType: varchar("shotType", { length: 64 }),
  /** 镜头画面描述（英文，用于生成首尾帧） */
  visualDescription: text("visualDescription"),
  /** 台词/旁白（英文） */
  dialogue: text("dialogue"),
  /** 角色名（逗号分隔） */
  characters: varchar("characters", { length: 256 }),
  /** 情绪/氛围 */
  emotion: varchar("emotion", { length: 64 }),
  /** 首帧图片 URL（Nano Banana Pro 生成） */
  firstFrameUrl: text("firstFrameUrl"),
  /** 尾帧图片 URL（Nano Banana Pro 生成，可选） */
  lastFrameUrl: text("lastFrameUrl"),
  /** 首帧生成提示词 */
  firstFramePrompt: text("firstFramePrompt"),
  /** 尾帧生成提示词 */
  lastFramePrompt: text("lastFramePrompt"),
  /** 视频 URL（Seedance 1.5 或 Veo 3.1 生成） */
  videoUrl: text("videoUrl"),
  /** 视频生成提示词 */
  videoPrompt: text("videoPrompt"),
  /** 视频生成引擎：seedance_1_5 / veo_3_1 */
  videoEngine: mysqlEnum("videoEngine", ["seedance_1_5", "veo_3_1"]),
  /** 视频时长（秒） */
  videoDuration: int("videoDuration"),
  /** 生成状态 */
  status: mysqlEnum("status", ["draft", "generating_frame", "frame_done", "generating_video", "done", "failed"]).default("draft").notNull(),
  /** 失败原因 */
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScriptShot = typeof scriptShots.$inferSelect;
export type InsertScriptShot = typeof scriptShots.$inferInsert;

// ─── 视频生成任务表（异步轮询）────────────────────────────────────────────────
export const videoJobs = mysqlTable("video_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  shotId: int("shotId").notNull(),
  /** 视频引擎 */
  engine: mysqlEnum("engine", ["seedance_1_5", "veo_3_1"]).notNull(),
  /** 外部任务 ID（fal request_id 或 Gemini operation name） */
  externalJobId: varchar("externalJobId", { length: 512 }),
  /** 任务状态 */
  status: mysqlEnum("status", ["pending", "processing", "done", "failed"]).default("pending").notNull(),
  /** 生成的视频 URL */
  videoUrl: text("videoUrl"),
  /** 错误信息 */
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VideoJob = typeof videoJobs.$inferSelect;
export type InsertVideoJob = typeof videoJobs.$inferInsert;
