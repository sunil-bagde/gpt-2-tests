import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import authRouter from "./auth.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be set and at least 32 characters long.");
  process.exit(1);
}

const app = express();
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

// Slow down brute-force attempts on auth endpoints.
app.use(
  "/auth",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false })
);
app.use("/auth", authRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;

export { app };

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
}
