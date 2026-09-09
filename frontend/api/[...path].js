export const config = {
  maxDuration: 60,
};

// Same-origin /api on Vercel → Render (or any) API.
// Browser never needs VITE_API_URL. Set API_ORIGIN in Vercel (no VITE_ prefix),
// e.g. https://regimens-api.onrender.com  (no trailing /api).
export default async function handler(req, res) {
  const origin = String(process.env.API_ORIGIN || "").replace(/\/$/, "");
  if (!origin) {
    res.status(500).json({
      message: "API_ORIGIN is not set. Add it in Vercel → Settings → Environment Variables (no VITE_ prefix).",
    });
    return;
  }

  const incoming = req.url || "/";
  const pathAndQuery = incoming.startsWith("/api")
    ? incoming
    : `/api${incoming.startsWith("/") ? incoming : `/${incoming}`}`;
  const target = origin + pathAndQuery;

  const headers = {};
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (value == null) continue;
    const lower = key.toLowerCase();
    if (["host", "connection", "content-length", "accept-encoding"].includes(lower)) continue;
    headers[key] = Array.isArray(value) ? value.join(",") : String(value);
  }

  const method = req.method || "GET";
  let body;
  if (method !== "GET" && method !== "HEAD") {
    body = await readBody(req);
    if (body.length === 0) body = undefined;
  }

  try {
    const upstream = await fetch(target, { method, headers, body });
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (["content-encoding", "transfer-encoding", "content-length"].includes(lower)) return;
      res.setHeader(key, value);
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    res.status(502).json({ message: err.message || "Upstream API unreachable" });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
