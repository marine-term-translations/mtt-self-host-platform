import React, { useEffect } from 'react';
import { Navigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Waves, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    // Check for error in query params (from OAuth callback)
    const error = searchParams.get('error');
    const reason = searchParams.get('reason');
    
    if (error) {
      if (error === 'invalid_state') {
        toast.error('Invalid authentication state. Please try again.');
      } else if (error === 'orcid_failed') {
        toast.error('ORCID authentication failed. Please try again.');
      } else if (error === 'user_banned') {
        const banReason = reason ? decodeURIComponent(reason) : 'No reason provided';
        toast.error(`Your account has been banned. Reason: ${banReason}`, {
          duration: 8000,
          icon: '🚫'
        });
      }
    }
  }, [searchParams]);

  const handleLogin = () => {
    login(); // This will redirect to ORCID OAuth
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-marine-50 dark:bg-marine-900 text-marine-600 dark:text-marine-400 mb-6">
            <Waves size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Sign in to contribute to Marine Term Translations</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center py-3 px-4 bg-[#609926] hover:bg-[#508020] text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow active:scale-95"
          >
            <img
              src="/orcid.svg"
              alt="ORCID"
              className="w-5 h-5 mr-2"
            />
            Sign in with ORCID
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">
                Secure authentication via ORCID iD
              </span>
            </div>
          </div>

          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
            <div className="flex items-start">
              <AlertCircle size={16} className="mt-0.5 mr-2 flex-shrink-0 text-marine-600" />
              <p>ORCID provides a persistent identifier for researchers worldwide.</p>
            </div>
            <div className="flex items-start">
              <AlertCircle size={16} className="mt-0.5 mr-2 flex-shrink-0 text-marine-600" />
              <p>Your credentials are never shared with this application.</p>
            </div>
          </div>
        </div>
        
        <div className="pt-2 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Don't have an ORCID iD?{' '}
            <a 
              href="https://orcid.org/register" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium text-marine-600 hover:text-marine-500"
            >
              Register for free
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;