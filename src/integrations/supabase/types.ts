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
          description: string | null
          feedback: string | null
          file_url: string
          grade: string | null
          id: string
          student_id: string
          submitted_at: string
          title: string
        }
        Insert: {
          class_id: string
          description?: string | null
          feedback?: string | null
          file_url: string
          grade?: string | null
          id?: string
          student_id: string
          submitted_at?: string
          title: string
        }
        Update: {
          class_id?: string
          description?: string | null
          feedback?: string | null
          file_url?: string
          grade?: string | null
          id?: string
          student_id?: string
          submitted_at?: string
          title?: string
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
      class_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "class_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      class_group_messages: {
        Row: {
          class_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          class_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          class_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_group_messages_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_messages: {
        Row: {
          class_id: string
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          class_id: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          class_id?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_messages_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_post_files: {
        Row: {
          created_at: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type: string
          file_url: string
          id?: string
          post_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_post_files_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "class_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      class_posts: {
        Row: {
          class_id: string
          content: string
          created_at: string
          id: string
          title: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          content: string
          created_at?: string
          id?: string
          title: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_posts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_requests: {
        Row: {
          admin_response: string | null
          class_id: string
          created_at: string
          id: string
          note: string | null
          status: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          class_id: string
          created_at?: string
          id?: string
          note?: string | null
          status?: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          class_id?: string
          created_at?: string
          id?: string
          note?: string | null
          status?: string
          tutor_id?: string
          updated_at?: string
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
      class_submissions: {
        Row: {
          content: string | null
          created_at: string
          feedback: string | null
          file_name: string | null
          file_url: string | null
          grade: string | null
          id: string
          post_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          grade?: string | null
          id?: string
          post_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          grade?: string | null
          id?: string
          post_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_submissions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "class_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          address: string | null
          class_type: Database["public"]["Enums"]["class_type"]
          created_at: string
          description: string | null
          discount_percent: number | null
          display_id: string | null
          grade: string
          id: string
          is_active: boolean
          is_shared: boolean | null
          max_students: number | null
          name: string
          price_per_session: number
          schedule_days: string | null
          schedule_end_time: string | null
          schedule_start_time: string | null
          subject: string
          teaching_format: Database["public"]["Enums"]["teaching_format"]
          trial_days: number | null
          tutor_id: string | null
          tutor_percentage: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          class_type?: Database["public"]["Enums"]["class_type"]
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          display_id?: string | null
          grade: string
          id?: string
          is_active?: boolean
          is_shared?: boolean | null
          max_students?: number | null
          name: string
          price_per_session: number
          schedule_days?: string | null
          schedule_end_time?: string | null
          schedule_start_time?: string | null
          subject: string
          teaching_format?: Database["public"]["Enums"]["teaching_format"]
          trial_days?: number | null
          tutor_id?: string | null
          tutor_percentage?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          class_type?: Database["public"]["Enums"]["class_type"]
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          display_id?: string | null
          grade?: string
          id?: string
          is_active?: boolean
          is_shared?: boolean | null
          max_students?: number | null
          name?: string
          price_per_session?: number
          schedule_days?: string | null
          schedule_end_time?: string | null
          schedule_start_time?: string | null
          subject?: string
          teaching_format?: Database["public"]["Enums"]["teaching_format"]
          trial_days?: number | null
          tutor_id?: string | null
          tutor_percentage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      enrollment_requests: {
        Row: {
          amount: number | null
          class_id: string
          content: string | null
          created_at: string
          created_by: string
          enrollment_days: number | null
          id: string
          payment_image_url: string | null
          request_type: string
          status: string
          student_address: string | null
          student_id: string
          student_phone: string | null
          trial_expires_at: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          class_id: string
          content?: string | null
          created_at?: string
          created_by: string
          enrollment_days?: number | null
          id?: string
          payment_image_url?: string | null
          request_type: string
          status?: string
          student_address?: string | null
          student_id: string
          student_phone?: string | null
          trial_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          class_id?: string
          content?: string | null
          created_at?: string
          created_by?: string
          enrollment_days?: number | null
          id?: string
          payment_image_url?: string | null
          request_type?: string
          status?: string
          student_address?: string | null
          student_id?: string
          student_phone?: string | null
          trial_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string
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
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
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
          message: string
          related_id?: string | null
          title: string
          type: string
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
          admin_response: string | null
          content: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          content: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          content?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutor_applications: {
        Row: {
          achievement_files: string[] | null
          best_subject: string
          created_at: string
          current_address: string
          education_status: string | null
          faculty: string
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          rejection_reason: string | null
          school_name: string
          status: Database["public"]["Enums"]["tutor_status"]
          student_id_back: string
          student_id_front: string
          teachable_subjects: string[]
          teaching_areas: string[]
          teaching_format: Database["public"]["Enums"]["teaching_format"]
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_files?: string[] | null
          best_subject: string
          created_at?: string
          current_address: string
          education_status?: string | null
          faculty: string
          full_name: string
          gender?: string | null
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          school_name: string
          status?: Database["public"]["Enums"]["tutor_status"]
          student_id_back: string
          student_id_front: string
          teachable_subjects: string[]
          teaching_areas: string[]
          teaching_format?: Database["public"]["Enums"]["teaching_format"]
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_files?: string[] | null
          best_subject?: string
          created_at?: string
          current_address?: string
          education_status?: string | null
          faculty?: string
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          school_name?: string
          status?: Database["public"]["Enums"]["tutor_status"]
          student_id_back?: string
          student_id_front?: string
          teachable_subjects?: string[]
          teaching_areas?: string[]
          teaching_format?: Database["public"]["Enums"]["teaching_format"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutor_bank_accounts: {
        Row: {
          account_holder_name: string
          account_number: string
          bank_name: string
          created_at: string
          id: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          account_holder_name: string
          account_number: string
          bank_name: string
          created_at?: string
          id?: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutor_complaints: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          notification_id: string | null
          reason: string
          status: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          notification_id?: string | null
          reason: string
          status?: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          notification_id?: string | null
          reason?: string
          status?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutor_payment_requests: {
        Row: {
          admin_note: string | null
          approved_amount: number | null
          class_id: string | null
          created_at: string
          id: string
          note: string | null
          requested_amount: number
          status: Database["public"]["Enums"]["payment_request_status"]
          tutor_id: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          approved_amount?: number | null
          class_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          requested_amount: number
          status?: Database["public"]["Enums"]["payment_request_status"]
          tutor_id: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          approved_amount?: number | null
          class_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          requested_amount?: number
          status?: Database["public"]["Enums"]["payment_request_status"]
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_payment_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_ratings: {
        Row: {
          class_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          student_id: string
          tutor_id: string
        }
        Insert: {
          class_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          student_id: string
          tutor_id: string
        }
        Update: {
          class_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          student_id?: string
          tutor_id?: string
        }
        Relationships: []
      }
      tutor_revenue: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          payment_request_id: string | null
          tutor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          payment_request_id?: string | null
          tutor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_request_id?: string | null
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_revenue_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "tutor_payment_requests"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      is_first_user: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "tutor" | "student"
      class_type: "group" | "one_on_one"
      payment_request_status: "pending" | "approved" | "rejected"
      teaching_format: "online" | "offline" | "both"
      tutor_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "tutor", "student"],
      class_type: ["group", "one_on_one"],
      payment_request_status: ["pending", "approved", "rejected"],
      teaching_format: ["online", "offline", "both"],
      tutor_status: ["pending", "approved", "rejected"],
    },
  },
} as const
