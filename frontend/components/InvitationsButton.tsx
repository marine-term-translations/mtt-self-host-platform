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
      {/* Floating button - hidden on mobile */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="hidden md:flex fixed bottom-6 right-6 z-40 w-14 h-14 bg-marine-600 hover:bg-marine-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all items-center justify-center group"
        aria-label="View community invitations"
      >
        <Mail size={24} className="group-hover:scale-110 transition-transform" />
        {invitationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
            {invitationCount > 9 ? '9+' : invitationCount}
          </span>
        )}
      </button>

      <InvitationsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onInvitationUpdate={handleInvitationUpdate}
      />
    </>
  );
};

export default InvitationsButton;
