import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-9xl font-bold text-marine-100 dark:text-slate-800">404</h1>
      <div className="absolute">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Lost at Sea?</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">The page you are looking for doesn't exist.</p>
        <Link to="/" className="px-6 py-2 bg-marine-600 text-white rounded-lg hover:bg-marine-700 transition-colors">
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
