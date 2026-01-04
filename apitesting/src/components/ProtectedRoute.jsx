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
  // This handles the case when page reloads and AuthContext is still initializing
  if (!authenticated && (storedUser || storedRole)) {
    console.log('⚠️ ProtectedRoute - State not updated but localStorage has data, waiting...');
    console.log('⚠️ ProtectedRoute - Will use localStorage data for authentication');
    // Use localStorage data directly if state hasn't updated yet
    const useLocalStorageAuth = !!parsedUser && parsedUser.id && parsedUser.email;
    if (useLocalStorageAuth) {
      console.log('✅ ProtectedRoute - Using localStorage authentication (page reload scenario)');
      console.log('✅ ProtectedRoute - User from localStorage:', parsedUser);
      console.log('✅ ProtectedRoute - Role from localStorage:', storedRole);
      // If we have valid localStorage data, allow access (AuthContext will catch up)
      // But still check role match
      if (role) {
        const normalizedRequiredRole = (role || '').toString().toLowerCase().trim();
        const normalizedUserRole = (parsedUser?.role || storedRole || '').toString().toLowerCase().trim();
        
        console.log('🛡️ ProtectedRoute - Role check (from localStorage):');
        console.log('   Required role (normalized):', normalizedRequiredRole);
        console.log('   User role (normalized):', normalizedUserRole);
        console.log('   Match:', normalizedUserRole === normalizedRequiredRole);
        
        if (normalizedUserRole === normalizedRequiredRole) {
          console.log('✅ ProtectedRoute - Role match from localStorage, allowing access');
          return children; // Allow access based on localStorage
        } else {
          console.log('❌ ProtectedRoute - Role mismatch from localStorage, redirecting');
          return <Navigate to="/login" replace />;
        }
      }
      // No role required, allow access
      return children;
    }
    // Give React a moment to update state from localStorage (but don't wait too long)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authenticated) {
    // Final check: if localStorage has valid user data, consider authenticated
    if (parsedUser && parsedUser.id && parsedUser.email) {
      console.log('✅ ProtectedRoute - Using localStorage authentication (state not updated yet)');
      // Allow access but log warning
      console.warn('⚠️ ProtectedRoute - State not synced, using localStorage fallback');
    } else {
      console.log('❌ ProtectedRoute - Not authenticated, redirecting to login');
      console.log('❌ ProtectedRoute - Debug info:', {
        userState: user,
        storedUser: storedUser,
        parsedUser: parsedUser,
        isAuthenticated,
        authenticated
      });
      return <Navigate to="/login" replace />;
    }
  }

  if (role) {
    // Normalize role comparison (case-insensitive)
    const normalizedRequiredRole = (role || '').toString().toLowerCase().trim();
    const normalizedUserRole = (currentRole || '').toString().toLowerCase().trim();
    
    console.log('🛡️ ProtectedRoute - Role comparison:');
    console.log('   Required role (raw):', role);
    console.log('   Required role (normalized):', normalizedRequiredRole);
    console.log('   User role (raw):', currentRole);
    console.log('   User role (from state):', user?.role);
    console.log('   User role (from localStorage):', parsedUser?.role);
    console.log('   User role (storedRole):', storedRole);
    console.log('   User role (normalized):', normalizedUserRole);
    console.log('   Match:', normalizedUserRole === normalizedRequiredRole);
    console.log('   Match check details:', {
      normalizedUserRole,
      normalizedRequiredRole,
      areEqual: normalizedUserRole === normalizedRequiredRole,
      userRoleType: typeof normalizedUserRole,
      requiredRoleType: typeof normalizedRequiredRole
    });
    
    if (normalizedUserRole !== normalizedRequiredRole) {
      console.error('❌ ProtectedRoute - Role mismatch, redirecting to login');
      console.error('❌ ProtectedRoute - Expected role:', role, 'User role:', currentRole);
      console.error('❌ ProtectedRoute - Normalized comparison:', normalizedRequiredRole, 'vs', normalizedUserRole);
      console.error('❌ ProtectedRoute - Full debug:', {
        role,
        currentRole,
        normalizedRequiredRole,
        normalizedUserRole,
        userState: user,
        parsedUser,
        storedRole
      });
      return <Navigate to="/login" replace />;
    } else {
      console.log('✅ ProtectedRoute - Role match (case-insensitive):', normalizedUserRole);
      console.log('✅ ProtectedRoute - Access will be granted');
    }
  }

  console.log('✅ ProtectedRoute - Access granted for role:', currentRole);
  return children;
};

export default ProtectedRoute;
