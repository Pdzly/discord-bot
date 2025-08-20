// adjusted from https://github.com/kaivi/node-canvas-text
// adjusted from https://github.com/kaivi/node-canvas-text
import { Font } from "opentype.js";
import { CanvasRenderingContext2D } from "canvas";

const measureText = (
  text: string,
  font: Font,
  fontSize: number,
): {
  actualBoundingBoxDescent: number;
  fontBoundingBoxDescent: number;
  width: number;
  fontBoundingBoxAscent: number;
  actualBoundingBoxAscent: number;
  height: number;
} => {
  const scale = (1 / font.unitsPerEm) * fontSize;
  const glyphs = font.stringToGlyphs(text);
  let ascent = 0;
  let descent = 0;
  let width = 0;

  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i]!;
    width += (glyph.advanceWidth ?? 0) * scale;
    if (i < glyphs.length - 1) {
      const kerningValue = font.getKerningValue(glyph, glyphs[i + 1]!);
      width += kerningValue * scale;
    }

    const { yMin, yMax } = glyph.getMetrics();

    ascent = Math.max(ascent, yMax);
    descent = Math.min(descent, yMin);
  }

  return {
    width,
    height: Math.abs(ascent) * scale + Math.abs(descent) * scale,
    actualBoundingBoxAscent: ascent * scale,
    actualBoundingBoxDescent: descent * scale,
    fontBoundingBoxAscent: font.ascender * scale,
    fontBoundingBoxDescent: font.descender * scale,
  };
};

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StrokeOptions {
  color: string;
  width: number;
}

interface Options {
  minSize: number;
  maxSize: number;
  hAlign: string;
  vAlign: string;
  granularity: number;
  stroke?: StrokeOptions;
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontObject: Font,
  rectangle: Rectangle,
  options: Options,
): void {
  if (options.minSize > options.maxSize) {
    throw new Error("Min font size can not be larger than max font size");
  }

  ctx.save();

  // Calculate the maximum stroke width that will be used
  const maxStrokeWidth = options.stroke ? options.stroke.width : 0;

  // Reserve space for stroke
  const strokeMargin = maxStrokeWidth;
  const availableWidth = rectangle.width - strokeMargin * 2;
  const availableHeight = rectangle.height - strokeMargin * 2;

  let fontSize = options.maxSize;
  let textMetrics = measureText(text, fontObject, fontSize);
  let textWidth = textMetrics.width;
  let textHeight = textMetrics.height;

  // Size the text to fit within the available space
  while (
    (textWidth > availableWidth || textHeight > availableHeight) &&
    fontSize >= options.minSize
  ) {
    fontSize = fontSize - options.granularity;
    textMetrics = measureText(text, fontObject, fontSize);
    textWidth = textMetrics.width;
    textHeight = textMetrics.height;
  }

  // Position the text with stroke margin offset
  let xPos = rectangle.x + strokeMargin;
  let yPos =
    rectangle.y +
    rectangle.height -
    Math.abs(textMetrics.actualBoundingBoxDescent) -
    strokeMargin;

  switch (options.hAlign) {
    case "right":
      xPos = xPos + availableWidth - textWidth;
      break;
    case "center":
    case "middle":
      xPos = xPos + availableWidth / 2 - textWidth / 2;
      break;
    case "left":
      break;
    default:
      throw new Error("Invalid options.hAlign parameter: " + options.hAlign);
  }

  switch (options.vAlign) {
    case "top":
      yPos = yPos - rectangle.height + textHeight + strokeMargin * 2;
      break;
    case "center":
    case "middle":
      yPos = yPos + textHeight / 2 - rectangle.height / 2 + strokeMargin;
      break;
    case "bottom":
    case "baseline":
      break;
    default:
      throw new Error("Invalid options.vAlign parameter: " + options.vAlign);
  }

  if (options.stroke) {
    // Set stroke properties to prevent extending beyond path
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Draw stroke layers from thickest to thinnest
    const strokeWidths =
      options.stroke.width > 4
        ? [options.stroke.width, options.stroke.width - 2]
        : [options.stroke.width];

    // Sort stroke widths in descending order (thickest first)
    strokeWidths.sort((a, b) => b - a);

    for (const strokeWidth of strokeWidths) {
      // Create a fresh path for each stroke
      const strokePath = fontObject.getPath(text, xPos, yPos, fontSize, {});

      // Set stroke properties on the path
      strokePath.fill = null;
      strokePath.stroke = options.stroke.color;
      strokePath.strokeWidth = strokeWidth;

      // Apply stroke settings to prevent overextension
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.miterLimit = 1;

      // @ts-expect-error this is quite bad but i hope it will be fine
      strokePath.draw(ctx);

      ctx.restore();
    }
  }

  // Draw the fill on top using the exact same coordinates
  const fillPath = fontObject.getPath(text, xPos, yPos, fontSize, {});
  fillPath.fill = ctx.fillStyle as string;
  fillPath.stroke = null;
  fillPath.strokeWidth = 0;
  // @ts-expect-error this is quite bad but i hope it will be fine
  fillPath.draw(ctx);

  ctx.restore();
}
