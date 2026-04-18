/**
 * Generates a multi-resolution Windows ICO file from the source PNG.
 * Uses sharp to resize to ICO-compatible dimensions, then png-to-ico to bundle.
 * Output: public/icons/JKlogo-512.ico
 *
 * Usage: node scripts/generate-icons.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const pngToIco = (await import("png-to-ico")).default;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const sourcePng = join(root, "public", "icons", "JKlogo-512.png");
const outputIco = join(root, "public", "icons", "JKlogo-512.ico");
const tmpDir = join(root, ".ico-tmp");

// Standard Windows ICO sizes
const sizes = [16, 32, 48, 64, 128, 256];

console.log("🖼️  Generating Windows ICO file...");
console.log(`   Source: ${sourcePng}`);

try {
  mkdirSync(tmpDir, { recursive: true });

  // Resize source PNG to each required ICO size
  const resizedPaths = [];
  for (const size of sizes) {
    const outPath = join(tmpDir, `icon-${size}.png`);
    await sharp(sourcePng)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    resizedPaths.push(outPath);
    console.log(`   Resized to ${size}x${size}`);
  }

  // Bundle all sizes into one ICO
  const buf = await pngToIco(resizedPaths);
  writeFileSync(outputIco, buf);
  console.log(`✅ ICO generated: ${outputIco} (${(buf.length / 1024).toFixed(1)} KB)`);

  // Clean up temp files
  const { rmSync } = await import("fs");
  rmSync(tmpDir, { recursive: true, force: true });
} catch (error) {
  console.error("❌ Failed to generate ICO:", error.message);
  process.exit(1);
}
