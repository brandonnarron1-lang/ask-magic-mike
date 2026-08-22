declare namespace NodeJS {
  interface ProcessEnv {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;

    // AI Providers
    ANTHROPIC_API_KEY?: string;
    OPENAI_API_KEY?: string;

    // CRM
    FUB_API_KEY?: string;
    FUB_BASE_URL?: string;
    KVCORE_API_KEY?: string;
    KVCORE_BASE_URL?: string;

    // Notifications
    RESEND_API_KEY?: string;
    EMAIL_PROVIDER?: string;
    EMAIL_ENABLED?: string;
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_SECURE?: string;
    SMTP_USER?: string;
    SMTP_PASSWORD?: string;
    SMTP_FROM_NAME?: string;
    SMTP_FROM_EMAIL?: string;
    SMTP_REPLY_TO?: string;
    SMTP_CONNECTION_TIMEOUT_MS?: string;
    SMTP_GREETING_TIMEOUT_MS?: string;
    SMTP_SOCKET_TIMEOUT_MS?: string;
    LEAD_NOTIFICATION_MODE?: string;
    NOTIFICATION_PROVIDER_MODE?: string;
    AGENT_NOTIFICATIONS_ENABLED?: string;
    AGENT_SMS_NOTIFICATIONS_ENABLED?: string;
    CUSTOMER_EMAIL_ENABLED?: string;
    CUSTOMER_SMS_ENABLED?: string;
    AGENT_NOTIFICATION_FROM_EMAIL?: string;
    AGENT_NOTIFICATION_SANDBOX_EMAIL?: string;
    AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS?: string;
    LEAD_NOTIFICATION_PRODUCTION_ENABLED?: string;
    CONSOLE_NOTIFICATION_BEHAVIOR?: string;
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_PHONE_NUMBER?: string;
    ENABLE_SMS?: string;
    SMS_PROVIDER?: string;
    /** Operator approval gate — real SMS sends stay off until a human sets this to "true". */
    SMS_SENDS_HUMAN_APPROVED?: string;

    // AVM
    ATTOM_API_KEY?: string;
    HOUSECANARY_API_KEY?: string;
    HOUSECANARY_API_SECRET?: string;

    // App
    NEXT_PUBLIC_SITE_URL?: string;
    PUBLIC_SITE_URL?: string;
    /** @deprecated Use NEXT_PUBLIC_SITE_URL instead. */
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_AGENT_NAME: string;
    NEXT_PUBLIC_BROKERAGE_NAME: string;
    NEXT_PUBLIC_AGENT_PHONE: string;
    NEXT_PUBLIC_MARKET_AREA: string;
    NEXT_PUBLIC_AGENT_LICENSE?: string;

    // Admin
    ADMIN_SECRET: string;
    CRON_SECRET?: string;
    PHONE_SETUP_SIGNING_SECRET?: string;
    DATABASE_URL?: string;
    DATABASE_ENV?: string;
    SUPABASE_PROJECT_REF?: string;
    PRODUCTION_SUPABASE_PROJECT_REF?: string;
    PREVIEW_SUPABASE_PROJECT_REF?: string;
    ALLOW_PREVIEW_DB_MUTATION?: string;
    PREVIEW_DATA_MODE?: string;
    LEAD_CENTER_RBAC_ENABLED?: string;
    BETTER_AUTH_URL?: string;
    BETTER_AUTH_SECRET?: string;
    RBAC_PASSWORD_RESET_EMAIL_ENABLED?: string;
    SLA_ACCEPT_MS?: string;
    SLA_CONTACT_MS?: string;

    // Durable abuse controls (server-only; never use NEXT_PUBLIC_ prefixes)
    RATE_LIMIT_HASH_SECRET?: string;
    RATE_LIMIT_EMERGENCY_MEMORY?: string;
    CONSENT_IP_HASH_SALT?: string;
  }
}
