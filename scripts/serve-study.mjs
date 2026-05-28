import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "../study-site");
const BASE_PORT = Number(process.env.PORT, 10) || 8080;
const MAX_PORT_TRIES = 30;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  if (decoded.includes("\0")) return null;
  const segments = decoded.split("/").filter((s) => s && s !== "..");
  const relative = segments.join(path.sep);
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end();
    return;
  }

  let pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/") pathname = "/index.html";

  const filePath = safeJoin(ROOT, pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

function tryListen(port) {
  const onListening = () => {
    server.off("error", onError);
    const addr = server.address();
    const p =
      addr && typeof addr === "object" && "port" in addr ? addr.port : port;
    console.info(`Study site: http://localhost:${p}/`);
    console.info(`Press Ctrl+C to stop.`);
  };

  const onError = (err) => {
    server.off("listening", onListening);
    server.off("error", onError);
    if (
      err.code === "EADDRINUSE" &&
      port < BASE_PORT + MAX_PORT_TRIES - 1
    ) {
      const next = port + 1;
      console.warn(`Port ${port} is in use, trying ${next}…`);
      server.close(() => tryListen(next));
      return;
    }
    console.error(err);
    process.exit(1);
  };

  server.once("listening", onListening);
  server.once("error", onError);
  server.listen(port);
}

tryListen(BASE_PORT);
