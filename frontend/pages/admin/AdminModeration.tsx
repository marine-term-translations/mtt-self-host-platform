import React, { useEffect, useState } from 'react';
import { backendApi } from '../../services/api';
import { ApiAppeal, ApiTerm } from '../../types';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const AdminModeration: React.FC = () => {
  const [appeals, setAppeals] = useState<ApiAppeal[]>([]);
  const [translationToTermUri, setTranslationToTermUri] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appealsData, termsResponse] = await Promise.all([
            backendApi.getAppeals(),
            backendApi.getTerms()
        ]);
        
        // Filter for open appeals
        setAppeals(appealsData.filter(a => a.status === 'open' || a.status === 'resolved'));

        // Build Translation ID -> Term URI map
        const mapping: Record<number, string> = {};
        termsResponse.terms.forEach((term: ApiTerm) => {
            term.fields.forEach(field => {
                if(field.translations) {
                    field.translations.forEach(t => {
                        mapping[t.id] = term.uri;
                    });
                }
            });
        });
        setTranslationToTermUri(mapping);

      } catch (error) {
        toast.error("Failed to fetch moderation data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="mb-8">
         <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="text-amber-500" /> Moderation Queue
         </h1>
         <p className="text-slate-600 dark:text-slate-400 mt-1">Review open appeals and flagged disputes.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[400px]">
        {loading ? (
           <div className="p-12 flex justify-center">
               <Loader2 className="animate-spin text-marine-500" size={32} />
           </div>
        ) : appeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <CheckCircle size={48} className="text-green-500 mb-4" />
                <h3 className="text-lg font-medium">All clear!</h3>
                <p>No pending appeals needing review.</p>
            </div>
        ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {appeals.map(appeal => {
                    const termUri = translationToTermUri[appeal.translation_id];
                    return (
                        <div key={appeal.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                            appeal.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                        }`}>
                                            {appeal.status}
                                        </span>
                                        <span className="text-slate-500 text-sm">
                                            Appeal #{appeal.id} • Opened by <span className="font-semibold text-slate-900 dark:text-white">{appeal.opened_by}</span>
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                                        Rejection Dispute
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-300 italic mb-4">
                                        "{appeal.resolution}"
                                    </p>
                                </div>
                                <div className="text-right text-sm text-slate-500">
                                    {new Date(appeal.opened_at).toLocaleDateString()}
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3">
                                {termUri ? (
                                    <Link 
                                        to={`/term/${encodeURIComponent(termUri)}`} 
                                        className="inline-flex items-center px-4 py-2 bg-marine-600 text-white rounded-lg hover:bg-marine-700 transition-colors text-sm font-medium"
                                    >
                                        Go to Term <ExternalLink size={14} className="ml-1" />
                                    </Link>
                                ) : (
                                    <span className="text-slate-400 text-sm italic">Term deleted or unknown</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminModeration;