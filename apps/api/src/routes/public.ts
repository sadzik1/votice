import { responseInputSchema } from "@survey/shared";
import { type Request, Router } from "express";
import type { AppDeps } from "../app.js";
import { randomToken } from "../lib/tokens.js";
import { createRateLimiter } from "../middleware/rate-limit.js";
import { getPublicSurvey, submitResponse } from "../services/responses.js";

const RESPONDENT_COOKIE = "rid";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function readRespondentId(req: Request): string | undefined {
  const value: unknown = req.cookies?.[RESPONDENT_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function publicRouter({ db, events, config }: AppDeps): Router {
  const router = Router();
  const limiter = createRateLimiter(config.rateLimits.responses);

  router.get("/surveys/:slug", async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(await getPublicSurvey(db, req.params.slug, readRespondentId(req)));
  });

  router.post("/surveys/:slug/responses", limiter, async (req, res) => {
    const slug = String(req.params.slug);
    const input = responseInputSchema.parse(req.body);

    let respondentId = readRespondentId(req);
    if (!respondentId) {
      respondentId = randomToken();
      res.cookie(RESPONDENT_COOKIE, respondentId, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.secureCookies,
        path: "/",
        maxAge: ONE_YEAR_MS,
      });
    }

    const { surveyId } = await submitResponse(db, slug, respondentId, input);
    events.publishResponse(surveyId);
    res.status(201).json({ ok: true });
  });

  return router;
}
