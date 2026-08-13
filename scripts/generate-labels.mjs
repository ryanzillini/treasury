import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public", "samples");
const fixtureDir = path.join(root, "fixtures", "images");

const WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

const TITLE_WARNING = WARNING.replace("GOVERNMENT WARNING", "Government Warning");

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrap(text, width) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function warningBlock(text, y) {
  const lines = wrap(text, 52);
  const tspans = lines
    .map(
      (line, index) =>
        `<tspan x="80" dy="${index === 0 ? 0 : 22}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  return `
    <text x="80" y="${y}" font-family="Georgia, serif" font-size="16" fill="#1a1a1a">${tspans}</text>
  `;
}

function labelSvg({
  background,
  accent,
  brand,
  subBrand,
  classType,
  alcohol,
  volume,
  extra,
  warning,
}) {
  const extraLine = extra
    ? `<text x="400" y="760" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#1a1a1a">${escapeXml(extra)}</text>`
    : "";
  const alcoholLine = alcohol
    ? `<text x="400" y="680" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#1a1a1a">${escapeXml(alcohol)}</text>`
    : "";
  const warningY = 880;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
  <rect width="800" height="1200" fill="${background}"/>
  <rect x="36" y="36" width="728" height="1128" fill="none" stroke="${accent}" stroke-width="6"/>
  <rect x="52" y="52" width="696" height="1096" fill="none" stroke="${accent}" stroke-width="2"/>
  <text x="400" y="220" text-anchor="middle" font-family="Georgia, serif" font-size="54" font-weight="700" fill="#1a1a1a">${escapeXml(brand)}</text>
  ${
    subBrand
      ? `<text x="400" y="280" text-anchor="middle" font-family="Georgia, serif" font-size="28" letter-spacing="6" fill="${accent}">${escapeXml(subBrand)}</text>`
      : ""
  }
  <line x1="180" y1="330" x2="620" y2="330" stroke="${accent}" stroke-width="2"/>
  <text x="400" y="420" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#1a1a1a">${escapeXml(classType)}</text>
  ${alcoholLine}
  <text x="400" y="730" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#1a1a1a">${escapeXml(volume)}</text>
  ${extraLine}
  ${warning ? warningBlock(warning, warningY) : ""}
</svg>`;
}

async function writePng(name, svg, overlay) {
  let image = sharp(Buffer.from(svg)).png();
  if (overlay) {
    image = sharp(Buffer.from(svg))
      .composite([{ input: Buffer.from(overlay), blend: "over" }])
      .png();
  }
  const buffer = await image.toBuffer();
  await sharp(buffer).toFile(path.join(publicDir, name));
  await sharp(buffer).toFile(path.join(fixtureDir, name));
  console.log("wrote", name);
}

const glareOverlay = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200">
  <defs>
    <radialGradient id="g" cx="50%" cy="40%" r="45%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.2"/>
    </radialGradient>
  </defs>
  <rect width="800" height="1200" fill="url(#g)"/>
  <rect x="120" y="180" width="560" height="70" fill="#ffffff" opacity="0.9" transform="rotate(-12 400 215)"/>
  <rect x="90" y="520" width="620" height="90" fill="#ffffff" opacity="0.95" transform="rotate(8 400 565)"/>
</svg>`;

const labels = {
  "old-tom.png": labelSvg({
    background: "#f3e6c8",
    accent: "#6b3a1f",
    brand: "OLD TOM DISTILLERY",
    subBrand: "EST. 1894",
    classType: "Kentucky Straight Bourbon Whiskey",
    alcohol: "45% Alc./Vol. (90 Proof)",
    volume: "750 mL",
    extra: "Old Tom Distillery, Frankfort, KY",
    warning: WARNING,
  }),
  "stones-throw.png": labelSvg({
    background: "#f3e6c8",
    accent: "#6b3a1f",
    brand: "STONE'S THROW",
    subBrand: "DISTILLERY",
    classType: "Kentucky Straight Bourbon Whiskey",
    alcohol: "45% Alc./Vol. (90 Proof)",
    volume: "750 mL",
    extra: "Stone's Throw Distillery, Frankfort, KY",
    warning: WARNING,
  }),
  "old-tom-title-case-warning.png": labelSvg({
    background: "#f3e6c8",
    accent: "#6b3a1f",
    brand: "OLD TOM DISTILLERY",
    subBrand: "EST. 1894",
    classType: "Kentucky Straight Bourbon Whiskey",
    alcohol: "45% Alc./Vol. (90 Proof)",
    volume: "750 mL",
    extra: "Old Tom Distillery, Frankfort, KY",
    warning: TITLE_WARNING,
  }),
  "old-tom-no-warning.png": labelSvg({
    background: "#f3e6c8",
    accent: "#6b3a1f",
    brand: "OLD TOM DISTILLERY",
    subBrand: "EST. 1894",
    classType: "Kentucky Straight Bourbon Whiskey",
    alcohol: "45% Alc./Vol. (90 Proof)",
    volume: "750 mL",
    extra: "Old Tom Distillery, Frankfort, KY",
    warning: "",
  }),
  "river-bench.png": labelSvg({
    background: "#f7f1e3",
    accent: "#3d4d2c",
    brand: "RIVER BENCH VINEYARDS",
    subBrand: "NAPA VALLEY",
    classType: "Cabernet Sauvignon",
    alcohol: "13.5% Alc. by Vol.",
    volume: "75 cl",
    extra: "United States",
    warning: WARNING,
  }),
  "harbor-light.png": labelSvg({
    background: "#e7eef4",
    accent: "#1f4e79",
    brand: "Harbor Light",
    subBrand: "BREWING CO.",
    classType: "Pale Ale",
    alcohol: "",
    volume: "12 fl. oz.",
    extra: "",
    warning: WARNING,
  }),
};

async function main() {
  mkdirSync(publicDir, { recursive: true });
  mkdirSync(fixtureDir, { recursive: true });

  for (const [name, svg] of Object.entries(labels)) {
    await writePng(name, svg);
  }

  await writePng("old-tom-glare.png", labels["old-tom.png"], glareOverlay);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
