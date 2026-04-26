import { NextResponse } from "next/server";
import { runComplianceGuardrail } from "@/lib/compliance";
import { generateAssistantResponse } from "@/lib/llm";
import { getTenantBySlug, saveAIRun, saveConversation } from "@/lib/tenant-store";
import { Message } from "@/lib/types";

type Payload = {
  tenantSlug: string;
  message: string;
  history?: Message[];
};

export async function POST(request: Request) {
  const payload = (await request.json()) as Payload;
  const tenant = await getTenantBySlug(payload.tenantSlug);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const guardrail = runComplianceGuardrail(payload.message);
  if (guardrail.blocked) {
    await saveConversation({
      tenantSlug: tenant.slug,
      visitorSessionId: "anon",
      messages: [
        { role: "user", content: payload.message },
        { role: "assistant", content: guardrail.reason ?? "Escalated." },
      ],
      safetyFlags: ["transaction_specific_block"],
    });

    return NextResponse.json({
      message: `${guardrail.reason} Please submit the contact form for direct broker support.`,
      blocked: true,
    });
  }

  const messages: Message[] = [
    {
      role: "system",
      content: `${tenant.promptInstructions}\nAlways include a compliance-safe tone and remind users to contact the licensed broker for transaction-specific questions.`,
    },
    ...(payload.history ?? []),
    { role: "user", content: payload.message },
  ];

  const completion = await generateAssistantResponse(
    {
      provider: process.env.OPENAI_API_KEY ? "openai" : "mock",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
    },
    messages,
  );

  const conversation = await saveConversation({
    tenantSlug: tenant.slug,
    visitorSessionId: "anon",
    messages: [{ role: "user", content: payload.message }, { role: "assistant", content: completion }],
    safetyFlags: [],
  });

  await saveAIRun({
    tenantSlug: tenant.slug,
    conversationId: conversation.id,
    provider: process.env.OPENAI_API_KEY ? "openai" : "mock",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    prompt: payload.message,
    completion,
    safetyFlags: [],
  });

  return NextResponse.json({ message: completion });
}
