import React, { useEffect, useState } from 'react';
import { backendApi } from '../../services/api';
import { ApiPublicUser } from '../../types';
import { Search, ArrowLeft, Loader2, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { parse, format } from '../../utils/datetime';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<ApiPublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await backendApi.getUsers();
        setUsers(data);
      } catch (error) {
        toast.error("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h1>
           <p className="text-slate-600 dark:text-slate-400 mt-1">View and manage registered contributors.</p>
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
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reputation</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined</th>
                   <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                 </tr>
               </thead>
               <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                 {filteredUsers.map((user) => (
                   <tr key={user.username} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center">
                         <div className="flex-shrink-0 h-10 w-10">
                           <img className="h-10 w-10 rounded-full" src={`https://ui-avatars.com/api/?name=${user.username}&background=0ea5e9&color=fff`} alt="" />
                         </div>
                         <div className="ml-4">
                           <div className="text-sm font-medium text-slate-900 dark:text-white">{user.username}</div>
                         </div>
                       </div>
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
                       <button className="text-slate-400 hover:text-marine-600 transition-colors">
                          <MoreVertical size={18} />
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;