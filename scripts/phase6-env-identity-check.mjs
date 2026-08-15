#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

function parseEnv(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const value = line.slice(separator + 1).replace(/^[\"']|[\"']$/g, "").replaceAll("\\n", "\n");
        return [line.slice(0, separator), value];
      }),
  );
}

function safeDatabaseIdentity(value) {
  try {
    const url = new URL(value);
    return {
      configured: true,
      host: url.hostname,
      database: url.pathname.slice(1),
      fingerprint: createHash("sha256").update(value).digest("hex"),
    };
  } catch {
    return { configured: false, host: "invalid", database: "invalid", fingerprint: "invalid" };
  }
}

const preview = parseEnv(process.env.PREVIEW_ENV_FILE || "");
const production = parseEnv(process.env.PRODUCTION_ENV_FILE || "");
const previewDatabase = safeDatabaseIdentity(preview.DATABASE_URL);
const productionDatabase = safeDatabaseIdentity(production.DATABASE_URL);

console.log(JSON.stringify({
  preview_database_configured: previewDatabase.configured,
  production_database_configured: productionDatabase.configured,
  same_connection: previewDatabase.configured && productionDatabase.configured
    ? previewDatabase.fingerprint === productionDatabase.fingerprint
    : null,
  preview_host: previewDatabase.host,
  production_host: productionDatabase.host,
  preview_database: previewDatabase.database,
  production_database: productionDatabase.database,
  preview_identity_flags: {
    database_env: preview.DATABASE_ENV || "unset",
    mutation: preview.ALLOW_PREVIEW_DB_MUTATION || "unset",
    data_mode: preview.PREVIEW_DATA_MODE || "unset",
  },
}));
