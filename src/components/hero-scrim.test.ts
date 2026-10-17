import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { luminance } from "@/lib/contrast";
import { AA_NORMAL_TEXT } from "@/lib/contrast";

/**
 * WHITE TEXT OVER A PHOTOGRAPH.
 *
 * `DisciplineHero` puts a heading and a subtitle on top of a rotating
 * slideshow of department photographs, darkened by a single left-to-right
 * black scrim. That makes legibility a property of the PHOTOGRAPHS, not of
 * the tokens — no theme check can see it, because no theme is involved.
 *
 * It was failing. Measured over all hero images, 24 of 80 text/image
 * combinations were below AA, worst 3.54:1, and even the opaque heading
 * failed at 4.21:1 on the brightest image. The photographs vary enormously —
 * a dark refinery clears 10.71:1 where a bright workshop does not — so
 * opening the page and looking proves nothing: the slideshow rotates, and
 * whichever frame is on screen is the one you did not need to check.
 *
 * This decodes each image, composites the scrim over its real pixels and the
 * text over that, and fails on the worst pixel in the band the text occupies.
 * Adding a bright photograph to public/img is the thing most likely to break
 * this, and this is what will catch it.
 *
 * `sharp` is a Next dependency, so it is already installed; the suite skips
 * rather than fails if that ever stops being true, because a missing optional
 * dependency is not a contrast regression.
 */

const IMG_DIR = join(process.cwd(), "public/img");

/** Mirrors `bg-gradient-to-r from-black/80 via-black/65 to-black/25`. */
const scrimAlphaAt = (pct: number) =>
  pct <= 50 ? 0.8 + (pct / 50) * (0.65 - 0.8) : 0.65 + ((pct - 50) / 50) * (0.25 - 0.65);

const ratio = (a: number, b: number) => {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * How far across the hero the text can reach.
 *
 * Measured at 39% on a 1280px viewport. It grows as the hero narrows, because
 * the text is capped in CHARACTERS (max-w-[42ch]) while the hero is a
 * fraction of the screen. 60% is the figure to design against, not the 39%
 * that a desktop browser happens to show.
 */
const TEXT_EXTENT = 0.6;

describe("hero text stays legible over every photograph", async () => {
  let sharp: typeof import("sharp") | null = null;
  try {
    sharp = (await import("sharp")).default as unknown as typeof import("sharp");
  } catch {
    sharp = null;
  }

  const files = existsSync(IMG_DIR)
    ? readdirSync(IMG_DIR).filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f))
    : [];

  it("has images to check and a sharp to check them with", () => {
    expect(files.length, "public/img should contain hero images").toBeGreaterThan(0);
    if (!sharp) console.warn("sharp unavailable — hero scrim contrast not measured");
  });

  it("keeps the scrim in the component matching the one measured here", () => {
    // If the component's gradient changes and this does not, every assertion
    // below is measuring a scrim the product no longer renders.
    const src = readFileSync(
      join(process.cwd(), "src/components/discipline-hero.tsx"),
      "utf8",
    );
    expect(src).toContain("from-black/80 via-black/65 to-black/25");
    // The subtitle must stay opaque: at 0.85 it measured 4.29:1 even with
    // this scrim, on a narrow viewport.
    //
    // Scoped to className attributes, not the whole file. The first version
    // matched anywhere and failed on the comment in the component that
    // explains why the translucent version was removed — a test that forbids
    // documenting the bug it guards against is a bad test.
    const classNames = [...src.matchAll(/className=["'`]([^"'`]*)["'`]/g)]
      .map((m) => m[1])
      .join(" ");
    expect(classNames, "hero subtitle must not be translucent").not.toMatch(
      /text-white\/\d+/,
    );
  });

  it.runIf(sharp)("renders white at 4.5:1 on the worst pixel of every image", async () => {
    const W = 200;
    const H = 80;
    const xMax = Math.ceil(W * TEXT_EXTENT);
    const failures: string[] = [];

    for (const file of files) {
      const { data } = await sharp!(join(IMG_DIR, file))
        .resize(W, H, { fit: "fill" })
        .raw()
        .toBuffer({ resolveWithObject: true });

      let worst = Infinity;
      for (let y = Math.floor(H * 0.25); y < Math.ceil(H * 0.75); y++) {
        for (let x = 0; x < xMax; x++) {
          const i = (y * W + x) * 3;
          const a = scrimAlphaAt((x / W) * 100);
          // Black scrim over the photograph, then opaque white text over that.
          const bgLum = luminance({
            r: (data[i] * (1 - a)) / 255,
            g: (data[i + 1] * (1 - a)) / 255,
            b: (data[i + 2] * (1 - a)) / 255,
          });
          const r = ratio(luminance({ r: 1, g: 1, b: 1 }), bgLum);
          if (r < worst) worst = r;
        }
      }
      if (worst < AA_NORMAL_TEXT) failures.push(`${file} ${worst.toFixed(2)}:1`);
    }

    expect(failures, `hero images below AA: ${failures.join(", ")}`).toEqual([]);
  });
});
