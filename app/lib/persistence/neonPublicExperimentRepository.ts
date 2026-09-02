import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { assignExperimentVariant } from "../growth/experiment-engine";
import { getPublicExperimentDefinition } from "../growth/experiment-registry";

const SUBJECT_KEY_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_NAMES = new Set(["exposure", "lead_created"]);

type Query = {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
};

type Row = Record<string, unknown>;

export type PublicExperimentEventInput = {
  experimentKey: string;
  subjectKey: string;
  eventName: "exposure" | "lead_created";
  leadId?: string | null;
  variantKey?: string | null;
  surface?: string | null;
};

export type PublicExperimentEventResult = {
  active: boolean;
  recorded: boolean;
  variantKey: string | null;
  reason:
    | "recorded"
    | "disabled"
    | "unknown_experiment"
    | "registry_mismatch"
    | "not_approved"
    | "invalid_input"
    | "missing_exposure"
    | "variant_mismatch"
    | "ineligible_lead"
    | "unavailable";
};

function result(
  reason: PublicExperimentEventResult["reason"],
  overrides: Partial<PublicExperimentEventResult> = {},
): PublicExperimentEventResult {
  return {
    active: false,
    recorded: false,
    variantKey: null,
    reason,
    ...overrides,
  };
}

function dbVariants(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Row;
    const key = typeof row.key === "string" ? row.key : "";
    const weight = typeof row.weight === "number" ? row.weight : Number(row.weight);
    return key && Number.isFinite(weight) ? [{ key, weight }] : [];
  });
}

function registryMatches(
  expected: readonly { key: string; weight: number }[],
  actual: { key: string; weight: number }[],
) {
  if (expected.length !== actual.length) return false;
  const normalized = [...actual].sort((a, b) => a.key.localeCompare(b.key));
  return [...expected]
    .sort((a, b) => a.key.localeCompare(b.key))
    .every((variant, index) =>
      variant.key === normalized[index]?.key && Math.abs(variant.weight - normalized[index].weight) < 0.001,
    );
}

function idempotencyKey(parts: string[]) {
  return createHash("sha256").update(parts.join(":"), "utf8").digest("hex");
}

export class NeonPublicExperimentRepository {
  constructor(
    private readonly sql: Query,
    private readonly env: Record<string, string | undefined> = process.env,
  ) {}

  async record(input: PublicExperimentEventInput): Promise<PublicExperimentEventResult> {
    if (this.env.PUBLIC_EXPERIMENTS_ENABLED !== "true") return result("disabled");
    if (!SUBJECT_KEY_PATTERN.test(input.subjectKey) || !EVENT_NAMES.has(input.eventName)) {
      return result("invalid_input");
    }

    const definition = getPublicExperimentDefinition(input.experimentKey);
    if (!definition) return result("unknown_experiment");
    if (input.surface !== definition.surface) return result("invalid_input");
    if (
      (input.eventName === "exposure" && (input.leadId || input.variantKey)) ||
      (input.eventName === "lead_created" && (!input.leadId || !input.variantKey))
    ) {
      return result("invalid_input");
    }

    const rows = await this.sql.query(
      `SELECT id, status, approval_status, variants
         FROM public.growth_experiments
        WHERE experiment_key = $1::text
        LIMIT 1`,
      [input.experimentKey],
    ) as Row[];
    const experiment = rows[0];
    if (!experiment) return result("not_approved");
    if (experiment.status !== "running" || experiment.approval_status !== "approved") {
      return result("not_approved");
    }

    const variants = dbVariants(experiment.variants);
    if (!registryMatches(definition.variants, variants)) return result("registry_mismatch");

    const experimentId = typeof experiment.id === "string" ? experiment.id : "";
    if (!UUID_PATTERN.test(experimentId)) return result("unavailable");
    const computedVariant = assignExperimentVariant(definition.key, input.subjectKey, variants);
    if (input.eventName === "exposure") {
      await this.sql.query(
        `INSERT INTO public.growth_experiment_assignments (
           experiment_id, subject_key, variant_key, metadata
         ) VALUES ($1::uuid, $2::text, $3::text, $4::jsonb)
         ON CONFLICT (experiment_id, subject_key) DO NOTHING`,
        [
          experimentId,
          input.subjectKey,
          computedVariant,
          JSON.stringify({ source: "public_experiment_v1", surface: definition.surface }),
        ],
      );
    }
    const assignmentRows = await this.sql.query(
      `SELECT variant_key
         FROM public.growth_experiment_assignments
        WHERE experiment_id = $1::uuid AND subject_key = $2::text
        LIMIT 1`,
      [experimentId, input.subjectKey],
    ) as Row[];
    const storedVariant = typeof assignmentRows[0]?.variant_key === "string"
      ? String(assignmentRows[0]?.variant_key)
      : null;
    if (!storedVariant) {
      return input.eventName === "lead_created"
        ? result("missing_exposure", { active: true })
        : result("unavailable", { active: true });
    }
    if (!definition.variants.some((variant) => variant.key === storedVariant)) {
      return result("registry_mismatch");
    }
    if (
      storedVariant !== computedVariant ||
      (input.eventName === "lead_created" && input.variantKey !== storedVariant)
    ) {
      return result("variant_mismatch", { active: true, variantKey: storedVariant });
    }

    let leadId: string | null = null;
    if (input.eventName === "lead_created") {
      if (!input.leadId || !UUID_PATTERN.test(input.leadId)) {
        return result("invalid_input", { active: true, variantKey: storedVariant });
      }
      const leadRows = await this.sql.query(
        `SELECT id
           FROM public.leads
          WHERE id = $1::uuid
            AND is_test = false
            AND communication_suppressed = false
          LIMIT 1`,
        [input.leadId],
      ) as Row[];
      if (!leadRows[0]?.id) {
        return result("ineligible_lead", { active: true, variantKey: storedVariant });
      }
      leadId = input.leadId;
    }

    const eventIdempotencyKey = idempotencyKey([
      experimentId,
      input.subjectKey,
      input.eventName,
      leadId ?? "once",
    ]);
    await this.sql.query(
      `INSERT INTO public.growth_experiment_events (
         experiment_id, subject_key, variant_key, event_name,
         idempotency_key, metadata
       ) VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::jsonb)
       ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`,
      [
        experimentId,
        input.subjectKey,
        storedVariant,
        input.eventName,
        eventIdempotencyKey,
        JSON.stringify({
          source: "public_experiment_v1",
          surface: definition.surface,
          ...(leadId ? { lead_id: leadId } : {}),
        }),
      ],
    );

    return result("recorded", { active: true, recorded: true, variantKey: storedVariant });
  }
}

export function createNeonPublicExperimentRepository(
  env: Record<string, string | undefined> = process.env,
) {
  return env.DATABASE_URL
    ? new NeonPublicExperimentRepository(neon(env.DATABASE_URL), env)
    : null;
}

export async function recordPublicExperimentEvent(input: PublicExperimentEventInput) {
  const repository = createNeonPublicExperimentRepository();
  if (!repository) return result("unavailable");
  try {
    return await repository.record(input);
  } catch {
    console.error("[public-experiment] canonical event write unavailable", {
      experimentKey: input.experimentKey,
      eventName: input.eventName,
    });
    return result("unavailable");
  }
}
