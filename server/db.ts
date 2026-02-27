import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, projects, creditLogs, inviteCodes, type User, type InsertUser, type Project, type InsertProject, type InsertCreditLog } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── 用户 ────────────────────────────────────────────────────────────────────

export async function createUser(data: {
  identifier: string;
  identifierType: "email" | "phone";
  passwordHash: string;
  name?: string;
}): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  await db.insert(users).values({
    identifier: data.identifier,
    identifierType: data.identifierType,
    passwordHash: data.passwordHash,
    name: data.name ?? null,
    credits: 10000,
    lastSignedIn: new Date(),
  });

  const result = await db.select().from(users).where(eq(users.identifier, data.identifier)).limit(1);
  if (!result[0]) throw new Error("创建用户失败");

  // 记录注册赠送积分流水
  await db.insert(creditLogs).values({
    userId: result[0].id,
    delta: 10000,
    balance: 10000,
    action: "register_bonus",
    note: "注册赠送初始积分",
  });

  return result[0];
}

export async function getUserByIdentifier(identifier: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.identifier, identifier)).limit(1);
  return result[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserLastSignedIn(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

// ─── 积分 ────────────────────────────────────────────────────────────────────

/**
 * 扣除积分，返回扣除后余额。若积分不足则抛出错误。
 */
export async function deductCredits(
  userId: number,
  amount: number,
  action: InsertCreditLog["action"],
  projectId?: number,
  note?: string,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userResult[0];
  if (!user) throw new Error("用户不存在");

  if (user.credits < amount) {
    throw new Error(`积分不足（当前 ${user.credits}，需要 ${amount}）`);
  }

  const newBalance = user.credits - amount;
  await db.update(users).set({ credits: newBalance }).where(eq(users.id, userId));
  await db.insert(creditLogs).values({
    userId,
    delta: -amount,
    balance: newBalance,
    action,
    projectId: projectId ?? null,
    note: note ?? null,
  });

  return newBalance;
}

/**
 * 管理员充值积分
 */
export async function grantCredits(
  userId: number,
  amount: number,
  note?: string,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userResult[0];
  if (!user) throw new Error("用户不存在");

  const newBalance = user.credits + amount;
  await db.update(users).set({ credits: newBalance }).where(eq(users.id, userId));
  await db.insert(creditLogs).values({
    userId,
    delta: amount,
    balance: newBalance,
    action: "admin_grant",
    note: note ?? `管理员充值 ${amount} 积分`,
  });

  return newBalance;
}

export async function getCreditLogs(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditLogs)
    .where(eq(creditLogs.userId, userId))
    .orderBy(desc(creditLogs.createdAt))
    .limit(limit);
}

// ─── 项目 ────────────────────────────────────────────────────────────────────

export async function getUserProjects(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.isDeleted, false)))
    .orderBy(desc(projects.lastActiveAt));
}

export async function getProjectByClientId(userId: number, clientId: string): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.clientId, clientId), eq(projects.isDeleted, false)))
    .limit(1);
  return result[0];
}

export async function upsertProject(data: {
  userId: number;
  clientId: string;
  name: string;
  projectData: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  const existing = await getProjectByClientId(data.userId, data.clientId);
  if (existing) {
    await db.update(projects)
      .set({ name: data.name, data: data.projectData, lastActiveAt: new Date() })
      .where(eq(projects.id, existing.id));
  } else {
    await db.insert(projects).values({
      userId: data.userId,
      clientId: data.clientId,
      name: data.name,
      data: data.projectData,
      lastActiveAt: new Date(),
    });
  }
}

export async function deleteProject(userId: number, clientId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  await db.update(projects)
    .set({ isDeleted: true })
    .where(and(eq(projects.userId, userId), eq(projects.clientId, clientId)));
}

// ─── 管理员：用户列表 ────────────────────────────────────────────────────────

export async function getAllUsers(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    identifier: users.identifier,
    identifierType: users.identifierType,
    name: users.name,
    role: users.role,
    credits: users.credits,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.createdAt)).limit(limit);
}

// ─── 管理员：统计数据 ────────────────────────────────────────────────────────

/** 获取所有用户（带积分余额），支持分页 */
export async function adminGetUsers(page = 1, pageSize = 50) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };
  const offset = (page - 1) * pageSize;
  const list = await db.select({
    id: users.id,
    identifier: users.identifier,
    identifierType: users.identifierType,
    name: users.name,
    role: users.role,
    credits: users.credits,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.createdAt)).limit(pageSize).offset(offset);
  // 总数
  const countResult = await db.select({ count: users.id }).from(users);
  return { users: list, total: countResult.length };
}

/** AI 使用统计：按操作类型汇总消耗积分数和次数（最近 30 天） */
export async function adminGetAiStats() {
  const db = await getDb();
  if (!db) return [];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const logs = await db.select({
    action: creditLogs.action,
    delta: creditLogs.delta,
    createdAt: creditLogs.createdAt,
  }).from(creditLogs)
    .orderBy(desc(creditLogs.createdAt))
    .limit(10000);

  // 按操作类型聚合
  const stats: Record<string, { count: number; totalCredits: number }> = {};
  for (const log of logs) {
    if (log.delta >= 0) continue; // 跳过充值记录
    const key = log.action;
    if (!stats[key]) stats[key] = { count: 0, totalCredits: 0 };
    stats[key].count += 1;
    stats[key].totalCredits += Math.abs(log.delta);
  }
  return Object.entries(stats).map(([action, data]) => ({ action, ...data }));
}

/** 获取最近 30 天每日 AI 调用次数（折线图数据） */
export async function adminGetDailyStats() {
  const db = await getDb();
  if (!db) return [];
  const logs = await db.select({
    action: creditLogs.action,
    delta: creditLogs.delta,
    createdAt: creditLogs.createdAt,
  }).from(creditLogs)
    .orderBy(desc(creditLogs.createdAt))
    .limit(10000);

  // 按日期聚合（最近 30 天）
  const dailyMap: Record<string, { date: string; calls: number; credits: number }> = {};
  const now = Date.now();
  for (const log of logs) {
    if (log.delta >= 0) continue;
    const ts = log.createdAt.getTime();
    if (now - ts > 30 * 24 * 60 * 60 * 1000) continue;
    const date = log.createdAt.toISOString().slice(0, 10);
    if (!dailyMap[date]) dailyMap[date] = { date, calls: 0, credits: 0 };
    dailyMap[date].calls += 1;
    dailyMap[date].credits += Math.abs(log.delta);
  }
  return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
}

/** 获取全局概览数据 */
export async function adminGetOverview() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalCreditsGranted: 0, totalCreditsConsumed: 0, totalAiCalls: 0 };

  const allUsers = await db.select({ id: users.id, credits: users.credits }).from(users);
  const allLogs = await db.select({ delta: creditLogs.delta, action: creditLogs.action }).from(creditLogs);

  const totalUsers = allUsers.length;
  let totalCreditsGranted = 0;
  let totalCreditsConsumed = 0;
  let totalAiCalls = 0;

  for (const log of allLogs) {
    if (log.delta > 0) totalCreditsGranted += log.delta;
    else {
      totalCreditsConsumed += Math.abs(log.delta);
      if (['analyze_script', 'generate_shot', 'generate_prompt'].includes(log.action)) {
        totalAiCalls += 1;
      }
    }
  }

  return { totalUsers, totalCreditsGranted, totalCreditsConsumed, totalAiCalls };
}

// ─── 邀请码 ──────────────────────────────────────────────────────────────────

export async function createInviteCode(data: {
  code: string;
  createdBy: number;
  maxUses?: number;
  expiresAt?: number;
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  await db.insert(inviteCodes).values({
    code: data.code,
    createdBy: data.createdBy,
    maxUses: data.maxUses ?? 1,
    expiresAt: data.expiresAt ?? null,
    note: data.note ?? null,
    createdAt: Date.now(),
  });
}

export async function getInviteCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
  return result[0];
}

export async function useInviteCode(code: string, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const inv = await getInviteCodeByCode(code);
  if (!inv) return false;
  if (inv.useCount >= inv.maxUses) return false;
  if (inv.expiresAt && Date.now() > inv.expiresAt) return false;

  await db.update(inviteCodes)
    .set({
      useCount: inv.useCount + 1,
      usedBy: userId,
      usedAt: Date.now(),
    })
    .where(eq(inviteCodes.code, code));
  return true;
}

export async function getAllInviteCodes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
}

export async function deleteInviteCode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  await db.delete(inviteCodes).where(eq(inviteCodes.id, id));
}
