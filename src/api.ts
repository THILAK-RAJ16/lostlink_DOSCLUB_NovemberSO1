import { User, Item, Claim, ClaimMessage, Match, Category, NotificationItem, SystemStats } from './types';

const TOKEN_KEY = 'lostlink_auth_token';
const USER_KEY = 'lostlink_auth_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Network request failed');
  }
  return data as T;
}

export const api = {
  // Stats & Categories
  getStats: () => request<SystemStats>('/api/stats'),
  getCategories: () => request<{ categories: Category[] }>('/api/categories'),

  // Auth
  register: (payload: { name: string; email: string; phone: string; password: string }) =>
    request<{ success: boolean; user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ success: boolean; user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getGoogleAuthUrl: () =>
    request<{ url: string; state: string; redirectUri: string; clientId: string }>('/api/auth/google/url'),

  verifyGoogleAuth: (payload: {
    google_id?: string;
    email?: string;
    name?: string;
    profile_picture?: string;
    email_verified?: boolean;
    idToken?: string;
  }) =>
    request<{ success: boolean; user: User; token: string; is_new?: boolean; linked?: boolean }>(
      '/api/auth/google/verify',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  demoGoogleAuth: (persona: 'new_user' | 'existing_asha' | 'existing_ravi') =>
    request<{ success: boolean; user: User; token: string; is_new?: boolean; linked?: boolean }>(
      '/api/auth/google/demo',
      {
        method: 'POST',
        body: JSON.stringify({ persona }),
      }
    ),

  getCurrentUser: () => request<{ success: boolean; user: User }>('/api/auth/me'),

  updateProfile: (payload: { name: string; phone: string; avatar_url?: string }) =>
    request<{ success: boolean; user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Upload
  uploadImage: (base64Data: string, filename = 'item.jpg') =>
    request<{ success: boolean; url: string }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ data: base64Data, filename }),
    }),

  // Items
  getItems: (params: {
    q?: string;
    category?: string;
    location?: string;
    item_date?: string;
    type?: string;
    status?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.category) query.append('category', params.category);
    if (params.location) query.append('location', params.location);
    if (params.item_date) query.append('item_date', params.item_date);
    if (params.type) query.append('type', params.type);
    if (params.status) query.append('status', params.status);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    return request<{ items: Item[]; total: number; page: number; pages: number; limit: number }>(
      `/api/items?${query.toString()}`
    );
  },

  getItem: (id: number) => request<{ item: Item }>(`/api/items/${id}`),

  createItem: (payload: {
    type: 'LOST' | 'FOUND';
    name: string;
    category: string;
    description: string;
    location: string;
    item_date: string;
    image_url?: string;
    identifying_features?: string;
    contact_info?: string;
  }) =>
    request<{ item: Item }>('/api/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateItem: (id: number, payload: Partial<Item>) =>
    request<{ item: Item }>(`/api/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteItem: (id: number) =>
    request<{ success: boolean; message: string }>(`/api/items/${id}`, {
      method: 'DELETE',
    }),

  // Matches
  getMatches: () => request<{ matches: Match[] }>('/api/matches'),

  updateMatchStatus: (matchId: number, status: 'CONFIRMED' | 'DISMISSED') =>
    request<{ success: boolean }>(`/api/matches/${matchId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  // Claims
  createClaim: (payload: { item_id: number; proof_description: string; proof_attachment?: string }) =>
    request<{ success: boolean; claim_id: number }>('/api/claims', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getClaims: () => request<{ incoming: Claim[]; outgoing: Claim[] }>('/api/claims'),

  decideClaim: (claimId: number, action: 'APPROVE' | 'REJECT', reviewer_notes?: string) =>
    request<{ success: boolean; status: string }>(`/api/claims/${claimId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ action, reviewer_notes }),
    }),

  getClaimMessages: (claimId: number) =>
    request<{ messages: ClaimMessage[] }>(`/api/claims/${claimId}/messages`),

  sendClaimMessage: (claimId: number, message: string) =>
    request<{ success: boolean }>(`/api/claims/${claimId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Notifications
  getNotifications: () => request<{ notifications: NotificationItem[]; unread_count: number }>('/api/notifications'),
  markNotificationsRead: () => request<{ success: boolean }>('/api/notifications/read', { method: 'POST' }),

  // Admin
  getAdminData: () =>
    request<{
      users: User[];
      items: Item[];
      categories: Category[];
      logs: any[];
      stats: SystemStats;
    }>('/api/admin/data'),

  toggleSuspendUser: (targetUserId: number) =>
    request<{ success: boolean; is_suspended: number }>(`/api/admin/users/${targetUserId}/suspend`, {
      method: 'POST',
    }),

  addCategory: (name: string, icon = '📦') =>
    request<{ success: boolean }>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ name, icon }),
    }),

  deleteCategory: (catId: number) =>
    request<{ success: boolean }>(`/api/admin/categories/${catId}`, {
      method: 'DELETE',
    }),
};
