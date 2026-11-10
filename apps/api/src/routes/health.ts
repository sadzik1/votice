import type { HealthResponse } from "@survey/shared";
import { Router } from "express";

export function healthRouter(checkDb: () => Promise<boolean>): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const body: HealthResponse = {
      status: "ok",
      db: (await checkDb()) ? "up" : "down",
      uptimeSeconds: Math.round(process.uptime()),
    };
    res.json(body);
  });

  return router;
}
