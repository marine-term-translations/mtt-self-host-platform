
import React, { useEffect, useState } from 'react';
import { Database, FileText, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { backendApi } from '../services/api';

interface Fragment {
  name: string;
  url: string;
}

interface LdesFeed {
  sourceId: string;
  latestUrl: string;
  fragmentCount: number;
  fragments: Fragment[];
}

const LdesFeeds: React.FC = () => {
  const [feeds, setFeeds] = useState<LdesFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFeeds, setExpandedFeeds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await backendApi.getLdesFeeds();
        setFeeds(response.feeds || []);
      } catch (err) {
        console.error('Error fetching LDES feeds:', err);
        setError('Failed to load LDES feeds. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeeds();
  }, []);

  const toggleFeed = (sourceId: string) => {
    setExpandedFeeds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId);
      } else {
        newSet.add(sourceId);
      }
      return newSet;
    });
  };

  const getFullUrl = (path: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    // Remove trailing /api if present to get the base URL
    const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
    return `${baseUrl}${path}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-marine-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-8 h-8 text-marine-500" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            LDES Feeds
          </h1>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          Browse and access all Linked Data Event Streams (LDES) feeds published from this platform.
          Each feed contains translations that have been reviewed and approved.
        </p>
      </div>

      {/* No feeds message */}
      {feeds.length === 0 && (
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
          <Database className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No LDES Feeds Available
          </h3>
          <p className="text-slate-600 dark:text-slate-300">
            LDES feeds will appear here once translations are reviewed and published.
          </p>
        </div>
      )}

      {/* Feeds list */}
      <div className="space-y-4">
        {feeds.map((feed) => {
          const isExpanded = expandedFeeds.has(feed.sourceId);
          return (
            <div
              key={feed.sourceId}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
            >
              {/* Feed header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Source {feed.sourceId}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {feed.fragmentCount} fragment{feed.fragmentCount !== 1 ? 's' : ''} available
                    </p>
                  </div>
                </div>

                {/* Latest.ttl link */}
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-marine-500" />
                  <a
                    href={getFullUrl(feed.latestUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-marine-600 dark:text-marine-400 hover:underline font-medium flex items-center gap-1"
                  >
                    latest.ttl
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    (Latest version)
                  </span>
                </div>

                {/* Show all fragments button */}
                {feed.fragmentCount > 0 && (
                  <button
                    onClick={() => toggleFeed(feed.sourceId)}
                    className="text-sm text-marine-600 dark:text-marine-400 hover:underline font-medium"
                  >
                    {isExpanded ? '− Hide all fragments' : `+ Show all ${feed.fragmentCount} fragments`}
                  </button>
                )}
              </div>

              {/* Fragments list (expanded) */}
              {isExpanded && feed.fragments.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    All Fragments:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {feed.fragments.map((fragment) => (
                      <a
                        key={fragment.name}
                        href={getFullUrl(fragment.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:border-marine-500 dark:hover:border-marine-500 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                          {fragment.name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400 ml-auto" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info section */}
      {feeds.length > 0 && (
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
            About LDES Feeds
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            LDES (Linked Data Event Streams) feeds provide versioned, timestamped snapshots of translated terms.
            The <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">latest.ttl</code> file always points to the most recent fragment.
            All files are in Turtle (TTL) format and can be consumed by LDES-compatible clients.
          </p>
        </div>
      )}
    </div>
  );
};

export default LdesFeeds;
