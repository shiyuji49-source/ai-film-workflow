import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerStripeWebhook } from "../routers/stripeWebhook";
import multer from "multer";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ⚠️ Stripe Webhook MUST be registered BEFORE express.json()
  // because it needs raw body for signature verification
  registerStripeWebhook(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // ── Asset image upload endpoint ─────────────────────────────────────────────
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });
  app.post("/api/upload-asset", upload.single("file"), async (req: any, res: any) => {
    try {
      // Verify session
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        user = null;
      }
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      const ext = req.file.originalname.split(".").pop() || "jpg";
      const key = `overseas-mj/${user.id}/${nanoid(10)}.${ext}`;
      const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);
      res.json({ url });
    } catch (err) {
      console.error("[upload-asset]", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // ── Image download proxy (bypasses CORS for S3 assets) ──────────────────────
  app.get("/api/download-proxy", async (req, res) => {
    const url = req.query.url as string;
    const filename = (req.query.filename as string) || "download.png";
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "Missing url parameter" });
      return;
    }
    // Only allow proxying our own S3 assets (security guard)
    const allowedHosts = [
      "cloudfront.net",
      "amazonaws.com",
      "manus.space",
      "d2xsxph8kpxj0f.cloudfront.net",
    ];
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      res.status(400).json({ error: "Invalid URL" });
      return;
    }
    const isAllowed = allowedHosts.some(h => parsedUrl.hostname.endsWith(h));
    if (!isAllowed) {
      res.status(403).json({ error: "URL not allowed" });
      return;
    }
    try {
      const upstream = await fetch(url);
      if (!upstream.ok) {
        res.status(upstream.status).json({ error: "Upstream fetch failed" });
        return;
      }
      const contentType = upstream.headers.get("content-type") || "application/octet-stream";
      const safeFilename = encodeURIComponent(filename);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${safeFilename}`);
      res.setHeader("Cache-Control", "no-cache");
      // Stream the response
      const arrayBuffer = await upstream.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error("[download-proxy] Error:", err);
      res.status(500).json({ error: "Proxy download failed" });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
