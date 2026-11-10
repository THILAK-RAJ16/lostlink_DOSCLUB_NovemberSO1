export type ItemType = 'LOST' | 'FOUND';
export type ItemStatus = 'OPEN' | 'CLAIM_PENDING' | 'MATCHED' | 'RETURNED';
export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  is_admin: boolean | number;
  is_suspended?: boolean | number;
  avatar_url?: string;
  google_id?: string | null;
  profile_picture?: string;
  auth_provider?: 'local' | 'google' | 'google_linked';
  email_verified?: boolean | number;
  created_at?: string;
  report_count?: number;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  description?: string;
  item_count?: number;
}

export interface Item {
  id: number;
  user_id: number;
  type: ItemType;
  name: string;
  category: string;
  description: string;
  location: string;
  item_date: string;
  image_url?: string;
  identifying_features?: string;
  identifying_features_hidden?: boolean;
  contact_info?: string;
  status: ItemStatus;
  view_count?: number;
  created_at: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  owner_avatar?: string;
}

export interface Claim {
  id: number;
  item_id: number;
  claimant_id: number;
  proof_description: string;
  proof_attachment?: string;
  status: ClaimStatus;
  reviewer_notes?: string;
  created_at: string;
  resolved_at?: string | null;
  item_name?: string;
  item_category?: string;
  item_location?: string;
  item_image?: string;
  claimant_name?: string;
  claimant_email?: string;
  claimant_phone?: string;
  finder_name?: string;
  finder_email?: string;
  finder_phone?: string;
}

export interface ClaimMessage {
  id: number;
  claim_id: number;
  sender_id: number;
  sender_name?: string;
  sender_avatar?: string;
  message: string;
  created_at: string;
}

export interface MatchScoreBreakdown {
  category: number;
  name: number;
  description: number;
  location: number;
  date: number;
}

export interface Match {
  id: number;
  score: number;
  breakdown: MatchScoreBreakdown;
  match_status: 'SUGGESTED' | 'CONFIRMED' | 'DISMISSED';
  created_at: string;
  lost_id: number;
  lost_name: string;
  lost_cat: string;
  lost_loc: string;
  lost_date: string;
  lost_img?: string;
  lost_status: ItemStatus;
  found_id: number;
  found_name: string;
  found_cat: string;
  found_loc: string;
  found_date: string;
  found_img?: string;
  found_status: ItemStatus;
  finder_name?: string;
  finder_email?: string;
  loser_name?: string;
  loser_email?: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  link: string;
  is_read: number | boolean;
  created_at: string;
}

export interface AdminLog {
  id: number;
  admin_id: number;
  admin_name?: string;
  action: string;
  details: string;
  ip_address?: string;
  created_at: string;
}

export interface SystemStats {
  total_lost: number;
  total_found: number;
  total_returned: number;
  total_users: number;
  total_matches?: number;
  total_claims_approved?: number;
}
