import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CustomCursor } from './components/CustomCursor';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { PrinciplesSection } from './components/PrinciplesSection';
import { SealMoment } from './components/SealMoment';
import { PipelineSection } from './components/PipelineSection';
import { ModalityMarquee } from './components/ModalityMarquee';
import { TransparencySection } from './components/TransparencySection';
import { WaitlistSection } from './components/WaitlistSection';
import { Footer } from './components/Footer';
import { AnalysisModal } from './components/AnalysisModal';
import { DashboardLayout } from './components/DashboardLayout';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { HistoryPage } from './pages/HistoryPage';
import { SourcesPage } from './pages/SourcesPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ClaimGraphPage } from './pages/ClaimGraphPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { TrendingFeedPage } from './pages/TrendingFeedPage';
import { PublisherWidgetsPage } from './pages/PublisherWidgetsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { fetchHealth } from './api/client';
import { HealthResponse } from './types';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)', color: 'var(--brass)', fontFamily: 'var(--mono)' }}>
        Authenticating session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Only Route Guard (redirects logged-in users away from /login or /register to /dashboard)
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Landing Page Component
const LandingPage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth()
      .then((data) => setHealth(data))
      .catch(() => {});
  }, []);

  return (
    <>
      <CustomCursor />
      <Navbar />
      {health && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 99,
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            borderRadius: '100px',
            padding: '6px 14px',
            fontSize: '11.5px',
            fontFamily: 'var(--mono)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: health.status === 'ok' ? 'var(--verified)' : 'var(--disputed)',
            }}
          ></span>
          API Online v{health.version} ({health.redis})
        </div>
      )}
      <main>
        <HeroSection onAnalysisStart={(id) => setActiveContentId(id)} />
        <PrinciplesSection />
        <SealMoment />
        <PipelineSection />
        <ModalityMarquee />
        <TransparencySection />
        <WaitlistSection />
      </main>
      <Footer />

      <AnalysisModal
        contentId={activeContentId}
        onClose={() => setActiveContentId(null)}
      />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />
            {/* Protected layout: sidebar is shared across all dashboard pages */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/analyze" element={<AnalyzePage />} />
              <Route path="/dashboard/history" element={<HistoryPage />} />
              <Route path="/dashboard/trending" element={<TrendingFeedPage />} />
              <Route path="/dashboard/sources" element={<SourcesPage />} />
              <Route path="/dashboard/review-queue" element={<ReviewQueuePage />} />
              <Route path="/dashboard/claim-graph" element={<ClaimGraphPage />} />
              <Route path="/dashboard/api-keys" element={<ApiKeysPage />} />
              <Route path="/dashboard/publisher-widgets" element={<PublisherWidgetsPage />} />
              <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
              <Route path="/dashboard/profile" element={<ProfilePage />} />
              <Route path="/dashboard/settings" element={<SettingsPage />} />
              <Route path="/dashboard/*" element={<Navigate to="/dashboard" replace />} />
            </Route>
            {/* Fallback to home for unknown non-dashboard routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};
