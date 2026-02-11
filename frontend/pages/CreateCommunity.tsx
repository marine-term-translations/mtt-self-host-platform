import React, { useState } from 'react';
import { Users, ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { backendApi } from '../services/api';
import toast from 'react-hot-toast';

const CreateCommunity: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    access_type: 'open' as 'open' | 'invite_only'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Community name is required');
      return;
    }
    
    try {
      setLoading(true);
      const response = await backendApi.post('/communities', formData);
      toast.success('Community created successfully!');
      navigate(`/communities/${response.community_id}`);
    } catch (error: any) {
      console.error('Failed to create community:', error);
      toast.error(error.response?.data?.error || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/communities"
          className="inline-flex items-center gap-2 text-marine-600 dark:text-marine-400 hover:underline mb-6"
        >
          <ArrowLeft size={20} />
          Back to Communities
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">
              <Users size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Community</h1>
              <p className="text-slate-600 dark:text-slate-400">Build a space for translators to collaborate</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Community Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={100}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
                placeholder="e.g., Marine Biology Translators"
                required
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formData.name.length}/100 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-marine-500"
                placeholder="Describe the purpose of your community..."
              />
            </div>

            {/* Access Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Access Type
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border-2 border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-marine-500 dark:hover:border-marine-400 transition-colors">
                  <input
                    type="radio"
                    name="access_type"
                    value="open"
                    checked={formData.access_type === 'open'}
                    onChange={(e) => setFormData({ ...formData, access_type: e.target.value as 'open' })}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Open Community</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Anyone can join without approval</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-marine-500 dark:hover:border-marine-400 transition-colors">
                  <input
                    type="radio"
                    name="access_type"
                    value="invite_only"
                    checked={formData.access_type === 'invite_only'}
                    onChange={(e) => setFormData({ ...formData, access_type: e.target.value as 'invite_only' })}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Invite Only</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Members must be invited by you</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/communities')}
                className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-marine-600 hover:bg-marine-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users size={20} />
                    Create Community
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCommunity;
