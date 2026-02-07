import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, Target } from 'lucide-react';

const BottomNav: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    {
      path: '/dashboard',
      icon: Home,
      label: 'Home',
    },
    {
      path: '/leaderboard',
      icon: TrendingUp,
      label: 'Leaderboard',
    },
    {
      path: '/community-goals',
      icon: Target,
      label: 'Goals',
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                active
                  ? 'text-marine-600 dark:text-marine-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-marine-600 dark:hover:text-marine-400'
              }`}
            >
              <Icon size={24} strokeWidth={active ? 2.5 : 2} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
