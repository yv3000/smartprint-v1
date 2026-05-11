/**
 * Paper dimensions (portrait, mm) and margin helpers for preview + admin display.
 */

export type PaperKey = string;

/** Portrait width × height in mm */
export const PAPER_PORTRAIT_MM: Record<string, { w: number; h: number }> = {
  A2: { w: 420, h: 594 },
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  A6: { w: 105, h: 148 },
  Letter: { w: 216, h: 279 },
  Legal: { w: 216, h: 356 },
  Tabloid: { w: 279, h: 432 },
  Executive: { w: 184, h: 267 },
  B4: { w: 250, h: 353 },
  B5: { w: 176, h: 250 },
  "4×6 in": { w: 102, h: 152 },
  "5×7 in": { w: 127, h: 178 },
  "10×15 cm": { w: 100, h: 150 },
  "13×18 cm": { w: 130, h: 180 },
  "20×25 cm": { w: 200, h: 250 },
};

export function getPaperPortraitMm(paperSize: string): { w: number; h: number } {
  return PAPER_PORTRAIT_MM[paperSize] || PAPER_PORTRAIT_MM.A4;
}

export function getPaperAspectForOrientation(
  paperSize: string,
  orientation: "Portrait" | "Landscape"
): { w: number; h: number } {
  const { w, h } = getPaperPortraitMm(paperSize);
  return orientation === "Landscape" ? { w: h, h: w } : { w, h };
}

export function getMarginMm(settings: {
  margins: string;
  customMarginTopBottom?: number;
  customMarginLeftRight?: number;
}): { top: number; right: number; bottom: number; left: number } {
  const { margins, customMarginTopBottom, customMarginLeftRight } = settings;
  if (margins === "Custom") {
    const tb = (customMarginTopBottom ?? 1) * 25.4;
    const lr = (customMarginLeftRight ?? 1) * 25.4;
    return { top: tb, right: lr, bottom: tb, left: lr };
  }
  const map: Record<string, number> = {
    Default: 19,
    None: 0,
    Narrow: 6.35,
    Normal: 12.7,
    Wide: 25.4,
  };
  const m = map[margins] ?? 19;
  return { top: m, right: m, bottom: m, left: m };
}
