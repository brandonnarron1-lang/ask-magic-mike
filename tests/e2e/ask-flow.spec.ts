import { expect, test } from "@playwright/test";

test("active Ask Mike flow keeps chat anonymous until explicit consented follow-up", async ({ page }) => {
  const chatPayloads: Array<Record<string, unknown>> = [];
  const leadPayloads: Array<Record<string, unknown>> = [];
  const appointmentPayloads: Array<Record<string, unknown>> = [];

  await page.route("**/api/chat/message", async (route) => {
    chatPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Synthetic local answer: Mike can review timing and property context with you.",
      }),
    });
  });
  await page.route("**/api/appointments/request", async (route) => {
    appointmentPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        status: "requested",
        appointment_id: "qa_intercepted_appointment",
        appointment_status: "requested",
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
  await expect(page.getByRole("heading", { name: /Ask Mike\. Get a practical local next step\./i })).toBeVisible();
  await page.getByLabel(/Your real estate question/).fill("What should I prepare before listing in Wilson?");
  await page.getByRole("button", { name: "Send Question" }).click();

  await expect(page.getByText(/Synthetic local answer/)).toBeVisible();
  expect(chatPayloads[0]).toMatchObject({
    message: "What should I prepare before listing in Wilson?",
    lead_source_surface: "ask_page",
  });
  expect(leadPayloads).toHaveLength(0);
  await expect(page.getByRole("heading", { name: "Want Mike's team to contact you?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Request a conversation" })).toHaveCount(0);

  await page.getByLabel("Your name (optional)").fill("INTERNAL QA DO NOT CONTACT");
  await page.getByLabel("Email").fill("ask-flow@example.test");
  await page.getByRole("checkbox", { name: /I agree that Our Town Properties/ }).check();
  await page.getByRole("button", { name: "Request local follow-up" }).click();

  await expect(page.getByRole("button", { name: "Request a conversation" })).toBeVisible();
  expect(leadPayloads).toHaveLength(1);
  expect(leadPayloads[0]).toMatchObject({
    funnel_type: "chat",
    lead_source_surface: "ask_page",
    question: "What should I prepare before listing in Wilson?",
    name: "INTERNAL QA DO NOT CONTACT",
    email: "ask-flow@example.test",
    consent: true,
    consent_email: true,
    consent_sms: false,
    consent_source: "ask_page:ask-follow-up",
  });
  expect(
    typeof (leadPayloads[0] as unknown as Record<string, unknown>).widget_session_id,
  ).toBe("string");

  await page.getByLabel(/Your real estate question/).fill("What about a second distinct question?");
  await page.getByRole("button", { name: "Send Question" }).click();
  await expect.poll(() => chatPayloads.length).toBe(2);
  expect(chatPayloads[1]).toMatchObject({
    message: "What about a second distinct question?",
    lead_source_surface: "ask_page",
  });
  expect(leadPayloads).toHaveLength(1);

  await page.getByRole("button", { name: "Request a conversation" }).click();
  await expect(page.getByRole("heading", { name: "Your appointment request has been received." })).toBeVisible();
  expect(appointmentPayloads).toHaveLength(1);
  expect(appointmentPayloads[0]).toMatchObject({
    lead_id: "qa_intercepted_chat_lead",
    session_id: "qa_intercepted_chat_session",
    request_surface: "ask_page",
  });
});

test("Ask Mike failed explicit follow-up retry reuses the conversation submission ID", async ({ page }) => {
  const chatPayloads: Array<Record<string, unknown>> = [];
  const leadPayloads: Array<Record<string, unknown>> = [];
  const appointmentPayloads: Array<Record<string, unknown>> = [];
  let leadAttempts = 0;

  await page.route("**/api/chat/message", async (route) => {
    chatPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Synthetic retry answer: Mike can still prepare a follow-up path.",
      }),
    });
  });
  await page.route("**/api/leads", async (route) => {
    leadAttempts += 1;
    leadPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
    if (leadAttempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "synthetic_lead_prep_failure" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        lead_id: "qa_retry_chat_lead",
        session_id: "qa_retry_chat_session",
      }),
    });
  });
  await page.route("**/api/appointments/request", async (route) => {
    appointmentPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        status: "requested",
        appointment_id: "qa_retry_appointment",
        appointment_status: "requested",
      }),
    });
  });

  await page.goto("/ask");
  await page.getByLabel(/Your real estate question/).fill("Can Mike help me think through timing?");
  await page.getByRole("button", { name: "Send Question" }).click();
  await expect(page.getByText(/Synthetic retry answer/)).toBeVisible();
  expect(leadPayloads).toHaveLength(0);

  await page.getByLabel("Phone").fill("252-555-0198");
  await page.getByRole("checkbox", { name: /I agree that Our Town Properties/ }).check();
  await page.getByRole("button", { name: "Request local follow-up" }).click();
  await expect(page.locator("#ask-follow-up-status")).toContainText("synthetic_lead_prep_failure");
  expect(leadPayloads).toHaveLength(1);
  const originalSubmissionId = leadPayloads[0].widget_session_id;
  expect(typeof originalSubmissionId).toBe("string");

  await page.getByRole("button", { name: "Request local follow-up" }).click();
  await expect(page.getByRole("button", { name: "Request a conversation" })).toBeVisible();
  expect(leadPayloads).toHaveLength(2);
  expect(leadPayloads[1].widget_session_id).toBe(originalSubmissionId);

  await page.getByLabel(/Your real estate question/).fill("What should I ask on the follow-up call?");
  await page.getByRole("button", { name: "Send Question" }).click();
  await expect.poll(() => chatPayloads.length).toBe(2);
  expect(leadPayloads).toHaveLength(2);

  await page.getByRole("button", { name: "Request a conversation" }).click();
  await expect(page.getByRole("heading", { name: "Your appointment request has been received." })).toBeVisible();
  expect(appointmentPayloads).toHaveLength(1);
  expect(appointmentPayloads[0]).toMatchObject({
    lead_id: "qa_retry_chat_lead",
    session_id: "qa_retry_chat_session",
    request_surface: "ask_page",
  });
});
