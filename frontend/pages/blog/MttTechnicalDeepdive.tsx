import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Player } from '@remotion/player';
import { BlogSummaryVideo } from '../../components/blog/BlogSummaryVideo';
import SplineScene from '../../components/SplineScene';
import { Calendar, Clock, ArrowLeft, Anchor, Cpu, Database, Share2, Layers, Server, Shield, Sparkles } from 'lucide-react';

const MttTechnicalDeepdive: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  // Remotion video properties (standardized sky-500/amber-500 color scheme)
  const videoProps = {
    title: "MTT Technical Deepdive",
    author: "Cedric Decruw",
    authorRole: "Software Engineer",
    introText: "An in-depth look at the architecture of the Marine Term Translations platform, exploring the Docker-compose stack, Vite + React frontend, Express.js backend, and SQLite database.",
    features: [
      "Vite + React: Modular SPA frontend using TypeScript",
      "Express API: Session cookie auth + SQLite data storage",
      "W3C Standards: SKOS, JSON-LD & dynamic LDES feeds"
    ],
    ctaText: "Explore the documentation and codebase to deploy your own self-hosted Marine Term Translation instance.",
    primaryColor: "#0ea5e9", // sky-500
    accentColor: "#f59e0b",  // amber-500
  };

  // Custom fonts injection
  const fontsStyle = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    
    .font-jetbrains {
      font-family: 'JetBrains Mono', monospace;
    }
    
    .font-plex {
      font-family: 'IBM Plex Sans', sans-serif;
    }
  `;

  const steps = [
    {
      title: "Client Submission",
      subtitle: "Frontend SPA Layer",
      icon: Layers,
      description: "The user submits a translation mapping. The client SPA packages the NERC vocabulary ID, translated label, and language code, sending it to the backend via an authenticated REST request.",
      code: `// frontend/src/services/api.ts
async function submitTranslation(data: TranslationPayload) {
  const response = await axios.post("/api/translations", data, {
    withCredentials: true // Sends secure HttpOnly session cookies
  });
  return response.data;
}`
    },
    {
      title: "Session Verification",
      subtitle: "Express Auth Interceptor",
      icon: Shield,
      description: "The Node/Express backend interceptor validates the session cookie against the user’s ORCID session profile, checks permission levels, and ensures request safety.",
      code: `// backend/src/middleware/auth.ts
export function verifySession(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.cookies["session_id"];
  const user = sessionStore.get(sessionToken);
  if (!user) {
    return res.status(401).json({ error: "Session invalid" });
  }
  req.user = user; // Attach role & ORCID context
  next();
}`
    },
    {
      title: "SQLite Persist",
      subtitle: "Database Transaction",
      icon: Database,
      description: "The controller executes an atomic SQL write. Prepared database statements are used to safely sanitize inputs and append the translation record into the local SQLite database.",
      code: `// backend/src/services/db.service.js
const stmt = db.prepare(\`
  INSERT INTO translations (term_id, original_text, translated_text, lang_code, user_orcid, created_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
\`);
const info = stmt.run(termId, original, translated, lang, user.orcid);`
    },
    {
      title: "LDES Event Output",
      subtitle: "Linked Data Event Streams",
      icon: Share2,
      description: "The database changes trigger a Linked Data Event Streams (LDES) feed. External crawlers harvest this feed in real-time as W3C SKOS JSON-LD, exposing translations globally.",
      code: `// backend/src/controllers/ldes.controller.js
function getLdesFeed(req, res) {
  const events = db.query("SELECT * FROM translations ORDER BY created_at DESC");
  const ldes = events.map(e => ({
    "@context": "http://www.w3.org/2004/02/skos/core#",
    "@id": \`https://mtt.org/events/\${e.id}\`,
    "type": "skos:ConceptMapping",
    "subject": e.term_id,
    "prefLabel": { "@value": e.translated_text, "@language": e.lang_code }
  }));
  res.json({ "@graph": ldes });
}`
    }
  ];

  const ActiveStepIcon = steps[activeStep].icon;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-plex dark:bg-slate-950 min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: fontsStyle }} />

      {/* Back button */}
      <Link 
        to="/blog" 
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-marine-600 dark:hover:text-marine-400 mb-8 transition-colors group cursor-pointer"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to blog
      </Link>

      {/* Article Header */}
      <header className="mb-12">
        <span className="inline-block px-3 py-1 text-xs font-bold font-jetbrains uppercase tracking-wider text-marine-600 dark:text-marine-400 bg-marine-50/50 dark:bg-marine-950/40 border border-marine-200 dark:border-marine-800 rounded-lg mb-4">
          Technology & Engineering
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6 font-sans">
          Under the Hood: A Technical Deep Dive into the Marine Term Translations Platform
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
              <div className="text-xs text-slate-500 dark:text-slate-400 font-jetbrains">{videoProps.authorRole}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><Calendar size={14} /> June 9, 2026</span>
            <span className="flex items-center gap-1"><Clock size={14} /> 5 min read</span>
          </div>
        </div>
      </header>

      {/* Remotion Video Summary Embed - Extended to 18s (540 frames) */}
      <section className="mb-16">
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-800">
          <Player
            component={BlogSummaryVideo}
            inputProps={videoProps}
            durationInFrames={540} // 18 seconds at 30 fps
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
      <article className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed space-y-16">
        
        {/* Quote Block summary */}
        <div className="relative p-6 md:p-8 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border-l-4 border-marine-500 shadow-lg">
          <span className="absolute top-2 right-4 text-6xl text-slate-200 dark:text-slate-800 font-serif pointer-events-none select-none">“</span>
          <p className="text-lg font-medium text-slate-700 dark:text-slate-200 italic mb-2 leading-relaxed">
            "{videoProps.introText}"
          </p>
        </div>

        <p className="text-base md:text-lg">
          The Marine Term Translations (MTT) platform is built to make marine data FAIR (Findable, Accessible, Interoperable, and Reusable). By orchestrating a modular stack of Docker containers, SQLite database migrations, and a Vite-powered single-page frontend, MTT delivers a self-hosted environment giving organizations absolute sovereignty over their semantic mapping assets.
        </p>

        {/* Section 1: Frontend - Grid Layout with Image Left */}
        <section className="my-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Image (Transparent-backed, medium sized) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-2xl p-4 bg-slate-900/10 border border-slate-200/5 dark:border-slate-800/10 shadow-lg">
                <img 
                  src="/mtt_frontend_architecture.png" 
                  alt="Client Layer Engine Architecture Diagram" 
                  className="w-full h-auto object-cover filter drop-shadow-[0_10px_15px_rgba(14,165,233,0.15)]"
                />
              </div>
            </div>

            {/* Right: Content */}
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 font-jetbrains">
                <Layers className="text-marine-500" size={26} /> Section 1: The Client Layer (Vite + React + TS)
              </h2>
              <p className="text-base font-plex leading-relaxed">
                The frontend application is structured as a client-side Single Page Application (SPA). By leveraging the build speed of Vite and the typing safety of TypeScript, development cycles remain fast and reliable.
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 font-jetbrains mb-3 uppercase tracking-wider">Key Client Capabilities:</h4>
                <ul className="list-none pl-0 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <span className="text-marine-500 mt-1">✦</span> 
                    <span><strong>Dynamic Tailwind CSS Ingestion:</strong> To support single-file distributions and lightweight deployment environments, Tailwind CSS is loaded from a CDN. Custom configurations are loaded dynamically to allow seamless dark/light theme switching.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-marine-500 mt-1">✦</span> 
                    <span><strong>Context-Driven State:</strong> Driven by React Hooks and shared global contexts (such as `AuthContext` for ORCID sessions).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-marine-500 mt-1">✦</span> 
                    <span><strong>Responsive Graphs:</strong> Incorporates responsive charts via `Recharts` to plot translation statistics and contributors dashboard metrics.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Wave Intersection with Pufferfish (silently integrated) */}
        <section className="my-20 relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-marine-900 to-slate-950 p-8 border border-slate-200 dark:border-slate-800 shadow-2xl min-h-[360px] flex flex-col md:flex-row items-center gap-8 z-10">
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes move-forever {
              0% { transform: translate3d(-90px,0,0); }
              100% { transform: translate3d(85px,0,0); }
            }
            .parallax-deepdive > use {
              animation: move-forever 25s cubic-bezier(.55,.5,.45,.5) infinite;
            }
            .parallax-deepdive > use:nth-child(1) { animation-delay: -2s; animation-duration: 7s; }
            .parallax-deepdive > use:nth-child(2) { animation-delay: -3s; animation-duration: 10s; }
            .parallax-deepdive > use:nth-child(3) { animation-delay: -4s; animation-duration: 13s; }
            .parallax-deepdive > use:nth-child(4) { animation-delay: -5s; animation-duration: 20s; }
          `}} />
          
          <div className="md:w-1/2 relative z-10 text-slate-100">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-2 font-jetbrains">Community Symbol</span>
            <h3 className="text-3xl font-extrabold text-white mb-4 font-jetbrains leading-tight">
              Interactive Ocean Interface
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Decentralized translations foster open scientific collaboration. Interact with the 3D model on the right to explore the ambient ocean theme.
            </p>
          </div>
          
          <div className="md:w-1/2 w-full h-[280px] md:h-[320px] relative rounded-2xl overflow-hidden bg-slate-950/40 border border-white/10 shadow-inner z-10">
            <SplineScene 
              scene="https://prod.spline.design/wwCXhQqYsmd8fJZw/scene.splinecode" 
            />
          </div>

          {/* Layered Animated Waves Divider */}
          <div className="absolute bottom-0 left-0 w-full h-[60px] z-0 pointer-events-none opacity-40">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
              <defs>
                <path id="gentle-wave-deepdive" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
              </defs>
              <g className="parallax-deepdive">
                <use xlinkHref="#gentle-wave-deepdive" x="48" y="0" fill="rgba(255,255,255,0.15)" />
                <use xlinkHref="#gentle-wave-deepdive" x="48" y="3" fill="rgba(255,255,255,0.25)" />
                <use xlinkHref="#gentle-wave-deepdive" x="48" y="5" fill="rgba(255,255,255,0.2)" />
                <use xlinkHref="#gentle-wave-deepdive" x="48" y="7" fill="rgba(255,255,255,0.3)" />
              </g>
            </svg>
          </div>
        </section>

        {/* Section 2: Backend & Database - Grid Layout with Image Left */}
        <section className="my-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Image (Transparent-backed, medium sized) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-2xl p-4 bg-slate-900/10 border border-slate-200/5 dark:border-slate-800/10 shadow-lg">
                <img 
                  src="/mtt_backend_architecture.png" 
                  alt="Backend and Data Layer Architecture Diagram" 
                  className="w-full h-auto object-cover filter drop-shadow-[0_10px_15px_rgba(245,158,11,0.15)]"
                />
              </div>
            </div>

            {/* Right: Content */}
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 font-jetbrains">
                <Server className="text-teal-500" size={26} /> Section 2: Backend API & Data Layer (Express + SQLite)
              </h2>
              <p className="text-base font-plex leading-relaxed">
                The API layer runs inside a separate container node running Node.js and Express. The backend provides secure controllers and services to interface with SQLite database storage.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit">
                    <Shield size={20} />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg font-jetbrains">Session Security</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    MTT integrates ORCID OAuth sign-in, maintaining access sessions through secure HttpOnly cookies. Roles like <code className="font-mono text-indigo-500 text-xs px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">is_admin</code> dictate control permissions.
                  </p>
                </div>

                <div className="p-6 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
                  <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-xl w-fit">
                    <Database size={20} />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg font-jetbrains">SQLite Migration Stack</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    The db file resides in <code className="font-mono text-teal-600 text-xs px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">backend/data/translations.db</code>. An automated migration runner applies incremental SQL files on startup.
                  </p>
                </div>
              </div>

              <p className="text-base">
                To make data harvestable, translations can be exported dynamically as Linked Data Event Streams (LDES) conforming to W3C standards (SKOS, JSON-LD), creating real-time telemetry pipelines feeding public marine search indexes.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Interactive Request Lifecycle (Stepped Component) */}
        <section className="my-20 border-t border-slate-200 dark:border-slate-800 pt-16">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold font-jetbrains uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg mb-3">
              <Sparkles size={12} /> Interactive Walkthrough
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white font-jetbrains">
              Data Pipeline & Request Lifecycle
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Click through the pipeline stages below to trace how a translation proposal flows from the client form to the global semantic Web.
            </p>
          </div>

          {/* Stepper Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = activeStep === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left group cursor-pointer ${
                    isActive
                      ? 'bg-sky-600 border-sky-500 text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg mb-3 transition-colors ${
                    isActive 
                      ? 'bg-white/10 text-white' 
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-sky-500'
                  }`}>
                    <StepIcon size={18} />
                  </div>
                  <span className={`text-[10px] font-bold font-jetbrains uppercase tracking-wider ${
                    isActive ? 'text-sky-100' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {step.subtitle}
                  </span>
                  <span className={`text-sm font-bold mt-1 ${
                    isActive ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Step Display Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
            <div className="flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-marine-500 dark:text-marine-400 font-bold uppercase tracking-wider block mb-1">
                  Active Phase // {steps[activeStep].subtitle}
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white font-jetbrains flex items-center gap-2">
                  <ActiveStepIcon size={20} className="text-marine-500" /> {steps[activeStep].title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-4">
                  {steps[activeStep].description}
                </p>
              </div>
              
              <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-4 flex items-center gap-2 text-xs font-jetbrains text-slate-500 dark:text-slate-400">
                <Sparkles size={14} className="text-amber-500" /> Click navigation elements above to explore.
              </div>
            </div>

            {/* Code Block */}
            <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Source Implementation</span>
                <span className="w-2.5 h-2.5 rounded-full bg-marine-500" />
              </div>
              <pre className="p-4 overflow-x-auto text-[11px] font-mono text-teal-400 leading-normal flex-1">
                <code>{steps[activeStep].code}</code>
              </pre>
            </div>
          </div>
        </section>

      </article>

      {/* Bottom Navigation */}
      <footer className="mt-20 pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <Link 
          to="/blog" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-marine-600 dark:hover:text-marine-400 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} /> All articles
        </Link>
        <span className="text-xs text-slate-400">Published by Cedric Decruw</span>
      </footer>
    </div>
  );
};

export default MttTechnicalDeepdive;
