import type { LeadPayload } from "./leadPayload";

export type LeadScoreFactor = {
  code: string;
  label: string;
  points: number;
};

export type LeadScore = {
  score: number;
  grade: "hot" | "active" | "new";
  version: "deterministic_v1";
  factors: LeadScoreFactor[];
  explanation: string;
};

function timelinePoints(timeline?: string) {
  const value = (timeline || "").toLowerCase();
  if (/asap|immediate|right away|0\s*[-–]\s*30|under 30|this month/.test(value)) {
    return { code: "timeline_immediate", label: "Immediate timeline", points: 30 };
  }
  if (/30\s*[-–]\s*60|60\s*[-–]\s*90|31\s*[-–]\s*90|next 90|90 days/.test(value)) {
    return { code: "timeline_90_days", label: "Within 90 days", points: 22 };
  }
  if (/3\s*[-–]\s*6|three\s*to\s*six/.test(value)) {
    return { code: "timeline_6_months", label: "Within six months", points: 12 };
  }
  if (/6\s*[-–]\s*12|six\s*to\s*twelve/.test(value)) {
    return { code: "timeline_year", label: "Within a year", points: 6 };
  }
  return { code: "timeline_unknown", label: "Planning or unknown timeline", points: 0 };
}

export function scoreLead(payload: LeadPayload): LeadScore {
  const factors: LeadScoreFactor[] = [];
  if (payload.email) factors.push({ code: "email_present", label: "Email provided", points: 15 });
  if (payload.phone) factors.push({ code: "phone_present", label: "Phone provided", points: 15 });
  if (payload.address || payload.property_address) {
    factors.push({ code: "property_context", label: "Property or location provided", points: 15 });
  }
  if (payload.funnel_type === "seller" || payload.lead_type === "seller" || payload.lead_type === "home_value") {
    factors.push({ code: "seller_intent", label: "Seller or home-value intent", points: 15 });
  } else if (payload.funnel_type === "buyer" || payload.lead_type === "buyer") {
    factors.push({ code: "buyer_intent", label: "Buyer intent", points: 10 });
  } else if (payload.funnel_type === "open_house" || payload.lead_type === "open_house") {
    factors.push({ code: "open_house_intent", label: "Open-house intent", points: 8 });
  }
  if (payload.preapproval) factors.push({ code: "preapproval", label: "Financing/preapproval context provided", points: 10 });
  if (payload.notes || payload.question) factors.push({ code: "motivation", label: "Question or motivation provided", points: 8 });
  factors.push(timelinePoints(payload.timeline));

  const score = Math.min(100, Math.max(0, factors.reduce((total, factor) => total + factor.points, 0)));
  const grade = score >= 80 ? "hot" : score >= 60 ? "active" : "new";
  return {
    score,
    grade,
    version: "deterministic_v1",
    factors,
    explanation: factors.map((factor) => `${factor.label} (+${factor.points})`).join("; ") || "No qualifying factors recorded.",
  };
}
