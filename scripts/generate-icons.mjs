/**
 * Generates icon files for the Electron desktop app.
 *
 * Outputs:
 *   public/icons/JK-icon.png   — 512×512 PNG rendered from JK-icon.svg
 *   public/icons/JK-icon.ico   — multi-resolution Windows ICO (16…256 px)
 *   public/icons/JKlogo-512.ico — ICO from the full JKlogo-512.png (kept for reference)
 *
 * Usage: node scripts/generate-icons.mjs
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const pngToIco = (await import("png-to-ico")).default;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "public", "icons");
const tmpDir = join(root, ".ico-tmp");

const ICO_SIZES = [16, 32, 48, 64, 128, 256];

async function generateIco(sourcePng, outputIco, label) {
  console.log(`\n🖼️  ${label}`);
  console.log(`   Source: ${sourcePng}`);

  mkdirSync(tmpDir, { recursive: true });

  const resizedPaths = [];
  for (const size of ICO_SIZES) {
    const outPath = join(tmpDir, `${size}.png`);
    await sharp(sourcePng)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    resizedPaths.push(outPath);
    process.stdout.write(`   ${size}px `);
  }
  console.log();

  const buf = await pngToIco(resizedPaths);
  writeFileSync(outputIco, buf);
  console.log(`   ✅ ICO: ${outputIco} (${(buf.length / 1024).toFixed(1)} KB)`);
}

// 1. Render JK-icon.svg → JK-icon.png
const svgSource = join(iconsDir, "JK-icon.svg");
const appIconPng = join(iconsDir, "JK-icon.png");
const appIconIco = join(iconsDir, "JK-icon.ico");

if (!existsSync(svgSource)) {
  console.error(`❌ SVG source not found: ${svgSource}`);
  process.exit(1);
}

console.log("🎨 Rendering JK-icon.svg → JK-icon.png …");
await sharp(readFileSync(svgSource))
  .resize(512, 512)
  .png()
  .toFile(appIconPng);
console.log(`   ✅ PNG: ${appIconPng}`);

await generateIco(appIconPng, appIconIco, "Building JK-icon.ico (app icon)");

// 2. Also regenerate JKlogo-512.ico from the original full logo PNG
const fullLogoPng = join(iconsDir, "JKlogo-512.png");
const fullLogoIco = join(iconsDir, "JKlogo-512.ico");

if (existsSync(fullLogoPng)) {
  await generateIco(fullLogoPng, fullLogoIco, "Building JKlogo-512.ico (full logo — kept for reference)");
}

// Clean up temp files
const { rmSync } = await import("fs");
try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}

console.log("\n✅ Icon generation complete.");
