import { culture } from "./culture.ts";
import { crags, horizon, peaks } from "./landscape.ts";
import { mote } from "./mote.ts";
import { pinbed } from "./pinbed.ts";
import { planet } from "./planet.ts";
import { pond } from "./pond.ts";
import { shimmer } from "./shimmer.ts";
import { silt } from "./silt.ts";
import { wax } from "./wax.ts";
import type { Toy } from "./toy.ts";

/**
 * Every backdrop toy, in menu order; the first is the default.
 */
export const TOYS: Toy[] = [
  shimmer,
  pond,
  pinbed,
  culture,
  wax,
  silt,
  mote,
  peaks,
  horizon,
  crags,
  planet,
];
