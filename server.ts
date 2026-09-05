import express from "express";
import path from "path";
import { spawn, execSync, ChildProcess } from "child_process";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";

const PORT = 3000;
const PYTHON_PORT = 5001;
const FASTAPI_TARGET = `http://127.0.0.1:${PYTHON_PORT}`;

let fastapiProcess: ChildProcess | null = null;

function killStaleBackend(): void {
  try {
    execSync(`pkill -9 -f "backend/server.py" 2>/dev/null || true`);
  } catch {
    // ignore
  }
}

function startFastAPIServer(): void {
  if (fastapiProcess) return;
  killStaleBackend();
  console.log(`[RailSync] Starting authoritative Python backend on port ${PYTHON_PORT}...`);
  
  fastapiProcess = spawn(
    "python3",
    ["backend/server.py", "--port", PYTHON_PORT.toString(), "--host", "127.0.0.1"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
        PYTHONPATH: process.cwd(),
      },
    }
  );

  fastapiProcess.on("error", (err) => {
    console.error("[RailSync] Failed to launch Python backend process:", err);
  });

  fastapiProcess.on("exit", (code, signal) => {
    console.log(`[RailSync] Python backend process exited with code ${code}, signal ${signal}`);
    fastapiProcess = null;
    // Auto-respawn after brief delay if not shutting down
    if (!isShuttingDown) {
      setTimeout(() => {
        startFastAPIServer();
      }, 1000);
    }
  });
}

async function waitForBackendReady(maxRetries = 20, delayMs = 250): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${FASTAPI_TARGET}/api/v1/corridor/live`);
      if (res.ok || res.status === 200) {
        console.log(`[RailSync] Python backend is ready and listening on port ${PYTHON_PORT}.`);
        return true;
      }
    } catch {
      // Backend still booting up
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  console.warn(`[RailSync] Python backend start delayed on port ${PYTHON_PORT}. Proceeding...`);
  return false;
}

let isShuttingDown = false;

function cleanupProcesses() {
  isShuttingDown = true;
  if (fastapiProcess) {
    console.log("[RailSync] Shutting down FastAPI subprocess...");
    try {
      fastapiProcess.kill("SIGTERM");
    } catch {
      // ignore error
    }
    fastapiProcess = null;
  }
}

process.on("SIGINT", () => {
  cleanupProcesses();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanupProcesses();
  process.exit(0);
});

process.on("exit", () => {
  cleanupProcesses();
});

async function startServer() {
  startFastAPIServer();
  await waitForBackendReady();

  const app = express();

  // Health probe for root Express container
  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", gateway: "RailSync Express-Vite Gateway" });
  });

  // Reverse proxy all /api/* routes directly to the authoritative Python backend
  const apiProxy = createProxyMiddleware({
    target: FASTAPI_TARGET,
    changeOrigin: true,
    ws: true,
    pathFilter: (path) => path.startsWith("/api") || path.startsWith("/docs") || path === "/openapi.json",
    on: {
      error: (err: Error, _req: any, res: any) => {
        console.error("[Proxy Error]", err.message);
        if (res && typeof res.writeHead === "function" && !res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Backend starting or unreachable. Please retry shortly.", details: err.message }));
        }
      },
    },
  });

  app.use(apiProxy);

  // Catch-all for /api/* routes that are not handled by backend proxy
  app.use("/api/*", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found or unreachable" });
  });

  // Vite development middleware or static asset serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=============================================================`);
    console.log(`🚆 RailSync Unified Server running on http://0.0.0.0:${PORT}`);
    console.log(`🐍 Authoritative FastAPI Backend running on ${FASTAPI_TARGET}`);
    console.log(`=============================================================`);
  });
}

startServer();
