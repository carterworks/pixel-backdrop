import displays from "../../displays.json" with { type: "json" };
import type { BackdropDisplay } from "../pixel-backdrop/display.ts";

/** A display of every kind: plain in each scheme, and panels between them setting every look field. Shared with the demo. */
export const DISPLAYS = displays satisfies Record<string, BackdropDisplay>;
