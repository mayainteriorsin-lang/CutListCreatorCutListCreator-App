import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ProtectedRoute } from "@/lib/auth/ProtectedRoute";

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
const QuickQuotationPage = lazy(() => import("@/pages/quick-quotation"));
const QuotationsPage = lazy(() => import("@/pages/quotations"));
const LibraryPage = lazy(() => import("@/pages/library"));
const CustomerQuotePage = lazy(() => import("@/pages/customer-quote"));
const AppointmentPage = lazy(() => import("@/pages/appointment"));

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

        {/* Main App Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/cabinets" element={<CabinetsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/design" element={<DesignPage />} />
        <Route path="/spreadsheet" element={<SpreadsheetPage />} />
        {/* Business Routes */}
        <Route path="/crm" element={<CrmPage />} />
        <Route path="/client-info" element={<QuotationsPage />} />
        <Route path="/start-quotation" element={<StartQuotationPage />} />
        <Route path="/quick-quotation" element={<QuickQuotationPage />} />
        <Route path="/library" element={<LibraryPage />} />
        {/* Visual Quotation Routes - PROTECTED */}
        <Route path="/3d-quotation" element={
          <ProtectedRoute requiredRole="designer">
            <Quotation3DPage />
          </ProtectedRoute>
        } />
        <Route path="/3d-quotation/production" element={<ProductionPage />} />
        {/* 2D Quotation Page */}
        <Route path="/2d-quotation" element={<Quotation2DPage />} />
        <Route path="/2d-quotation/production" element={<ProductionPage />} />
        {/* Rate Card Management */}
        <Route path="/rate-cards" element={<SimpleRateCardPage />} />
        {/* Module Draw Demo */}
        <Route path="/module-draw" element={<ModuleDrawDemo />} />
        {/* Public Routes */}
        <Route path="/quote/:quoteId" element={<CustomerQuotePage />} />
        <Route path="/appointment/:leadId" element={<AppointmentPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Router />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
