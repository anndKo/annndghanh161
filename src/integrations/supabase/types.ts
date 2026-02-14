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
      assignments: {
        Row: {
          class_id: string
          created_at: string
          description: string | null
          due_date: string | null
          file_url: string | null
          id: string
          title: string
          tutor_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          title: string
          tutor_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          title?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attendance_date: string
          checked_in: boolean
          checked_in_at: string | null
          class_id: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          attendance_date?: string
          checked_in?: boolean
          checked_in_at?: string | null
          class_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          attendance_date?: string
          checked_in?: boolean
          checked_in_at?: string | null
          class_id?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      blacklisted_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      class_requests: {
        Row: {
          class_id: string
          created_at: string
          id: string
          status: string
          tutor_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          status?: string
          tutor_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          status?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          address: string | null
          class_type: string
          created_at: string
          discount_percent: number | null
          display_id: string | null
          grade: string
          id: string
          is_active: boolean
          is_shared: boolean
          max_students: number
          name: string
          price_per_session: number
          schedule_days: string | null
          schedule_end_time: string | null
          schedule_start_time: string | null
          subject: string
          teaching_format: string
          tutor_id: string | null
          tutor_percentage: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          class_type?: string
          created_at?: string
          discount_percent?: number | null
          display_id?: string | null
          grade?: string
          id?: string
          is_active?: boolean
          is_shared?: boolean
          max_students?: number
          name: string
          price_per_session?: number
          schedule_days?: string | null
          schedule_end_time?: string | null
          schedule_start_time?: string | null
          subject: string
          teaching_format?: string
          tutor_id?: string | null
          tutor_percentage?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          class_type?: string
          created_at?: string
          discount_percent?: number | null
          display_id?: string | null
          grade?: string
          id?: string
          is_active?: boolean
          is_shared?: boolean
          max_students?: number
          name?: string
          price_per_session?: number
          schedule_days?: string | null
          schedule_end_time?: string | null
          schedule_start_time?: string | null
          subject?: string
          teaching_format?: string
          tutor_id?: string | null
          tutor_percentage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          class_id: string
          created_at: string
          enrolled_at: string
          enrollment_expires_at: string | null
          enrollment_type: string | null
          id: string
          removal_reason: string | null
          status: string
          student_id: string
          trial_expires_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          enrolled_at?: string
          enrollment_expires_at?: string | null
          enrollment_type?: string | null
          id?: string
          removal_reason?: string | null
          status?: string
          student_id: string
          trial_expires_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          enrolled_at?: string
          enrollment_expires_at?: string | null
          enrollment_type?: string | null
          id?: string
          removal_reason?: string | null
          status?: string
          student_id?: string
          trial_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      game_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          player_id: string | null
          room_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          player_id?: string | null
          room_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          player_id?: string | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          avatar: string
          cards: Json | null
          id: string
          is_connected: boolean | null
          is_eliminated: boolean | null
          joined_at: string
          name: string
          player_id: string
          position: number
          room_id: string
        }
        Insert: {
          avatar: string
          cards?: Json | null
          id?: string
          is_connected?: boolean | null
          is_eliminated?: boolean | null
          joined_at?: string
          name: string
          player_id: string
          position: number
          room_id: string
        }
        Update: {
          avatar?: string
          cards?: Json | null
          id?: string
          is_connected?: boolean | null
          is_eliminated?: boolean | null
          joined_at?: string
          name?: string
          player_id?: string
          position?: number
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          code: string
          created_at: string
          current_player_index: number | null
          current_theme: string | null
          host_id: string
          id: string
          max_players: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_player_index?: number | null
          current_theme?: string | null
          host_id: string
          id?: string
          max_players?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_player_index?: number | null
          current_theme?: string | null
          host_id?: string
          id?: string
          max_players?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount: number
          bank_info: string | null
          created_at: string
          id: string
          proof_url: string | null
          status: string
          tutor_id: string
        }
        Insert: {
          amount?: number
          bank_info?: string | null
          created_at?: string
          id?: string
          proof_url?: string | null
          status?: string
          tutor_id: string
        }
        Update: {
          amount?: number
          bank_info?: string | null
          created_at?: string
          id?: string
          proof_url?: string | null
          status?: string
          tutor_id?: string
        }
        Relationships: []
      }
      played_cards: {
        Row: {
          cards: Json
          claimed_theme: string
          created_at: string
          id: string
          is_valid: boolean | null
          player_id: string
          room_id: string
        }
        Insert: {
          cards: Json
          claimed_theme: string
          created_at?: string
          id?: string
          is_valid?: boolean | null
          player_id: string
          room_id: string
        }
        Update: {
          cards?: Json
          claimed_theme?: string
          created_at?: string
          id?: string
          is_valid?: boolean | null
          player_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "played_cards_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutor_applications: {
        Row: {
          achievement_files: string[] | null
          best_subject: string | null
          created_at: string
          current_address: string | null
          faculty: string | null
          full_name: string
          id: string
          rejection_reason: string | null
          school_name: string | null
          status: string
          student_id_back: string | null
          student_id_front: string | null
          teachable_subjects: string[] | null
          teaching_areas: string[] | null
          teaching_format: string | null
          user_id: string
        }
        Insert: {
          achievement_files?: string[] | null
          best_subject?: string | null
          created_at?: string
          current_address?: string | null
          faculty?: string | null
          full_name: string
          id?: string
          rejection_reason?: string | null
          school_name?: string | null
          status?: string
          student_id_back?: string | null
          student_id_front?: string | null
          teachable_subjects?: string[] | null
          teaching_areas?: string[] | null
          teaching_format?: string | null
          user_id: string
        }
        Update: {
          achievement_files?: string[] | null
          best_subject?: string | null
          created_at?: string
          current_address?: string | null
          faculty?: string | null
          full_name?: string
          id?: string
          rejection_reason?: string | null
          school_name?: string | null
          status?: string
          student_id_back?: string | null
          student_id_front?: string | null
          teachable_subjects?: string[] | null
          teaching_areas?: string[] | null
          teaching_format?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tutor_complaints: {
        Row: {
          created_at: string
          id: string
          notification_id: string | null
          reason: string
          status: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id?: string | null
          reason: string
          status?: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string | null
          reason?: string
          status?: string
          tutor_id?: string
        }
        Relationships: []
      }
      tutor_ratings: {
        Row: {
          class_id: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          student_id: string
          tutor_id: string
        }
        Insert: {
          class_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          student_id: string
          tutor_id: string
        }
        Update: {
          class_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          student_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_ratings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
