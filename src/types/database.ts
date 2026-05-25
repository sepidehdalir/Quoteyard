/**
 * Database type definitions for the Supabase schema defined in
 * `supabase/migrations/`.
 *
 * This file is intentionally hand-written to match exactly what
 * `supabase gen types typescript --linked --schema public` will
 * produce after the migrations run. It lets `npm run build` pass
 * before the Supabase CLI is installed.
 *
 * After running the migrations against your Supabase project,
 * regenerate this file with:
 *
 *   npm run db:types
 *
 * The generated output should be functionally identical to this
 * placeholder. Treat the generator as the source of truth from
 * Phase 3 onwards.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          user_id: string;
          email: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_users_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      cities: {
        Row: {
          id: string;
          slug: string;
          name: string;
          province: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          province?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          province?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      lead_files: {
        Row: {
          id: string;
          lead_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          storage_path?: string;
          file_name?: string;
          mime_type?: string;
          size_bytes?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_files_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
        ];
      };
      lead_notes: {
        Row: {
          id: string;
          lead_id: string;
          author_id: string | null;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          author_id?: string | null;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          author_id?: string | null;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_notes_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
        ];
      };
      leads: {
        Row: {
          id: string;
          status: Database['public']['Enums']['lead_status'];
          service_id: string;
          city_id: string | null;
          full_name: string;
          email: string;
          phone: string;
          address: string | null;
          project_description: string;
          estimated_quote_cents: number | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          status?: Database['public']['Enums']['lead_status'];
          service_id: string;
          city_id?: string | null;
          full_name: string;
          email: string;
          phone: string;
          address?: string | null;
          project_description: string;
          estimated_quote_cents?: number | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          status?: Database['public']['Enums']['lead_status'];
          service_id?: string;
          city_id?: string | null;
          full_name?: string;
          email?: string;
          phone?: string;
          address?: string | null;
          project_description?: string;
          estimated_quote_cents?: number | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leads_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
        ];
      };
      services: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      lead_status: 'new' | 'contacted' | 'quoted' | 'won' | 'lost';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
