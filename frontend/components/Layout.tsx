

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Waves, Menu, X, Sun, Moon, LogOut, User as UserIcon, ShieldCheck, Zap, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import { parse, format, now } from '@/src/utils/datetime';
import CommunityGoalWidget from './CommunityGoalWidget';
import BottomNav from './BottomNav';
import ReportIssueModal from './ReportIssueModal';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Dark mode toggle logic
  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    }
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path ? 'text-marine-600 dark:text-marine-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-marine-600 dark:hover:text-marine-300';

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Navbar - hidden on phone when authenticated */}
      <header className={`sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 ${isAuthenticated ? 'hidden md:block' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="bg-marine-600 text-white p-1.5 rounded-lg group-hover:bg-marine-500 transition-colors">
                  <Waves size={24} />
                </div>
                <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tight hidden sm:block">Marine Term Translations</span>
                <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tight sm:hidden">MTT</span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/about" className={isActive('/about')}>About</Link>
              <Link to="/communities" className={isActive('/communities')}>Communities</Link>
              <Link to="/documentation" className={isActive('/documentation')}>Documentation</Link>
              {isAuthenticated && (
                <>
                  <Link to="/browse" className={isActive('/browse')}>Browse</Link>
                  <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
                  {user?.isAdmin && (
                    <Link to="/admin" className={`${isActive('/admin')} flex items-center gap-1`}>
                       <ShieldCheck size={16} /> Admin
                    </Link>
                  )}
                </>
              )}
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => setIsReportIssueModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-marine-600 dark:hover:text-marine-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <AlertCircle size={18} />
                <span>Report Issue</span>
              </button>
              
              <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              {isAuthenticated ? (
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                   <div className="relative group">
                     <Link to={`/user/${user?.id || user?.user_id}`} className="flex items-center gap-2 hover:opacity-80">
                        <img src={user?.avatar} alt={user?.name} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden lg:block">{user?.name}</span>
                     </Link>
                     {/* Hover Dropdown */}
                     <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <Link to={`/user/${user?.id || user?.user_id}`} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                           <UserIcon size={16} /> My Profile
                        </Link>
                        <Link to="/settings" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                           <SettingsIcon size={16} /> Settings
                        </Link>
                        <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                        <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                           <LogOut size={16} /> Sign Out
                        </button>
                     </div>
                   </div>
                </div>
              ) : (
                <Link to="/login" className="px-4 py-2 bg-marine-600 hover:bg-marine-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow-md">
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-4">
               <button onClick={toggleDarkMode} className="p-2 text-slate-500 dark:text-slate-400">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="p-2 text-slate-600 dark:text-slate-300"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 absolute w-full shadow-lg">
            <div className="px-4 py-4 space-y-3">
              <button 
                onClick={() => {
                  setIsReportIssueModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full py-2 text-slate-600 dark:text-slate-300 hover:text-marine-600"
              >
                <AlertCircle size={18} />
                <span>Report Issue</span>
              </button>
              <Link to="/about" className="block py-2 text-slate-600 dark:text-slate-300 hover:text-marine-600" onClick={() => setIsMenuOpen(false)}>About</Link>
              <Link to="/leaderboard" className="block py-2 text-slate-600 dark:text-slate-300 hover:text-marine-600" onClick={() => setIsMenuOpen(false)}>Community</Link>
              <Link to="/documentation" className="block py-2 text-slate-600 dark:text-slate-300 hover:text-marine-600" onClick={() => setIsMenuOpen(false)}>Documentation</Link>
              {isAuthenticated && (
                <>
                  <Link to="/browse" className="block py-2 text-slate-600 dark:text-slate-300 hover:text-marine-600" onClick={() => setIsMenuOpen(false)}>Browse Terms</Link>
                  <Link to="/dashboard" className="block py-2 text-slate-600 dark:text-slate-300 hover:text-marine-600" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
                  <Link to={`/user/${user?.id || user?.user_id}`} className="block py-2 text-slate-600 dark:text-slate-300 hover:text-marine-600" onClick={() => setIsMenuOpen(false)}>My Profile</Link>
                  <Link to="/settings" className="block py-2 text-slate-600 dark:text-slate-300 hover:text-marine-600" onClick={() => setIsMenuOpen(false)}>Settings</Link>
                   {user?.isAdmin && (
                    <Link to="/admin" className="block py-2 text-marine-600 dark:text-marine-400 font-semibold" onClick={() => setIsMenuOpen(false)}>Admin Dashboard</Link>
                  )}
                  <button onClick={handleLogout} className="w-full text-left py-2 text-red-500 font-medium">Sign Out</button>
                </>
              )}
              {!isAuthenticated && (
                 <Link to="/login" className="block w-full text-center py-3 mt-4 bg-marine-600 text-white rounded-lg font-medium" onClick={() => setIsMenuOpen(false)}>
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={`flex-grow ${isAuthenticated ? 'mb-16 md:mb-0' : ''}`}>
        {children}
      </main>

      {/* Footer - hidden on phone when authenticated */}
      <footer className={`bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 ${isAuthenticated ? 'hidden md:block' : ''}`}>
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Waves size={20} className="text-marine-600 dark:text-marine-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Marine Term Translations</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center md:text-right">
            &copy; {format(parse(now()), 'YYYY')} Marine Term Translations. Data sourced from NERC Vocabulary Server.
          </p>
        </div>
      </footer>

      {/* Community Goals Widget - hidden on mobile */}
      {isAuthenticated && <CommunityGoalWidget className="hidden md:block" />}
      
      {/* Bottom Navigation - only on phone when authenticated */}
      {isAuthenticated && <BottomNav />}

      {/* Report Issue Modal */}
      <ReportIssueModal 
        isOpen={isReportIssueModalOpen} 
        onClose={() => setIsReportIssueModalOpen(false)} 
      />
    </div>
  );
};

export default Layout;
