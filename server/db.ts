import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, projects, creditLogs, type User, type InsertUser, type Project, type InsertProject, type InsertCreditLog } from "../drizzle/schema";

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
