import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, user, loading } = useAuth();

  // Fallback to localStorage if state hasn't updated yet (handles race condition after login)
  const storedUser = localStorage.getItem('user');
  const storedRole = localStorage.getItem('role');
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  
  // Use state if available, otherwise fallback to localStorage
  const currentUser = user || parsedUser;
  const currentRole = currentUser?.role || storedRole;
  const authenticated = isAuthenticated || !!currentUser;

  console.log('🛡️ ProtectedRoute - Role required:', role);
  console.log('🛡️ ProtectedRoute - User (state):', user);
  console.log('🛡️ ProtectedRoute - User (localStorage):', parsedUser);
  console.log('🛡️ ProtectedRoute - Current user:', currentUser);
  console.log('🛡️ ProtectedRoute - Current role:', currentRole);
  console.log('🛡️ ProtectedRoute - Is authenticated (state):', isAuthenticated);
  console.log('🛡️ ProtectedRoute - Is authenticated (computed):', authenticated);
  console.log('🛡️ ProtectedRoute - Loading:', loading);
  console.log('🛡️ ProtectedRoute - localStorage.getItem("user"):', localStorage.getItem('user'));
  console.log('🛡️ ProtectedRoute - localStorage.getItem("role"):', localStorage.getItem('role'));

  if (loading) {
    console.log('🛡️ ProtectedRoute - Still loading, showing spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Extra check: if we have localStorage data but state is null, wait a bit more
  if (!authenticated && (storedUser || storedRole)) {
    console.log('⚠️ ProtectedRoute - State not updated but localStorage has data, waiting...');
    // Give React a moment to update state from localStorage
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authenticated) {
    console.log('❌ ProtectedRoute - Not authenticated, redirecting to login');
    console.log('❌ ProtectedRoute - Debug info:', {
      userState: user,
      storedUser: storedUser,
      isAuthenticated,
      authenticated
    });
    return <Navigate to="/login" replace />;
  }

  if (role && currentRole !== role) {
    console.log('❌ ProtectedRoute - Role mismatch, redirecting to login');
    console.log('❌ ProtectedRoute - Expected role:', role, 'User role:', currentRole);
    return <Navigate to="/login" replace />;
  }

  console.log('✅ ProtectedRoute - Access granted for role:', currentRole);
  return children;
};

export default ProtectedRoute;
