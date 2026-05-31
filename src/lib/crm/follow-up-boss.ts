import type {
  CRMContact,
  CRMContactResult,
  CRMLead,
  CRMTask,
  CRMNote,
  CRMTranscript,
} from "@/types/domain.types";
import type { CRMAdapter } from "./types";

const BASE_URL = process.env.FUB_BASE_URL ?? "https://api.followupboss.com/v1";

async function fubFetch(
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  const apiKey = process.env.FUB_API_KEY!;
  const credentials = Buffer.from(`${apiKey}:`).toString("base64");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FUB API error ${res.status}: ${text}`);
  }

  return res.json();
}

export class FollowUpBossAdapter implements CRMAdapter {
  readonly name = "follow_up_boss";

  isConfigured(): boolean {
    return !!process.env.FUB_API_KEY;
  }

  async createOrUpdateContact(
    contact: CRMContact
  ): Promise<CRMContactResult> {
    const payload = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      emails: contact.email ? [{ value: contact.email }] : [],
      phones: contact.phone ? [{ value: contact.phone }] : [],
      source: contact.source,
      tags: contact.tags,
    };

    const data = (await fubFetch("/people", {
      method: "POST",
      body: JSON.stringify(payload),
    })) as { id: string; isNew?: boolean };

    return { contactId: String(data.id), created: data.isNew ?? false };
  }

  async createOrUpdateLead(lead: CRMLead): Promise<{ leadId: string }> {
    // FUB uses people/events model — log as event
    await fubFetch(`/events`, {
      method: "POST",
      body: JSON.stringify({
        personId: lead.contactId,
        type: "Note",
        description: `Intent: ${lead.intent} | Temperature: ${lead.temperature} | Seller score: ${lead.sellerScore} | Buyer score: ${lead.buyerScore}\n\n${lead.notes}`,
      }),
    });

    return { leadId: lead.contactId };
  }

  async createTask(task: CRMTask): Promise<{ taskId: string }> {
    const data = (await fubFetch("/tasks", {
      method: "POST",
      body: JSON.stringify({
        personId: task.contactId,
        name: task.subject,
        dueDate: task.dueAt.toISOString().split("T")[0],
        note: task.body,
      }),
    })) as { id: string };

    return { taskId: String(data.id) };
  }

  async logNote(note: CRMNote): Promise<void> {
    await fubFetch("/notes", {
      method: "POST",
      body: JSON.stringify({
        personId: note.contactId,
        body: note.body,
        created: note.occurredAt.toISOString(),
      }),
    });
  }

  async attachTranscript(transcript: CRMTranscript): Promise<void> {
    await this.logNote({
      contactId: transcript.contactId,
      body: `[Transcript: ${transcript.filename}]\n\n${transcript.content}`,
      occurredAt: transcript.occurredAt,
    });
  }
}
