/**
 * CutList Pro - Main Application
 *
 * Route structure:
 * - Public routes: Login, Register, Public quote view, Appointment booking
 * - Protected routes: All app pages (require authentication)
 * - Role-protected routes: Design tools (require specific roles)
 */

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Auth guards
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";

// Feature Flags
import { FeatureFlagsDebugPanel } from "@/modules/visual-quotation/components/safety/FeatureFlags";

// Lazy-loaded pages for code splitting
const HomePage = lazy(() => import("@/pages/dashboard"));
const CabinetsPage = lazy(() => import("@/pages/cabinets"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const DesignPage = lazy(() => import("@/pages/design"));
const SpreadsheetPage = lazy(() => import("@/pages/spreadsheet"));
const Quotation3DPage = lazy(() => import("@/modules/visual-quotation/pages/Quotation3DPage"));
const ProductionPage = lazy(() => import("@/modules/visual-quotation/pages/ProductionPage"));
const Quotation2DPage = lazy(() => import("@/modules/visual-quotation/pages/Quotation2DPage"));
const SimpleRateCardPage = lazy(() => import("@/modules/visual-quotation/pages/SimpleRateCardPage"));
const ModuleDrawDemo = lazy(() => import("@/modules/visual-quotation/pages/ModuleDrawDemo"));
const StartQuotationPage = lazy(() => import("@/pages/start-quotation"));
const CrmPage = lazy(() => import("@/pages/crm"));
const QuotationsPage = lazy(() => import("@/pages/quotations"));
const LibraryPage = lazy(() => import("@/pages/library"));
const CustomerQuotePage = lazy(() => import("@/pages/customer-quote"));
const AppointmentPage = lazy(() => import("@/pages/appointment"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading fallback component
function PageLoader() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "#f5f5f5"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40,
          height: 40,
          border: "3px solid #e0e0e0",
          borderTop: "3px solid #3b82f6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 12px"
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#666", fontSize: 14 }}>Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ============================================ */}
        {/* PUBLIC ROUTES - No authentication required  */}
        {/* ============================================ */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/quote/:quoteId" element={<CustomerQuotePage />} />
        <Route path="/appointment/:leadId" element={<AppointmentPage />} />

        {/* ============================================ */}
        {/* PROTECTED ROUTES - Authentication required  */}
        {/* ============================================ */}
        <Route element={<AuthGuard />}>
          {/* Dashboard & Home */}
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />

          {/* Core Features */}
          <Route path="/cabinets" element={<CabinetsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/spreadsheet" element={<SpreadsheetPage />} />

          {/* Business Routes */}
          <Route path="/crm" element={<CrmPage />} />
          <Route path="/client-info" element={<QuotationsPage />} />
          <Route path="/start-quotation" element={<StartQuotationPage />} />
          <Route path="/library" element={<LibraryPage />} />

          {/* Rate Card Management */}
          <Route path="/rate-cards" element={<SimpleRateCardPage />} />

          {/* ============================================ */}
          {/* DESIGNER ROUTES - Require designer or admin */}
          {/* ============================================ */}
          <Route element={<RoleGuard roles={['admin', 'designer']} />}>
            <Route path="/design" element={<DesignPage />} />
            <Route path="/3d-quotation" element={<Quotation3DPage />} />
            <Route path="/3d-quotation/production" element={<ProductionPage />} />
            <Route path="/2d-quotation" element={<Quotation2DPage />} />
            <Route path="/2d-quotation/production" element={<ProductionPage />} />
            <Route path="/module-draw" element={<ModuleDrawDemo />} />
          </Route>
        </Route>

        {/* 404 - Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {/* PATCH Phase 4: Feature Flags Debug Panel (visible if enabled in flags) */}
        <FeatureFlagsDebugPanel />
        <BrowserRouter>
          <Router />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
