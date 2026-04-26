import { Message } from "./types";

export type LLMConfig = {
  provider: "openai" | "mock";
  model: string;
  apiKey?: string;
};

export async function generateAssistantResponse(config: LLMConfig, messages: Message[]) {
  if (config.provider === "openai" && config.apiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI error: ${res.status}`);
    }

    const data = await res.json();
    return String(data?.choices?.[0]?.message?.content ?? "").trim();
  }

  const lastUserMessage = messages.filter((msg) => msg.role === "user").at(-1)?.content ?? "";
  return `General education only: ${lastUserMessage.slice(0, 180)}. For transaction-specific decisions, your licensed broker will follow up directly.`;
}
