
import React, { useState, useEffect } from 'react';
import { MOCK_TERMS } from '../mock/terms';
import TermCard from '../components/TermCard';
import { Search, Filter, Loader2, AlertTriangle, Globe } from 'lucide-react';
import { backendApi } from '../services/api';
import { Term, ApiTerm, TermStats } from '../types';
import toast from 'react-hot-toast';

// Collection Map for NERC P-codes
const COLLECTION_MAP: Record<string, string> = {
  'P01': 'BODC Parameter Usage Vocabulary',
  'P02': 'SeaDataNet Parameter Discovery Vocabulary',
  'P03': 'SeaDataNet Agreed Parameter Groups',
  'P04': 'GCMD Science Keywords',
  'P05': 'GCMD Instruments',
  'P06': 'BODC Data Storage Units',
  'P07': 'CF Standard Names',
  'L05': 'SeaDataNet Device Categories',
  'L06': 'SeaDataNet Platform Categories',
  'L22': 'SeaDataNet Model Types'
};

const Browse: React.FC = () => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [needsTransFilter, setNeedsTransFilter] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTerms, setTotalTerms] = useState(0);
  const [pageSize] = useState(50); // Terms per page

  // Fetch Terms Logic
  useEffect(() => {
    const fetchTerms = async () => {
      setLoading(true);
      try {
        console.log("Fetching terms from API...");
        const offset = (currentPage - 1) * pageSize;
        const response = await backendApi.getTerms(pageSize, offset);
        
        // Map API response to UI Term model
        const mappedTerms: Term[] = response.terms.map((apiTerm: ApiTerm) => {
          // Find key fields
          const prefLabelField = apiTerm.fields.find(f => f.field_term === 'skos:prefLabel');
          const definitionField = apiTerm.fields.find(f => f.field_term === 'skos:definition');
          
          // Construct Translations Map & Calculate Stats
          const translations: Record<string, string | null> = {
            en_plain: null,
            es: null,
            fr: null,
            nl: null,
            de: null,
            it: null,
            pt: null,
            ru: null,
            zh: null,
            ja: null
          };

          const stats: TermStats = {
            draft: 0,
            review: 0,
            approved: 0,
            rejected: 0,
            merged: 0
          };

          // Iterate over ALL fields to gather stats
          apiTerm.fields.forEach(field => {
            if (field.translations) {
              field.translations.forEach(t => {
                // Populate legacy translation map (preferring definition translations for display)
                if (field.field_term === 'skos:definition' && t.language) {
                   translations[t.language] = t.value;
                }

                // Aggregate Stats
                if (t.status) {
                  const statusKey = t.status as keyof TermStats;
                  if (stats[statusKey] !== undefined) {
                    stats[statusKey]++;
                  }
                }
              });
            }
          });

          // Extract collection from URI (e.g. .../collection/P02/current/...)
          // Default to 'General' if not found
          const collectionMatch = apiTerm.uri.match(/\/collection\/([^/]+)\//);
          const collectionCode = collectionMatch ? collectionMatch[1] : 'General';
          const collectionName = COLLECTION_MAP[collectionCode] 
             ? `${collectionCode}: ${COLLECTION_MAP[collectionCode]}` 
             : collectionCode;

          // Use URI or fallback to a string ID
          return {
            id: apiTerm.uri,
            prefLabel: prefLabelField?.original_value || 'Unknown Term',
            definition: definitionField?.original_value || 'No definition available.',
            category: collectionName, 
            translations: translations,
            contributors: [], 
            stats: stats
          };
        });

        setTerms(mappedTerms);
        setTotalTerms(response.total);
        setUsingMock(false);
      } catch (error) {
        console.error("Failed to fetch terms from API, using mock data:", error);
        setTerms(MOCK_TERMS);
        setUsingMock(true);
        toast.error("Could not connect to live data. Showing offline/mock data.");
      } finally {
        setLoading(false);
      }
    };

    fetchTerms();
  }, [currentPage, pageSize]); // Re-fetch when page changes

  const categories = ['All', ...Array.from(new Set(terms.map(t => t.category)))];
  const languages = [
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'nl', name: 'Dutch' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
  ];

  const filteredTerms = terms.filter(term => {
    const matchesSearch = term.prefLabel.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          term.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || term.category === filterCategory;
    
    let matchesNeedsTrans = true;
    if (needsTransFilter) {
        // Check if translation for this language is missing or empty
        const trans = term.translations[needsTransFilter];
        matchesNeedsTrans = !trans || trans.trim() === '';
    }
    
    return matchesSearch && matchesCategory && matchesNeedsTrans;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Browse Terms</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Explore and filter the marine vocabulary.</p>
        </div>
        {usingMock && (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
            <AlertTriangle size={14} />
            Offline Mode / Mock Data
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-8 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg leading-5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-marine-500 focus:border-marine-500 sm:text-sm"
            placeholder="Search for a term (e.g., 'Salinity')..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Collection Filter */}
        <div className="relative min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-slate-400" />
          </div>
          <select
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-marine-500 focus:border-marine-500 sm:text-sm"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Language Needs Filter */}
        <div className="relative min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Globe className="h-5 w-5 text-slate-400" />
          </div>
          <select
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-marine-500 focus:border-marine-500 sm:text-sm"
            value={needsTransFilter}
            onChange={(e) => setNeedsTransFilter(e.target.value)}
          >
            <option value="">Any Language Status</option>
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>Needs {lang.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-slate-500">
           <Loader2 size={40} className="animate-spin text-marine-500 mb-4" />
           <p>Loading terms library...</p>
        </div>
      ) : filteredTerms.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredTerms.map(term => (
              <TermCard key={term.id} term={term} />
            ))}
          </div>
          
          {/* Pagination Controls */}
          {!usingMock && totalTerms > pageSize && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalTerms)} of {totalTerms} terms
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(totalTerms / pageSize)) }, (_, i) => {
                    const totalPages = Math.ceil(totalTerms / pageSize);
                    let pageNum: number;
                    
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-marine-500 text-white'
                            : 'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalTerms / pageSize), p + 1))}
                  disabled={currentPage >= Math.ceil(totalTerms / pageSize)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
             <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No terms found</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
};

export default Browse;
