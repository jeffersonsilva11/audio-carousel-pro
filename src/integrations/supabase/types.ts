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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_usage: {
        Row: {
          action: string
          api_name: string
          audio_seconds: number | null
          created_at: string
          estimated_cost_usd: number | null
          id: string
          tokens_input: number | null
          tokens_output: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          api_name: string
          audio_seconds?: number | null
          created_at?: string
          estimated_cost_usd?: number | null
          id?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          api_name?: string
          audio_seconds?: number | null
          created_at?: string
          estimated_cost_usd?: number | null
          id?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      carousels: {
        Row: {
          audio_duration: number | null
          audio_size: number | null
          audio_url: string | null
          cover_image_url: string | null
          created_at: string | null
          error_message: string | null
          exported_at: string | null
          format: string | null
          has_watermark: boolean | null
          id: string
          image_urls: string[] | null
          language: string | null
          processing_time: number | null
          script: Json | null
          slide_count: number | null
          status: string | null
          style: string | null
          tone: string | null
          transcription: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_duration?: number | null
          audio_size?: number | null
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          error_message?: string | null
          exported_at?: string | null
          format?: string | null
          has_watermark?: boolean | null
          id?: string
          image_urls?: string[] | null
          language?: string | null
          processing_time?: number | null
          script?: Json | null
          slide_count?: number | null
          status?: string | null
          style?: string | null
          tone?: string | null
          transcription?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_duration?: number | null
          audio_size?: number | null
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          error_message?: string | null
          exported_at?: string | null
          format?: string | null
          has_watermark?: boolean | null
          id?: string
          image_urls?: string[] | null
          language?: string | null
          processing_time?: number | null
          script?: Json | null
          slide_count?: number | null
          status?: string | null
          style?: string | null
          tone?: string | null
          transcription?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      custom_templates: {
        Row: {
          created_at: string
          custom_colors: string[] | null
          font_id: string
          gradient_id: string | null
          id: string
          is_default: boolean
          name: string
          style: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_colors?: string[] | null
          font_id?: string
          gradient_id?: string | null
          id?: string
          is_default?: boolean
          name: string
          style?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_colors?: string[] | null
          font_id?: string
          gradient_id?: string | null
          id?: string
          is_default?: boolean
          name?: string
          style?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_usage: {
        Row: {
          carousels_created: number
          created_at: string
          id: string
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          carousels_created?: number
          created_at?: string
          id?: string
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          carousels_created?: number
          created_at?: string
          id?: string
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer_en: string | null
          answer_es: string | null
          answer_pt: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          question_en: string | null
          question_es: string | null
          question_pt: string
          updated_at: string
        }
        Insert: {
          answer_en?: string | null
          answer_es?: string | null
          answer_pt: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question_en?: string | null
          question_es?: string | null
          question_pt: string
          updated_at?: string
        }
        Update: {
          answer_en?: string | null
          answer_es?: string | null
          answer_pt?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question_en?: string | null
          question_es?: string | null
          question_pt?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      landing_content: {
        Row: {
          content_key: string
          content_type: string | null
          created_at: string
          id: string
          section_key: string
          updated_at: string
          value_en: string | null
          value_es: string | null
          value_pt: string
        }
        Insert: {
          content_key: string
          content_type?: string | null
          created_at?: string
          id?: string
          section_key: string
          updated_at?: string
          value_en?: string | null
          value_es?: string | null
          value_pt: string
        }
        Update: {
          content_key?: string
          content_type?: string | null
          created_at?: string
          id?: string
          section_key?: string
          updated_at?: string
          value_en?: string | null
          value_es?: string | null
          value_pt?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_position: string | null
          created_at: string | null
          daily_carousels_used: number | null
          date_format: string | null
          default_creative_tone: string | null
          default_manual_slide_count: number | null
          default_slide_count_mode: string | null
          default_style: string | null
          default_template: string | null
          default_text_mode: string | null
          default_tone: string | null
          display_mode: string | null
          email: string | null
          id: string
          instagram_handle: string | null
          last_carousel_reset_date: string | null
          name: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_step: number | null
          plan_tier: Database["public"]["Enums"]["plan_tier"] | null
          preferred_lang: string | null
          profile_image: string | null
          show_relative_time: boolean | null
          tiktok_handle: string | null
          time_format: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_position?: string | null
          created_at?: string | null
          daily_carousels_used?: number | null
          date_format?: string | null
          default_creative_tone?: string | null
          default_manual_slide_count?: number | null
          default_slide_count_mode?: string | null
          default_style?: string | null
          default_template?: string | null
          default_text_mode?: string | null
          default_tone?: string | null
          display_mode?: string | null
          email?: string | null
          id?: string
          instagram_handle?: string | null
          last_carousel_reset_date?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"] | null
          preferred_lang?: string | null
          profile_image?: string | null
          show_relative_time?: boolean | null
          tiktok_handle?: string | null
          time_format?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_position?: string | null
          created_at?: string | null
          daily_carousels_used?: number | null
          date_format?: string | null
          default_creative_tone?: string | null
          default_manual_slide_count?: number | null
          default_slide_count_mode?: string | null
          default_style?: string | null
          default_template?: string | null
          default_text_mode?: string | null
          default_tone?: string | null
          display_mode?: string | null
          email?: string | null
          id?: string
          instagram_handle?: string | null
          last_carousel_reset_date?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"] | null
          preferred_lang?: string | null
          profile_image?: string | null
          show_relative_time?: boolean | null
          tiktok_handle?: string | null
          time_format?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          created_at: string
          data: Json
          event_id: string
          event_type: string
          id: string
          processed: boolean | null
        }
        Insert: {
          created_at?: string
          data: Json
          event_id: string
          event_type: string
          id?: string
          processed?: boolean | null
        }
        Update: {
          created_at?: string
          data?: Json
          event_id?: string
          event_type?: string
          id?: string
          processed?: boolean | null
        }
        Relationships: []
      }
      plans_config: {
        Row: {
          id: string
          tier: string
          name_pt: string
          name_en: string | null
          name_es: string | null
          description_pt: string | null
          description_en: string | null
          description_es: string | null
          price_brl: number
          price_usd: number | null
          price_eur: number | null
          stripe_price_id_brl: string | null
          stripe_price_id_usd: string | null
          stripe_price_id_eur: string | null
          checkout_link_brl: string | null
          checkout_link_usd: string | null
          checkout_link_eur: string | null
          daily_limit: number
          monthly_limit: number | null
          has_watermark: boolean
          has_editor: boolean
          has_history: boolean
          has_zip_download: boolean
          has_custom_fonts: boolean
          has_gradients: boolean
          has_slide_images: boolean
          features_pt: string[] | null
          features_en: string[] | null
          features_es: string[] | null
          limitations_pt: string[] | null
          limitations_en: string[] | null
          limitations_es: string[] | null
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tier: string
          name_pt: string
          name_en?: string | null
          name_es?: string | null
          description_pt?: string | null
          description_en?: string | null
          description_es?: string | null
          price_brl?: number
          price_usd?: number | null
          price_eur?: number | null
          stripe_price_id_brl?: string | null
          stripe_price_id_usd?: string | null
          stripe_price_id_eur?: string | null
          checkout_link_brl?: string | null
          checkout_link_usd?: string | null
          checkout_link_eur?: string | null
          daily_limit?: number
          monthly_limit?: number | null
          has_watermark?: boolean
          has_editor?: boolean
          has_history?: boolean
          has_zip_download?: boolean
          has_custom_fonts?: boolean
          has_gradients?: boolean
          has_slide_images?: boolean
          features_pt?: string[] | null
          features_en?: string[] | null
          features_es?: string[] | null
          limitations_pt?: string[] | null
          limitations_en?: string[] | null
          limitations_es?: string[] | null
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tier?: string
          name_pt?: string
          name_en?: string | null
          name_es?: string | null
          description_pt?: string | null
          description_en?: string | null
          description_es?: string | null
          price_brl?: number
          price_usd?: number | null
          price_eur?: number | null
          stripe_price_id_brl?: string | null
          stripe_price_id_usd?: string | null
          stripe_price_id_eur?: string | null
          checkout_link_brl?: string | null
          checkout_link_usd?: string | null
          checkout_link_eur?: string | null
          daily_limit?: number
          monthly_limit?: number | null
          has_watermark?: boolean
          has_editor?: boolean
          has_history?: boolean
          has_zip_download?: boolean
          has_custom_fonts?: boolean
          has_gradients?: boolean
          has_slide_images?: boolean
          features_pt?: string[] | null
          features_en?: string[] | null
          features_es?: string[] | null
          limitations_pt?: string[] | null
          limitations_en?: string[] | null
          limitations_es?: string[] | null
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      manual_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_tier: string
          reason: string | null
          notes: string | null
          granted_by: string | null
          starts_at: string
          expires_at: string | null
          custom_daily_limit: number | null
          custom_features: Record<string, unknown> | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_tier: string
          reason?: string | null
          notes?: string | null
          granted_by?: string | null
          starts_at?: string
          expires_at?: string | null
          custom_daily_limit?: number | null
          custom_features?: Record<string, unknown> | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_tier?: string
          reason?: string | null
          notes?: string | null
          granted_by?: string | null
          starts_at?: string
          expires_at?: string | null
          custom_daily_limit?: number | null
          custom_features?: Record<string, unknown> | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          daily_limit: number
          has_editor: boolean
          has_history: boolean
          has_image_generation: boolean
          has_watermark: boolean
          id: string
          monthly_limit: number | null
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          price_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          daily_limit?: number
          has_editor?: boolean
          has_history?: boolean
          has_image_generation?: boolean
          has_watermark?: boolean
          id?: string
          monthly_limit?: number | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          daily_limit?: number
          has_editor?: boolean
          has_history?: boolean
          has_image_generation?: boolean
          has_watermark?: boolean
          id?: string
          monthly_limit?: number | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_avatar: string | null
          author_company: string | null
          author_name: string
          author_role_en: string | null
          author_role_es: string | null
          author_role_pt: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          metric_label_en: string | null
          metric_label_es: string | null
          metric_label_pt: string | null
          metric_value: string | null
          quote_en: string | null
          quote_es: string | null
          quote_pt: string
          rating: number | null
          updated_at: string
        }
        Insert: {
          author_avatar?: string | null
          author_company?: string | null
          author_name: string
          author_role_en?: string | null
          author_role_es?: string | null
          author_role_pt: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          metric_label_en?: string | null
          metric_label_es?: string | null
          metric_label_pt?: string | null
          metric_value?: string | null
          quote_en?: string | null
          quote_es?: string | null
          quote_pt: string
          rating?: number | null
          updated_at?: string
        }
        Update: {
          author_avatar?: string | null
          author_company?: string | null
          author_name?: string
          author_role_en?: string | null
          author_role_es?: string | null
          author_role_pt?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          metric_label_en?: string | null
          metric_label_es?: string | null
          metric_label_pt?: string | null
          metric_value?: string | null
          quote_en?: string | null
          quote_es?: string | null
          quote_pt?: string
          rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      trusted_companies: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          logo_svg: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_svg: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_svg?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      plan_tier: "free" | "starter" | "creator" | "agency"
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
      plan_tier: ["free", "starter", "creator", "agency"],
    },
  },
} as const
