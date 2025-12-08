import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Waves, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register: React.FC = () => {
  const { login, isAuthenticated } = useAuth();

  const handleRegister = () => {
    login(); // This will redirect to ORCID OAuth
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-900 px-4 py-8">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-marine-50 dark:bg-marine-900 text-marine-600 dark:text-marine-400 mb-4">
            <Waves size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create an account</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Join the community to start translating</p>
        </div>

        <div className="space-y-6">
          <div className="bg-marine-50 dark:bg-marine-900/20 border border-marine-200 dark:border-marine-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-marine-600 dark:text-marine-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <p className="font-semibold mb-2">Authentication via ORCID</p>
                <p className="mb-2">
                  This platform uses ORCID iD for authentication. ORCID provides a persistent digital identifier 
                  that distinguishes you from other researchers and supports automated linkages between you and 
                  your professional activities.
                </p>
                <p>
                  When you sign in with ORCID, you'll be automatically registered on the platform.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleRegister}
            className="w-full flex items-center justify-center py-3 px-4 bg-[#609926] hover:bg-[#508020] text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow active:scale-95"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 256 256" fill="currentColor">
              <path d="M256,128 C256,198.7 198.7,256 128,256 C57.3,256 0,198.7 0,128 C0,57.3 57.3,0 128,0 C198.7,0 256,57.3 256,128 Z M76.9,108.4 C76.9,96.3 86.8,86.3 98.9,86.3 C111,86.3 120.9,96.3 120.9,108.4 C120.9,120.5 111,130.4 98.9,130.4 C86.8,130.4 76.9,120.5 76.9,108.4 Z M135.1,108.4 C135.1,96.3 145,86.3 157.1,86.3 C169.2,86.3 179.1,96.3 179.1,108.4 C179.1,120.5 169.2,130.4 157.1,130.4 C145,130.4 135.1,120.5 135.1,108.4 Z M128,180 C154.5,180 176.2,158.3 176.2,131.8 L79.8,131.8 C79.8,158.3 101.5,180 128,180 Z"/>
            </svg>
            Register with ORCID
          </button>

          <div className="space-y-3 text-sm">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <p className="font-semibold text-slate-900 dark:text-white mb-1">Don't have an ORCID iD?</p>
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                Registration is free and takes only a few minutes.
              </p>
              <a 
                href="https://orcid.org/register" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-marine-600 hover:text-marine-700 dark:text-marine-400 font-medium"
              >
                Create your ORCID iD →
              </a>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <p className="font-semibold text-slate-900 dark:text-white mb-1">Why ORCID?</p>
              <ul className="text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                <li>Secure, widely adopted in research</li>
                <li>No need to remember another password</li>
                <li>Your credentials stay with ORCID</li>
                <li>Works across 1000s of research platforms</li>
              </ul>
            </div>
          </div>

          <div className="text-center text-sm pt-4 border-t border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Already have an account? </span>
            <Link to="/login" className="font-medium text-marine-600 hover:text-marine-500">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;