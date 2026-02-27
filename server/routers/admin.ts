import { z } from "zod";
import * as db from "../db";
import { adminProcedure, router } from "../_core/trpc";

export const adminRouter = router({
  /** 获取全局概览统计 */
  getOverview: adminProcedure
    .query(async () => {
      return db.adminGetOverview();
    }),

  /** 获取用户列表（分页） */
  getUsers: adminProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      return db.adminGetUsers(input.page, input.pageSize);
    }),

  /** 给用户充值积分 */
  grantCredits: adminProcedure
    .input(z.object({
      userId: z.number().int(),
      amount: z.number().int().min(1).max(1000000),
      note: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const newBalance = await db.grantCredits(input.userId, input.amount, input.note);
      return { success: true, newBalance };
    }),

  /** 修改用户角色 */
  setUserRole: adminProcedure
    .input(z.object({
      userId: z.number().int(),
      role: z.enum(["user", "admin"]),
    }))
    .mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("数据库不可用");
      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await dbConn.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  /** 获取 AI 使用统计（按操作类型） */
  getAiStats: adminProcedure
    .query(async () => {
      return db.adminGetAiStats();
    }),

  /** 获取每日调用趋势（最近 30 天） */
  getDailyStats: adminProcedure
    .query(async () => {
      return db.adminGetDailyStats();
    }),

  /** 批量充值积分 */
  batchGrantCredits: adminProcedure
    .input(z.object({
      userIds: z.array(z.number().int()).min(1).max(200),
      amount: z.number().int().min(1).max(1000000),
      note: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const results = await Promise.all(
        input.userIds.map(uid => db.grantCredits(uid, input.amount, input.note))
      );
      return { success: true, count: results.length };
    }),

  /** 批量修改角色 */
  batchSetRole: adminProcedure
    .input(z.object({
      userIds: z.array(z.number().int()).min(1).max(200),
      role: z.enum(["user", "admin"]),
    }))
    .mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("数据库不可用");
      const { users } = await import("../../drizzle/schema");
      const { inArray } = await import("drizzle-orm");
      await dbConn.update(users).set({ role: input.role }).where(inArray(users.id, input.userIds));
      return { success: true, count: input.userIds.length };
    }),

  /** 获取用户积分流水 */
  getUserCreditLogs: adminProcedure
    .input(z.object({
      userId: z.number().int(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      return db.getCreditLogs(input.userId, input.limit);
    }),
});
