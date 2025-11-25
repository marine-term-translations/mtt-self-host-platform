import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getTermById, mockApiDelay } from '../mock/terms';
import { Term } from '../types';
import { ArrowLeft, ExternalLink, Globe, Send, User } from 'lucide-react';
import toast from 'react-hot-toast';

const TermDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [term, setTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [translationText, setTranslationText] = useState('');
  const [selectedLang, setSelectedLang] = useState('en_plain');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTerm = async () => {
      setLoading(true);
      await mockApiDelay(600); // Simulate network
      const foundTerm = id ? getTermById(decodeURIComponent(id)) : undefined;
      
      if (foundTerm) {
        setTerm(foundTerm);
        // Pre-fill if exists (mocking edit mode)
        // setTranslationText(foundTerm.translations.en_plain || '');
      } else {
        toast.error("Term not found");
        navigate('/browse');
      }
      setLoading(false);
    };

    fetchTerm();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!translationText.trim()) return;

    setIsSubmitting(true);
    await mockApiDelay(1000);
    setIsSubmitting(false);
    
    toast.success("Translation submitted for review!");
    setTranslationText("");
    
    // In a real app, we'd update the local state or refetch
    if (term) {
        setTerm({
            ...term,
            translations: {
                ...term.translations,
                [selectedLang]: translationText
            }
        });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-8"></div>
        <div className="h-10 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
        <div className="h-20 w-full bg-slate-200 dark:bg-slate-700 rounded mb-8"></div>
        <div className="h-64 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    );
  }

  if (!term) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/browse" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Browse
      </Link>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between">
             <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-marine-100 dark:bg-marine-900 text-marine-700 dark:text-marine-300 mb-3">
                    {term.category}
                </span>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{term.prefLabel}</h1>
             </div>
             <a href={term.id} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-marine-600 transition-colors" title="View Source URI">
                 <ExternalLink size={20} />
             </a>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Technical Definition</h3>
            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
              {term.definition}
            </p>
          </div>
        </div>

        {/* Translation Section */}
        <div className="p-8 bg-slate-50 dark:bg-slate-900/30">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Existing Translations */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                <Globe size={18} className="mr-2 text-marine-500" /> Current Translations
              </h3>
              
              <div className="space-y-4">
                {Object.entries(term.translations).map(([lang, text]) => (
                  text ? (
                    <div key={lang} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold uppercase text-slate-400">
                            {lang === 'en_plain' ? 'English (Plain/Desc)' : lang}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{text}</p>
                    </div>
                  ) : null
                ))}
                
                {Object.values(term.translations).every(v => v === null) && (
                    <p className="text-slate-500 italic text-sm">No translations available yet. Be the first!</p>
                )}
              </div>
            </div>

            {/* Contribute Form */}
            <div>
               <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                <Send size={18} className="mr-2 text-marine-500" /> Contribute
              </h3>
              
              <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Language</label>
                  <select 
                    value={selectedLang} 
                    onChange={(e) => setSelectedLang(e.target.value)}
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-marine-500 focus:ring-marine-500 sm:text-sm"
                  >
                    <option value="en_plain">English (Plain/Description)</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="nl">Dutch</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Technical Translation</label>
                  <textarea
                    rows={4}
                    value={translationText}
                    onChange={(e) => setTranslationText(e.target.value)}
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-marine-500 focus:ring-marine-500 sm:text-sm"
                    placeholder="Enter an accurate technical translation..."
                    required
                  ></textarea>
                   <p className="mt-1 text-xs text-slate-500">Ensure strict adherence to scientific accuracy for interoperability.</p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-marine-600 hover:bg-marine-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-marine-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Translation'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Contributors */}
        <div className="px-8 py-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-sm text-slate-500">
           <User size={14} /> Contributors: {term.contributors.length > 0 ? term.contributors.join(', ') : 'None yet'}
        </div>
      </div>
    </div>
  );
};

export default TermDetail;