
export type VoucherType = 'VALUE' | 'QUANTITY';

export interface NotificationPreferences {
  voucher_expiry: boolean;
  family_invitation: boolean;
  invitation_response: boolean;
  voucher_new: boolean;
  voucher_transfer: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  voucher_expiry: true,
  family_invitation: true,
  invitation_response: true,
  voucher_new: true,
  voucher_transfer: true,
};

export interface User {
  id: string;
  email: string;
  name: string;
  notifications_enabled?: boolean;
  notification_preferences?: NotificationPreferences;
  push_token?: string;
  language?: string;
  default_currency?: string;
}

export interface Redemption {
  id: string;
  voucher_id: string;
  amount: number;
  timestamp: string;
  user_name: string;
  code_used?: string; // Track which code was used for code pool vouchers
}

export interface FamilyMember {
  id: string;
  email: string;
  name: string;
}

export interface Family {
  id: string;
  name: string;
  user_id: string;
  member_count: number;
  members?: FamilyMember[];
}

export interface CodePoolItem {
  code: string;
  used: boolean;
  used_at?: string;
  used_by?: string;
}

export interface Voucher {
  id: string;
  title: string;
  store: string;
  type: VoucherType;
  initial_amount: number;
  remaining_amount: number;
  currency: string;
  expiry_date?: string | null;
  family_id: string | null;
  image_url?: string | null;
  created_at: string;
  user_id: string;
  code?: string;
  pin?: string;
  website?: string;
  notes?: string;
  category?: string;
  image_url_2?: string | null;
  history?: Redemption[]; // Neu: Verlauf der Einlösungen
  trip_id?: number | null; // Verknüpfung zu einem Ausflug
  code_pool?: CodePoolItem[]; // NEW: Multi-code support for quantity vouchers
  min_order_value?: number | null; // Mindestbestellwert
}

export interface Trip {
  id: number;
  title: string;
  destination: string;
  start_date?: string | null;
  image?: string | null;
  status?: 'draft' | 'published' | 'archived';
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
  metadata?: {
    invite_id?: string;
    family_id?: string;
    [key: string]: any;
  };
}

export interface FamilyInvite {
  id: string;
  family_id: string;
  inviter_id: string;
  invitee_email: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  // Joined data
  family_name?: string;
  inviter_name?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
