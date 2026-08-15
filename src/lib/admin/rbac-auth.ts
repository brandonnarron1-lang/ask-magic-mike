import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { Pool } from "pg";
import { sendLeadCenterPasswordResetEmail } from "./rbac-password-reset-email";

const statements = {
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "delete",
    "set-password",
    "set-email",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
} as const;

const access = createAccessControl(statements);
const administrator = access.newRole({
  user: ["create", "list", "set-role", "ban", "delete", "set-password", "set-email", "get", "update"],
  session: ["list", "revoke", "delete"],
});
const nonAdministrator = access.newRole({ user: [], session: [] });

export function normalizeAuthDatabaseUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return value;
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
    if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
      // pg currently treats these modes as verify-full and warns that v9 will
      // weaken their libpq-compatible meaning. Preserve the strong behavior.
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return value;
  }
}

const connectionString = normalizeAuthDatabaseUrl(
  process.env.DATABASE_URL || "postgresql://disabled:disabled@127.0.0.1:5432/disabled",
);

export const leadCenterAuth = betterAuth({
  appName: "Ask Magic Mike Lead Center",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  basePath: "/api/lead-center-auth",
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "development-only-rbac-disabled-until-a-real-secret-is-configured",
  database: new Pool({ connectionString, max: 4, idleTimeoutMillis: 10_000 }),
  trustedOrigins: [
    "https://www.askmagicmike.com",
    "https://askmagicmike.com",
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 14,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendLeadCenterPasswordResetEmail({ email: user.email, name: user.name, url });
    },
  },
  user: {
    modelName: "lead_center_users",
    additionalFields: {
      agentId: { type: "string", required: false, input: false },
      territory: { type: "string", required: false, input: false },
      leadPermissions: { type: "string", required: false, input: false },
    },
  },
  session: {
    modelName: "lead_center_sessions",
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
  account: { modelName: "lead_center_accounts" },
  verification: { modelName: "lead_center_verifications" },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "lead_center_rate_limits",
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 5 },
      "/request-password-reset": { window: 60 * 60, max: 3 },
      "/reset-password": { window: 60 * 60, max: 5 },
    },
  },
  advanced: {
    cookiePrefix: "amm-lead-center",
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [
    admin({
      ac: access,
      roles: {
        administrator,
        primary_lead_owner: nonAdministrator,
        approved_agent: nonAdministrator,
        read_only_analyst: nonAdministrator,
      },
      defaultRole: "read_only_analyst",
      adminRoles: ["administrator"],
      impersonationSessionDuration: 15 * 60,
      bannedUserMessage: "This Lead Center account is unavailable. Contact the system owner.",
    }),
  ],
  telemetry: { enabled: false },
});

export type LeadCenterAuthSession = typeof leadCenterAuth.$Infer.Session;
