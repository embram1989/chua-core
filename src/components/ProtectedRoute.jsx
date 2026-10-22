import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ userProfile, allowedRoles, requireTenant = true, children }) {
  const location = useLocation();

  if (!userProfile) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Handle Super Admin strict routing: Super Admin must ONLY access /saas-admin
  if (userProfile.role === 'superadmin') {
    if (location.pathname !== '/saas-admin') {
      return <Navigate to="/saas-admin" replace />;
    }
    return children;
  }

  // Handle non-superadmin users trying to access /saas-admin
  if (location.pathname === '/saas-admin' && userProfile.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Handle Tenant Owner without tenant data: MUST complete Onboarding
  if (userProfile.role === 'owner' && !userProfile.tenant && requireTenant) {
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
    return children;
  }

  // Handle Tenant Owner with tenant data trying to re-access /onboarding
  if (userProfile.role === 'owner' && userProfile.tenant && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  // Role authorization check if explicit allowedRoles provided
  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
