/** Logo is locked. Do not run this — it rebuilds a reconstructed lockup. */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");

const markInner = fs
  .readFileSync(path.join(PUBLIC, "logo-mark-header.svg"), "utf8")
  .replace(/<\/?svg[^>]*>/g, "");

function lockup(fill) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 172" width="700" height="172">
  <g transform="translate(-48 -14)">${markInner.replace(/#E91E63/g, fill)}</g>
  <text x="318" y="108" font-family="Inter" font-weight="700" font-style="italic" font-size="54" fill="${fill}">Lieferway</text>
</svg>`;
}

const pink = lockup("#E91E63");
const white = lockup("#FFFFFF");
fs.writeFileSync(path.join(PUBLIC, "logo-header.svg"), pink);
fs.writeFileSync(path.join(PUBLIC, "logo-header-white.svg"), white);

async function png(svg, file, height) {
  await sharp(Buffer.from(svg), { density: 300 })
    .resize({ height, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(file);
  console.log("wrote", path.relative(ROOT, file));
}

await png(pink, path.join(PUBLIC, "logo-header.png"), 128);
await png(pink, path.join(PUBLIC, "logo-header-h64.png"), 64);
await png(pink, path.join(PUBLIC, "logo-header-h96.png"), 96);
await png(pink, path.join(PUBLIC, "logo-header-h128.png"), 128);
await png(white, path.join(PUBLIC, "logo-header-white.png"), 128);
console.log("header lockup ready");
