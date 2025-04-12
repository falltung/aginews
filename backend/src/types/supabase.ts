export type Database = {
  public: {
    Tables: {
      sources: {
        Row: {
          id: number
          name: string
          url: string
          type: string
          is_active: boolean
          created_at: string
          updated_at: string
          identifier: string
        }
        Insert: {
          id?: number
          name: string
          url: string
          type: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          identifier: string
        }
        Update: {
          id?: number
          name?: string
          url?: string
          type?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          identifier?: string
        }
      }
      stories: {
        Row: {
          id: number
          title: string
          url: string
          source_id: number
          created_at: string
          updated_at: string
          content: string
          summary: string
        }
        Insert: {
          id?: number
          title: string
          url: string
          source_id: number
          created_at?: string
          updated_at?: string
          content: string
          summary: string
        }
        Update: {
          id?: number
          title?: string
          url?: string
          source_id?: number
          created_at?: string
          updated_at?: string
          content?: string
          summary?: string
        }
      }
      subscribers: {
        Row: {
          id: number
          email: string
          name: string | null
          is_active: boolean
          subscribed_at: string
          unsubscribed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          email: string
          name?: string | null
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          email?: string
          name?: string | null
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      newsletters: {
        Row: {
          id: number
          content: string
          created_at: string
          sent_at: string | null
        }
        Insert: {
          id?: number
          content: string
          created_at?: string
          sent_at?: string | null
        }
        Update: {
          id?: number
          content?: string
          created_at?: string
          sent_at?: string | null
        }
      }
    }
  }
} 