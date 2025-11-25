import React from 'react';
import { Database, Share2, Globe, ShieldCheck, Layers, GitBranch, Cpu, FileJson } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-block px-4 py-1.5 rounded-full bg-marine-100 dark:bg-marine-900 text-marine-700 dark:text-marine-300 text-sm font-bold uppercase tracking-wide mb-4">
            marine-term-translations
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">About the Project</h1>
        <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          A community-driven infrastructure for maintaining and internationalizing marine thesauri.
        </p>
      </div>
      
      <div className="prose prose-slate dark:prose-invert lg:prose-lg mx-auto mb-16">
        <p>
          <strong>Marine Term Translations</strong> is a specialized platform designed to bridge the gap between technical marine science vocabulary and global understanding. 
          It operates on top of the <strong>NERC Vocabulary Server</strong>, allowing domain experts and contributors to provide translations that are scientifically accurate yet accessible.
        </p>
        <p>
          This project supports the <a href="https://marine-term-translations.github.io/" className="text-marine-600 hover:underline">marine-term-translations</a> initiative, 
          leveraging modern CI/CD practices to automate the maintenance of thesauri content.
        </p>
      </div>

      {/* Workflow Section (Based on #gh_action) */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center flex items-center justify-center gap-2">
            <Cpu className="text-marine-500" /> The Automated Workflow
        </h2>
        
        <div className="relative">
            {/* Connecting Line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 -z-10 hidden md:block"></div>
            
            <div className="space-y-12">
                {/* Step 1 */}
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="md:w-1/2 md:text-right">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1. Contribution</h3>
                        <p className="text-slate-600 dark:text-slate-400">
                            Users submit translations via this web interface or directly as Git commits. 
                            Simple structured files (CSV/JSON) act as the source of truth.
                        </p>
                    </div>
                    <div className="bg-marine-100 dark:bg-marine-900 p-4 rounded-full border-4 border-white dark:border-slate-900 shadow-sm z-10">
                        <GitBranch size={24} className="text-marine-600 dark:text-marine-400" />
                    </div>
                    <div className="md:w-1/2 md:opacity-0"></div>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="md:w-1/2 md:opacity-0 hidden md:block"></div>
                    <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded-full border-4 border-white dark:border-slate-900 shadow-sm z-10">
                        <Cpu size={24} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="md:w-1/2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">2. GitHub/Gitea Action</h3>
                        <p className="text-slate-600 dark:text-slate-400">
                            Upon every commit, a CI pipeline (GitHub Action) is triggered. 
                            It validates the input data against the NERC schema and processes the translations.
                        </p>
                    </div>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="md:w-1/2 md:text-right">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">3. LDES Generation</h3>
                        <p className="text-slate-600 dark:text-slate-400">
                             The pipeline converts the data into a <strong>Linked Data Event Stream (LDES)</strong>.
                             This format treats data as a sequence of immutable events, ensuring perfect history tracking.
                        </p>
                    </div>
                    <div className="bg-teal-100 dark:bg-teal-900 p-4 rounded-full border-4 border-white dark:border-slate-900 shadow-sm z-10">
                        <Layers size={24} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="md:w-1/2 md:opacity-0"></div>
                </div>

                 {/* Step 4 */}
                 <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="md:w-1/2 md:opacity-0 hidden md:block"></div>
                    <div className="bg-amber-100 dark:bg-amber-900 p-4 rounded-full border-4 border-white dark:border-slate-900 shadow-sm z-10">
                        <FileJson size={24} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="md:w-1/2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">4. Publication</h3>
                        <p className="text-slate-600 dark:text-slate-400">
                            The resulting RDF (SKOS/Turtle) and JSON-LD files are automatically published to the repository pages.
                            They are instantly harvestable by other machines.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* LDES Feature Box (Refined) */}
      <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 mb-16 shadow-lg relative overflow-hidden group">
        <div className="absolute -right-10 -top-10 text-slate-100 dark:text-slate-700 opacity-50 transform rotate-12 transition-transform group-hover:rotate-0 duration-700">
          <Database size={200} />
        </div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-marine-600 text-white text-xs font-bold uppercase tracking-wide mb-4 shadow-sm">
            <Layers size={14} /> The End Product
          </div>
          
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            A Harvestable LDES Stream
          </h2>
          
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6 max-w-2xl">
            The ultimate output of the translation workflow is not just a static webpage, but a dynamic <strong>Linked Data Event Stream</strong>. 
            This technical translation process ensures that the data is FAIR (Findable, Accessible, Interoperable, Reusable).
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                      <Share2 size={16} className="text-marine-500" /> Interoperability
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                      Standardized SKOS/JSON-LD formats allow seamless integration across different systems and languages.
                  </p>
              </div>
              <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                      <ShieldCheck size={16} className="text-marine-500" /> Reliability
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                      Immutable event streams provide a complete audit trail of all changes and contributions.
                  </p>
              </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 text-center border-t border-slate-200 dark:border-slate-800 pt-12">
        <div className="px-4">
          <Globe className="mx-auto h-10 w-10 text-marine-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Internationalization</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Providing accurate technical translations in multiple languages to support global collaboration.
          </p>
        </div>
        <div className="px-4">
           <Database className="mx-auto h-10 w-10 text-marine-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">FAIR Data</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Making marine vocabulary Findable, Accessible, Interoperable, and Reusable for machines and humans.
          </p>
        </div>
        <div className="px-4">
           <Layers className="mx-auto h-10 w-10 text-marine-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Standardization</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Built on W3C standards (SKOS, JSON-LD) to ensure seamless integration with existing infrastructure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;