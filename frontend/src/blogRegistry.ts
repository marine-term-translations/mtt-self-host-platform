export interface BlogpostMetadata {
  slug: string;
  title: string;
  summary: string;
  date: string;
  author: string;
  authorRole: string;
  authorAvatar: string;
  category: string;
  readTime: string;
  coverImage?: string;
}

export const blogRegistry: BlogpostMetadata[] = [
  {
    slug: 'lost-in-translation-not-your-marine-data',
    title: 'Lost in Translation? Not Your Marine Data - EMODnet Biology Launches Self-Hosted Marine Term Translation Platform',
    summary: 'EMODnet Biology officially launches its self-hosted, expert-moderated marine term translation platform based on the NERC Vocabulary Server to foster multilingual marine science interoperability.',
    date: 'June 10, 2026',
    author: 'Joanna Goley',
    authorRole: 'VLIZ Project Manager',
    authorAvatar: 'https://ui-avatars.com/api/?name=Joanna+Goley&background=0ea5e9&color=fff',
    category: 'Launch & Technology',
    readTime: '3 min read',
  },
  {
    slug: 'mtt-technical-deepdive',
    title: 'Under the Hood: A Technical Deep Dive into the Marine Term Translations Platform',
    summary: 'An in-depth look at the architecture of the Marine Term Translations platform, exploring the Docker-compose stack, Vite + React frontend, Express.js backend, and SQLite database.',
    date: 'June 9, 2026',
    author: 'Cedric Decruw',
    authorRole: 'Software Engineer',
    authorAvatar: 'https://ui-avatars.com/api/?name=Cedric+Decruw&background=0ea5e9&color=fff',
    category: 'Technology & Engineering',
    readTime: '4 min read',
  }
];
