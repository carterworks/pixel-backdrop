import { join } from "node:path";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";

const SHOTS = [
  { toy: "wax", display: "backlit", shape: "square" },
  { toy: "planet", display: "graded", shape: "hex" },
  { toy: "crags", display: "panel", shape: "square" },
];

const root = join(import.meta.dirname, "..");
const server = serve();

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
page.on("pageerror", (error) => console.error(error));
page.on("requestfailed", (request) => console.error(request.url()));
await page.goto(server.url);
for (const shot of SHOTS) {
  await page.locator("main").evaluate((main) => (main.hidden = false));
  for (const [id, value] of Object.entries(shot)) await page.selectOption(`#${id}`, value);
  await page.waitForTimeout(3000);
  await page.locator("main").evaluate((main) => (main.hidden = true));
  await page.screenshot({ path: join(root, "screenshots", `${shot.toy}.png`) });
}
await page.locator("main").evaluate((main) => (main.hidden = false));
await page.selectOption("#display", "panel");
await page.selectOption("#toy", "wax");
await page.waitForTimeout(3000);
await page.locator("#inline").screenshot({ path: join(root, "screenshots", "inline.png") });
await browser.close();
server.close();
