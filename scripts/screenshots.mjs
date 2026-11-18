import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const SHOTS = [
  { toy: "wax", display: "backlit", shape: "square" },
  { toy: "planet", display: "graded", shape: "hex" },
  { toy: "crags", display: "panel", shape: "square" },
];

const root = join(import.meta.dirname, "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
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

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
page.on("pageerror", (error) => console.error(error));
page.on("requestfailed", (request) => console.error(request.url()));
await page.goto(`http://localhost:${server.address().port}/`);
for (const shot of SHOTS) {
  await page.locator("main").evaluate((main) => (main.hidden = false));
  for (const [id, value] of Object.entries(shot)) await page.selectOption(`#${id}`, value);
  await page.waitForTimeout(3000);
  await page.locator("main").evaluate((main) => (main.hidden = true));
  await page.screenshot({ path: join(root, "screenshots", `${shot.toy}.png`) });
}
await browser.close();
server.close();
