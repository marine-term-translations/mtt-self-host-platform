import React from 'react';
import { Link } from 'react-router-dom';
import { Player } from '@remotion/player';
import { BlogSummaryVideo } from '../../components/blog/BlogSummaryVideo';
import { Calendar, Clock, User, ArrowLeft, Anchor, Cpu, Database, Share2, BookOpen, HelpCircle, CalendarDays, Award } from 'lucide-react';

const LostInTranslation: React.FC = () => {
  // Remotion video properties
  const videoProps = {
    title: "Lost in Translation? Not Your Marine Data",
    author: "Joanna Goley",
    authorRole: "VLIZ Project Manager",
    introText: "Continuous efforts to harmonize marine data form the very backbone of EMODnet. We designed the Marine Term Translation project to bridge the inter-regional gap in marine terminology.",
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
        
        {/* Introduction by Conor Delaney Spotlight Card */}
        <div className="flex flex-col md:flex-row gap-6 p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 mb-8 items-start">
          <img 
            src="https://ui-avatars.com/api/?name=Conor+Delaney&background=0369a1&color=fff" 
            alt="Conor Delaney" 
            className="w-16 h-16 rounded-full border-2 border-marine-500 dark:border-marine-400 shadow-sm flex-shrink-0"
          />
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Award size={14} className="text-marine-500" /> Introduction by EMODnet Biology Coordinator
            </h3>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">Conor Delaney</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed italic">
              "Welcome to this quarter's EMODnet Technical Update. Over the past months, we have achieved major milestones in semantic vocabulary mapping and data integration. I am thrilled to preview the official release of our self-hosted Marine Term Translation platform. This launch empowers regional nodes and organizations to run their own localized systems, fostering a collaborative, global crowdsourcing network that ensures marine data is truly connected and interoperable."
            </p>
          </div>
        </div>

        {/* Main Introduction Paragraphs */}
        <div className="space-y-4 text-base md:text-lg">
          <p>
            Continuous efforts to harmonize marine data form the very backbone of EMODnet. Because ocean life knows no borders, marine data naturally spans the globe, crossing countless countries and languages. To bridge the gap between regional terms and technical marine science vocabulary, the Flanders Marine Institute designed the Marine Term Translation project.
          </p>
          <p>
            Built upon the robust NERC Vocabulary Server—which provides access to massive, curated collections of controlled oceanographic vocabularies—this specialized platform crowdsources translations through a structured, expert-moderated workflow. We are thrilled to announce that in 2026, the platform is officially ready for its public launch, inviting the global community to help us build a truly multilingual future for marine science.
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
            Built with flexibility in mind, this platform is fully self-hosted, giving organizations or individuals complete sovereignty over their translation data. A lightweight architecture powered by Docker containers and SQLite makes deployment and ongoing maintenance simple and efficient. To ensure seamless integration with existing marine science infrastructure, the platform strictly adheres to W3C standards (SKOS, JSON-LD). Finally, data portability is a core feature: translations can be exported as Linked Data Event Streams (LDES) for real-time integration with external systems.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
              <div className="p-2.5 bg-marine-50 dark:bg-marine-950/50 text-marine-600 dark:text-marine-400 rounded-lg w-fit">
                <Cpu size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Self-Hosted</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-normal">
                Run locally or in your private cloud using Docker and SQLite. Light on resources and high on speed.
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
              <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-lg w-fit">
                <Database size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">W3C Standards</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-normal">
                Stands fully compliant with SKOS, JSON-LD, and semantic web graphs for seamless interoperability.
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg w-fit">
                <Share2 size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">LDES Portability</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-normal">
                Export translation changes as Linked Data Event Streams (LDES) to feed external metadata systems.
              </p>
            </div>
          </div>
        </section>

        {/* Thematic Corner Spotlight */}
        <section className="my-12 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700/50">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              ⚓ Thematic Corner: Coordinator Spotlight
            </h3>
            <span className="px-2.5 py-0.5 text-xs font-mono rounded bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
              Thematic Achievements
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start mb-4">
            <img 
              src="https://ui-avatars.com/api/?name=Conor+Delaney&background=0369a1&color=fff" 
              alt="Conor Delaney" 
              className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0"
            />
            <div>
              <h4 className="text-base font-bold text-slate-800 dark:text-white">Conor Delaney</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">EMODnet Biology Thematic Coordinator</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Over the past quarter, EMODnet Biology has pushed forward key semantic web projects to ensure marine metadata meets global standards. The launch of the self-hosted Marine Term Translations platform marks a critical milestone, allowing international nodes to deploy their own translation tools and exchange dictionary mappings in real-time. This advancement directly helps us resolve technical friction points when compiling regional data into our global portal.
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
                  If you rely on or work with the NERC vocabulary server, your expertise is invaluable to this mission. We warmly invite you to create an account, join our community, and help us shape a more connected future for global marine data.
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
                    <span className="font-semibold text-white">Real-time sync:</span> Use our Linked Data Event Streams (LDES) to pull live, validated translations straight into your database pipelines.
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold text-teal-500 dark:text-teal-400 uppercase tracking-wider block mb-1">01 / Collaboration</span>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Crowdsourced Translation Sprint</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  Join our upcoming curation drive to map and translate over 5,000 parameter descriptors inside BODC dictionaries.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-4 block">Starts: July 1, 2026</span>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider block mb-1">02 / Technical Event</span>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Valkyrie Deployment Seminar</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  A hands-on workshop covering self-hosting setup via Docker, SQLite replicas, and consuming W3C SKOS compliant feeds.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-4 block">Event: August 14, 2026</span>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider block mb-1">03 / Community Engagement</span>
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
