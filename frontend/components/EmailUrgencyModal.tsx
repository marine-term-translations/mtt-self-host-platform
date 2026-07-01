import React, { useState } from 'react';
import { Mail, AlertCircle, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CONFIG } from '../config';
import toast from 'react-hot-toast';

interface EmailUrgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EmailUrgencyModal: React.FC<EmailUrgencyModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUserEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Saving your email address...');

    try {
      const response = await fetch(`${CONFIG.API_URL}/user/preferences/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: trimmedEmail,
          emailOnDiscussion: true,
          emailOnStatusChange: true,
          emailDigestFrequency: 'weekly',
          emailTone: 'casual'
        })
      });

      toast.dismiss(loadingToast);

      if (response.ok) {
        toast.success('Email saved! Welcome to MTT updates.');
        // Update user state dynamically
        updateUserEmail(trimmedEmail);
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save email.');
        toast.error(data.error || 'Failed to save email.');
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      console.error('Error saving email preferences:', err);
      setError(err.message || 'Failed to save email preferences.');
      toast.error('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 dark:border-slate-700 overflow-hidden transform transition-all animate-scale-up">
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="p-6 md:p-8 flex flex-col items-center text-center">
            {/* Visual Pufferfish Header */}
            <div className="relative mb-5 flex justify-center">
              <div className="absolute inset-0 bg-marine-500/10 dark:bg-marine-500/20 rounded-full blur-xl scale-125 animate-pulse-slow"></div>
              <img 
                src="/puffer.png" 
                alt="Pleading Pufferfish" 
                className="w-32 h-32 object-contain relative z-10 hover:scale-110 transition-transform duration-300"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.src = 'https://ui-avatars.com/api/?name=Pufferfish&background=0ea5e9&color=fff&size=128';
                }}
              />
            </div>

            {/* Content */}
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
              Let's Stay Connected! 🐠
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
              Hey {user?.name || user?.username}! Please add your email address to stay informed about translation updates, active discussions on terms you watch, and the latest MTT platform updates.
            </p>

            {/* Email form */}
            <form onSubmit={handleSubmit} className="w-full">
              <div className="relative mb-3">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all text-sm ${
                    error 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-900/50' 
                      : 'border-slate-200 focus:border-marine-500 focus:ring-marine-200 dark:border-slate-700'
                  }`}
                  disabled={isSubmitting}
                />
              </div>

              {/* Error display */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-semibold mb-4 px-1 justify-start">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-marine-600 hover:bg-marine-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-marine-300 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Keep Me Informed
                </button>
                
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold rounded-xl transition-all text-sm"
                >
                  Remind Me Later
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailUrgencyModal;
