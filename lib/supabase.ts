import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
// Prefer the new publishable key; fall back to legacy anon for compatibility
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-key';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'host' | 'cleaner';
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'host' | 'cleaner';
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'host' | 'cleaner';
          phone?: string | null;
          updated_at?: string;
        };
      };
      properties: {
        Row: {
          id: string;
          host_id: string;
          name: string;
          address: string;
          description: string | null;
          cleaner_rate_baht: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          name: string;
          address: string;
          description?: string | null;
          cleaner_rate_baht?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          name?: string;
          address?: string;
          description?: string | null;
          cleaner_rate_baht?: number;
          updated_at?: string;
        };
      };
      cleaners: {
        Row: {
          id: string;
          host_id: string;
          cleaner_profile_id: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          hourly_rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          cleaner_profile_id?: string | null;
          name: string;
          email?: string | null;
          phone?: string | null;
          hourly_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          cleaner_profile_id?: string | null;
          name?: string;
          email?: string | null;
          phone?: string | null;
          hourly_rate?: number;
          updated_at?: string;
        };
      };
      cleanings: {
        Row: {
          id: string;
          property_id: string;
          cleaner_id: string;
          scheduled_date: string;
          completed_at: string | null;
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          duration_hours: number | null;
          amount: number | null;
          transport_cost: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          cleaner_id: string;
          scheduled_date: string;
          completed_at?: string | null;
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          duration_hours?: number | null;
          amount?: number | null;
          transport_cost?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          cleaner_id?: string;
          scheduled_date?: string;
          completed_at?: string | null;
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          duration_hours?: number | null;
          amount?: number | null;
          transport_cost?: number | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      cleaning_media: {
        Row: {
          id: string;
          cleaning_id: string;
          media_url: string;
          media_type: 'image' | 'video';
          category: string | null;
          captured_at: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          cleaning_id: string;
          media_url: string;
          media_type: 'image' | 'video';
          category?: string | null;
          captured_at?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          cleaning_id?: string;
          media_url?: string;
          media_type?: 'image' | 'video';
          category?: string | null;
          captured_at?: string | null;
          uploaded_at?: string;
        };
      };
      property_tasks: {
        Row: {
          id: string;
          property_id: string;
          task: string;
          completed: boolean;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          task: string;
          completed?: boolean;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          task?: string;
          completed?: boolean;
          order?: number;
          updated_at?: string;
        };
      };
      cleaner_payouts: {
        Row: {
          id: string;
          host_id: string;
          cleaner_id: string;
          cleaning_id: string;
          amount: number;
          paid_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          cleaner_id: string;
          cleaning_id: string;
          amount: number;
          paid_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          cleaner_id?: string;
          cleaning_id?: string;
          amount?: number;
          paid_at?: string;
        };
      };
    };
  };
};
