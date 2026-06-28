/**
 * Revenue Forecast — pipeline value, commission projections, 30/90-day revenue.
 *
 * Pure deterministic. No API calls. No writes.
 * Computes expected revenue from current lead pipeline using Wilson NC
 * market averages and historical conversion assumptions.
 */

import { formatCurrency } from "./intelligence-engine";

// ---------------------------------------------------------------------------
// Wilson NC market constants
// ---------------------------------------------------------------------------

const AVG_HOME_PRICE_WILSON = 215_000;
const COMMISSION_RATE       = 0.03;    // 3% gross commission
const BROKER_SPLIT          = 0.5;     // agent keeps 50%
const AGENT_COMMISSION_RATE = COMMISSION_RATE * BROKER_SPLIT;

// Grade → monthly close probability (rough empirical for local RE market)
const CLOSE_PROB: Record<string, number> = {
  "A+": 0.25,
  "A":  0.15,
  "B":  0.06,
  "C":  0.02,
  "D":  0.005,
};

// Avg days to close from lead creation by temperature
const AVG_DAYS_TO_CLOSE: Record<string, number> = {
  urgent:  30,
  hot:     45,
  warm:    75,
  nurture: 120,
  low:     180,
};

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface LeadPipelineRow {
  id: string;
  grade?: string | null;
  temperature?: string | null;
  leadType?: string | null;
  status?: string | null;
  estimatedHomeValue?: number | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  assignedAgentId?: string | null;
  createdAt?: string | null;
}

export interface ForecastBucket {
  count: number;
  closingProbability: number;    // weighted avg
  estimatedValue: number;        // home value × count × prob
  estimatedCommission: number;
  label: string;
}

export interface AgentForecast {
  agentId: string;
  leadCount: number;
  estimatedCommission: number;
  avgGrade: string;
}

export interface SourceForecast {
  source: string;
  leadCount: number;
  estimatedCommission: number;
}

export interface RevenueForecast {
  // Pipeline totals
  totalLeadsInPipeline: number;
  activeLeads: number;
  pipelineValue: number;              // sum of lead home values (not commission-adjusted)
  expectedCommission30d: number;
  expectedCommission90d: number;
  projectedClosings30d: number;
  projectedClosings90d: number;
  // By grade
  byGrade: Record<string, ForecastBucket>;
  // By source (top 5)
  bySource: SourceForecast[];
  // By agent (top 5)
  byAgent: AgentForecast[];
  // Formatted labels
  pipelineValueLabel: string;
  commission30dLabel: string;
  commission90dLabel: string;
  // Confidence note
  confidenceNote: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CLOSED_STATUSES = new Set(["closed_won", "closed_lost", "disqualified"]);

function isActive(row: LeadPipelineRow): boolean {
  return !CLOSED_STATUSES.has(row.status ?? "");
}

function closeProbFor(row: LeadPipelineRow): number {
  return CLOSE_PROB[row.grade ?? "C"] ?? 0.02;
}

function homeValueFor(row: LeadPipelineRow): number {
  if (row.estimatedHomeValue && row.estimatedHomeValue > 50_000) {
    return row.estimatedHomeValue;
  }
  return AVG_HOME_PRICE_WILSON;
}

function daysToCloseFor(row: LeadPipelineRow): number {
  return AVG_DAYS_TO_CLOSE[row.temperature ?? "warm"] ?? 75;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function buildRevenueForecast(leads: LeadPipelineRow[]): RevenueForecast {
  const active = leads.filter(isActive);
  const totalLeadsInPipeline = leads.length;

  let pipelineValue       = 0;
  let expectedComm30d     = 0;
  let expectedComm90d     = 0;
  let projectedClosings30 = 0;
  let projectedClosings90 = 0;

  const byGradeAcc: Record<string, { count: number; totalProb: number; totalValue: number; totalComm30d: number; totalComm90d: number }> = {};
  const bySourceAcc: Record<string, { count: number; totalComm: number }> = {};
  const byAgentAcc:  Record<string, { count: number; totalComm: number; grades: string[] }> = {};

  for (const row of active) {
    const prob      = closeProbFor(row);
    const homeVal   = homeValueFor(row);
    const commission = homeVal * AGENT_COMMISSION_RATE;
    const daysToClose = daysToCloseFor(row);

    pipelineValue += homeVal * prob;

    // 30-day weighting: how likely this closes within 30 days
    const prob30 = daysToClose <= 30 ? prob : prob * (30 / daysToClose);
    const prob90 = daysToClose <= 90 ? prob : prob * (90 / daysToClose);

    expectedComm30d     += commission * prob30;
    expectedComm90d     += commission * prob90;
    projectedClosings30 += prob30;
    projectedClosings90 += prob90;

    // Grade rollup
    const grade = row.grade ?? "C";
    if (!byGradeAcc[grade]) {
      byGradeAcc[grade] = { count: 0, totalProb: 0, totalValue: 0, totalComm30d: 0, totalComm90d: 0 };
    }
    byGradeAcc[grade].count       += 1;
    byGradeAcc[grade].totalProb   += prob;
    byGradeAcc[grade].totalValue  += homeVal * prob;
    byGradeAcc[grade].totalComm30d += commission * prob30;
    byGradeAcc[grade].totalComm90d += commission * prob90;

    // Source rollup
    const source = row.utmSource ?? row.utmCampaign ?? "direct";
    if (!bySourceAcc[source]) bySourceAcc[source] = { count: 0, totalComm: 0 };
    bySourceAcc[source].count      += 1;
    bySourceAcc[source].totalComm  += commission * prob90;

    // Agent rollup
    if (row.assignedAgentId) {
      if (!byAgentAcc[row.assignedAgentId]) {
        byAgentAcc[row.assignedAgentId] = { count: 0, totalComm: 0, grades: [] };
      }
      byAgentAcc[row.assignedAgentId].count     += 1;
      byAgentAcc[row.assignedAgentId].totalComm += commission * prob90;
      byAgentAcc[row.assignedAgentId].grades.push(grade);
    }
  }

  // Build grade buckets
  const gradeOrder = ["A+", "A", "B", "C", "D"];
  const byGrade: Record<string, ForecastBucket> = {};
  for (const [grade, acc] of Object.entries(byGradeAcc)) {
    const avgProb = acc.count > 0 ? acc.totalProb / acc.count : 0;
    byGrade[grade] = {
      count: acc.count,
      closingProbability: Math.round(avgProb * 100),
      estimatedValue: Math.round(acc.totalValue),
      estimatedCommission: Math.round(acc.totalComm90d),
      label: `Grade ${grade}`,
    };
  }
  // Ensure all grades appear even if empty
  for (const g of gradeOrder) {
    if (!byGrade[g]) {
      byGrade[g] = { count: 0, closingProbability: 0, estimatedValue: 0, estimatedCommission: 0, label: `Grade ${g}` };
    }
  }

  // Top 5 sources by expected commission
  const bySource: SourceForecast[] = Object.entries(bySourceAcc)
    .map(([source, acc]) => ({ source, leadCount: acc.count, estimatedCommission: Math.round(acc.totalComm) }))
    .sort((a, b) => b.estimatedCommission - a.estimatedCommission)
    .slice(0, 5);

  // Top 5 agents by expected commission
  const GRADE_WEIGHT: Record<string, number> = { "A+": 5, A: 4, B: 3, C: 2, D: 1 };
  const byAgent: AgentForecast[] = Object.entries(byAgentAcc)
    .map(([agentId, acc]) => {
      const avgGradeScore = acc.grades.reduce((s, g) => s + (GRADE_WEIGHT[g] ?? 2), 0) / Math.max(1, acc.grades.length);
      const avgGrade = avgGradeScore >= 4.5 ? "A+" : avgGradeScore >= 3.5 ? "A" : avgGradeScore >= 2.5 ? "B" : avgGradeScore >= 1.5 ? "C" : "D";
      return { agentId, leadCount: acc.count, estimatedCommission: Math.round(acc.totalComm), avgGrade };
    })
    .sort((a, b) => b.estimatedCommission - a.estimatedCommission)
    .slice(0, 5);

  // Confidence note
  const confidenceNote = active.length < 5
    ? "Low data volume — projections are directional only"
    : active.length < 20
    ? "Moderate data volume — projections are estimates"
    : "Sufficient data volume — projections are reasonably calibrated";

  return {
    totalLeadsInPipeline,
    activeLeads: active.length,
    pipelineValue: Math.round(pipelineValue),
    expectedCommission30d: Math.round(expectedComm30d),
    expectedCommission90d: Math.round(expectedComm90d),
    projectedClosings30d: parseFloat(projectedClosings30.toFixed(1)),
    projectedClosings90d: parseFloat(projectedClosings90.toFixed(1)),
    byGrade,
    bySource,
    byAgent,
    pipelineValueLabel:  formatCurrency(Math.round(pipelineValue)),
    commission30dLabel:  formatCurrency(Math.round(expectedComm30d)),
    commission90dLabel:  formatCurrency(Math.round(expectedComm90d)),
    confidenceNote,
  };
}
