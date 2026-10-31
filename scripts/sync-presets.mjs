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
    .filter((n) => /\.(webp|svg)$/.test(n))
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
