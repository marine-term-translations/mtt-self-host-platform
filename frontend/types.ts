

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
  username: string;
  name: string;
  avatar: string;
  token: string;
  isAdmin?: boolean;
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
  created_by?: string;
  status?: 'draft' | 'review' | 'approved' | 'rejected' | 'merged';
  created_at?: string;
  updated_at?: string;
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
  user: string;
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
  username: string;
  name?: string;
  reputation: number;
  joined_at: string;
  extra: string | null;
}

export interface ApiAppealMessage {
  id: number;
  appeal_id: number;
  author: string;
  message: string;
  created_at: string;
}

export interface ApiAppeal {
  id: number;
  translation_id: number;
  opened_by: string;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed' | 'resolved';
  resolution: string | null; // Initial reason
  messages?: ApiAppealMessage[]; // Optional: populated via join or separate call
}