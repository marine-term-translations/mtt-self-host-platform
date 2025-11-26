import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe, Share2, Anchor } from 'lucide-react';
import { MOCK_TERMS } from '../mock/terms';
import TermCard from '../components/TermCard';

const Landing: React.FC = () => {
  const featuredTerms = MOCK_TERMS.slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-marine-900 via-marine-800 to-slate-900 text-white overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <path d="M0 50 Q 25 25, 50 50 T 100 50 V 100 H 0 Z" fill="white" />
            </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative z-10 text-center md:text-left">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-1.5 rounded-full bg-marine-700/50 border border-marine-500/30 text-marine-100 text-sm font-medium mb-6 backdrop-blur-sm">
                Open Science Initiative
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
                <span className="text-marine-300">Marine Term Translations</span> Project
              </h1>
              <p className="text-lg md:text-xl text-slate-200 mb-8 max-w-lg leading-relaxed">
                Making marine data FAIR by crowdsourcing technical translations for global interoperability.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <Link to="/register" className="px-8 py-4 bg-white text-marine-900 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg flex items-center justify-center gap-2">
                    Sign up to Contribute <ArrowRight size={20} />
                  </Link>
                <Link to="/about" className="px-8 py-4 bg-marine-800/50 border border-marine-600/50 text-white rounded-xl font-semibold hover:bg-marine-800 transition-colors backdrop-blur-sm">
                  Why LDES?
                </Link>
              </div>
            </div>
            
            <div className="hidden md:grid grid-cols-2 gap-4 opacity-90">
                <div className="space-y-4 translate-y-8">
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                        <Anchor className="text-marine-300 mb-3" size={32} />
                        <h3 className="font-bold text-lg mb-1">Standardized</h3>
                        <p className="text-sm text-slate-300">Based on the NERC Vocabulary Server.</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                        <Globe className="text-teal-300 mb-3" size={32} />
                        <h3 className="font-bold text-lg mb-1">International</h3>
                        <p className="text-sm text-slate-300">Technical translations for global access.</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                        <Share2 className="text-purple-300 mb-3" size={32} />
                        <h3 className="font-bold text-lg mb-1">Interoperable</h3>
                        <p className="text-sm text-slate-300">FAIR data powered by LDES technology.</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Recent Contributions</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Explore terms that have recently been enriched with multilingual technical definitions.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredTerms.map(term => (
              <TermCard key={term.id} term={term} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/browse" className="inline-flex items-center text-marine-600 dark:text-marine-400 font-semibold hover:underline">
              Browse all terms <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;