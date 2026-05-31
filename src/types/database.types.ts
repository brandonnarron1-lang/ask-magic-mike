// Hand-authored types mirroring supabase/migrations/ schema.
// After connecting to Supabase, regenerate with:
//   supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          expires_at: string;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_term: string | null;
          referrer_url: string | null;
          referrer_type: string | null;
          landing_page: string | null;
          user_agent: string | null;
          ip_address: string | null;
          device_type: string | null;
          status: string;
          step_reached: number;
          initial_question: string | null;
          initial_address: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          referrer_url?: string | null;
          referrer_type?: string | null;
          landing_page?: string | null;
          user_agent?: string | null;
          ip_address?: string | null;
          device_type?: string | null;
          status?: string;
          step_reached?: number;
          initial_question?: string | null;
          initial_address?: string | null;
        };
        Update: {
          id?: string;
          updated_at?: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          status?: string;
          step_reached?: number;
          initial_question?: string | null;
          initial_address?: string | null;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          session_id: string;
          created_at: string;
          updated_at: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          phone_normalized: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string;
          zip: string | null;
          address_raw: string | null;
          primary_intent: string;
          question_raw: string | null;
          timeline_months: number | null;
          consent_sms: boolean;
          consent_call: boolean;
          consent_email: boolean;
          consent_timestamp: string | null;
          consent_ip: string | null;
          consent_language_version: string;
          cta_chip_used: string | null;
          status: string;
          crm_contact_id: string | null;
          crm_lead_id: string | null;
          crm_synced_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          created_at?: string;
          updated_at?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          phone_normalized?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string;
          zip?: string | null;
          address_raw?: string | null;
          primary_intent?: string;
          question_raw?: string | null;
          timeline_months?: number | null;
          consent_sms?: boolean;
          consent_call?: boolean;
          consent_email?: boolean;
          consent_timestamp?: string | null;
          consent_ip?: string | null;
          consent_language_version?: string;
          cta_chip_used?: string | null;
          status?: string;
          crm_contact_id?: string | null;
          crm_lead_id?: string | null;
          crm_synced_at?: string | null;
        };
        Update: {
          id?: string;
          updated_at?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          phone_normalized?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string;
          zip?: string | null;
          address_raw?: string | null;
          primary_intent?: string;
          question_raw?: string | null;
          timeline_months?: number | null;
          consent_sms?: boolean;
          consent_call?: boolean;
          consent_email?: boolean;
          consent_timestamp?: string | null;
          consent_ip?: string | null;
          consent_language_version?: string;
          cta_chip_used?: string | null;
          status?: string;
          crm_contact_id?: string | null;
          crm_lead_id?: string | null;
          crm_synced_at?: string | null;
        };
        Relationships: [];
      };
      lead_scores: {
        Row: {
          id: string;
          lead_id: string;
          scored_at: string;
          seller_certainty_score: number;
          buyer_certainty_score: number;
          composite_score: number;
          temperature: string;
          factor_log: Json;
          scorer_version: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          scored_at?: string;
          seller_certainty_score: number;
          buyer_certainty_score: number;
          composite_score: number;
          temperature: string;
          factor_log: Json;
          scorer_version: string;
        };
        Update: {
          scored_at?: string;
          seller_certainty_score?: number;
          buyer_certainty_score?: number;
          composite_score?: number;
          temperature?: string;
          factor_log?: Json;
          scorer_version?: string;
        };
        Relationships: [];
      };
      agents: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          email: string;
          phone: string | null;
          role: string;
          is_active: boolean;
          max_daily_leads: number;
          current_load: number;
          priority_score: number;
          availability: Json;
          timezone: string;
          notification_email: boolean;
          notification_sms: boolean;
          notification_phone: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          email: string;
          phone?: string | null;
          role?: string;
          is_active?: boolean;
          max_daily_leads?: number;
          current_load?: number;
          priority_score?: number;
          availability?: Json;
          timezone?: string;
          notification_email?: boolean;
          notification_sms?: boolean;
          notification_phone?: string | null;
        };
        Update: {
          updated_at?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          role?: string;
          is_active?: boolean;
          max_daily_leads?: number;
          current_load?: number;
          priority_score?: number;
          availability?: Json;
          timezone?: string;
          notification_email?: boolean;
          notification_sms?: boolean;
          notification_phone?: string | null;
        };
        Relationships: [];
      };
      lead_routing: {
        Row: {
          id: string;
          lead_id: string;
          agent_id: string;
          assigned_at: string;
          assignment_reason: string;
          agent_priority_score: number;
          accept_deadline: string;
          contact_deadline: string;
          accepted_at: string | null;
          contacted_at: string | null;
          status: string;
          escalated_at: string | null;
          escalation_reason: string | null;
          reassigned_to: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          lead_id: string;
          agent_id: string;
          assigned_at?: string;
          assignment_reason: string;
          agent_priority_score: number;
          accepted_at?: string | null;
          contacted_at?: string | null;
          status?: string;
          escalated_at?: string | null;
          escalation_reason?: string | null;
          reassigned_to?: string | null;
          notes?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          contacted_at?: string | null;
          status?: string;
          escalated_at?: string | null;
          escalation_reason?: string | null;
          reassigned_to?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          occurred_at: string;
          session_id: string | null;
          lead_id: string | null;
          agent_id: string | null;
          event_name: string;
          event_category: string;
          properties: Json;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          occurred_at?: string;
          session_id?: string | null;
          lead_id?: string | null;
          agent_id?: string | null;
          event_name: string;
          event_category: string;
          properties?: Json;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      crm_sync_log: {
        Row: {
          id: string;
          occurred_at: string;
          lead_id: string;
          operation: string;
          adapter: string;
          status: string;
          request_payload: Json | null;
          response_payload: Json | null;
          error_message: string | null;
          duration_ms: number | null;
        };
        Insert: {
          id?: string;
          occurred_at?: string;
          lead_id: string;
          operation: string;
          adapter: string;
          status: string;
          request_payload?: Json | null;
          response_payload?: Json | null;
          error_message?: string | null;
          duration_ms?: number | null;
        };
        Update: {
          status?: string;
          response_payload?: Json | null;
          error_message?: string | null;
          duration_ms?: number | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
  };
}
