import { test, expect } from "@playwright/test";

const CONTAMINATION = [
  "Gaines" + "ville",
  "Ala" + "chua",
  "F" + "lorida",
  "35" + "2",
];

test("seller valuation intake completes all 5 steps", async ({ page }) => {
  const failedRequests: string[] = [];
  page.on("response", (resp) => {
    if (resp.status() >= 400) {
      failedRequests.push(`${resp.status()} ${resp.url()}`);
    }
  });

  // ── Step 1: Question ──────────────────────────────────────────────────────
  await page.goto("/ask");
  await expect(page.getByText("What do you want to know?")).toBeVisible();

  const bodyText = await page.locator("body").innerText();
  for (const word of CONTAMINATION) {
    expect(bodyText, `Contamination found: "${word}"`).not.toContain(word);
  }

  await page.getByTestId("ask-question-textarea").fill(
    "What is my home worth in Wilson NC?"
  );
  await page.getByTestId("ask-address-input").fill(
    "123 Nash St NW, Wilson, NC 27896"
  );
  await page.screenshot({ path: "test-results/ask-step1-question.png" });

  await page.getByTestId("ask-continue-button").click();

  // ── Step 2: Intent / Timeline ─────────────────────────────────────────────
  await expect(page.getByText("What's your situation?")).toBeVisible();
  await page.getByTestId("intent-sell").click();
  await page.getByTestId("timeline-0").click(); // ASAP = value 0
  await page.screenshot({ path: "test-results/ask-step2-timeline.png" });
  await page.getByRole("button", { name: "Continue" }).click();

  // ── Step 3: Contact ───────────────────────────────────────────────────────
  await expect(page.getByText("How should Mike reach you?")).toBeVisible();
  await page.getByTestId("contact-first-name").fill("John");
  await page.getByTestId("contact-last-name").fill("Smith");
  await page.getByTestId("contact-email").fill("john@example.com");
  await page.getByTestId("contact-phone").fill("2525550100");
  await page.screenshot({ path: "test-results/ask-step3-contact.png" });
  await page.getByRole("button", { name: "Continue" }).click();

  // ── Step 4: Consent ───────────────────────────────────────────────────────
  await expect(page.getByText("How can Mike contact you?")).toBeVisible();

  const consentBody = await page.locator("body").innerText();
  expect(consentBody).toContain("Text / SMS");
  expect(consentBody).toContain("Phone Call");
  expect(consentBody).toContain("Email");
  expect(consentBody).toContain("Our Town Properties, Inc.");
  expect(consentBody).toContain("Wilson, NC");

  await page.getByTestId("consent-sms").click();
  await page.getByTestId("consent-call").click();
  await page.getByTestId("consent-email").click();
  await page.screenshot({ path: "test-results/ask-step4-consent.png" });
  await page.getByTestId("submit-intake").click();

  // ── Step 5: Confirmation ──────────────────────────────────────────────────
  await expect(page.getByTestId("confirmation-panel")).toBeVisible({
    timeout: 15_000,
  });
  await page.screenshot({ path: "test-results/ask-step5-confirmation.png" });

  const confirmText = await page.getByTestId("confirmation-panel").innerText();
  expect(confirmText).toContain("Thanks, John");
  expect(confirmText).toContain("Mike Eatmon");
  expect(confirmText).toContain("Our Town Properties");
  expect(confirmText).toContain("Wilson, NC");

  // ── Post-run assertions ───────────────────────────────────────────────────
  const favicon404 = failedRequests.filter((r) => r.includes("favicon.ico"));
  expect(favicon404, "favicon.ico should not 404").toHaveLength(0);

  const client422 = failedRequests.filter((r) => r.startsWith("422"));
  expect(client422, "No 422 validation errors allowed").toHaveLength(0);

  // Filter out known harmless framework requests (HMR websocket etc.)
  const hardFails = failedRequests.filter(
    (r) =>
      !r.includes("favicon.ico") &&
      !r.includes("_next/webpack-hmr") &&
      !r.includes("__nextjs")
  );
  expect(hardFails, `Unexpected failed requests: ${hardFails.join(", ")}`).toHaveLength(0);
});
