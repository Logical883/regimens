// src/middleware/security.js
// Baseline hardening for a finance-adjacent inventory API.
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const WEAK_SECRETS = new Set([
  "",
  "change_this_to_a_long_random_string",
  "secret",
  "jwt_secret",
  "changeme",
]);

function assertSecureEnv() {
  const secret = process.env.JWT_SECRET || "";
  if (WEAK_SECRETS.has(secret) || secret.length < 32) {
    console.error(
      "[security] JWT_SECRET must be set to a strong random value (32+ characters). Refusing to start."
    );
    process.exit(1);
  }
}

function applySecurity(app) {
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // Production (Vercel + Render): set CORS_ORIGIN to your site URL(s).
  // Supports exact origins and "*.vercel.app".
  // Local Vite: include http://localhost:5173
  // Empty allow-list: reflect Origin (first-boot convenience).
  const corsOrigin = process.env.CORS_ORIGIN || "";
  const allowed = corsOrigin
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);

  function isAllowedOrigin(origin) {
    const normalized = String(origin || "").replace(/\/$/, "");
    if (!normalized) return false;
    if (allowed.length === 0) return true;
    if (allowed.includes("*")) return true;
    if (allowed.includes(normalized)) return true;
    if (
      allowed.includes("*.vercel.app") &&
      /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)
    ) {
      return true;
    }
    return false;
  }

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin) return next();

    if (!isAllowedOrigin(origin)) {
      return res.status(403).json({ message: "Origin not allowed" });
    }

    res.setHeader(
      "Access-Control-Allow-Origin",
      allowed.includes("*") ? "*" : origin
    );
    res.setHeader("Vary", "Origin");
    if (!allowed.includes("*")) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again later." },
  });
  app.use("/api", globalLimiter);

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 20),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts. Please try again later." },
  });

  return { loginLimiter };
}

function sanitizeError(err, res) {
  const status = err.status || err.statusCode || 500;
  const safeMessage =
    status < 500
      ? err.message || "Request failed"
      : "Unexpected server error";
  if (status >= 500) console.error(err);
  return res.status(status).json({ message: safeMessage });
}

module.exports = { assertSecureEnv, applySecurity, sanitizeError };
