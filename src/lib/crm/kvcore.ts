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

  // Not configured until kvCORE REST API v2 integration is implemented.
  // Returning false causes getCRMAdapter() to fall through to the null adapter,
  // which is honest: no CRM sync occurs rather than fake stub IDs being returned.
  isConfigured(): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createOrUpdateContact(_contact: CRMContact): Promise<CRMContactResult> {
    throw new Error("[crm:kvcore] not implemented — implement kvCORE REST API v2 before enabling");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createOrUpdateLead(_lead: CRMLead): Promise<{ leadId: string }> {
    throw new Error("[crm:kvcore] not implemented — implement kvCORE REST API v2 before enabling");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createTask(_task: CRMTask): Promise<{ taskId: string }> {
    throw new Error("[crm:kvcore] not implemented — implement kvCORE REST API v2 before enabling");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async logNote(_note: CRMNote): Promise<void> {
    throw new Error("[crm:kvcore] not implemented — implement kvCORE REST API v2 before enabling");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async attachTranscript(_transcript: CRMTranscript): Promise<void> {
    throw new Error("[crm:kvcore] not implemented — implement kvCORE REST API v2 before enabling");
  }
}
