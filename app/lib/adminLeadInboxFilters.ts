import type { AdminLeadView } from "./adminLeadView";

export const ADMIN_LEAD_INBOX_FILTERS = [
  {
    key: "active",
    label: "Active / New",
    statuses: ["new", "scored", "assigned", "escalated"],
  },
  {
    key: "working",
    label: "Contacted / Working",
    statuses: ["contacted", "nurture"],
  },
  {
    key: "qualified",
    label: "Qualified / Appointment",
    statuses: ["qualified", "appointment_requested", "appointment_set"],
  },
  {
    key: "closed",
    label: "Spam / Test / Closed",
    statuses: ["spam", "dead", "converted"],
  },
  {
    key: "all",
    label: "All",
    statuses: [],
  },
] as const;

export function filterAdminLeadInbox(leads: AdminLeadView[], filterKey: string) {
  const filter =
    ADMIN_LEAD_INBOX_FILTERS.find((item) => item.key === filterKey) ||
    ADMIN_LEAD_INBOX_FILTERS[0];
  if (filter.key === "all") return leads;

  const statuses = filter.statuses as readonly string[];
  if (filter.key === "closed") {
    return leads.filter((lead) => lead.is_test || statuses.includes(lead.status));
  }

  return leads.filter((lead) => !lead.is_test && statuses.includes(lead.status));
}
