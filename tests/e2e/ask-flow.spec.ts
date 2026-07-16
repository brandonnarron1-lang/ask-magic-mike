import { expect, test } from "@playwright/test";

test("active Ask Mike flow uses intercepted chat and lead persistence", async ({ page }) => {
  let chatPayload: Record<string, unknown> | null = null;
  const leadPayloads: Array<Record<string, unknown>> = [];

  await page.route("**/api/chat", async (route) => {
    chatPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Synthetic local answer: Mike can review timing and property context with you.",
      }),
    });
  });
  await page.route("**/api/leads", async (route) => {
    leadPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        lead_id: "qa_intercepted_chat_lead",
        session_id: "qa_intercepted_chat_session",
      }),
    });
  });

  await page.goto("/ask");
  await expect(page.getByRole("heading", { name: /focused local real estate advisor/i })).toBeVisible();
  await page.getByLabel("Ask Mike message").fill("What should I prepare before listing in Wilson?");
  await page.getByRole("button", { name: "Send Question" }).click();

  await expect(page.getByText(/Synthetic local answer/)).toBeVisible();
  expect(chatPayload).toMatchObject({
    message: "What should I prepare before listing in Wilson?",
    lead_source_surface: "ask_page",
  });
  expect(leadPayloads[0]).toMatchObject({
    funnel_type: "chat",
    lead_source_surface: "ask_page",
    question: "What should I prepare before listing in Wilson?",
  });
  expect(
    typeof (leadPayloads[0] as unknown as Record<string, unknown>).widget_session_id,
  ).toBe("string");

  await page.getByLabel("Ask Mike message").fill("What about a second distinct question?");
  await page.getByRole("button", { name: "Send Question" }).click();
  await expect.poll(() => leadPayloads.length).toBe(2);
  expect(leadPayloads[1]).toMatchObject({
    funnel_type: "chat",
    question: "What about a second distinct question?",
  });
  expect(leadPayloads[1].widget_session_id).not.toBe(leadPayloads[0].widget_session_id);
});
