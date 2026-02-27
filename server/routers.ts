import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { aiRouter } from "./routers/ai";
import { authRouter } from "./routers/auth";
import { projectsRouter } from "./routers/projects";
import { adminRouter } from "./routers/admin";

export const appRouter = router({
  system: systemRouter,
  ai: aiRouter,
  auth: authRouter,
  projects: projectsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
