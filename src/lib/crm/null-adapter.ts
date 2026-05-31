import type {
  CRMContact,
  CRMContactResult,
  CRMLead,
  CRMTask,
  CRMNote,
  CRMTranscript,
} from "@/types/domain.types";
import type { CRMAdapter } from "./types";

export class NullCRMAdapter implements CRMAdapter {
  readonly name = "null";

  isConfigured(): boolean {
    return true; // always available as fallback
  }

  async createOrUpdateContact(
    contact: CRMContact
  ): Promise<CRMContactResult> {
    console.log("[crm:null] createOrUpdateContact", {
      email: contact.email,
      phone: contact.phone,
    });
    return { contactId: "null-contact-stub", created: false };
  }

  async createOrUpdateLead(lead: CRMLead): Promise<{ leadId: string }> {
    console.log("[crm:null] createOrUpdateLead", {
      contactId: lead.contactId,
      intent: lead.intent,
      temperature: lead.temperature,
    });
    return { leadId: "null-lead-stub" };
  }

  async createTask(task: CRMTask): Promise<{ taskId: string }> {
    console.log("[crm:null] createTask", { subject: task.subject });
    return { taskId: "null-task-stub" };
  }

  async logNote(note: CRMNote): Promise<void> {
    console.log("[crm:null] logNote", { contactId: note.contactId });
  }

  async attachTranscript(transcript: CRMTranscript): Promise<void> {
    console.log("[crm:null] attachTranscript", {
      contactId: transcript.contactId,
      filename: transcript.filename,
    });
  }
}
