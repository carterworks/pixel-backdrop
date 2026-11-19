import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = join(import.meta.dirname, "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

/** Serves the repo's root, the demo page and its build, on a free port. */
export function serve() {
  const server = createServer(async (req, res) => {
    const path = join(root, new URL(req.url, "http://x").pathname.replace(/\/$/, "/index.html"));
    try {
      const body = await readFile(path);
      res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  }).listen(0);
  return { url: `http://localhost:${server.address().port}/`, close: () => server.close() };
}
