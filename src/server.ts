import "dotenv/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import express, { type Request, type Response, type NextFunction } from "express";
import type { Server } from "node:http";
import whatsappRouter, { createWhatsAppRouter } from "./webhooks/whatsapp.js";
import simulatorRouter, { createSimulatorRouter } from "./webhooks/simulator.js";
import {
  checkDatabaseConnection,
  disconnectPrisma,
} from "./services/prismaClient.js";
import {
  checkRedisConnection,
  closeRedisConnection,
} from "./services/sessionService.js";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export type HealthChecks = {
  database(): Promise<void>;
  redis(): Promise<void>;
};

const HEALTH_CHECK_TIMEOUT_MS = 2000;

function withTimeout<T>(
  check: () => Promise<T>,
  service: string,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`${service} health check timed out.`)),
      HEALTH_CHECK_TIMEOUT_MS,
    );
  });

  return Promise.race([Promise.resolve().then(check), timedOut]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || req.method !== "POST" || req.path !== "/webhook") {
    next();
    return;
  }

  const signature = req.get("X-Hub-Signature-256");
  if (!req.rawBody || !signature?.startsWith("sha256=")) {
    res.sendStatus(401);
    return;
  }

  const expected = Buffer.from(
    `sha256=${createHmac("sha256", secret).update(req.rawBody).digest("hex")}`,
  );
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    res.sendStatus(401);
    return;
  }

  next();
}

export function createApp(
  router = whatsappRouter,
  healthChecks: HealthChecks = {
    database: checkDatabaseConnection,
    redis: checkRedisConnection,
  },
  simulator = simulatorRouter,
): express.Express {
  const app = express();
  app.use(express.json({
    limit: "1mb",
    verify: (req, _res, body) => {
      (req as Request).rawBody = Buffer.from(body);
    },
  }));
  app.use(verifyWebhookSignature);
  app.use(express.static(resolve("public"), { fallthrough: true, index: false }));

  app.get("/live", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.get("/health", async (_req: Request, res: Response) => {
    const [databaseResult, redisResult] = await Promise.allSettled([
      withTimeout(healthChecks.database, "Database"),
      withTimeout(healthChecks.redis, "Redis"),
    ]);
    const database = databaseResult.status === "fulfilled" ? "ok" : "unavailable";
    const redis = redisResult.status === "fulfilled" ? "ok" : "unavailable";
    const healthy = database === "ok" && redis === "ok";

    res.status(healthy ? 200 : 503).json({
      status: healthy ? "ok" : "unhealthy",
      database,
      redis,
    });
  });

  app.use(simulator);
  app.use(router);
  return app;
}

export const app = createApp();

export function startServer(
  port = Number(process.env.PORT) || 10000,
  host = "0.0.0.0",
): Server {
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError("PORT must be an integer between 0 and 65535.");
  }

  const server = app.listen(port, host, () => {
    console.log(`MediCompare WA listening on ${host}:${port}.`);
  });
  server.on("error", (error) => {
    console.error("MediCompare WA HTTP server failed:", error);
    process.exitCode = 1;
  });
  let shuttingDown = false;

  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`Received ${signal}; shutting down MediCompare WA.`);

    server.close((closeError) => {
      void (async () => {
        const [prismaResult, redisResult] = await Promise.allSettled([
          disconnectPrisma(),
          closeRedisConnection(),
        ]);
        if (closeError) {
          console.error("HTTP server shutdown failed:", closeError);
        }
        if (prismaResult.status === "rejected") {
          console.error("Prisma shutdown failed:", prismaResult.reason);
        }
        if (redisResult.status === "rejected") {
          console.error("Redis shutdown failed:", redisResult.reason);
        }
        if (closeError || prismaResult.status === "rejected" || redisResult.status === "rejected") {
          process.exitCode = 1;
        }
      })();
    });
    server.closeIdleConnections();
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  return server;
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    startServer();
  } catch (error) {
    console.error("MediCompare WA failed to start:", error);
    process.exitCode = 1;
  }
}
