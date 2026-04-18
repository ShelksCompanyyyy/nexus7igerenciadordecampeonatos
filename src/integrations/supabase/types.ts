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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      clans: {
        Row: {
          admin_code: string | null
          banner: string | null
          created_at: string
          description: string | null
          id: string
          is_banned: boolean
          logo: string | null
          losses: number | null
          name: string
          owner_id: string | null
          updated_at: string
          wins: number | null
        }
        Insert: {
          admin_code?: string | null
          banner?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_banned?: boolean
          logo?: string | null
          losses?: number | null
          name: string
          owner_id?: string | null
          updated_at?: string
          wins?: number | null
        }
        Update: {
          admin_code?: string | null
          banner?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_banned?: boolean
          logo?: string | null
          losses?: number | null
          name?: string
          owner_id?: string | null
          updated_at?: string
          wins?: number | null
        }
        Relationships: []
      }
      economy: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          clan_id: string
          created_at: string
          id: string
          match_date: string
          match_time: string | null
          player_stats: Json | null
          score_a: number | null
          score_b: number | null
          status: string | null
          team_a_id: string | null
          team_b_id: string | null
          updated_at: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          id?: string
          match_date: string
          match_time?: string | null
          player_stats?: Json | null
          score_a?: number | null
          score_b?: number | null
          status?: string | null
          team_a_id?: string | null
          team_b_id?: string | null
          updated_at?: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          id?: string
          match_date?: string
          match_time?: string | null
          player_stats?: Json | null
          score_a?: number | null
          score_b?: number | null
          status?: string | null
          team_a_id?: string | null
          team_b_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author_id: string | null
          clan_id: string | null
          content: string
          created_at: string
          id: string
          image: string | null
          title: string
        }
        Insert: {
          author_id?: string | null
          clan_id?: string | null
          content: string
          created_at?: string
          id?: string
          image?: string | null
          title: string
        }
        Update: {
          author_id?: string | null
          clan_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          championship: string | null
          clan_id: string | null
          created_at: string
          id: string
          payment_date: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          championship?: string | null
          clan_id?: string | null
          created_at?: string
          id?: string
          payment_date: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          championship?: string | null
          clan_id?: string | null
          created_at?: string
          id?: string
          payment_date?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assists: number | null
          avatar: string | null
          badges: string[] | null
          clan_id: string | null
          colored_nick: boolean | null
          created_at: string
          deaths: number | null
          email: string
          frame_id: string | null
          free_spins: number | null
          game_nick: string
          gold: number | null
          id: string
          kills: number | null
          matches_played: number | null
          mvps: number | null
          nick_color_id: string | null
          team_id: string | null
          unique_id: string
          updated_at: string
          user_id: string
          username: string
          whatsapp: string | null
        }
        Insert: {
          assists?: number | null
          avatar?: string | null
          badges?: string[] | null
          clan_id?: string | null
          colored_nick?: boolean | null
          created_at?: string
          deaths?: number | null
          email: string
          frame_id?: string | null
          free_spins?: number | null
          game_nick: string
          gold?: number | null
          id?: string
          kills?: number | null
          matches_played?: number | null
          mvps?: number | null
          nick_color_id?: string | null
          team_id?: string | null
          unique_id?: string
          updated_at?: string
          user_id: string
          username: string
          whatsapp?: string | null
        }
        Update: {
          assists?: number | null
          avatar?: string | null
          badges?: string[] | null
          clan_id?: string | null
          colored_nick?: boolean | null
          created_at?: string
          deaths?: number | null
          email?: string
          frame_id?: string | null
          free_spins?: number | null
          game_nick?: string
          gold?: number | null
          id?: string
          kills?: number | null
          matches_played?: number | null
          mvps?: number | null
          nick_color_id?: string | null
          team_id?: string | null
          unique_id?: string
          updated_at?: string
          user_id?: string
          username?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_purchases: {
        Row: {
          amount: number
          bonus_spins: number | null
          created_at: string
          id: string
          method: string | null
          spins: number
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          bonus_spins?: number | null
          created_at?: string
          id?: string
          method?: string | null
          spins: number
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          bonus_spins?: number | null
          created_at?: string
          id?: string
          method?: string | null
          spins?: number
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      spins: {
        Row: {
          cost: number
          created_at: string
          id: string
          reward: number
          spin_type: string
          user_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          reward?: number
          spin_type?: string
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          reward?: number
          spin_type?: string
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          clan_id: string
          created_at: string
          id: string
          logo: string | null
          losses: number | null
          name: string
          players: string[] | null
          updated_at: string
          wins: number | null
        }
        Insert: {
          clan_id: string
          created_at?: string
          id?: string
          logo?: string | null
          losses?: number | null
          name: string
          players?: string[] | null
          updated_at?: string
          wins?: number | null
        }
        Update: {
          clan_id?: string
          created_at?: string
          id?: string
          logo?: string | null
          losses?: number | null
          name?: string
          players?: string[] | null
          updated_at?: string
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          clan_id: string
          created_at: string
          id: string
          player_stats: Json | null
          score_a: number | null
          score_b: number | null
          status: string | null
          team_a_id: string | null
          team_b_id: string | null
          training_date: string
          training_time: string | null
          updated_at: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          id?: string
          player_stats?: Json | null
          score_a?: number | null
          score_b?: number | null
          status?: string | null
          team_a_id?: string | null
          team_b_id?: string | null
          training_date: string
          training_time?: string | null
          updated_at?: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          id?: string
          player_stats?: Json | null
          score_a?: number | null
          score_b?: number | null
          status?: string | null
          team_a_id?: string | null
          team_b_id?: string | null
          training_date?: string
          training_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          clan_id: string
          created_at: string
          from_team_id: string | null
          id: string
          player_id: string
          to_team_id: string | null
          transfer_date: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          from_team_id?: string | null
          id?: string
          player_id: string
          to_team_id?: string | null
          transfer_date: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          from_team_id?: string | null
          id?: string
          player_id?: string
          to_team_id?: string | null
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          email: string
          game_nick: string
          id: string
          pix_key: string
          status: string | null
          user_id: string
          user_unique_id: string
          username: string
          whatsapp: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          email: string
          game_nick: string
          id?: string
          pix_key: string
          status?: string | null
          user_id: string
          user_unique_id: string
          username: string
          whatsapp?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          game_nick?: string
          id?: string
          pix_key?: string
          status?: string | null
          user_id?: string
          user_unique_id?: string
          username?: string
          whatsapp?: string | null
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
      reset_user_golds: {
        Args: { _clan_id?: string; _exclude_admins?: boolean }
        Returns: number
      }
      spin_roulette: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "user" | "admin" | "superadmin"
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
      app_role: ["user", "admin", "superadmin"],
    },
  },
} as const
