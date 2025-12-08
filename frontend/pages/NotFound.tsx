
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4 overflow-hidden bg-slate-50 dark:bg-slate-900">
      
      {/* Background Illustration - Puffer Fish */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5 dark:opacity-10 mix-blend-multiply dark:mix-blend-overlay">
         <img 
            src="" 
            alt="Puffer fish background" 
            className="w-[600px] md:w-[800px] h-auto max-w-none grayscale"
         />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-lg mx-auto">
        <h1 className="text-9xl font-black text-marine-200 dark:text-slate-800 mb-4 opacity-50 dark:opacity-50 select-none">
          404
        </h1>
        
        <div className="-mt-12 space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
            Lost at Sea?
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            The page you are looking for seems to have drifted away or doesn't exist in our charts.
          </p>
          
          <div className="flex justify-center gap-4">
             <Link 
              to="/" 
              className="px-6 py-3 bg-marine-600 text-white rounded-xl hover:bg-marine-700 transition-all shadow-lg hover:shadow-marine-500/25 flex items-center font-medium"
            >
               <ArrowLeft size={18} className="mr-2" /> Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
