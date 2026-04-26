"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { complianceFooterCopy } from "@/lib/compliance";

type TenantAssistantProps = {
  tenantSlug: string;
  assistantName: string;
  brokerName: string;
  marketAreas: string[];
  primaryColor: string;
  accentColor: string;
  disclaimer: string;
};

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export function TenantAssistant(props: TenantAssistantProps) {
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [contactMessage, setContactMessage] = useState<string | null>(null);

  const accentStyle = useMemo(() => ({
    borderColor: props.accentColor,
    backgroundColor: props.primaryColor,
  }), [props.accentColor, props.primaryColor]);

  async function onChatSubmit(event: FormEvent) {
    event.preventDefault();
    if (!chatInput.trim()) return;

    const nextChat = [...chat, { role: "user" as const, content: chatInput.trim() }];
    setChat(nextChat);
    setChatInput("");
    setChatBusy(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantSlug: props.tenantSlug, message: chatInput, history: nextChat }),
    });

    const data = await response.json();
    setChat((prev) => [...prev, { role: "assistant", content: data.message ?? "No response" }]);
    setChatBusy(false);
  }

  async function onContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      tenantSlug: props.tenantSlug,
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      generalIntent: String(form.get("generalIntent") || ""),
      marketArea: String(form.get("marketArea") || ""),
      message: String(form.get("message") || ""),
      consentAt: new Date().toISOString(),
    };

    const response = await fetch("/api/contact-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (response.ok) {
      event.currentTarget.reset();
    }
    setContactMessage(data.message ?? data.error ?? "Submitted");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="text-xl font-semibold" style={{ color: props.primaryColor }}>{props.assistantName}</h2>
        <p className="mt-2 text-sm text-slate-600">General real-estate education only. Transaction-specific requests are routed to {props.brokerName}.</p>

        <div className="mt-4 max-h-72 space-y-3 overflow-auto rounded border bg-slate-50 p-3">
          {chat.length === 0 ? <p className="text-sm text-slate-500">Ask about market literacy, process timelines, or terminology.</p> : null}
          {chat.map((turn, index) => (
            <p key={index} className="text-sm"><span className="font-semibold">{turn.role === "user" ? "You" : props.assistantName}:</span> {turn.content}</p>
          ))}
        </div>

        <form onSubmit={onChatSubmit} className="mt-3 space-y-2">
          <Textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} rows={3} placeholder="Type your question" />
          <Button type="submit" disabled={chatBusy} style={accentStyle}>{chatBusy ? "Thinking..." : "Send"}</Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl font-semibold">Contact {props.brokerName}</h2>
        <p className="mt-1 text-sm text-slate-600">For property-specific guidance, submit your info for routed follow-up.</p>
        <form onSubmit={onContactSubmit} className="mt-4 space-y-3">
          <Input required name="name" placeholder="Full name" />
          <Input required type="email" name="email" placeholder="Email" />
          <Input name="phone" placeholder="Phone" />
          <Input required name="generalIntent" placeholder="General intent (buying, selling, investing)" />
          <Input required name="marketArea" placeholder="Market area" defaultValue={props.marketAreas[0]} />
          <Textarea required name="message" placeholder="Tell us what you're trying to accomplish" rows={4} />
          <label className="block text-xs text-slate-600">
            <input required type="checkbox" className="mr-2" />
            I consent to being contacted by a licensed broker regarding my request.
          </label>
          <Button type="submit" className="w-full" style={accentStyle}>Submit inquiry</Button>
          {contactMessage ? <p className="text-sm text-slate-700">{contactMessage}</p> : null}
        </form>
      </Card>

      <footer className="lg:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <p>{props.disclaimer}</p>
        <p className="mt-2">{complianceFooterCopy}</p>
      </footer>
    </div>
  );
}
