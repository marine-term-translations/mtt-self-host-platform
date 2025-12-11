

export interface Translation {
  lang: string;
  text: string | null;
  author?: string;
}

export interface TermStats {
  draft: number;
  review: number;
  approved: number;
  rejected: number;
  merged: number;
}

export interface Term {
  id: string;
  prefLabel: string;
  definition: string;
  translations: Record<string, string | null>;
  contributors: string[];
  category: string;
  stats?: TermStats;
}

export interface User {
  id?: number;          // New: integer user ID (preferred)
  user_id?: number;     // Alias for consistency
  username: string;     // Now mutable display name, but still unique
  name: string;
  avatar: string;
  token: string;
  isAdmin?: boolean;
  orcid?: string;       // ORCID iD (still supported)
  reputation?: number;  // User reputation score
}

export interface Stats {
  translatedCount: number;
  contributionRank: number;
}

// API Response Interfaces
export interface ApiTranslation {
  id: number;
  term_field_id: number;
  language: string;
  value: string;
  created_by_id?: number;      // New: user ID who created
  created_by?: string;          // Deprecated: kept for backward compat
  modified_by_id?: number;      // New: user ID who modified
  reviewed_by_id?: number;      // New: user ID who reviewed
  status?: 'draft' | 'review' | 'approved' | 'rejected' | 'merged';
  created_at?: string;
  updated_at?: string;
  modified_at?: string;
}

export interface ApiField {
  id: number;
  term_id: number;
  field_uri: string;
  field_term: string; // e.g. "skos:prefLabel", "skos:definition"
  original_value: string;
  translations: ApiTranslation[];
  created_at?: string;
  updated_at?: string;
}

export interface ApiTerm {
  id: number;
  uri: string;
  created_at: string;
  updated_at: string;
  fields: ApiField[];
}

export interface ApiUserActivity {
  id: number;
  user_id: number;              // New: user ID (replaces user)
  user?: string;                // Deprecated: kept for backward compat
  action: string;
  term_id: number | null;
  term_field_id: number | null;
  translation_id: number | null;
  appeal_id: number | null;
  appeal_message_id: number | null;
  extra: string | null; // JSON string
  created_at: string;
}

export interface ApiPublicUser {
  id: number;            // New: integer user ID
  username: string;
  name?: string;
  reputation: number;
  joined_at: string;
  extra: string | null;
}

export interface ApiAuthProvider {
  id: number;
  user_id: number;
  provider: string;      // 'orcid', 'github', 'google', 'email', etc.
  provider_id: string;   // Provider-specific user ID
  email?: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiAppealMessage {
  id: number;
  appeal_id: number;
  author_id: number;        // New: user ID (replaces author)
  author?: string;          // Deprecated: kept for backward compat
  message: string;
  created_at: string;
}

export interface ApiAppeal {
  id: number;
  translation_id: number;
  opened_by_id: number;     // New: user ID (replaces opened_by)
  opened_by?: string;       // Deprecated: kept for backward compat
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed' | 'resolved';
  resolution: string | null; // Initial reason
  messages?: ApiAppealMessage[]; // Optional: populated via join or separate call
}