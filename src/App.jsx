import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { subscribeToAuthChanges } from './services/authService';

import LoadingScreen from './components/LoadingScreen';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import SaasAdminPage from './pages/SaasAdminPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import BookingPage from './pages/BookingPage';
import KasirPage from './pages/KasirPage';
import AkademiPage from './pages/AkademiPage';
import EventManagementPage from './pages/EventManagementPage';
import EventDetailPage from './pages/EventDetailPage';
import FinancePage from './pages/FinancePage';
import IntelligencePage from './pages/IntelligencePage';
import PengaturanPage from './pages/PengaturanPage';

function EventDetailWrapper({ userProfile }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  return (
    <EventDetailPage
      eventId={eventId}
      userProfile={userProfile}
      onBack={() => navigate('/events')}
    />
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Subscribe to Firebase Auth and Firestore role verification
    const unsubscribe = subscribeToAuthChanges((authUser, profile, errorMessage) => {
      setFirebaseUser(authUser);
      setUserProfile(profile);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleTenantCreated = (newTenant) => {
    setUserProfile((prev) => ({
      ...prev,
      tenant: newTenant,
      tenantId: newTenant.id,
    }));
  };

  const handleTenantUpdated = (updatedTenant) => {
    setUserProfile((prev) => ({
      ...prev,
      tenant: updatedTenant,
    }));
  };

  // 1. Render LoadingScreen if auth state check is in progress (Prevents Flash Login)
  if (isAuthLoading) {
    return <LoadingScreen message="Memverifikasi Otentikasi & Akses Security..." />;
  }

  // Helper untuk menentukan halaman tujuan berdasarkan role
  const getHomeRouteForRole = (profile) => {
    if (!profile) return '/login';
    if (profile.role === 'superadmin') return '/saas-admin';
    if (profile.role === 'pelatih') return '/akademi';
    if (profile.role === 'owner' && !profile.tenant) return '/onboarding';
    return '/dashboard'; // default for owner & admin
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public / Auth Page */}
          <Route
            path="/login"
            element={
              userProfile ? (
                <Navigate to={getHomeRouteForRole(userProfile)} replace />
              ) : (
                <LoginPage onLoginSuccess={(profile) => setUserProfile(profile)} />
              )
            }
          />

          {/* Super Admin Protected Route */}
          <Route
            path="/saas-admin"
            element={
              <ProtectedRoute userProfile={userProfile} allowedRoles={['superadmin']}>
                <SaasAdminPage userProfile={userProfile} />
              </ProtectedRoute>
            }
          />

          {/* Onboarding Page for Invited Tenant Owner without Tenant Data */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute userProfile={userProfile} allowedRoles={['owner']} requireTenant={false}>
                <OnboardingPage
                  userProfile={userProfile}
                  onTenantCreated={handleTenantCreated}
                />
              </ProtectedRoute>
            }
          />

          {/* Protected Main App Layout (Owner, Admin, Pelatih) */}
          <Route
            element={
              <ProtectedRoute userProfile={userProfile} allowedRoles={['owner', 'superadmin', 'admin', 'pelatih']}>
                <Layout userProfile={userProfile} />
              </ProtectedRoute>
            }
          >
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['owner', 'superadmin', 'admin']}>
                  <DashboardPage userProfile={userProfile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking"
              element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['owner', 'superadmin', 'admin']}>
                  <BookingPage userProfile={userProfile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kasir"
              element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['owner', 'superadmin', 'admin']}>
                  <KasirPage userProfile={userProfile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/akademi"
              element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['owner', 'superadmin', 'admin', 'pelatih']}>
                  <AkademiPage userProfile={userProfile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['owner', 'superadmin', 'admin']}>
                  <EventManagementPage userProfile={userProfile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:eventId"
              element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['owner', 'superadmin', 'admin']}>
                  <EventDetailWrapper userProfile={userProfile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/keuangan"
              element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['owner', 'superadmin', 'admin']}>
                  <FinancePage userProfile={userProfile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/intelligence"
              element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['owner', 'superadmin', 'admin']}>
                  <IntelligencePage userProfile={userProfile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pengaturan"
              element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['owner', 'superadmin', 'admin']}>
                  <PengaturanPage
                    userProfile={userProfile}
                    onTenantUpdated={handleTenantUpdated}
                  />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all Redirect */}
          <Route
            path="*"
            element={
              userProfile ? (
                <Navigate to={getHomeRouteForRole(userProfile)} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
