import React from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Waves } from 'lucide-react';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleLogin = async () => {
    try {
      await login();
      toast.success("Successfully signed in!");
      navigate(from, { replace: true });
    } catch (error) {
      toast.error("Failed to sign in. Please try again.");
    }
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
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#609926] hover:bg-[#508020] text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
                <svg viewBox="0 0 32 32" className="w-6 h-6 fill-current" aria-hidden="true">
                    <path d="M16.096.064C7.035.064 0 7.373 0 16.79c0 7.373 4.606 13.633 11.006 15.86.83.155 1.127-.37 1.127-.817 0-.404-.017-1.74-.017-3.155-4.475.996-5.42-2.22-5.42-2.22-.756-1.99-1.847-2.52-1.847-2.52-1.464-1.03.116-1.01.116-1.01 1.62.115 2.472 1.705 2.472 1.705 1.44 2.535 3.763 1.804 4.69 1.38.15-1.07.563-1.803 1.025-2.22-3.57-.414-7.323-1.838-7.323-8.19 0-1.803.63-3.287 1.67-4.447-.166-.414-.73-2.105.166-4.38 0 0 1.357-.448 4.458 1.722 1.29-.365 2.682-.547 4.056-.547 1.375 0 2.767.182 4.057.547 3.1-2.17 4.457-1.722 4.457-1.722.896 2.275.332 3.966.166 4.38 1.043 1.16 1.67 2.645 1.67 4.448 0 6.368-3.768 7.768-7.355 8.173.58.514 1.11 1.54 1.11 3.106 0 2.238-.017 4.05-.017 4.596 0 .448.3.98 1.144.812C27.307 30.406 32 24.153 32 16.79 32 7.373 24.965.064 16.096.064z" />
                </svg>
            )}
            Sign in with Gitea
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">For demonstration only</span>
            </div>
          </div>
          
          <p className="text-xs text-center text-slate-400">
            Clicking sign in will create a local mock session. No real data is sent to Gitea.
          </p>

          <div className="pt-4 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-marine-600 hover:text-marine-500">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;