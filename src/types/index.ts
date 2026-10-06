export type UserRole = 'CUSTOMER' | 'BUSINESS_OWNER' | 'BUSINESS_STAFF' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website_url: string | null;
  google_review_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_number: string | null;
  whatsapp_channel_url: string | null;
  youtube_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessStaff {
  id: string;
  business_id: string;
  user_id: string;
  role: 'STAFF' | 'MANAGER';
  created_at: string;
}

export interface BusinessCustomer {
  id: string;
  business_id: string;
  customer_id: string;
  first_visit_at: string;
  last_visit_at: string;
  total_visits: number;
  total_spend: number;
  current_points_balance: number;
  status: 'ACTIVE' | 'BLOCKED';
  created_at: string;
  updated_at: string;
  customer_profile?: CustomerProfile;
}

export interface LoyaltyProgram {
  id: string;
  business_id: string;
  program_name: string;
  program_type: 'VISIT_BASED' | 'POINTS_BASED';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyRule {
  id: string;
  loyalty_program_id: string;
  min_interval_hours: number;
  points_per_visit: number;
  created_at: string;
  updated_at: string;
}

export type RewardType = 'FREE_ITEM' | 'DISCOUNT' | 'GIFT' | 'EXPERIENCE';

export interface Reward {
  id: string;
  business_id: string;
  loyalty_program_id: string | null;
  title: string;
  description: string | null;
  reward_type: RewardType;
  reward_value: string;
  required_visits: number;
  expiry_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type RewardClaimStatus = 'CLAIMED' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';

export interface RewardClaim {
  id: string;
  claim_code: string;
  business_id: string;
  customer_id: string;
  reward_id: string;
  status: RewardClaimStatus;
  claimed_at: string;
  expires_at: string;
  redeemed_at: string | null;
  redeemed_by_staff_id: string | null;
  created_at: string;
  updated_at: string;
  reward?: Reward;
  business?: Business;
}

export interface Visit {
  id: string;
  business_id: string;
  customer_id: string;
  source: 'QR_SCAN' | 'URL' | 'MANUAL_STAFF';
  purchase_amount: number | null;
  verification_status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  qr_code_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Feedback {
  id: string;
  business_id: string;
  customer_id: string | null;
  rating: number;
  comment: string;
  customer_name: string | null;
  customer_contact: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SocialLink {
  id: string;
  business_id: string;
  platform: 'instagram' | 'facebook' | 'whatsapp' | 'whatsapp_channel' | 'youtube' | 'website' | 'google_review';
  url: string;
  display_label: string | null;
  is_active: boolean;
  created_at: string;
}

export interface QRCodeData {
  id: string;
  business_id: string;
  code_identifier: string;
  target_url: string;
  qr_type: 'CHECKIN' | 'REWARD';
  scans_count: number;
  last_scanned_at: string | null;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  business_id: string | null;
  customer_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  business_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
