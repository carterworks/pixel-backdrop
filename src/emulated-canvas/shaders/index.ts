import type { Shader } from "../shader.ts";
import { ghost } from "./ghost.ts";
import { noise } from "./noise.ts";
import { palette } from "./palette.ts";

/**
 * Per-pixel passes over the logical bitmap, in order. To add an effect, write a
 * `Shader` and add it to this list.
 */
export const SHADERS: readonly Shader[] = [noise, palette, ghost];
