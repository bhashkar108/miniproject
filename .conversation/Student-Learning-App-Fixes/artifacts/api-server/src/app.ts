import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { GeminiConfigurationError, GeminiRequestError } from "./lib/gemini";
import { HttpError } from "./lib/httpErrors";
import { UploadValidationError } from "./lib/uploads";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use(
  (
    error: unknown,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ): void => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof UploadValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof GeminiConfigurationError) {
      res.status(503).json({ error: error.message });
      return;
    }
    if (error instanceof GeminiRequestError) {
      req.log.warn(
        { providerStatus: error.providerStatus ?? null },
        "Gemini request could not be completed",
      );
      res.status(502).json({ error: error.message });
      return;
    }

    req.log.error(
      { errorType: error instanceof Error ? error.name : "UnknownError" },
      "API request failed",
    );
    res.status(500).json({ error: "Something went wrong. Please try again." });
  },
);

export default app;
