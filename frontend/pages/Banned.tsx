import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Mail } from 'lucide-react';

const Banned: React.FC = () => {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') || 'No reason provided';
  const bannedAt = searchParams.get('banned_at');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 md:p-12">
        <div className="text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
              <Shield className="w-16 h-16 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Account Suspended
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
            Your account has been suspended and you cannot access the platform at this time.
          </p>

          {/* Ban Details */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Suspension Details
            </h2>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reason:</span>
                <p className="mt-1 text-slate-900 dark:text-white">{reason}</p>
              </div>
              
              {bannedAt && (
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Date:</span>
                  <p className="mt-1 text-slate-900 dark:text-white">
                    {new Date(bannedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Appeal Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center justify-center gap-2">
              <Mail className="w-5 h-5" />
              Appeal Your Suspension
            </h2>
            <p className="text-blue-800 dark:text-blue-200 mb-4">
              If you believe this suspension was made in error or would like to appeal, please contact our support team.
            </p>
            <a
              href="mailto:opsci@vliz.be"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200"
            >
              <Mail className="w-4 h-4" />
              Contact Support (opsci@vliz.be)
            </a>
          </div>

          {/* Additional Info */}
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your account data remains secure. Any suspension can be reviewed and potentially reversed after investigation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Banned;
