import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import CabinetsPage from "@/pages/cabinets";
import SettingsPage from "@/pages/settings";
import DesignPage from "@/pages/design";
import SpreadsheetPage from "@/pages/spreadsheet";
import VisualQuotationPage from "@/modules/visual-quotation/pages/VisualQuotationPage";
import ProductionPage from "@/modules/visual-quotation/pages/ProductionPage";
import Room3DPage from "@/modules/visual-quotation/pages/Room3DPage";
import StartQuotationPage from "@/pages/start-quotation";
import CrmPage from "@/pages/crm";
import QuotationsPage from "@/pages/quotations";
import CustomerQuotePage from "@/pages/customer-quote";
import AppointmentPage from "@/pages/appointment";
// PATCH 38: API Health Banner
import ApiHealthBanner from "@/components/system/ApiHealthBanner";

function Router() {
  return (
    <Routes>
      {/* Main App Routes */}
      <Route path="/" element={<DashboardPage />} />
      <Route path="/cabinets" element={<CabinetsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/design" element={<DesignPage />} />
      <Route path="/spreadsheet" element={<SpreadsheetPage />} />
      {/* Business Routes */}
      <Route path="/crm" element={<CrmPage />} />
      <Route path="/quotations" element={<QuotationsPage />} />
      <Route path="/start-quotation" element={<StartQuotationPage />} />
      {/* Visual Quotation Routes */}
      <Route path="/visual-quotation" element={<VisualQuotationPage />} />
      <Route path="/visual-quotation/production" element={<ProductionPage />} />
      <Route path="/visual-quotation/3d-room" element={<Room3DPage />} />
      {/* Public Routes */}
      <Route path="/quote/:quoteId" element={<CustomerQuotePage />} />
      <Route path="/appointment/:leadId" element={<AppointmentPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {/* PATCH 38: Show API health status */}
        <ApiHealthBanner />
        <BrowserRouter>
          <Router />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
