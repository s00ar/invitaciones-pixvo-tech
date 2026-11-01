import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = process.cwd(),
  keys = [
    "id",
    "version",
    "name",
    "category",
    "tier",
    "family",
    "freeStyle",
    "theme",
    "backgroundAsset",
    "blocks",
    "optionalBlocks",
    "layoutNotes",
  ];
const catalog = JSON.parse(
  await readFile(path.join(root, "templates/catalog.json"), "utf8"),
);
const presets = catalog.map((t) =>
  Object.fromEntries(keys.map((k) => [k, t[k]])),
);
async function writeIfChanged(file, data) {
  let previous;
  try {
    previous = await readFile(file);
  } catch {}
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (!previous?.equals(bytes)) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
}
await writeIfChanged(
  path.join(root, "src/domain/presets.json"),
  JSON.stringify(presets, null, 2) + "\n",
);
const manifest = [];
for (const [source, destination, license] of [
  ["brand", "brand", "Identidad de Pixvo proporcionada por el titular"],
  [
    "assets/backgrounds",
    "assets/backgrounds",
    "SVG original del proyecto Pixvo",
  ],
]) {
  for (const name of (await readdir(path.join(root, source)))
    .filter((n) => /\.(webp|svg|png)$/.test(n))
    .sort()) {
    const bytes = await readFile(path.join(root, source, name));
    await writeIfChanged(path.join(root, "public", destination, name), bytes);
    manifest.push({
      path: `/${destination}/${name}`,
      source: `${source}/${name}`,
      license,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
}
// Reuse Pixvo's original favicon without changing the PNG pixels.
const favicon = await readFile(path.join(root, "brand/pixvo-favicon.png"));
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const width = favicon.readUInt32BE(16),
  height = favicon.readUInt32BE(20);
if (
  !favicon.subarray(0, 8).equals(pngSignature) ||
  width !== height ||
  width > 256 ||
  width < 1
)
  throw new Error("Pixvo favicon must be a square PNG up to 256 px");
await writeIfChanged(path.join(root, "src/app/icon.png"), favicon);
// ICO directory containing the unchanged PNG, for /favicon.ico compatibility.
const directory = Buffer.alloc(22);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(1, 4);
directory[6] = directory[7] = width === 256 ? 0 : width;
directory.writeUInt16LE(1, 10);
directory.writeUInt16LE(32, 12);
directory.writeUInt32LE(favicon.length, 14);
directory.writeUInt32LE(directory.length, 18);
await writeIfChanged(
  path.join(root, "src/app/favicon.ico"),
  Buffer.concat([directory, favicon]),
);
await writeIfChanged(
  path.join(root, "public/assets/provenance.json"),
  JSON.stringify(
    {
      fonts: "Sin archivos redistribuidos: fallbacks locales explícitos",
      assets: manifest,
    },
    null,
    2,
  ) + "\n",
);
console.log("27 presets saneados y recursos propios sincronizados.");
