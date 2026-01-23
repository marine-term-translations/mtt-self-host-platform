import React, { useEffect, useState } from 'react';
import { backendApi } from '../../services/api';
import { ApiPublicUser } from '../../types';
import { Search, ArrowLeft, Loader2, Shield, ShieldOff, Ban, CheckCircle, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { parse, format } from '@/src/utils/datetime';
import { useAuth } from '../../context/AuthContext';

interface AdminUser extends ApiPublicUser {
  extra_parsed?: {
    is_admin?: boolean;
    is_superadmin?: boolean;
    is_banned?: boolean;
    ban_reason?: string;
    name?: string;
  };
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [banningUser, setBanningUser] = useState<number | null>(null);
  const [banReason, setBanReason] = useState('');
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const data = await backendApi.getAdminUsers();
      // Backend already parses extra field, just use it directly
      const parsedUsers = data.map((u: any) => ({
        ...u,
        extra_parsed: typeof u.extra === 'string' ? JSON.parse(u.extra) : (u.extra || {})
      }));
      setUsers(parsedUsers);
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePromote = async (userId: number) => {
    try {
      await backendApi.promoteUser(userId);
      toast.success("User promoted to admin");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to promote user");
    }
  };

  const handleDemote = async (userId: number) => {
    try {
      await backendApi.demoteUser(userId);
      toast.success("User demoted from admin");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to demote user");
    }
  };

  const handleBan = async (userId: number) => {
    if (!banReason.trim()) {
      toast.error("Please provide a ban reason");
      return;
    }
    try {
      await backendApi.banUser(userId, banReason);
      toast.success("User banned");
      setBanningUser(null);
      setBanReason('');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to ban user");
    }
  };

  const handleUnban = async (userId: number) => {
    try {
      await backendApi.unbanUser(userId);
      toast.success("User unbanned");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to unban user");
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.extra_parsed?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h1>
           <p className="text-slate-600 dark:text-slate-400 mt-1">Manage user roles, permissions, and bans.</p>
        </div>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-slate-400" size={18} />
            </div>
            <input 
                type="text" 
                placeholder="Search users..." 
                className="pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
           <div className="p-12 flex justify-center">
               <Loader2 className="animate-spin text-marine-500" size={32} />
           </div>
        ) : (
           <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
               <thead className="bg-slate-50 dark:bg-slate-900/50">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reputation</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined</th>
                   <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                 </tr>
               </thead>
               <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                 {filteredUsers.map((user) => {
                   const isSuperAdmin = user.extra_parsed?.is_superadmin;
                   const isAdmin = user.extra_parsed?.is_admin;
                   const isBanned = user.extra_parsed?.is_banned;
                   const canModify = !isSuperAdmin && currentUser?.id !== user.id;

                   return (
                     <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center">
                           <div className="flex-shrink-0 h-10 w-10">
                             <img className="h-10 w-10 rounded-full" src={`https://ui-avatars.com/api/?name=${user.username}&background=0ea5e9&color=fff`} alt="" />
                           </div>
                           <div className="ml-4">
                             <div className="text-sm font-medium text-slate-900 dark:text-white">
                               {user.extra_parsed?.name || user.username}
                             </div>
                             <div className="text-sm text-slate-500 dark:text-slate-400">{user.username}</div>
                           </div>
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         {isSuperAdmin ? (
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                             <Crown size={12} className="mr-1" /> Superadmin
                           </span>
                         ) : isAdmin ? (
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                             <Shield size={12} className="mr-1" /> Admin
                           </span>
                         ) : (
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                             User
                           </span>
                         )}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         {isBanned ? (
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" title={user.extra_parsed?.ban_reason}>
                             <Ban size={12} className="mr-1" /> Banned
                           </span>
                         ) : (
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                             <CheckCircle size={12} className="mr-1" /> Active
                           </span>
                         )}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.reputation < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                              {user.reputation}
                          </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {format(parse(user.joined_at), 'YYYY-MM-DD')}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                         <div className="flex items-center justify-end gap-2">
                           {canModify && !isBanned && !isAdmin && (
                             <button
                               onClick={() => handlePromote(user.id)}
                               className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                               title="Promote to Admin"
                             >
                               <Shield size={18} />
                             </button>
                           )}
                           {canModify && !isBanned && isAdmin && (
                             <button
                               onClick={() => handleDemote(user.id)}
                               className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300"
                               title="Demote from Admin"
                             >
                               <ShieldOff size={18} />
                             </button>
                           )}
                           {canModify && !isBanned && (
                             <button
                               onClick={() => setBanningUser(user.id)}
                               className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                               title="Ban User"
                             >
                               <Ban size={18} />
                             </button>
                           )}
                           {canModify && isBanned && (
                             <button
                               onClick={() => handleUnban(user.id)}
                               className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                               title="Unban User"
                             >
                               <CheckCircle size={18} />
                             </button>
                           )}
                           {!canModify && (
                             <span className="text-xs text-slate-400">
                               {isSuperAdmin ? 'Protected' : 'You'}
                             </span>
                           )}
                         </div>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
        )}
      </div>

      {/* Ban User Dialog */}
      {banningUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Ban User</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Please provide a reason for banning this user. This will be shown to them when they try to log in.
            </p>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-marine-500 outline-none"
              rows={4}
              placeholder="Reason for ban..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setBanningUser(null);
                  setBanReason('');
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBan(banningUser)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;