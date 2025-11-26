import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Browse from './pages/Browse';
import TermDetail from './pages/TermDetail';
import About from './pages/About';
import Profile from './pages/Profile';
import History from './pages/History';
import Reputation from './pages/Reputation';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

const App: React.FC = () => {
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
        <Route path="/term/:id" element={
          <ProtectedRoute>
            <TermDetail />
          </ProtectedRoute>
        } />
         <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
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
         <Route path="/leaderboard" element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
};

export default App;