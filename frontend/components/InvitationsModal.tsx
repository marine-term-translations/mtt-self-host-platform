import React, { useEffect, useState } from 'react';
import { X, Mail, Users, Check, XIcon, Loader2 } from 'lucide-react';
import { backendApi } from '../services/api';
import toast from 'react-hot-toast';

interface Invitation {
  id: number;
  community_id: number;
  community_name: string;
  community_description: string;
  community_access_type: string;
  community_member_count: number;
  invited_by_username: string;
  created_at: string;
}

interface InvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvitationUpdate?: () => void;
}

const InvitationsModal: React.FC<InvitationsModalProps> = ({ isOpen, onClose, onInvitationUpdate }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchInvitations();
    }
  }, [isOpen]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const data = await backendApi.get<Invitation[]>('/invitations');
      setInvitations(data);
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: number) => {
    try {
      setProcessingIds(prev => new Set(prev).add(invitationId));
      await backendApi.post(`/invitations/${invitationId}/accept`);
      toast.success('Invitation accepted!');
      
      // Remove the accepted invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      // Notify parent component to refresh data if needed
      if (onInvitationUpdate) {
        onInvitationUpdate();
      }
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      toast.error(error.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  const handleDecline = async (invitationId: number) => {
    try {
      setProcessingIds(prev => new Set(prev).add(invitationId));
      await backendApi.post(`/invitations/${invitationId}/decline`);
      toast.success('Invitation declined');
      
      // Remove the declined invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      // Notify parent component to refresh data if needed
      if (onInvitationUpdate) {
        onInvitationUpdate();
      }
    } catch (error: any) {
      console.error('Failed to decline invitation:', error);
      toast.error(error.response?.data?.error || 'Failed to decline invitation');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-marine-100 dark:bg-marine-900/30 flex items-center justify-center">
              <Mail className="text-marine-600 dark:text-marine-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Community Invitations
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {invitations.length} pending {invitations.length === 1 ? 'invitation' : 'invitations'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-marine-600 dark:text-marine-400" size={32} />
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <Mail className="text-slate-400" size={32} />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No pending invitations
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You don't have any community invitations at the moment
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => {
                const isProcessing = processingIds.has(invitation.id);
                
                return (
                  <div
                    key={invitation.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-marine-300 dark:hover:border-marine-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="text-marine-600 dark:text-marine-400" size={18} />
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {invitation.community_name}
                          </h3>
                          {invitation.community_access_type === 'invite_only' && (
                            <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                              Invite Only
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {invitation.community_description || 'No description provided'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span>Invited by @{invitation.invited_by_username}</span>
                          <span>•</span>
                          <span>{invitation.community_member_count} {invitation.community_member_count === 1 ? 'member' : 'members'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(invitation.id)}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-marine-600 hover:bg-marine-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {isProcessing ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <Check size={16} />
                            Accept
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDecline(invitation.id)}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {isProcessing ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <XIcon size={16} />
                            Decline
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitationsModal;
