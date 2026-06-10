import React from 'react';
import { Link } from 'react-router-dom';
import { blogRegistry } from '../../src/blogRegistry';
import { BookOpen, Calendar, Clock, User, ArrowRight } from 'lucide-react';

const BlogIndex: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header Section with elegant typography and shapes */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-marine-950 to-slate-900 text-white p-8 md:p-12 mb-12 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-marine-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-marine-500/20 text-marine-300 text-xs font-semibold mb-6 border border-marine-500/30">
            <BookOpen size={14} /> Platform Updates & News
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white font-sans">
            The Marine Term Translations Blog
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Read about our latest releases, technical achievements, and guides on how we make marine data FAIR and globally interoperable.
          </p>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogRegistry.map((post) => (
          <Link 
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="group flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl hover:border-marine-500 dark:hover:border-marine-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
            {/* Header placeholder / category banner */}
            <div className="h-48 bg-gradient-to-br from-marine-900 to-slate-900 relative p-6 flex flex-col justify-between overflow-hidden">
              {/* Floating waves simulation in cover */}
              <div className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full bg-marine-500/10 blur-xl group-hover:bg-marine-500/20 transition-all pointer-events-none" />
              
              <span className="self-start px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-teal-300 bg-teal-950/40 border border-teal-500/30 rounded-lg">
                {post.category}
              </span>
              
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                <Calendar size={12} />
                <span>{post.date}</span>
                <span className="mx-1">•</span>
                <Clock size={12} />
                <span>{post.readTime}</span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-grow p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 leading-snug group-hover:text-marine-600 dark:group-hover:text-marine-400 transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed mb-6">
                  {post.summary}
                </p>
              </div>

              {/* Author Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <img 
                    src={post.authorAvatar} 
                    alt={post.author} 
                    className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-600"
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{post.author}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{post.authorRole}</div>
                  </div>
                </div>
                
                <span className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-full group-hover:bg-marine-50 dark:group-hover:bg-marine-950/50 text-slate-400 group-hover:text-marine-500 transition-colors">
                  <ArrowRight size={18} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BlogIndex;
