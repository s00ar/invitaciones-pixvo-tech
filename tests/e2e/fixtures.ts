import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend<{ runtimeErrors: void }>({
  runtimeErrors: [
    async ({ page, context }, use) => {
      const errors: string[] = [];
      const observed = new Set<Page>();
      const observe = (target: Page) => {
        if (observed.has(target)) return;
        observed.add(target);
        target.on("pageerror", (error) => errors.push(error.message));
        target.on("console", (message) => {
          if (
            message.type() === "error" &&
            /hydration|hydrating|minified react error/i.test(message.text())
          )
            errors.push(message.text());
        });
      };
      observe(page);
      context.on("page", observe);
      await use();
      expect(
        errors,
        "errores de ejecución o hidratación del navegador",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
export type { Page, Locator } from "@playwright/test";
