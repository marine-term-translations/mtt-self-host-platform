import React, { useEffect, useState } from 'react';
import { Database, FileText, ExternalLink, Loader2, AlertCircle, Calendar, Layers, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { backendApi } from '../services/api';

interface Fragment {
  name: string;
  url: string;
  memberCount?: number;
  timestamp?: string;
}

interface LdesFeed {
  sourceId: string;
  description: string | null;
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
    let baseUrl = apiUrl;
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.slice(0, -4);
    } else if (baseUrl.endsWith('/api/')) {
      baseUrl = baseUrl.slice(0, -5);
    }
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xl text-xs space-y-1 z-50">
          <p className="font-bold text-slate-900 dark:text-white flex items-center justify-between gap-3">
            <span>Fragment #{data.fragmentNumber}</span>
            <span className="font-mono text-marine-500">{data.fragmentName}</span>
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            Member Count: <span className="font-bold text-teal-600 dark:text-teal-400">{data.memberCount} items</span>
          </p>
          <p className="text-slate-400 text-[11px]">
            Published: {data.date}
          </p>
        </div>
      );
    }
    return null;
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
          Each feed contains versioned translations with a member count breakdown across all published fragments.
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
      <div className="space-y-8">
        {feeds.map((feed) => {
          const isExpanded = expandedFeeds.has(feed.sourceId);

          // Calculate aggregate metrics
          const totalMembers = feed.fragments.reduce((sum, f) => sum + (f.memberCount || 0), 0);

          // Sort fragments chronologically
          const sortedFragments = [...feed.fragments].sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeA - timeB;
          });

          // Format chart data for ALL fragments (horizontal axis = fragment numbers, vertical axis = member count)
          const chartData = sortedFragments.map((fragment, index) => ({
            fragmentNumber: index + 1,
            fragmentLabel: `Frag #${index + 1}`,
            fragmentName: fragment.name,
            memberCount: fragment.memberCount || 0,
            date: formatDate(fragment.timestamp),
            fullTimestamp: fragment.timestamp
          }));

          const oldestDate = sortedFragments.length > 0 ? formatDate(sortedFragments[0].timestamp) : null;
          const newestDate = sortedFragments.length > 0 ? formatDate(sortedFragments[sortedFragments.length - 1].timestamp) : null;

          return (
            <div
              key={feed.sourceId}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm"
            >
              {/* Feed header */}
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-marine-600 dark:text-marine-400 bg-marine-50 dark:bg-marine-900/30 px-2.5 py-0.5 rounded-full">
                        LDES Stream #{feed.sourceId}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      {feed.description || `Source Collection #${feed.sourceId}`}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Published stream with versioned Linked Data fragments.
                    </p>
                  </div>

                  {/* Latest.ttl link */}
                  <a
                    href={getFullUrl(feed.latestUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-marine-50 dark:bg-marine-900/40 text-marine-600 dark:text-marine-300 hover:bg-marine-100 dark:hover:bg-marine-900/60 rounded-lg font-medium text-sm transition-colors border border-marine-200 dark:border-marine-800 shrink-0"
                  >
                    <FileText className="w-4 h-4" />
                    <span>latest.ttl</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Summary KPI Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Members</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{totalMembers} items</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
                      <BarChart2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Fragments</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{feed.fragmentCount} fragments</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Time Period</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {oldestDate && newestDate ? `${oldestDate} - ${newestDate}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recharts BarChart (X-axis = Fragment Numbers, Y-axis = Member Count) */}
                {chartData.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-marine-500" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Members per LDES Fragment Chart
                        </h3>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-full">
                        All {chartData.length} Fragment{chartData.length !== 1 ? 's' : ''} Present
                      </span>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#64748b" opacity={0.15} vertical={false} />
                          <XAxis
                            dataKey="fragmentNumber"
                            stroke="#64748b"
                            style={{ fontSize: '11px' }}
                            label={{ value: 'Fragment Numbers', position: 'bottom', offset: 10, style: { fontSize: '12px', fill: '#64748b', fontWeight: 600 } }}
                          />
                          <YAxis
                            stroke="#64748b"
                            style={{ fontSize: '11px' }}
                            label={{ value: 'Number of Members', angle: -90, position: 'insideLeft', offset: 0, style: { fontSize: '12px', fill: '#64748b', fontWeight: 600 } }}
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="memberCount" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0891b2' : '#06b6d4'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Show all fragments button */}
                {feed.fragmentCount > 0 && (
                  <button
                    onClick={() => toggleFeed(feed.sourceId)}
                    className="text-sm text-marine-600 dark:text-marine-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    {isExpanded ? '− Hide fragment file details' : `+ View all ${feed.fragmentCount} fragment .ttl files & links`}
                  </button>
                )}
              </div>

              {/* Detailed Fragments Grid (Expanded) */}
              {isExpanded && sortedFragments.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-6">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-marine-500" />
                    All LDES Fragment Files ({sortedFragments.length}):
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sortedFragments.map((fragment, idx) => {
                      const mCount = fragment.memberCount || 0;
                      return (
                        <a
                          key={fragment.name}
                          href={getFullUrl(fragment.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-marine-500 dark:hover:border-marine-500 transition-all hover:shadow-md group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                              #{idx + 1}: {fragment.name}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-marine-500 transition-colors shrink-0" />
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {formatDate(fragment.timestamp)}
                            </span>
                            <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold rounded text-[11px]">
                              {mCount} member{mCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info section */}
      {feeds.length > 0 && (
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
            About LDES Feeds & Fragment Bar Charts
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
            Linked Data Event Streams (LDES) store versioned, append-only logs of translated terms.
            Each bar on the chart corresponds to a fragment number, displaying the exact number of published members in that fragment across the stream's history.
          </p>
        </div>
      )}
    </div>
  );
};

export default LdesFeeds;
