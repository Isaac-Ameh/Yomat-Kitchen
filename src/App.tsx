import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import { MotionConfig, AnimatePresence, motion } from 'motion/react';
import {
  CLERK_PUBLISHABLE_KEY,
  isClerkConfigured,
  isValidPublishableKey,
  normalizePublishableKey,
} from './lib/clerkConfig';
import { parseApiJson } from './lib/api';
import { AppAuthProvider } from './context/AppAuthContext';
import { MenuProvider } from './context/MenuContext';
import { CartProvider } from './context/CartContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { MealDetailPage } from './pages/MealDetailPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { CartPage } from './pages/CartPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { AccountPage } from './pages/AccountPage';
import { AdminPortalPage } from './pages/AdminPortalPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  const baseSegment = pathname.split('/')[1] || '';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [baseSegment]);

  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  const routeGroup = '/' + (location.pathname.split('/')[1] || '');
  const isAdminRoute = routeGroup === '/admin';

  if (isAdminRoute) {
    return (
      <Routes location={location}>
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminPortalPage />
            </AdminRoute>
          }
        />
      </Routes>
    );
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={routeGroup}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/menu/:id" element={<MealDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            <Route
              path="/account/*"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

function ClerkAndAuthWrapper({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [runtimeKey, setRuntimeKey] = useState<string>(
    isClerkConfigured ? CLERK_PUBLISHABLE_KEY : ''
  );
  const [resolvingConfig, setResolvingConfig] = useState<boolean>(!isClerkConfigured);

  useEffect(() => {
    if (isClerkConfigured) return;

    let cancelled = false;
    async function loadRuntimeConfig() {
      try {
        const res = await fetch('/api/config', { credentials: 'same-origin' });
        const data = await parseApiJson<{ clerkPublishableKey?: string | null }>(
          res,
          'Unable to load runtime configuration.'
        );
        const normalized = normalizePublishableKey(data.clerkPublishableKey || '');
        if (!cancelled && isValidPublishableKey(normalized)) {
          setRuntimeKey(normalized);
        }
      } catch {
        // Fallback to unconfigured guidance UI if /api/config is unavailable
      } finally {
        if (!cancelled) setResolvingConfig(false);
      }
    }

    void loadRuntimeConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  if (resolvingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="w-8 h-8 rounded-full border-2 border-[#5A0B1E]/20 border-t-[#5A0B1E] animate-spin" />
      </div>
    );
  }

  const hasValidKey = isValidPublishableKey(runtimeKey);

  if (!hasValidKey) {
    return <AppAuthProvider clerkConfigured={false}>{children}</AppAuthProvider>;
  }

  return (
    <ClerkProvider
      publishableKey={runtimeKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/cart"
      signUpFallbackRedirectUrl="/cart"
      afterSignOutUrl="/"
    >
      <AppAuthProvider clerkConfigured={true}>{children}</AppAuthProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ClerkAndAuthWrapper>
          <MenuProvider>
            <CartProvider>
              <ScrollToTop />
              <AnimatedRoutes />
            </CartProvider>
          </MenuProvider>
        </ClerkAndAuthWrapper>
      </BrowserRouter>
    </MotionConfig>
  );
}
