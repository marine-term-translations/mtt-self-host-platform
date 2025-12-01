
import React from 'react';
import { Book, Edit3, Shield, Info, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Documentation: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Home
      </Link>

      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-marine-100 dark:bg-marine-900 text-marine-600 dark:text-marine-400 rounded-2xl mb-6">
          <Book size={32} />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Documentation</h1>
        <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Everything you need to know about contributing to the Marine Term Translations project.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Edit3 className="text-marine-500" /> Getting Started
            </h2>
            <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                <li>• How to sign up and configure your profile</li>
                <li>• Making your first translation</li>
                <li>• Editing existing translations</li>
                <li>• Understanding the review process</li>
            </ul>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="text-teal-500" /> Reputation & Moderation
            </h2>
            <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                <li>• How reputation points are calculated</li>
                <li>• Understanding the Reputation Shield</li>
                <li>• Dispute resolution and appeals</li>
                <li>• Community guidelines</li>
            </ul>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Info className="text-amber-500" /> Terminology Guide
            </h2>
            <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                <li>• Explaining NERC Vocabulary Collections (P01, P02...)</li>
                <li>• Current translation priorities</li>
                <li>• Understanding status symbols (Draft, Review, etc.)</li>
            </ul>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-8 text-center">
          <p className="text-slate-500 italic">
              Detailed documentation is currently being written by the community maintainers. 
              Please check back soon for comprehensive guides!
          </p>
      </div>
    </div>
  );
};

export default Documentation;
