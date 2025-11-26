import React from 'react';
import { ArrowLeft, Award, ThumbsUp, ThumbsDown, ShieldAlert, Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const Reputation: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/dashboard" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400 rounded-full mb-6">
          <Award size={48} />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Reputation System</h1>
        <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Understand how your contributions affect your standing in the community and the rewards for high-quality work.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Gaining Reputation */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gaining Points</h2>
          </div>
          <ul className="space-y-4">
            <li className="flex items-start">
              <Star className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">+10 Points</span>
                <p className="text-slate-600 dark:text-slate-400 text-sm">For every translation submitted that gets approved by a reviewer.</p>
              </div>
            </li>
            <li className="flex items-start">
              <ThumbsUp className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">+2 Points</span>
                <p className="text-slate-600 dark:text-slate-400 text-sm">For reviewing another user's translation accurately.</p>
              </div>
            </li>
            <li className="flex items-start">
              <Award className="w-5 h-5 text-purple-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">+50 Points</span>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Bonus for completing a language category milestone (e.g., 50 terms).</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Losing Reputation */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
              <ThumbsDown size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Losing Points</h2>
          </div>
           <ul className="space-y-4">
            <li className="flex items-start">
              <div className="w-5 h-5 flex items-center justify-center font-bold text-red-500 mt-0.5 mr-3">-5</div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">-5 Points</span>
                <p className="text-slate-600 dark:text-slate-400 text-sm">If your translation is rejected due to inaccuracy.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="w-5 h-5 flex items-center justify-center font-bold text-red-500 mt-0.5 mr-3">-20</div>
              <div>
                 <span className="font-bold text-slate-900 dark:text-white">-20 Points</span>
                <p className="text-slate-600 dark:text-slate-400 text-sm">For submitting low-effort or machine-generated spam.</p>
              </div>
            </li>
             <li className="flex items-start">
              <div className="w-5 h-5 flex items-center justify-center font-bold text-red-500 mt-0.5 mr-3">0</div>
              <div>
                 <span className="font-bold text-slate-900 dark:text-white">Review Strikes</span>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Incorrectly flagging valid translations as bad will lower your trust score.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Zero Tolerance Policy */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-8 rounded-2xl flex flex-col md:flex-row gap-6 items-start">
        <div className="p-4 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex-shrink-0">
          <ShieldAlert size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Zero Tolerance for Abuse</h3>
          <p className="text-red-800 dark:text-red-200 mb-4 leading-relaxed">
            We are building a scientific resource for the global community. Severely disruptive behavior, including:
          </p>
          <ul className="list-disc list-inside text-red-800 dark:text-red-200 mb-4 space-y-1">
            <li>Intentionally incorrect translations (vandalism)</li>
            <li>Hate speech or inappropriate language</li>
            <li>Botting or automated spamming</li>
          </ul>
          <p className="text-red-800 dark:text-red-200 font-bold">
            ...will result in an immediate permanent ban and IP blocking.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reputation;