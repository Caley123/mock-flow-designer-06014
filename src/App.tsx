import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { RegisterIncident } from "./pages/RegisterIncident";
import { IncidentsList } from "./pages/IncidentsList";
import { StudentsList } from "./pages/StudentsList";
import { FaultsCatalog } from "./pages/FaultsCatalog";
import { Reports } from "./pages/Reports";
import NotFound from "./pages/NotFound";
import { authService } from "./lib/services";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Componente para redirigir si ya está autenticado
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const user = authService.getCurrentUser();
  if (user) {
    return <Navigate to="/" replace />;
  }
  return children as React.ReactElement;
};

// Componente para manejar la ruta raíz - redirige al login si no está autenticado
const RootRoute = () => {
  const user = authService.getCurrentUser();
  
  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Si hay usuario, mostrar el dashboard protegido
  return (
    <ProtectedRoute>
      <Layout><Dashboard /></Layout>
    </ProtectedRoute>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/" 
            element={<RootRoute />}
          />
          <Route 
            path="/register" 
            element={
              <ProtectedRoute>
                <Layout><RegisterIncident /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/incidents" 
            element={
              <ProtectedRoute>
                <Layout><IncidentsList /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/students" 
            element={
              <ProtectedRoute>
                <Layout><StudentsList /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faults" 
            element={
              <ProtectedRoute>
                <Layout><FaultsCatalog /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute>
                <Layout><Reports /></Layout>
              </ProtectedRoute>
            } 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
