export {
  APPOINTMENT_STATUSES,
  FOLLOWUP_TASK_TYPES,
  buildDailyActionQueue,
  canTransitionAppointment,
  disabledCalendarAdapter,
  normalizeAppointment,
  normalizeTask,
  validateAppointmentWindow,
} from "./persistence/supabase/adminAppointmentFollowupOps";
export type {
  AdminActionQueueItem,
  AdminActionQueueResult,
  AdminAppointmentRow,
  AdminFollowupTaskRow,
  AppointmentCalendarAdapter,
  AppointmentCalendarAdapterResult,
  AppointmentMutationResult,
  AppointmentStatus,
  FollowupMutationResult,
  FollowupPriority,
  FollowupTaskStatus,
  FollowupTaskType,
} from "./persistence/supabase/adminAppointmentFollowupOps";

import {
  createAppointment as createLegacyAppointment,
  createFollowupTask as createLegacyFollowupTask,
  loadAdminActionQueue as loadLegacyAdminActionQueue,
  transitionAppointment as transitionLegacyAppointment,
  updateFollowupTask as updateLegacyFollowupTask,
} from "./persistence/supabase/adminAppointmentFollowupOps";
import {
  createNeonAppointment,
  createNeonFollowupTask,
  loadNeonAdminActionQueue,
  transitionNeonAppointment,
  updateNeonFollowupTask,
} from "./persistence/neonAdminAppointmentFollowupOps";

function legacyFallbackSelected() {
  return !process.env.DATABASE_URL && (
    process.env.NODE_ENV === "test" ||
    (process.env.VERCEL_ENV !== "production" && process.env.ALLOW_LEGACY_SUPABASE_FALLBACK === "true")
  );
}

export function createAppointment(input: Parameters<typeof createLegacyAppointment>[0]) {
  return legacyFallbackSelected() ? createLegacyAppointment(input) : createNeonAppointment(input);
}

export function transitionAppointment(input: Parameters<typeof transitionLegacyAppointment>[0]) {
  return legacyFallbackSelected() ? transitionLegacyAppointment(input) : transitionNeonAppointment(input);
}

export function createFollowupTask(input: Parameters<typeof createLegacyFollowupTask>[0]) {
  return legacyFallbackSelected() ? createLegacyFollowupTask(input) : createNeonFollowupTask(input);
}

export function updateFollowupTask(input: Parameters<typeof updateLegacyFollowupTask>[0]) {
  return legacyFallbackSelected() ? updateLegacyFollowupTask(input) : updateNeonFollowupTask(input);
}

export function loadAdminActionQueue() {
  return legacyFallbackSelected() ? loadLegacyAdminActionQueue() : loadNeonAdminActionQueue();
}
