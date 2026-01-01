import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import VisualQuotationPage from "@/modules/visual-quotation/pages/VisualQuotationPage";
import StartQuotationPage from "@/pages/start-quotation";
import CrmPage from "@/pages/crm";
import CustomerQuotePage from "@/pages/customer-quote";

function Router() {
  return (
    <Routes>
      <Route path="/crm" element={<CrmPage />} />
      <Route path="/start-quotation" element={<StartQuotationPage />} />
      <Route path="/visual-quotation" element={<VisualQuotationPage />} />
      <Route path="/quote/:quoteId" element={<CustomerQuotePage />} />
      <Route path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Router />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
