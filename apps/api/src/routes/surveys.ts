import { statusChangeInputSchema, surveyInputSchema } from "@survey/shared";
import { Router } from "express";
import type { AppDeps } from "../app.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";
import {
  changeStatus,
  createSurvey,
  deleteSurvey,
  getSurvey,
  listSurveys,
  replaceSurvey,
} from "../services/surveys.js";
import { registerResultsRoutes } from "./results.js";

export function surveysRouter(deps: AppDeps): Router {
  const { db } = deps;
  const router = Router();
  router.use(requireAuth);

  router.get("/", async (req, res) => {
    res.json({ surveys: await listSurveys(db, currentUserId(req)) });
  });

  router.post("/", async (req, res) => {
    const input = surveyInputSchema.parse(req.body);
    res.status(201).json({ survey: await createSurvey(db, currentUserId(req), input) });
  });

  router.get("/:id", async (req, res) => {
    res.json({ survey: await getSurvey(db, currentUserId(req), req.params.id) });
  });

  router.put("/:id", async (req, res) => {
    const input = surveyInputSchema.parse(req.body);
    res.json({ survey: await replaceSurvey(db, currentUserId(req), req.params.id, input) });
  });

  router.delete("/:id", async (req, res) => {
    await deleteSurvey(db, currentUserId(req), req.params.id);
    res.status(204).end();
  });

  router.post("/:id/status", async (req, res) => {
    const { status } = statusChangeInputSchema.parse(req.body);
    res.json({ survey: await changeStatus(db, currentUserId(req), req.params.id, status) });
  });

  registerResultsRoutes(router, deps);

  return router;
}
