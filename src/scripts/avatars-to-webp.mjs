import sharp from "sharp";
import { readdir, mkdir, stat } from "node:fs/promises";
import { resolve, basename } from "node:path";

const SRC = resolve("public/avatars");
const SIZES = [
  { suffix: "thumb", width: 128 },
  { suffix: "full", width: 512 },
];

async function processCategory(catDir) {
  const files = (await readdir(catDir)).filter((f) => f.endsWith(".svg"));
  for (const file of files) {
    const inPath = resolve(catDir, file);
    const stats = await stat(inPath);
    const name = basename(file, ".svg");

    for (const { suffix, width } of SIZES) {
      const outPath = resolve(catDir, `${name}-${suffix}.webp`);
      await sharp(inPath, { density: 300 })
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outPath);
      const out = await stat(outPath);
      console.log(
        `${file} (${(stats.size / 1024).toFixed(0)} KB) → ${name}-${suffix}.webp (${(out.size / 1024).toFixed(1)} KB)`,
      );
    }
  }
}

const categories = await readdir(SRC);
for (const cat of categories) {
  const catDir = resolve(SRC, cat);
  if ((await stat(catDir)).isDirectory()) {
    console.log(`\n=== ${cat} ===`);
    await processCategory(catDir);
  }
}
