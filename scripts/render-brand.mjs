import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const MOBILE = path.join(ROOT, "mobile/assets");

const markPink = fs.readFileSync(path.join(PUBLIC, "logo-mark.svg"), "utf8");
const markWhite = markPink.replaceAll("#E91E63", "#FFFFFF");
fs.writeFileSync(path.join(PUBLIC, "logo-mark-white.svg"), markWhite);

function lockup(fill, bg = null) {
  const inner = markPink.replaceAll("#E91E63", fill).replace(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 188" fill="none">',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 188" fill="none" width="260" height="188">',
  );
  const canvas = bg
    ? `<rect width="320" height="300" fill="${bg}"/>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 300"${bg ? ' width="320" height="300"' : ""}>
  ${canvas}
  <g transform="translate(30 8)">${inner.replace(/<\/?svg[^>]*>/g, "")}</g>
  <text x="160" y="268" text-anchor="middle" font-family="Inter" font-weight="700" font-style="italic" font-size="42" fill="${fill}">Lieferway</text>
</svg>`;
}

fs.writeFileSync(path.join(PUBLIC, "logo.svg"), lockup("#E91E63"));
fs.writeFileSync(path.join(PUBLIC, "logo-white.svg"), lockup("#FFFFFF"));

const whiteGroup = markWhite
  .replace(/<\/?svg[^>]*>/g, "")
  .replace("<g fill=\"#FFFFFF\">", "<g fill=\"#FFFFFF\">");

function appIconSvg(size = 1024, radius = 224) {
  const vbW = 260;
  const vbH = 188;
  const scale = (size * 0.72) / vbW;
  const tx = (size - vbW * scale) / 2;
  const ty = (size - vbH * scale) / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#E91E63"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})">${whiteGroup}</g>
</svg>`;
}

fs.writeFileSync(path.join(PUBLIC, "favicon.svg"), appIconSvg(32, 8));
fs.writeFileSync(path.join(PUBLIC, "icon.svg"), appIconSvg(1024, 224));

async function raster(svg, file, width, height = width, background) {
  let img = sharp(Buffer.from(svg), { density: 300 });
  if (background) {
    img = img.flatten({ background });
  }
  await img.resize(width, height, { fit: "contain", background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(file);
  console.log("wrote", path.relative(ROOT, file));
}

const ink = { r: 15, g: 23, b: 42, alpha: 1 };
const pink = { r: 233, g: 30, b: 99, alpha: 1 };

await raster(lockup("#E91E63"), path.join(PUBLIC, "logo.png"), 640, 600);
await raster(markPink, path.join(PUBLIC, "logo-mark.png"), 520, 376);
await raster(markWhite, path.join(PUBLIC, "logo-mark-white.png"), 520, 376);
await raster(lockup("#FFFFFF"), path.join(PUBLIC, "logo-white.png"), 640, 600);
await raster(lockup("#FFFFFF"), path.join(PUBLIC, "logo-white-on-ink.png"), 1024, 960, ink);
await raster(appIconSvg(1024, 224), path.join(PUBLIC, "apple-touch-icon.png"), 180, 180, pink);
await raster(appIconSvg(1024, 224), path.join(PUBLIC, "icon-192.png"), 192, 192, pink);
await raster(appIconSvg(1024, 224), path.join(PUBLIC, "icon-512.png"), 512, 512, pink);
await raster(appIconSvg(1024, 0), path.join(PUBLIC, "Lieferway-app-icon-pink-bg-1024.png"), 1024, 1024, pink);
await raster(appIconSvg(32, 8), path.join(PUBLIC, "favicon-32.png"), 32, 32, pink);
await raster(markPink, path.join(PUBLIC, "Lieferway-scooter-pink-transparent.png"), 1024, 740);
await raster(lockup("#FFFFFF"), path.join(PUBLIC, "Lieferway-scooter-white-on-ink.png"), 1024, 960, ink);

fs.mkdirSync(MOBILE, { recursive: true });
await raster(appIconSvg(1024, 0), path.join(MOBILE, "icon.png"), 1024, 1024, pink);
await raster(appIconSvg(48, 0), path.join(MOBILE, "favicon.png"), 48, 48, pink);
await raster(markWhite, path.join(MOBILE, "splash-icon.png"), 512, 370);
await raster(markWhite, path.join(MOBILE, "android-icon-foreground.png"), 1024, 1024);
await sharp({
  create: { width: 1024, height: 1024, channels: 3, background: pink },
})
  .png()
  .toFile(path.join(MOBILE, "android-icon-background.png"));
await raster(markWhite, path.join(MOBILE, "android-icon-monochrome.png"), 1024, 1024);

console.log("brand assets ready");
