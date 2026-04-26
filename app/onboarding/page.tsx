"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function OnboardingPage() {
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      slug: String(form.get("slug") || ""),
      companyName: String(form.get("companyName") || ""),
      assistantName: String(form.get("assistantName") || ""),
      brokerName: String(form.get("brokerName") || ""),
      brokerLicense: String(form.get("brokerLicense") || ""),
      marketAreas: String(form.get("marketAreas") || "").split(",").map((v) => v.trim()).filter(Boolean),
      disclaimer: String(form.get("disclaimer") || ""),
      buyerAgreementUrl: String(form.get("buyerAgreementUrl") || ""),
      destinationEmail: String(form.get("destinationEmail") || ""),
      webhookUrl: String(form.get("webhookUrl") || ""),
      primaryColor: String(form.get("primaryColor") || "#0f172a"),
      accentColor: String(form.get("accentColor") || "#f97316"),
    };

    const response = await fetch(`/api/tenants/${payload.slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setMessage(response.ok ? `Tenant ${data.tenant.slug} saved.` : data.error ?? "Failed");
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-6">
      <h1 className="text-3xl font-bold">Tenant Onboarding Wizard</h1>
      <p className="mt-2 text-sm text-slate-600">Collect branding, compliance, routing, and broker profile in one setup flow.</p>
      <Card className="mt-6 p-5">
        <form onSubmit={onSubmit} className="grid gap-3">
          <Input required name="slug" placeholder="tenant-slug" />
          <Input required name="companyName" placeholder="Company name" />
          <Input required name="assistantName" placeholder="Assistant display name" />
          <Input required name="brokerName" placeholder="Broker / agent name" />
          <Input name="brokerLicense" placeholder="License number" />
          <Input required name="marketAreas" placeholder="Market areas (comma separated)" />
          <Textarea required name="disclaimer" placeholder="Tenant disclaimer text" rows={3} />
          <Input name="buyerAgreementUrl" placeholder="Buyer agreement URL" />
          <Input required type="email" name="destinationEmail" placeholder="Routing destination email" />
          <Input name="webhookUrl" placeholder="CRM webhook URL" />
          <div className="grid grid-cols-2 gap-2">
            <Input name="primaryColor" defaultValue="#0f172a" />
            <Input name="accentColor" defaultValue="#f97316" />
          </div>
          <Button type="submit">Save tenant</Button>
          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        </form>
      </Card>
    </main>
  );
}
