
export interface Translation {
  lang: string;
  text: string | null;
  author?: string;
}

export interface Term {
  id: string;
  prefLabel: string;
  definition: string;
  translations: Record<string, string | null>;
  contributors: string[];
  category: string;
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
  field_id: number;
  language_code: string;
  translation_value: string;
  author_name?: string;
}

export interface ApiField {
  id: number;
  term_id: number;
  field_uri: string;
  field_term: string; // e.g. "skos:prefLabel", "skos:definition"
  original_value: string;
  translations: ApiTranslation[];
}

export interface ApiTerm {
  id: number;
  uri: string;
  created_at: string;
  updated_at: string;
  fields: ApiField[];
}
