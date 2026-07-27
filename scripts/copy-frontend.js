// Copies frontend/dist → backend/public so the web service only needs backend/ at runtime.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "frontend", "dist");
const dest = path.join(__dirname, "..", "backend", "public");

function rimraf(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const fromPath = path.join(from, entry.name);
    const toPath = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(fromPath, toPath);
    else fs.copyFileSync(fromPath, toPath);
  }
}

if (!fs.existsSync(path.join(src, "index.html"))) {
  console.error("frontend/dist/index.html missing. Run the frontend build first.");
  process.exit(1);
}

rimraf(dest);
copyDir(src, dest);
console.log(`Copied ${src} → ${dest}`);
