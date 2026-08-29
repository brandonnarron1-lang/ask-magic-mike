export const RATE_LIMIT_STORE_CAPABILITY_SELECT = `
  to_regclass('public.rate_limit_buckets') IS NOT NULL AS rate_limit_table,
  (
    (
      SELECT COUNT(*) = 4
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'rate_limit_buckets'
        AND (
          (column_name = 'bucket_key' AND data_type = 'text' AND is_nullable = 'NO')
          OR (column_name = 'request_count' AND data_type = 'integer' AND is_nullable = 'NO')
          OR (column_name = 'window_started_at' AND data_type = 'timestamp with time zone' AND is_nullable = 'NO')
          OR (
            column_name = 'updated_at'
            AND data_type = 'timestamp with time zone'
            AND is_nullable = 'NO'
            AND column_default IS NOT NULL
          )
        )
    )
    AND EXISTS (
      SELECT 1
      FROM pg_index rate_limit_index
      JOIN pg_attribute bucket_column
        ON bucket_column.attrelid = rate_limit_index.indrelid
       AND bucket_column.attname = 'bucket_key'
       AND NOT bucket_column.attisdropped
      WHERE rate_limit_index.indrelid = to_regclass('public.rate_limit_buckets')
        AND rate_limit_index.indisunique
        AND rate_limit_index.indisvalid
        AND rate_limit_index.indisready
        AND rate_limit_index.indnkeyatts = 1
        AND rate_limit_index.indpred IS NULL
        AND rate_limit_index.indexprs IS NULL
        AND rate_limit_index.indkey[0] = bucket_column.attnum
    )
  ) AS rate_limit_schema_ready,
  COALESCE(
    has_schema_privilege(current_user, 'public', 'USAGE')
      AND has_table_privilege(current_user, to_regclass('public.rate_limit_buckets'), 'SELECT')
      AND has_table_privilege(current_user, to_regclass('public.rate_limit_buckets'), 'INSERT')
      AND has_table_privilege(current_user, to_regclass('public.rate_limit_buckets'), 'UPDATE')
      AND has_table_privilege(current_user, to_regclass('public.rate_limit_buckets'), 'DELETE'),
    FALSE
  ) AS rate_limit_permissions_ready,
  COALESCE((
    SELECT
      NOT rate_limit_relation.relrowsecurity
      OR (
        rate_limit_relation.relowner = runtime_role.oid
        AND NOT rate_limit_relation.relforcerowsecurity
      )
      OR runtime_role.rolsuper
      OR runtime_role.rolbypassrls
    FROM pg_class rate_limit_relation
    JOIN pg_roles runtime_role ON runtime_role.rolname = current_user
    WHERE rate_limit_relation.oid = to_regclass('public.rate_limit_buckets')
  ), FALSE) AS rate_limit_rls_ready
`;

export interface RateLimitStoreCapability {
  table: boolean;
  schema: boolean;
  permissions: boolean;
  rls: boolean;
  ready: boolean;
}

/** Map catalog output to a boolean-only health contract. */
export function evaluateRateLimitStoreCapability(
  row: Record<string, unknown> | null | undefined,
): RateLimitStoreCapability {
  const table = row?.rate_limit_table === true;
  const schema = row?.rate_limit_schema_ready === true;
  const permissions = row?.rate_limit_permissions_ready === true;
  const rls = row?.rate_limit_rls_ready === true;
  return {
    table,
    schema,
    permissions,
    rls,
    ready: table && schema && permissions && rls,
  };
}
