export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      category_rules: {
        Row: {
          category: string
          created_at: string
          id: string
          is_published: boolean
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_published?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      click_tracking: {
        Row: {
          clicked_at: string | null
          deal_id: string
          id: string
          ip_address: string | null
          project_id: string | null
          referer: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string | null
          deal_id: string
          id?: string
          ip_address?: string | null
          project_id?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string | null
          deal_id?: string
          id?: string
          ip_address?: string | null
          project_id?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "click_tracking_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_job_health: {
        Row: {
          alert_sent: boolean | null
          consecutive_failures: number | null
          created_at: string | null
          failed_runs: number | null
          id: string
          job_id: number
          job_name: string
          last_failure_at: string | null
          last_success_at: string | null
          status: string
          successful_runs: number | null
          total_runs: number | null
          updated_at: string | null
          uptime_percentage: number | null
        }
        Insert: {
          alert_sent?: boolean | null
          consecutive_failures?: number | null
          created_at?: string | null
          failed_runs?: number | null
          id?: string
          job_id: number
          job_name: string
          last_failure_at?: string | null
          last_success_at?: string | null
          status: string
          successful_runs?: number | null
          total_runs?: number | null
          updated_at?: string | null
          uptime_percentage?: number | null
        }
        Update: {
          alert_sent?: boolean | null
          consecutive_failures?: number | null
          created_at?: string | null
          failed_runs?: number | null
          id?: string
          job_id?: number
          job_name?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          status?: string
          successful_runs?: number | null
          total_runs?: number | null
          updated_at?: string | null
          uptime_percentage?: number | null
        }
        Relationships: []
      }
      deal_price_history: {
        Row: {
          created_at: string
          deal_id: string
          discount: number | null
          id: string
          original_price: number | null
          price: number
          recorded_at: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          discount?: number | null
          id?: string
          original_price?: number | null
          price: number
          recorded_at?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          discount?: number | null
          id?: string
          original_price?: number | null
          price?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_price_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          brand: string | null
          category: string | null
          coupon_code: string | null
          created_at: string | null
          description: string | null
          discount: number | null
          fetched_at: string | null
          id: string
          image_url: string
          in_stock: boolean | null
          original_price: number | null
          posted_at: string | null
          price: number
          product_url: string
          rating: number | null
          review_count: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          coupon_code?: string | null
          created_at?: string | null
          description?: string | null
          discount?: number | null
          fetched_at?: string | null
          id: string
          image_url: string
          in_stock?: boolean | null
          original_price?: number | null
          posted_at?: string | null
          price: number
          product_url: string
          rating?: number | null
          review_count?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          coupon_code?: string | null
          created_at?: string | null
          description?: string | null
          discount?: number | null
          fetched_at?: string | null
          id?: string
          image_url?: string
          in_stock?: boolean | null
          original_price?: number | null
          posted_at?: string | null
          price?: number
          product_url?: string
          rating?: number | null
          review_count?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string | null
          tracking_code: string
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug?: string | null
          tracking_code: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string | null
          tracking_code?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_cron_job_runs: {
        Args: never
        Returns: {
          end_time: string
          jobid: number
          return_message: string
          runid: number
          start_time: string
          status: string
        }[]
      }
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      promote_to_admin: { Args: { target_user_id: string }; Returns: undefined }
      toggle_cron_job: {
        Args: { job_id: number; new_active: boolean }
        Returns: boolean
      }
      update_cron_schedule: {
        Args: { job_id: number; new_schedule: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
