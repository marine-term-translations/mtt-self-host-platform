import React, { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { backendApi } from '../services/api';
import InvitationsModal from './InvitationsModal';

const InvitationsButton: React.FC = () => {
  const [invitationCount, setInvitationCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInvitationCount = async () => {
    try {
      const invitations = await backendApi.get<any[]>('/invitations');
      setInvitationCount(invitations.length);
    } catch (error) {
      console.error('Failed to fetch invitations count:', error);
      setInvitationCount(0);
    }
  };

  useEffect(() => {
    fetchInvitationCount();
    
    // Poll for new invitations every 30 seconds
    const interval = setInterval(fetchInvitationCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleInvitationUpdate = () => {
    // Refresh count after accepting/declining
    fetchInvitationCount();
  };

  return (
    <>
      {/* Invitations box widget - top right, hidden on mobile */}
      <div className="hidden md:block fixed top-20 right-6 z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg hover:shadow-xl transition-all hover:border-marine-400 dark:hover:border-marine-600 group"
          aria-label="View community invitations"
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-marine-100 dark:bg-marine-900/30 flex items-center justify-center">
              <Mail className="text-marine-600 dark:text-marine-400" size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Invitations
              </div>
              {invitationCount > 0 ? (
                <div className="text-xs text-marine-600 dark:text-marine-400 font-medium">
                  {invitationCount} pending
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  No pending
                </div>
              )}
            </div>
          </div>
          {invitationCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              {invitationCount > 9 ? '9+' : invitationCount}
            </span>
          )}
        </button>
      </div>

      <InvitationsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onInvitationUpdate={handleInvitationUpdate}
      />
    </>
  );
};

export default InvitationsButton;
