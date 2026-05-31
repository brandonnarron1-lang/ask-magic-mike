import type {
  CRMContact,
  CRMContactResult,
  CRMLead,
  CRMTask,
  CRMNote,
  CRMTranscript,
} from "@/types/domain.types";

export interface CRMAdapter {
  readonly name: string;
  isConfigured(): boolean;
  createOrUpdateContact(contact: CRMContact): Promise<CRMContactResult>;
  createOrUpdateLead(lead: CRMLead): Promise<{ leadId: string }>;
  createTask(task: CRMTask): Promise<{ taskId: string }>;
  logNote(note: CRMNote): Promise<void>;
  attachTranscript(transcript: CRMTranscript): Promise<void>;
}

export type CRMOperation =
  | "create_contact"
  | "update_contact"
  | "create_lead"
  | "update_lead"
  | "create_task"
  | "log_note"
  | "attach_transcript";

export interface CRMSyncLogEntry {
  leadId: string;
  operation: CRMOperation;
  adapter: string;
  status: "success" | "error" | "skipped";
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string;
  durationMs?: number;
}
