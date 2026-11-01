import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend<{ runtimeErrors: void }>({
  runtimeErrors: [
    async ({ page, context, browserName }, use, testInfo) => {
      const errors: string[] = [];
      const navigationDiagnostics: string[] = [];
      const failedRequests: { url: string; reason: string }[] = [];
      const observed = new Set<Page>();
      const observe = (target: Page) => {
        if (observed.has(target)) return;
        observed.add(target);
        let navigating = false;
        target.on("request", (request) => {
          if (
            request.isNavigationRequest() &&
            request.frame() === target.mainFrame()
          )
            navigating = true;
        });
        target.on("domcontentloaded", () => {
          navigating = false;
        });
        target.on("pageerror", (error) => {
          // WebKit misclassifies departing-document requests as JS errors,
          // sometimes without request events: microsoft/playwright#43120.
          // Keep these diagnostics; do not ignore errors outside navigation.
          if (
            browserName === "webkit" &&
            navigating &&
            /^\/(?:127\.0\.0\.1|localhost):\d+\/api\/\S+ due to access control checks\.$/.test(
              error.message,
            )
          ) {
            navigationDiagnostics.push(error.message);
          } else errors.push(error.message);
        });
        target.on("requestfailed", (request) =>
          failedRequests.push({
            url: request.url(),
            reason: request.failure()?.errorText ?? "",
          }),
        );
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
      if (navigationDiagnostics.length)
        await testInfo.attach("webkit-navigation-diagnostics", {
          body: JSON.stringify(navigationDiagnostics, null, 2),
          contentType: "application/json",
        });
      expect(
        errors,
        `errores de ejecución o hidratación del navegador; red: ${JSON.stringify(failedRequests)}`,
      ).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
export type { Page, Locator } from "@playwright/test";
