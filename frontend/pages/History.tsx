
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { backendApi } from '../services/api';
import { ApiUserActivity, ApiTerm } from '../types';
import { getLanguagePriority } from '../src/utils/languageSelector';
import toast from 'react-hot-toast';
import { parse, format } from '@/src/utils/datetime';

const History: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<ApiUserActivity[]>([]);
  const [termMap, setTermMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id && !user?.user_id) return; // Check for user ID
      try {
        setLoading(true);
        // Fetch user history first
        const historyData = await backendApi.getUserHistory(user.id || user.user_id!); // Use user ID

        // Extract unique term IDs from history and fetch only those terms
        const termIds = [...new Set(historyData.map(h => h.term_id).filter(id => id != null))] as number[];
        
        let tMap: Record<number, string> = {};
        if (termIds.length > 0) {
          const terms = await backendApi.getTermsByIds(termIds);
          terms.forEach((t: ApiTerm) => {
            const labelField = t.fields?.find(f => f.field_role === 'label') 
              || t.fields?.find(f => f.field_uri?.includes('prefLabel'));
            const prefLabel = labelField?.original_value || t.uri.split('/').pop() || 'Unknown Term';
            tMap[t.id] = prefLabel;
          });
        }
        setTermMap(tMap);

        // Sort history by date descending
        const sortedHistory = historyData.sort((a, b) => 
            parse(b.created_at).valueOf() - parse(a.created_at).valueOf()
        );
        setHistory(sortedHistory);
      } catch (error) {
        console.error("Failed to load history", error);
        toast.error("Could not load your history.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatAction = (action: string) => {
    switch (action) {
        case 'translation_created': return 'Created Translation';
        case 'translation_edited': return 'Edited Translation';
        case 'translation_approved': return 'Approved';
        case 'translation_rejected': return 'Rejected';
        case 'translation_status_changed': return 'Status Change';
        case 'term_uri_changed': return 'Updated URI';
        default: return action.replace(/_/g, ' ');
    }
  };

  const parseDetails = (extra: string | null) => {
    if (!extra) return { text: "No details", status: 'Pending', lang: '-' };
    try {
      const data = JSON.parse(extra);
      let text = "";
      if (data.value) text = `"${data.value}"`;
      if (data.old_value && data.new_value) text = `"${data.old_value}" → "${data.new_value}"`;
      if (data.old_status && data.new_status) text = `Status: ${data.old_status} → ${data.new_status}`;
      
      return {
          text: text || "Update",
          status: data.new_status || data.status || 'Pending',
          lang: data.language ? data.language.toUpperCase() : '-'
      };
    } catch {
      return { text: "Complex update", status: 'Pending', lang: '-' };
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('approved') || s.includes('merged')) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle size={12} className="mr-1"/> Approved</span>;
    if (s.includes('rejected')) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle size={12} className="mr-1"/> Rejected</span>;
    if (s.includes('review')) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"><Clock size={12} className="mr-1"/> In Review</span>;
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"><Clock size={12} className="mr-1"/> {status}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/dashboard" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-marine-100 dark:bg-marine-900 text-marine-600 dark:text-marine-400 rounded-lg">
          <Edit2 size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Contribution History</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">A timeline of your translations and edits.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
            <div className="p-12 text-center text-slate-500">Loading history...</div>
        ) : history.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No activity recorded yet. Start translating!</div>
        ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Term</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Language</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Details</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {history.map((item) => {
                    const parsed = parseDetails(item.extra);
                    return (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                            {format(parse(item.created_at), 'YYYY-MM-DD')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {item.term_id ? termMap[item.term_id] || `Term #${item.term_id}` : 'Unknown'}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                            {parsed.lang}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                            {formatAction(item.action)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {parsed.text}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(parsed.status)}
                        </td>
                        </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        )}
      </div>
      
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
        <AlertCircle size={16} />
        <span>Only showing activity recorded in the database.</span>
      </div>
    </div>
  );
};

export default History;
