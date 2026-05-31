import { z } from "zod";

export const RoutingDecisionSchema = z.object({
  agentId: z.string().uuid(),
  agentName: z.string(),
  agentEmail: z.string().email(),
  agentPriorityScore: z.number().int().min(0).max(100),
  assignmentReason: z.string(),
  acceptDeadlineMs: z.number().int().positive(),
  contactDeadlineMs: z.number().int().positive(),
});

export const AcceptLeadSchema = z.object({
  routingId: z.string().uuid(),
  agentId: z.string().uuid(),
});

export const AssignLeadSchema = z.object({
  leadId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  reason: z.string().optional(),
});

export type RoutingDecisionInput = z.infer<typeof RoutingDecisionSchema>;
export type AcceptLeadInput = z.infer<typeof AcceptLeadSchema>;
export type AssignLeadInput = z.infer<typeof AssignLeadSchema>;
