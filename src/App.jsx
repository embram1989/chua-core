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

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public / Auth Page */}
          <Route
            path="/login"
            element={
              userProfile ? (
                userProfile.role === 'superadmin' ? (
                  <Navigate to="/saas-admin" replace />
                ) : userProfile.role === 'owner' && !userProfile.tenant ? (
                  <Navigate to="/onboarding" replace />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
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

          {/* Tenant Owner Protected Main App Layout */}
          <Route
            element={
              <ProtectedRoute userProfile={userProfile} allowedRoles={['owner', 'superadmin']}>
                <Layout userProfile={userProfile} />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage userProfile={userProfile} />} />
            <Route path="/booking" element={<BookingPage userProfile={userProfile} />} />
            <Route path="/kasir" element={<KasirPage userProfile={userProfile} />} />
            <Route path="/akademi" element={<AkademiPage userProfile={userProfile} />} />
            <Route path="/events" element={<EventManagementPage userProfile={userProfile} />} />
            <Route path="/events/:eventId" element={<EventDetailWrapper userProfile={userProfile} />} />
            <Route path="/keuangan" element={<FinancePage userProfile={userProfile} />} />
            <Route path="/intelligence" element={<IntelligencePage userProfile={userProfile} />} />
            <Route
              path="/pengaturan"
              element={
                <PengaturanPage
                  userProfile={userProfile}
                  onTenantUpdated={handleTenantUpdated}
                />
              }
            />
          </Route>

          {/* Catch-all Redirect */}
          <Route
            path="*"
            element={
              userProfile ? (
                userProfile.role === 'superadmin' ? (
                  <Navigate to="/saas-admin" replace />
                ) : userProfile.role === 'owner' && !userProfile.tenant ? (
                  <Navigate to="/onboarding" replace />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
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
