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
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_FROM_PHONE?: string;

    // AVM
    ATTOM_API_KEY?: string;
    HOUSECANARY_API_KEY?: string;
    HOUSECANARY_API_SECRET?: string;

    // App
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_AGENT_NAME: string;
    NEXT_PUBLIC_BROKERAGE_NAME: string;
    NEXT_PUBLIC_AGENT_PHONE: string;
    NEXT_PUBLIC_MARKET_AREA: string;
    NEXT_PUBLIC_AGENT_LICENSE?: string;

    // Admin
    ADMIN_SECRET: string;
    SLA_ACCEPT_MS?: string;
    SLA_CONTACT_MS?: string;
  }
}
