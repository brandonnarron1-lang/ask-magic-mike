import { conversationRequestTiming } from "../../lib/conversationRequestTiming";
import type { AdminAppointmentRow } from "../../lib/adminAppointmentFollowupOps";

export function ConversationRequestNotice({ appointment, observedAt }: { appointment: AdminAppointmentRow; observedAt: string }) {
  const timing = conversationRequestTiming(appointment, observedAt);
  return <section aria-label="Saved conversation timing" className="min-w-0 rounded-lg border border-[#cda24a55] bg-[#cda24a08] p-3 text-sm leading-6 [overflow-wrap:anywhere]">
    <h3 className="font-semibold text-[#e2c06f]">{timing.label}</h3>
    <p className="mt-1 text-[#f4ead4]">{timing.preferenceLabel}</p>
    <p className="mt-1 text-[#c9bfad]">{timing.explanation}</p>
  </section>;
}
