
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe, Share2, Anchor, Users, Award, Loader2, Database } from 'lucide-react';
import TermCard from '../components/TermCard';
import { backendApi } from '../services/api';
import { Term, ApiTerm, ApiPublicUser } from '../types';
import { parse } from '@/src/utils/datetime';

const Landing: React.FC = () => {
  const [featuredTerms, setFeaturedTerms] = useState<Term[]>([]);
  const [contributors, setContributors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ldesFeedCount, setLdesFeedCount] = useState<number>(0);

  // Helper to map P-codes to names (simplified version for Landing)
  const getCollectionName = (code: string) => {
    const map: Record<string, string> = {
      'P01': 'BODC Parameter Usage',
      'P02': 'SeaDataNet Parameter Discovery',
      'P03': 'SeaDataNet Agreed Parameter Groups',
      'P04': 'GCMD Science Keywords',
      'P05': 'GCMD Instruments',
      'P06': 'BODC Data Storage Units',
      'P07': 'CF Standard Names',
    };
    return map[code] ? `${code}: ${map[code]}` : code;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [termsResponse, apiUsers, ldesResponse] = await Promise.all([
          backendApi.getTerms(10, 0), // Limit to first 10 for landing page
          backendApi.getUsers(),
          backendApi.getLdesFeeds().catch(() => ({ feeds: [] })) // Gracefully handle LDES fetch failure
        ]);

        // Set LDES feed count
        setLdesFeedCount(ldesResponse.feeds?.length || 0);

        // --- 1. Process Recent Terms ---
        // Sort by updated_at (descending)
        const sortedTerms = [...termsResponse.terms].sort((a, b) => {
            const dateA = parse(a.updated_at || a.created_at).valueOf();
            const dateB = parse(b.updated_at || b.created_at).valueOf();
            return dateB - dateA;
        }).slice(0, 3);

        const mappedTerms: Term[] = sortedTerms.map((apiTerm: ApiTerm) => {
            // Use API-provided labelField and referenceFields (field_role based)
            const labelField = apiTerm.labelField 
              || apiTerm.fields.find(f => f.field_role === 'label');
            const referenceField = apiTerm.referenceFields?.[0]
              || apiTerm.fields.find(f => f.field_role === 'reference');

            // Find first available translation (any language)
            let translationText: string | null = null;
            let translationLang: string | null = null;
            if (referenceField?.translations && referenceField.translations.length > 0) {
              const firstTranslation = referenceField.translations[0];
              translationText = firstTranslation.value;
              translationLang = firstTranslation.language;
            }

            const translations: Record<string, string | null> = {};
            if (translationLang && translationText) {
              translations[translationLang] = translationText;
            }

            const collectionMatch = apiTerm.uri.match(/\/collection\/([^/]+)\//);
            const collectionCode = collectionMatch ? collectionMatch[1] : 'General';
            const collectionName = getCollectionName(collectionCode);

            return {
              id: apiTerm.uri,
              prefLabel: labelField?.original_value || apiTerm.uri.split('/').pop() || 'Unknown Term',
              definition: referenceField?.original_value || 'No definition available.',
              category: collectionName,
              translations: translations,
              contributors: [],
              stats: undefined // Explicitly undefined to hide status bar as requested
            };
          });
        setFeaturedTerms(mappedTerms);

        // --- 2. Process Contributors ---
        // Count activities (translations) per user
        const contributionsMap: Record<string, number> = {};
        termsResponse.terms.forEach(t => {
            t.fields.forEach(f => {
                if (f.translations) {
                    f.translations.forEach(tr => {
                        const user = tr.created_by || 'unknown';
                        contributionsMap[user] = (contributionsMap[user] || 0) + 1;
                    });
                }
            });
        });

        // Map and sort users by reputation (taking top 8)
        const mappedUsers = apiUsers
            .map((u: ApiPublicUser) => {
                let displayName = u.name;
                
                // Prioritize name from extra if available to avoid showing ORCID
                if (u.extra) {
                    try {
                        const extraData = JSON.parse(u.extra);
                        if (extraData.name) {
                            displayName = extraData.name;
                        }
                    } catch (e) {
                        // ignore parsing error
                    }
                }
                const nameToUse = displayName || u.username;
                
                return {
                    id: u.id,
                    name: nameToUse, 
                    username: u.username,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(nameToUse)}&background=0ea5e9&color=fff`,
                    contributions: contributionsMap[u.username] || 0,
                    reputation: u.reputation,
                    role: u.reputation >= 500 ? "Trusted Contributor" : "Contributor"
                };
            })
            .sort((a, b) => b.reputation - a.reputation)
            .slice(0, 8);

        setContributors(mappedUsers);

      } catch (error) {
        console.error("Landing page fetch failed", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex flex-col">
      <style>{`
        @keyframes move-forever {
          0% {
            transform: translate3d(-90px,0,0);
          }
          100% {
            transform: translate3d(85px,0,0);
          }
        }
        .parallax > use {
          animation: move-forever 25s cubic-bezier(.55,.5,.45,.5) infinite;
        }
        .parallax > use:nth-child(1) {
          animation-delay: -2s;
          animation-duration: 7s;
        }
        .parallax > use:nth-child(2) {
          animation-delay: -3s;
          animation-duration: 10s;
        }
        .parallax > use:nth-child(3) {
          animation-delay: -4s;
          animation-duration: 13s;
        }
        .parallax > use:nth-child(4) {
          animation-delay: -5s;
          animation-duration: 20s;
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-marine-900 via-marine-800 to-slate-900 text-white overflow-hidden pb-12 md:pb-0">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 md:pt-32 md:pb-48 relative z-10 text-center md:text-left">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-1.5 rounded-full bg-marine-700/50 border border-marine-500/30 text-marine-100 text-sm font-medium mb-6 backdrop-blur-sm">
                Open Science Initiative
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
                <span className="text-marine-300">Marine Term Translations</span> Project
              </h1>
              <p className="text-lg md:text-xl text-slate-200 mb-8 max-w-lg leading-relaxed">
                Making marine data FAIR by crowdsourcing technical translations for global interoperability.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <Link to="/register" className="px-8 py-4 bg-white text-marine-900 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg flex items-center justify-center gap-2">
                    Sign up to Contribute <ArrowRight size={20} />
                  </Link>
                <Link to="/about" className="px-8 py-4 bg-marine-800/50 border border-marine-600/50 text-white rounded-xl font-semibold hover:bg-marine-800 transition-colors backdrop-blur-sm">
                  What and Why
                </Link>
              </div>
            </div>
            
            <div className="hidden md:grid grid-cols-2 gap-4 opacity-90">
                <div className="space-y-4 translate-y-8">
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                        <Anchor className="text-marine-300 mb-3" size={32} />
                        <h3 className="font-bold text-lg mb-1">Standardized</h3>
                        <p className="text-sm text-slate-300">Based on the NERC Vocabulary Server.</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                        <Globe className="text-teal-300 mb-3" size={32} />
                        <h3 className="font-bold text-lg mb-1">International</h3>
                        <p className="text-sm text-slate-300">Technical translations for global access.</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                        <Share2 className="text-purple-300 mb-3" size={32} />
                        <h3 className="font-bold text-lg mb-1">Interoperable</h3>
                        <p className="text-sm text-slate-300">FAIR data powered by LDES technology.</p>
                    </div>
                    <Link to="/ldes" className="block bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer group">
                        <Database className="text-amber-300 mb-3 group-hover:scale-110 transition-transform" size={32} />
                        <h3 className="font-bold text-lg mb-1">
                          {loading ? (
                            <span className="text-base">Loading...</span>
                          ) : (
                            <span>{ldesFeedCount} LDES Feed{ldesFeedCount !== 1 ? 's' : ''}</span>
                          )}
                        </h3>
                        <p className="text-sm text-slate-300">Published and harvestable data streams.</p>
                    </Link>
                </div>
            </div>
          </div>
        </div>

        {/* Animated Waves */}
        <div className="absolute bottom-0 left-0 w-full h-[10vh] min-h-[80px] z-0">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
            <defs>
              <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
            </defs>
            <g className="parallax">
              <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(255,255,255,0.1)" />
              <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(255,255,255,0.2)" />
              <use xlinkHref="#gentle-wave" x="48" y="5" fill="rgba(255,255,255,0.15)" />
              <use xlinkHref="#gentle-wave" x="48" y="7" className="text-slate-50 dark:text-slate-900 transition-colors duration-200" fill="currentColor" />
            </g>
          </svg>
        </div>
      </section>

      {/* Preview Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Recent Contributions</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Explore terms that have recently been enriched with multilingual technical definitions.
            </p>
          </div>
          
          {loading ? (
             <div className="flex justify-center items-center py-12">
                 <Loader2 size={32} className="animate-spin text-marine-500" />
             </div>
          ) : featuredTerms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredTerms.map(term => (
                <TermCard key={term.id} term={term} />
                ))}
            </div>
          ) : (
             <div className="text-center text-slate-500 italic py-8">
                 No contributions found yet.
             </div>
          )}

          <div className="mt-12 text-center">
            <Link to="/browse" className="inline-flex items-center text-marine-600 dark:text-marine-400 font-semibold hover:underline">
              Browse all terms <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Contributors Section */}
      <section className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-marine-100 dark:bg-marine-900 text-marine-600 dark:text-marine-400 mb-4">
              <Users size={24} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Our Community of Translators</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              The project is powered by marine scientists and language experts from around the world.
            </p>
          </div>

          {loading ? (
             <div className="flex justify-center items-center py-12">
                 <Loader2 size={32} className="animate-spin text-marine-500" />
             </div>
          ) : contributors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                {contributors.map((contributor) => (
                <Link 
                    key={contributor.id} 
                    to={`/user/${contributor.id}`}
                    className="flex items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all hover:border-marine-300 dark:hover:border-marine-600 cursor-pointer"
                >
                    <img 
                    src={contributor.avatar} 
                    alt={contributor.name} 
                    className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-sm mr-4"
                    />
                    <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{contributor.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{contributor.role}</p>
                    <div className="flex items-center text-xs font-medium text-marine-600 dark:text-marine-400">
                        <Award size={12} className="mr-1" /> {contributor.reputation} reputation
                    </div>
                    </div>
                </Link>
                ))}
            </div>
          ) : (
             <div className="text-center text-slate-500 italic">
                 No active contributors yet. Be the first!
             </div>
          )}
          
          <div className="mt-12 text-center">
             <Link to="/leaderboard" className="text-sm font-medium text-slate-500 hover:text-marine-600 dark:hover:text-marine-400 transition-colors">
                View all contributors
             </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
