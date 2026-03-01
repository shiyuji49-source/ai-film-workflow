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

// Team Members Table (reserved)
export const teamMembers = mysqlTable("teamMembers", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "editor", "viewer"]).default("viewer").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});
