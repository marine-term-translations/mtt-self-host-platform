import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { 
  getUnreadNotifications, 
  getUnreadNotificationCount, 
  markNotificationAsRead,
  markAllNotificationsAsRead,
  Notification 
} from '../services/notification.api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load unread count on mount and poll every 30 seconds
  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadUnreadCount = async () => {
    try {
      const response = await getUnreadNotificationCount();
      setUnreadCount(response.count);
    } catch (error) {
      console.error('Failed to load notification count:', error);
    }
  };

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await getUnreadNotifications(20);
      setNotifications(response.notifications);
      setUnreadCount(response.count || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBellClick = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    try {
      await markNotificationAsRead(notification.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }

    // Navigate to the translation
    setIsOpen(false);
    if (notification.translation_id) {
      navigate(`/flow?translation_id=${notification.translation_id}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications([]);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                No new notifications
              </div>
            ) : (
              notifications.map(notification => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0 text-left transition-colors"
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm text-slate-900 dark:text-white break-words">
                        {notification.message}
                      </p>
                      {notification.created_by_display_name && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          from {notification.created_by_display_name}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
