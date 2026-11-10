import type { Router } from "express";
import { z } from "zod";
import type { AppDeps } from "../app.js";
import type { ResponseEvent } from "../lib/events.js";
import { currentUserId } from "../middleware/auth.js";
import { assertOwnsSurvey, exportCsv, getResults, listTextAnswers } from "../services/results.js";

const pageQuerySchema = z.object({
  cursor: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const HEARTBEAT_MS = 25_000;

export function registerResultsRoutes(router: Router, { db, events }: AppDeps): void {
  router.get("/:id/results", async (req, res) => {
    res.json({ results: await getResults(db, currentUserId(req), req.params.id) });
  });

  router.get("/:id/questions/:questionId/answers", async (req, res) => {
    const query = pageQuerySchema.parse(req.query);
    res.json(
      await listTextAnswers(db, currentUserId(req), req.params.id, req.params.questionId, query),
    );
  });

  router.get("/:id/export.csv", async (req, res) => {
    const { filename, csv } = await exportCsv(db, currentUserId(req), req.params.id);
    res.attachment(filename);
    res.type("text/csv; charset=utf-8");
    res.send(csv);
  });

  // SSE; EventSource reconnects on its own
  router.get("/:id/results/stream", async (req, res) => {
    const surveyId = req.params.id;
    await assertOwnsSurvey(db, currentUserId(req), surveyId);

    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    res.write("retry: 5000\n\n");

    const unsubscribe = events.subscribe(surveyId, (event: ResponseEvent) => {
      res.write(`event: response\ndata: ${JSON.stringify(event)}\n\n`);
    });
    // keep-alive for proxies
    const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}
