import React from 'react';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <img 
        src={user?.avatar} 
        alt="Profile" 
        className="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-white dark:border-slate-700 shadow-lg"
      />
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{user?.name}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">@{user?.username}</p>
      
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-6 rounded-xl">
        <p className="text-yellow-800 dark:text-yellow-200">
          <strong>Work in Progress:</strong> The profile editing and advanced history features are currently under development. 
          Please check back later!
        </p>
      </div>
    </div>
  );
};

export default Profile;
