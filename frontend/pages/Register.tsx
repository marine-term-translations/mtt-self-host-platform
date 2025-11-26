import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Waves, Info, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { backendApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const languages = [
  { name: 'Nederlands', code: 'NL' },
  { name: 'English', code: 'EN' },
  { name: 'Español', code: 'ES' },
  { name: 'Português', code: 'PT' },
  { name: 'Français', code: 'FR' },
  { name: 'Deutsch', code: 'DE' },
  { name: 'Italiano', code: 'IT' },
  { name: 'Русский', code: 'RU' },
  { name: '中文', code: 'ZH' },
  { name: '日本語', code: 'JA' },
];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    languages: [] as string[],
  });
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number";
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Clear errors on change
    if (name === 'email' || name === 'password' || name === 'username') {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLanguageChange = (code: string) => {
    setForm((prev) => {
      const exists = prev.languages.includes(code);
      return {
        ...prev,
        languages: exists
          ? prev.languages.filter((c) => c !== code)
          : [...prev.languages, code],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const emailIsValid = validateEmail(form.email);
    const passwordError = validatePassword(form.password);
    const usernameValid = form.username.length >= 3;
    
    setErrors({
      username: usernameValid ? '' : 'Username must be at least 3 characters.',
      email: emailIsValid ? '' : 'Please enter a valid email address.',
      password: passwordError,
    });

    if (!emailIsValid || passwordError || !usernameValid) {
      toast.error("Please fix the errors in the form.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Register the user
      await backendApi.post('/register-gitea-user', {
        username: form.username,
        name: form.name,
        email: form.email,
        password: form.password,
        lang: form.languages
      });
      
      toast.success("Account created successfully!");
      
      // 2. Auto Login
      try {
        await login(form.username, form.password);
        toast.success("Logged in successfully!");
        navigate('/dashboard');
      } catch (loginError) {
        console.error("Auto-login failed", loginError);
        toast.error("Registration successful, but auto-login failed. Please sign in.");
        navigate('/login');
      }
      
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : "Registration failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-900 px-4 py-8">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-marine-50 dark:bg-marine-900 text-marine-600 dark:text-marine-400 mb-4">
            <Waves size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create an account</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Join the community to start translating</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
           {/* Username Field */}
           <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                className={`block w-full rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm sm:text-sm p-2.5 ${
                  errors.username 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-slate-300 dark:border-slate-600 focus:border-marine-500 focus:ring-marine-500'
                }`}
                placeholder="jdoe"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.username}
                </p>
              )}
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-marine-500 focus:ring-marine-500 sm:text-sm p-2.5"
                placeholder="Dr. Jane Doe"
              />
            </div>
            
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className={`block w-full rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm sm:text-sm p-2.5 ${
                  errors.email 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-slate-300 dark:border-slate-600 focus:border-marine-500 focus:ring-marine-500'
                }`}
                placeholder="jane@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className={`block w-full rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm sm:text-sm p-2.5 pr-10 ${
                    errors.password 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-slate-300 dark:border-slate-600 focus:border-marine-500 focus:ring-marine-500'
                  }`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.password}
                </p>
              )}
              {!errors.password && form.password.length > 0 && (
                 <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                   Must be 8+ chars, include 1 uppercase & 1 number.
                 </p>
              )}
            </div>

            {/* Language Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Languages you speak
                </label>
                
                {/* Info Tooltip */}
                <div className="group relative flex items-center">
                  <Info size={16} className="text-marine-500 cursor-help" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none">
                    <p className="font-semibold mb-1">Why select languages?</p>
                    <p>You will be subscribed to repositories matching these languages and will only be prompted to translate terms for the languages you select here.</p>
                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 border border-slate-200 dark:border-slate-700 rounded-lg">
                {languages.map((lang) => {
                  const isSelected = form.languages.includes(lang.code);
                  return (
                    <label 
                      key={lang.code} 
                      className={`
                        relative flex items-center p-2 rounded-lg border cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-marine-500 bg-marine-50 dark:bg-marine-900/20 ring-1 ring-marine-500' 
                          : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'}
                      `}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isSelected}
                        onChange={() => handleLanguageChange(lang.code)}
                      />
                      <div className={`
                        w-4 h-4 rounded border flex items-center justify-center mr-3 transition-colors
                        ${isSelected ? 'bg-marine-500 border-marine-500' : 'border-slate-300 bg-white dark:bg-slate-600'}
                      `}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                        {lang.name} <span className="text-slate-400 text-xs ml-1">({lang.code})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-marine-600 hover:bg-marine-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-marine-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="text-center text-sm">
            <span className="text-slate-500 dark:text-slate-400">Already have an account? </span>
            <Link to="/login" className="font-medium text-marine-600 hover:text-marine-500">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;