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

// ─── 团队表（预留，后续团队协作使用）────────────────────────────────────────
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  ownerId: int("ownerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── 团队成员表（预留）──────────────────────────────────────────────────────
export const teamMembers = mysqlTable("teamMembers", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "editor", "viewer"]).default("viewer").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});
