import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { RegisterIncident } from "./pages/RegisterIncident";
import { IncidentsList } from "./pages/IncidentsList";
import { StudentsList } from "./pages/StudentsList";
import { FaultsCatalog } from "./pages/FaultsCatalog";
import { Reports } from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/register" element={<Layout><RegisterIncident /></Layout>} />
          <Route path="/incidents" element={<Layout><IncidentsList /></Layout>} />
          <Route path="/students" element={<Layout><StudentsList /></Layout>} />
          <Route path="/faults" element={<Layout><FaultsCatalog /></Layout>} />
          <Route path="/reports" element={<Layout><Reports /></Layout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
