import { spawn } from "child_process";
import { rmSync } from "fs";

const PORT = 3000;
const HEALTH_URL = `http://127.0.0.1:${PORT}/api/health`;
const POLL_INTERVAL = 1000;
const MAX_ATTEMPTS = 30;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "inherit", shell: true });
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`Exit ${code}`))
    );
  });
}

async function pollHealth() {
  let lastErr = null;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const res = await fetch(HEALTH_URL);
      const body = await res.text();
      if (res.ok) {
        const data = JSON.parse(body);
        if (data?.ok === true) return true;
      }
      lastErr = body || `HTTP ${res.status}`;
    } catch (e) {
      lastErr = e.message || String(e);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
  if (lastErr) console.error("Last health response:", lastErr);
  return false;
}

async function main() {
  let serverProc = null;
  try {
    console.log("Running lint...");
    await run("npm", ["run", "lint"]);
    console.log("Running build...");
    try {
      rmSync(".next", { recursive: true, force: true });
    } catch {}
    await run("npm", ["run", "build"]);
    console.log("Starting server...");
    serverProc = spawn("npx", ["next", "start", "-p", String(PORT)], {
      stdio: ["ignore", "ignore", "ignore"],
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env },
    });

    await new Promise((r) => setTimeout(r, 12000));
    console.log("Polling /api/health...");
    const ok = await pollHealth();
    if (!ok) {
      console.error("Health check failed");
      process.exit(1);
    }
    console.log("All smoke tests passed");
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  } finally {
    if (serverProc?.pid) {
      process.kill(serverProc.pid, "SIGTERM");
    }
  }
}

main();
