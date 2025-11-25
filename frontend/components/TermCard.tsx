import React from 'react';
import { Link } from 'react-router-dom';
import { Term } from '../types';
import { BookOpen, CheckCircle, AlertCircle } from 'lucide-react';

interface TermCardProps {
  term: Term;
}

const TermCard: React.FC<TermCardProps> = ({ term }) => {
  const hasPlainEnglish = !!term.translations.en_plain;
  const encodedId = encodeURIComponent(term.id);

  return (
    <Link 
      to={`/term/${encodedId}`}
      className="block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg hover:border-marine-300 dark:hover:border-marine-700 transition-all duration-200 group h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          {term.category}
        </span>
        {hasPlainEnglish ? (
          <CheckCircle className="text-teal-500 w-5 h-5" />
        ) : (
          <AlertCircle className="text-amber-400 w-5 h-5" />
        )}
      </div>
      
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-marine-600 dark:group-hover:text-marine-400 transition-colors">
        {term.prefLabel}
      </h3>
      
      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-4">
        {hasPlainEnglish ? (
          <span className="italic text-slate-600 dark:text-slate-300">"{term.translations.en_plain}"</span>
        ) : (
          <span className="opacity-70">{term.definition}</span>
        )}
      </p>

      <div className="flex items-center text-xs text-marine-600 dark:text-marine-400 font-medium">
        <BookOpen className="w-4 h-4 mr-1.5" />
        {hasPlainEnglish ? 'View details' : 'Help translate'}
      </div>
    </Link>
  );
};

export default TermCard;
