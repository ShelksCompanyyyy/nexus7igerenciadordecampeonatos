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
      clan_members: {
        Row: {
          clan_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["clan_role"]
          user_id: string
        }
        Insert: {
          clan_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["clan_role"]
          user_id: string
        }
        Update: {
          clan_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["clan_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_members_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clans: {
        Row: {
          admin_code: string | null
          allow_line_leaders_create_cw: boolean
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
          allow_line_leaders_create_cw?: boolean
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
          allow_line_leaders_create_cw?: boolean
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
      deposits: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          notes: string | null
          pix_key: string | null
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          pix_key?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          pix_key?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
      friend_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: Database["public"]["Enums"]["friend_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: Database["public"]["Enums"]["friend_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: Database["public"]["Enums"]["friend_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lucky_audit: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          ip_hash: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          ip_hash?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          ip_hash?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lucky_boosts: {
        Row: {
          boost_type: string
          created_at: string
          expires_at: string
          id: string
          multiplier: number
          user_id: string
        }
        Insert: {
          boost_type: string
          created_at?: string
          expires_at: string
          id?: string
          multiplier?: number
          user_id: string
        }
        Update: {
          boost_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          multiplier?: number
          user_id?: string
        }
        Relationships: []
      }
      lucky_inventory: {
        Row: {
          acquired_at: string
          id: string
          item_label: string
          item_type: string
          metadata: Json
          opened: boolean
          opened_at: string | null
          rarity: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          id?: string
          item_label: string
          item_type: string
          metadata?: Json
          opened?: boolean
          opened_at?: string | null
          rarity?: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          id?: string
          item_label?: string
          item_type?: string
          metadata?: Json
          opened?: boolean
          opened_at?: string | null
          rarity?: string
          user_id?: string
        }
        Relationships: []
      }
      lucky_rate_limit: {
        Row: {
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      lucky_rewards: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          metadata: Json
          probability: number
          rarity: string
          type: string
          value_max: number
          value_min: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          metadata?: Json
          probability?: number
          rarity?: string
          type: string
          value_max?: number
          value_min?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          metadata?: Json
          probability?: number
          rarity?: string
          type?: string
          value_max?: number
          value_min?: number
        }
        Relationships: []
      }
      lucky_spins: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          rarity: string
          reward_code: string
          reward_label: string
          reward_type: string
          reward_value: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          rarity?: string
          reward_code: string
          reward_label: string
          reward_type: string
          reward_value?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          rarity?: string
          reward_code?: string
          reward_label?: string
          reward_type?: string
          reward_value?: number
          user_id?: string
        }
        Relationships: []
      }
      lucky_tickets: {
        Row: {
          acquired_at: string
          id: string
          used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          acquired_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          acquired_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lucky_vips: {
        Row: {
          created_at: string
          days: number
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days: number
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days?: number
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      matchcw: {
        Row: {
          bet_amount: number | null
          bet_status: string | null
          clan_a_id: string
          clan_b_id: string | null
          created_at: string
          id: string
          is_bet_match: boolean
          line_a_confirmed: boolean | null
          line_a_id: string | null
          line_b_confirmed: boolean | null
          line_b_id: string | null
          notes: string | null
          proposed_date: string | null
          proposed_rounds: number | null
          proposed_time: string | null
          requested_by: string
          rounds: number | null
          scheduled_date: string | null
          scheduled_time: string | null
          score_a: number | null
          score_b: number | null
          status: string
          updated_at: string
          winner_clan_id: string | null
        }
        Insert: {
          bet_amount?: number | null
          bet_status?: string | null
          clan_a_id: string
          clan_b_id?: string | null
          created_at?: string
          id?: string
          is_bet_match?: boolean
          line_a_confirmed?: boolean | null
          line_a_id?: string | null
          line_b_confirmed?: boolean | null
          line_b_id?: string | null
          notes?: string | null
          proposed_date?: string | null
          proposed_rounds?: number | null
          proposed_time?: string | null
          requested_by: string
          rounds?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          score_a?: number | null
          score_b?: number | null
          status?: string
          updated_at?: string
          winner_clan_id?: string | null
        }
        Update: {
          bet_amount?: number | null
          bet_status?: string | null
          clan_a_id?: string
          clan_b_id?: string | null
          created_at?: string
          id?: string
          is_bet_match?: boolean
          line_a_confirmed?: boolean | null
          line_a_id?: string | null
          line_b_confirmed?: boolean | null
          line_b_id?: string | null
          notes?: string | null
          proposed_date?: string | null
          proposed_rounds?: number | null
          proposed_time?: string | null
          requested_by?: string
          rounds?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          score_a?: number | null
          score_b?: number | null
          status?: string
          updated_at?: string
          winner_clan_id?: string | null
        }
        Relationships: []
      }
      matchcw_bets: {
        Row: {
          amount: number
          clan_id: string
          created_at: string
          id: string
          matchcw_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          clan_id: string
          created_at?: string
          id?: string
          matchcw_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          clan_id?: string
          created_at?: string
          id?: string
          matchcw_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchcw_bets_matchcw_id_fkey"
            columns: ["matchcw_id"]
            isOneToOne: false
            referencedRelation: "matchcw"
            referencedColumns: ["id"]
          },
        ]
      }
      matchcw_messages: {
        Row: {
          clan_id: string
          created_at: string
          id: string
          matchcw_id: string
          message: string
          user_id: string
          username: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          id?: string
          matchcw_id: string
          message: string
          user_id: string
          username: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          id?: string
          matchcw_id?: string
          message?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchcw_messages_matchcw_id_fkey"
            columns: ["matchcw_id"]
            isOneToOne: false
            referencedRelation: "matchcw"
            referencedColumns: ["id"]
          },
        ]
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
      mp_payments: {
        Row: {
          amount_brl: number
          approved_at: string | null
          bonus_spins: number
          created_at: string
          expires_at: string | null
          id: string
          mp_payment_id: string | null
          qr_code: string | null
          qr_code_base64: string | null
          spins: number
          status: string
          ticket_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_brl: number
          approved_at?: string | null
          bonus_spins?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          mp_payment_id?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          spins: number
          status?: string
          ticket_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_brl?: number
          approved_at?: string | null
          bonus_spins?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          mp_payment_id?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          spins?: number
          status?: string
          ticket_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mp_payouts: {
        Row: {
          amount_brl: number
          beneficiary_name: string
          created_at: string
          failure_reason: string | null
          id: string
          mp_transfer_id: string | null
          pix_key: string
          pix_key_type: string
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_brl: number
          beneficiary_name: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          mp_transfer_id?: string | null
          pix_key: string
          pix_key_type?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_brl?: number
          beneficiary_name?: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          mp_transfer_id?: string | null
          pix_key?: string
          pix_key_type?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      password_reset_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
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
      promo_code_redemptions: {
        Row: {
          id: string
          promo_code_id: string
          redeemed_at: string
          reward: number
          user_id: string
        }
        Insert: {
          id?: string
          promo_code_id: string
          redeemed_at?: string
          reward: number
          user_id: string
        }
        Update: {
          id?: string
          promo_code_id?: string
          redeemed_at?: string
          reward?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          free_spins: number
          id: string
          is_active: boolean
          max_uses: number | null
          reward: number
          reward_type: string
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          free_spins?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reward?: number
          reward_type?: string
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          free_spins?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reward?: number
          reward_type?: string
          uses?: number
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_staff: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_staff?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_staff?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
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
          team_co_leader_id: string | null
          team_leader_id: string | null
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
          team_co_leader_id?: string | null
          team_leader_id?: string | null
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
          team_co_leader_id?: string | null
          team_leader_id?: string | null
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
      tournament_matches: {
        Row: {
          created_at: string
          id: string
          round: number
          scheduled_at: string | null
          score_a: number | null
          score_b: number | null
          slot: number
          status: string
          team_a_id: string | null
          team_b_id: string | null
          tournament_id: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          round?: number
          scheduled_at?: string | null
          score_a?: number | null
          score_b?: number | null
          slot?: number
          status?: string
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          round?: number
          scheduled_at?: string | null
          score_a?: number | null
          score_b?: number | null
          slot?: number
          status?: string
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_id?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_teams: {
        Row: {
          created_at: string
          draws: number
          eliminated: boolean
          goals_against: number
          goals_for: number
          id: string
          losses: number
          points: number
          seed: number | null
          team_id: string
          tournament_id: string
          wins: number
        }
        Insert: {
          created_at?: string
          draws?: number
          eliminated?: boolean
          goals_against?: number
          goals_for?: number
          id?: string
          losses?: number
          points?: number
          seed?: number | null
          team_id: string
          tournament_id: string
          wins?: number
        }
        Update: {
          created_at?: string
          draws?: number
          eliminated?: boolean
          goals_against?: number
          goals_for?: number
          id?: string
          losses?: number
          points?: number
          seed?: number | null
          team_id?: string
          tournament_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          clan_id: string
          created_at: string
          created_by: string
          current_round: number
          description: string | null
          format: string
          id: string
          name: string
          prize_description: string | null
          prize_gold: number
          size: number
          status: string
          updated_at: string
          winner_team_id: string | null
        }
        Insert: {
          clan_id: string
          created_at?: string
          created_by: string
          current_round?: number
          description?: string | null
          format?: string
          id?: string
          name: string
          prize_description?: string | null
          prize_gold?: number
          size?: number
          status?: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Update: {
          clan_id?: string
          created_at?: string
          created_by?: string
          current_round?: number
          description?: string | null
          format?: string
          id?: string
          name?: string
          prize_description?: string | null
          prize_gold?: number
          size?: number
          status?: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Relationships: []
      }
      trainings: {
        Row: {
          clan_id: string
          created_at: string
          id: string
          participant_names: string[] | null
          photo_url: string | null
          player_stats: Json | null
          score_a: number | null
          score_b: number | null
          status: string | null
          team_a_id: string | null
          team_b_id: string | null
          title: string | null
          training_date: string
          training_time: string | null
          updated_at: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          id?: string
          participant_names?: string[] | null
          photo_url?: string | null
          player_stats?: Json | null
          score_a?: number | null
          score_b?: number | null
          status?: string | null
          team_a_id?: string | null
          team_b_id?: string | null
          title?: string | null
          training_date: string
          training_time?: string | null
          updated_at?: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          id?: string
          participant_names?: string[] | null
          photo_url?: string | null
          player_stats?: Json | null
          score_a?: number | null
          score_b?: number | null
          status?: string | null
          team_a_id?: string | null
          team_b_id?: string | null
          title?: string | null
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
      user_inventory: {
        Row: {
          acquired_at: string
          id: string
          item_category: string
          item_id: string
          item_name: string | null
          user_id: string
        }
        Insert: {
          acquired_at?: string
          id?: string
          item_category: string
          item_id: string
          item_name?: string | null
          user_id: string
        }
        Update: {
          acquired_at?: string
          id?: string
          item_category?: string
          item_id?: string
          item_name?: string | null
          user_id?: string
        }
        Relationships: []
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
      wallet: {
        Row: {
          balance_brl: number
          created_at: string
          id: string
          total_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_brl?: number
          created_at?: string
          id?: string
          total_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_brl?: number
          created_at?: string
          id?: string
          total_earned?: number
          updated_at?: string
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
      admin_delete_user: { Args: { _target_user: string }; Returns: Json }
      announce_purchase: {
        Args: { _category: string; _item_name: string }
        Returns: Json
      }
      approve_deposit: {
        Args: { _approve: boolean; _deposit_id: string }
        Returns: Json
      }
      cancel_matchcw: { Args: { _match_id: string }; Returns: Json }
      confirm_matchcw: {
        Args: {
          _date: string
          _match_id: string
          _rounds?: number
          _time: string
        }
        Returns: Json
      }
      confirm_paid_payout: {
        Args: { _mp_transfer_id: string; _payout_id: string }
        Returns: Json
      }
      create_tournament: {
        Args: {
          _clan_id: string
          _description: string
          _format: string
          _name: string
          _prize_description: string
          _prize_gold: number
          _size: number
        }
        Returns: Json
      }
      credit_spins_after_payment: {
        Args: { _payment_id: string }
        Returns: Json
      }
      finalize_matchcw: {
        Args: {
          _match_id: string
          _score_a: number
          _score_b: number
          _winner_clan: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_clan_admin: {
        Args: { _clan_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_leader: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_leader_or_co: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      lucky_nexel_spin: { Args: never; Returns: Json }
      lucky_open_box: { Args: { _inv_id: string }; Returns: Json }
      manage_team_player: {
        Args: { _action: string; _target_user: string; _team_id: string }
        Returns: Json
      }
      promote_clan_member: {
        Args: {
          _clan_id: string
          _new_role: Database["public"]["Enums"]["clan_role"]
          _target_user: string
        }
        Returns: Json
      }
      redeem_promo_code: { Args: { _code: string }; Returns: Json }
      refund_failed_payout: {
        Args: { _payout_id: string; _reason: string }
        Returns: Json
      }
      report_tournament_match: {
        Args: { _match_id: string; _score_a: number; _score_b: number }
        Returns: Json
      }
      request_matchcw:
        | {
            Args: {
              _bet_amount?: number
              _clan_a: string
              _clan_b?: string
              _date?: string
              _is_bet?: boolean
              _notes?: string
              _rounds?: number
              _time?: string
            }
            Returns: Json
          }
        | {
            Args: {
              _bet_amount?: number
              _clan_a: string
              _clan_b?: string
              _date?: string
              _is_bet?: boolean
              _line_a?: string
              _notes?: string
              _rounds?: number
              _time?: string
            }
            Returns: Json
          }
      request_pix_withdrawal: {
        Args: {
          _amount: number
          _beneficiary_name: string
          _pix_key: string
          _pix_key_type: string
        }
        Returns: Json
      }
      reset_user_golds:
        | {
            Args: { _clan_id?: string; _exclude_admins?: boolean }
            Returns: number
          }
        | {
            Args: {
              _clan_id?: string
              _exclude_admins?: boolean
              _user_id?: string
            }
            Returns: number
          }
      respond_matchcw: {
        Args: { _accept: boolean; _match_id: string }
        Returns: Json
      }
      set_clan_cw_permission: {
        Args: { _allow: boolean; _clan_id: string }
        Returns: Json
      }
      set_matchcw_line: {
        Args: { _line_id: string; _match_id: string }
        Returns: Json
      }
      set_team_role: {
        Args: { _role: string; _target_user: string; _team_id: string }
        Returns: Json
      }
      spin_roulette: { Args: never; Returns: Json }
      start_tournament: { Args: { _tournament_id: string }; Returns: Json }
      update_player_stats: {
        Args: {
          _assists: number
          _deaths: number
          _kills: number
          _mvps: number
          _target_user: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "user" | "admin" | "superadmin"
      clan_role: "leader" | "co_leader" | "member"
      friend_status: "pending" | "accepted" | "blocked"
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
      clan_role: ["leader", "co_leader", "member"],
      friend_status: ["pending", "accepted", "blocked"],
    },
  },
} as const
