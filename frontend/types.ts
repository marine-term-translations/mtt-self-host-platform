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