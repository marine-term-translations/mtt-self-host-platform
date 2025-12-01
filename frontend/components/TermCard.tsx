
import React from 'react';
import { Link } from 'react-router-dom';
import { Term } from '../types';
import { BookOpen, CheckCircle, AlertCircle, FileText, Eye, XCircle, GitMerge } from 'lucide-react';

interface TermCardProps {
  term: Term;
}

const TermCard: React.FC<TermCardProps> = ({ term }) => {
  const hasPlainEnglish = !!term.translations.en_plain;
  const encodedId = encodeURIComponent(term.id);
  const stats = term.stats;

  return (
    <Link 
      to={`/term/${encodedId}`}
      className="block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg hover:border-marine-300 dark:hover:border-marine-700 transition-all duration-200 group h-full flex flex-col"
    >
      <div className="flex justify-between items-start mb-3 gap-2">
        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 truncate max-w-[85%]" title={term.category}>
          {term.category}
        </span>
        {hasPlainEnglish ? (
          <CheckCircle className="text-teal-500 w-5 h-5 flex-shrink-0" />
        ) : (
          <AlertCircle className="text-amber-400 w-5 h-5 flex-shrink-0" />
        )}
      </div>
      
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-marine-600 dark:group-hover:text-marine-400 transition-colors">
        {term.prefLabel}
      </h3>
      
      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 flex-grow">
        {hasPlainEnglish ? (
          <span className="italic text-slate-600 dark:text-slate-300">"{term.translations.en_plain}"</span>
        ) : (
          <span className="opacity-70">{term.definition}</span>
        )}
      </p>

      {/* Status Overview */}
      {stats && (
        <div className="flex items-center gap-3 mb-4 pt-3 border-t border-slate-100 dark:border-slate-700">
          {stats.approved > 0 && (
            <div className="flex items-center text-xs font-medium text-teal-600 dark:text-teal-400" title={`${stats.approved} Approved translations`}>
              <CheckCircle size={14} className="mr-1" /> {stats.approved}
            </div>
          )}
          {stats.merged > 0 && (
            <div className="flex items-center text-xs font-medium text-purple-600 dark:text-purple-400" title={`${stats.merged} Merged translations`}>
              <GitMerge size={14} className="mr-1" /> {stats.merged}
            </div>
          )}
          {stats.review > 0 && (
            <div className="flex items-center text-xs font-medium text-amber-600 dark:text-amber-400" title={`${stats.review} translations needing review`}>
              <Eye size={14} className="mr-1" /> {stats.review}
            </div>
          )}
          {stats.draft > 0 && (
            <div className="flex items-center text-xs font-medium text-slate-500 dark:text-slate-400" title={`${stats.draft} Draft translations`}>
              <FileText size={14} className="mr-1" /> {stats.draft}
            </div>
          )}
           {stats.rejected > 0 && (
            <div className="flex items-center text-xs font-medium text-red-500 dark:text-red-400" title={`${stats.rejected} Rejected translations`}>
              <XCircle size={14} className="mr-1" /> {stats.rejected}
            </div>
          )}
          {/* Fallback if no activity yet */}
          {stats.approved === 0 && stats.merged === 0 && stats.review === 0 && stats.draft === 0 && stats.rejected === 0 && (
             <span className="text-xs text-slate-400 italic">No translations yet</span>
          )}
        </div>
      )}

      <div className="flex items-center text-xs text-marine-600 dark:text-marine-400 font-medium">
        <BookOpen className="w-4 h-4 mr-1.5" />
        {hasPlainEnglish ? 'View details' : 'Help translate'}
      </div>
    </Link>
  );
};

export default TermCard;
