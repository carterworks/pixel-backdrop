/**
 * Holds the demo page to what one frame of hover-only play asks of the
 * canvas, the worst frame of the worst toy, per display:
 *   canvasPixelsWritten  area of every putImageData (its dirty rectangle)
 *                        and drawImage (its destination), on any 2D or
 *                        offscreen canvas: the toy's frame, the display's
 *                        present and a panel's shadow; not vector drawing,
 *                        such as fillRect
 *   canvasPixelsRead     area of every getImageData, a read-back that can
 *                        stall a GPU canvas
 *   canvasCalls          those calls
 * Work a slow phone must do 60 times a second, so each limit is a ratchet:
 * today's count, exact because the page runs on Playwright's fake clock with
 * `Math.random` seeded. A change that does less lowers its limit to the new
 * count in the same commit; one is raised only on purpose, with the reason in
 * that commit.
 *
 *   pnpm budgets
 */
import { chromium } from "playwright";
import { serve } from "./serve.mjs";

const LIMITS = {
  canvasPixelsWritten: {
    light: 51_200,
    dark: 51_200,
    panel: 76_800,
    backlit: 51_200,
    graded: 51_200,
  },
  canvasPixelsRead: { light: 0, dark: 0, panel: 0, backlit: 0, graded: 0 },
  canvasCalls: { light: 2, dark: 2, panel: 3, backlit: 2, graded: 2 },
};

/** Runs in the page before its scripts: seeds `Math.random`, and counts canvas work per frame. */
function instrument() {
  let seed = 1;
  Math.random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const work = (window.__canvasWork = []);
  let row;
  // A dirty rectangle may run negative, and is clipped to the image.
  const clip = (from, length, limit) => {
    const start = Math.min(from, from + length);
    return Math.max(
      0,
      Math.min(limit, start + Math.abs(length)) - Math.max(0, start),
    );
  };
  const areas = {
    putImageData: (
      image,
      ...[, , x = 0, y = 0, w = image.width, h = image.height]
    ) => clip(x, w, image.width) * clip(y, h, image.height),
    // Only the three-argument form leaves the destination's size to the image.
    drawImage: (image, ...at) =>
      Math.abs(
        at.length === 2 ? image.width * image.height : at.at(-2) * at.at(-1),
      ),
    getImageData: (...[, , w, h]) => Math.abs(w * h),
  };
  for (const Context of [
    CanvasRenderingContext2D,
    OffscreenCanvasRenderingContext2D,
  ]) {
    for (const [name, area] of Object.entries(areas)) {
      const method = Context.prototype[name];
      Context.prototype[name] = function (...args) {
        // On the fake clock, everything one frame runs sees the same time.
        const frame = performance.now();
        if (row?.frame !== frame) {
          row = { frame, written: 0, read: 0, calls: 0 };
          work.push(row);
        }
        row[name === "getImageData" ? "read" : "written"] += area(...args);
        row.calls += 1;
        return method.apply(this, args);
      };
    }
  }
}

/**
 * Runs in the page: sweeps the pointer down the viewport's diagonal and back
 * up over `ms`, one move a frame, on the window, as the backdrop listens
 * there and the inline canvas, which would draw too, does not.
 */
const hover = (ms) => {
  let start;
  const frame = (now) => {
    start ??= now;
    const share = (now - start) / ms;
    if (share >= 1) return;
    const along = share < 0.5 ? share * 2 : 2 - share * 2;
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: along * innerWidth,
        clientY: along * innerHeight,
        pointerType: "mouse",
        pointerId: 1,
        isPrimary: true,
      }),
    );
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};

const server = serve();
const browser = await chromium.launch({ channel: "chromium" });
/** A fresh demo page, its clock paused once the backdrop is defined. */
const open = async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (error) => console.error(error));
  await page.addInitScript(instrument);
  await page.clock.install({ time: 0 });
  await page.goto(server.url);
  await page.waitForFunction(() => customElements.get("pixel-backdrop"));
  // The inline canvas draws only on its own, so a still toy there, settled
  // by the jump ahead, leaves every frame's work to the backdrop.
  await page.selectOption("#inline-toy", "peaks");
  await page.clock.pauseAt(10_000);
  return page;
};
let page = await open();
const toys = await page.locator("#toy option").evaluateAll((all) => all.map((option) => option.value));
const displays = await page.locator("#display option").evaluateAll((all) => all.map((option) => option.value));
const budgeted = Object.values(LIMITS).map((limits) => Object.keys(limits).sort().join());
if (toys.length === 0 || budgeted.some((names) => names !== [...displays].sort().join())) {
  throw new Error(`The budgets name displays ${budgeted[0]}, but the demo offers ${displays}.`);
}

const most = (rows, key) => Math.max(0, ...rows.map((row) => row[key]));
const rows = [];
for (const display of displays) {
  for (const toy of toys) {
    await page.close();
    page = await open();
    await page.selectOption("#shape", "square");
    await page.selectOption("#display", display);
    await page.selectOption("#toy", toy);
    await page.evaluate(hover, 500);
    await page.clock.runFor(500);
    await page.evaluate(() => __canvasWork.splice(0));
    await page.evaluate(hover, 500);
    await page.clock.runFor(500);
    const canvas = await page.evaluate(() => __canvasWork.splice(0));
    if (canvas.length === 0) throw new Error(`${toy} on ${display} drew nothing.`);
    rows.push({
      toy,
      display,
      frames: canvas.length,
      canvasPixelsWritten: most(canvas, "written"),
      canvasPixelsRead: most(canvas, "read"),
      canvasCalls: most(canvas, "calls"),
    });
  }
}
await browser.close();
server.close();
console.table(rows);

const results = [];
for (const display of displays) {
  const shown = rows.filter((row) => row.display === display);
  for (const [key, limits] of Object.entries(LIMITS)) {
    const worst = shown.reduce((top, row) => (row[key] > top[key] ? row : top));
    results.push({
      budget: `${key} per frame on ${display}, worst: ${worst.toy}`,
      measured: worst[key],
      limit: limits[display],
      result: worst[key] <= limits[display] ? "ok" : "MISSED",
    });
  }
}
console.table(results);
const missed = results.filter(({ result }) => result !== "ok");
console.log(`${results.length - missed.length} of ${results.length} budgets met.`);
process.exitCode = missed.length > 0 ? 1 : 0;
