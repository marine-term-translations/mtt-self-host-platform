import React from 'react';
import { Link } from 'react-router-dom';
import { Player } from '@remotion/player';
import { BlogSummaryVideo } from '../../components/blog/BlogSummaryVideo';
import { Calendar, Clock, User, ArrowLeft, Anchor, Cpu, Database, Share2, BookOpen, HelpCircle, CalendarDays, Award } from 'lucide-react';

const LostInTranslation: React.FC = () => {
  // Remotion video properties
  const videoProps = {
    title: "Lost in Translation? Not Your Marine Data",
    author: "Cedric Decruw",
    authorRole: "Lead Developer, VLIZ",
    introText: "We are excited to preview the public launch of the self-hosted Marine Term Translation platform, enabling standard semantic mappings and technical sovereignty.",
    features: [
      "Self-Hosted Sovereignty: Organizations retain full sovereignty over translation data.",
      "Docker & SQLite Stack: Lightweight, easy to deploy, minimal maintenance.",
      "LDES Portability: Exports translations as Linked Data Event Streams."
    ],
    ctaText: "We warmly invite you to create an account, join our community, and help us shape a more connected future.",
    primaryColor: "#0ea5e9", // sky-500
    accentColor: "#f59e0b",  // amber-500
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back button */}
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-marine-600 dark:hover:text-marine-400 mb-8 transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to blog
      </Link>

      {/* Article Header */}
      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-marine-600 dark:text-marine-400 bg-marine-50 dark:bg-marine-950/30 border border-marine-200 dark:border-marine-800 rounded-lg">
            EMODnet Technical Quarterly Blog
          </span>
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            Launch & Technology
          </span>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6 font-sans">
          Lost in Translation? Not Your Marine Data - EMODnet Biology Launches Self-Hosted Marine Term Translation Platform
        </h1>

        {/* Author metadata bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(videoProps.author)}&background=0ea5e9&color=fff`}
              alt={videoProps.author}
              className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-sm"
            />
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{videoProps.author}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{videoProps.authorRole}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><Calendar size={14} /> June 10, 2026</span>
            <span className="flex items-center gap-1"><Clock size={14} /> 4 min read</span>
          </div>
        </div>
      </header>

      {/* Remotion Embedded Video Player */}
      <section className="mb-12">
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-800">
          <Player
            component={BlogSummaryVideo}
            inputProps={videoProps}
            durationInFrames={360} // 12 seconds at 30 fps
            fps={30}
            compositionWidth={1280}
            compositionHeight={720}
            style={{
              width: '100%',
              height: 'auto',
              aspectRatio: '16 / 9',
            }}
            controls
            loop
          />
        </div>
      </section>

      {/* Article Body */}
      <article className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed font-sans space-y-8">
        
        {/* Introduction by Cedric Decruw Spotlight Card */}
        <div className="flex flex-col md:flex-row gap-6 p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 mb-8 items-start">
          <img 
            src="https://ui-avatars.com/api/?name=Cedric+Decruw&background=0ea5e9&color=fff" 
            alt="Cedric Decruw" 
            className="w-16 h-16 rounded-full border-2 border-marine-500 dark:border-marine-400 shadow-sm flex-shrink-0"
          />
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Award size={14} className="text-marine-500" /> Introduction by MTT Developer
            </h3>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">Cedric Decruw</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed italic">
              "I am excited to introduce the self-hosted Marine Term Translation platform. Our recent achievements focus on achieving full technical sovereignty, lightweight Docker/SQLite deployment, and real-time Linked Data Event Streams (LDES) compliance. As we prepare for our 2026 public launch, this platform will enable seamless semantic mappings across international borders, ensuring marine data is globally interoperable."
            </p>
          </div>
        </div>

        {/* Main Introduction Paragraphs */}
        <div className="space-y-4 text-base md:text-lg">
          <p>
            Continuous efforts to harmonize marine data form the very backbone of EMODnet. Because ocean life knows no borders, marine data naturally spans the globe, crossing countless countries and languages. To bridge the gap between regional terms and technical marine science vocabulary, the <a href="https://vliz.be/en" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">Flanders Marine Institute (VLIZ)</a> designed the Marine Term Translation project.
          </p>
          <p>
            Built upon the robust <a href="https://vocab.nerc.ac.uk/" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">NERC Vocabulary Server</a>—which provides access to massive, curated collections of controlled oceanographic vocabularies—this specialized platform crowdsources translations through a structured, expert-moderated workflow. We are thrilled to announce that in 2026, the platform is officially ready for its public launch, inviting the global community to help us build a truly multilingual future for marine science.
          </p>
        </div>

        {/* Featured Technical Aspect */}
        <section className="my-12 p-6 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-slate-100 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Anchor className="text-marine-500" size={24} /> Featured Topic: Technical Sovereignty & Portability
          </h2>
          
          {/* Author Badge for Featured Topic */}
          <div className="flex items-center gap-3 mb-6 p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm w-fit">
            <img 
              src="https://ui-avatars.com/api/?name=Joanna+Goley&background=0ea5e9&color=fff" 
              alt="Joanna Goley" 
              className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm"
            />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Featured Topic Author</p>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Joanna Goley</h4>
            </div>
          </div>

          <p className="text-base mb-6">
            Built with flexibility in mind, this platform is fully self-hosted, giving organizations or individuals complete sovereignty over their translation data. A lightweight architecture powered by <a href="https://www.docker.com/" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">Docker</a> containers and <a href="https://www.sqlite.org/" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">SQLite</a> makes deployment and ongoing maintenance simple and efficient. To ensure seamless integration with existing marine science infrastructure, the platform strictly adheres to W3C standards (<a href="https://www.w3.org/2004/02/skos/" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">SKOS</a>, <a href="https://json-ld.org/" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">JSON-LD</a>). Finally, data portability is a core feature: translations can be exported as <a href="https://w3id.org/ldes/specification" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">Linked Data Event Streams (LDES)</a> for real-time integration with external systems.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
              <div className="p-2.5 bg-marine-50 dark:bg-marine-950/50 text-marine-600 dark:text-marine-400 rounded-lg w-fit">
                <Cpu size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Self-Hosted</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-normal">
                Run locally or in your private cloud using <a href="https://www.docker.com/" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">Docker</a> and <a href="https://www.sqlite.org/" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">SQLite</a>. Light on resources and high on speed.
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
              <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-lg w-fit">
                <Database size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">W3C Standards</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-normal">
                Stands fully compliant with <a href="https://www.w3.org/2004/02/skos/" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">SKOS</a>, <a href="https://json-ld.org/" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">JSON-LD</a>, and semantic web graphs for seamless interoperability.
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg w-fit">
                <Share2 size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">LDES Portability</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-normal">
                Export translation changes as <a href="https://w3id.org/ldes/specification" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">Linked Data Event Streams (LDES)</a> to feed external metadata systems.
              </p>
            </div>
          </div>
        </section>

        {/* Developer Spotlight */}
        <section className="my-12 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700/50">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              💻 Developer Spotlight: Cedric Decruw
            </h3>
            <span className="px-2.5 py-0.5 text-xs font-mono rounded bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
              Technical Contributions
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start mb-4">
            <img 
              src="https://ui-avatars.com/api/?name=Cedric+Decruw&background=0ea5e9&color=fff" 
              alt="Cedric Decruw" 
              className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0"
            />
            <div>
              <h4 className="text-base font-bold text-slate-800 dark:text-white">Cedric Decruw</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">MTT Lead Developer / Software Engineer</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            As the lead developer of the Marine Term Translation (MTT) platform at the <a href="https://vliz.be/en" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">Flanders Marine Institute (VLIZ)</a>, Cedric Decruw has engineered a robust, containerized application stack to enable open marine science translation crowdsourcing. Over the past months, Cedric has implemented secure ORCID OAuth session authentication, established a robust SQLite migration system, and integrated W3C-compliant <a href="https://w3id.org/ldes/specification" target="_blank" rel="noopener noreferrer" className="text-marine-600 dark:text-marine-400 hover:underline">Linked Data Event Streams (LDES)</a> to export real-time vocabulary mappings. His work ensures that the self-hosted platform is lightweight, secure, and highly scalable for the global marine science community.
          </p>
        </section>

        {/* Tips and Tricks */}
        <section className="my-12 p-6 md:p-8 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            <div>
              <h3 className="text-xl md:text-2xl font-extrabold mb-4 flex items-center gap-2 text-amber-400">
                💡 Tips & Tricks: Navigating EMODnet & Resources
              </h3>
              
              <div className="space-y-4 text-sm text-slate-300 leading-relaxed mb-6">
                <p>
                  As a community-driven initiative, the true power and reliability of the Marine Term Translation project rest entirely in the hands of its users. To build a robust, self-regulating ecosystem of accurate translations, we need a diverse and active global network.
                </p>
                <p>
                  If you rely on or work with the <a href="https://vocab.nerc.ac.uk/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">NERC Vocabulary Server</a>, your expertise is invaluable to this mission. We warmly invite you to create an account, join our community, and help us shape a more connected future for global marine data.
                </p>
              </div>

              {/* Steps for EMODnet Resources */}
              <div className="border-t border-slate-800 pt-4 mt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigating EMODnet Resources:</h4>
                <ul className="text-xs space-y-2 text-slate-300 list-disc list-inside">
                  <li>
                    <span className="font-semibold text-white">Streamline vocabulary mapping:</span> Locate NERC collection IDs (like P01 or L05) directly via the dashboard translation widget.
                  </li>
                  <li>
                    <span className="font-semibold text-white">Cross-referencing:</span> If you encounter ambiguous regional terms, use EMODnet's centralized web search to check how other thematic lots mapped similar parameters.
                  </li>
                  <li>
                    <span className="font-semibold text-white">Real-time sync:</span> Use our <a href="https://w3id.org/ldes/specification" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Linked Data Event Streams (LDES)</a> to pull live, validated translations straight into your database pipelines.
                  </li>
                  <li>
                    <span className="font-semibold text-white">Cross-reference EMODnet Biology:</span> Use the EMODnet Biology data portal to verify how translated regional terms align with standardized datasets and query them using our integrated SKOS mappings.
                  </li>
                </ul>
              </div>
              
              <div className="mt-8">
                <Link
                  to="/login"
                  className="inline-flex items-center px-6 py-3 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-400 transition-colors shadow-md text-sm"
                >
                  Create an account & contribute
                </Link>
              </div>
            </div>

            {/* Premium Generated SVG/PNG Image */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950/50">
              <img 
                src="/emodnet_tips_tricks_guide.png" 
                alt="EMODnet global vocabulary translation network map" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none" />
            </div>

          </div>
        </section>

        {/* Upcoming Events and Opportunities */}
        <section className="my-12 border-t border-slate-200 dark:border-slate-800 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays size={24} className="text-marine-500" /> Upcoming Events & Opportunities
            </h3>
            <span className="text-xs font-mono font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 px-2 py-1 rounded">
              Curated by AK
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold text-teal-500 dark:text-teal-400 uppercase tracking-wider block mb-1">01 / Collaboration</span>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Crowdsourced Translation Drive</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  Join our upcoming curation drive to map and translate descriptors inside the NERC vocabulary server collections.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-4 block">Status: Active</span>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider block mb-1">02 / Community Engagement</span>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Call for Vocabulary Moderators</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  We are looking for marine biology subject experts to help review, moderate, and validate incoming translations.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-4 block">Status: Always Open</span>
            </div>
          </div>
        </section>
      </article>

      {/* Bottom Navigation */}
      <footer className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-marine-600 dark:hover:text-marine-400 transition-colors"
        >
          <ArrowLeft size={16} /> All articles
        </Link>
        <span className="text-xs text-slate-400">Published by EMODnet Biology</span>
      </footer>
    </div>
  );
};

export default LostInTranslation;
