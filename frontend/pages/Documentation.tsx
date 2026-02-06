
import React from 'react';
import { Book, Edit3, Shield, Info, ArrowLeft, Globe, Search, Star, MessageSquare, AlertCircle, CheckCircle, Award } from 'lucide-react';
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
          Learn how to contribute translations and help make marine science terminology accessible worldwide.
        </p>
      </div>

      {/* Getting Started Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Edit3 className="text-marine-500" size={28} /> Getting Started
        </h2>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-marine-100 dark:bg-marine-900 text-marine-700 dark:text-marine-300 text-sm font-bold">1</span>
              Sign Up with ORCID iD
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              Click <strong>"Sign in with ORCID"</strong> on the login page. You'll be redirected to ORCID where you can either 
              log in with your existing account or create a new one. ORCID is a persistent digital identifier used by researchers 
              worldwide, ensuring your contributions are properly attributed.
            </p>
            <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg text-sm text-slate-600 dark:text-slate-400">
              <strong>Why ORCID?</strong> Your ORCID iD connects you to your professional work and ensures that your 
              translation contributions are recognized across academic platforms.
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-marine-100 dark:bg-marine-900 text-marine-700 dark:text-marine-300 text-sm font-bold">2</span>
              Configure Your Language Preferences
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              After signing in, visit the <Link to="/settings" className="text-marine-600 dark:text-marine-400 hover:underline font-semibold">Settings page</Link> to 
              configure your language preferences. This is <strong>crucial</strong> for getting the most out of the platform:
            </p>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-marine-500 mt-1">•</span>
                <span><strong>Native Language:</strong> Set your first language - this is the language you're most comfortable with.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-marine-500 mt-1">•</span>
                <span><strong>Translation Languages:</strong> Add all languages you can translate to/from. You can reorder them by priority.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-marine-500 mt-1">•</span>
                <span><strong>Why it matters:</strong> The platform will show you terms that need translation in your languages, making your contribution more effective.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-marine-100 dark:bg-marine-900 text-marine-700 dark:text-marine-300 text-sm font-bold">3</span>
              Find Terms to Translate
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              There are several ways to discover terms that need your translation skills:
            </p>
            <div className="space-y-3">
              <div className="bg-marine-50 dark:bg-marine-900/20 p-4 rounded-lg border-l-4 border-marine-500">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="text-marine-600 dark:text-marine-400" size={18} />
                  <strong className="text-slate-900 dark:text-white">Dashboard (Recommended)</strong>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your personalized dashboard shows terms that match your language preferences, prioritizing what needs translation most.
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="text-slate-600 dark:text-slate-400" size={18} />
                  <strong className="text-slate-900 dark:text-white">Browse Page</strong>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Use the Browse page to explore all available terms. Filter by collection (P01, P02, etc.), language, or translation status.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-marine-100 dark:bg-marine-900 text-marine-700 dark:text-marine-300 text-sm font-bold">4</span>
              Submit Your Translation
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              Click on any term to open the translation interface. Here's what you'll see:
            </p>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400 ml-6">
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-500 mt-1 flex-shrink-0" size={16} />
                <span>The original English term with its definition and context</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-500 mt-1 flex-shrink-0" size={16} />
                <span>Existing translations in other languages (if available) for reference</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-500 mt-1 flex-shrink-0" size={16} />
                <span>AI-powered suggestions to help you start (optional)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-500 mt-1 flex-shrink-0" size={16} />
                <span>A text editor where you can write your translation</span>
              </li>
            </ul>
            <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span><strong>Pro Tip:</strong> Marine terminology is highly specialized. Take time to understand the scientific 
                context before translating. When in doubt, consult domain experts or marine science resources in your language.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Understanding the Platform Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Info className="text-amber-500" size={28} /> Understanding the Platform
        </h2>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">NERC Vocabulary Collections</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              The platform works with marine terminology from the <strong>NERC Vocabulary Server</strong> (NVS), 
              which organizes terms into collections:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                <strong className="text-slate-900 dark:text-white">P01</strong>
                <p className="text-sm text-slate-600 dark:text-slate-400">Observed properties - what is being measured</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                <strong className="text-slate-900 dark:text-white">P02</strong>
                <p className="text-sm text-slate-600 dark:text-slate-400">Parameter groupings - categories of measurements</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                <strong className="text-slate-900 dark:text-white">L22</strong>
                <p className="text-sm text-slate-600 dark:text-slate-400">Marine equipment and instruments</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                <strong className="text-slate-900 dark:text-white">Other Collections</strong>
                <p className="text-sm text-slate-600 dark:text-slate-400">Various specialized vocabularies</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Translation Status Indicators</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Approved</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">Translation reviewed and accepted by the community</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Under Review</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">Translation submitted and awaiting community feedback</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Draft</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">Work in progress, not yet submitted</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Needs Work</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">Translation flagged for improvement or correction</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reputation & Quality Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Shield className="text-teal-500" size={28} /> Reputation & Quality Control
        </h2>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">How Reputation Works</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              The platform uses a reputation system to maintain translation quality and recognize valuable contributors:
            </p>
            <div className="space-y-2 text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <Award className="text-green-500 mt-1 flex-shrink-0" size={16} />
                <span><strong>Earn reputation</strong> by submitting quality translations, helping review others' work, and engaging constructively.</span>
              </div>
              <div className="flex items-start gap-2">
                <Award className="text-blue-500 mt-1 flex-shrink-0" size={16} />
                <span><strong>Higher reputation</strong> gives your translations more weight and increases community trust.</span>
              </div>
              <div className="flex items-start gap-2">
                <Award className="text-purple-500 mt-1 flex-shrink-0" size={16} />
                <span><strong>Reputation Shield</strong> protects you from single disputes - it takes multiple issues to significantly impact your standing.</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <MessageSquare className="text-marine-500" size={20} />
              Appeals and Dispute Resolution
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              If you disagree with a translation or decision, you can file an appeal:
            </p>
            <ol className="space-y-2 text-slate-600 dark:text-slate-400 ml-6 list-decimal">
              <li>Navigate to the translation in question</li>
              <li>Click the "Appeal" or "Report Issue" button</li>
              <li>Provide a clear explanation of your concern with evidence or references</li>
              <li>Community moderators will review and respond</li>
              <li>Resolution decisions are made transparently with community input</li>
            </ol>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Community Guidelines</h3>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-marine-500 mt-1">✓</span>
                <span><strong>Be respectful</strong> - Constructive feedback is welcome; personal attacks are not.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-marine-500 mt-1">✓</span>
                <span><strong>Cite sources</strong> - When possible, reference authoritative marine science resources.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-marine-500 mt-1">✓</span>
                <span><strong>Collaborate</strong> - Translation is a community effort. Build on others' work positively.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-marine-500 mt-1">✓</span>
                <span><strong>Stay accurate</strong> - Scientific precision is more important than creative interpretation.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Where to Translate Section */}
      <div className="mb-12 bg-gradient-to-br from-marine-50 to-blue-50 dark:from-marine-900/20 dark:to-blue-900/20 border-2 border-marine-200 dark:border-marine-800 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Globe className="text-marine-500" size={28} /> Where to Do Translations
        </h2>
        <div className="space-y-4">
          <div className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-lg">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">📊 Dashboard Page</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Your personalized workspace showing terms that need translation in your configured languages. 
              This is the <strong>best starting point</strong> for most contributors.
            </p>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-lg">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">🔍 Browse Page</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Explore the full catalog of marine terms. Use filters to find specific collections or languages. 
              Perfect for when you want to work on specific types of terminology.
            </p>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-lg">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">🎯 Translation Flow</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              A guided workflow that walks you through translating multiple terms in sequence. 
              Great for focused translation sessions.
            </p>
          </div>
        </div>
        <div className="mt-6 bg-marine-600 text-white p-4 rounded-lg">
          <p className="flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <span className="text-sm">
              <strong>Important:</strong> Make sure you've configured your language preferences in <Link to="/settings" className="underline font-semibold">Settings</Link> first. Without language preferences, you won't see personalized translation suggestions!
            </span>
          </p>
        </div>
      </div>

      {/* Need Help Section */}
      <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Need More Help?</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          The Marine Term Translations community is here to support you.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link 
            to="/about" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:border-marine-500 dark:hover:border-marine-400 transition-colors text-slate-700 dark:text-slate-300"
          >
            <Book size={16} />
            <span className="text-sm font-medium">About the Project</span>
          </Link>
          <Link 
            to="/settings" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-marine-600 hover:bg-marine-700 text-white rounded-lg transition-colors"
          >
            <Globe size={16} />
            <span className="text-sm font-medium">Configure Languages</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
