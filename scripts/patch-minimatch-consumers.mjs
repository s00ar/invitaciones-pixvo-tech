// Temporary consumer-only API adaptation for minimatch 11 (CVE-2026-118764).
// Never changes minimatch itself or disables rules. Remove when upstreams migrate.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const plans = [
  {
    name: "eslint-plugin-import",
    version: "2.32.0",
    files: [
      "order",
      "no-unassigned-import",
      "no-namespace",
      "no-internal-modules",
      "no-import-module-exports",
      "no-extraneous-dependencies",
      "extensions",
      "no-restricted-paths",
    ].map((rule) => `lib/rules/${rule}.js`),
  },
  {
    name: "eslint-plugin-react",
    version: "7.37.5",
    files: [
      "lib/rules/forbid-component-props.js",
      "lib/rules/jsx-handler-names.js",
    ],
  },
  {
    name: "eslint-plugin-jsx-a11y",
    version: "6.10.2",
    files: [
      "lib/util/mayHaveAccessibleLabel.js",
      "lib/util/mayContainChildComponent.js",
    ],
  },
  {
    name: "@eslint/config-array",
    version: "0.21.2",
    files: ["dist/esm/index.js"],
    esm: true,
  },
  {
    name: "@eslint/eslintrc",
    version: "3.3.7",
    files: ["lib/config-array/override-tester.js"],
    esm: true,
  },
];
const writes = new Map();
for (const plan of plans) {
  const root = path.resolve("node_modules", plan.name);
  const manifest = path.join(root, "package.json");
  if (!existsSync(manifest)) continue; // npm ci --omit=dev needs no lint patches.
  if (JSON.parse(readFileSync(manifest, "utf8")).version !== plan.version)
    throw new Error(`Review minimatch compatibility for updated ${plan.name}`);
  const installed = require.resolve("minimatch/package.json", {
    paths: [root],
  });
  if (JSON.parse(readFileSync(installed, "utf8")).version !== "11.0.1")
    throw new Error(`Expected patched minimatch 11.0.1 for ${plan.name}`);
  for (const relative of plan.files) {
    const file = path.join(root, relative);
    const original = readFileSync(file, "utf8");
    let source = original;
    if (plan.esm) {
      source = source.replace(
        /import minimatch from (["'])minimatch\1/g,
        "import { minimatch } from $1minimatch$1",
      );
      if (!/import \{ minimatch \} from (["'])minimatch\1/.test(source))
        throw new Error(
          `Unexpected minimatch import in ${plan.name}/${relative}`,
        );
    } else {
      source = source.replace(
        /require\((["'])minimatch\1\)(?!\.minimatch)/g,
        "$&.minimatch",
      );
      if (!/require\((["'])minimatch\1\)\.minimatch/.test(source))
        throw new Error(
          `Unexpected minimatch require in ${plan.name}/${relative}`,
        );
    }
    if (
      plan.name === "eslint-plugin-import" &&
      relative.endsWith("/no-internal-modules.js")
    ) {
      // v11 removes makeRe(). This rule only needs a boolean matcher, not RegExp.
      source = source.replaceAll(
        "_minimatch2['default'].makeRe(p)",
        "new _minimatch2['default'].Minimatch(p)",
      );
      source = source.replaceAll("re.test(importPath)", "re.match(importPath)");
      if (
        source.includes(".makeRe(") ||
        !source.includes("re.match(importPath)")
      )
        throw new Error("Unexpected no-internal-modules matcher API");
    }
    if (source !== original) writes.set(file, source);
  }
}
// Validate every pinned consumer before modifying any file; repeated runs are inert.
for (const [file, source] of writes) writeFileSync(file, source);
console.log(
  `minimatch 11 consumer compatibility: ${writes.size} files updated.`,
);
