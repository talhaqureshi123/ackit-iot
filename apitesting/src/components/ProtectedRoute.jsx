import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, user, loading } = useAuth();

  console.log('ProtectedRoute - Role required:', role);
  console.log('ProtectedRoute - User:', user);
  console.log('ProtectedRoute - User role:', user?.role);
  console.log('ProtectedRoute - Is authenticated:', isAuthenticated);
  console.log('ProtectedRoute - Loading:', loading);
  console.log('ProtectedRoute - localStorage user:', localStorage.getItem('user'));
  console.log('ProtectedRoute - localStorage role:', localStorage.getItem('role'));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute - Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role) {
    console.log('ProtectedRoute - Role mismatch, redirecting to login');
    console.log('ProtectedRoute - Expected role:', role, 'User role:', user?.role);
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute - Access granted');
  return children;
};

export default ProtectedRoute;
