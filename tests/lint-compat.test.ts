import { expect, it } from "vitest";
import { ESLint, Linter } from "eslint";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
function check(
  code: string,
  pluginName: string,
  packageName: string,
  rules: Linter.RulesRecord,
) {
  return new Linter().verify(
    code,
    {
      files: ["**/*.{js,jsx}"],
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      plugins: { [pluginName]: require(packageName) },
      rules,
    },
    "fixture.jsx",
  );
}

it("keeps ESLint file matching and legacy overrides working with the patched matcher", async () => {
  await import("@eslint/config-array");
  const { FlatCompat } = await import("@eslint/eslintrc");
  const engine = new ESLint({
    overrideConfigFile: true,
    overrideConfig: new FlatCompat().config({
      overrides: [{ files: ["**/*.jsx"], rules: { "no-debugger": "error" } }],
    }),
  });
  const [result] = await engine.lintText("debugger;", {
    filePath: "src/probe.jsx",
  });
  expect(result.messages.map((m) => m.ruleId)).toEqual(["no-debugger"]);
});

it("preserves import glob allowances and private-submodule restrictions", () => {
  const sideEffects = check(
    'import "theme.css"; import "unapproved";',
    "import",
    "eslint-plugin-import",
    {
      "import/no-unassigned-import": ["error", { allow: ["**/*.css"] }],
    },
  );
  expect(sideEffects.map((m) => m.ruleId)).toEqual([
    "import/no-unassigned-import",
  ]);
  const privateImports = check(
    'import "pkg/private/secret"; import "pkg/public/view";',
    "import",
    "eslint-plugin-import",
    {
      "import/no-internal-modules": ["error", { forbid: ["**/private/**"] }],
    },
  );
  expect(privateImports.map((m) => m.ruleId)).toEqual([
    "import/no-internal-modules",
  ]);
});

it("preserves React component and prop-name glob checks", () => {
  const result = check(
    'const el = <PixvoButton data-unsafe="value" />;',
    "react",
    "eslint-plugin-react",
    {
      "react/forbid-component-props": [
        "error",
        {
          forbid: [
            { propNamePattern: "data-*", disallowedForPatterns: ["Pixvo*"] },
          ],
        },
      ],
    },
  );
  expect(result.map((m) => m.ruleId)).toEqual(["react/forbid-component-props"]);
});

it("still reports an unlabeled custom control and accepts one with a label", () => {
  const result = check(
    'const bad = <PixvoButton />; const good = <PixvoButton aria-label="Enviar" />;',
    "jsx-a11y",
    "eslint-plugin-jsx-a11y",
    {
      "jsx-a11y/control-has-associated-label": [
        "error",
        { controlComponents: ["PixvoButton"] },
      ],
    },
  );
  expect(result.map((m) => m.ruleId)).toEqual([
    "jsx-a11y/control-has-associated-label",
  ]);
});
