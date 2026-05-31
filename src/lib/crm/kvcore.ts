import type {
  CRMContact,
  CRMContactResult,
  CRMLead,
  CRMTask,
  CRMNote,
  CRMTranscript,
} from "@/types/domain.types";
import type { CRMAdapter } from "./types";

export class KvCoreAdapter implements CRMAdapter {
  readonly name = "kvcore";

  isConfigured(): boolean {
    return !!process.env.KVCORE_API_KEY;
  }

  // kvCORE adapter — stub implementation
  // Implement using kvCORE REST API v2 when API key is available.

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createOrUpdateContact(_contact: CRMContact): Promise<CRMContactResult> {
    console.warn("[crm:kvcore] createOrUpdateContact not yet implemented");
    return { contactId: "kvcore-stub", created: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createOrUpdateLead(_lead: CRMLead): Promise<{ leadId: string }> {
    console.warn("[crm:kvcore] createOrUpdateLead not yet implemented");
    return { leadId: "kvcore-stub" };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createTask(_task: CRMTask): Promise<{ taskId: string }> {
    console.warn("[crm:kvcore] createTask not yet implemented");
    return { taskId: "kvcore-stub" };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async logNote(_note: CRMNote): Promise<void> {
    console.warn("[crm:kvcore] logNote not yet implemented");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async attachTranscript(_transcript: CRMTranscript): Promise<void> {
    console.warn("[crm:kvcore] attachTranscript not yet implemented");
  }
}
