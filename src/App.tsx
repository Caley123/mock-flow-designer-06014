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
import { TutorScanner } from "./pages/TutorScanner";
import { AuditLogs } from "./pages/AuditLogs";
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

// Componente para manejar la ruta raíz - redirige según el rol
const RootRoute = () => {
  const user = authService.getCurrentUser();
  
  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Si es tutor, redirigir a la página de escaneo
  if (user.role === 'Tutor') {
    return <Navigate to="/tutor-scanner" replace />;
  }
  
  // Para otros roles, mostrar el dashboard
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
            path="/tutor-scanner" 
            element={
              <ProtectedRoute requiredRole={['Tutor']}>
                <TutorScanner />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <ProtectedRoute requiredRole={['Supervisor', 'Director', 'Admin']}>
                <Layout><RegisterIncident /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/incidents" 
            element={
              <ProtectedRoute requiredRole={['Supervisor', 'Director', 'Admin']}>
                <Layout><IncidentsList /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/students" 
            element={
              <ProtectedRoute requiredRole={['Supervisor', 'Director', 'Admin']}>
                <Layout><StudentsList /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faults" 
            element={
              <ProtectedRoute requiredRole={['Director', 'Admin']}>
                <Layout><FaultsCatalog /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute requiredRole={['Director', 'Admin']}>
                <Layout><Reports /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/audit" 
            element={
              <ProtectedRoute requiredRole={['Admin']}>
                <Layout><AuditLogs /></Layout>
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
