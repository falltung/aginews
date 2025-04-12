export interface Subscriber {
  id?: number;
  email: string;
  name?: string | null;
  is_active?: boolean;
  subscribed_at?: string;
  unsubscribed_at?: string | null;
  created_at?: string;
  updated_at?: string;
} 