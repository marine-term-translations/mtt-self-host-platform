
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Browse from './pages/Browse';
import TermDetail from './pages/TermDetail';
import About from './pages/About';
import Settings from './pages/Settings';
import UserProfile from './pages/UserProfile';
import History from './pages/History';
import Reputation from './pages/Reputation';
import Leaderboard from './pages/Leaderboard';
import Documentation from './pages/Documentation';
import TranslationFlow from './pages/TranslationFlow';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminModeration from './pages/admin/AdminModeration';
import AdminHarvest from './pages/admin/AdminHarvest';
import AdminSources from './pages/admin/AdminSources';
import AdminQuery from './pages/admin/AdminQuery';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { useAuth } from './context/AuthContext';

const App: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <Layout>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-white',
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            style: {
              background: '#059669',
            },
          },
          error: {
            style: {
              background: '#DC2626',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/browse" element={
          <ProtectedRoute>
            <Browse />
          </ProtectedRoute>
        } />
        <Route path="/flow" element={
          <ProtectedRoute>
            <TranslationFlow />
          </ProtectedRoute>
        } />
        <Route path="/term/:id" element={
          <ProtectedRoute>
            <TermDetail />
          </ProtectedRoute>
        } />
         
        {/* Profile & Settings Routes */}
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/user/:id" element={
          <UserProfile />
        } />
        {/* Deprecated/Redirect Routes */}
        <Route path="/profile" element={
            user ? <Navigate to={`/user/${user.id || user.user_id}`} replace /> : <Navigate to="/login" replace />
        } />
        <Route path="/user-profile" element={
            user ? <Navigate to={`/user/${user.id || user.user_id}`} replace /> : <Navigate to="/login" replace />
        } />

         <Route path="/history" element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        } />
         <Route path="/reputation" element={
          <ProtectedRoute>
            <Reputation />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
        <Route path="/admin/users" element={
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        } />
        <Route path="/admin/moderation" element={
          <AdminRoute>
            <AdminModeration />
          </AdminRoute>
        } />
        <Route path="/admin/harvest" element={
          <AdminRoute>
            <AdminHarvest />
          </AdminRoute>
        } />
        <Route path="/admin/sources" element={
          <AdminRoute>
            <AdminSources />
          </AdminRoute>
        } />
        <Route path="/admin/query" element={
          <AdminRoute>
            <AdminQuery />
          </AdminRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
};

export default App;
