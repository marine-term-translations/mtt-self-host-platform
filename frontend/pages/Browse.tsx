import React, { useState, useEffect, useCallback } from 'react';
import { MOCK_TERMS } from '../mock/terms';
import TermCard from '../components/TermCard';
import { Search, Filter, Loader2, AlertTriangle, Globe, X } from 'lucide-react';
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
  const [useFallback, setUseFallback] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // Actual search query sent to API
  
  // Facet filters
  const [languageFilter, setLanguageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Facet data from API
  const [facets, setFacets] = useState<{
    language?: Record<string, number>;
    status?: Record<string, number>;
  }>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTerms, setTotalTerms] = useState(0);
  const [pageSize] = useState(20); // Terms per page

  // Fetch Terms Logic using /api/browse
  const fetchTerms = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Fetching terms from /api/browse...");
      const offset = (currentPage - 1) * pageSize;
      
      interface BrowseParams {
        limit: number;
        offset: number;
        facets: string[];
        query?: string;
        language?: string;
        status?: string;
      }
      
      const params: BrowseParams = {
        limit: pageSize,
        offset,
        facets: ['language', 'status']
      };
      
      if (searchQuery) params.query = searchQuery;
      if (languageFilter) params.language = languageFilter;
      if (statusFilter) params.status = statusFilter;
      
      const response = await backendApi.browse(params);
      
      // Store facets
      setFacets(response.facets || {});
      
      interface BrowseResult {
        uri: string;
        field_term?: string;
        original_value?: string;
        translations: Array<{
          language: string;
          value: string;
          status: string;
        }>;
      }
      
      // Map browse results to Term format
      const mappedTerms: Term[] = response.results.map((result: BrowseResult) => {
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

        if (result.translations) {
          result.translations.forEach((t) => {
            if (t.language && t.value) {
              translations[t.language] = t.value;
            }
            if (t.status) {
              const statusKey = t.status as keyof TermStats;
              if (stats[statusKey] !== undefined) {
                stats[statusKey]++;
              }
            }
          });
        }

        const collectionMatch = result.uri?.match(/\/collection\/([^/]+)\//);
        const collectionCode = collectionMatch ? collectionMatch[1] : 'General';
        const collectionName = COLLECTION_MAP[collectionCode] 
           ? `${collectionCode}: ${COLLECTION_MAP[collectionCode]}` 
           : collectionCode;

        return {
          id: result.uri || 'unknown',
          prefLabel: result.original_value || result.uri?.split('/').pop() || 'Unknown Term',
          definition: result.original_value || 'No definition available.',
          category: collectionName, 
          translations: translations,
          contributors: [], 
          stats: stats
        };
      });

      setTerms(mappedTerms);
      setTotalTerms(response.total);
      setUsingMock(false);
      setUseFallback(false);
    } catch (error) {
      console.error("Failed to fetch from /api/browse:", error);
      toast.error("Using fallback mode - advanced search unavailable");
      setUseFallback(true);
      
      // Fallback to old API
      try {
        const offset = (currentPage - 1) * pageSize;
        const response = await backendApi.getTerms(pageSize, offset);
        
        const mappedTerms: Term[] = response.terms.map((apiTerm: ApiTerm) => {
          // Use field_role to find label and reference fields, with fallback to SKOS
          const labelField = apiTerm.fields.find(f => f.field_role === 'label') 
            || apiTerm.fields.find(f => f.field_term === 'skos:prefLabel');
          const refField = apiTerm.fields.find(f => f.field_role === 'reference')
            || apiTerm.fields.find(f => f.field_term === 'skos:definition');
          
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

          apiTerm.fields.forEach(field => {
            if (field.translations) {
              field.translations.forEach(t => {
                // Use reference field for translations display
                if ((field.field_role === 'reference' || field.field_term === 'skos:definition') && t.language) {
                   translations[t.language] = t.value;
                }
                if (t.status) {
                  const statusKey = t.status as keyof TermStats;
                  if (stats[statusKey] !== undefined) {
                    stats[statusKey]++;
                  }
                }
              });
            }
          });

          const collectionMatch = apiTerm.uri.match(/\/collection\/([^/]+)\//);
          const collectionCode = collectionMatch ? collectionMatch[1] : 'General';
          const collectionName = COLLECTION_MAP[collectionCode] 
             ? `${collectionCode}: ${COLLECTION_MAP[collectionCode]}` 
             : collectionCode;

          // Use label field for prefLabel, fallback to URI
          const prefLabel = labelField?.original_value || apiTerm.uri.split('/').pop() || 'Unknown Term';
          // Use reference field for definition, fallback to prefLabel
          const definition = refField?.original_value || prefLabel;

          return {
            id: apiTerm.uri,
            prefLabel: prefLabel,
            definition: definition,
            category: collectionName, 
            translations: translations,
            contributors: [], 
            stats: stats
          };
        });

        setTerms(mappedTerms);
        setTotalTerms(response.total);
        setUsingMock(false);
      } catch (fallbackError) {
        console.error("Fallback also failed, using mock data:", fallbackError);
        setTerms(MOCK_TERMS);
        setUsingMock(true);
        toast.error("Could not connect to live data. Showing offline/mock data.");
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, languageFilter, statusFilter]);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchTerm);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Handle filter changes
  const handleLanguageFilter = (lang: string) => {
    setLanguageFilter(lang === languageFilter ? '' : lang);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status === statusFilter ? '' : status);
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSearchQuery('');
    setLanguageFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const languages = [
    { code: 'nl', name: 'Dutch' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
  ];

  const statuses = [
    { code: 'draft', name: 'Draft' },
    { code: 'review', name: 'Review' },
    { code: 'approved', name: 'Approved' },
    { code: 'rejected', name: 'Rejected' },
    { code: 'merged', name: 'Merged' },
  ];

  const hasActiveFilters = searchQuery || languageFilter || statusFilter;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Browse Terms</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {useFallback ? 'Basic browsing mode - search unavailable' : 'Search and filter the marine vocabulary'}
          </p>
        </div>
        {(usingMock || useFallback) && (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
            <AlertTriangle size={14} />
            {usingMock ? 'Offline Mode / Mock Data' : 'Fallback Mode'}
          </div>
        )}
      </div>

      {/* Search Bar */}
      {!useFallback && (
        <form onSubmit={handleSearch} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-24 py-3 border border-slate-300 dark:border-slate-600 rounded-lg leading-5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-marine-500 focus:border-marine-500 sm:text-sm"
              placeholder="Search terms, definitions, or translations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-marine-500 text-white rounded-md hover:bg-marine-600 transition-colors text-sm font-medium"
            >
              Search
            </button>
          </div>
        </form>
      )}

      {/* Active Filters & Facets */}
      {!useFallback && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Language Facet */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Language</h3>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {languages.map(lang => {
                const count = facets.language?.[lang.code] || 0;
                const isActive = languageFilter === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageFilter(lang.code)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between transition-colors ${
                      isActive
                        ? 'bg-marine-100 dark:bg-marine-900/30 text-marine-700 dark:text-marine-400 font-medium'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>{lang.name}</span>
                    <span className="text-xs">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Facet */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Status</h3>
            </div>
            <div className="space-y-1">
              {statuses.map(status => {
                const count = facets.status?.[status.code] || 0;
                const isActive = statusFilter === status.code;
                return (
                  <button
                    key={status.code}
                    onClick={() => handleStatusFilter(status.code)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between transition-colors ${
                      isActive
                        ? 'bg-marine-100 dark:bg-marine-900/30 text-marine-700 dark:text-marine-400 font-medium'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>{status.name}</span>
                    <span className="text-xs">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filters Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Active Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-marine-600 dark:text-marine-400 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="space-y-2">
              {searchQuery && (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-sm">
                  <Search className="h-3 w-3" />
                  <span className="flex-1 truncate">{searchQuery}</span>
                  <button onClick={() => { setSearchTerm(''); setSearchQuery(''); }} className="hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {languageFilter && (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-sm">
                  <Globe className="h-3 w-3" />
                  <span className="flex-1">{languages.find(l => l.code === languageFilter)?.name}</span>
                  <button onClick={() => setLanguageFilter('')} className="hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {statusFilter && (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-sm">
                  <Filter className="h-3 w-3" />
                  <span className="flex-1">{statuses.find(s => s.code === statusFilter)?.name}</span>
                  <button onClick={() => setStatusFilter('')} className="hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {!hasActiveFilters && (
                <p className="text-xs text-slate-500 dark:text-slate-400">No filters applied</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-slate-500">
           <Loader2 size={40} className="animate-spin text-marine-500 mb-4" />
           <p>Loading terms library...</p>
        </div>
      ) : terms.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {terms.map(term => (
              <TermCard key={term.id} term={term} />
            ))}
          </div>
          
          {/* Pagination Controls */}
          {totalTerms > pageSize && (
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
                  {(() => {
                    const totalPages = Math.ceil(totalTerms / pageSize);
                    const numPagesToShow = Math.min(5, totalPages);
                    
                    return Array.from({ length: numPagesToShow }, (_, i) => {
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
                    });
                  })()}
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
